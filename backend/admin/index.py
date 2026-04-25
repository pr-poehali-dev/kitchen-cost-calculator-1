import json
import os
import jwt
import psycopg2
from datetime import datetime, timezone

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
}

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def verify_admin(event: dict) -> dict | None:
    auth = event.get('headers', {}).get('X-Authorization') or event.get('headers', {}).get('Authorization', '')
    token = auth.replace('Bearer ', '').strip()
    if not token:
        return None
    try:
        payload = jwt.decode(token, os.environ['JWT_SECRET'], algorithms=['HS256'])
        if payload.get('role') != 'admin':
            return None
        return payload
    except Exception:
        return None

def ok(data, status=200):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, default=str)}

def err(msg, status=400):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg})}

def handler(event: dict, context) -> dict:
    """Админ-панель: управление пользователями (только для admin)"""

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    admin = verify_admin(event)
    if not admin:
        return err('Доступ запрещён', 403)

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    body = json.loads(event.get('body') or '{}') if method in ('POST', 'PUT') else {}

    # GET /admin — список всех пользователей
    if method == 'GET':
        conn = get_db()
        cur = conn.cursor()
        cur.execute('''
            SELECT id, login, role, status, plan, created_at, last_login
            FROM users ORDER BY created_at DESC
        ''')
        rows = cur.fetchall()
        conn.close()
        users = [
            {'id': r[0], 'login': r[1], 'role': r[2], 'status': r[3],
             'plan': r[4], 'created_at': str(r[5]), 'last_login': str(r[6]) if r[6] else None}
            for r in rows
        ]
        return ok({'users': users})

    # PUT /admin — обновить пользователя (статус, план, роль)
    if method == 'PUT':
        user_id = body.get('id')
        if not user_id:
            return err('Не указан id')

        fields = []
        values = []
        for key in ('status', 'plan', 'role'):
            if key in body:
                fields.append(f'{key} = %s')
                values.append(body[key])

        if not fields:
            return err('Нет полей для обновления')

        values.append(user_id)
        conn = get_db()
        cur = conn.cursor()
        cur.execute(f'UPDATE users SET {", ".join(fields)} WHERE id = %s', values)
        conn.commit()
        conn.close()
        return ok({'ok': True})

    return err('Not found', 404)
