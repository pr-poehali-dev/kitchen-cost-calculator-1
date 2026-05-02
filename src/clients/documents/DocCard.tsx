import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import type { DocDef } from './docTypes';
import { apiFetch } from './docTypes';

function DocPreviewModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1a1a1a] animate-fade-in">
      <div className="flex items-center justify-between px-4 py-2 bg-[hsl(220,14%,11%)] border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Icon name="FileText" size={14} className="text-gold" />
          <span className="text-sm font-medium text-foreground truncate">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-xs text-[hsl(var(--text-muted))] hover:text-foreground hover:border-gold/40 transition-all"
          >
            <Icon name="ExternalLink" size={12} /> На весь экран
          </a>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-[hsl(var(--text-muted))] hover:text-foreground">
            <Icon name="X" size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-[#2d2d2d]">
        <iframe src={url} className="border-0" title={title} style={{ width: '100%', height: '100%', minHeight: '600px' }} />
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
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) setShowDownloadMenu(false);
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShowShareMenu(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  async function ensureSaved() {
    if (hasDraft && onSave) await onSave();
  }

  async function openPreview() {
    setLoading('preview');
    try {
      await ensureSaved();
      const res = await apiFetch('doc_html', clientId, doc.id);
      if (!res.ok) { toast.error('Ошибка загрузки документа'); return; }
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      setPreviewUrl(URL.createObjectURL(blob));
    } catch { toast.error('Ошибка загрузки документа'); }
    finally { setLoading(null); }
  }

  async function downloadDocx() {
    setLoading('docx');
    setShowDownloadMenu(false);
    try {
      await ensureSaved();
      const res = await apiFetch('doc_docx', clientId, doc.id);
      const data = await res.json();
      if (data.data) {
        const binary = atob(data.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl; a.download = `${doc.title} — ${clientName}.docx`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        toast.success('Word-файл скачан');
      } else { toast.error('Ошибка генерации файла'); }
    } catch { toast.error('Ошибка загрузки'); }
    finally { setLoading(null); }
  }

  async function printPdf() {
    setLoading('pdf');
    setShowDownloadMenu(false);
    try {
      await ensureSaved();
      const res = await apiFetch('doc_html', clientId, doc.id);
      if (!res.ok) { toast.error('Ошибка загрузки документа'); return; }
      const html = await res.text();
      const htmlWithPrint = html.replace('</body>', `<script>
        window.addEventListener('load', function() { setTimeout(function() { window.print(); }, 400); });
      </script></body>`);
      const blob = new Blob([htmlWithPrint], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank');
      if (win) win.addEventListener('afterprint', () => { win.close(); URL.revokeObjectURL(blobUrl); });
      toast.success('В диалоге выберите "Сохранить как PDF"');
    } finally { setLoading(null); }
  }

  async function copyLink() {
    setLoading('link');
    setShowShareMenu(false);
    try {
      await ensureSaved();
      const res = await apiFetch('doc_link', clientId, doc.id);
      const data = await res.json();
      if (data.url) {
        await navigator.clipboard.writeText(data.url);
        toast.success('Ссылка скопирована');
        onAfterShare?.('Ссылка');
      } else { toast.error('Ошибка создания ссылки'); }
    } catch { toast.error('Ошибка'); }
    finally { setLoading(null); }
  }

  async function shareTelegram() {
    setLoading('tg');
    setShowShareMenu(false);
    try {
      await ensureSaved();
      const res = await apiFetch('doc_link', clientId, doc.id);
      const data = await res.json();
      if (data.url) {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(data.url)}&text=${encodeURIComponent(doc.title)}`, '_blank');
        onAfterShare?.('Telegram');
      } else { toast.error('Ошибка создания ссылки'); }
    } catch { toast.error('Ошибка'); }
    finally { setLoading(null); }
  }

  async function shareVK() {
    setLoading('vk');
    setShowShareMenu(false);
    try {
      await ensureSaved();
      const res = await apiFetch('doc_link', clientId, doc.id);
      const data = await res.json();
      if (data.url) {
        window.open(`https://vk.com/share.php?url=${encodeURIComponent(data.url)}&title=${encodeURIComponent(doc.title)}`, '_blank');
        onAfterShare?.('VK');
      } else { toast.error('Ошибка создания ссылки'); }
    } catch { toast.error('Ошибка'); }
    finally { setLoading(null); }
  }

  async function shareMax() {
    setLoading('max');
    setShowShareMenu(false);
    try {
      await ensureSaved();
      const res = await apiFetch('doc_link', clientId, doc.id);
      const data = await res.json();
      if (data.url) {
        window.open(`https://max.ru/share?text=${encodeURIComponent(`${doc.title}: ${data.url}`)}`, '_blank');
        onAfterShare?.('Max');
      } else { toast.error('Ошибка создания ссылки'); }
    } catch { toast.error('Ошибка'); }
    finally { setLoading(null); }
  }

  return (
    <>
      {previewUrl && <DocPreviewModal url={previewUrl} title={doc.title} onClose={closePreview} />}
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-4">
        {/* Заголовок */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
            <Icon name={doc.icon} size={16} className="text-gold" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-white leading-tight">{doc.title}</div>
            <div className="text-[11px] text-[hsl(var(--text-muted))] mt-0.5">{doc.subtitle}</div>
          </div>
          {doc.appendix && (
            <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border border-border text-[hsl(var(--text-muted))]">
              {doc.appendix}
            </span>
          )}
        </div>

        {/* Кнопки действий */}
        <div className="flex flex-wrap gap-2">
          {/* Просмотр */}
          <button
            onClick={openPreview}
            disabled={!!loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs font-medium text-[hsl(var(--text-muted))] hover:border-gold hover:text-gold transition-all disabled:opacity-50"
          >
            {loading === 'preview'
              ? <Icon name="Loader2" size={13} className="animate-spin" />
              : <Icon name="Eye" size={13} />}
            Просмотр
          </button>

          {/* Скачать ▾ */}
          <div ref={downloadRef} className="relative">
            <button
              onClick={() => { setShowDownloadMenu(v => !v); setShowShareMenu(false); }}
              disabled={!!loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-emerald-500/40 text-xs font-medium text-emerald-400 hover:border-emerald-500 hover:text-emerald-300 transition-all disabled:opacity-50"
            >
              {(loading === 'docx' || loading === 'pdf')
                ? <Icon name="Loader2" size={13} className="animate-spin" />
                : <Icon name="Download" size={13} />}
              Скачать
              <Icon name="ChevronDown" size={11} className={`transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
            </button>
            {showDownloadMenu && (
              <div className="absolute top-full left-0 mt-1 z-30 bg-[hsl(220,14%,13%)] border border-border rounded-lg shadow-xl overflow-hidden min-w-[160px]">
                <button
                  onClick={downloadDocx}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--text-dim))] hover:bg-[hsl(220,12%,18%)] hover:text-blue-300 transition-colors"
                >
                  <Icon name="FileText" size={13} className="text-blue-400" /> Word (.docx)
                </button>
                <button
                  onClick={printPdf}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--text-dim))] hover:bg-[hsl(220,12%,18%)] hover:text-emerald-300 transition-colors"
                >
                  <Icon name="FileDown" size={13} className="text-emerald-400" /> PDF (печать)
                </button>
              </div>
            )}
          </div>

          {/* Отправить клиенту ▾ */}
          <div ref={shareRef} className="relative">
            <button
              onClick={() => { setShowShareMenu(v => !v); setShowDownloadMenu(false); }}
              disabled={!!loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs font-medium text-[hsl(var(--text-muted))] hover:border-gold/40 hover:text-foreground transition-all disabled:opacity-50"
            >
              {(loading === 'link' || loading === 'tg' || loading === 'vk' || loading === 'max')
                ? <Icon name="Loader2" size={13} className="animate-spin" />
                : <Icon name="Share2" size={13} />}
              Отправить
              <Icon name="ChevronDown" size={11} className={`transition-transform ${showShareMenu ? 'rotate-180' : ''}`} />
            </button>
            {showShareMenu && (
              <div className="absolute top-full left-0 mt-1 z-30 bg-[hsl(220,14%,13%)] border border-border rounded-lg shadow-xl overflow-hidden min-w-[160px]">
                <button onClick={copyLink} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--text-dim))] hover:bg-[hsl(220,12%,18%)] hover:text-foreground transition-colors">
                  <Icon name="Link" size={13} /> Скопировать ссылку
                </button>
                <button onClick={shareTelegram} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--text-dim))] hover:bg-[hsl(220,12%,18%)] hover:text-sky-300 transition-colors">
                  <Icon name="Send" size={13} className="text-sky-400" /> Telegram
                </button>
                <button onClick={shareVK} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--text-dim))] hover:bg-[hsl(220,12%,18%)] hover:text-blue-300 transition-colors">
                  <Icon name="Users" size={13} className="text-blue-400" /> VK
                </button>
                <button onClick={shareMax} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[hsl(var(--text-dim))] hover:bg-[hsl(220,12%,18%)] hover:text-purple-300 transition-colors">
                  <Icon name="Zap" size={13} className="text-purple-400" /> Max
                </button>
              </div>
            )}
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
