import json
import logging
from datetime import datetime

from db import get_db

logger = logging.getLogger(__name__)


def _get_company(user_id) -> dict:
    """Читает реквизиты компании из app-state пользователя."""
    if not user_id:
        logger.warning('[_get_company] user_id is empty')
        return {}
    try:
        uid = int(str(user_id))
    except (ValueError, TypeError) as e:
        logger.error(f'[_get_company] cannot parse user_id={user_id!r}: {e}')
        return {}
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute('SELECT state FROM app_state WHERE user_id = %s', (uid,))
            row = cur.fetchone()
            if not row:
                # fallback: общий state (первая запись без user_id)
                cur.execute('SELECT state FROM app_state WHERE user_id IS NULL LIMIT 1')
                row = cur.fetchone()
        if not row:
            logger.warning(f'[_get_company] no app_state found for uid={uid}')
            return {}
        raw = row[0]
        state = raw if isinstance(raw, dict) else json.loads(raw)
        company = (state.get('settings') or {}).get('company') or {}
        logger.info(f'[_get_company] uid={uid} → name={company.get("name", "<пусто>")}')
        return company
    except Exception as e:
        logger.error(f'[_get_company] DB error uid={uid}: {e}')
        return {}


def _get_manager_poa(manager_name: str) -> dict:
    """Ищет данные менеджера по имени в таблице users и возвращает его доверенность."""
    if not manager_name or not manager_name.strip():
        return {}
    try:
        name = manager_name.strip()
        with get_db() as conn:
            cur = conn.cursor()
            # Ищем по full_name (точное совпадение или login содержит имя)
            cur.execute(
                '''SELECT full_name, poa_number, poa_date FROM users
                   WHERE LOWER(full_name) = LOWER(%s) OR LOWER(login) = LOWER(%s)
                   LIMIT 1''',
                (name, name)
            )
            row = cur.fetchone()
        if not row:
            return {}
        return {
            'full_name': row[0] or '',
            'poa_number': row[1] or '',
            'poa_date': str(row[2]) if row[2] else '',
        }
    except Exception:
        return {}


def _co(company: dict, field: str, fallback: str = '___________') -> str:
    """Возвращает поле компании или заглушку."""
    return str(company.get(field) or '').strip() or fallback


def _genitive_name(full_name: str) -> str:
    """Склоняет ФИО (Фамилия Имя Отчество) в родительный падеж.
    Охватывает типичные русские мужские и женские имена/фамилии/отчества.
    """
    if not full_name or not full_name.strip():
        return full_name

    parts = full_name.strip().split()
    if not parts:
        return full_name

    vowels = set('аеёиоуыэюяАЕЁИОУЫЭЮЯ')
    consonants = set('бвгджзйклмнпрстфхцчшщБВГДЖЗЙКЛМНПРСТФХЦЧШЩ')

    def _word_genitive(word: str) -> str:
        if not word or len(word) < 2:
            return word
        w = word
        low = w.lower()

        # ── Имена/отчества на -ий (Василий, Николаевич, Аркадий, Юрий)
        # Василий → Василия, Юрий → Юрия
        if low.endswith('ий'):
            return w[:-2] + 'ия'

        # ── Отчества на -ич (Ильич, Кузьмич)
        if low.endswith('ич'):
            return w + 'а'

        # ── Женские окончания на -ья, -ия, -ья
        if low.endswith('ья'):
            return w[:-2] + 'ьи'
        if low.endswith('ия'):
            return w[:-2] + 'ии'

        # ── Имена/фамилии на -а (Наташа, Коваленко — не склоняем оканч. на -ко/-енко)
        if low.endswith('енко') or low.endswith('enko'):
            return w  # украинские фамилии не склоняются
        if low.endswith('ко') or low.endswith('но') or low.endswith('го') or low.endswith('цо'):
            return w  # несклоняемые окончания

        # ── Женские: -а после согласной → -ы
        if low.endswith('а') and len(w) >= 2 and w[-2] in consonants:
            return w[:-1] + 'ы'
        # ── Женские: -я после согласной → -и (Наталья → Натальи)
        if low.endswith('я') and len(w) >= 2 and w[-2] in consonants:
            return w[:-1] + 'и'
        # ── Женские: -га/-ка/-ха → -ги/-ки/-хи
        if low.endswith('га'):   return w[:-2] + 'ги'
        if low.endswith('ка'):   return w[:-2] + 'ки'
        if low.endswith('ха'):   return w[:-2] + 'хи'

        # ── Мужские на -ь (Игорь → Игоря, Алтынбек — нет, Медведь → Медведя)
        if low.endswith('ь'):
            return w[:-1] + 'я'

        # ── Мужские на -ец → -ца (Кузнецов — нет, это -ов; Борец → Борца)
        if low.endswith('ец') and len(w) >= 4:
            return w[:-2] + 'ца'

        # ── Мужские фамилии/имена на согласную → +а
        # Сазонов, Иванов, Петров, Александр, Виктор, Алексей
        if w[-1] in consonants:
            return w + 'а'

        # ── Окончание на гласную — не склоняем (Гёте, Дали, Роллe)
        return w

    result = [_word_genitive(p) for p in parts]
    return ' '.join(result)


def log_history(conn, client_id, payload, action, description, old_val=None, new_val=None):
    cur = conn.cursor()
    cur.execute(
        '''INSERT INTO client_history (client_id, user_id, user_name, action, description, old_value, new_value)
           VALUES (%s, %s, %s, %s, %s, %s, %s)''',
        (
            client_id,
            payload.get('sub'),
            payload.get('login', ''),
            action,
            description,
            json.dumps(old_val) if old_val else None,
            json.dumps(new_val) if new_val else None,
        )
    )



def _num_to_words(n: float) -> str:
    n = int(round(n))
    if n == 0:
        return 'ноль рублей'
    ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
            'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать',
            'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать']
    ones_f = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
              'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать',
              'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать']
    tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто']
    hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот']

    def chunk(num, feminine=False):
        parts = []
        h = num // 100
        t = (num % 100) // 10
        o = num % 10
        if h:
            parts.append(hundreds[h])
        if t == 1:
            parts.append((ones_f if feminine else ones)[num % 100])
        else:
            if t:
                parts.append(tens[t])
            if o:
                parts.append((ones_f if feminine else ones)[o])
        return parts

    result = []
    millions = n // 1_000_000
    thousands = (n % 1_000_000) // 1_000
    remainder = n % 1_000

    if millions:
        parts = chunk(millions)
        o = millions % 10
        t2 = (millions % 100) // 10
        suffix = 'миллионов' if (t2 == 1 or o == 0 or o >= 5) else ('миллион' if o == 1 else 'миллиона')
        result.extend(parts); result.append(suffix)

    if thousands:
        parts = chunk(thousands, feminine=True)
        o = thousands % 10
        t2 = (thousands % 100) // 10
        suffix = 'тысяч' if (t2 == 1 or o == 0 or o >= 5) else ('тысяча' if o == 1 else 'тысячи')
        result.extend(parts); result.append(suffix)

    if remainder:
        result.extend(chunk(remainder))

    o = n % 10
    t2 = (n % 100) // 10
    rub = 'рублей' if (t2 == 1 or o == 0 or o >= 5) else ('рубль' if o == 1 else 'рубля')
    return ' '.join(result) + ' ' + rub


def _days_words(n: int) -> str:
    w = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять',
         'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать',
         'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать', 'двадцать']
    tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто']
    if n <= 20:
        return w[n] if n < len(w) else str(n)
    t = n // 10; o = n % 10
    return (tens[t] + (' ' + w[o] if o else '')).strip()


def _fmt_date(d):
    if not d: return '___________'
    try: return datetime.strptime(str(d)[:10], '%Y-%m-%d').strftime('%d.%m.%Y')
    except: return str(d)


def _fmt_date_full(d):
    months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
    if not d: return '«___» ___________ ______ г.'
    try:
        dt = datetime.strptime(str(d)[:10], '%Y-%m-%d')
        return f'«{dt.day:02d}» {months[dt.month-1]} {dt.year} г.'
    except: return str(d)


def _full_name(c):
    return ' '.join(filter(None,[c.get('last_name',''),c.get('first_name',''),c.get('middle_name','')])) or '___________'


def _passport_str(c):
    s = c.get('passport_series',''); n = c.get('passport_number','')
    return f'{s} {n}' if s and n else '___________'


def _reg_address(c):
    parts = []
    if c.get('reg_city'): parts.append(f"г. {c['reg_city']}")
    if c.get('reg_street'): parts.append(f"ул. {c['reg_street']}")
    if c.get('reg_house'): parts.append(f"д. {c['reg_house']}")
    if c.get('reg_apt'): parts.append(f"кв. {c['reg_apt']}")
    return ', '.join(parts) or '___________'


def _delivery_address(c):
    parts = []
    if c.get('delivery_city'): parts.append(f"г. {c['delivery_city']}")
    if c.get('delivery_street'): parts.append(f"ул. {c['delivery_street']}")
    if c.get('delivery_house'): parts.append(f"д. {c['delivery_house']}")
    if c.get('delivery_apt'): parts.append(f"кв. {c['delivery_apt']}")
    return ', '.join(parts) or '___________'


def _get_products(c):
    products = c.get('products') or []
    if isinstance(products, str):
        try: products = json.loads(products)
        except: products = []
    return products


def _doc_style(title='', contract_num=''):
    header_content = f'«{title}» · № {contract_num}' if contract_num else (title or '')
    return f'''<style>
@import url('https://fonts.googleapis.com/css2?family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap');
@page{{
  size:A4 portrait;
  margin:8mm 8mm 8mm 13mm;
  @top-center{{
    content:"{header_content}";
    font-family:'PT Serif',Georgia,serif;
    font-size:8pt;
    color:#666;
    padding-bottom:4mm;
  }}
  @bottom-center{{
    content:"Стр. " counter(page) " из " counter(pages);
    font-family:'PT Serif',Georgia,serif;
    font-size:8pt;
    color:#666;
    padding-top:4mm;
  }}
}}
*{{box-sizing:border-box;margin:0;padding:0}}
html{{background:#e8e8e8;min-height:100vh}}
body{{font-family:'PT Serif',Georgia,serif;font-size:9.5pt;line-height:1.15;color:#000;background:transparent}}
.page{{width:210mm;margin:8px auto;padding:10mm 10mm 10mm 20mm;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,.5)}}
@media screen and (max-width:900px){{
  .page{{width:100%;padding:12mm 8mm 12mm 10mm;font-size:10pt}}
}}
h1{{font-size:12pt;text-align:center;font-weight:bold;margin:0 0 3px;text-transform:uppercase;letter-spacing:.1em}}
h2{{font-size:10pt;text-align:center;font-weight:normal;margin:0 0 10px}}
.city-date{{display:flex;justify-content:space-between;margin:8px 0 10px;font-size:10pt}}
p{{margin:0 0 2px;text-align:justify;text-indent:1.27cm;line-height:1.15;orphans:4;widows:4}}
p.no-indent{{text-indent:0}}
p.center{{text-align:center;text-indent:0}}
.sec{{font-weight:bold;margin:10px 0 3px;text-indent:0;font-size:9pt;text-align:center;break-after:avoid;page-break-after:avoid}}
table{{width:100%;border-collapse:collapse;margin:8px 0;font-size:9.5pt;break-inside:avoid;page-break-inside:avoid}}
th,td{{border:1px solid #000;padding:4px 6px}}
th{{background:#f0f0f0;font-weight:bold;text-align:center;font-size:9.5pt;letter-spacing:.04em}}
td{{vertical-align:top}}
td.num{{text-align:center;width:5%}}
td.right{{text-align:right}}
tbody tr:nth-child(even){{background:#f8f8f8}}
.ul{{border-bottom:1px solid #000;display:inline-block;min-width:180px}}
.sig-wrap{{margin-top:20px;border-top:1px solid #000;padding-top:8px;break-inside:avoid;page-break-inside:avoid}}
.sig-table{{width:100%;border-collapse:collapse}}
.sig-table td{{border:none;padding:4px 8px;vertical-align:top;width:50%}}
.sig-table .sig-label{{font-weight:bold;font-size:10pt;text-transform:uppercase;letter-spacing:.08em;padding-bottom:6px}}
.sig-table .sig-line{{border-bottom:1px solid #000;min-width:180px;display:inline-block;margin-right:8px}}
a{{color:#000;text-decoration:none}}
@media print{{
  @page{{size:A4 portrait;margin:0}}
  html,body{{background:#fff !important;margin:0 !important;padding:0 !important}}
  .page{{display:block;width:auto !important;min-height:0 !important;margin:0 !important;padding:20mm 15mm 15mm 25mm !important;box-shadow:none !important;background:#fff !important;border:none !important}}
  a{{color:#000;text-decoration:none}}
  .sig-wrap{{break-inside:avoid;page-break-inside:avoid}}
  table{{break-inside:avoid;page-break-inside:avoid}}
  h1,h2,.sec{{break-after:avoid;page-break-after:avoid}}
}}
</style>
<script>
if(window.location.search.indexOf('print=1')>=0){{
  window.addEventListener('load',function(){{setTimeout(function(){{window.print();}},600);}});
}}
</script>'''


def _typo(text: str) -> str:
    import re
    text = re.sub(r'"([^"]*)"', r'«\1»', text)
    text = re.sub(r' - ', ' \u2014 ', text)
    text = re.sub(r' -- ', ' \u2014 ', text)
    return text


def _fmt_money(n: float) -> str:
    if n == int(n):
        return f'{int(n):,}'.replace(',', '\u202f')
    return f'{n:,.2f}'.replace(',', '\u202f')


