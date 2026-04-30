import json
import os
import re
import logging
import bcrypt
import jwt
import psycopg2
from contextlib import contextmanager
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

ALLOWED_ORIGINS = [o.strip() for o in os.environ.get('ALLOWED_ORIGINS', '').split(',') if o.strip()]

def get_cors(event: dict) -> dict:
    origin = (event.get('headers') or {}).get('origin') or (event.get('headers') or {}).get('Origin') or ''
    allowed = origin if (origin and (any(origin == o for o in ALLOWED_ORIGINS) or not ALLOWED_ORIGINS)) else (ALLOWED_ORIGINS[0] if ALLOWED_ORIGINS else '*')
    return {
        'Access-Control-Allow-Origin': allowed,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
        'Access-Control-Allow-Credentials': 'true',
    }

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

JWT_SECRET = os.environ['JWT_SECRET']

def make_token(user_id: int, role: str) -> str:
    secret = JWT_SECRET
    payload = {
        'sub': str(user_id),
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, secret, algorithm='HS256')

def verify_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=['HS256'])

def handler(event: dict, context) -> dict:
    """Авторизация: POST /register, POST /login, GET /me"""
    cors = get_cors(event)

    def ok(data: dict, status: int = 200) -> dict:
        return {'statusCode': status, 'headers': {**cors, 'Content-Type': 'application/json'}, 'body': json.dumps(data)}

    def err(msg: str, status: int = 400) -> dict:
        return {'statusCode': status, 'headers': {**cors, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg})}

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', '')
    if '/register' in path:
        action = 'register'
    elif '/login' in path:
        action = 'login'
    elif '/me' in path:
        action = 'me'

    # POST /register
    if method == 'POST' and action == 'register':
        body = json.loads(event.get('body') or '{}')
        login = (body.get('login') or '').strip().lower()
        password = (body.get('password') or '').strip()

        if len(login) < 3:
            return err('Логин должен быть минимум 3 символа')
        if len(password) < 8:
            return err('Пароль должен быть минимум 8 символов')
        if not re.search(r'\d', password):
            return err('Пароль должен содержать хотя бы одну цифру')

        pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        try:
            with get_db() as conn:
                cur = conn.cursor()
                cur.execute('SELECT COUNT(*) FROM users')
                total = cur.fetchone()[0]
                role = 'admin' if total == 0 else 'user'
                cur.execute(
                    'INSERT INTO users (login, password_hash, role) VALUES (%s, %s, %s) RETURNING id',
                    (login, pw_hash, role)
                )
                user_id = cur.fetchone()[0]
        except Exception as e:
            if 'unique' in str(e).lower() or 'duplicate' in str(e).lower():
                return err('Такой логин уже занят')
            logger.error(f'Register error: {e}')
            raise

        token = make_token(user_id, role)
        return ok({'token': token, 'id': user_id, 'login': login, 'role': role, 'plan': 'free'}, 201)

    # POST /login
    if method == 'POST' and action == 'login':
        body = json.loads(event.get('body') or '{}')
        login = (body.get('login') or '').strip().lower()
        password = (body.get('password') or '').strip()

        with get_db() as conn:
            cur = conn.cursor()
            cur.execute('SELECT id, password_hash, role, status, plan FROM users WHERE login = %s', (login,))
            row = cur.fetchone()
            if not row:
                return err('Неверный логин или пароль', 401)
            user_id, pw_hash, role, status, plan = row
            if status == 'banned':
                return err('Доступ заблокирован', 403)
            if not bcrypt.checkpw(password.encode(), pw_hash.encode()):
                return err('Неверный логин или пароль', 401)
            cur.execute('UPDATE users SET last_login = NOW() WHERE id = %s', (user_id,))

        token = make_token(user_id, role)
        return ok({'token': token, 'id': user_id, 'login': login, 'role': role, 'plan': plan})

    # GET /me
    if method == 'GET' and action == 'me':
        auth = event.get('headers', {}).get('X-Authorization') or event.get('headers', {}).get('Authorization', '')
        token = auth.replace('Bearer ', '').strip()
        if not token:
            return err('Нет токена', 401)
        try:
            payload = verify_token(token)
        except jwt.ExpiredSignatureError:
            return err('Токен истёк', 401)
        except Exception:
            return err('Недействительный токен', 401)

        with get_db() as conn:
            cur = conn.cursor()
            cur.execute('SELECT id, login, role, status, plan FROM users WHERE id = %s', (payload['sub'],))
            row = cur.fetchone()

        if not row:
            return err('Пользователь не найден', 404)
        uid, login, role, status, plan = row
        if status == 'banned':
            return err('Доступ заблокирован', 403)
        return ok({'id': uid, 'login': login, 'role': role, 'plan': plan})

    return err('Not found', 404)