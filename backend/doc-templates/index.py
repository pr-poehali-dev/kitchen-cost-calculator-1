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

def _serialize(obj):
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    raise TypeError(f'Not serializable: {type(obj)}')

def ok(data, status=200):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, ensure_ascii=False, default=_serialize)}

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

def _default_blocks(doc_type: str) -> list:
    b = lambda id_, type_, label, content: {'id': id_, 'type': type_, 'label': label, 'content': content, 'enabled': True}
    if doc_type == 'contract':
        return [
            b('header', 'header', 'Шапка', 'ДОГОВОР\nбытового подряда на изготовление мебели № {{номер_договора}}\nг. {{город}}  {{дата_договора}}'),
            b('intro', 'paragraph', 'Преамбула', '{{компания}}, в лице менеджера {{менеджер}}, действующего на основании доверенности № {{номер_доверенности}} от {{дата_доверенности}}, именуемый в дальнейшем «Подрядчик», и гр. {{имя_клиента}}, именуемый (ая) в дальнейшем «Заказчик», заключили настоящий Договор о нижеследующем:'),
            b('s1', 'section', '1. ПРЕДМЕТ ДОГОВОРА', '1. ПРЕДМЕТ ДОГОВОРА'),
            b('s1p1', 'paragraph', '1.1', '1.1. Подрядчик обязуется выполнить работу по изготовлению мебели и передать результат работы Заказчику, а Заказчик обязуется принять и оплатить результат работ.'),
            b('s1p2', 'paragraph', '1.2', '1.2. Наименование, качественные характеристики, количество, дизайн мебели указываются в Техническом проекте, который является Приложением № 1 к настоящему Договору.'),
            b('s1p4', 'paragraph', '1.4 — Срок изготовления', '1.4. Срок выполнения работ составляет {{срок_изготовления}} ({{срок_изготовления_прописью}}) рабочих дней с момента согласования Технического проекта и получения предварительной оплаты.'),
            b('s2', 'section', '2. ТЕХНИЧЕСКИЙ ПРОЕКТ', '2. РАЗРАБОТКА И СОГЛАСОВАНИЕ ТЕХНИЧЕСКОГО ПРОЕКТА'),
            b('s2p1', 'paragraph', '2.1', '2.1. Технический проект разрабатывается Подрядчиком в течение 10 (десяти) рабочих дней с момента получения предварительной оплаты.'),
            b('s3', 'section', '3. СТОИМОСТЬ И РАСЧЁТЫ', '3. СТОИМОСТЬ РАБОТ И ПОРЯДОК РАСЧЁТОВ'),
            b('s3p1', 'paragraph', '3.1 — Стоимость', '3.1. Общая стоимость работ составляет {{сумма}} ({{сумма_прописью}}) рублей, НДС не облагается.'),
            b('s3p2', 'paragraph', '3.2 — Оплата', '3.2. Оплата работ осуществляется в следующем порядке:\n3.2.1. Предварительная оплата при заключении Договора.\n3.2.2. Окончательный платёж не позднее дня доставки.'),
            b('s4', 'section', '4. ПРАВА И ОБЯЗАННОСТИ', '4. ПРАВА И ОБЯЗАННОСТИ СТОРОН'),
            b('s5', 'section', '5. ГАРАНТИЯ', '5. ГАРАНТИЯ И КАЧЕСТВО ВЫПОЛНЕННЫХ РАБОТ'),
            b('s5g', 'paragraph', '5 — Гарантийный срок', 'Гарантийный срок на мебель (корпус, фасады, столешницы) составляет 24 месяца. Гарантийный срок на фурнитуру — 6 месяцев.'),
            b('s6', 'section', '6. ПРИЁМКА', '6. ПОРЯДОК ПРИЁМКИ ВЫПОЛНЕННЫХ РАБОТ'),
            b('s7', 'section', '7. ОТВЕТСТВЕННОСТЬ', '7. ОТВЕТСТВЕННОСТЬ СТОРОН'),
            b('s8', 'section', '8. СПОРЫ', '8. ПОРЯДОК РАЗРЕШЕНИЯ СПОРОВ'),
            b('s9', 'section', '9. СРОК ДЕЙСТВИЯ', '9. СРОК ДЕЙСТВИЯ ДОГОВОРА'),
            b('s10', 'section', '10. ЗАКЛЮЧЕНИЕ', '10. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ'),
            b('s11', 'section', '11. РЕКВИЗИТЫ СТОРОН', '11. РЕКВИЗИТЫ СТОРОН'),
        ]
    if doc_type == 'act':
        return [
            b('header', 'header', 'Шапка', 'Приложение № 4 к договору бытового подряда на изготовление мебели № {{номер_договора}} от {{дата_договора}}'),
            b('title', 'section', 'Заголовок', '«АКТ ВЫПОЛНЕННЫХ РАБОТ»'),
            b('date', 'paragraph', 'Открытая дата', 'от «____» ________________ 20____ г.'),
            b('intro', 'paragraph', 'Преамбула', '{{компания}}, в лице менеджера {{менеджер}}, именуемый «Подрядчик», и гр. {{имя_клиента}}, именуемый «Заказчик», подписали настоящий Акт о нижеследующем:'),
            b('p1', 'paragraph', 'Пункт 1', '1. Подрядчик изготовил для Заказчика мебель по договору бытового подряда № {{номер_договора}} от {{дата_договора}}:'),
            b('p2', 'paragraph', 'Пункт 2 — комплектность', '2. Комплектность, количество, вид, характеристики мебели соответствуют условиям договора. Визуальный осмотр произведён Заказчиком. Фурнитура проверена. Заказчик претензий по объему, качеству, результату и срокам выполнения работ: не имеет / имеет (ненужное зачеркнуть).'),
            b('p3', 'paragraph', 'Пункт 3', '3. В случае наличия замечаний Заказчик, после подписания акта, вправе требовать устранения замечаний, отражённых в данном акте.'),
            b('p4', 'paragraph', 'Пункт 4', '4. Настоящий акт подписан в 2 (двух) экземплярах по одному для каждой из Сторон.'),
        ]
    if doc_type == 'rules':
        return [
            b('header', 'header', 'Шапка', 'Приложение № 3 к договору бытового подряда на изготовление мебели № {{номер_договора}} от {{дата_договора}}'),
            b('s1', 'section', '1. ОБЩИЕ РЕКОМЕНДАЦИИ', '1. ОБЩИЕ РЕКОМЕНДАЦИИ'),
            b('s1p1', 'paragraph', '1.1', '1.1. Срок службы Мебели и сохранение его потребительских свойств напрямую зависят от соблюдения Заказчиком правил, изложенных в настоящем приложении.'),
            b('s1p3', 'paragraph', '1.3 — Климат', '1.3. Оптимальные условия: температура воздуха от +18°C до +25°C, относительная влажность воздуха 45% - 70%.'),
            b('s2', 'section', '2. УСЛОВИЯ ХРАНЕНИЯ', '2. УСЛОВИЯ ХРАНЕНИЯ'),
            b('s2p1', 'paragraph', '2.1', '2.1. Хранение Мебели до её установки должно осуществляться в сухих, проветриваемых, отапливаемых помещениях.'),
            b('s3', 'section', '3. ПРАВИЛА ЭКСПЛУАТАЦИИ', '3. ПРАВИЛА ЭКСПЛУАТАЦИИ И УХОДА ЗА МЕБЕЛЬЮ'),
            b('s3ldsp', 'paragraph', 'Корпус ЛДСП', '3.2. Корпус ЛДСП: немедленно вытирать пролитое. Не мыть водой, не использовать пароочистители и абразивы.'),
            b('s3mdf', 'paragraph', 'Фасады МДФ', '3.3. Фасады МДФ: не допускать контакта с горячим (>60°C), острыми предметами, агрессивной химией.'),
            b('s3table', 'paragraph', 'Столешницы', '3.4. Столешницы: не использовать как разделочную доску. Сразу убирать воду, особенно на стыках.'),
            b('warn', 'paragraph', 'Предупреждение', 'ВНИМАНИЕ! Подрядчик не несет ответственность за последствия от несоблюдения установленных норм и правил по уходу и эксплуатации корпусной мебели.'),
        ]
    # Для остальных типов — пустой список
    return [
        b('header', 'header', 'Шапка', f'Документ к договору № {{{{номер_договора}}}} от {{{{дата_договора}}}}'),
        b('p1', 'paragraph', 'Текст документа', 'Здесь введите содержимое документа...'),
    ]

def handler(event: dict, context) -> dict:
    """Управление шаблонами документов — CRUD."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    payload = get_user(event)
    if not payload:
        return err('Не авторизован', 401)

    user_id = str(payload.get('sub') or payload.get('user_id') or payload.get('id') or '')
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
            blocks = body.get('blocks') or _default_blocks(doc_type)
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