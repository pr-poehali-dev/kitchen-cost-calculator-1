import json
import os
import jwt
import bcrypt
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
}

JWT_SECRET = os.environ.get('JWT_SECRET', '1641Bd849poehali')

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def verify_admin(event: dict) -> dict | None:
    auth = event.get('headers', {}).get('X-Authorization') or event.get('headers', {}).get('Authorization', '')
    token = auth.replace('Bearer ', '').strip()
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
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
    body = json.loads(event.get('body') or '{}') if method in ('POST', 'PUT', 'DELETE') else {}
    qs = event.get('queryStringParameters') or {}
    action = qs.get('action', '')

    # GET — список всех пользователей
    if method == 'GET':
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT id, login, role, status, plan, created_at, last_login FROM users ORDER BY created_at DESC')
        rows = cur.fetchall()
        conn.close()
        users = [
            {'id': r[0], 'login': r[1], 'role': r[2], 'status': r[3],
             'plan': r[4], 'created_at': str(r[5]), 'last_login': str(r[6]) if r[6] else None}
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
        if len(password) < 4:
            return err('Пароль минимум 4 символа')
        if role not in ('user', 'admin'):
            return err('Недопустимая роль')

        pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute(
                'INSERT INTO users (login, password_hash, role, plan) VALUES (%s, %s, %s, %s) RETURNING id',
                (login, pw_hash, role, plan)
            )
            user_id = cur.fetchone()[0]
            conn.commit()
        except Exception as e:
            conn.rollback()
            conn.close()
            if 'unique' in str(e).lower() or 'duplicate' in str(e).lower():
                return err('Такой логин уже занят')
            raise
        conn.close()
        return ok({'ok': True, 'id': user_id}, 201)

    # PUT — обновить пользователя (статус, план, роль, пароль)
    if method == 'PUT':
        user_id = body.get('id')
        if not user_id:
            return err('Не указан id')

        # Смена пароля
        if 'password' in body:
            new_pass = (body.get('password') or '').strip()
            if len(new_pass) < 4:
                return err('Пароль минимум 4 символа')
            pw_hash = bcrypt.hashpw(new_pass.encode(), bcrypt.gensalt()).decode()
            conn = get_db()
            cur = conn.cursor()
            cur.execute('UPDATE users SET password_hash = %s WHERE id = %s', (pw_hash, user_id))
            conn.commit()
            conn.close()
            return ok({'ok': True})

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

    # DELETE — удалить пользователя
    if method == 'DELETE':
        user_id = body.get('id')
        if not user_id:
            return err('Не указан id')
        if user_id == admin.get('sub'):
            return err('Нельзя удалить себя')
        conn = get_db()
        cur = conn.cursor()
        cur.execute('DELETE FROM users WHERE id = %s', (user_id,))
        conn.commit()
        conn.close()
        return ok({'ok': True})

    return err('Not found', 404)