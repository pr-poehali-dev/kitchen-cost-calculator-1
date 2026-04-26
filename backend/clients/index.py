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
                %s,%s,
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
            c.get('delivery_cost', 0), c.get('assembly_cost', 0),
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
                delivery_cost=%s, assembly_cost=%s,
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
            c.get('delivery_cost', 0), c.get('assembly_cost', 0),
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

    if doc_type == 'contract':
        return f'''<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Договор №{contract_num}</title>{style}</head><body><div class="page">
<h1>ДОГОВОР</h1>
<h2>бытового подряда на изготовление мебели</h2>
<div class="city-date"><span>г. Саратов</span><span>{contract_date_full}</span></div>
<p class="no-indent">ООО «Интерьерные решения», в лице менеджера <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>, действующего на основании доверенности № <span class="ul" style="min-width:40px">&nbsp;&nbsp;&nbsp;&nbsp;</span> от <span class="ul" style="min-width:80px">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>, именуемый в дальнейшем «Подрядчик», и гр. <strong>{fname}</strong>, именуемый (ая) в дальнейшем «Заказчик», действующий (ая) как физическое лицо, с одной стороны, отдельно именуемые – «Сторона», а совместно именуемые – «Стороны», заключили настоящий Договор о нижеследующем:</p>
<p class="sec">1. ПРЕДМЕТ ДОГОВОРА</p>
<p>1.1. Подрядчик обязуется выполнить работу по изготовлению мебели и передать результат работы Заказчику (мебель передается в разобранном виде), а Заказчик обязуется принять и оплатить результат работ.</p>
<p>1.2. Наименование, качественные характеристики, количество, дизайн мебели указываются в Техническом проекте, который является Приложением № 1 к настоящему Договору.</p>
<p>1.3. В случае необходимости выполнения Подрядчиком дополнительных работ, влекущих изменение объема, цены работ, включая изменение срока выполнения работ, стороны согласовывают данные изменения путем заключения дополнительного соглашения.</p>
<p>1.4. Срок выполнения работ составляет {prod_days} ({_days_words(prod_days)}) рабочих дней, с момента согласования Технического проекта и получения Подрядчиком предварительной оплаты, в размере, указанном в разделе 3 Договора. Подрядчик вправе досрочно выполнить работу без получения предварительного согласия Заказчика.</p>
<p class="sec">2. ПРАВА И ОБЯЗАННОСТИ СТОРОН</p>
<p>2.1. Подрядчик обязан:</p>
<p>2.1.1. Выполнить работу качественно, в соответствии с условиями Договора.</p>
<p>2.1.2. Своевременно информировать Заказчика о готовности мебели.</p>
<p>2.1.3. Передать Заказчику результат работ в разобранном виде.</p>
<p>2.2. Заказчик обязан:</p>
<p>2.2.1. Своевременно оплатить выполненные работы в соответствии с условиями настоящего Договора.</p>
<p>2.2.2. Принять выполненные работы в порядке и на условиях Договора.</p>
<p>2.2.3. Освободить помещение для доставки и установки мебели (при наличии отдельного договора на доставку и монтаж).</p>
<p>2.3. Заказчик вправе:</p>
<p>2.3.1. Требовать надлежащего выполнения работ в соответствии с условиями настоящего Договора.</p>
<p class="sec">3. СТОИМОСТЬ РАБОТ И ПОРЯДОК РАСЧЁТОВ</p>
<p>3.1. Общая стоимость работ по настоящему Договору составляет <strong>{total:,.0f} ({total_words})</strong> рублей, в соответствии с Калькуляцией работ (Приложение № 2).</p>
{pay_html}
<p class="sec">4. ОТВЕТСТВЕННОСТЬ СТОРОН</p>
<p>4.1. За неисполнение или ненадлежащее исполнение условий настоящего Договора Стороны несут ответственность в соответствии с действующим законодательством РФ.</p>
<p>4.2. В случае просрочки выполнения работ по вине Подрядчика, Заказчик вправе потребовать уплаты неустойки в размере 3% от стоимости работ за каждый день просрочки, но не более стоимости выполнения соответствующего вида работ.</p>
<p>4.3. В случае просрочки оплаты Заказчиком, Подрядчик вправе потребовать уплаты неустойки в размере 0,1% от неоплаченной суммы за каждый день просрочки.</p>
<p class="sec">5. ПОРЯДОК СДАЧИ И ПРИЁМКИ РАБОТ</p>
<p>5.1. Приёмка выполненных работ производится путём подписания Сторонами Акта выполненных работ (Приложение № 4 к Договору).</p>
<p>5.2. Заказчик обязан в течение 3 (трёх) дней с момента получения уведомления о готовности мебели произвести приёмку результата работ.</p>
<p>5.3. При обнаружении Заказчиком недостатков в работе, которые не могли быть установлены при обычном способе приёмки, Заказчик обязан незамедлительно уведомить об этом Подрядчика.</p>
<p class="sec">6. ГАРАНТИЯ КАЧЕСТВА</p>
<p>6.1. Подрядчик гарантирует соответствие изготовленной мебели требованиям настоящего Договора и Технического проекта.</p>
<p>6.2. Гарантийный срок на выполненные работы составляет 12 (двенадцать) месяцев с момента подписания Акта выполненных работ.</p>
<p>6.3. Гарантия не распространяется на дефекты, возникшие вследствие нарушения Заказчиком Правил эксплуатации корпусной мебели (Приложение № 3).</p>
<p class="sec">7. ПОРЯДОК РАЗРЕШЕНИЯ СПОРОВ</p>
<p>7.1. Все споры и разногласия, возникающие в связи с исполнением настоящего Договора, разрешаются путём переговоров между Сторонами.</p>
<p>7.2. В случае недостижения соглашения споры разрешаются в судебном порядке в соответствии с законодательством РФ.</p>
<p class="sec">8. ПРОЧИЕ УСЛОВИЯ</p>
<p>8.1. Настоящий Договор вступает в силу с момента его подписания Сторонами.</p>
<p>8.2. Договор составлен в двух экземплярах, имеющих равную юридическую силу – по одному для каждой из Сторон.</p>
<p>8.3. Во всём, что не предусмотрено настоящим Договором, Стороны руководствуются действующим законодательством РФ.</p>
<p class="sec">9. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</p>
<table><tr><th style="width:50%">Подрядчик</th><th style="width:50%">Заказчик</th></tr>
<tr><td>ООО «Интерьерные решения»<br>г. Саратов, ул. Усть-Курдюмская, д. 3<br>ИНН/КПП: _______________<br>р/с: _______________<br>Банк: _______________<br>БИК: _______________<br><br>Менеджер: <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><br>М.П.</td>
<td>{fname}<br>Паспорт: {_passport_str(c)}<br>Выдан: {c.get("passport_issued_by") or "___________"}<br>Дата выдачи: {_fmt_date(c.get("passport_issued_date") or "")}<br>Код подразделения: {c.get("passport_dept_code") or "___________"}<br>Адрес регистрации: {_reg_address(c)}<br>Телефон: {c.get("phone") or "___________"}<br><br>Подпись: <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></td></tr></table>
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
<p class="no-indent" style="text-align:right">Приложение № 3 к договору бытового подряда<br>на изготовление мебели от {contract_date_full}</p>
<h1>«Правила эксплуатации корпусной мебели»</h1>
<p class="sec">1. ОБЩИЕ РЕКОМЕНДАЦИИ</p>
<p>1.1. Срок службы Мебели и сохранение его потребительских свойств напрямую зависят от соблюдения Заказчиком правил, изложенных в настоящем приложении.</p>
<p>1.2. Климатические условия и воздействия окружающей среды (свет, влажность, температура) напрямую влияют на состояние мебели.</p>
<p>1.3. Подрядчик рекомендует соблюдать оптимальные климатические условия в помещении, где установлена мебель: температура воздуха от +18°C до +25°C, относительная влажность воздуха 45% – 70%.</p>
<p>1.4. Следует оберегать мебель от длительного воздействия прямых солнечных лучей, источников тепла (батареи, обогреватели, духовые шкафы, плиты на расстоянии менее 0,5 м), а также от резких перепадов температуры и влажности.</p>
<p>1.5. Запрещается воздействие на Мебель агрессивных жидкостей (кислот, щелочей, растворителей), абразивных чистящих средств и материалов, способных повредить покрытие.</p>
<p>1.6. Мебель предназначена для эксплуатации в жилых или общественных помещениях в соответствии с её функциональным назначением. Подрядчик не несёт ответственности за повреждения, вызванные несоблюдением рекомендуемых условий.</p>
<p>1.7. Подрядчик гарантирует соответствие мебели заявленным характеристикам при условии соблюдения Заказчиком настоящих Правил эксплуатации.</p>
<p class="sec">2. УХОД ЗА МЕБЕЛЬЮ</p>
<p>2.1. Для ухода за поверхностями мебели рекомендуется использовать мягкую влажную ткань или специальные средства, предназначенные для данного вида покрытия.</p>
<p>2.2. Запрещается использовать для очистки мебели жёсткие губки, металлические щётки, абразивные порошки и чистящие средства, содержащие хлор, аммиак или растворители.</p>
<p>2.3. При попадании влаги на поверхность мебели её необходимо незамедлительно вытереть насухо мягкой тканью.</p>
<p>2.4. Для ухода за фасадами с плёночным покрытием (ПВХ) и крашеными фасадами следует использовать только нейтральные моющие средства, разбавленные водой.</p>
<p>2.5. Стеклянные фасады и вставки следует протирать стеклоочистителями без содержания абразивов, используя мягкую безворсовую ткань.</p>
<p>2.6. Металлические элементы фурнитуры следует протирать сухой или слегка влажной тканью. Не допускается попадание влаги в подвижные механизмы петель и направляющих.</p>
<p class="sec">3. ЭКСПЛУАТАЦИЯ ФУРНИТУРЫ И МЕХАНИЗМОВ</p>
<p>3.1. Выдвижные ящики, петли и подъёмные механизмы рассчитаны на нагрузку в соответствии с их техническими характеристиками. Перегрузка механизмов сверх допустимой нормы не допускается.</p>
<p>3.2. При обнаружении скрипа, заедания или некорректной работы фурнитуры следует незамедлительно обратиться к Подрядчику для регулировки. Самостоятельная разборка механизмов не рекомендуется.</p>
<p>3.3. Петли и направляющие допускают регулировку в пределах, предусмотренных конструкцией. Регулировка должна производиться квалифицированным специалистом.</p>
<p>3.4. Не допускается подвешивание на фасады посторонних предметов, не предусмотренных конструкцией мебели.</p>
<p class="sec">4. СТОЛЕШНИЦА И СТЕНОВЫЕ ПАНЕЛИ</p>
<p>4.1. Столешница из ЛДСП или постформинга не предназначена для прямого контакта с открытым огнём и раскалёнными предметами. Используйте подставки под горячее.</p>
<p>4.2. Не допускается длительный контакт столешницы с водой. После использования мойки следует протирать поверхность вокруг неё насухо.</p>
<p>4.3. Резку продуктов непосредственно на поверхности столешницы следует производить только на разделочной доске.</p>
<p>4.4. Стеновые панели следует оберегать от длительного воздействия пара и конденсата. При необходимости протирать сухой тканью.</p>
<p class="sec">5. ГАРАНТИЙНЫЕ ОБЯЗАТЕЛЬСТВА</p>
<p>5.1. Гарантийный срок на изготовленную мебель составляет 12 (двенадцать) месяцев с момента подписания Акта выполненных работ.</p>
<p>5.2. Гарантия распространяется на дефекты производственного характера, выявленные при нормальных условиях эксплуатации и соблюдении настоящих Правил.</p>
<p>5.3. Гарантия не распространяется на:</p>
<p>5.3.1. Повреждения, возникшие вследствие несоблюдения настоящих Правил эксплуатации.</p>
<p>5.3.2. Механические повреждения (царапины, сколы, трещины), возникшие по вине Заказчика или третьих лиц.</p>
<p>5.3.3. Повреждения, вызванные воздействием влаги, химических веществ или экстремальных температур.</p>
<p>5.3.4. Естественный износ покрытий, фурнитуры и механизмов в пределах нормы.</p>
<p>5.3.5. Повреждения, возникшие вследствие самостоятельного ремонта или модификации мебели Заказчиком.</p>
<p>5.4. Для обращения по гарантии Заказчик обязан уведомить Подрядчика в письменной форме с описанием дефекта и приложением фотоматериалов.</p>
<table style="margin-top:30px"><tr><th style="width:50%">Подрядчик</th><th style="width:50%">Заказчик</th></tr>
<tr><td>ООО «Интерьерные решения»<br><br>Менеджер: <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><br>М.П.</td>
<td>{fname}<br>Телефон: {c.get("phone") or "___________"}<br><br>Подпись: <span class="ul">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></td></tr></table>
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
        p.add_run(f'Приложение № 3 к договору бытового подряда\nна изготовление мебели от {contract_date_full}')
        h('«Правила эксплуатации корпусной мебели»')

        sec_title('1. ОБЩИЕ РЕКОМЕНДАЦИИ')
        para('1.1. Срок службы Мебели и сохранение его потребительских свойств напрямую зависят от соблюдения Заказчиком правил, изложенных в настоящем приложении.')
        para('1.2. Климатические условия и воздействия окружающей среды (свет, влажность, температура) напрямую влияют на состояние мебели.')
        para('1.3. Подрядчик рекомендует соблюдать оптимальные климатические условия в помещении, где установлена мебель: температура воздуха от +18°C до +25°C, относительная влажность воздуха 45% – 70%.')
        para('1.4. Следует оберегать мебель от длительного воздействия прямых солнечных лучей, источников тепла (батареи, обогреватели, духовые шкафы, плиты на расстоянии менее 0,5 м), а также от резких перепадов температуры и влажности.')
        para('1.5. Запрещается воздействие на Мебель агрессивных жидкостей (кислот, щелочей, растворителей), абразивных чистящих средств и материалов, способных повредить покрытие.')
        para('1.6. Мебель предназначена для эксплуатации в жилых или общественных помещениях в соответствии с её функциональным назначением. Подрядчик не несёт ответственности за повреждения, вызванные несоблюдением рекомендуемых условий.')
        para('1.7. Подрядчик гарантирует соответствие мебели заявленным характеристикам при условии соблюдения Заказчиком настоящих Правил эксплуатации.')

        sec_title('2. УХОД ЗА МЕБЕЛЬЮ')
        para('2.1. Для ухода за поверхностями мебели рекомендуется использовать мягкую влажную ткань или специальные средства для данного вида покрытия.')
        para('2.2. Запрещается использовать для очистки мебели жёсткие губки, металлические щётки, абразивные порошки и чистящие средства, содержащие хлор, аммиак или растворители.')
        para('2.3. При попадании влаги на поверхность мебели её необходимо незамедлительно вытереть насухо мягкой тканью.')
        para('2.4. Для ухода за фасадами с плёночным покрытием (ПВХ) и крашеными фасадами следует использовать только нейтральные моющие средства, разбавленные водой.')
        para('2.5. Стеклянные фасады и вставки следует протирать стеклоочистителями без содержания абразивов, используя мягкую безворсовую ткань.')
        para('2.6. Металлические элементы фурнитуры следует протирать сухой или слегка влажной тканью. Не допускается попадание влаги в подвижные механизмы петель и направляющих.')

        sec_title('3. ЭКСПЛУАТАЦИЯ ФУРНИТУРЫ И МЕХАНИЗМОВ')
        para('3.1. Выдвижные ящики, петли и подъёмные механизмы рассчитаны на нагрузку в соответствии с их техническими характеристиками. Перегрузка механизмов не допускается.')
        para('3.2. При обнаружении скрипа, заедания или некорректной работы фурнитуры следует обратиться к Подрядчику для регулировки. Самостоятельная разборка механизмов не рекомендуется.')
        para('3.3. Петли и направляющие допускают регулировку в пределах, предусмотренных конструкцией. Регулировка должна производиться квалифицированным специалистом.')
        para('3.4. Не допускается подвешивание на фасады посторонних предметов, не предусмотренных конструкцией мебели.')

        sec_title('4. СТОЛЕШНИЦА И СТЕНОВЫЕ ПАНЕЛИ')
        para('4.1. Столешница из ЛДСП или постформинга не предназначена для прямого контакта с открытым огнём и раскалёнными предметами. Используйте подставки под горячее.')
        para('4.2. Не допускается длительный контакт столешницы с водой. После использования мойки следует протирать поверхность вокруг неё насухо.')
        para('4.3. Резку продуктов непосредственно на поверхности столешницы следует производить только на разделочной доске.')
        para('4.4. Стеновые панели следует оберегать от длительного воздействия пара и конденсата. При необходимости протирать сухой тканью.')

        sec_title('5. ГАРАНТИЙНЫЕ ОБЯЗАТЕЛЬСТВА')
        para('5.1. Гарантийный срок на изготовленную мебель составляет 12 (двенадцать) месяцев с момента подписания Акта выполненных работ.')
        para('5.2. Гарантия распространяется на дефекты производственного характера, выявленные при нормальных условиях эксплуатации и соблюдении настоящих Правил.')
        para('5.3. Гарантия не распространяется на: повреждения вследствие несоблюдения настоящих Правил; механические повреждения по вине Заказчика или третьих лиц; воздействие влаги, химических веществ или экстремальных температур; естественный износ покрытий и фурнитуры; повреждения вследствие самостоятельного ремонта или модификации мебели Заказчиком.')
        para('5.4. Для обращения по гарантии Заказчик обязан уведомить Подрядчика в письменной форме с описанием дефекта и приложением фотоматериалов.')

        sig_table(
            ['Подрядчик', 'ООО «Интерьерные решения»\n\nМенеджер: ______________________________\nМ.П.'],
            ['Заказчик', f'{fname}\nТелефон: {c.get("phone") or "___________"}\n\nПодпись: ______________________________']
        )

    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()