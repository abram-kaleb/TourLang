import { TIME_ZONE } from '../config';

export const DOW_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
export const DOW_LONG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const MONTH = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** "11/6/2026" (format sheet, m/d/yyyy) atau "2026-11-06" menjadi "2026-11-06". */
export function parseDateKey(s: string | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

/** "9:30" menjadi 570 (menit sejak tengah malam). */
export function parseTime(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function fmtTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parts(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

function utc(key: string) {
  const { y, m, d } = parts(key);
  return Date.UTC(y, m - 1, d);
}

export function dayOfMonth(key: string): number {
  return parts(key).d;
}

export function dow(key: string): number {
  return new Date(utc(key)).getUTCDay();
}

/** Selisih hari b dikurangi a. */
export function dayDiff(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

export function addDays(key: string, n: number): string {
  const d = new Date(utc(key) + n * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

export function labelShort(key: string): string {
  const { m, d } = parts(key);
  return `${DOW_SHORT[dow(key)]}, ${d} ${MONTH_SHORT[m - 1]}`;
}

export function labelLong(key: string): string {
  const { y, m, d } = parts(key);
  return `${DOW_LONG[dow(key)]}, ${d} ${MONTH[m - 1]} ${y}`;
}

export function monthShort(key: string): string {
  return MONTH_SHORT[parts(key).m - 1];
}

export interface Now {
  key: string;
  min: number;
}

/**
 * Waktu sekarang di zona Eropa Tengah.
 * Untuk uji coba, buka app dengan ?now=2026-11-07T10:58
 */
export function getNow(): Now {
  const override = new URLSearchParams(window.location.search).get('now');
  if (override) {
    const m = override.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}):(\d{2})/);
    if (m) return { key: m[1], min: Number(m[2]) * 60 + Number(m[3]) };
  }
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const g = (t: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === t)?.value ?? '0';
  return { key: `${g('year')}-${g('month')}-${g('day')}`, min: Number(g('hour')) * 60 + Number(g('minute')) };
}

export function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? `${h} jam` : '', m ? `${m} menit` : ''].filter(Boolean).join(' ') || '0 menit';
}

export function fmtAgo(iso: string | undefined): string {
  if (!iso) return '';
  const diff = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (diff < 1) return 'baru saja';
  if (diff < 60) return `${diff} menit lalu`;
  const h = Math.round(diff / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.round(h / 24)} hari lalu`;
}
