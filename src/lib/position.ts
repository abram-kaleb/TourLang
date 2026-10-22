import type { Card, Day, Rel } from '../types';
import { dayDiff, fmtDuration, type Now } from './time';

/** Label waktu relatif di pojok kartu: "Selesai", "Sedang berlangsung", "24 menit lagi", "3 hari lagi". */
export function relOf(card: Card, now: Now): Rel {
  const days = dayDiff(now.key, card.dayKey);
  const start = card.startMin;
  let end = card.endMin ?? start;
  if (card.endNextDay) end += 1440;

  if (days > 0) return { text: days === 1 ? 'Besok' : `${days} hari lagi`, kind: 'future' };
  if (days < 0) {
    // Kereta tidur kemarin malam yang masih berjalan pagi ini.
    if (days === -1 && card.endNextDay && now.min + 1440 < end) return { text: 'Sedang berlangsung', kind: 'live' };
    return { text: 'Selesai', kind: 'done' };
  }

  if (end > start) {
    if (now.min >= start && now.min < end) return { text: 'Sedang berlangsung', kind: 'live' };
    if (now.min >= end) return { text: 'Selesai', kind: 'done' };
  } else if (now.min >= start) {
    // Kegiatan tanpa jam selesai dianggap berlangsung 30 menit.
    return now.min < start + 30 ? { text: 'Sedang berlangsung', kind: 'live' } : { text: 'Selesai', kind: 'done' };
  }
  return { text: `${fmtDuration(start - now.min)} lagi`, kind: 'future' };
}

export interface Pos {
  d: number;
  i: number;
}

/** Kartu yang sedang berlangsung atau berikutnya. Sebelum trip: kartu pertama. Sesudah trip: kartu terakhir. */
export function findNowPos(days: Day[], now: Now): Pos {
  if (!days.length) return { d: 0, i: 0 };
  if (now.key < days[0].key) return { d: 0, i: 0 };
  const last = days.length - 1;
  if (now.key > days[last].key) return { d: last, i: Math.max(0, days[last].cards.length - 1) };

  let d = days.findIndex((x) => x.key === now.key);
  if (d < 0) d = days.findLastIndex((x) => x.key < now.key);
  if (d < 0) d = 0;

  // Kereta tidur dari kemarin yang masih berjalan pagi ini didahulukan.
  if (d > 0 && days[d].key === now.key) {
    const y = days[d - 1].cards;
    const live = y.findIndex((c) => relOf(c, now).kind === 'live');
    if (live >= 0) return { d: d - 1, i: live };
  }
  const cards = days[d].cards;
  const i = cards.findIndex((c) => relOf(c, now).kind !== 'done');
  if (i >= 0) return { d, i };
  // Semua kegiatan hari ini sudah selesai: tampilkan kartu pertama besok.
  return d < last ? { d: d + 1, i: 0 } : { d, i: Math.max(0, cards.length - 1) };
}
