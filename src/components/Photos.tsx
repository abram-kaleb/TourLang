import { useEffect, useRef, useState } from 'react';
import { PHOTO_FOLDER_URL } from '../config';
import { thumbUrl, viewUrl } from '../lib/photos';
import type { Photo } from '../types';
import { Icon } from './Icon';

function timeOf(p: Photo): string {
  return p.t.slice(11, 16).replace(/^0/, '');
}

/** Carousel kecil foto di bawah bubble agenda. */
export function PhotoStrip({ photos, onOpen }: { photos: Photo[]; onOpen: (index: number) => void }) {
  if (!photos.length) return null;
  return (
    <div className="no-scrollbar mt-1.5 flex gap-1.5 overflow-x-auto pl-11 pr-6" aria-label={`${photos.length} foto`}>
      {photos.map((p, i) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onOpen(i)}
          className="relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-wall-dot shadow-sm"
          aria-label={`Foto jam ${timeOf(p)}`}
        >
          <img src={thumbUrl(p.id)} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  );
}

/** Foto layar penuh, geser kiri-kanan antar foto di agenda yang sama. */
export function PhotoViewer({ photos, start, onClose }: { photos: Photo[]; start: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(start);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTo({ left: start * el.clientWidth });
  }, [start]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const p = photos[i];
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Foto">
      <div className="flex items-center gap-3 px-4 pb-2 pt-[max(env(safe-area-inset-top),12px)] text-white">
        <button type="button" onClick={onClose} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10" aria-label="Tutup">
          <Icon name="close" size={20} />
        </button>
        <span className="flex-1 font-mono text-sm font-semibold">
          {p ? timeOf(p) : ''} · {i + 1}/{photos.length}
        </span>
        {p && (
          <a href={viewUrl(p.id)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold">
            Buka di Drive
          </a>
        )}
      </div>
      <div
        ref={ref}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.clientWidth) setI(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="no-scrollbar flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto"
      >
        {photos.map((ph) => (
          <div key={ph.id} className="flex h-full w-full shrink-0 snap-center items-center justify-center p-2">
            <img src={thumbUrl(ph.id, 1600)} alt="" referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Dua tombol mengambang di kanan strip tanggal:
 * - kamera: buka folder foto di Google Drive (di HP terbuka di aplikasi Drive), upload dari sana
 * - refresh: ambil jadwal dan daftar foto terbaru
 */
export function PhotoButtons({ loading, onRefresh }: { loading: boolean; onRefresh: () => void }) {
  const btn = 'pointer-events-auto flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ink/90 text-white shadow-card backdrop-blur';
  return (
    <>
      <a href={PHOTO_FOLDER_URL} target="_blank" rel="noopener noreferrer" aria-label="Upload foto di Google Drive" className={btn}>
        <Icon name="camera" size={22} stroke={2.2} />
      </a>
      <button type="button" onClick={onRefresh} disabled={loading} aria-label="Muat ulang foto dan jadwal" className={`${btn} disabled:opacity-70`}>
        <span className={loading ? 'animate-spin' : ''}>
          <Icon name="refresh" size={22} stroke={2.2} />
        </span>
      </button>
    </>
  );
}
