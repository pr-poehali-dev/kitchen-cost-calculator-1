import json
import os
import jwt
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

JWT_SECRET = os.environ.get('JWT_SECRET', '1641Bd849poehali')


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def verify_token(event: dict) -> dict | None:
    """Проверяет токен из query string ?token=..."""
    qs = event.get('queryStringParameters') or {}
    token = (qs.get('token') or '').strip()
    if not token:
        return None
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except Exception:
        return None


def ok(data, status=200):
    return {
        'statusCode': status,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps(data),
    }


def err(msg, status=400):
    return {
        'statusCode': status,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps({'error': msg}),
    }


def handler(event: dict, context) -> dict:
    """
    Общий state приложения — один на всех пользователей.
    GET  ?token=...        — загрузить state
    POST ?token=...  body=state — сохранить state
    """
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    # Проверяем авторизацию
    payload = verify_token(event)
    if not payload:
        return err('Не авторизован', 401)

    method = event.get('httpMethod', 'GET')

    # GET — вернуть текущий state
    if method == 'GET':
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT state FROM app_state WHERE id = 1')
        row = cur.fetchone()
        conn.close()
        if not row:
            return ok({'state': None})
        return ok({'state': row[0]})

    # POST — сохранить state
    if method == 'POST':
        body_raw = event.get('body') or ''
        try:
            body = json.loads(body_raw)
            state = body.get('state')
        except Exception:
            return err('Невалидный JSON')

        if state is None:
            return err('Нет поля state')

        conn = get_db()
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO app_state (id, state, updated_at)
            VALUES (1, %s, NOW())
            ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()
        ''', (json.dumps(state),))
        conn.commit()
        conn.close()
        return ok({'ok': True})

    return err('Not found', 404)
