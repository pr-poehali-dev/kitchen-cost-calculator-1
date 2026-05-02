"""
Генератор документов DOCX.
Каждый тип документа — отдельная функция с чистой вёрсткой.
PDF — через HTML + window.print() на фронтенде.
"""
import json, os, base64, logging
import jwt, psycopg2, boto3
from contextlib import contextmanager
from datetime import datetime
from io import BytesIO

logger = logging.getLogger(__name__)

JWT_SECRET = os.environ['JWT_SECRET']
S3_KEY     = os.environ.get('AWS_ACCESS_KEY_ID', '')
S3_SECRET  = os.environ.get('AWS_SECRET_ACCESS_KEY', '')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
}

# ── helpers ───────────────────────────────────────────────────────────────────

@contextmanager
def get_db():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        yield conn; conn.commit()
    except Exception:
        conn.rollback(); raise
    finally:
        conn.close()

def verify_token(event):
    h = event.get('headers') or {}
    auth = h.get('X-Authorization') or h.get('Authorization') or ''
    token = auth[7:].strip() if auth.startswith('Bearer ') else ''
    if not token: return None
    try: return jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except: return None

def ok(data, status=200):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, default=str)}

def err(msg, status=400):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg})}

def fmt_date(d):
    if not d: return '___________'
    try: return datetime.strptime(str(d)[:10], '%Y-%m-%d').strftime('%d.%m.%Y')
    except: return str(d)

def fmt_date_full(d):
    months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
    if not d: return '«___» ___________ ______ г.'
    try:
        dt = datetime.strptime(str(d)[:10], '%Y-%m-%d')
        return f'«{dt.day:02d}» {months[dt.month-1]} {dt.year} г.'
    except: return str(d)

def full_name(c):
    return ' '.join(filter(None, [c.get('last_name',''), c.get('first_name',''), c.get('middle_name','')])).strip() or '___________'

def delivery_addr(c):
    parts = [c.get('delivery_city',''), c.get('delivery_street',''), c.get('delivery_house','')]
    apt = c.get('delivery_apt','')
    if apt: parts.append(f'кв. {apt}')
    return ', '.join(p for p in parts if p) or '___________'

def get_company(user_id):
    try:
        import psycopg2
        schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(f'SELECT settings FROM {schema}.app_state WHERE user_id = %s LIMIT 1', (user_id,))
            row = cur.fetchone()
            if row and row[0]:
                s = row[0] if isinstance(row[0], dict) else json.loads(row[0])
                co = s.get('company') or {}
                return co
    except: pass
    return {}

def co(company, key, default=''):
    return str(company.get(key) or '').strip() or default

def num_to_words(n):
    n = int(round(float(n or 0)))
    if n == 0: return 'ноль рублей'
    ones = ['','один','два','три','четыре','пять','шесть','семь','восемь','девять','десять','одиннадцать','двенадцать','тринадцать','четырнадцать','пятнадцать','шестнадцать','семнадцать','восемнадцать','девятнадцать']
    ones_f = ['','одна','две','три','четыре','пять','шесть','семь','восемь','девять','десять','одиннадцать','двенадцать','тринадцать','четырнадцать','пятнадцать','шестнадцать','семнадцать','восемнадцать','девятнадцать']
    tens = ['','','двадцать','тридцать','сорок','пятьдесят','шестьдесят','семьдесят','восемьдесят','девяносто']
    hundreds = ['','сто','двести','триста','четыреста','пятьсот','шестьсот','семьсот','восемьсот','девятьсот']
    def chunk(num, fem=False):
        parts=[]
        h=num//100; t=(num%100)//10; o=num%10
        if h: parts.append(hundreds[h])
        if t==1: parts.append((ones_f if fem else ones)[num%100])
        else:
            if t: parts.append(tens[t])
            if o: parts.append((ones_f if fem else ones)[o])
        return parts
    result=[]; millions=n//1_000_000; thousands=(n%1_000_000)//1_000; remainder=n%1_000
    if millions:
        p=chunk(millions); o2=millions%10; t2=(millions%100)//10
        s='миллионов' if (t2==1 or o2==0 or o2>=5) else ('миллион' if o2==1 else 'миллиона')
        result.extend(p); result.append(s)
    if thousands:
        p=chunk(thousands,True); o2=thousands%10; t2=(thousands%100)//10
        s='тысяч' if (t2==1 or o2==0 or o2>=5) else ('тысяча' if o2==1 else 'тысячи')
        result.extend(p); result.append(s)
    if remainder: result.extend(chunk(remainder))
    o2=n%10; t2=(n%100)//10
    rub='рублей' if (t2==1 or o2==0 or o2>=5) else ('рубль' if o2==1 else 'рубля')
    return ' '.join(result)+' '+rub

def passport_str(c):
    s=c.get('passport_series',''); n=c.get('passport_number','')
    if s and n: return f'{s} {n}'
    if n: return n
    return '___________'

def get_products(c):
    p = c.get('products')
    if not p: return []
    if isinstance(p, str):
        try: p = json.loads(p)
        except: return []
    if isinstance(p, list): return [x for x in p if x.get('name','').strip()]
    return []

# ── DOCX builder ─────────────────────────────────────────────────────────────

def build_docx(c: dict, doc_type: str, company: dict) -> bytes:
    from docx import Document
    from docx.shared import Pt, Mm, Cm
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.enum.table import WD_TABLE_ALIGNMENT

    # Данные компании
    co_name    = co(company,'name','ООО «Интерьерные решения»')
    co_city    = co(company,'city','Саратов')
    co_inn     = co(company,'inn','6450106826')
    co_ogrn    = co(company,'ogrn','1196451012251')
    co_kpp     = co(company,'kpp','')
    co_addr    = co(company,'address','410018, г. Саратов, ул. Усть-Курдюмская, д. 3, пом. 1')
    co_bank    = co(company,'bank','')
    co_bik     = co(company,'bik','')
    co_rs      = co(company,'rs','')

    # Данные клиента
    fname          = full_name(c)
    contract_num   = c.get('contract_number') or '___'
    contract_date  = fmt_date_full(c.get('contract_date') or '')
    total          = float(c.get('total_amount') or 0)
    total_words    = num_to_words(total)
    prod_days      = int(c.get('production_days') or 45)
    prepaid        = float(c.get('prepaid_amount') or 0)
    balance        = float(c.get('balance_due') or 0) or max(0.0, total - prepaid)
    ptype          = c.get('payment_type','100% предоплата')
    manager        = (c.get('manager_name') or '').strip()
    manager_line   = manager or ('_' * 30)
    daddr          = delivery_addr(c)
    delivery_date  = fmt_date(c.get('delivery_date') or '')
    delivery_cost  = float(c.get('delivery_cost') or 0)
    assembly_cost  = float(c.get('assembly_cost') or 0)
    assembly_days  = int(c.get('assembly_days') or prod_days)
    products       = get_products(c)

    # ── Создаём документ ─────────────────────────────────────────────────────
    doc = Document()
    sec = doc.sections[0]
    sec.page_width  = Mm(210); sec.page_height = Mm(297)
    sec.left_margin = Mm(20);  sec.right_margin  = Mm(15)
    sec.top_margin  = Mm(15);  sec.bottom_margin = Mm(15)

    style = doc.styles['Normal']
    style.font.name = 'Times New Roman'
    style.font.size = Pt(11)
    style.paragraph_format.line_spacing = Pt(14)
    style.paragraph_format.space_after  = Pt(0)
    style.paragraph_format.alignment    = WD_ALIGN_PARAGRAPH.JUSTIFY

    # ── Вспомогательные функции ───────────────────────────────────────────────
    def font(run, size=11, bold=False):
        run.font.name = 'Times New Roman'
        run.font.size = Pt(size)
        run.bold = bold

    def heading(text, size=13):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after  = Pt(4)
        r = p.add_run(text.upper()); font(r, size, bold=True)
        return p

    def subheading(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after  = Pt(8)
        r = p.add_run(text); font(r, 11)
        return p

    def section(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after  = Pt(2)
        r = p.add_run(text); font(r, 11, bold=True)
        p.paragraph_format.keep_with_next = True
        return p

    def para(text, indent=True, size=11, bold=False, italic=False):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after  = Pt(2)
        p.paragraph_format.line_spacing = Pt(14)
        if indent: p.paragraph_format.first_line_indent = Mm(10)
        r = p.add_run(text); font(r, size, bold)
        r.italic = italic
        return p

    def city_date(city, date_str):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after  = Pt(6)
        from docx.oxml.ns import qn; from docx.oxml import OxmlElement
        # Город слева, дата справа через табуляцию
        r1 = p.add_run(f'г. {city}'); font(r1, 11)
        p.add_run('\t\t\t\t\t')
        r2 = p.add_run(date_str); font(r2, 11)
        return p

    def right_para(text, size=11):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after  = Pt(2)
        r = p.add_run(text); font(r, size)
        return p

    def fill_cell(cell, text, bold=False, center=False, size=11):
        """Заполняет ячейку — каждая строка через \\n = отдельный параграф."""
        lines = str(text).split('\n')
        for i, line in enumerate(lines):
            p = cell.paragraphs[0] if i == 0 else cell.add_paragraph()
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after  = Pt(1)
            p.paragraph_format.line_spacing = Pt(13)
            if center: p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = p.add_run(line); font(r, size, bold)

    def sig_table(left_header, left_body, right_header, right_body):
        """Таблица подписей: 2 колонки, заголовок жирный по центру, тело обычное."""
        # keep_with_next чтобы не отрываться от предыдущего текста
        anchor = doc.add_paragraph()
        anchor.paragraph_format.keep_with_next = True
        anchor.paragraph_format.space_before   = Pt(6)
        anchor.paragraph_format.space_after    = Pt(0)

        t = doc.add_table(rows=2, cols=2)
        t.style = 'Table Grid'
        # Заголовки
        fill_cell(t.cell(0,0), left_header,  bold=True, center=True)
        fill_cell(t.cell(0,1), right_header, bold=True, center=True)
        # Содержимое
        fill_cell(t.cell(1,0), left_body)
        fill_cell(t.cell(1,1), right_body)
        return t

    def simple_table(headers, rows, col_widths=None):
        """Простая таблица с заголовком и строками данных."""
        t = doc.add_table(rows=1+len(rows), cols=len(headers))
        t.style = 'Table Grid'
        if col_widths:
            for ci, w in enumerate(col_widths):
                for row in t.rows:
                    row.cells[ci].width = Cm(w)
        for ci, h in enumerate(headers):
            fill_cell(t.cell(0, ci), h, bold=True, center=True, size=10)
        for ri, row_data in enumerate(rows):
            for ci, val in enumerate(row_data):
                fill_cell(t.cell(ri+1, ci), str(val), size=10)
        return t

    # ══════════════════════════════════════════════════════════════════════════
    # ДОГОВОР БЫТОВОГО ПОДРЯДА
    # ══════════════════════════════════════════════════════════════════════════
    if doc_type == 'contract':
        heading('ДОГОВОР')
        subheading('бытового подряда на изготовление мебели')
        city_date(co_city, f'№ {contract_num} от {contract_date}')

        para(f'{co_name}, в лице менеджера {manager_line}, действующего на основании доверенности № ____ от ____________, именуемый в дальнейшем «Подрядчик», и гр. {fname}, именуемый (ая) в дальнейшем «Заказчик», заключили настоящий Договор о нижеследующем:', indent=False)

        section('1. ПРЕДМЕТ ДОГОВОРА')
        para('1.1. Подрядчик обязуется выполнить работу по изготовлению мебели и передать результат работы Заказчику (мебель передается в разобранном виде), а Заказчик обязуется принять и оплатить результат работ.')
        para('1.2. Наименование, качественные характеристики, количество, дизайн мебели указываются в Техническом проекте (Приложение № 1).')
        para(f'1.3. Срок выполнения работ: {prod_days} рабочих дней с момента согласования Технического проекта и получения предварительной оплаты.')
        para('1.4. Подрядчик вправе досрочно выполнить работу.')

        section('2. РАЗРАБОТКА И СОГЛАСОВАНИЕ ТЕХНИЧЕСКОГО ПРОЕКТА')
        para('2.1. Технический проект разрабатывается Подрядчиком в течение 10 рабочих дней с момента получения предварительной оплаты.')
        para('2.2. Заказчик в течение 5 рабочих дней обеспечивает доступ в помещение для проведения замеров.')
        para('2.3. Заказчик согласовывает Технический проект путём проставления подписи или направляет мотивированный отказ.')
        para('2.4. Все изменения после подписания Технического проекта по инициативе Заказчика недопустимы, за исключением существенных изменений, признанных Подрядчиком.')

        section('3. СТОИМОСТЬ РАБОТ И ПОРЯДОК РАСЧЁТОВ')
        para(f'3.1. Общая стоимость работ составляет {total:,.0f} ({total_words}) рублей. НДС не облагается.')
        para('3.2. Оплата осуществляется в следующем порядке:')
        if ptype == '100% предоплата':
            para(f'3.2.1. Предварительная оплата при заключении Договора: {prepaid:,.0f} ({num_to_words(prepaid)}) рублей.')
            para('3.2.2. Окончательный платёж не предусмотрен.')
        else:
            para(f'3.2.1. Предварительная оплата при заключении Договора: {prepaid:,.0f} ({num_to_words(prepaid)}) рублей.')
            para(f'3.2.2. Окончательный платёж: {balance:,.0f} ({num_to_words(balance)}) рублей — в течение 3 дней с уведомления о готовности.')
        para('3.3. Оплата производится безналичным расчётом или наличными.')

        section('4. ПРАВА И ОБЯЗАННОСТИ СТОРОН')
        para('4.1. Подрядчик обязан: выполнить работу согласно Техническому проекту; уведомить Заказчика о готовности мебели; устранить недостатки по результатам приёмки.')
        para('4.2. Заказчик обязан: согласовать и подписать Технический проект; оплатить стоимость работ; принять результат работ.')
        para('4.3. Подрядчик вправе: требовать подписания Акта; требовать оплаты; досрочно выполнить работы.')
        para('4.4. Заказчик вправе: выбрать модель, цвет, компоновку мебели.')

        section('5. ГАРАНТИЯ')
        para('5.1. Гарантийный срок на фурнитуру — 6 месяцев, на мебель (корпус, фасады, столешницы) — 24 месяца с даты подписания Акта. Срок службы — 5 лет.')
        para('5.2. Гарантия не распространяется на недостатки, возникшие вследствие нарушения правил эксплуатации, ненадлежащего хранения или использования не по назначению.')

        section('6. ПОРЯДОК ПРИЁМКИ')
        para('6.1. По факту выполнения работ Подрядчик представляет Акт выполненных работ.')
        para('6.2. При уклонении Заказчика от получения мебели Подрядчик бесплатно хранит её 7 дней, далее — 500 руб./день.')

        section('7. ОТВЕТСТВЕННОСТЬ СТОРОН')
        para('7.1. За нарушение сроков оплаты — пеня 0,1% от суммы задолженности за каждый день просрочки.')
        para('7.2. В случае отказа Заказчика от мебели надлежащего качества, изготовленной по индивидуальному заказу, размер убытков Подрядчика равен стоимости мебели.')

        section('8. РАЗРЕШЕНИЕ СПОРОВ')
        para('8.1. Все споры разрешаются путём переговоров, при невозможности — в судебном порядке по месту нахождения Подрядчика.')
        para('8.2. Обязательный претензионный порядок. Срок ответа на претензию — 10 рабочих дней.')

        section('9. СРОК ДЕЙСТВИЯ ДОГОВОРА')
        para('9.1. Договор вступает в силу с момента подписания и действует до полного исполнения обязательств.')
        para('9.2. Изменения принимаются по обоюдному соглашению путём подписания Дополнительного соглашения.')

        section('10. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ')
        para('10.1. Стороны согласны на факсимильное воспроизведение подписей и юридически значимую переписку по электронной почте и мессенджерам.')
        para(f'10.2. Заказчик даёт согласие на обработку персональных данных в целях исполнения настоящего договора. {co_name} (ОГРН: {co_ogrn}, ИНН: {co_inn}). Срок согласия — в течение срока договора и 12 месяцев после.')
        para('10.3. Приложения: 1. Технический проект. 2. Калькуляция работ. 3. Правила эксплуатации. 4. Акт выполненных работ.')

        section('11. РЕКВИЗИТЫ СТОРОН')
        inn_kpp = f'ИНН/КПП: {co_inn}/{co_kpp}' if co_kpp else f'ИНН: {co_inn}'
        left_body  = f'{co_name}\nОГРН: {co_ogrn}, {inn_kpp}\n{co_addr}'
        if co_rs: left_body += f'\nр/с: {co_rs}'
        if co_bik: left_body += f'\nБИК: {co_bik}'
        left_body += f'\n\nМенеджер: {manager_line}\n\nПодпись: ______________________________\nМ.П.'
        right_body = f'{fname}\nПаспорт: {passport_str(c)}\nВыдан: {c.get("passport_issued_by") or "___________"}\nДата выдачи: {fmt_date(c.get("passport_issued_date") or "")}\nАдрес регистрации: {", ".join(filter(None,[c.get("reg_city",""),c.get("reg_street",""),c.get("reg_house","")]))}\nТел.: {c.get("phone") or "___________"}\nEmail: {c.get("email") or "___________"}\n\nПодпись: ______________________________'
        sig_table('Подрядчик', left_body, 'Заказчик', right_body)

    # ══════════════════════════════════════════════════════════════════════════
    # АКТ ВЫПОЛНЕННЫХ РАБОТ
    # ══════════════════════════════════════════════════════════════════════════
    elif doc_type == 'act':
        right_para(f'Приложение № 4 к договору бытового подряда\nна изготовление мебели от {contract_date}')
        heading('«АКТ ВЫПОЛНЕННЫХ РАБОТ»')
        city_date(co_city, contract_date)
        para(f'{co_name}, в лице менеджера {manager_line}, именуемый «Подрядчик», и гр. {fname}, именуемый «Заказчик», подписали настоящий Акт о нижеследующем:', indent=False)
        para(f'1. Подрядчик изготовил для Заказчика мебель по договору № {contract_num} от {contract_date}:')

        if products:
            rows = [(i+1, p.get('name','Кухонный гарнитур'), 'шт.', p.get('qty',1), '') for i, p in enumerate(products)]
        else:
            rows = [(1, 'Кухонный гарнитур', 'шт.', 1, f'{total:,.0f}')]
        rows.append(('', '', '', 'ИТОГО:', f'{total:,.0f}'))
        simple_table(['№','Наименование мебели','Ед. изм.','Кол-во','Стоимость, руб.'], rows, [1,7,2,2,3])

        p_sum = doc.add_paragraph()
        p_sum.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_sum.paragraph_format.space_before = Pt(2)
        r_sum = p_sum.add_run(f'({total_words})'); font(r_sum, 10)

        para('2. Комплектность, количество, вид, характеристики мебели соответствуют условиям договора. Визуальный осмотр произведён Заказчиком. Фурнитура проверена.')
        para('3. Заказчик принял результат выполненных работ. Претензий нет.')
        para('4. Обязательства Подрядчика выполнены в полном объёме. Оплата произведена.')
        sig_table(
            'Подрядчик', f'{co_name}\n\nМенеджер: ______________________________\nМ.П.',
            'Заказчик', f'{fname}\nПаспорт: {passport_str(c)}\nТелефон: {c.get("phone") or "___________"}\n\nПодпись: ______________________________'
        )

    # ══════════════════════════════════════════════════════════════════════════
    # ТЕХНИЧЕСКИЙ ПРОЕКТ
    # ══════════════════════════════════════════════════════════════════════════
    elif doc_type == 'tech':
        # Альбомная страница, минимальные поля
        sec.page_width  = Mm(297); sec.page_height = Mm(210)
        sec.left_margin = Mm(7);   sec.right_margin  = Mm(7)
        sec.top_margin  = Mm(6);   sec.bottom_margin = Mm(6)

        p_hdr = doc.add_paragraph()
        p_hdr.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_hdr.paragraph_format.space_after = Pt(0)
        r_hdr = p_hdr.add_run(f'Приложение № 1 к договору бытового подряда на изготовление мебели № {contract_num} от {contract_date}')
        font(r_hdr, 9)

        p_title = doc.add_paragraph()
        p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_title.paragraph_format.space_before = Pt(0)
        p_title.paragraph_format.space_after  = Pt(3)
        r_title = p_title.add_run('«ТЕХНИЧЕСКИЙ ПРОЕКТ»'); font(r_title, 11, bold=True)

        # Таблица характеристик (4 колонки: label | value | label | value)
        korpus    = c.get('tech_korpus','') or ''
        fasad1    = c.get('tech_fasad1','') or ''
        fasad2    = c.get('tech_fasad2','') or ''
        stoleshn  = c.get('tech_stoleshniza','') or ''
        stenovaya = c.get('tech_stenovaya','') or ''
        pod_type  = c.get('tech_podsvetka_type','') or ''
        pod_svet  = c.get('tech_podsvetka_svet','') or ''
        frezerovka= c.get('tech_frezerovka','') or ''
        pod_val   = f'Тип: {pod_type}   Свет: {pod_svet}' if (pod_type or pod_svet) else ''

        tbl = doc.add_table(rows=4, cols=4)
        tbl.style = 'Table Grid'
        widths = [Cm(2.8), Cm(8.0), Cm(3.5), Cm(10.7)]
        for row in tbl.rows:
            for ci, w in enumerate(widths): row.cells[ci].width = w

        def tc(ri, ci, text, bold=False):
            cell = tbl.cell(ri, ci)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(1); p.paragraph_format.space_after = Pt(1)
            r = p.add_run(text); font(r, 9, bold)

        tc(0,0,'Корпус:', True);      tc(0,1, korpus)
        tc(0,2,'Столешница:', True);  tc(0,3, stoleshn)
        tc(1,0,'Фасад 1:', True);     tc(1,1, fasad1)
        tc(1,2,'Стеновая панель:', True); tc(1,3, stenovaya)
        tc(2,0,'Фасад 2:', True);     tc(2,1, fasad2)
        tc(2,2,'Подсветка', True);    tc(2,3, pod_val)
        tc(3,0,'Фрезеровка:', True)
        # Объединяем ячейки для фрезеровки
        merged = tbl.cell(3,1).merge(tbl.cell(3,2)).merge(tbl.cell(3,3))
        p_m = merged.paragraphs[0]
        p_m.paragraph_format.space_before = Pt(1); p_m.paragraph_format.space_after = Pt(1)
        r_m = p_m.add_run(frezerovka); font(r_m, 9)

        # Изображение проекта
        tech_img = str(c.get('tech_image_url') or '').strip()
        if tech_img:
            try:
                import urllib.request, io as _io
                req = urllib.request.Request(tech_img, headers={'User-Agent': 'Mozilla/5.0'})
                img_bytes = urllib.request.urlopen(req, timeout=15).read()
                p_img = doc.add_paragraph()
                p_img.paragraph_format.space_before = Pt(4)
                p_img.paragraph_format.space_after  = Pt(2)
                p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_img.add_run().add_picture(_io.BytesIO(img_bytes), width=Mm(280))
            except Exception as ex:
                logger.warning(f'tech img failed: {ex}')
                p_ph = doc.add_paragraph()
                p_ph.paragraph_format.space_before = Pt(160)
                p_ph.paragraph_format.space_after  = Pt(4)
                p_ph.add_run('Место для схемы / эскиза:')
        else:
            p_ph = doc.add_paragraph()
            p_ph.paragraph_format.space_before = Pt(160)
            p_ph.paragraph_format.space_after  = Pt(4)
            p_ph.add_run('Место для схемы / эскиза:')

        p_disc = doc.add_paragraph()
        p_disc.paragraph_format.space_before = Pt(2); p_disc.paragraph_format.space_after = Pt(2)
        r_disc = p_disc.add_run('Подписывая Технический проект, Заказчик подтверждает, что ознакомлен с наименованием, качественными характеристиками, количеством, дизайном мебели и ему полностью понятны выполняемые Подрядчиком работы. Приложение: бланк замера.')
        font(r_disc, 8); r_disc.italic = True

        sig_table(
            f'Подрядчик: {co_name.upper()}',
            f'Менеджер\n\n______________________________\nМ.П.',
            f'Заказчик:  {fname}',
            '\n\n______________________________'
        )

    # ══════════════════════════════════════════════════════════════════════════
    # ПРАВИЛА ЭКСПЛУАТАЦИИ
    # ══════════════════════════════════════════════════════════════════════════
    elif doc_type == 'rules':
        right_para(f'Приложение № 3 к договору бытового подряда\nна изготовление мебели от {contract_date}')
        heading('«ПРАВИЛА ЭКСПЛУАТАЦИИ КОРПУСНОЙ МЕБЕЛИ»')

        section('1. ОБЩИЕ РЕКОМЕНДАЦИИ')
        para('1.1. Срок службы Мебели зависит от соблюдения настоящих правил.')
        para('1.2. Оптимальные условия: температура +18°C — +25°C, влажность 45%–70%.')
        para('1.3. Оберегайте мебель от прямых солнечных лучей, источников тепла, резких перепадов температуры и влажности.')
        para('1.4. Запрещается воздействие кислот, щелочей, растворителей, абразивных средств.')

        section('2. УСЛОВИЯ ХРАНЕНИЯ')
        para('2.1. Хранить в сухих, проветриваемых помещениях. Запрещено хранение в санузлах, банях, подвалах.')
        para('2.2. Мебель хранить в заводской упаковке горизонтально. Не прислонять к стене вертикально.')
        para('2.3. После хранения при отрицательных температурах — акклиматизация в упаковке не менее 72 часов.')

        section('3. ПРАВИЛА ЭКСПЛУАТАЦИИ')
        para('3.1. Нагрузки: полки — до 15 кг, ящики ЛДСП — до 5 кг, метабокс — до 18 кг, тандембокс — до 35 кг, подвесной шкаф — до 70 кг.')
        para('3.2. ЛДСП: немедленно вытирать пролитое. Не мыть водой, не использовать пароочистители и абразивы.')
        para('3.3. Фасады МДФ: не допускать контакта с горячим (>60°C), острыми предметами, агрессивной химией.')
        para('3.4. Столешницы: не использовать как разделочную доску. Сразу убирать воду, особенно на стыках.')
        para('3.5. Стекло и зеркала: чистить специальными средствами, нанося на ткань. Не допускать ударов.')
        para('3.6. Фурнитура: протирать сухой тканью. Не прилагать чрезмерных усилий. Регулярная смазка — обязанность Заказчика.')

        p_italic = doc.add_paragraph()
        p_italic.paragraph_format.space_before = Pt(4)
        r_it = p_italic.add_run('Соблюдая эти правила, вы сохраните мебель на долгие годы. Несоблюдение правил эксплуатации ведёт к потере гарантии.')
        font(r_it, 10); r_it.italic = True
        p_warn = doc.add_paragraph()
        r_w = p_warn.add_run('ВНИМАНИЕ! Подрядчик не несёт ответственности за последствия несоблюдения правил эксплуатации.')
        font(r_w, 10, bold=True); r_w.italic = True

        sig_table(
            f'Подрядчик: {co_name.upper()}',
            f'Менеджер: ______________________________\nМ.П.',
            f'Заказчик: {fname}',
            '\nПодпись: ______________________________'
        )

    # ══════════════════════════════════════════════════════════════════════════
    # ДОГОВОР ДОСТАВКИ
    # ══════════════════════════════════════════════════════════════════════════
    elif doc_type == 'delivery':
        heading('ДОГОВОР')
        subheading('на оказание услуг по доставке мебели')
        city_date(co_city, contract_date)
        para(f'{co_name}, в лице менеджера {manager_line}, именуемый «Исполнитель», и гр. {fname}, именуемый «Заказчик», заключили настоящий Договор:', indent=False)

        section('1. ПРЕДМЕТ ДОГОВОРА')
        para(f'1.1. Исполнитель обязуется доставить мебель по договору подряда № {contract_num} от {contract_date}.')
        para(f'1.2. Адрес доставки: {daddr}. Этаж: {c.get("delivery_floor") or "___"}. Лифт: {c.get("delivery_elevator") or "нет"}.')
        para(f'1.3. Дата доставки: {delivery_date}. Конкретное время согласовывается дополнительно.')
        para('1.4. Доставка осуществляется в разобранном виде.')

        section('2. ПРАВА И ОБЯЗАННОСТИ СТОРОН')
        para('2.1. Исполнитель обязан: доставить в срок по указанному адресу; обеспечить сохранность при транспортировке; уведомить об изменении времени не менее чем за 2 часа.')
        para('2.2. Заказчик обязан: обеспечить доступ к месту доставки; оплатить услуги; при обнаружении повреждений сообщить до подписания акта.')
        para('2.3. Исполнитель вправе однократно предоставить скидку в размере стоимости доставки (8 000 руб.) при доставке в пределах г. Саратова и г. Энгельса.')

        section('3. СТОИМОСТЬ И ОПЛАТА')
        para('3.1. Стоимость услуг определяется Приложением № 1.')
        para('3.2. Оплата производится в день доставки до начала разгрузки.')

        section('4. ОТВЕТСТВЕННОСТЬ')
        para('4.1. При повреждении мебели по вине Исполнителя при транспортировке — Исполнитель возмещает ущерб.')
        para('4.2. При отказе от доставки менее чем за 24 часа Исполнитель вправе удержать фактически понесённые расходы.')

        section('5. ПРОЧИЕ УСЛОВИЯ')
        para('5.1. Договор вступает в силу с момента подписания. Составлен в двух экземплярах.')
        inn_kpp = f'ИНН/КПП: {co_inn}/{co_kpp}' if co_kpp else f'ИНН: {co_inn}'
        left_body = f'{co_name}\n{co_addr}\n{inn_kpp}'
        if co_rs: left_body += f'\nр/с: {co_rs}'
        if co_bik: left_body += f'\nБИК: {co_bik}'
        left_body += f'\n\nМенеджер: ______________________________\nМ.П.'
        sig_table(
            'Исполнитель', left_body,
            'Заказчик', f'{fname}\nПаспорт: {passport_str(c)}\nАдрес доставки: {daddr}\nТелефон: {c.get("phone") or "___________"}\n\nПодпись: ______________________________'
        )

    # ══════════════════════════════════════════════════════════════════════════
    # АКТ ПРИЁМА ДОСТАВКИ
    # ══════════════════════════════════════════════════════════════════════════
    elif doc_type == 'act_delivery':
        dcost_words = num_to_words(delivery_cost) if delivery_cost else '___________'
        right_para(f'к договору на оказание услуг по доставке мебели от {contract_date}')
        heading('«АКТ ПРИЁМА-ПЕРЕДАЧИ ДОСТАВКИ МЕБЕЛИ»')
        city_date(co_city, contract_date)
        para(f'{co_name}, именуемый «Исполнитель», и гр. {fname}, именуемый «Заказчик», составили настоящий Акт:', indent=False)
        para(f'1. Исполнитель доставил Заказчику мебель по адресу: {daddr}.')
        para(f'2. Дата доставки: {delivery_date}.')
        para('3. Мебель доставлена в полном объёме, внешних механических повреждений не выявлено.')
        para('4. Заказчик произвёл осмотр мебели в момент приёмки. Претензий нет.')
        para(f'5. Стоимость услуг по доставке: {delivery_cost:,.0f} ({dcost_words}) рублей. Оплата произведена.')
        para('6. Услуги по доставке выполнены в полном объёме.')
        sig_table(
            'Исполнитель', f'{co_name}\n\nМенеджер: ______________________________\nМ.П.',
            'Заказчик', f'{fname}\nПаспорт: {passport_str(c)}\nТелефон: {c.get("phone") or "___________"}\n\nПодпись: ______________________________'
        )

    # ══════════════════════════════════════════════════════════════════════════
    # ДОГОВОР МОНТАЖА
    # ══════════════════════════════════════════════════════════════════════════
    elif doc_type == 'assembly':
        heading('ДОГОВОР')
        subheading('на оказание услуг по сборке и монтажу мебели')
        city_date(co_city, contract_date)
        para(f'{co_name}, именуемый «Исполнитель», и гр. {fname}, именуемый «Заказчик», заключили настоящий Договор:', indent=False)

        section('1. ПРЕДМЕТ ДОГОВОРА')
        para(f'1.1. Исполнитель обязуется выполнить работы по сборке и монтажу мебели по договору подряда № {contract_num} от {contract_date}.')
        para(f'1.2. Адрес выполнения работ: {daddr}.')
        para(f'1.3. Ориентировочная дата начала работ: {delivery_date}. Срок выполнения: {assembly_days} рабочих дней.')
        para('1.4. В объём работ входит: сборка корпусных элементов, установка фасадов и фурнитуры, регулировка петель, монтаж столешницы и стеновых панелей, подключение подсветки (при наличии).')

        section('2. ПРАВА И ОБЯЗАННОСТИ СТОРОН')
        para('2.1. Исполнитель обязан: выполнить монтаж качественно; убрать строительный мусор; уведомить о дефектах мебели или помещения.')
        para('2.2. Заказчик обязан: обеспечить доступ и электроснабжение; принять работы; оплатить согласно условиям.')

        section('3. СТОИМОСТЬ И ОПЛАТА')
        acost_str = f'{assembly_cost:,.0f} ({num_to_words(assembly_cost)}) рублей' if assembly_cost else '______________________________'
        para(f'3.1. Стоимость работ по сборке и монтажу составляет {acost_str}.')
        para('3.2. Оплата производится в день завершения монтажных работ до подписания Акта приёмки.')

        section('4. ОТВЕТСТВЕННОСТЬ')
        para('4.1. Исполнитель несёт ответственность за качество монтажных работ в течение 12 месяцев.')
        para('4.2. Гарантия не распространяется на дефекты от нарушения правил эксплуатации или механических повреждений.')

        section('5. ПРОЧИЕ УСЛОВИЯ')
        para('5.1. Приёмка работ оформляется подписанием Акта приёмки. 5.2. Договор в двух экземплярах.')
        sig_table(
            'Исполнитель', f'{co_name}\n\nМенеджер: ______________________________\nМ.П.',
            'Заказчик', f'{fname}\nПаспорт: {passport_str(c)}\nАдрес монтажа: {daddr}\nТелефон: {c.get("phone") or "___________"}\n\nПодпись: ______________________________'
        )

    # ══════════════════════════════════════════════════════════════════════════
    # АКТ ПРИЁМА СБОРКИ
    # ══════════════════════════════════════════════════════════════════════════
    elif doc_type == 'act_assembly':
        acost_words = num_to_words(assembly_cost) if assembly_cost else '___________'
        right_para(f'к договору на оказание услуг по сборке и монтажу мебели от {contract_date}')
        heading('«АКТ ПРИЁМА-ПЕРЕДАЧИ ВЫПОЛНЕННЫХ РАБОТ ПО СБОРКЕ И МОНТАЖУ МЕБЕЛИ»')
        city_date(co_city, contract_date)
        para(f'{co_name}, именуемый «Исполнитель», и гр. {fname}, именуемый «Заказчик», составили настоящий Акт:', indent=False)
        para(f'1. Исполнитель выполнил работы по сборке и монтажу мебели по адресу: {daddr}.')

        if products:
            rows = [(i+1, p.get('name','Кухонный гарнитур'), 'шт.', p.get('qty',1)) for i, p in enumerate(products)]
        else:
            rows = [(1, 'Кухонный гарнитур', 'шт.', 1)]
        simple_table(['№','Наименование мебели','Ед. изм.','Кол-во'], rows, [1,10,2,2])

        para('2. Объём работ: сборка корпусных элементов, установка фасадов, регулировка петель, монтаж столешницы.')
        para('3. Заказчик произвёл проверку. Фурнитура проверена. Претензий нет.')
        para(f'4. Стоимость работ: {assembly_cost:,.0f} ({acost_words}) рублей. Оплата произведена.')
        para('5. Гарантийный срок на монтажные работы — 12 месяцев.')
        sig_table(
            'Исполнитель', f'{co_name}\n\nМенеджер: ______________________________\nМ.П.',
            'Заказчик', f'{fname}\nПаспорт: {passport_str(c)}\nТелефон: {c.get("phone") or "___________"}\n\nПодпись: ______________________________'
        )

    # ══════════════════════════════════════════════════════════════════════════
    # КАЛЬКУЛЯЦИЯ ДОСТАВКИ
    # ══════════════════════════════════════════════════════════════════════════
    elif doc_type == 'delivery_calc':
        right_para('Приложение № 1 к договору на оказание услуг по доставке мебели')
        heading('«КАЛЬКУЛЯЦИЯ НА ВЫПОЛНЕНИЕ УСЛУГ ПО ДОСТАВКЕ МЕБЕЛИ»')
        simple_table(
            ['Наименование работ и услуг','Ед. изм.','Кол-во','Цена, руб.','Стоимость, руб.'],
            [
                ('Доставка в пределах г. Саратова и г. Энгельса *','1 услуга','1','8 000','8 000'),
                ('Доставка за пределы г. Саратова и г. Энгельса **','1 км','','70',''),
                ('','','Итого:','','8 000'),
                ('','','Скидка ***:','','8 000'),
                ('','','Итого со скидкой:','','0'),
            ],
            [8,2,2,2,2]
        )
        para('* Исполнитель вправе однократно предоставить скидку в размере 8 000 руб.', indent=False)
        para('** Километраж от склада Исполнителя до адреса Заказчика по Яндекс.Картам.', indent=False)
        para('*** Размер скидки определяется Исполнителем индивидуально.', indent=False)
        sig_table(
            'Подрядчик', f'{co_name}\n\nМенеджер: ______________________________\nМ.П.',
            'Заказчик', f'{fname}\n\nПодпись: ______________________________'
        )

    # ══════════════════════════════════════════════════════════════════════════
    # ПРАЙС ПОДЪЁМ МЕБЕЛИ
    # ══════════════════════════════════════════════════════════════════════════
    elif doc_type == 'delivery_lift':
        right_para('Приложение № 2 к договору на оказание услуг по доставке мебели')
        heading('«ПРАЙС НА ВЫПОЛНЕНИЕ УСЛУГ ПО ПОДЪЁМУ И ЗАНОСУ МЕБЕЛИ»')
        para('Подъём мебели при отсутствии лифта и занос при невозможности парковки вплотную к подъезду.', indent=False, bold=True)
        simple_table(
            ['Наименование','Ед. изм.','Кол-во (этаж)','Цена, руб.'],
            [
                ('Квадратура корпуса до 20 кв.м','руб./этаж','','550'),
                ('Квадратура корпуса 20–25 кв.м','руб./этаж','','650'),
                ('Квадратура корпуса более 25 кв.м','руб./этаж','','750'),
                ('Перемещение вручную при невозможности подъезда','1 м','','30'),
                ('Подъём столешницы','1 уп./1 этаж','','350'),
                ('Подъём стеновой панели','1 уп./1 этаж','','250'),
                ('Подъём крупных частей корпуса','1 уп./1 этаж','','250'),
                ('Подъём дверей-купе','1 дверь/1 этаж','','150'),
            ],
            [9,3,3,2]
        )
        para('1. Подъём на лифте — бесплатно. 2. Занос на 1 этаж — бесплатно при парковке вплотную.', indent=False)
        para('* Услуги рассчитываются по факту оказания.', indent=False)
        sig_table(
            'Подрядчик', f'{co_name}\n\nМенеджер: ______________________________\nМ.П.',
            'Заказчик', f'{fname}\n\nПодпись: ______________________________'
        )

    # ══════════════════════════════════════════════════════════════════════════
    # КАЛЬКУЛЯЦИЯ СБОРКИ
    # ══════════════════════════════════════════════════════════════════════════
    elif doc_type == 'assembly_calc':
        acost_val = assembly_cost or 17500
        right_para('Приложение № 1 к договору на выполнение работ по монтажу и сборке мебели')
        heading('«КАЛЬКУЛЯЦИЯ НА ВЫПОЛНЕНИЕ РАБОТ ПО СБОРКЕ МЕБЕЛИ»')
        simple_table(
            ['Наименование работ и услуг','Ед. изм.','Кол-во','Цена, руб.','Стоимость, руб.'],
            [
                (f'Сборка и монтаж мебели по договору № {contract_num} от {contract_date} *','работа','1',f'{acost_val:,.0f}',f'{acost_val:,.0f}'),
                ('Выезд сборщика за пределы г. Саратова и г. Энгельса **','1 км','40','','0'),
                ('','','Итого:','',f'{acost_val:,.0f}'),
                ('','','Скидка ***:','',f'{acost_val:,.0f}'),
                ('','','Итого со скидкой:','','0'),
            ],
            [9,2,2,2,2]
        )
        para('* Стоимость сборки. Повторный выезд по вине Заказчика — по данной калькуляции.', indent=False)
        para('** Километраж от склада Подрядчика по Яндекс.Картам.', indent=False)
        para('*** Размер скидки определяется Подрядчиком индивидуально.', indent=False)
        sig_table(
            'Подрядчик', f'{co_name}\n\nМенеджер: ______________________________\nМ.П.',
            'Заказчик', f'{fname}\n\nПодпись: ______________________________'
        )

    # ══════════════════════════════════════════════════════════════════════════
    # ПРАЙС ДОП. РАБОТ СБОРКИ
    # ══════════════════════════════════════════════════════════════════════════
    elif doc_type == 'assembly_extra':
        right_para('Приложение № 2 к договору на выполнение работ по монтажу и сборке мебели')
        heading('«ПРАЙС НА ДОПОЛНИТЕЛЬНЫЕ РАБОТЫ»')
        simple_table(
            ['Наименование работ','Ед. изм.','Кол-во','Цена, руб.'],
            [
                ('Врезка мойки с герметизацией (без подвода воды)','шт.','','1 250'),
                ('Врезка варочной поверхности (без пуска газа)','шт.','','1 250'),
                ('Установка вытяжки без принудительного воздуховода','шт.','','1 500'),
                ('Установка духового шкафа','шт.','','750'),
                ('Установка встраиваемой СВЧ-печи','шт.','','650'),
                ('Установка встраиваемого холодильника','шт.','','2 400'),
                ('Установка посудомоечной машины (без подвода воды)','шт.','','1 500'),
                ('Установка светодиодной ленты','п.м.','','1 250'),
                ('Установка столешницы в подоконник','шт.','','3 000'),
                ('Установка ручек (куплены клиентом)','шт.','','70'),
            ],
            [10,2,2,3]
        )
        para('Стоимость работ, не включённых в прайс, обсуждается индивидуально.', indent=False)
        para('* Работы рассчитываются по факту выполнения.', indent=False)
        sig_table(
            'Подрядчик', f'{co_name}\n\nМенеджер: ______________________________\nМ.П.',
            'Заказчик', f'{fname}\n\nПодпись: ______________________________'
        )

    # ══════════════════════════════════════════════════════════════════════════
    # ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ
    # ══════════════════════════════════════════════════════════════════════════
    elif doc_type == 'addendum':
        heading('ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ')
        subheading(f'к договору бытового подряда № {contract_num} от {contract_date}')
        city_date(co_city, contract_date)
        para(f'{co_name}, именуемый «Подрядчик», и гр. {fname}, именуемый «Заказчик», заключили настоящее соглашение:', indent=False)

        section('1. ПРЕДМЕТ СОГЛАШЕНИЯ')
        para('1.1. Стороны договорились внести следующие изменения в Договор:')
        for _ in range(6):
            p_bl = doc.add_paragraph('_' * 85)
            p_bl.paragraph_format.space_after = Pt(4)

        section('2. ПРОЧИЕ УСЛОВИЯ')
        para('2.1. Настоящее соглашение является неотъемлемой частью Договора и вступает в силу с момента подписания.')
        para('2.2. В остальной части условия Договора остаются без изменений.')
        para('2.3. Соглашение составлено в двух экземплярах.')
        inn_kpp = f'ИНН/КПП: {co_inn}/{co_kpp}' if co_kpp else f'ИНН: {co_inn}'
        left_body = f'{co_name}\nОГРН: {co_ogrn}, {inn_kpp}\n{co_addr}\n\nМенеджер: {manager_line}\nПодпись: ______________________________\nМ.П.'
        sig_table(
            'Подрядчик', left_body,
            'Заказчик', f'{fname}\nПаспорт: {passport_str(c)}\nТел.: {c.get("phone") or "___________"}\n\nПодпись: ______________________________'
        )

    # ══════════════════════════════════════════════════════════════════════════
    # СПЕЦИФИКАЦИЯ НА ТЕХНИКУ
    # ══════════════════════════════════════════════════════════════════════════
    elif doc_type == 'tech_spec':
        right_para(f'Приложение к договору бытового подряда № {contract_num} от {contract_date}')
        heading('«СПЕЦИФИКАЦИЯ НА ПОСТАВКУ ТЕХНИКИ»')
        rows = [('','шт.','','','') for _ in range(8)]
        rows.append(('','','','ИТОГО:',''))
        simple_table(['Наименование','Ед. изм.','Кол-во','Цена, руб.','Стоимость, руб.'], rows, [8,2,2,3,3])
        sig_table(
            'Подрядчик', f'{co_name}\n\nМенеджер: ______________________________\nМ.П.',
            'Заказчик', f'{fname}\n\nПодпись: ______________________________'
        )

    else:
        # Неизвестный тип — пустой документ с заголовком
        heading(f'Документ: {doc_type}')
        para('Тип документа не поддерживается.')

    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()


# ── HANDLER ───────────────────────────────────────────────────────────────────

def handler(event: dict, context) -> dict:
    """Генератор DOCX-документов. Принимает client_id и doc_type, возвращает base64 DOCX."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    payload = verify_token(event)
    if not payload:
        return err('Unauthorized', 401)

    qs = event.get('queryStringParameters') or {}
    action   = qs.get('action', '')
    cid      = qs.get('client_id', '')
    doc_type = qs.get('doc', 'contract')

    if action not in ('doc_docx', 'doc_zip'):
        return err('Неизвестное действие', 404)

    if not cid:
        return err('Нет client_id')

    # Загружаем клиента
    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(f'SELECT * FROM {schema}.clients WHERE id = %s', (cid,))
        row = cur.fetchone()
        if not row:
            return err('Клиент не найден', 404)
        cols = [d[0] for d in cur.description]
        client = dict(zip(cols, row))

        # Для tech — подгружаем фото категории render если нет tech_image_url
        if doc_type in ('tech',) or action == 'doc_zip':
            if not client.get('tech_image_url'):
                cur.execute(f"SELECT url FROM {schema}.client_photos WHERE client_id = %s AND category = 'render' ORDER BY uploaded_at DESC LIMIT 1", (cid,))
                photo_row = cur.fetchone()
                if photo_row:
                    client['tech_image_url'] = photo_row[0]

    user_id = payload.get('sub') or payload.get('user_id') or payload.get('id')
    company = get_company(user_id)

    if action == 'doc_docx':
        logger.info(f'doc_docx: {doc_type} for client {cid}')
        docx_bytes = build_docx(client, doc_type, company)
        logger.info(f'doc_docx: generated {len(docx_bytes)} bytes')
        return {
            'statusCode': 200,
            'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps({'data': base64.b64encode(docx_bytes).decode()}),
        }

    elif action == 'doc_zip':
        import zipfile, io as _io
        DOCS_ZIP = {
            'contract':       '01. Договор бытового подряда',
            'tech':           '02. Технический проект (Прил.1)',
            'act':            '03. Акт выполненных работ (Прил.4)',
            'rules':          '04. Правила эксплуатации (Прил.3)',
            'delivery':       '05. Договор доставки',
            'act_delivery':   '06. Акт приёма доставки',
            'assembly':       '07. Договор монтажа',
            'act_assembly':   '08. Акт приёма сборки',
            'delivery_calc':  '09. Калькуляция доставки (Прил.1)',
            'delivery_lift':  '10. Прайс подъём мебели (Прил.2)',
            'assembly_calc':  '11. Калькуляция сборки (Прил.1)',
            'assembly_extra': '12. Прайс доп. работ (Прил.2)',
            'addendum':       '13. Дополнительное соглашение',
            'tech_spec':      '14. Спецификация на технику',
        }
        fname_client = full_name(client).replace(' ', '_')[:25]
        zip_buf = _io.BytesIO()
        with zipfile.ZipFile(zip_buf, 'w', zipfile.ZIP_DEFLATED) as zf:
            for dt, name in DOCS_ZIP.items():
                try:
                    b = build_docx(client, dt, company)
                    zf.writestr(f'{name} — {fname_client}.docx', b)
                    logger.info(f'zip: added {dt} ({len(b)} bytes)')
                except Exception as ex:
                    logger.error(f'zip: failed {dt}: {ex}')
        fname_zip = f'Документы — {fname_client}.zip'
        return {
            'statusCode': 200,
            'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps({'data': base64.b64encode(zip_buf.getvalue()).decode(), 'filename': fname_zip}),
        }
