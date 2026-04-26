import json
import os
import base64
import uuid
import jwt
import psycopg2
import boto3
from datetime import datetime

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}
JWT_SECRET = os.environ.get('JWT_SECRET', '1641Bd849poehali')
S3_KEY = os.environ.get('AWS_ACCESS_KEY_ID', '')
S3_SECRET = os.environ.get('AWS_SECRET_ACCESS_KEY', '')


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def verify_token(event: dict):
    qs = event.get('queryStringParameters') or {}
    token = (qs.get('token') or '').strip()
    if not token:
        return None
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except Exception:
        return None


def ok(data, status=200):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, default=str)}


def err(msg, status=400):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg})}


def s3_client():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=S3_KEY,
        aws_secret_access_key=S3_SECRET,
    )


def row_to_client(row, cur):
    cols = [d[0] for d in cur.description]
    return dict(zip(cols, row))


def log_history(conn, client_id, payload, action, description, old_val=None, new_val=None):
    cur = conn.cursor()
    cur.execute(
        '''INSERT INTO client_history (client_id, user_id, user_name, action, description, old_value, new_value)
           VALUES (%s, %s, %s, %s, %s, %s, %s)''',
        (
            client_id,
            payload.get('sub'),
            payload.get('login', ''),
            action,
            description,
            json.dumps(old_val) if old_val else None,
            json.dumps(new_val) if new_val else None,
        )
    )


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
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    payload = verify_token(event)
    if not payload:
        return err('Не авторизован', 401)

    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', 'list')
    method = event.get('httpMethod', 'GET')

    # ── LIST ──────────────────────────────────────────────────────
    if action == 'list':
        conn = get_db()
        cur = conn.cursor()
        cur.execute('''
            SELECT id, status, last_name, first_name, middle_name, phone, messenger,
                   contract_number, contract_date, total_amount, payment_type,
                   delivery_date, designer, measurer, reminder_date, reminder_note,
                   comment, created_at, updated_at, project_ids
            FROM clients ORDER BY created_at DESC
        ''')
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        clients = [dict(zip(cols, r)) for r in rows]
        conn.close()
        return ok({'clients': clients})

    # ── GET ONE ───────────────────────────────────────────────────
    if action == 'get':
        cid = qs.get('id')
        if not cid:
            return err('Нет id')
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT * FROM clients WHERE id = %s', (cid,))
        row = cur.fetchone()
        if not row:
            conn.close()
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

        conn.close()
        return ok({'client': client, 'photos': photos, 'history': history})

    # ── CREATE ────────────────────────────────────────────────────
    if action == 'create' and method == 'POST':
        body = json.loads(event.get('body') or '{}')
        c = body.get('client', {})
        conn = get_db()
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
                designer, measurer, project_ids, reminder_date, reminder_note, comment,
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
                %s,%s,%s,%s,%s,%s,
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
            c.get('designer', ''), c.get('measurer', ''),
            json.dumps(c.get('project_ids', [])),
            c.get('reminder_date', ''), c.get('reminder_note', ''), c.get('comment', ''),
            payload.get('sub'), payload.get('sub'),
        ))
        new_id = cur.fetchone()[0]
        log_history(conn, str(new_id), payload, 'created', 'Клиент создан')
        conn.commit()
        conn.close()
        return ok({'id': str(new_id)}, 201)

    # ── UPDATE ────────────────────────────────────────────────────
    if action == 'update' and method == 'POST':
        cid = qs.get('id')
        if not cid:
            return err('Нет id')
        body = json.loads(event.get('body') or '{}')
        c = body.get('client', {})
        conn = get_db()
        cur = conn.cursor()

        cur.execute('SELECT last_name, first_name, status FROM clients WHERE id = %s', (cid,))
        old = cur.fetchone()
        if not old:
            conn.close()
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
                designer=%s, measurer=%s, project_ids=%s,
                reminder_date=%s, reminder_note=%s, comment=%s,
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
            c.get('designer', ''), c.get('measurer', ''),
            json.dumps(c.get('project_ids', [])),
            c.get('reminder_date', ''), c.get('reminder_note', ''), c.get('comment', ''),
            payload.get('sub'), cid,
        ))
        log_history(conn, cid, payload, 'updated', 'Данные клиента обновлены')
        conn.commit()
        conn.close()
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
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT status FROM clients WHERE id = %s', (cid,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return err('Клиент не найден', 404)
        old_status = row[0]
        cur.execute('UPDATE clients SET status=%s, updated_at=NOW() WHERE id=%s', (new_status, cid))
        log_history(conn, cid, payload, 'status_changed', f'Статус: {old_status} → {new_status}',
                    {'status': old_status}, {'status': new_status})
        conn.commit()
        conn.close()
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

        img_data = base64.b64decode(data_b64)
        photo_id = str(uuid.uuid4())
        ext = name.rsplit('.', 1)[-1] if '.' in name else 'jpg'
        key = f'clients/{cid}/{photo_id}.{ext}'

        s3 = s3_client()
        s3.put_object(Bucket='files', Key=key, Body=img_data, ContentType=content_type)
        cdn_url = f'https://cdn.poehali.dev/projects/{S3_KEY}/bucket/{key}'

        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            'INSERT INTO client_photos (id, client_id, category, url, name, uploaded_by) VALUES (%s,%s,%s,%s,%s,%s) RETURNING id',
            (photo_id, cid, category, cdn_url, name, payload.get('sub'))
        )
        log_history(conn, cid, payload, 'photo_added', f'Добавлено фото: {name} ({category})')
        conn.commit()
        conn.close()
        return ok({'id': photo_id, 'url': cdn_url}, 201)

    # ── DELETE PHOTO ──────────────────────────────────────────────
    if action == 'delete_photo' and method == 'POST':
        photo_id = qs.get('photo_id')
        if not photo_id:
            return err('Нет photo_id')
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT client_id, url, name FROM client_photos WHERE id = %s', (photo_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return err('Фото не найдено', 404)
        cid, url, name = row
        cur.execute('UPDATE client_photos SET url = %s WHERE id = %s', ('', photo_id))
        log_history(conn, str(cid), payload, 'photo_added', f'Удалено фото: {name}')
        conn.commit()
        conn.close()
        return ok({'ok': True})

    return err('Неизвестное действие', 404)
