import json
import re
import urllib.request

# ─── Slotex ───────────────────────────────────────────────────────────────────
SLOTEX_SHEET_ID = '1iUXAMLxwavErr11pwQROnkZX22RAxhiVb1THG_xNwQM'
SLOTEX_SERIES = {
    'e1': {'gid': '1989291696', 'name': 'Elga E1'},
    'e2': {'gid': '1539284672', 'name': 'Elga E2'},
    'e3': {'gid': '1324647373', 'name': 'Elga E3'},
    'k3': {'gid': '557309721',  'name': 'kapso K3'},
}

# ─── СКАТ ─────────────────────────────────────────────────────────────────────
SKAT_SHEET_ID = '1O9WjIlUzQ4czzWIwVVlM5G77rn-MgAgLh4tgsbXi6Hs'
SKAT_GID      = '1829594300'
SKAT_CATEGORIES = ['1 кат', '2 кат', '3 кат', '4 кат', '5 кат']

# ─── BOYARD ───────────────────────────────────────────────────────────────────
BOYARD_SHEET_ID = '1RF3LtsvI51OI8rApV5tksnr4Ne-l1AHHSAeZ0rlQlUc'
BOYARD_GID      = '1875668796'

# Ключевые слова верхнего уровня → тип материала
BOYARD_ROOT_TYPES = {
    'крючки':        'mt10',
    'петли':         'mt10',
    'ручки':         'mt10',
    'направляющие':  'mt10',
    'газовые':       'mt10',
    'корзины':       'mt10',
    'навесы':        'mt10',
    'колеса':        'mt10',
    'полкодержател': 'mt10',
    'стяжки':        'mt10',
    'замки':         'mt10',
    'подъём':        'mt10',
    'аксессуар':     'mt10',
    'рейлинг':       'mt11',
    'профил':        'mt11',
    'кромка':        'mt12',
}

def boyard_type(name: str) -> str:
    low = name.lower()
    for kw, tid in BOYARD_ROOT_TYPES.items():
        if kw in low:
            return tid
    return 'mt10'

# Признаки корневой категории (верхний уровень иерархии)
BOYARD_ROOT_HINTS = [
    'крючки', 'петли мебельные', 'направляющие', 'стяжки', 'замки',
    'ручки', 'газовые', 'корзины', 'навесы', 'кухонные', 'колеса',
    'полкодержател', 'аксессуар', 'рейлинг', 'профил', 'кромка',
    'лифт',
]

def boyard_is_root(name: str) -> bool:
    low = name.lower()
    return any(h in low for h in BOYARD_ROOT_HINTS)


def parse_price(s: str) -> float:
    cleaned = re.sub(r'[^\d.]', '', s.replace(',', '.').replace('\u202f', '').replace('\xa0', '').replace(' ', ''))
    parts = cleaned.split('.')
    if len(parts) > 2:
        cleaned = ''.join(parts[:-1]) + '.' + parts[-1]
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def norm_size(s: str) -> str:
    s = s.strip()
    s = re.sub(r'\s*[xхх×]\s*', '×', s, flags=re.IGNORECASE)
    s = re.sub(r'(\d)\.(\d{3})\b', r'\1\2', s)
    s = re.sub(r'\s+', '', s)
    return s


def fetch_csv(sheet_id: str, gid: str) -> str:
    url = f'https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read().decode('utf-8')


def split_csv_line(line: str) -> list:
    cells, in_q, cell = [], False, ''
    for ch in line:
        if ch == '"':
            in_q = not in_q
        elif ch == ',' and not in_q:
            cells.append(cell.strip())
            cell = ''
        else:
            cell += ch
    cells.append(cell.strip())
    return cells


# ─── Парсер Slotex ────────────────────────────────────────────────────────────
def parse_slotex(csv_text: str) -> list:
    results = []
    lines = csv_text.splitlines()
    header_found = False
    col_product = col_format = col_thickness = col_params = col_unit = col_price = None
    current_product = None

    for line in lines:
        cells = split_csv_line(line)

        if not header_found:
            row_lower = ','.join(cells).lower()
            if 'продукт' in row_lower and ('формат' in row_lower or 'оптовая' in row_lower):
                header_found = True
                for i, c in enumerate(cells):
                    cl = c.lower()
                    if 'продукт' in cl and col_product is None:      col_product = i
                    elif 'формат' in cl and col_format is None:      col_format = i
                    elif 'толщина' in cl and col_thickness is None:  col_thickness = i
                    elif 'подгиб' in cl and col_params is None:      col_params = i
                    elif 'ед' in cl and col_unit is None:            col_unit = i
                    elif 'оптовая' in cl and col_price is None:      col_price = i
            continue

        def g(idx):
            return cells[idx].strip() if idx is not None and idx < len(cells) else ''

        product_cell = g(col_product)
        if product_cell and not product_cell.startswith('*'):
            current_product = product_cell

        if not current_product:
            continue

        size_raw = g(col_format)
        thickness_raw = g(col_thickness)
        params_raw = g(col_params)
        unit_raw = g(col_unit)
        price_raw = g(col_price)

        if not size_raw or not price_raw:
            continue

        price = parse_price(price_raw)
        if price <= 0:
            continue

        size = norm_size(size_raw)
        if not re.search(r'\d×\d', size):
            continue

        thickness = None
        if thickness_raw:
            parts = re.split(r'[/,]', thickness_raw)
            candidates = []
            for p in parts:
                try:
                    candidates.append(float(p.strip()))
                except ValueError:
                    pass
            if candidates:
                thickness = 10.0 if 10.0 in candidates else candidates[0]

        results.append({
            'product': current_product,
            'size': size,
            'thickness': thickness,
            'params': params_raw,
            'unit': re.sub(r'[.\s]', '', unit_raw) if unit_raw else 'шт',
            'price': price,
        })

    return results


# ─── Парсер СКАТ ──────────────────────────────────────────────────────────────
def parse_skat_all(csv_text: str) -> list:
    """
    Парсит прайс СКАТ, возвращает все 5 категорий цен сразу.
    Каждая запись содержит prices: {'1 кат': X, '2 кат': Y, ...}
    item_type: 'facade' (м²) или 'decor' (пм/шт)
    """
    results = []
    lines = csv_text.splitlines()

    cat_indices = {}   # '1 кат' -> col_index
    thickness_section = ''
    subsection = ''
    header_found = False
    in_decor = False   # флаг — находимся в секции «Декоративные элементы»

    for line in lines:
        cells = split_csv_line(line)
        if not cells:
            continue

        # Строка-заголовок категорий
        if any(c.strip() == '1 кат' for c in cells):
            header_found = True
            for i, c in enumerate(cells):
                if c.strip() in SKAT_CATEGORIES:
                    cat_indices[c.strip()] = i
            continue

        if not header_found:
            continue

        def g(i):
            return cells[i].strip() if i < len(cells) else ''

        col0 = g(0)
        col2 = g(2)

        if not col0:
            continue

        # Секция «Декоративные элементы»
        if 'декоративн' in col0.lower() and col2 == '':
            in_decor = True
            thickness_section = 'Декоративные элементы'
            subsection = ''
            continue

        # Секция толщины МДФ/ДСП сбрасывает флаг декора
        if col2 == '' and all(g(i) == '' for i in range(3, 8)):
            if re.search(r'(МДФ|ДСП|фанер|ЛДСП)', col0, re.IGNORECASE):
                in_decor = False
                thickness_section = col0.strip()
                subsection = ''
                continue

        # Подсекция (серия фрезеровки или декора)
        if col2 == '' and all(g(i) == '' for i in range(3, 8)):
            subsection = col0.strip()
            continue

        # Строка с ценами — фасады (м²)
        if not in_decor and col2 in ('м²', 'м2', 'мм²', 'кв.м.', 'кв.м'):
            prices = {}
            for cat, idx in cat_indices.items():
                p = parse_price(g(idx))
                if p > 0:
                    prices[cat] = p
            if not prices:
                continue
            thickness = None
            m = re.search(r'(\d+)\s*[мМmM][мМmM]', thickness_section)
            if m:
                try:
                    thickness = float(m.group(1))
                except ValueError:
                    pass
            results.append({
                'item_type': 'facade',
                'thickness_section': thickness_section,
                'subsection': subsection,
                'facade_type': col0,
                'unit': 'м²',
                'thickness': thickness,
                'prices': prices,
            })

        # Строка с ценами — декоративные элементы (пм, шт)
        elif in_decor and col2 in ('пм', 'п.м', 'п.м.', 'шт', 'шт.', 'пог.м', 'пог.м.'):
            prices = {}
            for cat, idx in cat_indices.items():
                p = parse_price(g(idx))
                if p > 0:
                    prices[cat] = p
            if not prices:
                continue
            unit = 'пм' if col2 in ('пм', 'п.м', 'п.м.', 'пог.м', 'пог.м.') else 'шт'
            results.append({
                'item_type': 'decor',
                'thickness_section': 'Декоративные элементы',
                'subsection': subsection,
                'facade_type': col0,
                'unit': unit,
                'thickness': None,
                'prices': prices,
            })

    return results


def parse_skat(csv_text: str, category: str = '1 кат') -> list:
    """Обратная совместимость — возвращает позиции одной категории."""
    all_items = parse_skat_all(csv_text)
    result = []
    for item in all_items:
        price = item['prices'].get(category, 0)
        if price > 0:
            result.append({
                'name': f"{item['thickness_section']} / {item['subsection']} / {item['facade_type']}".replace(' /  / ', ' / '),
                'thickness_section': item['thickness_section'],
                'subsection': item['subsection'],
                'facade_type': item['facade_type'],
                'unit': item['unit'],
                'thickness': item['thickness'],
                'price': price,
                'category': category,
            })
    return result


# ─── Парсер BOYARD ────────────────────────────────────────────────────────────
def parse_boyard(csv_text: str) -> dict:
    """
    Парсит прайс BOYARD. Розница в рублях (col index 5).
    Иерархия: корневая категория (Крючки, Петли...) → подкатегории.
    category = самая конкретная подсекция, type_id = от корневой.
    """
    lines = csv_text.splitlines()
    rate = 0.0
    items = []
    root_category = ''
    current_category = ''
    header_passed = False

    for raw_line in lines:
        cells = split_csv_line(raw_line)

        # Курс из первой строки (число 50..200)
        if not header_passed and rate == 0.0:
            for cell in cells:
                v = parse_price(cell)
                if 50 < v < 200:
                    rate = v
                    break

        def g(i):
            return cells[i].strip() if i < len(cells) else ''

        col0 = g(0)
        col1 = g(1)

        if not col0 and not col1:
            continue

        low1 = col1.lower()
        low0 = col0.lower()

        # Пропускаем служебные строки
        if 'поиск' in low1 or 'поиск' in low0:
            continue
        if 'курс' in low1:
            header_passed = True
            continue
        if 'опт' in low1 or 'розница' in low1:
            header_passed = True
            continue

        header_passed = True

        # Строка-секция: col0 пустой, col1 = название
        if not col0 and col1:
            name = col1.strip()
            # Пропускаем "Комплектующие BOYARD" — это просто шапка
            if 'boyard' in name.lower() and len(name) < 35 and not any(c.isdigit() for c in name):
                continue
            current_category = name
            if boyard_is_root(name):
                root_category = name
            continue

        # Строка товара
        if col0 and col1:
            price = parse_price(g(5))   # розница руб
            if price <= 0:
                price = parse_price(g(3))  # опт руб запасной
            if price <= 0:
                continue

            cat = current_category or root_category
            type_cat = root_category or current_category

            items.append({
                'article': col0,
                'name': col1,
                'category': cat,
                'type_id': boyard_type(type_cat),
                'price_retail': round(price, 2),
                'unit': 'шт',
            })

    return {'rate': round(rate, 4), 'items': items}


# ─── Handler ──────────────────────────────────────────────────────────────────
def handler(event: dict, context) -> dict:
    """
    Загружает и парсит прайсы поставщиков.
    Slotex: POST { "series": "e1"|"e2"|"e3"|"k3" }
    СКАТ:   POST { "series": "skat", "category": "1 кат"|...|"5 кат" }
    GET: возвращает список доступных серий
    """
    cors = {'Access-Control-Allow-Origin': '*'}

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**cors,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'}, 'body': ''}

    hdrs = {**cors, 'Content-Type': 'application/json'}

    if event.get('httpMethod') == 'GET':
        return {'statusCode': 200, 'headers': hdrs,
                'body': json.dumps({
                    'series': SLOTEX_SERIES,
                    'skat_categories': SKAT_CATEGORIES,
                })}

    try:
        body = json.loads(event.get('body') or '{}')
        series_key = body.get('series', '').strip().lower()

        # ── СКАТ all categories ──
        if series_key == 'skat_all':
            csv_text = fetch_csv(SKAT_SHEET_ID, SKAT_GID)
            items = parse_skat_all(csv_text)
            return {'statusCode': 200, 'headers': hdrs,
                    'body': json.dumps({'ok': True, 'series': 'skat_all',
                                        'count': len(items), 'items': items})}

        # ── СКАТ одна категория ──
        if series_key == 'skat':
            category = body.get('category', '1 кат').strip()
            if category not in SKAT_CATEGORIES:
                return {'statusCode': 400, 'headers': hdrs,
                        'body': json.dumps({'error': f'Неизвестная категория. Доступны: {SKAT_CATEGORIES}'})}
            csv_text = fetch_csv(SKAT_SHEET_ID, SKAT_GID)
            items = parse_skat(csv_text, category)
            return {'statusCode': 200, 'headers': hdrs,
                    'body': json.dumps({'ok': True, 'series': 'skat',
                                        'series_name': f'СКАТ ({category})',
                                        'category': category,
                                        'count': len(items), 'items': items})}

        # ── BOYARD ──
        if series_key == 'boyard':
            csv_text = fetch_csv(BOYARD_SHEET_ID, BOYARD_GID)
            result = parse_boyard(csv_text)
            return {'statusCode': 200, 'headers': hdrs,
                    'body': json.dumps({'ok': True, 'series': 'boyard',
                                        'rate': result['rate'],
                                        'count': len(result['items']),
                                        'items': result['items']})}

        # ── Slotex ──
        if series_key not in SLOTEX_SERIES:
            return {'statusCode': 400, 'headers': hdrs,
                    'body': json.dumps({'ok': False, 'error': f'Unknown series. Use: {list(SLOTEX_SERIES.keys())} or skat'})}

        gid = SLOTEX_SERIES[series_key]['gid']
        csv_text = fetch_csv(SLOTEX_SHEET_ID, gid)
        items = parse_slotex(csv_text)

        return {'statusCode': 200, 'headers': hdrs,
                'body': json.dumps({'ok': True, 'series': series_key,
                                    'series_name': SLOTEX_SERIES[series_key]['name'],
                                    'count': len(items), 'items': items})}

    except Exception as e:
        return {'statusCode': 500, 'headers': hdrs,
                'body': json.dumps({'error': str(e)})}