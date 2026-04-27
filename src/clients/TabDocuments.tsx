import { useState } from 'react';
import Icon from '@/components/ui/icon';
import type { Client } from './types';
import { clientFullName } from './types';
import { toast } from 'sonner';
import { DOCS, DOC_GROUPS, apiUrl } from './documents/docTypes';
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

  const markSent = (docId: string, channel: string) => {
    setSentStatus(client.id, docId, channel);
    setSentMap(prev => ({ ...prev, [docId]: { date: new Date().toISOString().slice(0, 10), channel } }));
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      if (hasDraft && onSave) await onSave();
      for (const doc of DOCS) {
        const res = await fetch(apiUrl('doc_docx', client.id, doc.id));
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
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
          await new Promise(r => setTimeout(r, 600));
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

      {/* Статус сохранения */}
      {(hasDraft || saving) && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-400/10 border border-amber-400/30 rounded-lg text-xs text-amber-300">
          <Icon name={saving ? 'Loader2' : 'Clock'} size={13} className={`shrink-0 ${saving ? 'animate-spin' : ''}`} />
          {saving ? 'Сохранение данных…' : 'Есть несохранённые изменения — будут сохранены автоматически при скачивании'}
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
