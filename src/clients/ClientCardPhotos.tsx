import { useState, useRef, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import type { ClientPhoto } from './types';
import { confirmDialog } from '@/components/ui/ConfirmDialog';

interface PendingFile {
  file: File;
  previewUrl: string;
  id: string;
}

export function TabPhotos({ clientId, photos, onUpload, onDelete }: {
  clientId: string;
  photos: ClientPhoto[];
  onUpload: (file: File, category: 'measure' | 'render' | 'done') => Promise<boolean>;
  onDelete: (id: string) => void;
}) {
  const [category, setCategory] = useState<'measure' | 'render' | 'done'>('measure');
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const CATS = [
    { id: 'measure' as const, label: 'Замер',          icon: 'Ruler' },
    { id: 'render'  as const, label: 'Рендер / проект', icon: 'Image' },
    { id: 'done'    as const, label: 'Готовая работа',  icon: 'CheckCircle' },
  ];

  const addFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    const newItems: PendingFile[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({
        file: f,
        previewUrl: URL.createObjectURL(f),
        id: `${Date.now()}_${Math.random()}`,
      }));
    if (!newItems.length) {
      toast.error('Выберите файлы изображений (JPG, PNG, WEBP)');
      return;
    }
    setPending(prev => [...prev, ...newItems]);
  }, []);

  const removePending = (id: string) => {
    setPending(prev => {
      const item = prev.find(p => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(p => p.id !== id);
    });
  };

  const clearPending = () => {
    pending.forEach(p => URL.revokeObjectURL(p.previewUrl));
    setPending([]);
  };

  const handleUploadAll = async () => {
    if (!pending.length) return;
    const total = pending.length;
    setUploading(true);
    setProgress({ done: 0, total });
    let successCount = 0;
    for (let i = 0; i < pending.length; i++) {
      const ok = await onUpload(pending[i].file, category);
      if (ok) successCount++;
      setProgress({ done: i + 1, total });
    }
    pending.forEach(p => URL.revokeObjectURL(p.previewUrl));
    setPending([]);
    setUploading(false);
    setProgress(null);
    if (successCount === total) {
      toast.success(`Загружено ${successCount} фото`);
    } else {
      toast.error(`Загружено ${successCount} из ${total} фото`);
    }
  };

  const byCategory = (cat: string) => photos.filter(p => p.category === cat && p.url);

  const downloadCategory = async (catId: string, catLabel: string) => {
    const catPhotos = byCategory(catId);
    for (const photo of catPhotos) {
      try {
        const res = await fetch(photo.url);
        const blob = await res.blob();
        const ext = photo.name?.split('.').pop() || 'jpg';
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${catLabel}_${photo.name || photo.id}.${ext}`;
        a.click();
        URL.revokeObjectURL(a.href);
        await new Promise(r => setTimeout(r, 300));
      } catch { /* пропускаем */ }
    }
  };

  return (
    <div className="space-y-4">
      {/* Загрузка */}
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4 text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider">
          <Icon name="Upload" size={13} />Загрузить фото
        </div>

        {/* Категория */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {CATS.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                category === c.id
                  ? 'bg-gold/20 border-gold/40 text-gold'
                  : 'border-border text-[hsl(var(--text-muted))] hover:text-foreground'
              }`}
            >
              <Icon name={c.icon} size={11} />{c.label}
            </button>
          ))}
        </div>

        {/* Drop zone */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
        />
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-gold/60 bg-gold/5'
              : 'border-border hover:border-gold/40'
          } ${uploading ? 'opacity-60 cursor-wait pointer-events-none' : ''}`}
        >
          <Icon name="ImagePlus" size={24} className="text-[hsl(var(--text-muted))] mx-auto mb-2" />
          <p className="text-sm text-[hsl(var(--text-muted))]">
            Перетащите фото или <span className="text-gold">нажмите для выбора</span>
          </p>
          <p className="text-xs text-[hsl(var(--text-muted))] mt-1">JPG, PNG, WEBP — несколько файлов сразу</p>
        </div>

        {/* Превью выбранных файлов */}
        {pending.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[hsl(var(--text-muted))]">
                Выбрано {pending.length} фото → категория «{CATS.find(c => c.id === category)?.label}»
              </span>
              <button onClick={clearPending} className="text-xs text-[hsl(var(--text-muted))] hover:text-destructive transition-colors">
                Очистить
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {pending.map(p => (
                <div key={p.id} className="relative group aspect-square">
                  <img
                    src={p.previewUrl}
                    alt={p.file.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                  <button
                    onClick={() => removePending(p.id)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                  >
                    <Icon name="X" size={10} className="text-white" />
                  </button>
                  <div className="absolute bottom-1 left-1 right-1 text-[9px] text-white/70 truncate px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {p.file.name}
                  </div>
                </div>
              ))}
            </div>

            {/* Прогресс или кнопка */}
            {uploading && progress ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[hsl(var(--text-muted))]">
                  <span className="flex items-center gap-1.5">
                    <Icon name="Loader2" size={12} className="animate-spin" />
                    Загружаю {progress.done} из {progress.total}...
                  </span>
                  <span>{Math.round((progress.done / progress.total) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-[hsl(220,12%,18%)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold rounded-full transition-all duration-300"
                    style={{ width: `${(progress.done / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={handleUploadAll}
                className="w-full flex items-center justify-center gap-2 py-2 bg-gold text-[hsl(220,16%,8%)] rounded text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Icon name="Upload" size={14} />
                Загрузить {pending.length} фото
              </button>
            )}
          </div>
        )}
      </div>

      {/* Галерея по категориям */}
      {CATS.map(cat => {
        const catPhotos = byCategory(cat.id);
        if (!catPhotos.length) return null;
        return (
          <div key={cat.id} className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4 text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider">
              <Icon name={cat.icon} size={13} />{cat.label}
              <span className="bg-[hsl(220,12%,18%)] rounded-full px-1.5 py-0.5">{catPhotos.length}</span>
              <button
                onClick={() => downloadCategory(cat.id, cat.label)}
                title={`Скачать все фото «${cat.label}»`}
                className="ml-auto flex items-center gap-1 text-[hsl(var(--text-muted))] hover:text-gold transition-colors"
              >
                <Icon name="Download" size={12} /> Скачать все
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {catPhotos.map(photo => (
                <div key={photo.id} className="relative group aspect-square">
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-full object-cover rounded-lg cursor-pointer"
                    onClick={() => setPreview(photo.url)}
                  />
                  <button
                    onClick={async () => { if (await confirmDialog({ message: 'Удалить фото?' })) onDelete(photo.id); }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                  >
                    <Icon name="X" size={11} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {photos.filter(p => p.url).length === 0 && pending.length === 0 && (
        <div className="text-center text-[hsl(var(--text-muted))] text-sm py-8">Фотографий пока нет</div>
      )}

      {/* Lightbox */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <img src={preview} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
            <Icon name="X" size={18} className="text-white" />
          </button>
        </div>
      )}
    </div>
  );
}