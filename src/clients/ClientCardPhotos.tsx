import { useState, useRef } from 'react';
import Icon from '@/components/ui/icon';
import type { ClientPhoto } from './types';

export function TabPhotos({ clientId, photos, onUpload, onDelete }: {
  clientId: string;
  photos: ClientPhoto[];
  onUpload: (file: File, category: 'measure' | 'render' | 'done') => Promise<boolean>;
  onDelete: (id: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<'measure' | 'render' | 'done'>('measure');
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const CATS = [
    { id: 'measure' as const, label: 'Замер', icon: 'Ruler' },
    { id: 'render' as const, label: 'Рендер / проект', icon: 'Image' },
    { id: 'done' as const, label: 'Готовая работа', icon: 'CheckCircle' },
  ];

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      await onUpload(file, category);
    }
    setUploading(false);
  };

  const byCategory = (cat: string) => photos.filter(p => p.category === cat && p.url);

  return (
    <div className="space-y-4">
      {/* Загрузка */}
      <div className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4 text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider">
          <Icon name="Upload" size={13} />Загрузить фото
        </div>
        <div className="flex items-center gap-3 mb-3">
          {CATS.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-colors ${category === c.id ? 'bg-gold/20 border-gold/40 text-gold' : 'border-border text-[hsl(var(--text-muted))] hover:text-foreground'}`}
            >
              <Icon name={c.icon} size={11} />{c.label}
            </button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          className={`border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-gold/40 ${uploading ? 'opacity-60 cursor-wait' : ''}`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-[hsl(var(--text-muted))]">
              <Icon name="Loader2" size={18} className="animate-spin" />
              <span className="text-sm">Загрузка...</span>
            </div>
          ) : (
            <>
              <Icon name="ImagePlus" size={24} className="text-[hsl(var(--text-muted))] mx-auto mb-2" />
              <p className="text-sm text-[hsl(var(--text-muted))]">Перетащите фото или <span className="text-gold">нажмите для выбора</span></p>
              <p className="text-xs text-[hsl(var(--text-muted))] mt-1">JPG, PNG, WEBP — несколько файлов сразу</p>
            </>
          )}
        </div>
      </div>

      {/* Галерея по категориям */}
      {CATS.map(cat => {
        const catPhotos = byCategory(cat.id);
        if (catPhotos.length === 0) return null;
        return (
          <div key={cat.id} className="bg-[hsl(220,14%,11%)] border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4 text-xs text-[hsl(var(--text-muted))] uppercase tracking-wider">
              <Icon name={cat.icon} size={13} />{cat.label}
              <span className="ml-auto bg-[hsl(220,12%,18%)] rounded-full px-1.5 py-0.5">{catPhotos.length}</span>
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
                    onClick={() => onDelete(photo.id)}
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

      {photos.filter(p => p.url).length === 0 && (
        <div className="text-center text-[hsl(var(--text-muted))] text-sm py-8">
          Фотографий пока нет
        </div>
      )}

      {/* Lightbox */}
      {preview && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <img src={preview} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
            <Icon name="X" size={18} className="text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
