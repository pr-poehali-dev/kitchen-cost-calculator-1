import json
import os
import base64
import uuid
import logging
from datetime import datetime

from db import get_cors, get_db, verify_token, _make_ok, _make_err, s3_client, row_to_client, S3_KEY
from helpers import _get_company, _get_manager_poa, log_history, _full_name
from template_engine import _get_template_blocks, _get_client_projects, _render_template_html
from contract_html import _build_contract_html
from docx_builder import _build_docx

logger = logging.getLogger(__name__)


def handler(event: dict, context) -> dict:
    """
    CRUD клиентов + загрузка фото.
    GET    ?action=list               — список всех клиентов
    GET    ?action=get&id=UUID        — один клиент + фото + история
    POST   ?action=create             — создать клиента
    POST   ?action=update&id=UUID     — обновить клиента
    POST   ?action=status&id=UUID     — сменить статус
    POST   ?action=upload_photo&id=UUID — загрузить фото (base64)
    POST   ?action=delete_photo&photo_id=UUID — удалить фото
    """
    cors = get_cors(event)
    ok = _make_ok(cors)
    err = _make_err(cors)

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    payload = verify_token(event)
    if not payload:
        return err('Не авторизован', 401)

    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', 'list')
    method = event.get('httpMethod', 'GET')

    # ── LIST ──────────────────────────────────────────────────────
    if action == 'list':
        page = max(1, int(qs.get('page', 1)))
        per_page = min(500, max(1, int(qs.get('per_page', 50))))
        search_q = (qs.get('q') or '').strip()
        status_f = (qs.get('status') or '').strip()
        designer_f = (qs.get('designer') or '').strip()
        measurer_f = (qs.get('measurer') or '').strip()
        date_from = (qs.get('date_from') or '').strip()
        date_to = (qs.get('date_to') or '').strip()
        delivery_from = (qs.get('delivery_from') or '').strip()
        delivery_to = (qs.get('delivery_to') or '').strip()
        amount_min = qs.get('amount_min')
        amount_max = qs.get('amount_max')
        sort_field = qs.get('sort', 'created_at')
        sort_dir = 'ASC' if qs.get('sort_dir', 'desc').lower() == 'asc' else 'DESC'
        allowed_sorts = {'created_at', 'delivery_date', 'total_amount', 'last_name'}
        if sort_field not in allowed_sorts:
            sort_field = 'created_at'
        offset = (page - 1) * per_page

        conditions = []
        params = []

        if search_q:
            conditions.append(
                "(last_name ILIKE %s OR first_name ILIKE %s OR middle_name ILIKE %s "
                "OR phone ILIKE %s OR phone2 ILIKE %s OR contract_number ILIKE %s)"
            )
            like = f'%{search_q}%'
            params.extend([like, like, like, like, like, like])

        if status_f and status_f != 'all':
            conditions.append('status = %s')
            params.append(status_f)
        else:
            # По умолчанию архивные не показываются
            conditions.append("status != 'archive'")

        if designer_f:
            conditions.append('designer = %s')
            params.append(designer_f)

        if measurer_f:
            conditions.append('measurer = %s')
            params.append(measurer_f)

        if date_from:
            conditions.append('created_at::date >= %s')
            params.append(date_from)

        if date_to:
            conditions.append('created_at::date <= %s')
            params.append(date_to)

        if delivery_from:
            conditions.append('delivery_date >= %s')
            params.append(delivery_from)

        if delivery_to:
            conditions.append('delivery_date <= %s')
            params.append(delivery_to)

        if amount_min is not None:
            try:
                conditions.append('total_amount >= %s')
                params.append(float(amount_min))
            except ValueError:
                pass

        if amount_max is not None:
            try:
                conditions.append('total_amount <= %s')
                params.append(float(amount_max))
            except ValueError:
                pass

        where = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''
        null_last = 'NULLS LAST' if sort_dir == 'ASC' else 'NULLS LAST'

        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(f'SELECT COUNT(*) FROM clients {where}', params)
            total = cur.fetchone()[0]
            cur.execute(f'''
                SELECT id, status, last_name, first_name, middle_name, phone, phone2, messenger,
                       contract_number, contract_date, total_amount, payment_type,
                       delivery_date, designer, measurer, reminder_date, reminder_note,
                       comment, created_at, updated_at, project_ids,
                       source, tags, rating, property_type, property_area, has_children, has_pets,
                       credit_contract_number, credit_contract_date, credit_bank, credit_prepaid, credit_balance
                FROM clients {where}
                ORDER BY {sort_field} {sort_dir} {null_last}
                LIMIT %s OFFSET %s
            ''', params + [per_page, offset])
            rows = cur.fetchall()
            cols = [d[0] for d in cur.description]
            clients = [dict(zip(cols, r)) for r in rows]
        return ok({
            'clients': clients,
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': (total + per_page - 1) // per_page,
        })

    # ── GET ONE ───────────────────────────────────────────────────
    if action == 'get':
        cid = qs.get('id')
        if not cid:
            return err('Нет id')
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute('SELECT * FROM clients WHERE id = %s', (cid,))
            row = cur.fetchone()
            if not row:
                return err('Клиент не найден', 404)
            client = row_to_client(row, cur)
            cur.execute('SELECT * FROM client_photos WHERE client_id = %s ORDER BY uploaded_at', (cid,))
            photos_rows = cur.fetchall()
            pcols = [d[0] for d in cur.description]
            photos = [dict(zip(pcols, r)) for r in photos_rows]
            cur.execute('SELECT * FROM client_history WHERE client_id = %s ORDER BY created_at DESC LIMIT 50', (cid,))
            hist_rows = cur.fetchall()
            hcols = [d[0] for d in cur.description]
            history = [dict(zip(hcols, r)) for r in hist_rows]
        return ok({'client': client, 'photos': photos, 'history': history})

    # ── CREATE ────────────────────────────────────────────────────
    if action == 'create' and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        c = body.get('client', {})
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute('''
            INSERT INTO clients (
                status, last_name, first_name, middle_name, phone, phone2, messenger, email,
                passport_series, passport_number, passport_issued_by, passport_issued_date, passport_dept_code,
                reg_city, reg_street, reg_house, reg_apt,
                delivery_city, delivery_street, delivery_house, delivery_apt,
                delivery_entrance, delivery_floor, delivery_elevator, delivery_note,
                contract_number, contract_date, products, total_amount, payment_type,
                prepaid_amount, balance_due, custom_payment_scheme,
                delivery_date, production_days, assembly_days,
                delivery_cost, assembly_cost,
                designer, measurer, manager_name, project_ids, reminder_date, reminder_note, comment,
                source, tags, rating, property_type, property_area, has_children, has_pets,
                credit_contract_number, credit_contract_date, credit_bank, credit_prepaid, credit_balance,
                tech_korpus, tech_fasad1, tech_fasad2, tech_stoleshniza, tech_stenovaya,
                tech_podsvetka_type, tech_podsvetka_svet, tech_frezerovka, tech_image_url,
                created_by, updated_by
            ) VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,
                %s,%s,%s,%s,
                %s,%s,%s,%s,
                %s,%s,%s,%s,
                %s,%s,%s,%s,%s,
                %s,%s,%s,
                %s,%s,%s,
                %s,%s,
                %s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,
                %s,%s,%s,%s,%s,
                %s,%s,%s,%s,
                %s,%s
            ) RETURNING id
        ''', (
            c.get('status', 'new'),
            c.get('last_name', ''), c.get('first_name', ''), c.get('middle_name', ''),
            c.get('phone', ''), c.get('phone2', ''), c.get('messenger', 'WhatsApp'), c.get('email', ''),
            c.get('passport_series', ''), c.get('passport_number', ''), c.get('passport_issued_by', ''),
            c.get('passport_issued_date', ''), c.get('passport_dept_code', ''),
            c.get('reg_city', ''), c.get('reg_street', ''), c.get('reg_house', ''), c.get('reg_apt', ''),
            c.get('delivery_city', ''), c.get('delivery_street', ''), c.get('delivery_house', ''),
            c.get('delivery_apt', ''), c.get('delivery_entrance', ''), c.get('delivery_floor', ''),
            c.get('delivery_elevator', 'нет'), c.get('delivery_note', ''),
            c.get('contract_number', ''), c.get('contract_date', ''),
            json.dumps(c.get('products', [])),
            c.get('total_amount', 0), c.get('payment_type', '100% предоплата'),
            c.get('prepaid_amount', 0), c.get('balance_due', 0), c.get('custom_payment_scheme', ''),
            c.get('delivery_date', ''), c.get('production_days', 0), c.get('assembly_days', 0),
            c.get('delivery_cost', 0), c.get('assembly_cost', 0),
            c.get('designer', ''), c.get('measurer', ''), c.get('manager_name', ''),
            json.dumps(c.get('project_ids', [])),
            c.get('reminder_date', ''), c.get('reminder_note', ''), c.get('comment', ''),
            c.get('source', ''), c.get('tags', []), c.get('rating') or None,
            c.get('property_type', ''), c.get('property_area', ''),
            bool(c.get('has_children', False)), bool(c.get('has_pets', False)),
            c.get('credit_contract_number', ''), c.get('credit_contract_date', '') or None,
            c.get('credit_bank', ''), c.get('credit_prepaid', 0), c.get('credit_balance', 0),
            c.get('tech_korpus', ''), c.get('tech_fasad1', ''), c.get('tech_fasad2', ''),
            c.get('tech_stoleshniza', ''), c.get('tech_stenovaya', ''),
            c.get('tech_podsvetka_type', ''), c.get('tech_podsvetka_svet', ''),
            c.get('tech_frezerovka', ''), c.get('tech_image_url', ''),
            payload.get('sub'), payload.get('sub'),
        ))
            new_id = cur.fetchone()[0]
            log_history(conn, str(new_id), payload, 'created', 'Клиент создан')
        return ok({'id': str(new_id)}, 201)

    # ── UPDATE ────────────────────────────────────────────────────
    if action == 'update' and method == 'POST':
        cid = qs.get('id')
        if not cid:
            return err('Нет id')
        body = json.loads(event.get('body') or '{}')
        c = body.get('client', {})
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute('SELECT last_name, first_name, status FROM clients WHERE id = %s', (cid,))
            old = cur.fetchone()
            if not old:
                return err('Клиент не найден', 404)
            cur.execute('''
                UPDATE clients SET
                    status=%s, last_name=%s, first_name=%s, middle_name=%s,
                    phone=%s, phone2=%s, messenger=%s, email=%s,
                    passport_series=%s, passport_number=%s, passport_issued_by=%s,
                    passport_issued_date=%s, passport_dept_code=%s,
                    reg_city=%s, reg_street=%s, reg_house=%s, reg_apt=%s,
                    delivery_city=%s, delivery_street=%s, delivery_house=%s, delivery_apt=%s,
                    delivery_entrance=%s, delivery_floor=%s, delivery_elevator=%s, delivery_note=%s,
                    contract_number=%s, contract_date=%s, products=%s,
                    total_amount=%s, payment_type=%s, prepaid_amount=%s, balance_due=%s,
                    custom_payment_scheme=%s, delivery_date=%s, production_days=%s, assembly_days=%s,
                    delivery_cost=%s, assembly_cost=%s,
                    designer=%s, measurer=%s, manager_name=%s, project_ids=%s,
                    reminder_date=%s, reminder_note=%s, comment=%s,
                    source=%s, tags=%s, rating=%s, property_type=%s, property_area=%s,
                    has_children=%s, has_pets=%s,
                    credit_contract_number=%s, credit_contract_date=%s, credit_bank=%s,
                    credit_prepaid=%s, credit_balance=%s,
                    tech_korpus=%s, tech_fasad1=%s, tech_fasad2=%s,
                    tech_stoleshniza=%s, tech_stenovaya=%s,
                    tech_podsvetka_type=%s, tech_podsvetka_svet=%s,
                    tech_frezerovka=%s, tech_image_url=%s,
                    updated_at=NOW(), updated_by=%s
                WHERE id=%s
            ''', (
                c.get('status', 'new'),
                c.get('last_name', ''), c.get('first_name', ''), c.get('middle_name', ''),
                c.get('phone', ''), c.get('phone2', ''), c.get('messenger', 'WhatsApp'), c.get('email', ''),
                c.get('passport_series', ''), c.get('passport_number', ''), c.get('passport_issued_by', ''),
                c.get('passport_issued_date', ''), c.get('passport_dept_code', ''),
                c.get('reg_city', ''), c.get('reg_street', ''), c.get('reg_house', ''), c.get('reg_apt', ''),
                c.get('delivery_city', ''), c.get('delivery_street', ''), c.get('delivery_house', ''),
                c.get('delivery_apt', ''), c.get('delivery_entrance', ''), c.get('delivery_floor', ''),
                c.get('delivery_elevator', 'нет'), c.get('delivery_note', ''),
                c.get('contract_number', ''), c.get('contract_date', ''),
                json.dumps(c.get('products', [])),
                c.get('total_amount', 0), c.get('payment_type', '100% предоплата'),
                c.get('prepaid_amount', 0), c.get('balance_due', 0), c.get('custom_payment_scheme', ''),
                c.get('delivery_date', ''), c.get('production_days', 0), c.get('assembly_days', 0),
                c.get('delivery_cost', 0), c.get('assembly_cost', 0),
                c.get('designer', ''), c.get('measurer', ''), c.get('manager_name', ''),
                json.dumps(c.get('project_ids', [])),
                c.get('reminder_date', ''), c.get('reminder_note', ''), c.get('comment', ''),
                c.get('source', ''), c.get('tags', []), c.get('rating') or None,
                c.get('property_type', ''), c.get('property_area', ''),
                bool(c.get('has_children', False)), bool(c.get('has_pets', False)),
                c.get('credit_contract_number', ''), c.get('credit_contract_date', '') or None,
                c.get('credit_bank', ''), c.get('credit_prepaid', 0), c.get('credit_balance', 0),
                c.get('tech_korpus', ''), c.get('tech_fasad1', ''), c.get('tech_fasad2', ''),
                c.get('tech_stoleshniza', ''), c.get('tech_stenovaya', ''),
                c.get('tech_podsvetka_type', ''), c.get('tech_podsvetka_svet', ''),
                c.get('tech_frezerovka', ''), c.get('tech_image_url', ''),
                payload.get('sub'), cid,
            ))
            log_history(conn, cid, payload, 'updated', 'Данные клиента обновлены')
        return ok({'ok': True})

    # ── STATUS ────────────────────────────────────────────────────
    if action == 'status' and method == 'POST':
        cid = qs.get('id')
        if not cid:
            return err('Нет id')
        body = json.loads(event.get('body') or '{}')
        new_status = body.get('status')
        if not new_status:
            return err('Нет status')
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute('SELECT status FROM clients WHERE id = %s', (cid,))
            row = cur.fetchone()
            if not row:
                return err('Клиент не найден', 404)
            old_status = row[0]
            cur.execute('UPDATE clients SET status=%s, updated_at=NOW() WHERE id=%s', (new_status, cid))
            log_history(conn, cid, payload, 'status_changed', f'Статус: {old_status} → {new_status}',
                        {'status': old_status}, {'status': new_status})
        return ok({'ok': True})

    # ── UPLOAD PHOTO ──────────────────────────────────────────────
    if action == 'upload_photo' and method == 'POST':
        cid = qs.get('id')
        if not cid:
            return err('Нет id')
        body = json.loads(event.get('body') or '{}')
        data_b64 = body.get('data', '')
        category = body.get('category', 'measure')
        name = body.get('name', 'photo.jpg')
        content_type = body.get('content_type', 'image/jpeg')

        ALLOWED_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
        if content_type not in ALLOWED_TYPES:
            return err('Недопустимый тип файла. Разрешены: JPEG, PNG, GIF, WEBP')

        MAX_SIZE_BYTES = 10 * 1024 * 1024
        if len(data_b64) > MAX_SIZE_BYTES * 4 // 3:
            return err('Файл слишком большой. Максимум 10 МБ')

        img_data = base64.b64decode(data_b64)

        if len(img_data) > MAX_SIZE_BYTES:
            return err('Файл слишком большой. Максимум 10 МБ')
        photo_id = str(uuid.uuid4())
        ext = name.rsplit('.', 1)[-1] if '.' in name else 'jpg'
        key = f'clients/{cid}/{photo_id}.{ext}'

        s3 = s3_client()
        s3.put_object(Bucket='files', Key=key, Body=img_data, ContentType=content_type)
        cdn_url = f'https://cdn.poehali.dev/projects/{S3_KEY}/bucket/{key}'

        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                'INSERT INTO client_photos (id, client_id, category, url, name, uploaded_by) VALUES (%s,%s,%s,%s,%s,%s) RETURNING id',
                (photo_id, cid, category, cdn_url, name, payload.get('sub'))
            )
            log_history(conn, cid, payload, 'photo_added', f'Добавлено фото: {name} ({category})')
        return ok({'id': photo_id, 'url': cdn_url}, 201)

    # ── DELETE PHOTO ──────────────────────────────────────────────
    if action == 'delete_photo' and method == 'POST':
        photo_id = qs.get('photo_id')
        if not photo_id:
            return err('Нет photo_id')
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute('SELECT client_id, url, name FROM client_photos WHERE id = %s', (photo_id,))
            row = cur.fetchone()
            if not row:
                return err('Фото не найдено', 404)
            cid, url, name = row
            s3_key = url.split('/bucket/', 1)[-1] if '/bucket/' in url else None
            if s3_key:
                try:
                    s3_client().delete_object(Bucket='files', Key=s3_key)
                except Exception as e:
                    logger.error(f'S3 delete failed for {s3_key}: {e}')
            cur.execute('DELETE FROM client_photos WHERE id = %s', (photo_id,))
            log_history(conn, str(cid), payload, 'photo_deleted', f'Удалено фото: {name}')
        return ok({'ok': True})

    # ── UPLOAD COMPANY ASSET (печать / подпись) ───────────────────
    if action == 'upload_asset' and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        data_b64 = body.get('data', '')
        asset_type = body.get('asset_type', 'stamp')  # 'stamp' | 'signature'
        name = body.get('name', 'asset.png')
        content_type = body.get('content_type', 'image/png')

        if content_type not in {'image/jpeg', 'image/png', 'image/webp'}:
            return err('Допустимы только PNG, JPEG, WEBP')
        if not data_b64:
            return err('Нет данных файла')

        img_data = base64.b64decode(data_b64)
        if len(img_data) > 5 * 1024 * 1024:
            return err('Файл слишком большой. Максимум 5 МБ')

        user_id = payload.get('sub') or payload.get('user_id') or payload.get('id')
        ext = name.rsplit('.', 1)[-1] if '.' in name else 'png'
        asset_id = str(uuid.uuid4())
        key = f'company/{user_id}/{asset_type}/{asset_id}.{ext}'

        s3 = s3_client()
        s3.put_object(Bucket='files', Key=key, Body=img_data, ContentType=content_type)
        cdn_url = f'https://cdn.poehali.dev/projects/{S3_KEY}/bucket/{key}'
        return ok({'url': cdn_url}, 201)

    # ── DOCUMENT: HTML preview ────────────────────────────────────
    if action == 'doc_html':
        cid = qs.get('client_id')
        doc_type = qs.get('doc', 'contract')
        if not cid:
            return err('Нет client_id')
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute('SELECT * FROM clients WHERE id = %s', (cid,))
            row = cur.fetchone()
            if not row:
                return err('Клиент не найден', 404)
            cols = [d[0] for d in cur.description]
            client = dict(zip(cols, row))
            if doc_type == 'tech' and not client.get('tech_image_url'):
                cur.execute("SELECT url FROM client_photos WHERE client_id = %s AND category = 'render' ORDER BY uploaded_at DESC LIMIT 1", (cid,))
                photo_row = cur.fetchone()
                if photo_row:
                    client['tech_image_url'] = photo_row[0]
        user_id = payload.get('sub') or payload.get('user_id') or payload.get('id')
        company = _get_company(user_id)
        manager_poa = _get_manager_poa(client.get('manager_name', ''))
        if manager_poa.get('poa_number') or manager_poa.get('poa_date'):
            company = {**company, 'poaNumber': manager_poa.get('poa_number', ''), 'poaDate': manager_poa.get('poa_date', '')}
            client['manager_poa_number'] = manager_poa.get('poa_number', '')
            client['manager_poa_date'] = manager_poa.get('poa_date', '')
        fallback_html = _build_contract_html(client, doc_type, company)
        tpl_blocks, tpl_settings = _get_template_blocks(user_id, doc_type)
        projects = _get_client_projects(user_id, client) if any(b.get('type') == 'calc_table' for b in tpl_blocks) else []
        html = _render_template_html(tpl_blocks, tpl_settings, client, company, fallback_html, projects)
        return {'statusCode': 200, 'headers': {**cors, 'Content-Type': 'text/html; charset=utf-8'}, 'body': html}

    # ── DOCUMENT: save HTML to S3, return link ────────────────────
    if action == 'doc_link':
        cid = qs.get('client_id')
        doc_type = qs.get('doc', 'contract')
        if not cid:
            return err('Нет client_id')
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute('SELECT * FROM clients WHERE id = %s', (cid,))
            row = cur.fetchone()
            if not row:
                return err('Клиент не найден', 404)
            cols = [d[0] for d in cur.description]
            client = dict(zip(cols, row))
            if doc_type == 'tech' and not client.get('tech_image_url'):
                cur.execute("SELECT url FROM client_photos WHERE client_id = %s AND category = 'render' ORDER BY uploaded_at DESC LIMIT 1", (cid,))
                photo_row = cur.fetchone()
                if photo_row:
                    client['tech_image_url'] = photo_row[0]
        user_id = payload.get('sub') or payload.get('user_id') or payload.get('id')
        company = _get_company(user_id)
        manager_poa = _get_manager_poa(client.get('manager_name', ''))
        if manager_poa.get('poa_number') or manager_poa.get('poa_date'):
            company = {**company, 'poaNumber': manager_poa.get('poa_number', ''), 'poaDate': manager_poa.get('poa_date', '')}
            client['manager_poa_number'] = manager_poa.get('poa_number', '')
            client['manager_poa_date'] = manager_poa.get('poa_date', '')
        fallback_html = _build_contract_html(client, doc_type, company)
        tpl_blocks, tpl_settings = _get_template_blocks(user_id, doc_type)
        projects = _get_client_projects(user_id, client) if any(b.get('type') == 'calc_table' for b in tpl_blocks) else []
        html = _render_template_html(tpl_blocks, tpl_settings, client, company, fallback_html, projects)
        doc_id = str(uuid.uuid4())
        key = f'documents/{doc_id}.html'
        s3_client().put_object(Bucket='files', Key=key, Body=html.encode('utf-8'), ContentType='text/html; charset=utf-8')
        cdn_url = f'https://cdn.poehali.dev/projects/{S3_KEY}/bucket/{key}'
        return ok({'url': cdn_url})

    # ── DOCUMENT: generate DOCX (возвращаем base64 напрямую, без S3) ─
    if action == 'doc_docx':
        cid = qs.get('client_id')
        doc_type = qs.get('doc', 'contract')
        if not cid:
            return err('Нет client_id')
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute('SELECT * FROM clients WHERE id = %s', (cid,))
            row = cur.fetchone()
            if not row:
                return err('Клиент не найден', 404)
            cols = [d[0] for d in cur.description]
            client = dict(zip(cols, row))
            if doc_type == 'tech' and not client.get('tech_image_url'):
                cur.execute("SELECT url FROM client_photos WHERE client_id = %s AND category = 'render' ORDER BY uploaded_at DESC LIMIT 1", (cid,))
                photo_row = cur.fetchone()
                if photo_row:
                    client['tech_image_url'] = photo_row[0]
        user_id = payload.get('sub') or payload.get('user_id') or payload.get('id')
        company = _get_company(user_id)
        manager_poa = _get_manager_poa(client.get('manager_name', ''))
        if manager_poa.get('poa_number') or manager_poa.get('poa_date'):
            company = {**company, 'poaNumber': manager_poa.get('poa_number', ''), 'poaDate': manager_poa.get('poa_date', '')}
        logger.info(f'doc_docx: doc_type={doc_type} cid={cid} client_keys={list(client.keys())[:5]}')
        docx_bytes = _build_docx(client, doc_type, company)
        logger.info(f'doc_docx: generated {len(docx_bytes)} bytes for {doc_type}')
        b64 = base64.b64encode(docx_bytes).decode('utf-8')
        return {
            'statusCode': 200,
            'headers': {**cors, 'Content-Type': 'application/json'},
            'body': json.dumps({'data': b64}),
        }

    # ── DOCUMENT: ZIP всех DOCX ───────────────────────────────────
    if action == 'doc_zip':
        cid = qs.get('client_id')
        if not cid:
            return err('Нет client_id')
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute('SELECT * FROM clients WHERE id = %s', (cid,))
            row = cur.fetchone()
            if not row:
                return err('Клиент не найден', 404)
            cols = [d[0] for d in cur.description]
            client = dict(zip(cols, row))
            cur.execute("SELECT url FROM client_photos WHERE client_id = %s AND category = 'render' ORDER BY uploaded_at DESC LIMIT 1", (cid,))
            photo_row = cur.fetchone()
            if photo_row and not client.get('tech_image_url'):
                client['tech_image_url'] = photo_row[0]
        user_id = payload.get('sub') or payload.get('user_id') or payload.get('id')
        company = _get_company(user_id)
        manager_poa = _get_manager_poa(client.get('manager_name', ''))
        if manager_poa.get('poa_number') or manager_poa.get('poa_date'):
            company = {**company, 'poaNumber': manager_poa.get('poa_number', ''), 'poaDate': manager_poa.get('poa_date', '')}
        import zipfile, io as _io
        DOC_TYPES_ZIP = ['contract', 'tech', 'act', 'rules', 'delivery', 'act_delivery', 'assembly', 'act_assembly', 'delivery_calc', 'delivery_lift', 'assembly_calc', 'assembly_extra', 'addendum', 'tech_spec']
        DOC_NAMES_ZIP = {
            'contract':       '01. Договор бытового подряда',
            'tech':           '02. Технический проект (Прил.1)',
            'act':            '03. Акт выполненных работ (Прил.4)',
            'rules':          '04. Правила эксплуатации (Прил.3)',
            'delivery':       '05. Договор доставки',
            'act_delivery':   '06. Акт приёма доставки',
            'assembly':       '07. Договор монтажа',
            'act_assembly':   '08. Акт приёма сборки',
            'delivery_calc':  '09. Калькуляция доставки (Прил.1)',
            'delivery_lift':  '10. Прайс подъём мебели (Прил.2)',
            'assembly_calc':  '11. Калькуляция сборки (Прил.1)',
            'assembly_extra': '12. Прайс доп. работ (Прил.2)',
            'addendum':       '13. Дополнительное соглашение',
            'tech_spec':      '14. Спецификация на технику',
        }
        fname_client = _full_name(client).replace(' ', '_')[:30]
        zip_buf = _io.BytesIO()
        with zipfile.ZipFile(zip_buf, 'w', zipfile.ZIP_DEFLATED) as zf:
            for dt in DOC_TYPES_ZIP:
                try:
                    docx_bytes = _build_docx(client, dt, company)
                    zf.writestr(f'{DOC_NAMES_ZIP[dt]} — {fname_client}.docx', docx_bytes)
                except Exception:
                    pass
        zip_b64 = base64.b64encode(zip_buf.getvalue()).decode('utf-8')
        return {
            'statusCode': 200,
            'headers': {**cors, 'Content-Type': 'application/json'},
            'body': json.dumps({'data': zip_b64, 'filename': f'Документы — {fname_client}.zip'}),
        }

    return err('Неизвестное действие', 404)
