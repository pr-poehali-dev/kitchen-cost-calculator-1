import json
import re
import urllib.request

SHEET_ID = '1iUXAMLxwavErr11pwQROnkZX22RAxhiVb1THG_xNwQM'

SERIES = {
    'e1': {'gid': '1989291696', 'name': 'Elga E1'},
    'e2': {'gid': '1539284672', 'name': 'Elga E2'},
    'e3': {'gid': '1324647373', 'name': 'Elga E3'},
    'k3': {'gid': '557309721',  'name': 'kapso K3'},
}


def parse_price(s: str) -> float:
    cleaned = re.sub(r'[^\d.]', '', s.replace(',', '.').replace('\u202f', '').replace('\xa0', '').replace(' ', ''))
    # убираем лишние точки (оставляем только последнюю как десятичную)
    parts = cleaned.split('.')
    if len(parts) > 2:
        cleaned = ''.join(parts[:-1]) + '.' + parts[-1]
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def norm_size(s: str) -> str:
    s = s.strip()
    # заменяем разделители на ×
    s = re.sub(r'\s*[xхх×]\s*', '×', s, flags=re.IGNORECASE)
    # убираем точки-разделители тысяч: 4.200 → 4200
    s = re.sub(r'(\d)\.(\d{3})\b', r'\1\2', s)
    s = re.sub(r'\s+', '', s)
    return s


def fetch_csv(gid: str) -> str:
    url = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={gid}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read().decode('utf-8')


def parse_csv_prices(csv_text: str) -> list:
    results = []
    lines = csv_text.splitlines()
    header_found = False
    col_product = col_format = col_thickness = col_params = col_unit = col_price = None
    current_product = None

    for line in lines:
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

        if not header_found:
            row_lower = ','.join(cells).lower()
            if 'продукт' in row_lower and ('формат' in row_lower or 'оптовая' in row_lower):
                header_found = True
                for i, c in enumerate(cells):
                    cl = c.lower()
                    if 'продукт' in cl and col_product is None:
                        col_product = i
                    elif 'формат' in cl and col_format is None:
                        col_format = i
                    elif 'толщина' in cl and col_thickness is None:
                        col_thickness = i
                    elif 'подгиб' in cl and col_params is None:
                        col_params = i
                    elif 'ед' in cl and col_unit is None:
                        col_unit = i
                    elif 'оптовая' in cl and col_price is None:
                        col_price = i
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
            # "4,5/10/18" → берём все значения, но предпочитаем 10 для стеновых
            parts = re.split(r'[/,]', thickness_raw)
            candidates = []
            for p in parts:
                try:
                    candidates.append(float(p.strip()))
                except ValueError:
                    pass
            if candidates:
                # для стеновых панелей берём 10, иначе первое
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


def handler(event: dict, context) -> dict:
    """
    Загружает и парсит прайс Slotex по серии.
    POST: { "series": "e1"|"e2"|"e3"|"k3" }
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
                'body': json.dumps({'series': SERIES})}

    try:
        body = json.loads(event.get('body') or '{}')
        series_key = body.get('series', '').strip().lower()

        if series_key not in SERIES:
            return {'statusCode': 400, 'headers': hdrs,
                    'body': json.dumps({'error': f'Unknown series. Use: {list(SERIES.keys())}'})}

        gid = SERIES[series_key]['gid']
        csv_text = fetch_csv(gid)
        items = parse_csv_prices(csv_text)

        return {'statusCode': 200, 'headers': hdrs,
                'body': json.dumps({'ok': True, 'series': series_key,
                                    'series_name': SERIES[series_key]['name'],
                                    'count': len(items), 'items': items})}

    except Exception as e:
        return {'statusCode': 500, 'headers': hdrs,
                'body': json.dumps({'error': str(e)})}
