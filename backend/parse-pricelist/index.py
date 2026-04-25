import json
import re
import urllib.request


def parse_price(s: str) -> float:
    """Парсит строку вида '22 810 ₽' → 22810.0"""
    cleaned = re.sub(r'[^\d.,]', '', s.replace('\u202f', '').replace('\xa0', ''))
    cleaned = cleaned.replace(',', '.')
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def fetch_csv(url: str) -> str:
    """Загружает CSV по URL"""
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode('utf-8')


def parse_slotex_csv(csv_text: str) -> list:
    """
    Парсит CSV прайса Slotex/kapso.
    Возвращает список вариантов: {product, size, thickness, unit, price}
    Колонки: Продукт(col3), Формат(col5/6), Толщина(col6/7), Ед.изм(col9), Оптовая(col10)
    """
    results = []
    lines = csv_text.splitlines()

    current_product = None
    header_found = False

    # Определяем структуру по заголовку
    col_product = None
    col_format = None
    col_thickness = None
    col_unit = None
    col_price = None

    for line in lines:
        # Парсим CSV строку вручную (учитываем кавычки)
        cells = []
        in_quotes = False
        cell = ''
        for ch in line:
            if ch == '"':
                in_quotes = not in_quotes
            elif ch == ',' and not in_quotes:
                cells.append(cell.strip())
                cell = ''
            else:
                cell += ch
        cells.append(cell.strip())

        # Ищем заголовок
        if not header_found:
            row_text = ','.join(cells).lower()
            if 'продукт' in row_text and ('формат' in row_text or 'оптовая' in row_text):
                header_found = True
                for i, c in enumerate(cells):
                    cl = c.lower()
                    if 'продукт' in cl:
                        col_product = i
                    elif 'формат' in cl:
                        col_format = i
                    elif 'толщина' in cl:
                        col_thickness = i
                    elif 'ед' in cl and 'изм' in cl:
                        col_unit = i
                    elif 'оптовая' in cl:
                        col_price = i
            continue

        if col_product is None:
            continue

        def get(idx):
            return cells[idx].strip() if idx is not None and idx < len(cells) else ''

        product_cell = get(col_product)
        if product_cell:
            current_product = product_cell

        if not current_product:
            continue

        size = get(col_format)
        thickness_raw = get(col_thickness)
        unit = get(col_unit)
        price_raw = get(col_price)

        if not size or not price_raw:
            continue

        price = parse_price(price_raw)
        if price <= 0:
            continue

        # Парсим толщину (может быть "4,5/10/18" → берём первое значение)
        thickness = None
        if thickness_raw:
            first = re.split(r'[/,]', thickness_raw)[0].strip()
            try:
                thickness = float(first)
            except ValueError:
                pass

        # Нормализуем размер
        size_clean = re.sub(r'\s+', '', size).replace('х', '×').replace('x', '×')
        size_clean = re.sub(r'\.(\d{3})', lambda m: m.group(1), size_clean)  # 4.200 → 4200

        results.append({
            'product': current_product,
            'size': size_clean,
            'thickness': thickness,
            'unit': unit if unit else 'шт',
            'price': price,
        })

    return results


def handler(event: dict, context) -> dict:
    """
    Парсит CSV прайс по ссылке Google Sheets и возвращает список вариантов с ценами.
    POST body: { "url": "https://docs.google.com/..." }
    """
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            'body': '',
        }

    try:
        body = json.loads(event.get('body') or '{}')
        url = body.get('url', '').strip()

        if not url:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'url is required'}),
            }

        # Конвертируем ссылку на просмотр в ссылку на экспорт CSV
        # https://docs.google.com/spreadsheets/d/ID/edit#gid=GID
        # → https://docs.google.com/spreadsheets/d/ID/export?format=csv&gid=GID
        export_url = url
        match_edit = re.search(r'/spreadsheets/d/([^/]+)', url)
        gid_match = re.search(r'gid=(\d+)', url)

        if match_edit:
            sheet_id = match_edit.group(1).split('/')[0]
            gid = gid_match.group(1) if gid_match else '1989291696'
            export_url = f'https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}'

        csv_text = fetch_csv(export_url)
        items = parse_slotex_csv(csv_text)

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'ok': True,
                'items': items,
                'count': len(items),
            }),
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
        }
