import { useState } from 'react';
import Icon from '@/components/ui/icon';
import type { Client } from './types';
import { clientFullName } from './types';
import { toast } from 'sonner';
import { DOCS, DOC_GROUPS, apiFetch, docBuilderFetch, DOC_API, getToken } from './documents/docTypes';
import { DocCardWithStatus, getSentStatus, setSentStatus } from './documents/DocCardWithStatus';

export default function TabDocuments({ client, hasDraft, onSave, saving }: {
  client: Client;
  hasDraft?: boolean;
  onSave?: () => Promise<void>;
  saving?: boolean;
}) {
  const clientName = clientFullName(client);
  const [sentMap, setSentMap] = useState<Record<string, { date: string; channel: string } | null>>(() => {
    const m: Record<string, ReturnType<typeof getSentStatus>> = {};
    DOCS.forEach(d => { m[d.id] = getSentStatus(client.id, d.id); });
    return m;
  });
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadingZipPdf, setDownloadingZipPdf] = useState(false);

  const markSent = (docId: string, channel: string) => {
    if (!channel) {
      localStorage.removeItem(`doc_sent_${client.id}_${docId}`);
      setSentMap(prev => ({ ...prev, [docId]: null }));
    } else {
      setSentStatus(client.id, docId, channel);
      setSentMap(prev => ({ ...prev, [docId]: { date: new Date().toISOString().slice(0, 10), channel } }));
    }
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      if (hasDraft && onSave) await onSave();
      for (const doc of DOCS) {
        const res = await docBuilderFetch('doc_docx', client.id, doc.id);
        const data = await res.json();
        if (data.data) {
          const binary = atob(data.data);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `${doc.title} — ${clientName}.docx`;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
          await new Promise(r => setTimeout(r, 800));
        }
      }
      toast.success('Все документы скачаны');
    } catch { toast.error('Ошибка при скачивании'); }
    finally { setDownloadingAll(false); }
  };

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      if (hasDraft && onSave) await onSave();
      const res = await fetch(`${DOC_API}/?action=doc_zip&client_id=${client.id}&doc=all`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.data) {
        const binary = atob(data.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'application/zip' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = data.filename || `Документы — ${clientName}.zip`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        toast.success('ZIP DOCX скачан');
      } else { toast.error('Ошибка генерации архива'); }
    } catch { toast.error('Ошибка при скачивании'); }
    finally { setDownloadingZip(false); }
  };

  const handleDownloadZipPdf = async () => {
    setDownloadingZipPdf(true);
    try {
      if (hasDraft && onSave) await onSave();
      for (const doc of DOCS) {
        try {
          const res = await apiFetch('doc_html', client.id, doc.id);
          if (!res.ok) continue;
          const html = await res.text();
          const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `${doc.title} — ${clientName}.html`;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
          await new Promise(r => setTimeout(r, 600));
        } catch { /* skip */ }
      }
      toast.success('Все HTML-файлы скачаны — откройте каждый и напечатайте в PDF');
    } catch { toast.error('Ошибка при скачивании'); }
    finally { setDownloadingZipPdf(false); }
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

      {/* Статус сохранения */}
      {(hasDraft || saving) && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-400/10 border border-amber-400/30 rounded-lg text-xs text-amber-300">
          <Icon name={saving ? 'Loader2' : 'Clock'} size={13} className={`shrink-0 ${saving ? 'animate-spin' : ''}`} />
          {saving ? 'Сохранение данных…' : 'Есть несохранённые изменения — будут сохранены автоматически при скачивании'}
        </div>
      )}

      {/* Подсказка + кнопки скачать */}
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-4 flex items-center justify-between gap-4">
        <div className="space-y-1.5 text-xs text-[hsl(var(--text-muted))]">
          <div className="flex items-start gap-1.5"><span className="text-gold">•</span><span><strong className="text-white">Просмотр</strong> — открывает в браузере</span></div>
          <div className="flex items-start gap-1.5"><span className="text-gold">•</span><span><strong className="text-white">Скачать</strong> — Word (.docx) или PDF</span></div>
          <div className="flex items-start gap-1.5"><span className="text-gold">•</span><span><strong className="text-white">Отправить</strong> — ссылка клиенту на телефон</span></div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={handleDownloadZip}
            disabled={downloadingZip || downloadingZipPdf}
            className="flex items-center gap-2 px-4 py-2 border border-emerald-500/40 rounded text-xs text-emerald-400 hover:text-emerald-300 hover:border-emerald-500 transition-all disabled:opacity-60"
          >
            {downloadingZip ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="FolderArchive" size={13} />}
            Скачать ZIP docx
          </button>
          <button
            onClick={handleDownloadZipPdf}
            disabled={downloadingZipPdf || downloadingZip}
            className="flex items-center gap-2 px-4 py-2 border border-emerald-500/40 rounded text-xs text-emerald-400 hover:text-emerald-300 hover:border-emerald-500 transition-all disabled:opacity-60"
          >
            {downloadingZipPdf ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="FolderArchive" size={13} />}
            Скачать ZIP pdf
          </button>
        </div>
      </div>

      {/* Группы документов */}
      {DOC_GROUPS.map(({ name: group, icon }) => {
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