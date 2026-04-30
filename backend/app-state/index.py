import json
import os
import jwt
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

JWT_SECRET = os.environ['JWT_SECRET']


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def verify_token(event: dict) -> dict | None:
    """Проверяет токен из заголовка Authorization: Bearer <token>"""
    headers = event.get('headers') or {}
    auth = headers.get('X-Authorization') or headers.get('Authorization') or ''
    token = auth[7:].strip() if auth.startswith('Bearer ') else ''
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
    State приложения — отдельный для каждого пользователя по user_id из JWT.
    GET  ?token=...             — загрузить state
    POST ?token=...  body=state — сохранить state
    """
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    payload = verify_token(event)
    if not payload:
        return err('Не авторизован', 401)

    user_id = payload.get('user_id') or payload.get('id') or payload.get('sub')
    if not user_id:
        return err('Нет user_id в токене', 401)

    user_id = int(user_id)
    method = event.get('httpMethod', 'GET')

    # GET — вернуть state пользователя, при отсутствии — общий fallback (id=1, user_id IS NULL)
    if method == 'GET':
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT state FROM app_state WHERE user_id = %s', (user_id,))
        row = cur.fetchone()
        if not row:
            # Fallback на старую общую запись (миграция данных)
            cur.execute('SELECT state FROM app_state WHERE id = 1 AND user_id IS NULL')
            row = cur.fetchone()
        conn.close()
        if not row:
            return ok({'state': None})
        return ok({'state': row[0]})

    # POST — сохранить state пользователя
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
            INSERT INTO app_state (user_id, state, updated_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (user_id) DO UPDATE
              SET state = EXCLUDED.state, updated_at = NOW()
        ''', (user_id, json.dumps(state)))
        conn.commit()
        conn.close()
        return ok({'ok': True})

    return err('Not found', 404)