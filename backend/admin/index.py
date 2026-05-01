import json
import os
import re
import logging
import jwt
import bcrypt
import psycopg2
from contextlib import contextmanager

logger = logging.getLogger(__name__)

ALLOWED_ORIGINS = [o.strip() for o in os.environ.get('ALLOWED_ORIGINS', '').split(',') if o.strip()]

def get_cors(event: dict) -> dict:
    origin = (event.get('headers') or {}).get('origin') or (event.get('headers') or {}).get('Origin') or ''
    allowed = origin if (origin and (any(origin == o for o in ALLOWED_ORIGINS) or not ALLOWED_ORIGINS)) else (ALLOWED_ORIGINS[0] if ALLOWED_ORIGINS else '*')
    return {
        'Access-Control-Allow-Origin': allowed,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
        'Access-Control-Allow-Credentials': 'true',
    }

JWT_SECRET = os.environ['JWT_SECRET']


@contextmanager
def get_db():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def extract_token(event: dict) -> str:
    """Токен из заголовка Authorization: Bearer <token>"""
    headers = event.get('headers') or {}
    auth = headers.get('X-Authorization') or headers.get('Authorization') or ''
    if auth.startswith('Bearer '):
        return auth[7:].strip()
    return ''


def verify_admin(event: dict) -> dict | None:
    token = extract_token(event)
    if not token:
        logger.warning('[auth] no token in Authorization header')
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        if payload.get('role') != 'admin':
            return None
        return payload
    except Exception as e:
        logger.error(f'[auth] jwt error: {e}')
        return None


def handler(event: dict, context) -> dict:
    """Админ-панель: управление пользователями (только для admin)"""
    cors = get_cors(event)

    def ok(data, status=200):
        return {'statusCode': status, 'headers': {**cors, 'Content-Type': 'application/json'}, 'body': json.dumps(data, default=str)}

    def err(msg, status=400):
        return {'statusCode': status, 'headers': {**cors, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg})}

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    admin = verify_admin(event)
    if not admin:
        return err('Доступ запрещён', 403)

    method = event.get('httpMethod', 'GET')
    body = json.loads(event.get('body') or '{}') if method in ('POST', 'PUT', 'DELETE') else {}

    # GET — список всех пользователей
    if method == 'GET':
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute('SELECT id, login, role, status, plan, created_at, last_login, full_name, poa_number, poa_date FROM users ORDER BY created_at DESC')
            rows = cur.fetchall()
        users = [
            {'id': r[0], 'login': r[1], 'role': r[2], 'status': r[3],
             'plan': r[4], 'created_at': str(r[5]), 'last_login': str(r[6]) if r[6] else None,
             'full_name': r[7] or '', 'poa_number': r[8] or '', 'poa_date': str(r[9]) if r[9] else ''}
            for r in rows
        ]
        return ok({'users': users})

    # POST — создать пользователя
    if method == 'POST':
        login = (body.get('login') or '').strip().lower()
        password = (body.get('password') or '').strip()
        role = body.get('role', 'user')
        plan = body.get('plan', 'free')

        if len(login) < 3:
            return err('Логин минимум 3 символа')
        if len(password) < 8:
            return err('Пароль минимум 8 символов')
        if not re.search(r'\d', password):
            return err('Пароль должен содержать хотя бы одну цифру')
        if role not in ('user', 'admin'):
            return err('Недопустимая роль')

        pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        try:
            with get_db() as conn:
                cur = conn.cursor()
                cur.execute(
                    'INSERT INTO users (login, password_hash, role, plan) VALUES (%s, %s, %s, %s) RETURNING id',
                    (login, pw_hash, role, plan)
                )
                user_id = cur.fetchone()[0]
        except Exception as e:
            if 'unique' in str(e).lower() or 'duplicate' in str(e).lower():
                return err('Такой логин уже занят')
            logger.error(f'Create user error: {e}')
            raise
        return ok({'ok': True, 'id': user_id}, 201)

    # PUT — обновить пользователя (статус, план, роль, пароль)
    if method == 'PUT':
        user_id = body.get('id')
        if not user_id:
            return err('Не указан id')

        if 'password' in body:
            new_pass = (body.get('password') or '').strip()
            if len(new_pass) < 8:
                return err('Пароль минимум 8 символов')
            if not re.search(r'\d', new_pass):
                return err('Пароль должен содержать хотя бы одну цифру')
            pw_hash = bcrypt.hashpw(new_pass.encode(), bcrypt.gensalt()).decode()
            with get_db() as conn:
                cur = conn.cursor()
                cur.execute('UPDATE users SET password_hash = %s WHERE id = %s', (pw_hash, user_id))
            return ok({'ok': True})

        fields = []
        values = []
        for key in ('status', 'plan', 'role', 'full_name', 'poa_number', 'poa_date'):
            if key in body:
                fields.append(f'{key} = %s')
                values.append(body[key])

        if not fields:
            return err('Нет полей для обновления')

        values.append(user_id)
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(f'UPDATE users SET {", ".join(fields)} WHERE id = %s', values)
        return ok({'ok': True})

    # DELETE — удалить пользователя
    if method == 'DELETE':
        user_id = body.get('id')
        if not user_id:
            return err('Не указан id')
        if str(user_id) == str(admin.get('sub')):
            return err('Нельзя удалить себя')
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute('DELETE FROM users WHERE id = %s', (user_id,))
        return ok({'ok': True})

    return err('Not found', 404)