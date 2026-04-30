import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import type { DocDef } from './docTypes';
import { apiFetch } from './docTypes';

function DocPreviewModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 animate-fade-in" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-2 bg-[hsl(220,14%,11%)] border-b border-border shrink-0" onClick={e => e.stopPropagation()}>
        <span className="text-sm font-medium text-foreground truncate">{title}</span>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-[hsl(var(--text-muted))] hover:text-foreground">
          <Icon name="X" size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden" onClick={e => e.stopPropagation()}>
        <iframe src={url} className="w-full h-full border-0" title={title} />
      </div>
    </div>
  );
}

interface Props {
  doc: DocDef;
  clientId: string;
  clientName: string;
  onSave?: () => Promise<void>;
  hasDraft?: boolean;
  onAfterShare?: (channel: string) => void;
}

export function DocCard({ doc, clientId, clientName, onSave, hasDraft, onAfterShare }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  async function ensureSaved() {
    if (hasDraft && onSave) {
      await onSave();
    }
  }

  async function openPreview() {
    setLoading('preview');
    try {
      await ensureSaved();
      const res = await apiFetch('doc_html', clientId, doc.id);
      if (!res.ok) { toast.error('Ошибка загрузки документа'); return; }
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      setPreviewUrl(blobUrl);
    } catch {
      toast.error('Ошибка загрузки документа');
    } finally {
      setLoading(null);
    }
  }

  async function downloadDocx() {
    setLoading('docx');
    try {
      await ensureSaved();
      const res = await apiFetch('doc_docx', clientId, doc.id);
      const data = await res.json();
      if (data.data) {
        // base64 → Blob → скачивание без CORS
        const binary = atob(data.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${doc.title} — ${clientName}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        toast.success('Word-файл скачан');
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
      // Получаем HTML через наш API (без CORS-проблем)
      const res = await apiFetch('doc_html', clientId, doc.id);
      if (!res.ok) { toast.error('Ошибка загрузки документа'); return; }
      const html = await res.text();
      // Вставляем скрипт автопечати и открываем в новом окне
      const htmlWithPrint = html.replace('</body>', `<script>
        window.addEventListener('load', function() {
          setTimeout(function() { window.print(); }, 400);
        });
      </script></body>`);
      const blob = new Blob([htmlWithPrint], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank');
      if (win) {
        win.addEventListener('afterprint', () => {
          win.close();
          URL.revokeObjectURL(blobUrl);
        });
      }
      toast.success('В диалоге выберите "Сохранить как PDF"');
    } finally {
      setLoading(null);
    }
  }

  async function copyLink() {
    setLoading('link');
    try {
      await ensureSaved();
      const res = await apiFetch('doc_link', clientId, doc.id);
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
      const res = await apiFetch('doc_link', clientId, doc.id);
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
      const res = await apiFetch('doc_link', clientId, doc.id);
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
      const res = await apiFetch('doc_link', clientId, doc.id);
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
    <>
    {previewUrl && (
      <DocPreviewModal url={previewUrl} title={doc.title} onClose={closePreview} />
    )}
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
    </>
  );
}