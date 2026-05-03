import json
import os
import logging
import jwt
import psycopg2
from contextlib import contextmanager
from datetime import datetime

logger = logging.getLogger(__name__)
# v3

JWT_SECRET = os.environ['JWT_SECRET']

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


def verify_token(event: dict):
    headers = event.get('headers') or {}
    auth = headers.get('X-Authorization') or headers.get('Authorization') or ''
    token = auth[7:].strip() if auth.startswith('Bearer ') else ''
    if not token:
        return None
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except Exception:
        return None


def make_ok(cors):
    def ok(data, status=200):
        return {'statusCode': status, 'headers': {**cors, 'Content-Type': 'application/json'}, 'body': json.dumps(data, default=str)}
    return ok


def make_err(cors):
    def err(msg, status=400):
        return {'statusCode': status, 'headers': {**cors, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg})}
    return err


def row_to_dict(row, cur):
    return dict(zip([d[0] for d in cur.description], row))


# ── Производители ─────────────────────────────────────────────

def list_manufacturers(conn, user_id):
    cur = conn.cursor()
    cur.execute('SELECT * FROM catalog_manufacturers WHERE user_id = %s ORDER BY name ASC', (user_id,))
    rows = [row_to_dict(r, cur) for r in cur.fetchall()]
    return [_mfr_to_api(r) for r in rows]


def _mfr_to_api(r):
    return {
        'id': r['id'],
        'name': r['name'],
        'contact': r.get('contact') or '',
        'phone': r.get('phone') or '',
        'email': r.get('email') or '',
        'telegram': r.get('telegram') or '',
        'website': r.get('website') or '',
        'note': r.get('note') or '',
        'materialTypeIds': r['material_type_ids'] if isinstance(r['material_type_ids'], list) else json.loads(r['material_type_ids'] or '[]'),
    }


def upsert_manufacturer(conn, user_id, data):
    mid = data.get('id') or f"mfr{int(datetime.utcnow().timestamp()*1000)}"
    type_ids = json.dumps(data.get('materialTypeIds', []))
    cur = conn.cursor()
    cur.execute('''
        INSERT INTO catalog_manufacturers (id, user_id, name, contact, phone, email, telegram, website, note, material_type_ids, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name=EXCLUDED.name, contact=EXCLUDED.contact, phone=EXCLUDED.phone,
          email=EXCLUDED.email, telegram=EXCLUDED.telegram, website=EXCLUDED.website,
          note=EXCLUDED.note, material_type_ids=EXCLUDED.material_type_ids, updated_at=NOW()
    ''', (mid, user_id, data.get('name',''), data.get('contact',''), data.get('phone',''),
          data.get('email',''), data.get('telegram',''), data.get('website',''),
          data.get('note',''), type_ids))
    cur.execute('SELECT * FROM catalog_manufacturers WHERE id = %s', (mid,))
    return _mfr_to_api(row_to_dict(cur.fetchone(), cur))


def delete_manufacturer(conn, user_id, mid):
    cur = conn.cursor()
    cur.execute('DELETE FROM catalog_manufacturers WHERE id = %s AND user_id = %s', (mid, user_id))
    return cur.rowcount > 0


# ── Поставщики ────────────────────────────────────────────────

def list_vendors(conn, user_id):
    cur = conn.cursor()
    cur.execute('SELECT * FROM catalog_vendors WHERE user_id = %s ORDER BY name ASC', (user_id,))
    rows = [row_to_dict(r, cur) for r in cur.fetchall()]
    return [_vendor_to_api(r) for r in rows]


def _vendor_to_api(r):
    return {
        'id': r['id'],
        'name': r['name'],
        'contact': r.get('contact') or '',
        'phone': r.get('phone') or '',
        'email': r.get('email') or '',
        'telegram': r.get('telegram') or '',
        'website': r.get('website') or '',
        'note': r.get('note') or '',
        'materialTypeIds': r['material_type_ids'] if isinstance(r['material_type_ids'], list) else json.loads(r['material_type_ids'] or '[]'),
        'deliveryDays': r.get('delivery_days'),
        'minOrderAmount': float(r['min_order_amount']) if r.get('min_order_amount') is not None else None,
        'deliverySchedule': r.get('delivery_schedule') or '',
    }


def upsert_vendor(conn, user_id, data):
    vid = data.get('id') or f"v{int(datetime.utcnow().timestamp()*1000)}"
    type_ids = json.dumps(data.get('materialTypeIds', []))
    cur = conn.cursor()
    cur.execute('''
        INSERT INTO catalog_vendors (id, user_id, name, contact, phone, email, telegram, website, note,
          material_type_ids, delivery_days, min_order_amount, delivery_schedule, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name=EXCLUDED.name, contact=EXCLUDED.contact, phone=EXCLUDED.phone,
          email=EXCLUDED.email, telegram=EXCLUDED.telegram, website=EXCLUDED.website,
          note=EXCLUDED.note, material_type_ids=EXCLUDED.material_type_ids,
          delivery_days=EXCLUDED.delivery_days, min_order_amount=EXCLUDED.min_order_amount,
          delivery_schedule=EXCLUDED.delivery_schedule, updated_at=NOW()
    ''', (vid, user_id, data.get('name',''), data.get('contact',''), data.get('phone',''),
          data.get('email',''), data.get('telegram',''), data.get('website',''),
          data.get('note',''), type_ids,
          data.get('deliveryDays'), data.get('minOrderAmount'), data.get('deliverySchedule','')))
    cur.execute('SELECT * FROM catalog_vendors WHERE id = %s', (vid,))
    return _vendor_to_api(row_to_dict(cur.fetchone(), cur))


def delete_vendor(conn, user_id, vid):
    cur = conn.cursor()
    cur.execute('DELETE FROM catalog_vendors WHERE id = %s AND user_id = %s', (vid, user_id))
    return cur.rowcount > 0


# ── Материалы ─────────────────────────────────────────────────

def list_materials(conn, user_id):
    cur = conn.cursor()
    cur.execute('SELECT * FROM catalog_materials WHERE user_id = %s ORDER BY name ASC', (user_id,))
    rows = [row_to_dict(r, cur) for r in cur.fetchall()]
    return [_mat_to_api(r) for r in rows]


def _mat_to_api(r):
    def load_json(v):
        if isinstance(v, (list, dict)):
            return v
        try:
            return json.loads(v or '[]')
        except Exception:
            return []

    return {
        'id': r['id'],
        'manufacturerId': r['manufacturer_id'],
        'vendorId': r.get('vendor_id') or None,
        'name': r['name'],
        'typeId': r['type_id'],
        'categoryId': r.get('category_id') or None,
        'thickness': float(r['thickness']) if r.get('thickness') is not None else None,
        'color': r.get('color') or None,
        'article': r.get('article') or None,
        'unit': r['unit'],
        'basePrice': float(r['base_price']),
        'variants': load_json(r.get('variants')),
        'archived': r.get('archived', False),
        'priceUpdatedAt': r.get('price_updated_at') or None,
        'priceHistory': load_json(r.get('price_history')),
    }


def upsert_material(conn, user_id, data):
    mid = data.get('id') or f"m{int(datetime.utcnow().timestamp()*1000)}"
    variants = json.dumps(data.get('variants', []))
    price_history = json.dumps(data.get('priceHistory', []))
    cur = conn.cursor()
    cur.execute('''
        INSERT INTO catalog_materials (id, user_id, manufacturer_id, vendor_id, name, type_id,
          category_id, thickness, color, article, unit, base_price, variants, archived,
          price_updated_at, price_history, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT (id) DO UPDATE SET
          manufacturer_id=EXCLUDED.manufacturer_id, vendor_id=EXCLUDED.vendor_id,
          name=EXCLUDED.name, type_id=EXCLUDED.type_id, category_id=EXCLUDED.category_id,
          thickness=EXCLUDED.thickness, color=EXCLUDED.color, article=EXCLUDED.article,
          unit=EXCLUDED.unit, base_price=EXCLUDED.base_price, variants=EXCLUDED.variants,
          archived=EXCLUDED.archived, price_updated_at=EXCLUDED.price_updated_at,
          price_history=EXCLUDED.price_history, updated_at=NOW()
    ''', (mid, user_id,
          data.get('manufacturerId',''), data.get('vendorId') or None,
          data.get('name',''), data.get('typeId',''),
          data.get('categoryId') or None,
          data.get('thickness') or None, data.get('color') or None,
          data.get('article') or None, data.get('unit','шт'),
          data.get('basePrice', 0), variants,
          data.get('archived', False),
          data.get('priceUpdatedAt') or None, price_history))
    cur.execute('SELECT * FROM catalog_materials WHERE id = %s', (mid,))
    return _mat_to_api(row_to_dict(cur.fetchone(), cur))


def delete_material(conn, user_id, mid):
    cur = conn.cursor()
    cur.execute('DELETE FROM catalog_materials WHERE id = %s AND user_id = %s', (mid, user_id))
    return cur.rowcount > 0


def bulk_upsert_materials(conn, user_id, materials: list):
    results = []
    for data in materials:
        results.append(upsert_material(conn, user_id, data))
    return results


def bulk_delete_by_article_prefix(conn, user_id, prefix: str):
    cur = conn.cursor()
    cur.execute("DELETE FROM catalog_materials WHERE user_id = %s AND article LIKE %s", (user_id, f"{prefix}%"))
    return cur.rowcount


def update_prices_batch(conn, user_id, updates: list):
    count = 0
    today = datetime.utcnow().strftime('%Y-%m-%d')
    cur = conn.cursor()
    for upd in updates:
        mat_id = upd.get('materialId')
        article = upd.get('article')
        variants_upd = upd.get('variants', [])

        if mat_id:
            cur.execute('SELECT * FROM catalog_materials WHERE id = %s AND user_id = %s', (mat_id, user_id))
        elif article:
            cur.execute('SELECT * FROM catalog_materials WHERE article = %s AND user_id = %s', (article, user_id))
        else:
            continue

        row = cur.fetchone()
        if not row:
            continue
        mat = _mat_to_api(row_to_dict(row, cur))

        existing_variants = mat.get('variants', [])
        for v in existing_variants:
            vu = next((x for x in variants_upd if x['variantId'] == v['id']), None)
            if vu:
                v['basePrice'] = vu['basePrice']
                if 'size' in vu:
                    v['size'] = vu['size']
                if 'thickness' in vu:
                    v['thickness'] = vu['thickness']

        new_base = existing_variants[0]['basePrice'] if existing_variants else mat['basePrice']
        old_base = mat['basePrice']
        history = mat.get('priceHistory', [])
        if new_base != old_base:
            history = [{'date': today, 'price': old_base}] + history[:19]

        cur.execute('''
            UPDATE catalog_materials SET variants=%s, base_price=%s, price_history=%s,
              price_updated_at=%s, updated_at=NOW()
            WHERE id=%s AND user_id=%s
        ''', (json.dumps(existing_variants), new_base, json.dumps(history), today, mat['id'], user_id))
        count += 1

    return count


def bulk_delete_materials(conn, user_id: int, ids: list) -> int:
    if not ids:
        return 0
    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    cur = conn.cursor()
    placeholders = ','.join(['%s'] * len(ids))
    cur.execute(
        f'DELETE FROM {schema}.catalog_materials WHERE user_id = %s AND id IN ({placeholders})',
        [user_id] + ids
    )
    return cur.rowcount


# ── Handler ───────────────────────────────────────────────────

def handler(event: dict, context) -> dict:
    """
    Каталог: производители, поставщики, материалы.
    GET  ?action=all                              — всё сразу (manufacturers+vendors+materials)
    GET  ?entity=manufacturers|vendors|materials  — список одного типа
    POST ?action=upsert_manufacturer              — создать/обновить производителя
    POST ?action=delete_manufacturer&id=...       — удалить производителя
    POST ?action=upsert_vendor                    — создать/обновить поставщика
    POST ?action=delete_vendor&id=...             — удалить поставщика
    POST ?action=upsert_material                  — создать/обновить материал
    POST ?action=delete_material&id=...           — удалить материал
    POST ?action=bulk_upsert_materials            — пакетная загрузка материалов (импорт)
    POST ?action=update_prices_batch              — пакетное обновление цен
    POST ?action=bulk_delete_materials            — удалить массив материалов по списку id
    POST ?action=bulk_delete_by_article_prefix    — удалить материалы по префиксу артикула
    POST ?action=sync_all                         — синхронизировать весь каталог из AppState (миграция)
    """
    cors = get_cors(event)
    ok = make_ok(cors)
    err = make_err(cors)

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    payload = verify_token(event)
    if not payload:
        return err('Не авторизован', 401)

    user_id = int(payload.get('user_id') or payload.get('id') or payload.get('sub') or 0)
    if not user_id:
        return err('Нет user_id в токене', 401)

    qs = event.get('queryStringParameters') or {}
    method = event.get('httpMethod', 'GET')
    action = qs.get('action', '')
    entity = qs.get('entity', '')

    # ── GET all ──────────────────────────────────────────────
    if method == 'GET' and action == 'all':
        with get_db() as conn:
            manufacturers = list_manufacturers(conn, user_id)
            vendors = list_vendors(conn, user_id)
            materials = list_materials(conn, user_id)
        return ok({'manufacturers': manufacturers, 'vendors': vendors, 'materials': materials})

    # ── GET entity ───────────────────────────────────────────
    if method == 'GET' and entity:
        with get_db() as conn:
            if entity == 'manufacturers':
                return ok({'manufacturers': list_manufacturers(conn, user_id)})
            if entity == 'vendors':
                return ok({'vendors': list_vendors(conn, user_id)})
            if entity == 'materials':
                return ok({'materials': list_materials(conn, user_id)})
        return err('Неизвестный entity', 400)

    # ── POST actions ─────────────────────────────────────────
    if method == 'POST':
        body_raw = event.get('body') or ''
        try:
            body = json.loads(body_raw) if body_raw else {}
        except Exception:
            return err('Невалидный JSON')

        with get_db() as conn:

            if action == 'upsert_manufacturer':
                data = body.get('manufacturer') or body
                result = upsert_manufacturer(conn, user_id, data)
                return ok({'manufacturer': result})

            if action == 'delete_manufacturer':
                mid = qs.get('id') or body.get('id')
                if not mid:
                    return err('Нет id')
                return ok({'ok': delete_manufacturer(conn, user_id, mid)})

            if action == 'upsert_vendor':
                data = body.get('vendor') or body
                result = upsert_vendor(conn, user_id, data)
                return ok({'vendor': result})

            if action == 'delete_vendor':
                vid = qs.get('id') or body.get('id')
                if not vid:
                    return err('Нет id')
                return ok({'ok': delete_vendor(conn, user_id, vid)})

            if action == 'upsert_material':
                data = body.get('material') or body
                result = upsert_material(conn, user_id, data)
                return ok({'material': result})

            if action == 'delete_material':
                mid = qs.get('id') or body.get('id')
                if not mid:
                    return err('Нет id')
                return ok({'ok': delete_material(conn, user_id, mid)})

            if action == 'bulk_delete_materials':
                ids = body.get('ids', [])
                if not ids:
                    return err('Нет ids')
                count = bulk_delete_materials(conn, user_id, ids)
                return ok({'deleted': count})

            if action == 'bulk_upsert_materials':
                materials = body.get('materials', [])
                if not materials:
                    return err('Нет materials')
                results = bulk_upsert_materials(conn, user_id, materials)
                return ok({'created': len(results)})

            if action == 'update_prices_batch':
                updates = body.get('updates', [])
                count = update_prices_batch(conn, user_id, updates)
                return ok({'updated': count})

            if action == 'bulk_delete_by_article_prefix':
                prefix = body.get('prefix') or qs.get('prefix', '')
                if not prefix:
                    return err('Нет prefix')
                count = bulk_delete_by_article_prefix(conn, user_id, prefix)
                return ok({'deleted': count})

            if action == 'sync_all':
                manufacturers_data = body.get('manufacturers', [])
                vendors_data = body.get('vendors', [])
                materials_data = body.get('materials', [])
                for m in manufacturers_data:
                    upsert_manufacturer(conn, user_id, m)
                for v in vendors_data:
                    upsert_vendor(conn, user_id, v)
                for mat in materials_data:
                    upsert_material(conn, user_id, mat)
                return ok({
                    'ok': True,
                    'manufacturers': len(manufacturers_data),
                    'vendors': len(vendors_data),
                    'materials': len(materials_data),
                })

        return err('Неизвестный action', 400)

    return err('Not found', 404)