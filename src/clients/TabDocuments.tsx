import { useState } from 'react';
import Icon from '@/components/ui/icon';
import type { Client } from './types';
import { clientFullName } from './types';
import { toast } from 'sonner';

const API = 'https://functions.poehali.dev/48534318-9b07-4f30-9a75-98efb43248e7';

function getToken() {
  return localStorage.getItem('kuhni_pro_token') || '';
}

function apiUrl(action: string, clientId: string, doc: string) {
  return `${API}/?action=${action}&client_id=${clientId}&doc=${doc}&token=${encodeURIComponent(getToken())}`;
}

type DocType = 'contract' | 'act' | 'tech' | 'delivery' | 'assembly' | 'rules' | 'act_delivery' | 'act_assembly' | 'addendum' | 'delivery_calc' | 'delivery_lift' | 'assembly_calc' | 'assembly_extra' | 'tech_spec';

interface DocDef {
  id: DocType;
  title: string;
  subtitle: string;
  icon: string;
  appendix: string;
  group: string;
}

const DOCS: DocDef[] = [
  {
    id: 'contract',
    title: 'Договор бытового подряда',
    subtitle: 'Основной договор на изготовление мебели',
    icon: 'FileText',
    appendix: '',
    group: 'Изготовление',
  },
  {
    id: 'tech',
    title: 'Технический проект',
    subtitle: 'Приложение № 1 — характеристики изделия',
    icon: 'Ruler',
    appendix: 'Прил. №1',
    group: 'Изготовление',
  },
  {
    id: 'act',
    title: 'Акт выполненных работ',
    subtitle: 'Приложение № 4 — приёмка мебели',
    icon: 'ClipboardCheck',
    appendix: 'Прил. №4',
    group: 'Изготовление',
  },
  {
    id: 'rules',
    title: 'Правила эксплуатации',
    subtitle: 'Приложение № 3 — уход за мебелью и гарантия',
    icon: 'BookOpen',
    appendix: 'Прил. №3',
    group: 'Изготовление',
  },
  {
    id: 'delivery',
    title: 'Договор доставки',
    subtitle: 'Договор на оказание услуг по доставке мебели',
    icon: 'Truck',
    appendix: '',
    group: 'Доставка и монтаж',
  },
  {
    id: 'act_delivery',
    title: 'Акт приёма доставки',
    subtitle: 'Приёмка мебели по факту доставки',
    icon: 'PackageCheck',
    appendix: '',
    group: 'Доставка и монтаж',
  },
  {
    id: 'assembly',
    title: 'Договор монтажа',
    subtitle: 'Договор на сборку и монтаж мебели',
    icon: 'Wrench',
    appendix: '',
    group: 'Доставка и монтаж',
  },
  {
    id: 'act_assembly',
    title: 'Акт приёма сборки',
    subtitle: 'Приёмка выполненных работ по монтажу',
    icon: 'ClipboardList',
    appendix: '',
    group: 'Доставка и монтаж',
  },
  {
    id: 'delivery_calc',
    title: 'Калькуляция доставки',
    subtitle: 'Приложение № 1 к договору доставки',
    icon: 'Calculator',
    appendix: 'Прил. №1',
    group: 'Доставка и монтаж',
  },
  {
    id: 'delivery_lift',
    title: 'Прайс подъём мебели',
    subtitle: 'Приложение № 2 к договору доставки',
    icon: 'ArrowUpFromLine',
    appendix: 'Прил. №2',
    group: 'Доставка и монтаж',
  },
  {
    id: 'assembly_calc',
    title: 'Калькуляция сборки',
    subtitle: 'Приложение № 1 к договору монтажа',
    icon: 'Calculator',
    appendix: 'Прил. №1',
    group: 'Сборка',
  },
  {
    id: 'assembly_extra',
    title: 'Прайс доп. работ',
    subtitle: 'Приложение № 2 к договору монтажа',
    icon: 'ListPlus',
    appendix: 'Прил. №2',
    group: 'Сборка',
  },
  {
    id: 'addendum',
    title: 'Дополнительное соглашение',
    subtitle: 'К договору бытового подряда на изготовление мебели',
    icon: 'FilePlus2',
    appendix: '',
    group: 'Прочее',
  },
  {
    id: 'tech_spec',
    title: 'Спецификация на технику',
    subtitle: 'Приложение к договору бытового подряда',
    icon: 'Tv',
    appendix: '',
    group: 'Прочее',
  },
];

function DocCard({ doc, clientId, clientName, onSave, hasDraft, onAfterShare }: {
  doc: DocDef;
  clientId: string;
  clientName: string;
  onSave?: () => Promise<void>;
  hasDraft?: boolean;
  onAfterShare?: (channel: string) => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function ensureSaved() {
    if (hasDraft && onSave) {
      await onSave();
    }
  }

  async function openPreview() {
    setLoading('preview');
    try {
      await ensureSaved();
      const url = apiUrl('doc_html', clientId, doc.id);
      window.open(url, '_blank');
    } finally {
      setLoading(null);
    }
  }

  async function downloadDocx() {
    setLoading('docx');
    try {
      await ensureSaved();
      const res = await fetch(apiUrl('doc_docx', clientId, doc.id));
      const data = await res.json();
      if (data.url) {
        const a = document.createElement('a');
        a.href = data.url;
        a.download = `${doc.title} — ${clientName}.docx`;
        a.click();
        toast.success('Word-файл готов');
      } else {
        toast.error('Ошибка генерации файла');
      }
    } catch {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(null);
    }
  }

  async function printPdf() {
    setLoading('pdf');
    try {
      await ensureSaved();
      const url = apiUrl('doc_html', clientId, doc.id);
      const win = window.open(url, '_blank');
      if (win) {
        win.addEventListener('load', () => {
          setTimeout(() => { win.print(); }, 500);
        });
      }
      toast.success('Откройте "Сохранить как PDF" в диалоге печати');
    } finally {
      setLoading(null);
    }
  }

  async function copyLink() {
    setLoading('link');
    try {
      await ensureSaved();
      const res = await fetch(apiUrl('doc_link', clientId, doc.id));
      const data = await res.json();
      if (data.url) {
        await navigator.clipboard.writeText(data.url);
        toast.success('Ссылка скопирована в буфер обмена');
        onAfterShare?.('Ссылка');
      } else {
        toast.error('Ошибка создания ссылки');
      }
    } catch {
      toast.error('Ошибка');
    } finally {
      setLoading(null);
    }
  }

  async function shareTelegram() {
    setLoading('tg');
    try {
      await ensureSaved();
      const res = await fetch(apiUrl('doc_link', clientId, doc.id));
      const data = await res.json();
      if (data.url) {
        const text = encodeURIComponent(`${doc.title}`);
        const url = encodeURIComponent(data.url);
        window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
        onAfterShare?.('Telegram');
      } else {
        toast.error('Ошибка создания ссылки');
      }
    } catch {
      toast.error('Ошибка');
    } finally {
      setLoading(null);
    }
  }

  async function shareVK() {
    setLoading('vk');
    try {
      await ensureSaved();
      const res = await fetch(apiUrl('doc_link', clientId, doc.id));
      const data = await res.json();
      if (data.url) {
        const url = encodeURIComponent(data.url);
        const title = encodeURIComponent(doc.title);
        window.open(`https://vk.com/share.php?url=${url}&title=${title}`, '_blank');
        onAfterShare?.('VK');
      } else {
        toast.error('Ошибка создания ссылки');
      }
    } catch {
      toast.error('Ошибка');
    } finally {
      setLoading(null);
    }
  }

  async function shareMax() {
    setLoading('max');
    try {
      await ensureSaved();
      const res = await fetch(apiUrl('doc_link', clientId, doc.id));
      const data = await res.json();
      if (data.url) {
        const text = encodeURIComponent(`${doc.title}: ${data.url}`);
        window.open(`https://max.ru/share?text=${text}`, '_blank');
        onAfterShare?.('Max');
      } else {
        toast.error('Ошибка создания ссылки');
      }
    } catch {
      toast.error('Ошибка');
    } finally {
      setLoading(null);
    }
  }

  const Btn = ({
    action, icon, label, color = 'default',
  }: { action: string; icon: string; label: string; color?: 'default' | 'green' | 'blue' | 'tg' | 'vk' | 'max' }) => {
    const isLoading = loading === action;
    const colors = {
      default: 'border-border text-[hsl(var(--text-muted))] hover:border-gold hover:text-gold',
      green: 'border-emerald-500/40 text-emerald-400 hover:border-emerald-500 hover:text-emerald-300',
      blue: 'border-blue-500/40 text-blue-400 hover:border-blue-500 hover:text-blue-300',
      tg: 'border-sky-500/40 text-sky-400 hover:border-sky-500 hover:text-sky-300',
      vk: 'border-blue-600/40 text-blue-400 hover:border-blue-600 hover:text-blue-300',
      max: 'border-purple-500/40 text-purple-400 hover:border-purple-500 hover:text-purple-300',
    };
    return (
      <button
        onClick={() => {
          if (action === 'preview') openPreview();
          else if (action === 'docx') downloadDocx();
          else if (action === 'pdf') printPdf();
          else if (action === 'link') copyLink();
          else if (action === 'tg') shareTelegram();
          else if (action === 'vk') shareVK();
          else if (action === 'max') shareMax();
        }}
        disabled={!!loading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-medium transition-all disabled:opacity-50 ${colors[color]}`}
      >
        {isLoading
          ? <Icon name="Loader2" size={13} className="animate-spin" />
          : <Icon name={icon} size={13} />}
        {label}
      </button>
    );
  };

  return (
    <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-4">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
          <Icon name={doc.icon} size={16} className="text-gold" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-white leading-tight">{doc.title}</div>
          <div className="text-[11px] text-[hsl(var(--text-muted))] mt-0.5">{doc.subtitle}</div>
        </div>
        {doc.appendix && (
          <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border border-border text-[hsl(var(--text-muted))]">
            {doc.appendix}
          </span>
        )}
      </div>

      {/* Просмотр и скачивание */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-[hsl(var(--text-muted))] mb-1">Скачать</div>
        <div className="flex flex-wrap gap-2">
          <Btn action="preview" icon="Eye" label="Просмотр" color="default" />
          <Btn action="pdf" icon="FileDown" label="PDF" color="green" />
          <Btn action="docx" icon="FileText" label="Word (.docx)" color="blue" />
        </div>

        <div className="text-[10px] uppercase tracking-wider text-[hsl(var(--text-muted))] mt-3 mb-1">Отправить клиенту</div>
        <div className="flex flex-wrap gap-2">
          <Btn action="link" icon="Link" label="Ссылка" color="default" />
          <Btn action="tg" icon="Send" label="Telegram" color="tg" />
          <Btn action="vk" icon="Users" label="VK" color="vk" />
          <Btn action="max" icon="Zap" label="Max" color="max" />
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-[10px] text-[hsl(var(--text-muted))] leading-relaxed">
          Документ формируется из актуальных данных карточки. При наличии несохранённых изменений — они сохраняются автоматически перед генерацией.
        </p>
      </div>
    </div>
  );
}

const SENT_KEY = (clientId: string, docId: string) => `doc_sent_${clientId}_${docId}`;

function getSentStatus(clientId: string, docId: string): { date: string; channel: string } | null {
  try { return JSON.parse(localStorage.getItem(SENT_KEY(clientId, docId)) || 'null'); } catch { return null; }
}
function setSentStatus(clientId: string, docId: string, channel: string) {
  localStorage.setItem(SENT_KEY(clientId, docId), JSON.stringify({ date: new Date().toISOString().slice(0, 10), channel }));
}

export default function TabDocuments({ client, hasDraft, onSave }: {
  client: Client;
  hasDraft?: boolean;
  onSave?: () => Promise<void>;
}) {
  const clientName = clientFullName(client);
  const [sentMap, setSentMap] = useState<Record<string, { date: string; channel: string } | null>>(() => {
    const m: Record<string, ReturnType<typeof getSentStatus>> = {};
    DOCS.forEach(d => { m[d.id] = getSentStatus(client.id, d.id); });
    return m;
  });
  const [downloadingAll, setDownloadingAll] = useState(false);

  const markSent = (docId: string, channel: string) => {
    setSentStatus(client.id, docId, channel);
    setSentMap(prev => ({ ...prev, [docId]: { date: new Date().toISOString().slice(0, 10), channel } }));
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      if (hasDraft && onSave) await onSave();
      // Скачиваем все docx последовательно
      for (const doc of DOCS) {
        const res = await fetch(apiUrl('doc_docx', client.id, doc.id));
        const data = await res.json();
        if (data.url) {
          const a = document.createElement('a');
          a.href = data.url;
          a.download = `${doc.title} — ${clientName}.docx`;
          a.click();
          await new Promise(r => setTimeout(r, 400));
        }
      }
      toast.success('Все документы скачаны');
    } catch {
      toast.error('Ошибка при скачивании');
    } finally {
      setDownloadingAll(false);
    }
  };

  const hasData = client.contract_number || client.last_name;

  return (
    <div className="space-y-4">
      {!hasData && (
        <div className="bg-amber-400/10 border border-amber-400/30 rounded-lg p-4 flex items-start gap-3">
          <Icon name="AlertTriangle" size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-300">
            Заполните данные клиента на вкладках <strong>«Данные»</strong> и <strong>«Договор»</strong> перед созданием документов — иначе поля будут пустыми.
          </div>
        </div>
      )}

      {/* Кнопка скачать всё + подсказка */}
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-4 flex items-center justify-between gap-4">
        <div className="space-y-1.5 text-xs text-[hsl(var(--text-muted))]">
          <div className="flex items-start gap-1.5"><span className="text-gold">•</span><span><strong className="text-white">Просмотр</strong> — открывает в браузере</span></div>
          <div className="flex items-start gap-1.5"><span className="text-gold">•</span><span><strong className="text-white">Word/PDF</strong> — скачивает файл</span></div>
          <div className="flex items-start gap-1.5"><span className="text-gold">•</span><span><strong className="text-white">Ссылка</strong> — клиент открывает на телефоне</span></div>
        </div>
        <button
          onClick={handleDownloadAll}
          disabled={downloadingAll}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded text-xs text-[hsl(var(--text-dim))] hover:text-gold hover:border-gold/50 transition-all shrink-0 disabled:opacity-60"
        >
          {downloadingAll ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Download" size={13} />}
          Скачать все (.docx)
        </button>
      </div>

      {[
        { name: 'Изготовление', icon: 'Package' },
        { name: 'Доставка и монтаж', icon: 'Truck' },
        { name: 'Сборка', icon: 'Wrench' },
        { name: 'Прочее', icon: 'FolderOpen' },
      ].map(({ name: group, icon }) => {
        const docs = DOCS.filter(d => d.group === group);
        if (!docs.length) return null;
        return (
          <div key={group}>
            <div className="flex items-center gap-2 mb-2 text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider">
              <Icon name={icon} size={12} />{group}
            </div>
            <div className="grid grid-cols-1 gap-3">
              {docs.map(doc => (
                <DocCardWithStatus
                  key={doc.id}
                  doc={doc}
                  clientId={client.id}
                  clientName={clientName}
                  onSave={onSave}
                  hasDraft={hasDraft}
                  sentStatus={sentMap[doc.id] || null}
                  onMarkSent={(ch) => markSent(doc.id, ch)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Обёртка DocCard со статусом отправки
function DocCardWithStatus({ doc, clientId, clientName, onSave, hasDraft, sentStatus, onMarkSent }: {
  doc: DocDef; clientId: string; clientName: string;
  onSave?: () => Promise<void>; hasDraft?: boolean;
  sentStatus: { date: string; channel: string } | null;
  onMarkSent: (channel: string) => void;
}) {
  return (
    <div>
      <DocCard doc={doc} clientId={clientId} clientName={clientName} onSave={onSave} hasDraft={hasDraft} onAfterShare={onMarkSent} />
      {sentStatus && (
        <div className="flex items-center gap-1.5 mt-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[11px] text-emerald-400">
          <Icon name="CheckCircle" size={11} />
          Отправлен {sentStatus.date} · {sentStatus.channel}
          <button onClick={() => onMarkSent('')} className="ml-auto text-[hsl(var(--text-muted))] hover:text-foreground">
            <Icon name="X" size={10} />
          </button>
        </div>
      )}
    </div>
  );
}