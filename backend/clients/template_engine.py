import json
import logging
import re

from db import get_db
from helpers import (
    _co, _fmt_date, _fmt_date_full, _fmt_money, _full_name,
    _genitive_name, _num_to_words, _passport_str,
)

logger = logging.getLogger(__name__)


def _get_template_blocks(user_id: str, doc_type: str) -> tuple:
    """Возвращает (blocks, settings) пользовательского шаблона по умолчанию."""
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT blocks, settings FROM doc_templates WHERE user_id = %s AND doc_type = %s AND is_default = true LIMIT 1",
                (str(user_id), doc_type)
            )
            row = cur.fetchone()
            if row:
                blocks = row[0] if isinstance(row[0], list) else []
                settings = row[1] if isinstance(row[1], dict) else {}
                return blocks, settings
    except Exception as e:
        logger.error(f'_get_template_blocks error: {e}')
    return [], {}


def _fmt_date_ru(d) -> str:
    months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
    if not d:
        return ''
    try:
        dt = datetime.strptime(str(d)[:10], '%Y-%m-%d')
        return f'{dt.day} {months[dt.month-1]} {dt.year} г.'
    except:
        return str(d)


def _check_block_condition(block: dict, c: dict) -> bool:
    """Проверяет условие показа блока. Если условия нет — показываем всегда."""
    condition = block.get('condition')
    if not condition:
        return True
    field = condition.get('field', '')
    operator = condition.get('operator', 'eq')
    value = condition.get('value', '')

    def get_field_value():
        if field == 'payment_type':
            return str(c.get('payment_type') or '')
        if field == 'has_delivery':
            return 'yes' if float(c.get('delivery_cost') or 0) > 0 else 'no'
        if field == 'has_assembly':
            return 'yes' if float(c.get('assembly_cost') or 0) > 0 else 'no'
        if field == 'has_credit':
            pt = str(c.get('payment_type') or '').lower()
            return 'yes' if pt in ('credit', 'installment') else 'no'
        if field == 'prepaid_percent':
            total = float(c.get('total_amount') or 0)
            prepaid = float(c.get('prepaid_amount') or 0)
            return str(round(prepaid / total * 100) if total > 0 else 0)
        if field == 'total_amount':
            return str(float(c.get('total_amount') or 0))
        return ''

    fval = get_field_value()

    if operator == 'set':
        return bool(fval and fval not in ('', 'no', '0'))
    if operator == 'not_set':
        return not bool(fval and fval not in ('', 'no', '0'))
    if operator == 'eq':
        return fval == value
    if operator == 'neq':
        return fval != value
    if operator == 'gt':
        try: return float(fval) > float(value)
        except: return False
    if operator == 'lt':
        try: return float(fval) < float(value)
        except: return False
    return True


def _apply_vars(text: str, c: dict, company: dict) -> str:
    """Подставляет все переменные {{...}} в текст блока из данных клиента и компании."""
    import re

    def addr(prefix):
        parts = [c.get(f'{prefix}_city',''), c.get(f'{prefix}_street',''), c.get(f'{prefix}_house','')]
        apt = c.get(f'{prefix}_apt','')
        floor = c.get(f'{prefix}_floor','')
        entrance = c.get(f'{prefix}_entrance','')
        if apt:      parts.append(f'кв. {apt}')
        if floor:    parts.append(f'эт. {floor}')
        if entrance: parts.append(f'подъезд {entrance}')
        return ', '.join(p for p in parts if p) or '___________'

    def reg_addr():
        r = str(c.get('registration_address') or '').strip()
        if r: return r
        parts = [c.get('reg_city',''), c.get('reg_street',''), c.get('reg_house','')]
        apt = c.get('reg_apt','')
        if apt: parts.append(f'кв. {apt}')
        return ', '.join(p for p in parts if p) or '___________'

    fname = _full_name(c)
    total    = float(c.get('total_amount') or 0)
    prepaid  = float(c.get('prepaid_amount') or 0)
    balance  = float(c.get('balance_due') or 0) or max(0.0, total - prepaid)
    delivery = float(c.get('delivery_cost') or 0)
    assembly = float(c.get('assembly_cost') or 0)

    payment_map = {
        'cash': 'наличные', 'card': 'банковская карта',
        'transfer': 'безналичный перевод', 'credit': 'рассрочка',
        'installment': 'рассрочка (магазин)',
    }

    def _fmt_words_no_rub(n):
        return _num_to_words(int(round(float(n or 0)))).replace(' рублей','').replace(' рубль','').replace(' рубля','').strip()

    replacements = {
        # ── Клиент ──────────────────────────────────────────────
        '{{имя_клиента}}':           fname,
        '{{имя_клиента_рп}}':        _genitive_name(fname),
        '{{фамилия}}':               str(c.get('last_name','') or ''),
        '{{имя}}':                   str(c.get('first_name','') or ''),
        '{{отчество}}':              str(c.get('middle_name','') or ''),
        '{{телефон_клиента}}':       str(c.get('phone','') or ''),
        '{{телефон}}':               str(c.get('phone','') or ''),
        '{{телефон2_клиента}}':      str(c.get('phone2','') or ''),
        '{{телефон2}}':              str(c.get('phone2','') or ''),
        '{{email_клиента}}':         str(c.get('email','') or ''),
        '{{email}}':                 str(c.get('email','') or ''),
        '{{мессенджер}}':            str(c.get('messenger','') or ''),
        # ── Паспорт ─────────────────────────────────────────────
        '{{паспорт}}':               _passport_str(c),
        '{{паспорт_серия}}':         str(c.get('passport_series','') or ''),
        '{{паспорт_номер}}':         str(c.get('passport_number','') or ''),
        '{{паспорт_выдан}}':         str(c.get('passport_issued_by','') or '___________'),
        '{{паспорт_дата}}':          _fmt_date(c.get('passport_date') or c.get('passport_issued_date') or ''),
        '{{паспорт_код}}':           str(c.get('passport_code') or c.get('passport_dept_code') or ''),
        # ── Адреса ──────────────────────────────────────────────
        '{{адрес_регистрации}}':     reg_addr(),
        '{{город_клиента}}':         str(c.get('delivery_city') or c.get('reg_city') or c.get('city') or '___________'),
        '{{адрес_доставки}}':        addr('delivery'),
        '{{город_доставки}}':        str(c.get('delivery_city','') or '___________'),
        '{{улица_доставки}}':        str(c.get('delivery_street','') or '___________'),
        '{{дом_доставки}}':          str(c.get('delivery_house','') or '___________'),
        '{{квартира_доставки}}':     str(c.get('delivery_apt','') or ''),
        '{{этаж_доставки}}':         str(c.get('delivery_floor','') or ''),
        '{{подъезд_доставки}}':      str(c.get('delivery_entrance','') or ''),
        '{{примечание_доставки}}':   str(c.get('delivery_note','') or ''),
        # ── Договор ─────────────────────────────────────────────
        '{{номер_договора}}':        str(c.get('contract_number','') or '___'),
        '{{дата_договора}}':         _fmt_date_full(c.get('contract_date','')),
        '{{дата_договора_кратко}}':  _fmt_date(c.get('contract_date','')),
        '{{сумма}}':                 _fmt_money(total),
        '{{сумма_прописью}}':        _num_to_words(total),
        '{{аванс}}':                 _fmt_money(prepaid),
        '{{аванс_прописью}}':        _num_to_words(prepaid),
        '{{остаток}}':               _fmt_money(balance),
        '{{остаток_прописью}}':      _num_to_words(balance),
        '{{тип_оплаты}}':            payment_map.get(c.get('payment_type',''), str(c.get('payment_type','') or '')),
        '{{схема_оплаты}}':          str(c.get('custom_payment_scheme','') or ''),
        '{{стоимость_доставки}}':    _fmt_money(delivery),
        '{{доставка_прописью}}':     _num_to_words(delivery),
        '{{стоимость_сборки}}':      _fmt_money(assembly),
        '{{сборка_прописью}}':       _num_to_words(assembly),
        # ── Сроки ───────────────────────────────────────────────
        '{{срок_изготовления}}':     str(c.get('production_days','') or ''),
        '{{срок_сборки}}':           str(c.get('assembly_days','') or ''),
        '{{дата_доставки}}':         _fmt_date(c.get('delivery_date','')),
        '{{дата_доставки_полная}}':  _fmt_date_full(c.get('delivery_date','')),
        '{{срок_изготовления_прописью}}': _fmt_words_no_rub(c.get('production_days',0)),
        '{{срок_сборки_прописью}}':       _fmt_words_no_rub(c.get('assembly_days',0)),
        # ── Кредит ──────────────────────────────────────────────
        '{{номер_кредита}}':         str(c.get('credit_contract_number','') or ''),
        '{{дата_кредита}}':          _fmt_date_full(c.get('credit_contract_date','')),
        '{{банк_кредита}}':          str(c.get('credit_bank','') or ''),
        '{{аванс_кредит}}':          _fmt_money(float(c.get('credit_prepaid') or prepaid)),
        '{{остаток_кредит}}':        _fmt_money(float(c.get('credit_balance') or balance)),
        # ── Техпроект ───────────────────────────────────────────
        '{{фото_проекта}}':          str(c.get('tech_image_url','') or ''),
        '{{корпус}}':                str(c.get('tech_korpus','') or ''),
        '{{корпус2}}':               str(c.get('tech_korpus2','') or ''),
        '{{фасад}}':                 str(c.get('tech_fasad1','') or ''),
        '{{фасад2}}':                str(c.get('tech_fasad2','') or ''),
        '{{столешница}}':            str(c.get('tech_stoleshniza','') or ''),
        '{{стеновая}}':              str(c.get('tech_stenovaya','') or ''),
        '{{подсветка}}':             str(c.get('tech_podsvetka_type','') or ''),
        '{{цвет_подсветки}}':        str(c.get('tech_podsvetka_svet','') or ''),
        '{{фрезеровка}}':            str(c.get('tech_frezerovka','') or ''),
        # ── Компания ────────────────────────────────────────────
        '{{компания}}':              _co(company, 'name', '___________'),
        '{{город}}':                 _co(company, 'city', str(c.get('city','') or '')),
        '{{инн}}':                   _co(company, 'inn', ''),
        '{{огрн}}':                  _co(company, 'ogrn', ''),
        '{{кпп}}':                   _co(company, 'kpp', ''),
        '{{инн_кпп}}':               (f"{company.get('inn')}/{company.get('kpp')}" if company.get('kpp') else str(company.get('inn','') or '')).strip(),
        '{{адрес_компании}}':        _co(company, 'address', ''),
        '{{телефон_компании}}':      _co(company, 'phone', ''),
        '{{email_компании}}':        _co(company, 'email', ''),
        '{{сайт_компании}}':         _co(company, 'website', ''),
        '{{директор}}':              _co(company, 'director', ''),
        '{{должность_директора}}':   _co(company, 'directorPosition', ''),
        '{{банк}}':                  _co(company, 'bank', ''),
        '{{бик}}':                   _co(company, 'bik', ''),
        '{{расчётный_счёт}}':        _co(company, 'rs', ''),
        '{{корр_счёт}}':             _co(company, 'ks', ''),
        # ── Ответственные ───────────────────────────────────────
        '{{менеджер}}':              str(c.get('manager_name','') or '___________'),
        '{{менеджер_рп}}':           _genitive_name(str(c.get('manager_name','') or '')) if c.get('manager_name') else '___________',
        '{{дизайнер}}':              str(c.get('designer_name') or c.get('designer','') or '___________'),
        '{{замерщик}}':              str(c.get('measurer','') or ''),
        '{{номер_доверенности}}':    str(c.get('manager_poa_number','') or '____'),
        '{{дата_доверенности}}':     _fmt_date(c.get('manager_poa_date','')),
    }
    def replace_var(m):
        key = '{{' + m.group(1).strip() + '}}'
        return replacements.get(key, m.group(0))
    return re.sub(r'\{\{([^}]+)\}\}', replace_var, text)


def _get_client_projects(user_id: str, client: dict) -> list:
    """Получает проекты клиента из app_state по project_ids."""
    project_ids = client.get('project_ids') or []
    if not project_ids:
        return []
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT state FROM app_state WHERE user_id = %s LIMIT 1", (str(user_id),))
            row = cur.fetchone()
            if not row or not row[0]:
                return []
            state = row[0] if isinstance(row[0], dict) else {}
            all_projects = state.get('projects') or []
            return [p for p in all_projects if p.get('id') in project_ids]
    except Exception as e:
        logger.error(f'_get_client_projects error: {e}')
        return []


def _render_calc_table_html(block: dict, projects: list, global_font_size: float) -> str:
    """Строит HTML-таблицу спецификации из данных проектов клиента."""
    cts = block.get('calcTableSettings') or {}
    columns = cts.get('columns') or ['name', 'qty', 'unit', 'total']
    show_block_headers = cts.get('showBlockHeaders', True)
    show_services = cts.get('showServices', True)
    show_total = cts.get('showTotal', True)
    price_mode = cts.get('priceMode', 'client')
    mt = block.get('marginTop')
    mb = block.get('marginBottom')
    mt_s = f'margin-top:{mt}mm;' if mt is not None else 'margin-top:6px;'
    mb_s = f'margin-bottom:{mb}mm;' if mb is not None else 'margin-bottom:6px;'
    fs = block.get('fontSize') or global_font_size

    col_labels = {
        'name': 'Наименование', 'qty': 'Кол-во', 'unit': 'Ед.',
        'price': 'Цена', 'total': 'Сумма', 'article': 'Артикул',
        'manufacturer': 'Производитель',
    }

    def fmt_num(n):
        try:
            v = float(n or 0)
            return f'{int(v):,}'.replace(',', '\u202f') if v == int(v) else f'{v:,.2f}'.replace(',', '\u202f')
        except:
            return str(n or '')

    th_style = f'border:1px solid #999;padding:3px 5px;background:#f0f0f0;font-weight:bold;font-size:{fs}pt;text-align:left'
    td_style = f'border:1px solid #ddd;padding:2px 5px;font-size:{fs}pt'
    grand_total = 0.0
    rows_html = ''

    ths = ''.join([f'<th style="{th_style}">{col_labels.get(c, c)}</th>' for c in columns])

    for proj in projects:
        proj_name = proj.get('object') or proj.get('client') or ''
        # Блоки материалов
        for blk in (proj.get('blocks') or []):
            blk_name = blk.get('name') or ''
            if show_block_headers and proj_name:
                label = f'{proj_name} — {blk_name}' if blk_name else proj_name
                rows_html += f'<tr><td colspan="{len(columns)}" style="{td_style};font-weight:bold;background:#f5f5f5">{label}</td></tr>'
            elif show_block_headers and blk_name:
                rows_html += f'<tr><td colspan="{len(columns)}" style="{td_style};font-weight:bold;background:#f5f5f5">{blk_name}</td></tr>'

            for row in (blk.get('rows') or []):
                name = row.get('name') or ''
                if not name:
                    continue
                qty = float(row.get('qty') or 0)
                unit = row.get('unit') or ''
                price = float(row.get('basePrice') if price_mode == 'base' else row.get('price') or 0)
                total = round(qty * price, 2)
                grand_total += total
                article = row.get('article') or ''
                manufacturer = row.get('manufacturerId') or ''

                def cell(col):
                    if col == 'name': return name
                    if col == 'qty': return fmt_num(qty)
                    if col == 'unit': return unit
                    if col == 'price': return fmt_num(price)
                    if col == 'total': return fmt_num(total)
                    if col == 'article': return article
                    if col == 'manufacturer': return manufacturer
                    return ''
                rows_html += '<tr>' + ''.join([f'<td style="{td_style}">{cell(c)}</td>' for c in columns]) + '</tr>'

        # Блоки услуг
        if show_services:
            for sblk in (proj.get('serviceBlocks') or []):
                sblk_name = sblk.get('name') or 'Услуги'
                has_rows = any(r.get('name') for r in (sblk.get('rows') or []))
                if not has_rows:
                    continue
                if show_block_headers:
                    rows_html += f'<tr><td colspan="{len(columns)}" style="{td_style};font-weight:bold;background:#f5f5f5">{sblk_name}</td></tr>'
                for row in (sblk.get('rows') or []):
                    name = row.get('name') or ''
                    if not name:
                        continue
                    qty = float(row.get('qty') or 0)
                    unit = row.get('unit') or ''
                    price = float(row.get('price') or 0)
                    total = round(qty * price, 2)
                    grand_total += total

                    def scell(col):
                        if col == 'name': return name
                        if col == 'qty': return fmt_num(qty)
                        if col == 'unit': return unit
                        if col == 'price': return fmt_num(price)
                        if col == 'total': return fmt_num(total)
                        return ''
                    rows_html += '<tr>' + ''.join([f'<td style="{td_style}">{scell(c)}</td>' for c in columns]) + '</tr>'

    if not rows_html:
        rows_html = f'<tr><td colspan="{len(columns)}" style="{td_style};color:#999;font-style:italic">Нет данных расчёта</td></tr>'

    total_row = ''
    if show_total:
        total_row = f'<tr><td colspan="{len(columns)-1}" style="{th_style};text-align:right">Итого:</td><td style="{th_style}">{fmt_num(grand_total)} ₽</td></tr>'

    return f'''<div style="{mt_s}{mb_s}">
<table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:{fs}pt">
  <tr>{ths}</tr>
  {rows_html}
  {total_row}
</table>
</div>'''


def _render_block_html(block: dict, global_font_size: float, c: dict, company: dict, projects: list = None) -> str:
    """Рендерит один блок шаблона в HTML с подстановкой переменных."""
    btype = block.get('type', 'paragraph')
    content = _apply_vars(block.get('content', ''), c, company)
    fs = block.get('fontSize') or global_font_size
    bold = block.get('bold', False)
    italic = block.get('italic', False)
    underline = block.get('underline', False)
    align = block.get('align', 'left')
    mt = block.get('marginTop')
    mb = block.get('marginBottom')
    mt_s = f'margin-top:{mt}mm;' if mt is not None else ''
    mb_s = f'margin-bottom:{mb}mm;' if mb is not None else ''

    def base_style(extra=''):
        parts = [f'font-size:{fs}pt']
        if bold: parts.append('font-weight:bold')
        if italic: parts.append('font-style:italic')
        if underline: parts.append('text-decoration:underline')
        if align: parts.append(f'text-align:{align}')
        if mt is not None: parts.append(f'margin-top:{mt}mm')
        if mb is not None: parts.append(f'margin-bottom:{mb}mm')
        if extra: parts.append(extra)
        return ';'.join(parts)

    if btype == 'divider':
        return f'<hr style="border:none;border-top:1px solid #000;{mt_s or "margin-top:8px;"}{mb_s or "margin-bottom:8px;"}" />'
    if btype == 'spacer':
        h = content or '20'
        return f'<div style="height:{h}px;{mt_s}{mb_s}"></div>'
    if btype == 'lines':
        count = int(content) if content.isdigit() else 6
        lines = ''.join(['<div style="border-bottom:1px solid #000;height:22px;margin-bottom:4px"></div>'] * count)
        return f'<div style="{mt_s}{mb_s}">{lines}</div>'
    if btype == 'image':
        url = content or ''
        col_widths = block.get('colWidths')
        w_s = f'max-width:{col_widths}mm;' if col_widths else 'max-width:100%;'
        wrap = f'text-align:{align};{mt_s or "margin-top:6px;"}{mb_s or "margin-bottom:6px;"}'
        if not url:
            return f'<div style="{wrap};border:1px dashed #ccc;padding:20px;color:#999;font-size:9pt">[Фото технического проекта]</div>'
        return f'<div style="{wrap}"><img src="{url}" style="{w_s}max-height:180mm;object-fit:contain;" /></div>'
    if btype == 'table':
        rows_raw = [r for r in content.split('\n') if r.strip()]
        if not rows_raw:
            return ''
        header = rows_raw[0].split(';')
        body_rows = rows_raw[1:]
        col_widths = block.get('colWidths')
        if not col_widths or len(col_widths) != len(header):
            col_widths = [round(100 / len(header))] * len(header)
        col_aligns = block.get('colAligns') or []
        if len(col_aligns) != len(header):
            col_aligns = ['left'] * len(header)
        row_height = block.get('rowHeight')
        rh_s = f'height:{row_height}mm;' if row_height else ''
        cell_pad = 'padding:0 5px;vertical-align:middle;' if row_height else 'padding:3px 5px;'
        colgroup = ''.join([f'<col style="width:{w}%"/>' for w in col_widths])
        t_style = f'width:100%;border-collapse:collapse;table-layout:fixed;font-size:{fs}pt;{mt_s or "margin-top:6px;"}{mb_s or "margin-bottom:6px;"}'
        ths = ''.join([f'<th style="border:1px solid #000;{cell_pad}background:#f0f0f0;font-weight:bold;word-break:break-word;text-align:{col_aligns[i]}">{h}</th>' for i, h in enumerate(header)])
        trs = ''.join([
            f'<tr style="{rh_s}">' + ''.join([f'<td style="border:1px solid #000;{cell_pad}word-break:break-word;text-align:{col_aligns[i] if i < len(col_aligns) else "left"}">{cell}</td>' for i, cell in enumerate(row.split(';'))]) + '</tr>'
            for row in body_rows
        ])
        return f'<table style="{t_style}"><colgroup>{colgroup}</colgroup><tr style="{rh_s}">{ths}</tr>{trs}</table>'
    if btype == 'section':
        s_style = f'font-weight:bold;text-align:{align or "center"};font-size:{fs}pt;{mt_s or "margin-top:8px;"}{mb_s or "margin-bottom:3px;"}'
        if italic: s_style += ';font-style:italic'
        if underline: s_style += ';text-decoration:underline'
        return f'<p style="{s_style}">{content}</p>'
    if btype == 'header':
        h_style = f'text-align:{align or "center"};font-size:{fs}pt;{mt_s}{mb_s}'
        if bold: h_style += ';font-weight:bold'
        if italic: h_style += ';font-style:italic'
        if underline: h_style += ';text-decoration:underline'
        return f'<p style="{h_style}">{content}</p>'
    if btype == 'two_col':
        sep = content.find('\n---\n')
        left_raw  = content[:sep]  if sep >= 0 else content
        right_raw = content[sep+5:] if sep >= 0 else ''
        left_html  = left_raw.replace('\n', '<br/>')
        right_html = right_raw.replace('\n', '<br/>')
        gap = block.get('twoColGap', 4)
        left_align  = block.get('twoColLeftAlign', 'left')
        right_align = block.get('twoColRightAlignVal') or ('right' if block.get('twoColRightAlign') else 'left')
        wrap_style = f'font-size:{fs}pt;{mt_s or "margin-top:6px;"}{mb_s or "margin-bottom:6px;"}'
        if bold:      wrap_style += ';font-weight:bold'
        if italic:    wrap_style += ';font-style:italic'
        if underline: wrap_style += ';text-decoration:underline'
        return (f'<div style="display:table;width:100%;{wrap_style}">'
                f'<div style="display:table-cell;width:50%;vertical-align:top;padding-right:{gap}mm;text-align:{left_align}">{left_html}</div>'
                f'<div style="display:table-cell;width:50%;vertical-align:top;padding-left:{gap}mm;text-align:{right_align}">{right_html}</div>'
                f'</div>')
    if btype == 'calc_table':
        return _render_calc_table_html(block, projects or [], global_font_size)
    # paragraph / default
    content_html = content.replace('\n', '<br/>')
    return f'<p style="{base_style()}">{content_html}</p>'


def _build_letterhead_html(settings: dict, company: dict, c: dict) -> tuple:
    """Возвращает (header_html, footer_html, extra_css, header_h_mm, footer_h_mm) для бланка."""
    lh_id = settings.get('letterhead', 'none')
    if not lh_id or lh_id == 'none':
        return '', '', '', 0, 0

    accent = settings.get('accentColor', '#c0392b')

    def lh_val(key, fallback_var):
        v = settings.get(key, '')
        if v:
            return v
        # применяем переменные компании напрямую
        return {
            '{{компания}}': company.get('name', ''),
            '{{телефон_компании}}': company.get('phone', ''),
            '{{email_компании}}': company.get('email', ''),
            '{{адрес_компании}}': company.get('address', ''),
            '{{сайт_компании}}': company.get('website', ''),
        }.get(fallback_var, '')

    co_name    = lh_val('lhCompany', '{{компания}}')
    co_phone   = lh_val('lhPhone',   '{{телефон_компании}}')
    co_email   = lh_val('lhEmail',   '{{email_компании}}')
    co_address = lh_val('lhAddress', '{{адрес_компании}}')
    co_website = lh_val('lhWebsite', '{{сайт_компании}}')
    logo_url   = settings.get('lhLogoUrl', '')
    logo_pos   = settings.get('lhLogoPosition', 'left')
    logo_h     = settings.get('lhLogoHeight', 12)
    logo_tag   = f'<img src="{logo_url}" style="height:{logo_h}mm;width:auto;object-fit:contain;display:block" />' if logo_url else ''

    def hex2rgb(h):
        h = h.lstrip('#')
        return f'{int(h[0:2],16)},{int(h[2:4],16)},{int(h[4:6],16)}'

    rgb = hex2rgb(accent)
    header_h, footer_h = 18, 14

    if lh_id == 'classic':
        logo_above = ''
        logo_left = logo_right = ''
        if logo_url:
            if logo_pos in ('left', 'center', 'right'):
                logo_above = f'<div style="text-align:{logo_pos};margin-bottom:3mm">{logo_tag}</div>'
                header_h += logo_h + 3
            elif logo_pos == 'header-left':
                logo_left = f'<div style="margin-right:4mm">{logo_tag}</div>'
            elif logo_pos == 'header-right':
                logo_right = f'<div style="margin-left:4mm">{logo_tag}</div>'
        header = (f'<div style="border-top:3px solid {accent};margin-bottom:0"></div>'
                  f'{logo_above}'
                  f'<div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:4mm;margin-bottom:5mm;border-bottom:1.5px solid {accent}">'
                  f'{logo_left}<div style="font-size:10.5pt;font-weight:bold;letter-spacing:0.04em;text-transform:uppercase">'
                  f'<span style="display:inline-block;width:10px;height:10px;background:{accent};margin-right:6px;vertical-align:middle"></span>'
                  f'{co_name or "КОМПАНИЯ"}</div>{logo_right}</div>')
        footer_items = ''.join([
            f'<div style="display:flex;align-items:center;gap:2mm"><div style="width:5px;height:5px;border-radius:50%;background:{accent};flex-shrink:0"></div><span>{v}</span></div>'
            for v in [co_phone, co_email, co_address, co_website] if v
        ])
        footer = (f'<div style="position:absolute;bottom:6mm;left:0;right:0;padding:3mm 10mm 0;border-top:1px solid rgba({rgb},0.35);display:flex;gap:8mm;font-size:7.5pt;color:#666">'
                  f'{footer_items}</div>'
                  f'<div style="position:absolute;bottom:0;right:0;width:0;height:0;border-style:solid;border-width:0 0 22mm 22mm;border-color:transparent transparent {accent} transparent"></div>')
        css = f'.lh-page{{border:1.2px solid #d0d0d0}}'

    elif lh_id == 'corporate':
        logo_in_header = logo_pos in ('header-left', 'header-right')
        logo_above = '' if logo_in_header else (f'<div style="text-align:{logo_pos};margin-bottom:3mm">{logo_tag}</div>' if logo_url else '')
        if logo_in_header and logo_url:
            logo_tag_white = f'<img src="{logo_url}" style="height:{logo_h}mm;width:auto;object-fit:contain;filter:brightness(0) invert(1);opacity:0.9" />'
        else:
            logo_tag_white = ''
        header_h = 22 + (logo_h + 3 if logo_url and not logo_in_header else 0)
        footer_h = 11
        header = (f'<div style="position:absolute;top:0;left:0;bottom:0;width:6mm;background:{accent}"></div>'
                  f'{logo_above}'
                  f'<div style="background:{accent};margin-bottom:7mm;padding:4mm 6mm 4mm 8mm;display:flex;align-items:center;justify-content:space-between">'
                  f'{"<div style=margin-right:5mm>" + logo_tag_white + "</div>" if logo_pos == "header-left" and logo_tag_white else ""}'
                  f'<div><div style="font-size:11pt;font-weight:bold;color:#fff;letter-spacing:0.05em;text-transform:uppercase">{co_name or "КОМПАНИЯ"}</div>'
                  f'{"<div style=font-size:7.5pt;color:rgba(255,255,255,0.75);margin-top:1mm>" + co_website + "</div>" if co_website else ""}</div>'
                  f'{"<div style=margin-left:auto>" + logo_tag_white + "</div>" if logo_pos == "header-right" and logo_tag_white else ""}'
                  f'</div>')
        footer_parts = ''.join([
            f'<div style="font-size:7.5pt;color:rgba(255,255,255,0.9)">{v}</div>'
            for v in [co_phone, co_email, co_address] if v
        ])
        footer = (f'<div style="position:absolute;bottom:0;left:0;right:0;background:{accent};padding:2.5mm 6mm 2.5mm 14mm;display:flex;gap:6mm;align-items:center">'
                  f'{footer_parts}</div>')
        css = ''

    elif lh_id == 'elegant':
        logo_above = ''
        if logo_url and logo_pos not in ('header-left', 'header-right'):
            logo_above = f'<div style="text-align:{logo_pos if logo_pos else "center"};margin-bottom:2mm">{logo_tag}</div>'
            header_h += logo_h + 2
        else:
            header_h = 22
        footer_h = 12
        sub = ' · '.join(v for v in [co_phone, co_email] if v)
        header = (f'<div style="position:absolute;top:4mm;left:4mm;right:4mm;bottom:4mm;border:1.5px solid {accent};pointer-events:none"></div>'
                  f'<div style="position:absolute;top:6mm;left:6mm;right:6mm;bottom:6mm;border:0.5px solid rgba({rgb},0.4);pointer-events:none"></div>'
                  f'<div style="position:absolute;top:3mm;left:3mm;width:8mm;height:8mm;border-top:2.5px solid {accent};border-left:2.5px solid {accent}"></div>'
                  f'<div style="position:absolute;top:3mm;right:3mm;width:8mm;height:8mm;border-top:2.5px solid {accent};border-right:2.5px solid {accent}"></div>'
                  f'<div style="position:absolute;bottom:3mm;left:3mm;width:8mm;height:8mm;border-bottom:2.5px solid {accent};border-left:2.5px solid {accent}"></div>'
                  f'<div style="position:absolute;bottom:3mm;right:3mm;width:8mm;height:8mm;border-bottom:2.5px solid {accent};border-right:2.5px solid {accent}"></div>'
                  f'<div style="text-align:center;padding-bottom:5mm;margin-bottom:5mm;border-bottom:0.8px solid rgba({rgb},0.4)">'
                  f'{logo_above}'
                  f'<div style="font-size:11pt;font-weight:bold;letter-spacing:0.12em;text-transform:uppercase;color:{accent}">{co_name or "КОМПАНИЯ"}</div>'
                  f'{"<div style=font-size:7.5pt;color:#888;margin-top:1.5mm>" + sub + "</div>" if sub else ""}'
                  f'</div>')
        parts = [v for v in [co_phone, co_email, co_address, co_website] if v]
        footer = (f'<div style="position:absolute;bottom:10mm;left:0;right:0;padding:2.5mm 14mm 0;border-top:0.8px solid rgba({rgb},0.3);text-align:center;font-size:7.5pt;color:#777">'
                  f'{" | ".join(parts)}</div>') if parts else ''
        css = ''

    else:  # minimal
        logo_above = ''
        logo_in_header = logo_pos in ('header-left', 'header-right')
        if logo_url and not logo_in_header:
            logo_above = f'<div style="text-align:{logo_pos};margin-bottom:3mm">{logo_tag}</div>'
            header_h += logo_h + 3
        else:
            header_h = 18
        footer_h = 10
        logo_left_tag  = logo_tag if (logo_url and logo_pos == 'header-left')  else ''
        logo_right_tag = logo_tag if (logo_url and logo_pos == 'header-right') else ''
        contact = '<br/>'.join(v for v in [co_phone, co_email] if v)
        header = (f'{logo_above}'
                  f'<div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:3mm;margin-bottom:6mm;border-bottom:1px solid #e0e0e0;gap:4mm">'
                  f'<div style="display:flex;align-items:center;gap:4mm">'
                  f'{"<div style=margin-right:2mm>" + logo_left_tag + "</div>" if logo_left_tag else ""}'
                  f'<div><div style="font-size:10.5pt;font-weight:bold">{co_name or "КОМПАНИЯ"}</div>'
                  f'<div style="width:20mm;height:2px;background:{accent};margin-top:2mm"></div></div></div>'
                  f'<div style="display:flex;align-items:center;gap:4mm">'
                  f'<div style="font-size:7.5pt;color:#888;text-align:right;line-height:1.5">{contact}</div>'
                  f'{logo_right_tag}</div></div>')
        footer_parts = [v for v in [co_address, co_website] if v]
        footer = (f'<div style="position:absolute;bottom:8mm;left:0;right:0;padding:0 8mm;display:flex;justify-content:space-between;font-size:7.5pt;color:#aaa">'
                  f'<span style="color:{accent};font-weight:bold">{co_name or ""}</span>'
                  f'<span>{" · ".join(footer_parts)}</span></div>') if footer_parts else ''
        css = f'body{{border-left:4px solid {accent}}}'

    return header, footer, css, header_h, footer_h


def _render_template_html(blocks: list, settings: dict, c: dict, company: dict, fallback_html: str, projects: list = None) -> str:
    """Строит полный HTML из пользовательских блоков шаблона.
    Если блоков нет — возвращает fallback_html (старую жёсткую вёрстку)."""
    enabled_blocks = [b for b in blocks if b.get('enabled', True) and _check_block_condition(b, c)]
    if not enabled_blocks:
        return fallback_html

    global_font_size = float(settings.get('fontSize', 9.5))
    line_height = float(settings.get('lineHeight', 1.0))
    font_family = settings.get('fontFamily', 'Times New Roman')
    m_left   = settings.get('marginLeft', 20)
    m_right  = settings.get('marginRight', 10)
    m_top    = settings.get('marginTop', 10)
    m_bottom = settings.get('marginBottom', 10)
    landscape = settings.get('orientation', '') == 'landscape'
    page_w = '297mm' if landscape else '210mm'
    page_h = '210mm' if landscape else '297mm'

    lh_header, lh_footer, lh_css, lh_header_h, lh_footer_h = _build_letterhead_html(settings, company, c)
    pad_top    = float(m_top) + lh_header_h
    pad_bottom = float(m_bottom) + lh_footer_h

    rendered = '\n'.join([_render_block_html(b, global_font_size, c, company, projects) for b in enabled_blocks])

    return f'''<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  @page{{size:{page_w} {page_h};margin:0}}
  *{{box-sizing:border-box}}
  html{{background:#e8e8e8;min-height:100vh}}
  body{{font-family:'{font_family}',serif;line-height:{line_height};margin:12px auto;padding:{pad_top}mm {m_right}mm {pad_bottom}mm {m_left}mm;font-size:{global_font_size}pt;background:#fff;width:{page_w};box-shadow:0 4px 20px rgba(0,0,0,.3);position:relative}}
  p{{margin:0 0 2px;white-space:pre-wrap;orphans:3;widows:3}}
  p.sec{{font-weight:bold;page-break-after:avoid}}
  table{{border-collapse:collapse;page-break-inside:avoid}}
  @media print{{html{{background:#fff}}body{{margin:0;box-shadow:none;width:auto;overflow:visible}}}}
  {lh_css}
</style>
</head><body>{lh_header}{rendered}{lh_footer}</body></html>'''



