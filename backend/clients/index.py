import json
import os
import base64
import uuid
import jwt
import psycopg2
import boto3
from datetime import datetime
from io import BytesIO

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
                delivery_cost, assembly_cost,
                designer, measurer, manager_name, project_ids, reminder_date, reminder_note, comment,
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
                delivery_cost=%s, assembly_cost=%s,
                designer=%s, measurer=%s, manager_name=%s, project_ids=%s,
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
            c.get('delivery_cost', 0), c.get('assembly_cost', 0),
            c.get('designer', ''), c.get('measurer', ''), c.get('manager_name', ''),
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

    # ── DOCUMENT: HTML preview ────────────────────────────────────
    if action == 'doc_html':
        cid = qs.get('client_id')
        doc_type = qs.get('doc', 'contract')
        if not cid:
            return err('Нет client_id')
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT * FROM clients WHERE id = %s', (cid,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return err('Клиент не найден', 404)
        cols = [d[0] for d in cur.description]
        client = dict(zip(cols, row))
        conn.close()
        html = _build_contract_html(client, doc_type)
        return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'text/html; charset=utf-8'}, 'body': html}

    # ── DOCUMENT: save HTML to S3, return link ────────────────────
    if action == 'doc_link':
        cid = qs.get('client_id')
        doc_type = qs.get('doc', 'contract')
        if not cid:
            return err('Нет client_id')
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT * FROM clients WHERE id = %s', (cid,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return err('Клиент не найден', 404)
        cols = [d[0] for d in cur.description]
        client = dict(zip(cols, row))
        conn.close()
        html = _build_contract_html(client, doc_type)
        doc_id = str(uuid.uuid4())
        key = f'documents/{doc_id}.html'
        s3c = s3_client()
        s3c.put_object(Bucket='files', Key=key, Body=html.encode('utf-8'), ContentType='text/html; charset=utf-8')
        cdn_url = f'https://cdn.poehali.dev/projects/{S3_KEY}/bucket/{key}'
        return ok({'url': cdn_url})

    # ── DOCUMENT: generate DOCX ───────────────────────────────────
    if action == 'doc_docx':
        cid = qs.get('client_id')
        doc_type = qs.get('doc', 'contract')
        if not cid:
            return err('Нет client_id')
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT * FROM clients WHERE id = %s', (cid,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return err('Клиент не найден', 404)
        cols = [d[0] for d in cur.description]
        client = dict(zip(cols, row))
        conn.close()
        docx_bytes = _build_docx(client, doc_type)
        doc_id = str(uuid.uuid4())
        key = f'documents/{doc_id}.docx'
        s3c = s3_client()
        s3c.put_object(Bucket='files', Key=key, Body=docx_bytes, ContentType='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        cdn_url = f'https://cdn.poehali.dev/projects/{S3_KEY}/bucket/{key}'
        return ok({'url': cdn_url})

    return err('Неизвестное действие', 404)


# ═══════════════════════════════════════════════════════════════
# DOCUMENT GENERATION HELPERS
# ═══════════════════════════════════════════════════════════════

def _num_to_words(n: float) -> str:
    n = int(round(n))
    if n == 0:
        return 'ноль рублей'
    ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
            'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать',
            'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать']
    ones_f = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
              'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать',
              'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать']
    tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто']
    hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот']

    def chunk(num, feminine=False):
        parts = []
        h = num // 100
        t = (num % 100) // 10
        o = num % 10
        if h:
            parts.append(hundreds[h])
        if t == 1:
            parts.append((ones_f if feminine else ones)[num % 100])
        else:
            if t:
                parts.append(tens[t])
            if o:
                parts.append((ones_f if feminine else ones)[o])
        return parts

    result = []
    millions = n // 1_000_000
    thousands = (n % 1_000_000) // 1_000
    remainder = n % 1_000

    if millions:
        parts = chunk(millions)
        o = millions % 10
        t2 = (millions % 100) // 10
        suffix = 'миллионов' if (t2 == 1 or o == 0 or o >= 5) else ('миллион' if o == 1 else 'миллиона')
        result.extend(parts); result.append(suffix)

    if thousands:
        parts = chunk(thousands, feminine=True)
        o = thousands % 10
        t2 = (thousands % 100) // 10
        suffix = 'тысяч' if (t2 == 1 or o == 0 or o >= 5) else ('тысяча' if o == 1 else 'тысячи')
        result.extend(parts); result.append(suffix)

    if remainder:
        result.extend(chunk(remainder))

    o = n % 10
    t2 = (n % 100) // 10
    rub = 'рублей' if (t2 == 1 or o == 0 or o >= 5) else ('рубль' if o == 1 else 'рубля')
    return ' '.join(result) + ' ' + rub


def _days_words(n: int) -> str:
    w = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
         'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать',
         'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать', 'двадцать']
    tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто']
    if n <= 20:
        return w[n] if n < len(w) else str(n)
    t = n // 10; o = n % 10
    return (tens[t] + (' ' + w[o] if o else '')).strip()


def _fmt_date(d):
    if not d: return '___________'
    try: return datetime.strptime(str(d)[:10], '%Y-%m-%d').strftime('%d.%m.%Y')
    except: return str(d)


def _fmt_date_full(d):
    months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
    if not d: return '«___» ___________ ______ г.'
    try:
        dt = datetime.strptime(str(d)[:10], '%Y-%m-%d')
        return f'«{dt.day:02d}» {months[dt.month-1]} {dt.year} г.'
    except: return str(d)


def _full_name(c):
    return ' '.join(filter(None,[c.get('last_name',''),c.get('first_name',''),c.get('middle_name','')])) or '___________'


def _passport_str(c):
    s = c.get('passport_series',''); n = c.get('passport_number','')
    return f'{s} {n}' if s and n else '___________'


def _reg_address(c):
    parts = []
    if c.get('reg_city'): parts.append(f"г. {c['reg_city']}")
    if c.get('reg_street'): parts.append(f"ул. {c['reg_street']}")
    if c.get('reg_house'): parts.append(f"д. {c['reg_house']}")
    if c.get('reg_apt'): parts.append(f"кв. {c['reg_apt']}")
    return ', '.join(parts) or '___________'


def _delivery_address(c):
    parts = []
    if c.get('delivery_city'): parts.append(f"г. {c['delivery_city']}")
    if c.get('delivery_street'): parts.append(f"ул. {c['delivery_street']}")
    if c.get('delivery_house'): parts.append(f"д. {c['delivery_house']}")
    if c.get('delivery_apt'): parts.append(f"кв. {c['delivery_apt']}")
    return ', '.join(parts) or '___________'


def _get_products(c):
    products = c.get('products') or []
    if isinstance(products, str):
        try: products = json.loads(products)
        except: products = []
    return products


def _doc_style():
    return '''<style>
@import url('https://fonts.googleapis.com/css2?family=PT+Serif&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'PT Serif',Georgia,serif;font-size:12pt;line-height:1.6;color:#000;background:#fff}
.page{width:210mm;min-height:297mm;margin:0 auto;padding:20mm 20mm 20mm 25mm}
h1{font-size:14pt;text-align:center;font-weight:bold;margin:0 0 4px}
h2{font-size:12pt;text-align:center;font-weight:normal;margin:0 0 16px}
.city-date{display:flex;justify-content:space-between;margin:12px 0}
p{margin:6px 0;text-align:justify;text-indent:2em}
p.no-indent{text-indent:0}
p.center{text-align:center;text-indent:0}
.sec{font-weight:bold;margin:14px 0 4px;text-indent:0}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:11pt}
th,td{border:1px solid #000;padding:5px 8px}
th{background:#f0f0f0;font-weight:bold;text-align:center}
td{vertical-align:top}
.ul{border-bottom:1px solid #000;display:inline-block;min-width:180px}
@media print{body{margin:0}.page{padding:15mm 15mm 15mm 20mm}}
</style>'''


def _build_contract_html(c: dict, doc_type: str) -> str:
    fname = _full_name(c)
    total = float(c.get('total_amount') or 0)
    total_words = _num_to_words(total)
    contract_num = c.get('contract_number') or '___'
    contract_date_full = _fmt_date_full(c.get('contract_date') or '')
    prod_days = int(c.get('production_days') or 45)
    prepaid = float(c.get('prepaid_amount') or 0)
    balance = float(c.get('balance_due') or 0)
    ptype = c.get('payment_type', '100% предоплата')
    custom = c.get('custom_payment_scheme', '') or ''
    products = _get_products(c)

    products_rows = ''
    for i, p in enumerate(products, 1):
        products_rows += f'<tr><td style="text-align:center">{i}</td><td>{p.get("name","Кухонный гарнитур")}</td><td style="text-align:center">шт.</td><td style="text-align:center">{p.get("qty",1)}</td><td style="text-align:right"></td></tr>'
    if not products_rows:
        products_rows = f'<tr><td style="text-align:center">1</td><td>Кухонный гарнитур</td><td style="text-align:center">шт.</td><td style="text-align:center">1</td><td style="text-align:right">{total:,.0f}</td></tr>'

    style = _doc_style()

    if custom:
        pay_html = f'<p>{custom}</p>'
    elif ptype == '100% предоплата':
        pay_html = f'<p>3.2.1. Предварительная оплата производится при заключении Договора в размере {prepaid:,.0f} ({_num_to_words(prepaid)}) рублей.</p><p>3.2.2. Окончательный платёж не предусмотрен. Стоимость работ оплачена полностью при заключении Договора.</p>'
    else:
        pay_html = f'<p>3.2.1. Предварительная оплата производится при заключении Договора в размере {prepaid:,.0f} ({_num_to_words(prepaid)}) рублей.</p><p>3.2.2. Окончательный платёж за выполненные по Договору работы в размере {balance:,.0f} ({_num_to_words(balance)}) рублей осуществляется в течение 3 (трёх) дней с момента получения Заказчиком уведомления о готовности мебели, но не позднее дня доставки.</p>'

    manager = c.get('manager_name') or ''
    manager_line = manager if manager else '&nbsp;' * 30

    if doc_type == 'contract':
        return f'''<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Договор №{contract_num}</title>{style}</head><body><div class="page">
<h1>ДОГОВОР</h1>
<h2>бытового подряда на изготовление мебели</h2>
<div class="city-date"><span>г. Саратов</span><span>№ {contract_num} от {contract_date_full}</span></div>
<p class="no-indent">ООО «Интерьерные решения», в лице менеджера <strong>{manager_line}</strong>, действующего на основании доверенности № <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;</span> от <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>, именуемый в дальнейшем «Подрядчик», и гр. <strong>{fname}</strong>, именуемый (ая) в дальнейшем «Заказчик», действующий (ая) как физическое лицо, с одной стороны, отдельно именуемые – «Сторона», а совместно именуемые – «Стороны», заключили настоящий Договор о нижеследующем:</p>

<p class="sec">1. ПРЕДМЕТ ДОГОВОРА</p>
<p>1.1. Подрядчик обязуется выполнить работу по изготовлению мебели и передать результат работы Заказчику (мебель передается в разобранном виде), а Заказчик обязуется принять и оплатить результат работ.</p>
<p>1.2. Наименование, качественные характеристики, количество, дизайн мебели указываются в Техническом проекте, который является Приложением № 1 к настоящему Договору.</p>
<p>1.3. В случае необходимости выполнения Подрядчиком дополнительных работ, влекущих изменение объема, цены работ, включая изменение срока выполнения работ, стороны согласовывают данные изменения путем заключения дополнительного соглашения.</p>
<p>1.4. Срок выполнения работ составляет {prod_days} ({_days_words(prod_days)}) рабочих дней, с момента согласования Технического проекта и получения Подрядчиком предварительной оплаты, в размере, указанном в разделе 3 Договора. Подрядчик вправе досрочно выполнить работу без получения предварительного согласия Заказчика.</p>
<p>1.4.1. В случае нарушения технологического процесса (поломка, остановка производственных линий, отсутствие энергоснабжения) по вине коммунальных и иных служб, нехватки сырья и (или) рабочей силы, если эти обстоятельства непосредственно повлияли на возможность надлежащего исполнения Подрядчиком своих обязательств по настоящему Договору, срок изготовления мебели переносится соразмерно времени, в течение которого действовали такие обстоятельства. В случае переноса сроков изготовления мебели по причине возникновения таких обстоятельств, Подрядчик уведомляет Заказчика о сроках переноса изготовления мебели в письменном виде по имеющимся средствам связи (социальные мессенджеры, электронная почта) с последующим заключением дополнительного соглашения об увеличении сроков по договору.</p>
<p>1.4.2. Если Заказчик не обеспечил возможность проезда Подрядчика к месту разгрузки мебели, Подрядчик не несет ответственности за сроки доставки и разгрузки мебели и оставляет за собой право выставить счет за компенсацию дополнительных затрат, понесенных в связи с доставкой мебели, который Заказчик обязуется оплатить в течение 3 (трех) рабочих дней.</p>
<p>1.5. Работы, выполняемые Подрядчиком, предназначены удовлетворять бытовые или другие личные потребности Заказчика.</p>
<p>1.6. Заказчик проинформирован о том, что допускаются различия оттенка цвета и текстуры покрытий мебели и (или) ее элементов, по сравнению с образцами, в пределах одного цветового тона, что не будет являться нарушением условий договора и основанием для предъявления соответствующих претензий Подрядчику.</p>
<p>1.7. Мебель изготавливается согласно индивидуальному заказу Заказчика (Технический проект). Подписанием данного договора Заказчик подтверждает, что он согласовал все характеристики мебели, включая, но не ограничиваясь: количество, размер, форма, габариты, материал, расцветка, комплектация, отделка, фурнитура, крепления и т.д. В связи с этим, на данный Договор не распространяются положения Закона РФ «О защите прав потребителей», в части возможности реализации потребителем права заменить товар или возвратить товар надлежащего качества.</p>

<p class="sec">2. РАЗРАБОТКА И СОГЛАСОВАНИЕ ТЕХНИЧЕСКОГО ПРОЕКТА</p>
<p>2.1. Технический проект разрабатывается Подрядчиком в течение 10 (десяти) рабочих дней с момента получения Подрядчиком предварительной оплаты, в размере, указанном в разделе 3 Договора.</p>
<p>2.2. Заказчик в течение 5 (пяти) рабочих дней с момента перечисления предварительной оплаты обеспечивает доступ Подрядчика в помещение, в котором будет установлена мебель для проведения замеров помещения.</p>
<p>2.3. Заказчик не позднее 5 (пяти) рабочих дней со дня получения от Подрядчика Технического проекта согласовывает, путем проставления личной подписи и даты согласования, или направляет мотивированный отказ от согласования Технического проекта в редакции Подрядчика с предложением своих замечаний/корректировок. В случае направления Заказчиком своих предложений/замечаний Подрядчик в течение 3 (трех) рабочих дней вносит изменения в Технический проект и направляет его на согласование.</p>
<p>Стороны согласовали допустимость не более 2 (двух) кругов правок в представленный Подрядчиком Технический проект.</p>
<p>2.4. Все изменения или дополнения после подписания Сторонами Технического проекта по инициативе Заказчика недопустимы, за исключением изменений и дополнений, которые Подрядчик признает существенными (изменение параметров помещения по обстоятельствам, не зависящим от Заказчика и т.п.).</p>
<p>2.5. Заказчик обязуется в течение 3 (трех) рабочих дней с момента наступления обстоятельств, в силу которых возникла необходимость внесения изменений или дополнений в Технический проект, направить Подрядчику письменное уведомление с указанием перечня таких изменений или дополнений, а также обосновать причины внесения изменений или дополнений в Технический проект.</p>
<p>2.6. Подрядчик в течение 5 (пяти) рабочих дней с момента получения уведомления о внесении изменений или дополнений в Технический проект сообщает Заказчику о возможности или невозможности таких изменений. В случае, если изменения или дополнения Технического проекта повлекут увеличение стоимости, сроков изготовления и иных условий, стороны внесут соответствующие изменения в договор путем заключения дополнительного соглашения.</p>

<p class="sec">3. СТОИМОСТЬ РАБОТ И ПОРЯДОК РАСЧЕТОВ</p>
<p>3.1. Общая стоимость работ, подлежащих выполнению по настоящему Договору складывается на основании Калькуляции (Приложение №2 к настоящему договору) и составляет <strong>{total:,.0f} ({total_words})</strong> рублей. НДС не облагается на основании ст. 346.11 НК РФ. В стоимость работ включается стоимость материалов Подрядчика, из которых производится работы.</p>
<p>3.2. Оплата работ осуществляется в следующем порядке:</p>
{pay_html}
<p>3.3. Оплата производится безналичным расчетом на счет Подрядчика либо наличными денежными средствами в кассу.</p>
<p>3.4. Обязательство Заказчика по безналичной оплате считается исполненным в момент зачисления денежных средств на счет Подрядчика, указанный в реквизитах.</p>

<p class="sec">4. ПРАВА И ОБЯЗАННОСТИ СТОРОН</p>
<p><strong>4.1. Подрядчик обязан:</strong></p>
<p>4.1.1. Выполнить работу по Договору согласно Техническому проекту и передать Заказчику мебель в установленный срок.</p>
<p>4.1.2. Уведомить Заказчика о готовности мебели по электронной почте, путем обмена сообщениями (Telegram, WhatsUp, СМС и т.д.) на телефонный номер Стороны согласно реквизитам, указанным в Договоре.</p>
<p>4.1.3. Устранить недостатки, выявленные Заказчиком по результатам приемки работ.</p>
<p>4.1.4. Предоставить Заказчику необходимую и достоверную информацию о предлагаемой работе, ее видах и особенностях, о цене и форме оплаты, а также сообщить Заказчику по его просьбе другие относящиеся к Договору и соответствующей работе сведения. Подтверждением предоставления Заказчику указанной информации и его ознакомление с ней будет являться подписание Заказчиком настоящего Договора.</p>
<p>4.1.5. Предупредить Заказчика о возможных неблагоприятных для него последствиях выполнения его указаний о способе исполнения работы, а также иных не зависящих от Подрядчика обстоятельств, которые грозят годности или прочности результатов выполняемой работы либо создают невозможность ее завершения в срок.</p>
<p><strong>4.2. Заказчик обязан:</strong></p>
<p>4.2.1. Согласовать и подписать Технический проект в срок, установленный Договором.</p>
<p>4.2.2. Оплатить стоимость работ в соответствии с условиями настоящего Договора.</p>
<p>4.2.3. Принять результат работ путем подписания Акта выполненных работ.</p>
<p>4.2.4. Обеспечить сохранность помещения, в котором будет установлена мебель в том виде, в котором помещение было на момент проведения замеров Подрядчиком.</p>
<p>4.2.5. Проводить ремонтно-отделочные работы в помещении, где будет размещена мебель, в строгом соответствии с Техническим проектом и только после получения письменного согласия Подрядчика на проведение таких работ.</p>
<p>4.2.6. Предоставить Подрядчику информацию необходимую для выполнения работ по Договору и отражении ее в Техническом проекте, в том числе, но не ограничиваясь:</p>
<p>- систему крепления мебели. При системе крепления мебели без врезки задней стенки ДВП между стеной и мебелью (например, при монтаже верхних шкафов при зазоре 10-20мм), что позволяет скрывать строительные дефекты стен. При системе крепления мебели с «утопленной» задней стенкой - зазор исключен, но для обеспечения такого крепления требуется наличие идеально ровных стен без строительных дефектов (впадин, бугров и т.д.).</p>
<p>- места при установке мебели, в которых зазоры не приемлемы для Заказчика.</p>
<p>- свес кухонной столешницы у лицевой стороны и у стены.</p>
<p>- месторасположение и размеры техники (холодильник, вытяжка, варочная панель или газовая плита и т.д.), а также указать свои предпочтения по выбору техники для возможности получения у Подрядчика консультации по подбору мебели, во избежание порчи мебели и (или) техники при эксплуатации техники и мебели.</p>
<p>- особенности отделки и (или) ремонта помещения (неровные стены, полы разного уровня, навесной потолок, карнизы, наличие осветительных приборов, наличие труб, стояков, радиаторов и т.д.</p>
<p>- элементы декора, фотопечать, цветовые решения.</p>
<p><strong>4.3. Подрядчик вправе:</strong></p>
<p>4.3.1. Требовать подписания Заказчиком Акта выполненных работ в течение 5 (пяти) календарных дней с даты передачи мебели.</p>
<p>4.3.2. Требовать своевременной оплаты работ в соответствии с п. 3.2 настоящего Договора.</p>
<p>4.3.3. Запрашивать у Заказчика информацию необходимую для надлежащего исполнения Договора.</p>
<p>4.3.4. Привлекать третьих лиц для исполнения обязательств по Договору. Подрядчик несет ответственность за действия/бездействие третьих лиц, выполняющих работу по настоящему Договору, как за свои собственные.</p>
<p>4.3.5. В случаях, когда исполнение работы по Договору стало невозможным вследствие виновных действий или упущений Заказчика, Подрядчик сохраняет право на уплату ему указанной в Договоре цены с учетом выполненной части работы.</p>
<p>4.3.6. Не приступать к работе, а начатую работу приостановить в случаях, когда нарушение Заказчиком своих обязанностей, установленных в п. 4.2 Договора препятствует исполнению Договора, а также при наличии иных обстоятельств, очевидно свидетельствующих о том, что исполнение указанных обязанностей не будет произведено в установленный срок.</p>
<p>4.3.7. Досрочно выполнить работы и требовать от Заказчика принять результат работ и произвести его оплату.</p>
<p>4.3.8. В рекламных целях сделать фотоснимки изготовленной и установленной на месте мебели.</p>
<p><strong>4.4. Заказчик вправе:</strong></p>
<p>4.4.1. Выбрать модель мебели, цвет, компоновку, дизайн, материалы, фурнитуру из которых будет выполнена работа.</p>
<p>4.4.2. Отозвать согласие на обработку своих персональных данных Подрядчиком.</p>

<p class="sec">5. ГАРАНТИЯ И КАЧЕСТВО ВЫПОЛНЕННЫХ РАБОТ</p>
<p>5.1. Подтверждением качества мебели со стороны Подрядчика являются сертификаты соответствия, паспорта на товар, инструкции по эксплуатации и иная документация, устанавливающая требования к качеству мебели на момент доставки в соответствии с условиями настоящего Договора.</p>
<p>Гарантийный срок на мебельную фурнитуру (петли, выдвижные механизмы, выдвижные корзины, подъемные механизмы, сушки для посуды и т.п.) составляет 6 месяцев, гарантийный срок на мебель (корпус, фасады, столешницы) составляет 24 месяца, которые исчисляются с даты подписания Сторонами акта сдачи-приемки выполненных Работ, при условии надлежащей эксплуатации мебели. Срок службы изделий – 5 лет. Гарантийный срок эксплуатации Мебели и срок службы Мебели не распространяются на светильники, таймеры и другие встроенные бытовые приборы. Гарантийный срок таких приборов и срок определяется в соответствии с гарантией производителя.</p>
<p>5.2. Мебель, поставляемая в соответствии с настоящим Договором, должна быть осмотрена Заказчиком (уполномоченным представителем Заказчика) на предмет внешних повреждений без нарушения упаковки непосредственно при получении мебели от Подрядчика на складе последнего, либо при доставке по адресу ее установки.</p>
<p>5.3. Приемка Мебели по количеству и качеству (внешние недостатки) осуществляется:</p>
<p>5.3.1. При самовывозе: Заказчиком в момент приемки мебели на складе Подрядчика и подписания акта выполненных работ;</p>
<p>5.3.2. При доставке: Подрядчиком (грузоперевозчиком Подрядчика): Заказчиком (уполномоченным им грузоперевозчиком или грузополучателем) в момент приемки мебели от Подрядчика уполномоченного на это акта оказания услуг.</p>
<p>5.3.3. Если в будущем сборка мебели будет осуществляться силами ООО «Интерьерные решения» на основании отдельно заключенного договора, то Заказчик обязуется вскрыть упаковку в присутствии уполномоченного лица ООО «Интерьерные решения», осуществляющего сборку мебели.</p>
<p>5.4. При обнаружении нарушения целостности упаковки, несоответствия мебели в момент приемки по качеству и/или количеству, Заказчик делает отметку в акте выполненных работ/оказания услуг. Мебель, в отношении которой у Заказчика имеются замечания, Заказчик принимает на ответственное хранение, о чем делается отметку в акте выполненных работ/оказания услуг. Плата за хранение в этом случае не взимается. Заказчик не вправе использовать (продавать, производить монтаж и т.д.) такую мебель.</p>
<p>5.4.1. Претензия должна содержать информацию о номере договора, дате приемки мебели, дате выявления недостатков, наименование и количество мебели с недостатками, описание недостатков, местонахождение мебели с недостатками, пожелания Заказчика по урегулированию претензии. К претензии Заказчик обязан приложить фотографии мебели с недостатками, на которых отчетливо различимы все выявленные недостатки. Несоблюдение Заказчиком вышеуказанных требований, является основанием для отклонения претензии Подрядчиком.</p>
<p>5.5. В случае несоответствия количества, ассортимента, качества (внешние недостатки) мебели, возникших по вине Подрядчика, Подрядчик обязуется доставить или обеспечить замену некачественной мебели в следующей поставке или в срок, согласованный Сторонами.</p>
<p>5.6. Заказчик лишается права ссылаться на недостатки мебели, если: мебель была принята без проверки на предмет внешних повреждений; без проверки на предмет соответствия ассортимента; мебель была принята без проверки на предмет соответствия количества.</p>
<p>5.7. В ходе рассмотрения претензии Подрядчик вправе запросить у Заказчика, а Заказчик обязан в течение 3 (трех) дней с момента получения запроса предоставить Подрядчику дополнительные фотографии либо видеоматериалы мебели с недостатками, образцы мебели с недостатками. Кроме того, Подрядчик вправе выехать к месту нахождения мебели с недостатками для проведения совместной приемки мебели.</p>
<p>5.8. Подрядчик должен направить письменный ответ на претензию в течение 10 (Десяти) календарных дней с момента получения претензии.</p>
<p>5.9. В случае если претензия признана обоснованной, Подрядчик обязуется соразмерно уменьшить цену некачественной мебели или заменить некачественную мебель или ее часть (комплектующие) на качественную в срок, согласованных с Заказчиком.</p>
<p>5.10. Гарантия не распространяется на недостатки мебели, которые возникли после передачи мебели Заказчику вследствие нарушения Заказчиком правил пользования мебелью, ее ненадлежащей эксплуатации, ненадлежащего или небрежного хранения, ненадлежащего и или небрежного обслуживания, чрезмерной нагрузки на мебель, повреждения, попадания на поверхность изделия едких веществ и/или жидкостей, использования мебели не по назначению, недостаточного и/или неправильного монтажа, произведенного третьими лицами, то есть Не Подрядчиком, а также на неисправности, возникшие из-за несоблюдения технических инструкций производителя, касающихся порядка и условий использования соответствующего вида мебели, на дефекты, возникшие вследствие естественного износа мебели. Гарантия также не распространяется на недостатки мебели, которые возникли после передачи мебели Заказчику вследствие действий третьих лиц, либо обстоятельств непреодолимой силы (форс-мажора).</p>

<p class="sec">6. ПОРЯДОК ПРИЕМКИ ВЫПОЛНЕННЫХ РАБОТ</p>
<p>6.1. По факту выполнения работ Подрядчик представляет Заказчику Акта выполненных работ в двух экземплярах по форме, согласованной в Приложении № 3 к Договору. При необоснованном отказе одной из сторон от подписания акта в нем делается отметка об этом и акт подписывается другой стороной в одностороннем порядке.</p>
<p>6.2. Передача мебели производится по Акту выполненных работ, который составляется в момент передачи мебели.</p>
<p>6.3. Приемка изготовленной мебели производится:</p>
<p>- в случае самовывоза Заказчиком по адресу склада Подрядчика;</p>
<p>- в случае доставки мебели Подрядчиком в рамках заключенного между Заказчиком и Подрядчиком дополнительного договора доставки мебели по адресу Заказчика.</p>
<p>6.4. В случае самовывоза Заказчиком мебели Подрядчик обеспечивает погрузку мебели на своем складе в транспортное средство Заказчика (перевозчика Заказчика), а Заказчик - их транспортировку и выгрузку.</p>
<p>6.5. Заказчик обязан в течение 3 (трех) календарных дней с даты получения уведомления от Подрядчика о готовности мебели к поставке, прибыть на склад Подрядчика для выборки мебели, в установленные в уведомлении дату и время.</p>
<p>6.6. После погрузки мебели на транспортное средство Заказчика Подрядчик не несет ответственности за повреждения мебели, произошедшие вследствие нарушения Заказчиком правил транспортировки, выгрузки, условий хранения и эксплуатации.</p>
<p>6.7. В случае доставки мебели Подрядчиком Заказчик обязуется подготовить помещение для приемки, подъезд и проход к нему, создать условия для сохранности мебели при приемке, обеспечить бесплатной парковкой автомобиль Подрядчика на период отгрузки мебели по адресу Заказчика.</p>
<p>6.8. При уклонении Заказчика от получения мебели, Подрядчик бесплатно хранит мебель в течение 7(семи) дней. С восьмого дня Подрядчик принимает мебель на ответственное хранение, о чем уведомляет Заказчика и вправе запросить оплату за хранение в сумме 500 рублей за каждый день. Момент окончания ответственного хранения - передача мебели по акту приема-передачи. Дополнительных документов о принятии на ответственное хранение, кроме одностороннего уведомления, между сторонами не требуется.</p>
<p>6.9. В случае наступления обстоятельств, объективно препятствующих поставке мебели в согласованные сторонами сроки, Подрядчик вправе в одностороннем порядке изменить срок отгрузки мебели. Указанными обстоятельствами могут быть действия третьих лиц, которые способствуют исполнению договора, погодные условия и иные обстоятельства.</p>
<p>6.10. При получении мебели Заказчик обязан осмотреть ее, проверить соответствие качества, количества и комплектности условиям Договора.</p>
<p>6.11. Риск случайной гибели или повреждения мебели, а также право собственности переходит от Подрядчика к Заказчику в момент подписания соответствующих документов о приемке (товарная накладная, универсальный передаточный документ и т.д.). В случае если доставку мебели осуществляет транспортная компания, то риск случайной гибели или повреждения мебели, а также право собственности на нее переходит к Заказчику с момента сдачи Подрядчиком мебели транспортной компании.</p>
<p>6.12. При наличии заказа на услуги монтажа мебели, который оформляется дополнительным договором между Подрядчиком и Заказчиком мебель монтируется Подрядчиком.</p>
<p>6.13. При отсутствии заказа на монтаж мебели, монтаж (установка) мебели по месту осуществляется Заказчиком самостоятельно и за свой счет. В этом случае Подрядчик не несёт ответственность за качество монтажных работ и возможные недостатки мебели, возникшие в результате самостоятельного монтажа Заказчиком.</p>

<p class="sec">7. ОТВЕТСТВЕННОСТЬ СТОРОН</p>
<p>7.1. Стороны несут ответственность за неисполнение или ненадлежащее исполнение своих обязательств по Договору в соответствии с Законом Российской Федерации от 7 февраля 1992 г. № 2300-1 «О защите прав потребителей» и иными правовыми актами, принятыми в соответствии с ним.</p>
<p>7.2. За нарушение сроков оплаты услуг Подрядчик вправе потребовать с Заказчика уплаты неустойки (пени) за каждый день просрочки в размере 0,1 % от суммы задолженности.</p>
<p>7.3. Подрядчик не несет ответственности за невыполнение обязательств по Договору, если оно вызвано неисполнением соответствующих обязанностей Заказчика.</p>
<p>7.4. В случае отказа Заказчика от мебели надлежащего качества, изготовленной по индивидуальному заказу (эскизу), которая имеет нестандартные размеры, цвет, форму, и ее дальнейшая реализация невозможна, Стороны признают, что размер убытков Подрядчика составляет стоимость соответствующей (не вывезенной) партии мебели.</p>
<p>7.5. При разгрузке мебели силами Заказчика материальную ответственность за сохранность груза и автотранспортного средства несет Заказчик. В случае нанесения ущерба автотранспортному средству Подрядчика (Перевозчика Подрядчика), представитель Заказчика и Подрядчика (или представитель транспортной организации) составляют акт о причиненных повреждениях и причинах возникновения повреждений. При отказе представителя Заказчика от подписи в акте, акт составляется в одностороннем порядке Подрядчиком (представителем транспортной организации) и является основанием для возмещения убытков.</p>

<p class="sec">8. ПОРЯДОК РАЗРЕШЕНИЯ СПОРОВ</p>
<p>8.1. Все споры или разногласия, возникающие между Сторонами по настоящему Договору или в связи с ним, разрешаются путем переговоров между ними.</p>
<p>8.2. До передачи спора на рассмотрение суда Стороны предусматривают обязательный претензионный порядок урегулирования разногласий. Направление претензии возможно по электронной почте, путем обмена сообщениями (Telegram, WhatsUp, СМС и т.д.) на телефонный номер Стороны согласно реквизитам, указанным в Договоре. Срок ответа на претензию Сторон устанавливают в 10 (Десять) рабочих дней с момента получения претензии заинтересованной Стороны.</p>
<p>8.3. В случае невозможности разрешения разногласий путем переговоров споры или разногласия, возникающие между Сторонами, решаются в судебном порядке по месту нахождения Подрядчика.</p>

<p class="sec">9. СРОК ДЕЙСТВИЯ ДОГОВОРА</p>
<p>9.1. Договор вступает в силу с момента его подписания обеими Сторонами и действует до полного исполнения Сторонами принятых на себя обязательств.</p>
<p>9.2. Изменения и дополнения к Договору принимаются по обоюдному соглашению Сторон, путем подписания Дополнительного соглашения к Договору.</p>
<p>9.3. Договор может быть расторгнут досрочно по письменному соглашению Сторон, в одностороннем порядке в случаях, предусмотренных действующим законодательством Российской Федерации.</p>
<p>9.4. В случае одностороннего отказа Заказчика от Договора Заказчик обязуется оплатить Подрядчику фактически понесенных им расходов, связанных с исполнением обязательств по данному Договору.</p>

<p class="sec">10. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ</p>
<p>10.1. При заключении Договора и подписания других документов в рамках его исполнения, Стороны согласны на факсимильное воспроизведение подписи («факсимиле»), уполномоченных ими лиц, а также на обмен копиями документов. Стороны признают юридически значимой переписку между сторонами по электронной почте, а также переписку по номеру телефона, указанному в настоящем договоре в любых приложениях к нему (для обмена сообщениями: Telegram, WhatsUp, СМС и т.д.). Направленные таким образом документы считаются подписанными простой электронной подписью и признаются Сторонами равнозначными бумажным, подписанным собственноручной подписью Сторон.</p>
<p>10.2. Стороны признают юридическую силу всех документов, требований, уведомлений, претензий, извещений, оформленных должным образом и направленных друг другу в электронном виде по указанным адресам электронной почты и телефонам во исполнение настоящего Договора. Стороны договорились, что сообщение при такой форме коммуникации считается доставленным тогда, когда приложение, через которое производится коммуникация подтвердит факт направления сообщения через свой внутренний интерфейс. При этом и Заказчик, и Подрядчик обязуются регулярно просматривать указанные источники коммуникации. Стороны договорились, что сообщение считается доставленным и в тех случаях, если оно поступило лицу, которому оно направлено, но по обстоятельствам, зависящим от него, не было ему вручено или адресат не ознакомился с ним.</p>
<p>10.3. Каждая Сторона обязуется обеспечивать конфиденциальность полученной ею в связи с заключением или исполнением Договора от другой Стороны информации ограниченного доступа.</p>
<p>К информации ограниченного доступа относится информация в любой форме, содержащая коммерческую, служебную или иную охраняемую законом тайну, секрет производства, персональные данные. При передаче информации Сторона обязана явно обозначить статус информации как информации ограниченного доступа, сделав отметку об этом на материальных носителях информации, в акте приема-передачи документации или иным образом до передачи информации.</p>
<p>10.4 Заказчик дает свое согласие на обработку своих персональных данных, а именно: на действия, совершаемые с использованием средств автоматизации или без использования таких средств, включая сбор, запись, систематизацию, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передачу (распространение, предоставление, доступ), обезличивание, блокирование, удаление, уничтожение его персональных данных, Обществу с ограниченной ответственностью «ИНТЕРЬЕРНЫЕ РЕШЕНИЯ» (ОГРН: 1196451012251, ИНН: 6450106826), расположенному по адресу: 410018, Российская Федерация, Саратовская область, Саратов г., Усть-Курдюмская, 3 помещение 1.</p>
<p>Цель обработки персональных данных: исполнение настоящего договора. Заказчик дает свое согласие на использование следующих персональных данных: фамилия, имя, отчество, паспортные данные, адрес места жительства, фотографии изделий на объекте Заказчика; номер телефона, адрес электронной почты. Согласие предоставляется на срок действия настоящего договора, а после прекращения договора - в течение 12 месяцев с даты подписания Сторонами акта сдачи-приемки выполненных Работ.</p>
<p>Настоящее условие договора может быть изменено Заказчиком - субъектом персональных данных, в любой момент в одностороннем порядке путем отзыва согласия на обработку персональных данных. Отзыв согласия на обработку персональных данных осуществляется посредством составления письменного документа, который может быть направлен в адрес Подрядчика почтовым отправлением с уведомлением о вручении, либо вручен лично под расписку представителю Подрядчика.</p>
<div style="display:flex;justify-content:space-between;margin:20px 0;border-top:1px solid #000;padding-top:8px">
<span>______________________ /</span>
<span>______________________ /</span>
</div>
<p style="display:flex;justify-content:space-between;text-indent:0" class="no-indent"><span style="text-align:center;width:48%">(подпись)</span><span style="text-align:center;width:48%">(расшифровка подписи от руки)</span></p>
<p>10.5. К настоящему Договору прилагаются и являются неотъемлемой частью следующие приложения:</p>
<p class="no-indent">1. Технический проект.</p>
<p class="no-indent">2. Калькуляция работ.</p>
<p class="no-indent">3. Правила эксплуатации корпусной мебели.</p>
<p class="no-indent">4. Образец Акта выполненных работ</p>

<p class="sec">11. РЕКВИЗИТЫ СТОРОН</p>
<table><tr><th style="width:50%">Подрядчик:</th><th style="width:50%">Заказчик:</th></tr>
<tr><td>ООО «Интерьерные решения»<br>ОГРН: 1196451012251<br>ИНН: 6450106826<br>410018, Саратовская обл., г. Саратов, ул. Усть-Курдюмская, д. 3, пом. 1<br><br>Менеджер: <strong>{manager_line}</strong><br><br>Подпись: <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> / <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><br>М.П.</td>
<td><strong>{fname}</strong><br>Паспорт: {_passport_str(c)}<br>Выдан: {c.get("passport_issued_by") or "___________"}<br>{_fmt_date(c.get("passport_issued_date") or "")}, код {c.get("passport_dept_code") or "___"}<br>Адрес регистрации: {_reg_address(c)}<br>Тел.: {c.get("phone") or "___________"}<br>Email: {c.get("email") or "___________"}<br><br>Подпись: <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> / <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></td></tr></table>
</div></body></html>'''

    elif doc_type == 'act':
        return f'''<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Акт выполненных работ к договору №{contract_num}</title>{style}</head><body><div class="page">
<p class="no-indent" style="text-align:right">Приложение № 4 к договору бытового подряда<br>на изготовление мебели от {contract_date_full}</p>
<h1>«Акт выполненных работ»</h1>
<div class="city-date"><span>г. Саратов</span><span>«____» ______________ 20____г.</span></div>
<p class="no-indent">ООО «Интерьерные решения», в лице менеджера <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>, действующего на основании доверенности № <span class="ul" style="min-width:40px">&nbsp;&nbsp;&nbsp;&nbsp;</span> от <span class="ul" style="min-width:80px">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>, именуемый в дальнейшем «Подрядчик», и гр. <strong>{fname}</strong>, именуемый (ая) в дальнейшем «Заказчик», подписали настоящий Акт выполненных работ о нижеследующем:</p>
<p>1. Подрядчик изготовил для Заказчика мебель по договору бытового подряда на изготовление мебели от {contract_date_full}:</p>
<table><tr><th style="width:5%">№</th><th>Наименование мебели, включая её элементы</th><th style="width:12%">Ед. изм.</th><th style="width:10%">Кол-во</th><th style="width:18%">Стоимость, руб.</th></tr>
{products_rows}
<tr><td colspan="4" style="text-align:right;font-weight:bold">ИТОГО:</td><td style="text-align:right;font-weight:bold">{total:,.0f}</td></tr></table>
<p class="center">({total_words})</p>
<p>2. Комплектность, количество, вид, характеристики мебели соответствуют условиям договора. Визуальный осмотр мебели на предмет повреждений, царапин, сколов, трещин и других недостатков произведён Заказчиком. Фурнитура (петли, выдвижные механизмы, подъёмники) проверена на предмет работоспособности.</p>
<p>3. Заказчик принял результат выполненных работ. Претензий к качеству и комплектности мебели не имеет.</p>
<p>4. Обязательства Подрядчика по Договору выполнены в полном объёме. Оплата по Договору произведена Заказчиком в полном объёме.</p>
<table style="margin-top:30px"><tr><th style="width:50%">Подрядчик</th><th style="width:50%">Заказчик</th></tr>
<tr><td>ООО «Интерьерные решения»<br><br>Менеджер: <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><br>М.П.</td>
<td>{fname}<br>Паспорт: {_passport_str(c)}<br>Телефон: {c.get("phone") or "___________"}<br><br>Подпись: <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></td></tr></table>
</div></body></html>'''

    elif doc_type == 'tech':
        return f'''<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Технический проект к договору №{contract_num}</title>{style}</head><body><div class="page">
<p class="no-indent" style="text-align:right">Приложение № 1 к договору бытового подряда<br>на изготовление мебели от {contract_date_full}</p>
<h1>«Технический проект»</h1>
<table style="margin-top:16px"><tr><th colspan="2">Характеристики изделия</th></tr>
<tr><td style="width:30%;font-weight:bold">Корпус:</td><td style="min-height:30px">&nbsp;</td></tr>
<tr><td style="font-weight:bold">Фасад 1:</td><td>&nbsp;</td></tr>
<tr><td style="font-weight:bold">Фасад 2:</td><td>&nbsp;</td></tr>
<tr><td style="font-weight:bold">Столешница:</td><td>&nbsp;</td></tr>
<tr><td style="font-weight:bold">Стеновая панель:</td><td>&nbsp;</td></tr>
<tr><td style="font-weight:bold">Подсветка:</td><td>Тип: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Свет: </td></tr>
<tr><td style="font-weight:bold">Фрезеровка:</td><td>&nbsp;</td></tr></table>
<p style="margin-top:20px;text-indent:0">Место для схемы / эскиза:</p>
<div style="border:1px solid #000;min-height:120mm;margin-top:8px"></div>
<table style="margin-top:30px"><tr><th style="width:50%">Подрядчик</th><th style="width:50%">Заказчик</th></tr>
<tr><td>ООО «Интерьерные решения»<br><br>Менеджер: <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><br>М.П.</td>
<td>{fname}<br><br>Подпись: <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></td></tr></table>
</div></body></html>'''

    elif doc_type == 'delivery':
        daddr = _delivery_address(c)
        floor_ = c.get('delivery_floor') or '___'
        elevator = c.get('delivery_elevator') or 'нет'
        entrance = c.get('delivery_entrance') or '___'
        delivery_date_str = _fmt_date(c.get('delivery_date') or '')
        dcost = float(c.get('delivery_cost') or 0)
        dcost_str = f'{dcost:,.0f} ({_num_to_words(dcost)})' if dcost else '<span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>'
        return f'''<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Договор доставки — {contract_num}</title>{style}</head><body><div class="page">
<h1>ДОГОВОР</h1>
<h2>на оказание услуг по доставке мебели</h2>
<div class="city-date"><span>г. Саратов</span><span>{contract_date_full}</span></div>
<p class="no-indent">ООО «Интерьерные решения», в лице менеджера <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>, действующего на основании доверенности № <span class="ul" style="min-width:40px">&nbsp;&nbsp;&nbsp;&nbsp;</span> от <span class="ul" style="min-width:80px">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>, именуемый в дальнейшем «Исполнитель», и гр. <strong>{fname}</strong>, именуемый (ая) в дальнейшем «Заказчик», заключили настоящий Договор о нижеследующем:</p>
<p class="sec">1. ПРЕДМЕТ ДОГОВОРА</p>
<p>1.1. Исполнитель обязуется оказать услуги по доставке мебели, изготовленной по договору бытового подряда на изготовление мебели № {contract_num} от {contract_date_full} (далее — Основной договор), а Заказчик обязуется принять и оплатить указанные услуги.</p>
<p>1.2. Мебель доставляется по адресу: <strong>{daddr}</strong>, подъезд: {entrance}, этаж: {floor_}, лифт: {elevator}.</p>
<p>1.3. Дата доставки: <strong>{delivery_date_str}</strong>. Конкретное время доставки согласовывается Сторонами дополнительно.</p>
<p>1.4. Доставка осуществляется в разобранном виде (без сборки и монтажа), если иное не предусмотрено отдельным договором.</p>
<p class="sec">2. ПРАВА И ОБЯЗАННОСТИ СТОРОН</p>
<p>2.1. Исполнитель обязан:</p>
<p>2.1.1. Доставить мебель в согласованный срок по указанному адресу.</p>
<p>2.1.2. Обеспечить сохранность мебели при транспортировке.</p>
<p>2.1.3. Уведомить Заказчика об изменении времени доставки не менее чем за 2 часа.</p>
<p>2.2. Заказчик обязан:</p>
<p>2.2.1. Обеспечить свободный доступ к месту доставки и наличие ответственного лица для приёмки.</p>
<p>2.2.2. Оплатить услуги по доставке в соответствии с Приложением № 1.</p>
<p>2.2.3. При обнаружении внешних повреждений мебели в ходе доставки — незамедлительно сообщить Исполнителю до подписания акта приёма-передачи.</p>
<p>2.3. Исполнитель вправе однократно предоставить Заказчику скидку в размере стоимости доставки (8 000 руб.) при доставке в пределах г. Саратова и г. Энгельса. В случае повторной доставки по причинам, зависящим от Заказчика, стоимость определяется согласно Приложению № 1.</p>
<p class="sec">3. СТОИМОСТЬ УСЛУГ И ПОРЯДОК ОПЛАТЫ</p>
<p>3.1. Стоимость услуг по доставке составляет <strong>{dcost_str}</strong> рублей, в соответствии с Приложением № 1 к настоящему Договору.</p>
<p>3.2. Оплата производится в день доставки до начала разгрузки мебели, если иное не согласовано Сторонами в письменной форме.</p>
<p>3.3. Расчёт стоимости доставки за пределы г. Саратова и г. Энгельса производится исходя из километража от склада Исполнителя (г. Саратов, ул. Усть-Курдюмская, д. 3) до адреса Заказчика согласно сервису Яндекс Карты.</p>
<p class="sec">4. ОТВЕТСТВЕННОСТЬ СТОРОН</p>
<p>4.1. В случае повреждения мебели по вине Исполнителя при транспортировке Исполнитель обязан возместить причинённый ущерб.</p>
<p>4.2. Исполнитель не несёт ответственности за повреждения, произошедшие по вине Заказчика (неправильная упаковка, неверно указанный адрес и т.п.).</p>
<p>4.3. В случае отказа Заказчика от доставки менее чем за 24 часа Исполнитель вправе удержать фактически понесённые расходы.</p>
<p class="sec">5. ПОРЯДОК РАЗРЕШЕНИЯ СПОРОВ</p>
<p>5.1. Все споры разрешаются путём переговоров, при недостижении согласия — в судебном порядке по законодательству РФ.</p>
<p class="sec">6. ПРОЧИЕ УСЛОВИЯ</p>
<p>6.1. Настоящий Договор вступает в силу с момента подписания и действует до полного исполнения Сторонами своих обязательств.</p>
<p>6.2. Договор составлен в двух экземплярах, имеющих равную юридическую силу.</p>
<p class="sec">7. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</p>
<table><tr><th style="width:50%">Исполнитель</th><th style="width:50%">Заказчик</th></tr>
<tr><td>ООО «Интерьерные решения»<br>г. Саратов, ул. Усть-Курдюмская, д. 3<br>ИНН/КПП: _______________<br>р/с: _______________<br>Банк: _______________<br>БИК: _______________<br><br>Менеджер: <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><br>М.П.</td>
<td>{fname}<br>Паспорт: {_passport_str(c)}<br>Адрес доставки: {daddr}<br>Телефон: {c.get("phone") or "___________"}<br><br>Подпись: <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></td></tr></table>
<div style="height:30px"></div>
<p class="no-indent" style="text-align:right">Приложение № 1 к договору на оказание услуг по доставке мебели от {contract_date_full}</p>
<h2>«Калькуляция на выполнение услуг по доставке мебели»</h2>
<table><tr><th>Наименование работ и услуг</th><th style="width:15%">Ед. изм.</th><th style="width:12%">Кол-во</th><th style="width:18%">Цена, руб.</th><th style="width:18%">Стоимость, руб.</th></tr>
<tr><td>Доставка мебели в пределах г. Саратова и г. Энгельса *</td><td style="text-align:center">1 услуга</td><td style="text-align:center">1</td><td style="text-align:right">8 000</td><td style="text-align:right">8 000</td></tr>
<tr><td>Доставка мебели за пределы г. Саратова и г. Энгельса **</td><td style="text-align:center">1 км</td><td style="text-align:center">___</td><td style="text-align:right">70</td><td style="text-align:right">___</td></tr>
<tr><td colspan="4" style="text-align:right;font-weight:bold">Итого:</td><td style="text-align:right;font-weight:bold">___________</td></tr>
<tr><td colspan="4" style="text-align:right">Скидка ***:</td><td style="text-align:right">___________</td></tr>
<tr><td colspan="4" style="text-align:right;font-weight:bold">Итого со скидкой:</td><td style="text-align:right;font-weight:bold">___________</td></tr></table>
<p style="font-size:10pt;text-indent:0;margin-top:8px">* Исполнитель вправе однократно предоставить Заказчику скидку в размере стоимости доставки (8 000 руб.) в пределах территориальных границ г. Саратова и г. Энгельса. При повторной доставке по причинам, зависящим от Заказчика, стоимость определяется согласно настоящему приложению.</p>
<p style="font-size:10pt;text-indent:0">** Расчёт стоимости доставки учитывает расстояние от склада Исполнителя (г. Саратов, ул. Усть-Курдюмская, д. 3) до дома (подъезда) Заказчика. Километраж определяется по сервису Яндекс Карты.</p>
</div></body></html>'''

    elif doc_type == 'assembly':
        daddr = _delivery_address(c)
        assembly_days = int(c.get('assembly_days') or 1)
        delivery_date_str = _fmt_date(c.get('delivery_date') or '')
        acost = float(c.get('assembly_cost') or 0)
        acost_str = f'{acost:,.0f} ({_num_to_words(acost)})' if acost else '<span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>'
        return f'''<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Договор монтажа — {contract_num}</title>{style}</head><body><div class="page">
<h1>ДОГОВОР</h1>
<h2>на оказание услуг по сборке и монтажу мебели</h2>
<div class="city-date"><span>г. Саратов</span><span>{contract_date_full}</span></div>
<p class="no-indent">ООО «Интерьерные решения», в лице менеджера <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>, действующего на основании доверенности № <span class="ul" style="min-width:40px">&nbsp;&nbsp;&nbsp;&nbsp;</span> от <span class="ul" style="min-width:80px">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>, именуемый в дальнейшем «Исполнитель», и гр. <strong>{fname}</strong>, именуемый (ая) в дальнейшем «Заказчик», заключили настоящий Договор о нижеследующем:</p>
<p class="sec">1. ПРЕДМЕТ ДОГОВОРА</p>
<p>1.1. Исполнитель обязуется выполнить работы по сборке и монтажу мебели, изготовленной по договору бытового подряда № {contract_num} от {contract_date_full}, а Заказчик обязуется принять и оплатить указанные работы.</p>
<p>1.2. Адрес выполнения работ: <strong>{daddr}</strong>.</p>
<p>1.3. Ориентировочная дата начала работ: <strong>{delivery_date_str}</strong>. Срок выполнения работ: {assembly_days} ({_days_words(assembly_days)}) рабочих дней.</p>
<p>1.4. В объём работ входит: сборка всех корпусных элементов, установка фасадов и фурнитуры, регулировка петель и выдвижных систем, монтаж столешницы и стеновых панелей (при наличии), подключение подсветки (при наличии).</p>
<p class="sec">2. ПРАВА И ОБЯЗАННОСТИ СТОРОН</p>
<p>2.1. Исполнитель обязан:</p>
<p>2.1.1. Выполнить монтажные работы качественно, в соответствии с техническим проектом.</p>
<p>2.1.2. Соблюдать чистоту на месте производства работ, убрать строительный мусор по окончании монтажа.</p>
<p>2.1.3. Уведомить Заказчика об обнаруженных в ходе монтажа дефектах мебели или несоответствии помещения.</p>
<p>2.2. Заказчик обязан:</p>
<p>2.2.1. Обеспечить свободный доступ к месту монтажа и освободить помещение от посторонних предметов.</p>
<p>2.2.2. Обеспечить наличие электроснабжения и освещения в зоне монтажа.</p>
<p>2.2.3. Принять выполненные работы и подписать акт приёмки.</p>
<p>2.2.4. Оплатить работы по монтажу в соответствии с условиями настоящего Договора.</p>
<p class="sec">3. СТОИМОСТЬ РАБОТ И ПОРЯДОК ОПЛАТЫ</p>
<p>3.1. Стоимость работ по сборке и монтажу мебели составляет <strong>{acost_str}</strong> рублей.</p>
<p>3.2. Оплата производится в день завершения монтажных работ до подписания акта приёмки, если иное не согласовано Сторонами.</p>
<p class="sec">4. ОТВЕТСТВЕННОСТЬ СТОРОН</p>
<p>4.1. Исполнитель несёт ответственность за качество выполненных монтажных работ в течение гарантийного срока — 12 (двенадцати) месяцев с момента подписания акта приёмки.</p>
<p>4.2. Гарантия Исполнителя не распространяется на дефекты, возникшие вследствие нарушения Заказчиком Правил эксплуатации мебели, механических повреждений или воздействия влаги.</p>
<p>4.3. Исполнитель не несёт ответственности за невозможность выполнения монтажа по причинам, зависящим от Заказчика (неготовность помещения, отсутствие электроснабжения и т.п.).</p>
<p class="sec">5. ПОРЯДОК СДАЧИ И ПРИЁМКИ РАБОТ</p>
<p>5.1. Приёмка выполненных работ оформляется подписанием Сторонами акта приёмки смонтированной мебели.</p>
<p>5.2. При наличии замечаний Заказчик фиксирует их в акте. Исполнитель устраняет обоснованные замечания в согласованные сроки.</p>
<p class="sec">6. ПРОЧИЕ УСЛОВИЯ</p>
<p>6.1. Настоящий Договор вступает в силу с момента подписания и действует до полного исполнения Сторонами своих обязательств.</p>
<p>6.2. Договор составлен в двух экземплярах, имеющих равную юридическую силу.</p>
<p class="sec">7. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</p>
<table><tr><th style="width:50%">Исполнитель</th><th style="width:50%">Заказчик</th></tr>
<tr><td>ООО «Интерьерные решения»<br>г. Саратов, ул. Усть-Курдюмская, д. 3<br>ИНН/КПП: _______________<br>р/с: _______________<br>Банк: _______________<br>БИК: _______________<br><br>Менеджер: <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><br>М.П.</td>
<td>{fname}<br>Паспорт: {_passport_str(c)}<br>Адрес монтажа: {daddr}<br>Телефон: {c.get("phone") or "___________"}<br><br>Подпись: <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></td></tr></table>
</div></body></html>'''

    elif doc_type == 'rules':
        return f'''<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Правила эксплуатации мебели</title>{style}</head><body><div class="page">
<p class="no-indent" style="text-align:right">Приложение № 3 к договору бытового подряда на изготовление мебели от {contract_date_full}</p>
<h1>«Правила эксплуатации корпусной мебели»</h1>

<p class="sec">1. ОБЩИЕ РЕКОМЕНДАЦИИ</p>
<p>1.1. Срок службы Мебели и сохранение его потребительских свойств напрямую зависят от соблюдения Заказчиком правил, изложенных в настоящем приложении.</p>
<p>1.2. Климатические условия и воздействия окружающей среды (свет, влажность, температура) напрямую влияют на состояние мебели.</p>
<p>1.3. Подрядчик рекомендует соблюдать оптимальные климатические условия в помещении, где установлена мебель: температура воздуха от +18°C до +25°C, относительная влажность воздуха 45% - 70%.</p>
<p>1.4. Следует оберегать мебель от длительного воздействия прямых солнечных лучей, источников тепла (батареи, обогреватели, духовые шкафы, плиты на расстоянии менее 0,5 м), а также от резких перепадов температуры и влажности.</p>
<p>1.5. Запрещается воздействие на Мебель агрессивных жидкостей (кислот, щелочей, растворителей), абразивных чистящих средств и материалов, способных повредить покрытие.</p>
<p>1.6. Мебель предназначена для эксплуатации в жилых или общественных помещениях в соответствии с ее функциональным назначением. Подрядчик не несет ответственности за повреждения, вызванные несоблюдением рекомендуемых условий.</p>
<p>1.7. Подрядчик гарантирует соответствие Мебели обязательным требованиям нормативных документов, действующих на территории РФ, в том числе:<br>
* ГОСТ 19917-2014 «Мебель для сидения и лежания. Общие технические условия»;<br>
* ГОСТ 32289-2013 «Плиты древесно-стружечные, облицованные пленками на основе термореактивных полимеров. Технические условия»;<br>
* ГОСТ 16371-2014 «Мебель. Общие технические условия»;<br>
* ТР ТС 025/2012 «О безопасности мебельной продукции».</p>

<p class="sec">2. УСЛОВИЯ ХРАНЕНИЯ</p>
<p>2.1. Хранение Мебели до ее установки должно осуществляться в сухих, проветриваемых, отапливаемых помещениях, защищенных от атмосферных осадков, прямых солнечных лучей и источников тепла. Запрещается хранить изделия в помещениях с повышенной влажностью (санузлы, бани, подвалы без отопления).</p>
<p>2.2. Рекомендуемый диапазон температуры воздуха от +10°C до +25°C. Запрещена эксплуатация при температурах ниже -20°C и выше +40°C, а также резкие перепады температур.</p>
<p>2.3. Рекомендуемая относительная влажность воздуха 45% - 70%. Длительное воздействие повышенной влажности (свыше 80%) или чрезмерной сухости (ниже 40%) недопустимо и приводит к деформации элементов (разбуханию, рассыханию, расслоению).</p>
<p>2.4. Мебель должна храниться в заводской упаковке на ровной поверхности. Запрещается хранить изделия в вертикальном положении, прислонив к стене.</p>
<p>2.5. Перед установкой Мебели, доставленной или хранившейся при отрицательных температурах, необходимо выдержать ее в оригинальной упаковке в условиях помещения не менее 72 часов (3 суток) для адаптации к комнатной температуре и влажности.</p>

<p class="sec">3. ПРАВИЛА ЭКСПЛУАТАЦИИ И УХОДА ЗА МЕБЕЛЬЮ</p>
<p><strong>3.1. Общие правила:</strong></p>
<p>3.1.1. Не превышайте максимально допустимые нагрузки на элементы Мебели: полки - до 15 кг, выдвижные ящики из ЛДСП - до 5 кг, ящики на системе «метабокс» - до 18 кг, ящики на системе «тандембокс» - до 35 кг.</p>
<p>3.1.2. Общая нагрузка на подвесной шкаф не должна превышать 70 кг. Высокие конструкции (пеналы, стеллажи) должны быть больше нагружены в нижней части.</p>
<p>3.1.3. Равномерно распределяйте нагрузку внутри шкафов и ящиков: тяжелые предметы размещайте ближе к краям и опорам, легкие - в центре.</p>
<p>3.1.4. Исключите попадание воды на незащищенные торцы деталей, места стыков и торцов изделия.</p>
<p>3.1.5. Запрещается воздействовать на поверхности абразивными, кислотными, щелочными средствами, ацетоном, растворителями.</p>
<p>3.1.6. Не допускается заслонять вентиляционные решетки и воздухозаборные отверстия бытовых приборов, встроенных в мебель.</p>
<p>3.1.7. При установке Мебели в бревенчатых домах, вследствие усадки таких домов, возможна деформация: перекашивание фасадов, опускание как верхних, так и нижних модулей, это не является признаком некачественной работы Подрядчика.</p>
<p><strong>3.2. Корпус ЛДСП:</strong></p>
<p>3.2.1. Главное правило! ЛДСП боится длительного контакта с водой. Попадание жидкости на кромки и тем более в места стыков недопустимо – плита разбухнет и деформируется. Все пролитые жидкости следует немедленно вытирать насухо.</p>
<p>3.2.2. Запрещается мыть ЛДСП большим количеством воды, использовать пароочистители. Не оставляйте не отжатые тряпки, мокрые полотенца на торцах деталей.</p>
<p>3.2.3. Запрещается применять абразивные и едкие химические средства.</p>
<p>3.2.4. Протирайте сухой или слегка влажной хорошо отжатой тканью. Для удаления загрязнений использовать мягкие мыльные растворы.</p>
<p>3.2.5. Берегите кромки и торцы от сколов и ударов. Именно через поврежденные кромки влага легче всего проникает внутрь плиты.</p>
<p>3.2.6. Не превышайте максимально допустимые нагрузки на полки и перегородки. Равномерно распределяйте вес.</p>
<p>3.2.7. Избегайте расположения Мебели вплотную к отопительным приборам (батареям, обогревателям), это может привести к расслоению ламинированного слоя и деформации плиты.</p>
<p><strong>3.3. Фасады МДФ:</strong></p>
<p>3.3.1. Избегайте резких перепадов температуры и попадания прямых солнечных лучей.</p>
<p>3.3.2. Не допускайте длительного контакта поверхности с сильно нагретыми предметами (сковородки, кастрюли, утюги).</p>
<p>3.3.3. Избегайте ударов, царапин острыми предметами, давления на выступающие элементы.</p>
<p>3.3.4. Исключите контакт с агрессивными химическими веществами: растворителями, ацетоном, сильными чистящими порошками, средствами для мытья стекол. Регулярно удаляйте пыль мягкой тканью. Используйте губки с мягкой стороной (без абразивного слоя) для удаления более сложных загрязнений.</p>
<p>3.3.5. Разрешается использовать нейтральные (pH-нейтральные) средства, а также мягкие мыльные растворы.</p>
<p>3.3.6. Запрещается мыть МДФ большим количеством воды, использовать пароочистители. Не оставляйте не отжатые тряпки, мокрые полотенца на торцах деталей.</p>
<p>3.3.7. Не рекомендуется снимать защитную пленку с фасадов до окончания процесса установки мебели.</p>
<p>3.3.8. При изготовлении дверных полотен высотой более 1600 мм, рекомендовано использовать систему выпрямления дверей, чтобы избежать возможной деформации изделия.</p>
<p><strong>3.4. Столешницы и стеновые панели из пластика и искусственного (акрилового) камня:</strong></p>
<p>3.4.1. Для очистки используйте мягкую ткань, мягкую губку, салфетки из микрофибры и средства для ухода за глянцевыми поверхностями. Для удаления сложных загрязнений со столешниц из искусственного (акрилового) камня используются специальные средства.</p>
<p>3.4.2. Запрещается использовать жесткие и металлические губки, щетки и абразивные чистящие средства. Использовать при очистке кислоты, щелочи, соли, растворители.</p>
<p>3.4.5. Запрещается использовать поверхность в качестве разделочной доски. Воздействовать на поверхность столешницы острыми предметами. Передвигать по поверхности посуду с металлическим дном.</p>
<p>3.4.6. На пластиковой столешнице не оставляйте лужи воды, не отжатые тряпки, мокрые полотенца, особенно на стыках и возле мойки. Сразу удаляйте воду с поверхностей столешницы и со стыковочных швов. Еврозапил (зона стыка без соединительной планки) особенно уязвим для влаги и высоких температур. Он несет декоративную функцию.</p>
<p>3.4.7. Не допускается ставить на поверхность столешницы горячие (&gt;60°С) предметы (чайники, кастрюли, сковороды, утюги и т.п.). Используйте специальные термоизоляционные подставки под горячее, разделочные доски, салфетки, коврики и т.п. Не допускается резкий перепад температур.</p>
<p>3.4.8. Не допускается размораживать продукты, или оставлять на длительное время на поверхности столешницы сильно охлаждённые (&lt;0°C) предметы.</p>
<p><strong>3.6. Стеклянные и зеркальные поверхности:</strong></p>
<p>3.6.1. Очищайте специальными средствами для стекол и зеркал, нанося состав на мягкую ткань, а не прямо на поверхность.</p>
<p>3.6.2. Избегайте абразивных средств и жестких губок. Не допускайте ударных и чрезмерных нагрузок на стеклянные полки.</p>
<p><strong>3.7. Фурнитура и механизмы:</strong></p>
<p>3.7.1. Протирание сухой мягкой тканью. Для удаления загрязнений допускается использование слабого мыльного раствора.</p>
<p>3.7.2. Запрещается прилагать чрезмерные усилия для открывания/закрывания дверей и ящиков. Угол открывания распашных дверей, как правило, составляет 90–110°. Превышение угла открывания может привести к поломке петли.</p>
<p>3.7.3. Запрещается открывать фасады с системой «Push to Open» любым способом, кроме нажатия на фасад.</p>
<p>3.7.4. Выдвигайте ящики полностью только при необходимости, держась за ручки или фасад.</p>
<p>3.7.5. Регулярно удаляйте пыль, крошки и грязь с направляющих и других движущихся частей. Следите, чтобы в зону работы механизма (направляющие, петли) не попадали посторонние предметы, которые могут помешать движению.</p>
<p>3.7.6. Регулярная регулировка и смазка механизмов (парафином или специальными средствами) являются обязанностью Заказчика и не покрываются гарантией.</p>
<p>3.7.7. Лицевую фурнитуру следует чистить мягкими тканями с применением хозяйственного мыла, после чего вытирать насухо. Не использовать средства, содержащие абразивные материалы (наждачную бумагу, соду и др.).</p>

<p style="margin-top:16px;font-style:italic">Соблюдая эти несложные правила, вы сохраните безупречный вид и функциональность вашей мебели на долгие годы. Помните: что несоблюдение правил эксплуатации может привести к сокращению сроков службы и преждевременному выходу из строя элементов кухонной мебели.</p>
<p style="margin-top:12px;font-weight:bold">ВНИМАНИЕ! Подрядчик не несет ответственность за последствия от несоблюдения установленных норм и правил по уходу и эксплуатации корпусной мебели.</p>

<table style="margin-top:30px"><tr><th style="width:50%">Подрядчик</th><th style="width:50%">Заказчик</th></tr>
<tr><td>ООО «ИНТЕРЬЕРНЫЕ РЕШЕНИЯ»<br><br><br><br>М.П.</td>
<td>&nbsp;<br><br><br><br>&nbsp;</td></tr></table>
</div></body></html>'''

    elif doc_type == 'act_delivery':
        daddr = _delivery_address(c)
        delivery_date_str = _fmt_date(c.get('delivery_date') or '')
        dcost = float(c.get('delivery_cost') or 0)
        dcost_words = _num_to_words(dcost) if dcost else '___________'
        return f'''<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Акт приёма-передачи доставки — {contract_num}</title>{style}</head><body><div class="page">
<p class="no-indent" style="text-align:right">к договору на оказание услуг по доставке мебели от {contract_date_full}</p>
<h1>«Акт приёма-передачи доставки мебели»</h1>
<div class="city-date"><span>г. Саратов</span><span>«____» ______________ 20____г.</span></div>
<p class="no-indent">ООО «Интерьерные решения», в лице менеджера <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>, действующего на основании доверенности № <span class="ul" style="min-width:40px">&nbsp;&nbsp;&nbsp;&nbsp;</span> от <span class="ul" style="min-width:80px">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>, именуемый в дальнейшем «Исполнитель», и гр. <strong>{fname}</strong>, именуемый (ая) в дальнейшем «Заказчик», составили настоящий Акт о нижеследующем:</p>
<p>1. Исполнитель доставил Заказчику мебель по адресу: <strong>{daddr}</strong>.</p>
<p>2. Дата доставки: <strong>{delivery_date_str if delivery_date_str != "___________" else "«____» ______________ 20____г."}</strong>.</p>
<p>3. Мебель доставлена в полном объёме, внешних механических повреждений при доставке не выявлено.</p>
<p>4. Заказчик произвёл визуальный осмотр доставленной мебели в момент приёмки. Претензий к состоянию мебели на момент доставки не имеет.</p>
<p>5. Стоимость услуг по доставке составила <strong>{dcost:,.0f} ({dcost_words})</strong> рублей. Оплата произведена в полном объёме.</p>
<p>6. Услуги по доставке выполнены Исполнителем в полном объёме.</p>
<table style="margin-top:30px"><tr><th style="width:50%">Исполнитель</th><th style="width:50%">Заказчик</th></tr>
<tr><td>ООО «Интерьерные решения»<br><br>Менеджер: <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><br>М.П.</td>
<td>{fname}<br>Паспорт: {_passport_str(c)}<br>Телефон: {c.get("phone") or "___________"}<br><br>Подпись: <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></td></tr></table>
</div></body></html>'''

    elif doc_type == 'act_assembly':
        daddr = _delivery_address(c)
        acost = float(c.get('assembly_cost') or 0)
        acost_words = _num_to_words(acost) if acost else '___________'
        products = _get_products(c)
        products_rows = ''
        for i, p in enumerate(products, 1):
            products_rows += f'<tr><td style="text-align:center">{i}</td><td>{p.get("name","Кухонный гарнитур")}</td><td style="text-align:center">шт.</td><td style="text-align:center">{p.get("qty",1)}</td></tr>'
        if not products_rows:
            products_rows = '<tr><td style="text-align:center">1</td><td>Кухонный гарнитур</td><td style="text-align:center">шт.</td><td style="text-align:center">1</td></tr>'
        return f'''<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Акт приёма-передачи сборки — {contract_num}</title>{style}</head><body><div class="page">
<p class="no-indent" style="text-align:right">к договору на оказание услуг по сборке и монтажу мебели от {contract_date_full}</p>
<h1>«Акт приёма-передачи выполненных работ по сборке и монтажу мебели»</h1>
<div class="city-date"><span>г. Саратов</span><span>«____» ______________ 20____г.</span></div>
<p class="no-indent">ООО «Интерьерные решения», в лице менеджера <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>, действующего на основании доверенности № <span class="ul" style="min-width:40px">&nbsp;&nbsp;&nbsp;&nbsp;</span> от <span class="ul" style="min-width:80px">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>, именуемый в дальнейшем «Исполнитель», и гр. <strong>{fname}</strong>, именуемый (ая) в дальнейшем «Заказчик», составили настоящий Акт о нижеследующем:</p>
<p>1. Исполнитель выполнил работы по сборке и монтажу следующей мебели по адресу: <strong>{daddr}</strong>:</p>
<table><tr><th style="width:5%">№</th><th>Наименование мебели</th><th style="width:12%">Ед. изм.</th><th style="width:10%">Кол-во</th></tr>
{products_rows}</table>
<p>2. Объём выполненных работ: сборка корпусных элементов, установка фасадов и фурнитуры, регулировка петель и выдвижных систем, монтаж столешницы и стеновых панелей (при наличии), подключение подсветки (при наличии).</p>
<p>3. Заказчик произвёл проверку выполненных работ. Фурнитура (петли, выдвижные механизмы, подъёмники) проверена на предмет работоспособности. Регулировка произведена в присутствии Заказчика.</p>
<p>4. Работы по сборке и монтажу выполнены Исполнителем качественно, в соответствии с техническим проектом. Заказчик претензий к качеству и объёму выполненных работ не имеет.</p>
<p>5. Стоимость работ по сборке и монтажу составила <strong>{acost:,.0f} ({acost_words})</strong> рублей. Оплата произведена в полном объёме.</p>
<p>6. С момента подписания настоящего Акта гарантийный срок на работы по сборке и монтажу составляет 12 (двенадцать) месяцев.</p>
<table style="margin-top:30px"><tr><th style="width:50%">Исполнитель</th><th style="width:50%">Заказчик</th></tr>
<tr><td>ООО «Интерьерные решения»<br><br>Менеджер: <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><br>М.П.</td>
<td>{fname}<br>Паспорт: {_passport_str(c)}<br>Телефон: {c.get("phone") or "___________"}<br><br>Подпись: <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></td></tr></table>
</div></body></html>'''

    return '<html><body><p>Неизвестный тип документа</p></body></html>'


def _build_docx(c: dict, doc_type: str) -> bytes:
    from docx import Document
    from docx.shared import Pt, Mm
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.enum.table import WD_TABLE_ALIGNMENT

    fname = _full_name(c)
    total = float(c.get('total_amount') or 0)
    total_words = _num_to_words(total)
    contract_num = c.get('contract_number') or '___'
    contract_date_full = _fmt_date_full(c.get('contract_date') or '')
    prod_days = int(c.get('production_days') or 45)
    prepaid = float(c.get('prepaid_amount') or 0)
    balance = float(c.get('balance_due') or 0)
    ptype = c.get('payment_type', '100% предоплата')
    custom = c.get('custom_payment_scheme', '') or ''
    products = _get_products(c)

    doc = Document()
    sec = doc.sections[0]
    sec.page_width = Mm(210); sec.page_height = Mm(297)
    sec.left_margin = Mm(25); sec.right_margin = Mm(20)
    sec.top_margin = Mm(20); sec.bottom_margin = Mm(20)

    style = doc.styles['Normal']
    style.font.name = 'Times New Roman'
    style.font.size = Pt(12)

    def h(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(text); r.bold = True; r.font.size = Pt(13)
        return p

    def h2(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(text); r.font.size = Pt(12)
        return p

    def sec_title(text):
        p = doc.add_paragraph()
        r = p.add_run(text); r.bold = True; r.font.size = Pt(12)
        p.paragraph_format.space_before = Pt(8)
        return p

    def para(text, indent=True):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        if indent: p.paragraph_format.first_line_indent = Mm(12)
        r = p.add_run(text); r.font.size = Pt(12)
        return p

    def sig_table(left, right):
        t = doc.add_table(rows=2, cols=2)
        t.style = 'Table Grid'
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        for i, txt in enumerate([left[0], right[0]]):
            c2 = t.cell(0, i); c2.text = txt
            c2.paragraphs[0].runs[0].bold = True
            c2.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        t.cell(1, 0).text = left[1]
        t.cell(1, 1).text = right[1]
        return t

    if doc_type == 'contract':
        h('ДОГОВОР')
        h2('бытового подряда на изготовление мебели')
        p = doc.add_paragraph()
        p.add_run(f'г. Саратов                                                          {contract_date_full}')
        para(f'ООО «Интерьерные решения», в лице менеджера ______________________________, действующего на основании доверенности № ____ от ____________, именуемый в дальнейшем «Подрядчик», и гр. {fname}, именуемый (ая) в дальнейшем «Заказчик», заключили настоящий Договор о нижеследующем:', indent=False)

        sec_title('1. ПРЕДМЕТ ДОГОВОРА')
        para('1.1. Подрядчик обязуется выполнить работу по изготовлению мебели и передать результат работы Заказчику (мебель передается в разобранном виде), а Заказчик обязуется принять и оплатить результат работ.')
        para('1.2. Наименование, качественные характеристики, количество, дизайн мебели указываются в Техническом проекте, который является Приложением № 1 к настоящему Договору.')
        para('1.3. В случае необходимости выполнения Подрядчиком дополнительных работ, влекущих изменение объема, цены работ, включая изменение срока выполнения работ, стороны согласовывают данные изменения путем заключения дополнительного соглашения.')
        para(f'1.4. Срок выполнения работ составляет {prod_days} ({_days_words(prod_days)}) рабочих дней, с момента согласования Технического проекта и получения Подрядчиком предварительной оплаты, в размере, указанном в разделе 3 Договора.')

        sec_title('2. ПРАВА И ОБЯЗАННОСТИ СТОРОН')
        for t in ['2.1. Подрядчик обязан:','2.1.1. Выполнить работу качественно, в соответствии с условиями Договора.','2.1.2. Своевременно информировать Заказчика о готовности мебели.','2.1.3. Передать Заказчику результат работ в разобранном виде.','2.2. Заказчик обязан:','2.2.1. Своевременно оплатить выполненные работы в соответствии с условиями настоящего Договора.','2.2.2. Принять выполненные работы в порядке и на условиях Договора.','2.2.3. Освободить помещение для доставки и установки мебели (при наличии отдельного договора).','2.3. Заказчик вправе:','2.3.1. Требовать надлежащего выполнения работ в соответствии с условиями настоящего Договора.']:
            para(t)

        sec_title('3. СТОИМОСТЬ РАБОТ И ПОРЯДОК РАСЧЁТОВ')
        para(f'3.1. Общая стоимость работ по настоящему Договору составляет {total:,.0f} ({total_words}) рублей, в соответствии с Калькуляцией работ (Приложение № 2).')
        if custom:
            para(custom)
        elif ptype == '100% предоплата':
            para(f'3.2.1. Предварительная оплата производится при заключении Договора в размере {prepaid:,.0f} ({_num_to_words(prepaid)}) рублей.')
            para('3.2.2. Окончательный платёж не предусмотрен. Стоимость работ оплачена полностью при заключении Договора.')
        else:
            para(f'3.2.1. Предварительная оплата производится при заключении Договора в размере {prepaid:,.0f} ({_num_to_words(prepaid)}) рублей.')
            para(f'3.2.2. Окончательный платёж за выполненные по Договору работы в размере {balance:,.0f} ({_num_to_words(balance)}) рублей осуществляется в течение 3 (трёх) дней с момента получения Заказчиком уведомления о готовности мебели.')

        sec_title('4. ОТВЕТСТВЕННОСТЬ СТОРОН')
        para('4.1. За неисполнение или ненадлежащее исполнение условий настоящего Договора Стороны несут ответственность в соответствии с действующим законодательством РФ.')
        para('4.2. В случае просрочки выполнения работ по вине Подрядчика, Заказчик вправе потребовать уплаты неустойки в размере 3% от стоимости работ за каждый день просрочки, но не более стоимости выполнения соответствующего вида работ.')
        para('4.3. В случае просрочки оплаты Заказчиком, Подрядчик вправе потребовать уплаты неустойки в размере 0,1% от неоплаченной суммы за каждый день просрочки.')

        sec_title('5. ПОРЯДОК СДАЧИ И ПРИЁМКИ РАБОТ')
        para('5.1. Приёмка выполненных работ производится путём подписания Сторонами Акта выполненных работ (Приложение № 4 к Договору).')
        para('5.2. Заказчик обязан в течение 3 (трёх) дней с момента получения уведомления о готовности мебели произвести приёмку результата работ.')

        sec_title('6. ГАРАНТИЯ КАЧЕСТВА')
        para('6.1. Подрядчик гарантирует соответствие изготовленной мебели требованиям настоящего Договора и Технического проекта.')
        para('6.2. Гарантийный срок на выполненные работы составляет 12 (двенадцать) месяцев с момента подписания Акта выполненных работ.')
        para('6.3. Гарантия не распространяется на дефекты, возникшие вследствие нарушения Заказчиком Правил эксплуатации корпусной мебели (Приложение № 3).')

        sec_title('7. ПОРЯДОК РАЗРЕШЕНИЯ СПОРОВ')
        para('7.1. Все споры и разногласия, возникающие в связи с исполнением настоящего Договора, разрешаются путём переговоров между Сторонами.')
        para('7.2. В случае недостижения соглашения споры разрешаются в судебном порядке в соответствии с законодательством РФ.')

        sec_title('8. ПРОЧИЕ УСЛОВИЯ')
        para('8.1. Настоящий Договор вступает в силу с момента его подписания Сторонами.')
        para('8.2. Договор составлен в двух экземплярах, имеющих равную юридическую силу – по одному для каждой из Сторон.')
        para('8.3. Во всём, что не предусмотрено настоящим Договором, Стороны руководствуются действующим законодательством РФ.')

        sec_title('9. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН')
        sig_table(
            ['Подрядчик', 'ООО «Интерьерные решения»\nг. Саратов, ул. Усть-Курдюмская, д. 3\nИНН/КПП: _______________\nр/с: _______________\n\nМенеджер: ______________________________\nМ.П.'],
            ['Заказчик', f'{fname}\nПаспорт: {_passport_str(c)}\nВыдан: {c.get("passport_issued_by") or "___________"}\nДата выдачи: {_fmt_date(c.get("passport_issued_date") or "")}\nКод подразделения: {c.get("passport_dept_code") or "___________"}\nАдрес: {_reg_address(c)}\nТелефон: {c.get("phone") or "___________"}\n\nПодпись: ______________________________']
        )

    elif doc_type == 'act':
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p.add_run(f'Приложение № 4 к договору бытового подряда\nна изготовление мебели от {contract_date_full}')
        h('«Акт выполненных работ»')
        doc.add_paragraph('г. Саратов')
        para(f'ООО «Интерьерные решения», в лице менеджера ______________________________, действующего на основании доверенности № ____ от ____________, именуемый в дальнейшем «Подрядчик», и гр. {fname}, именуемый (ая) в дальнейшем «Заказчик», подписали настоящий Акт выполненных работ о нижеследующем:', indent=False)
        para(f'1. Подрядчик изготовил для Заказчика мебель по договору бытового подряда на изготовление мебели от {contract_date_full}:')

        t = doc.add_table(rows=1, cols=5)
        t.style = 'Table Grid'
        for i, txt in enumerate(['№', 'Наименование мебели', 'Ед. изм.', 'Кол-во', 'Стоимость, руб.']):
            t.rows[0].cells[i].text = txt
            t.rows[0].cells[i].paragraphs[0].runs[0].bold = True
        if products:
            for i, pi in enumerate(products, 1):
                r = t.add_row().cells
                r[0].text = str(i); r[1].text = pi.get('name','Кухонный гарнитур')
                r[2].text = 'шт.'; r[3].text = str(pi.get('qty',1)); r[4].text = ''
        else:
            r = t.add_row().cells
            r[0].text = '1'; r[1].text = 'Кухонный гарнитур'; r[2].text = 'шт.'; r[3].text = '1'; r[4].text = f'{total:,.0f}'
        tr = t.add_row().cells
        tr[3].text = 'ИТОГО:'; tr[3].paragraphs[0].runs[0].bold = True
        tr[4].text = f'{total:,.0f}'; tr[4].paragraphs[0].runs[0].bold = True

        p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.add_run(f'({total_words})')
        para('2. Комплектность, количество, вид, характеристики мебели соответствуют условиям договора. Визуальный осмотр мебели на предмет повреждений, царапин, сколов, трещин и других недостатков произведён Заказчиком. Фурнитура (петли, выдвижные механизмы, подъёмники) проверена на предмет работоспособности.')
        para('3. Заказчик принял результат выполненных работ. Претензий к качеству и комплектности мебели не имеет.')
        para('4. Обязательства Подрядчика по Договору выполнены в полном объёме. Оплата по Договору произведена Заказчиком в полном объёме.')
        sig_table(
            ['Подрядчик', 'ООО «Интерьерные решения»\n\nМенеджер: ______________________________\nМ.П.'],
            ['Заказчик', f'{fname}\nПаспорт: {_passport_str(c)}\nТелефон: {c.get("phone") or "___________"}\n\nПодпись: ______________________________']
        )

    elif doc_type == 'tech':
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p.add_run(f'Приложение № 1 к договору бытового подряда\nна изготовление мебели от {contract_date_full}')
        h('«Технический проект»')
        t = doc.add_table(rows=9, cols=2); t.style = 'Table Grid'
        fields = ['Корпус:','Фасад 1:','Фасад 2:','Столешница:','Стеновая панель:','Подсветка:','Фрезеровка:','Примечание:']
        for i, f in enumerate(fields):
            t.cell(i, 0).text = f; t.cell(i, 0).paragraphs[0].runs[0].bold = True
            t.cell(i, 1).text = ' '
        doc.add_paragraph('\n\n\n\n\n\n\n\n\n\n\n\nМесто для схемы / эскиза:')
        sig_table(
            ['Подрядчик', 'ООО «Интерьерные решения»\n\nМенеджер: ______________________________\nМ.П.'],
            ['Заказчик', f'{fname}\n\nПодпись: ______________________________']
        )

    elif doc_type == 'delivery':
        daddr = _delivery_address(c)
        floor_ = c.get('delivery_floor') or '___'
        elevator = c.get('delivery_elevator') or 'нет'
        entrance = c.get('delivery_entrance') or '___'
        delivery_date_str = _fmt_date(c.get('delivery_date') or '')

        p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.add_run('ДОГОВОР').bold = True
        h2('на оказание услуг по доставке мебели')
        doc.add_paragraph(f'г. Саратов                                                          {contract_date_full}')
        para(f'ООО «Интерьерные решения», в лице менеджера ______________________________, действующего на основании доверенности № ____ от ____________, именуемый в дальнейшем «Исполнитель», и гр. {fname}, именуемый (ая) в дальнейшем «Заказчик», заключили настоящий Договор о нижеследующем:', indent=False)
        sec_title('1. ПРЕДМЕТ ДОГОВОРА')
        para(f'1.1. Исполнитель обязуется оказать услуги по доставке мебели по договору бытового подряда № {contract_num} от {contract_date_full}, а Заказчик обязуется принять и оплатить указанные услуги.')
        para(f'1.2. Мебель доставляется по адресу: {daddr}, подъезд: {entrance}, этаж: {floor_}, лифт: {elevator}.')
        para(f'1.3. Дата доставки: {delivery_date_str}. Конкретное время доставки согласовывается Сторонами дополнительно.')
        para('1.4. Доставка осуществляется в разобранном виде (без сборки и монтажа), если иное не предусмотрено отдельным договором.')
        sec_title('2. ПРАВА И ОБЯЗАННОСТИ СТОРОН')
        para('2.1. Исполнитель обязан:')
        para('2.1.1. Доставить мебель в согласованный срок по указанному адресу.')
        para('2.1.2. Обеспечить сохранность мебели при транспортировке.')
        para('2.1.3. Уведомить Заказчика об изменении времени доставки не менее чем за 2 часа.')
        para('2.2. Заказчик обязан:')
        para('2.2.1. Обеспечить свободный доступ к месту доставки и наличие ответственного лица для приёмки.')
        para('2.2.2. Оплатить услуги по доставке в соответствии с Приложением № 1.')
        para('2.2.3. При обнаружении внешних повреждений мебели в ходе доставки — незамедлительно сообщить Исполнителю до подписания акта приёма-передачи.')
        para('2.3. Исполнитель вправе однократно предоставить Заказчику скидку в размере стоимости доставки (8 000 руб.) при доставке в пределах г. Саратова и г. Энгельса.')
        sec_title('3. СТОИМОСТЬ УСЛУГ И ПОРЯДОК ОПЛАТЫ')
        para('3.1. Стоимость услуг определяется в соответствии с Приложением № 1 к настоящему Договору.')
        para('3.2. Оплата производится в день доставки до начала разгрузки мебели, если иное не согласовано Сторонами.')
        para('3.3. Расчёт стоимости доставки за пределы г. Саратова и г. Энгельса производится исходя из километража от склада Исполнителя (г. Саратов, ул. Усть-Курдюмская, д. 3) до адреса Заказчика согласно Яндекс Картам.')
        sec_title('4. ОТВЕТСТВЕННОСТЬ СТОРОН')
        para('4.1. В случае повреждения мебели по вине Исполнителя при транспортировке Исполнитель обязан возместить причинённый ущерб.')
        para('4.2. Исполнитель не несёт ответственности за повреждения, произошедшие по вине Заказчика.')
        para('4.3. В случае отказа Заказчика от доставки менее чем за 24 часа Исполнитель вправе удержать фактически понесённые расходы.')
        sec_title('5. ПРОЧИЕ УСЛОВИЯ')
        para('5.1. Настоящий Договор вступает в силу с момента подписания и действует до полного исполнения Сторонами своих обязательств.')
        para('5.2. Договор составлен в двух экземплярах, имеющих равную юридическую силу.')
        sig_table(
            ['Исполнитель', 'ООО «Интерьерные решения»\nг. Саратов, ул. Усть-Курдюмская, д. 3\nИНН/КПП: _______________\nр/с: _______________\n\nМенеджер: ______________________________\nМ.П.'],
            ['Заказчик', f'{fname}\nПаспорт: {_passport_str(c)}\nАдрес доставки: {daddr}\nТелефон: {c.get("phone") or "___________"}\n\nПодпись: ______________________________']
        )
        doc.add_paragraph()
        p2 = doc.add_paragraph(); p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p2.add_run(f'Приложение № 1 к договору на оказание услуг по доставке мебели от {contract_date_full}')
        h2('«Калькуляция на выполнение услуг по доставке мебели»')
        t2 = doc.add_table(rows=1, cols=5); t2.style = 'Table Grid'
        for i, txt in enumerate(['Наименование работ и услуг', 'Ед. изм.', 'Кол-во', 'Цена, руб.', 'Стоимость, руб.']):
            t2.rows[0].cells[i].text = txt; t2.rows[0].cells[i].paragraphs[0].runs[0].bold = True
        r1 = t2.add_row().cells; r1[0].text = 'Доставка мебели в пределах г. Саратова и г. Энгельса *'; r1[1].text = '1 услуга'; r1[2].text = '1'; r1[3].text = '8 000'; r1[4].text = '8 000'
        r2 = t2.add_row().cells; r2[0].text = 'Доставка мебели за пределы г. Саратова и г. Энгельса **'; r2[1].text = '1 км'; r2[2].text = '___'; r2[3].text = '70'; r2[4].text = '___'
        rt = t2.add_row().cells; rt[3].text = 'Итого:'; rt[3].paragraphs[0].runs[0].bold = True; rt[4].text = '___________'
        rs = t2.add_row().cells; rs[3].text = 'Скидка ***:'; rs[4].text = '___________'
        rts = t2.add_row().cells; rts[3].text = 'Итого со скидкой:'; rts[3].paragraphs[0].runs[0].bold = True; rts[4].text = '___________'

    elif doc_type == 'assembly':
        daddr = _delivery_address(c)
        assembly_days_n = int(c.get('assembly_days') or 1)
        delivery_date_str = _fmt_date(c.get('delivery_date') or '')

        p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.add_run('ДОГОВОР').bold = True
        h2('на оказание услуг по сборке и монтажу мебели')
        doc.add_paragraph(f'г. Саратов                                                          {contract_date_full}')
        para(f'ООО «Интерьерные решения», в лице менеджера ______________________________, действующего на основании доверенности № ____ от ____________, именуемый в дальнейшем «Исполнитель», и гр. {fname}, именуемый (ая) в дальнейшем «Заказчик», заключили настоящий Договор о нижеследующем:', indent=False)
        sec_title('1. ПРЕДМЕТ ДОГОВОРА')
        para(f'1.1. Исполнитель обязуется выполнить работы по сборке и монтажу мебели, изготовленной по договору бытового подряда № {contract_num} от {contract_date_full}, а Заказчик обязуется принять и оплатить указанные работы.')
        para(f'1.2. Адрес выполнения работ: {daddr}.')
        para(f'1.3. Ориентировочная дата начала работ: {delivery_date_str}. Срок выполнения работ: {assembly_days_n} ({_days_words(assembly_days_n)}) рабочих дней.')
        para('1.4. В объём работ входит: сборка всех корпусных элементов, установка фасадов и фурнитуры, регулировка петель и выдвижных систем, монтаж столешницы и стеновых панелей (при наличии), подключение подсветки (при наличии).')
        sec_title('2. ПРАВА И ОБЯЗАННОСТИ СТОРОН')
        para('2.1. Исполнитель обязан:')
        para('2.1.1. Выполнить монтажные работы качественно, в соответствии с техническим проектом.')
        para('2.1.2. Соблюдать чистоту на месте производства работ, убрать строительный мусор по окончании монтажа.')
        para('2.1.3. Уведомить Заказчика об обнаруженных в ходе монтажа дефектах мебели или несоответствии помещения.')
        para('2.2. Заказчик обязан:')
        para('2.2.1. Обеспечить свободный доступ к месту монтажа и освободить помещение от посторонних предметов.')
        para('2.2.2. Обеспечить наличие электроснабжения и освещения в зоне монтажа.')
        para('2.2.3. Принять выполненные работы и подписать акт приёмки.')
        para('2.2.4. Оплатить работы по монтажу в соответствии с условиями настоящего Договора.')
        sec_title('3. СТОИМОСТЬ РАБОТ И ПОРЯДОК ОПЛАТЫ')
        para('3.1. Стоимость работ по сборке и монтажу мебели составляет ________________________________ рублей.')
        para('3.2. Оплата производится в день завершения монтажных работ до подписания акта приёмки, если иное не согласовано Сторонами.')
        sec_title('4. ОТВЕТСТВЕННОСТЬ СТОРОН')
        para('4.1. Исполнитель несёт ответственность за качество выполненных монтажных работ в течение гарантийного срока — 12 (двенадцати) месяцев с момента подписания акта приёмки.')
        para('4.2. Гарантия Исполнителя не распространяется на дефекты, возникшие вследствие нарушения Заказчиком Правил эксплуатации мебели, механических повреждений или воздействия влаги.')
        para('4.3. Исполнитель не несёт ответственности за невозможность выполнения монтажа по причинам, зависящим от Заказчика (неготовность помещения, отсутствие электроснабжения и т.п.).')
        sec_title('5. ПОРЯДОК СДАЧИ И ПРИЁМКИ РАБОТ')
        para('5.1. Приёмка выполненных работ оформляется подписанием Сторонами акта приёмки смонтированной мебели.')
        para('5.2. При наличии замечаний Заказчик фиксирует их в акте. Исполнитель устраняет обоснованные замечания в согласованные сроки.')
        sec_title('6. ПРОЧИЕ УСЛОВИЯ')
        para('6.1. Настоящий Договор вступает в силу с момента подписания и действует до полного исполнения Сторонами своих обязательств.')
        para('6.2. Договор составлен в двух экземплярах, имеющих равную юридическую силу.')
        sig_table(
            ['Исполнитель', 'ООО «Интерьерные решения»\nг. Саратов, ул. Усть-Курдюмская, д. 3\nИНН/КПП: _______________\nр/с: _______________\n\nМенеджер: ______________________________\nМ.П.'],
            ['Заказчик', f'{fname}\nПаспорт: {_passport_str(c)}\nАдрес монтажа: {daddr}\nТелефон: {c.get("phone") or "___________"}\n\nПодпись: ______________________________']
        )

    elif doc_type == 'rules':
        p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p.add_run(f'Приложение № 3 к договору бытового подряда на изготовление мебели от {contract_date_full}')
        h('«Правила эксплуатации корпусной мебели»')

        sec_title('1. ОБЩИЕ РЕКОМЕНДАЦИИ')
        para('1.1. Срок службы Мебели и сохранение его потребительских свойств напрямую зависят от соблюдения Заказчиком правил, изложенных в настоящем приложении.')
        para('1.2. Климатические условия и воздействия окружающей среды (свет, влажность, температура) напрямую влияют на состояние мебели.')
        para('1.3. Подрядчик рекомендует соблюдать оптимальные климатические условия в помещении, где установлена мебель: температура воздуха от +18°C до +25°C, относительная влажность воздуха 45% - 70%.')
        para('1.4. Следует оберегать мебель от длительного воздействия прямых солнечных лучей, источников тепла (батареи, обогреватели, духовые шкафы, плиты на расстоянии менее 0,5 м), а также от резких перепадов температуры и влажности.')
        para('1.5. Запрещается воздействие на Мебель агрессивных жидкостей (кислот, щелочей, растворителей), абразивных чистящих средств и материалов, способных повредить покрытие.')
        para('1.6. Мебель предназначена для эксплуатации в жилых или общественных помещениях в соответствии с ее функциональным назначением. Подрядчик не несет ответственности за повреждения, вызванные несоблюдением рекомендуемых условий.')
        para('1.7. Подрядчик гарантирует соответствие Мебели обязательным требованиям нормативных документов, действующих на территории РФ, в том числе:\n* ГОСТ 19917-2014 «Мебель для сидения и лежания. Общие технические условия»;\n* ГОСТ 32289-2013 «Плиты древесно-стружечные, облицованные пленками на основе термореактивных полимеров. Технические условия»;\n* ГОСТ 16371-2014 «Мебель. Общие технические условия»;\n* ТР ТС 025/2012 «О безопасности мебельной продукции».')

        sec_title('2. УСЛОВИЯ ХРАНЕНИЯ')
        para('2.1. Хранение Мебели до ее установки должно осуществляться в сухих, проветриваемых, отапливаемых помещениях, защищенных от атмосферных осадков, прямых солнечных лучей и источников тепла. Запрещается хранить изделия в помещениях с повышенной влажностью (санузлы, бани, подвалы без отопления).')
        para('2.2. Рекомендуемый диапазон температуры воздуха от +10°C до +25°C. Запрещена эксплуатация при температурах ниже -20°C и выше +40°C, а также резкие перепады температур.')
        para('2.3. Рекомендуемая относительная влажность воздуха 45% - 70%. Длительное воздействие повышенной влажности (свыше 80%) или чрезмерной сухости (ниже 40%) недопустимо и приводит к деформации элементов (разбуханию, рассыханию, расслоению).')
        para('2.4. Мебель должна храниться в заводской упаковке на ровной поверхности. Запрещается хранить изделия в вертикальном положении, прислонив к стене.')
        para('2.5. Перед установкой Мебели, доставленной или хранившейся при отрицательных температурах, необходимо выдержать ее в оригинальной упаковке в условиях помещения не менее 72 часов (3 суток) для адаптации к комнатной температуре и влажности.')

        sec_title('3. ПРАВИЛА ЭКСПЛУАТАЦИИ И УХОДА ЗА МЕБЕЛЬЮ')
        para('3.1. Общие правила:', indent=False)
        para('3.1.1. Не превышайте максимально допустимые нагрузки на элементы Мебели: полки - до 15 кг, выдвижные ящики из ЛДСП - до 5 кг, ящики на системе «метабокс» - до 18 кг, ящики на системе «тандембокс» - до 35 кг.')
        para('3.1.2. Общая нагрузка на подвесной шкаф не должна превышать 70 кг. Высокие конструкции (пеналы, стеллажи) должны быть больше нагружены в нижней части.')
        para('3.1.3. Равномерно распределяйте нагрузку внутри шкафов и ящиков: тяжелые предметы размещайте ближе к краям и опорам, легкие - в центре.')
        para('3.1.4. Исключите попадание воды на незащищенные торцы деталей, места стыков и торцов изделия.')
        para('3.1.5. Запрещается воздействовать на поверхности абразивными, кислотными, щелочными средствами, ацетоном, растворителями.')
        para('3.1.6. Не допускается заслонять вентиляционные решетки и воздухозаборные отверстия бытовых приборов, встроенных в мебель.')
        para('3.1.7. При установке Мебели в бревенчатых домах, вследствие усадки таких домов, возможна деформация: перекашивание фасадов, опускание как верхних, так и нижних модулей, это не является признаком некачественной работы Подрядчика.')
        para('3.2. Корпус ЛДСП:', indent=False)
        para('3.2.1. Главное правило! ЛДСП боится длительного контакта с водой. Попадание жидкости на кромки и тем более в места стыков недопустимо – плита разбухнет и деформируется. Все пролитые жидкости следует немедленно вытирать насухо.')
        para('3.2.2. Запрещается мыть ЛДСП большим количеством воды, использовать пароочистители. Не оставляйте не отжатые тряпки, мокрые полотенца на торцах деталей.')
        para('3.2.3. Запрещается применять абразивные и едкие химические средства.')
        para('3.2.4. Протирайте сухой или слегка влажной хорошо отжатой тканью. Для удаления загрязнений использовать мягкие мыльные растворы.')
        para('3.2.5. Берегите кромки и торцы от сколов и ударов. Именно через поврежденные кромки влага легче всего проникает внутрь плиты.')
        para('3.2.6. Не превышайте максимально допустимые нагрузки на полки и перегородки. Равномерно распределяйте вес.')
        para('3.2.7. Избегайте расположения Мебели вплотную к отопительным приборам (батареям, обогревателям), это может привести к расслоению ламинированного слоя и деформации плиты.')
        para('3.3. Фасады МДФ:', indent=False)
        para('3.3.1. Избегайте резких перепадов температуры и попадания прямых солнечных лучей.')
        para('3.3.2. Не допускайте длительного контакта поверхности с сильно нагретыми предметами (сковородки, кастрюли, утюги).')
        para('3.3.3. Избегайте ударов, царапин острыми предметами, давления на выступающие элементы.')
        para('3.3.4. Исключите контакт с агрессивными химическими веществами: растворителями, ацетоном, сильными чистящими порошками, средствами для мытья стекол. Регулярно удаляйте пыль мягкой тканью.')
        para('3.3.5. Разрешается использовать нейтральные (pH-нейтральные) средства, а также мягкие мыльные растворы.')
        para('3.3.6. Запрещается мыть МДФ большим количеством воды, использовать пароочистители. Не оставляйте не отжатые тряпки, мокрые полотенца на торцах деталей.')
        para('3.3.7. Не рекомендуется снимать защитную пленку с фасадов до окончания процесса установки мебели.')
        para('3.3.8. При изготовлении дверных полотен высотой более 1600 мм, рекомендовано использовать систему выпрямления дверей, чтобы избежать возможной деформации изделия.')
        para('3.4. Столешницы и стеновые панели из пластика и искусственного (акрилового) камня:', indent=False)
        para('3.4.1. Для очистки используйте мягкую ткань, мягкую губку, салфетки из микрофибры и средства для ухода за глянцевыми поверхностями.')
        para('3.4.2. Запрещается использовать жесткие и металлические губки, щетки и абразивные чистящие средства. Использовать при очистке кислоты, щелочи, соли, растворители.')
        para('3.4.5. Запрещается использовать поверхность в качестве разделочной доски. Воздействовать на поверхность столешницы острыми предметами. Передвигать по поверхности посуду с металлическим дном.')
        para('3.4.6. На пластиковой столешнице не оставляйте лужи воды, не отжатые тряпки, мокрые полотенца, особенно на стыках и возле мойки. Сразу удаляйте воду с поверхностей столешницы и со стыковочных швов. Еврозапил особенно уязвим для влаги и высоких температур.')
        para('3.4.7. Не допускается ставить на поверхность столешницы горячие (>60°С) предметы. Используйте специальные термоизоляционные подставки под горячее. Не допускается резкий перепад температур.')
        para('3.4.8. Не допускается размораживать продукты, или оставлять на длительное время на поверхности столешницы сильно охлаждённые (<0°C) предметы.')
        para('3.6. Стеклянные и зеркальные поверхности:', indent=False)
        para('3.6.1. Очищайте специальными средствами для стекол и зеркал, нанося состав на мягкую ткань, а не прямо на поверхность.')
        para('3.6.2. Избегайте абразивных средств и жестких губок. Не допускайте ударных и чрезмерных нагрузок на стеклянные полки.')
        para('3.7. Фурнитура и механизмы:', indent=False)
        para('3.7.1. Протирание сухой мягкой тканью. Для удаления загрязнений допускается использование слабого мыльного раствора.')
        para('3.7.2. Запрещается прилагать чрезмерные усилия для открывания/закрывания дверей и ящиков. Угол открывания распашных дверей, как правило, составляет 90–110°. Превышение угла открывания может привести к поломке петли.')
        para('3.7.3. Запрещается открывать фасады с системой «Push to Open» любым способом, кроме нажатия на фасад.')
        para('3.7.4. Выдвигайте ящики полностью только при необходимости, держась за ручки или фасад.')
        para('3.7.5. Регулярно удаляйте пыль, крошки и грязь с направляющих и других движущихся частей. Следите, чтобы в зону работы механизма не попадали посторонние предметы, которые могут помешать движению.')
        para('3.7.6. Регулярная регулировка и смазка механизмов (парафином или специальными средствами) являются обязанностью Заказчика и не покрываются гарантией.')
        para('3.7.7. Лицевую фурнитуру следует чистить мягкими тканями с применением хозяйственного мыла, после чего вытирать насухо. Не использовать средства, содержащие абразивные материалы (наждачную бумагу, соду и др.).')

        p_italic = doc.add_paragraph()
        p_italic.add_run('Соблюдая эти несложные правила, вы сохраните безупречный вид и функциональность вашей мебели на долгие годы. Помните: что несоблюдение правил эксплуатации может привести к сокращению сроков службы и преждевременному выходу из строя элементов кухонной мебели.').italic = True

        p_warn = doc.add_paragraph()
        r_warn = p_warn.add_run('ВНИМАНИЕ! Подрядчик не несет ответственность за последствия от несоблюдения установленных норм и правил по уходу и эксплуатации корпусной мебели.')
        r_warn.bold = True; r_warn.italic = True

        sig_table(
            ['Подрядчик', 'ООО «ИНТЕРЬЕРНЫЕ РЕШЕНИЯ»\n\n\n\nМ.П.'],
            ['Заказчик', '\n\n\n\n']
        )

    elif doc_type == 'act_delivery':
        daddr = _delivery_address(c)
        delivery_date_str = _fmt_date(c.get('delivery_date') or '')
        dcost = float(c.get('delivery_cost') or 0)
        dcost_words = _num_to_words(dcost) if dcost else '___________'

        p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p.add_run(f'к договору на оказание услуг по доставке мебели от {contract_date_full}')
        h('«Акт приёма-передачи доставки мебели»')
        doc.add_paragraph('г. Саратов')

        para(f'ООО «Интерьерные решения», в лице менеджера ______________________________, действующего на основании доверенности № ____ от ____________, именуемый в дальнейшем «Исполнитель», и гр. {fname}, именуемый (ая) в дальнейшем «Заказчик», составили настоящий Акт о нижеследующем:', indent=False)
        para(f'1. Исполнитель доставил Заказчику мебель по адресу: {daddr}.')
        para(f'2. Дата доставки: {delivery_date_str}.')
        para('3. Мебель доставлена в полном объёме, внешних механических повреждений при доставке не выявлено.')
        para('4. Заказчик произвёл визуальный осмотр доставленной мебели в момент приёмки. Претензий к состоянию мебели на момент доставки не имеет.')
        para(f'5. Стоимость услуг по доставке составила {dcost:,.0f} ({dcost_words}) рублей. Оплата произведена в полном объёме.')
        para('6. Услуги по доставке выполнены Исполнителем в полном объёме.')
        sig_table(
            ['Исполнитель', 'ООО «Интерьерные решения»\n\nМенеджер: ______________________________\nМ.П.'],
            ['Заказчик', f'{fname}\nПаспорт: {_passport_str(c)}\nТелефон: {c.get("phone") or "___________"}\n\nПодпись: ______________________________']
        )

    elif doc_type == 'act_assembly':
        daddr = _delivery_address(c)
        acost = float(c.get('assembly_cost') or 0)
        acost_words = _num_to_words(acost) if acost else '___________'
        products = _get_products(c)

        p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p.add_run(f'к договору на оказание услуг по сборке и монтажу мебели от {contract_date_full}')
        h('«Акт приёма-передачи выполненных работ по сборке и монтажу мебели»')
        doc.add_paragraph('г. Саратов')

        para(f'ООО «Интерьерные решения», в лице менеджера ______________________________, действующего на основании доверенности № ____ от ____________, именуемый в дальнейшем «Исполнитель», и гр. {fname}, именуемый (ая) в дальнейшем «Заказчик», составили настоящий Акт о нижеследующем:', indent=False)
        para(f'1. Исполнитель выполнил работы по сборке и монтажу мебели по адресу: {daddr}:')

        t_a = doc.add_table(rows=1, cols=4); t_a.style = 'Table Grid'
        for i, txt in enumerate(['№', 'Наименование мебели', 'Ед. изм.', 'Кол-во']):
            t_a.rows[0].cells[i].text = txt; t_a.rows[0].cells[i].paragraphs[0].runs[0].bold = True
        if products:
            for i, pi in enumerate(products, 1):
                r = t_a.add_row().cells
                r[0].text = str(i); r[1].text = pi.get('name', 'Кухонный гарнитур'); r[2].text = 'шт.'; r[3].text = str(pi.get('qty', 1))
        else:
            r = t_a.add_row().cells; r[0].text = '1'; r[1].text = 'Кухонный гарнитур'; r[2].text = 'шт.'; r[3].text = '1'

        para('2. Объём выполненных работ: сборка корпусных элементов, установка фасадов и фурнитуры, регулировка петель и выдвижных систем, монтаж столешницы и стеновых панелей (при наличии), подключение подсветки (при наличии).')
        para('3. Заказчик произвёл проверку выполненных работ. Фурнитура проверена на предмет работоспособности. Регулировка произведена в присутствии Заказчика.')
        para('4. Работы по сборке и монтажу выполнены Исполнителем качественно, в соответствии с техническим проектом. Претензий к качеству и объёму выполненных работ Заказчик не имеет.')
        para(f'5. Стоимость работ по сборке и монтажу составила {acost:,.0f} ({acost_words}) рублей. Оплата произведена в полном объёме.')
        para('6. С момента подписания настоящего Акта гарантийный срок на работы по сборке и монтажу составляет 12 (двенадцать) месяцев.')
        sig_table(
            ['Исполнитель', 'ООО «Интерьерные решения»\n\nМенеджер: ______________________________\nМ.П.'],
            ['Заказчик', f'{fname}\nПаспорт: {_passport_str(c)}\nТелефон: {c.get("phone") or "___________"}\n\nПодпись: ______________________________']
        )

    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()