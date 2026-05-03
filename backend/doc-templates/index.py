"""
CRUD для шаблонов документов. Позволяет создавать, редактировать и удалять
пользовательские шаблоны HTML-документов с переменными.
"""
import json
import os
import uuid
import psycopg2
import jwt
from contextlib import contextmanager
from datetime import datetime

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
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

def ok(data, status=200):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, ensure_ascii=False)}

def err(msg, status=400):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg}, ensure_ascii=False)}

def get_user(event):
    token = (event.get('headers') or {}).get('X-Authorization') or (event.get('headers') or {}).get('Authorization') or ''
    token = token.replace('Bearer ', '')
    if not token:
        return None
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except Exception:
        return None

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 'public')

def handler(event: dict, context) -> dict:
    """Управление шаблонами документов — CRUD."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    payload = get_user(event)
    if not payload:
        return err('Не авторизован', 401)

    user_id = payload.get('sub') or payload.get('user_id') or payload.get('id')
    method = event.get('httpMethod', 'GET')
    qs = event.get('queryStringParameters') or {}
    template_id = qs.get('id')

    with get_db() as conn:
        cur = conn.cursor()

        # GET — список шаблонов или один шаблон
        if method == 'GET':
            if template_id:
                cur.execute(
                    f'SELECT * FROM {SCHEMA}.doc_templates WHERE id = %s AND user_id = %s',
                    (template_id, user_id)
                )
                row = cur.fetchone()
                if not row:
                    return err('Шаблон не найден', 404)
                cols = [d[0] for d in cur.description]
                return ok(dict(zip(cols, row)))
            else:
                doc_type = qs.get('doc_type')
                if doc_type:
                    cur.execute(
                        f'SELECT * FROM {SCHEMA}.doc_templates WHERE user_id = %s AND doc_type = %s ORDER BY is_default DESC, updated_at DESC',
                        (user_id, doc_type)
                    )
                else:
                    cur.execute(
                        f'SELECT * FROM {SCHEMA}.doc_templates WHERE user_id = %s ORDER BY doc_type, is_default DESC, updated_at DESC',
                        (user_id,)
                    )
                cols = [d[0] for d in cur.description]
                rows = [dict(zip(cols, r)) for r in cur.fetchall()]
                return ok(rows)

        body = json.loads(event.get('body') or '{}')

        # POST — создать шаблон
        if method == 'POST':
            doc_type = body.get('doc_type', '')
            name = body.get('name', 'Новый шаблон')
            blocks = body.get('blocks', [])
            settings = body.get('settings', {})
            is_default = body.get('is_default', False)

            if not doc_type:
                return err('Не указан doc_type')

            new_id = str(uuid.uuid4())

            # Если новый шаблон — default, снимаем флаг с остальных
            if is_default:
                cur.execute(
                    f'UPDATE {SCHEMA}.doc_templates SET is_default = false WHERE user_id = %s AND doc_type = %s',
                    (user_id, doc_type)
                )

            cur.execute(
                f'''INSERT INTO {SCHEMA}.doc_templates (id, user_id, doc_type, name, is_default, blocks, settings)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)''',
                (new_id, user_id, doc_type, name, is_default,
                 json.dumps(blocks, ensure_ascii=False),
                 json.dumps(settings, ensure_ascii=False))
            )
            return ok({'id': new_id}, 201)

        # PUT — обновить шаблон
        if method == 'PUT':
            if not template_id:
                return err('Не указан id')

            name = body.get('name')
            blocks = body.get('blocks')
            settings = body.get('settings')
            is_default = body.get('is_default')

            # Проверяем что шаблон принадлежит пользователю
            cur.execute(f'SELECT doc_type FROM {SCHEMA}.doc_templates WHERE id = %s AND user_id = %s', (template_id, user_id))
            row = cur.fetchone()
            if not row:
                return err('Шаблон не найден', 404)
            doc_type = row[0]

            if is_default:
                cur.execute(
                    f'UPDATE {SCHEMA}.doc_templates SET is_default = false WHERE user_id = %s AND doc_type = %s AND id != %s',
                    (user_id, doc_type, template_id)
                )

            fields = []
            values = []
            if name is not None: fields.append('name = %s'); values.append(name)
            if blocks is not None: fields.append('blocks = %s'); values.append(json.dumps(blocks, ensure_ascii=False))
            if settings is not None: fields.append('settings = %s'); values.append(json.dumps(settings, ensure_ascii=False))
            if is_default is not None: fields.append('is_default = %s'); values.append(is_default)
            fields.append('updated_at = now()')
            values.extend([template_id, user_id])

            cur.execute(
                f'UPDATE {SCHEMA}.doc_templates SET {", ".join(fields)} WHERE id = %s AND user_id = %s',
                values
            )
            return ok({'ok': True})

        # DELETE — удалить шаблон
        if method == 'DELETE':
            if not template_id:
                return err('Не указан id')
            cur.execute(f'DELETE FROM {SCHEMA}.doc_templates WHERE id = %s AND user_id = %s', (template_id, user_id))
            return ok({'ok': True})

    return err('Неизвестный метод', 405)
