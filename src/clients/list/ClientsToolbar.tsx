import Icon from '@/components/ui/icon';
import type { Client } from '../types';
import { CLIENT_STATUSES, clientFullName } from '../types';
import * as XLSX from 'xlsx';

type View = 'list' | 'kanban';

// ── Экспорт CSV ─────────────────────────────────────────────────
function exportCSV(clients: Client[]) {
  const headers = ['Имя', 'Телефон', 'Статус', 'Дизайнер', 'Замерщик', 'Договор №', 'Сумма', 'Дата доставки', 'Дата создания'];
  const rows = clients.map(c => [
    clientFullName(c),
    c.phone || '',
    CLIENT_STATUSES.find(s => s.id === c.status)?.label || c.status,
    c.designer || '',
    c.measurer || '',
    c.contract_number || '',
    c.total_amount ? String(c.total_amount) : '',
    c.delivery_date || '',
    c.created_at?.slice(0, 10) || '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `clients_${new Date().toISOString().slice(0,10)}.csv`; a.click();
}

// ── Экспорт Excel ───────────────────────────────────────────────
function exportExcel(clients: Client[]) {
  const headers = ['Имя', 'Телефон', 'Доп. телефон', 'Email', 'Статус', 'Дизайнер', 'Замерщик',
    'Договор №', 'Дата договора', 'Сумма', 'Схема оплаты', 'Внесено', 'Остаток',
    'Дата доставки', 'Город доставки', 'Адрес доставки',
    'Комментарий', 'Дата создания'];
  const rows = clients.map(c => [
    clientFullName(c),
    c.phone || '',
    c.phone2 || '',
    c.email || '',
    CLIENT_STATUSES.find(s => s.id === c.status)?.label || c.status,
    c.designer || '',
    c.measurer || '',
    c.contract_number || '',
    c.contract_date || '',
    c.total_amount || 0,
    c.payment_type || '',
    c.prepaid_amount || 0,
    Math.max(0, (c.total_amount || 0) - (c.prepaid_amount || 0)),
    c.delivery_date || '',
    c.delivery_city || '',
    [c.delivery_street, c.delivery_house, c.delivery_apt ? `кв.${c.delivery_apt}` : ''].filter(Boolean).join(', '),
    c.comment || '',
    c.created_at?.slice(0, 10) || '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [22,16,14,22,14,14,14,14,14,12,18,12,12,14,16,24,30,14].map(w => ({ wch: w }));
  headers.forEach((_, i) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })];
    if (cell) cell.s = { font: { bold: true }, fill: { fgColor: { rgb: 'F3E6C8' } } };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Клиенты');
  XLSX.writeFile(wb, `clients_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ── Компонент шапки ─────────────────────────────────────────────
interface Props {
  clientsCount: number;
  loading: boolean;
  view: View;
  onViewChange: (v: View) => void;
  filteredClients: Client[];
  creating: boolean;
  onCreate: () => void;
}

export function ClientsToolbar({ clientsCount, loading, view, onViewChange, filteredClients, creating, onCreate }: Props) {
  return (
    <div className="border-b border-border bg-[hsl(220,14%,11%)] px-6 py-4 flex items-center gap-4 shrink-0">
      <div className="min-w-0 flex-1">
        <h1 className="text-base font-semibold text-foreground">Клиенты</h1>
        <p className="text-[hsl(var(--text-muted))] text-xs mt-0.5">
          {loading ? 'Загрузка...' : `${clientsCount} клиентов`}
        </p>
      </div>
      {/* Переключатель вида */}
      <div className="flex items-center gap-1 bg-[hsl(220,12%,14%)] rounded p-0.5">
        <button onClick={() => onViewChange('list')} className={`px-2.5 py-1.5 rounded text-xs transition-colors ${view === 'list' ? 'bg-[hsl(220,12%,20%)] text-foreground' : 'text-[hsl(var(--text-muted))] hover:text-foreground'}`}>
          <Icon name="List" size={13} />
        </button>
        <button onClick={() => onViewChange('kanban')} className={`px-2.5 py-1.5 rounded text-xs transition-colors ${view === 'kanban' ? 'bg-[hsl(220,12%,20%)] text-foreground' : 'text-[hsl(var(--text-muted))] hover:text-foreground'}`}>
          <Icon name="Columns3" size={13} />
        </button>
      </div>
      {/* Экспорт */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => exportExcel(filteredClients)}
          title="Экспорт в Excel (.xlsx)"
          className="flex items-center gap-1.5 px-3 py-2 border border-border rounded text-xs text-[hsl(var(--text-muted))] hover:text-emerald-400 hover:border-emerald-400/50 transition-colors"
        >
          <Icon name="FileSpreadsheet" size={13} /> Excel
        </button>
        <button
          onClick={() => exportCSV(filteredClients)}
          title="Экспорт в CSV"
          className="flex items-center gap-1.5 px-3 py-2 border border-border rounded text-xs text-[hsl(var(--text-muted))] hover:text-gold hover:border-gold/50 transition-colors"
        >
          <Icon name="FileDown" size={13} /> CSV
        </button>
      </div>
      {/* Создать */}
      <button onClick={onCreate} disabled={creating}
        className="flex items-center gap-2 px-4 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 shrink-0 disabled:opacity-60">
        <Icon name="Plus" size={14} /> Новый клиент
      </button>
    </div>
  );
}
