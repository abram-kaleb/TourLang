import type { Day, Photo } from '../types';
import { dayDiff } from './time';

export function thumbUrl(id: string, size = 240): string {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${size}`;
}

export function viewUrl(id: string): string {
  return `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
}

/** "2026-11-06T08:35" -> { key: "2026-11-06", min: 515 } */
export function parsePhotoTime(t: string): { key: string; min: number } | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(t);
  return m ? { key: m[1], min: Number(m[2]) * 60 + Number(m[3]) } : null;
}

/**
 * Foto ditempel ke agenda yang sedang berjalan saat foto diambil:
 * agenda terakhir yang jam mulainya sebelum atau sama dengan jam foto.
 * Foto di waktu bebas ikut agenda sebelumnya. Foto di luar tanggal trip dilewati.
 */
export function photosByCard(days: Day[], photos: Photo[]): Map<string, Photo[]> {
  const out = new Map<string, Photo[]>();
  if (!days.length) return out;
  const base = days[0].key;
  const last = days[days.length - 1].key;
  const cards = days.flatMap((d) => d.cards.map((c) => ({ id: c.id, at: dayDiff(base, d.key) * 1440 + c.startMin })));
  if (!cards.length) return out;

  for (const p of photos) {
    const t = parsePhotoTime(p.t);
    if (!t || t.key < base || t.key > last) continue;
    const at = dayDiff(base, t.key) * 1440 + t.min;
    let idx = -1;
    for (let i = 0; i < cards.length && cards[i].at <= at; i++) idx = i;
    if (idx < 0) continue;
    const id = cards[idx].id;
    out.set(id, [...(out.get(id) ?? []), p]);
  }
  return out;
}
