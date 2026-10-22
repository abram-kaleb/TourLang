import { CACHE_KEY, KEY_STORAGE, SHEET_API } from '../config';
import type { Row, SheetData } from '../types';

/** Dilempar kalau kode akses belum ada atau ditolak server. */
export class AuthError extends Error {}

export function getKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function setKey(key: string) {
  try {
    localStorage.setItem(KEY_STORAGE, key.trim());
  } catch {
    // Penyimpanan diblokir: kode harus diketik lagi tiap buka app.
  }
}

/** Hapus kode dan data simpanan, misalnya saat kode ditolak. */
export function clearKey() {
  try {
    localStorage.removeItem(KEY_STORAGE);
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // abaikan
  }
}

function normalize(raw: unknown): SheetData {
  if (!raw || typeof raw !== 'object') throw new Error('Format data tidak dikenali');
  const r = raw as { updatedAt?: string; sheets?: Record<string, unknown>; error?: string };
  if (r.error) throw r.error === 'Kunci akses salah' ? new AuthError(r.error) : new Error(r.error);
  if (!r.sheets) throw new Error('Data sheet kosong');

  const sheets: Record<string, Row[]> = {};
  for (const [name, rows] of Object.entries(r.sheets)) {
    if (!Array.isArray(rows)) continue;
    sheets[name.trim().toLowerCase()] = rows.map((row) => {
      const out: Row = {};
      for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
        out[k.trim().toLowerCase()] = v == null ? '' : String(v).trim();
      }
      return out;
    });
  }
  return { updatedAt: r.updatedAt ?? new Date().toISOString(), sheets };
}

export async function fetchSheet(signal?: AbortSignal): Promise<SheetData> {
  if (!SHEET_API) throw new Error('VITE_SHEET_API belum diisi di file .env');
  const key = getKey();
  if (!key) throw new AuthError('Masukkan kode akses');
  const url = new URL(SHEET_API);
  url.searchParams.set('key', key);

  const res = await fetch(url.toString(), { signal, redirect: 'follow' });
  if (!res.ok) throw new Error(`Gagal mengambil data (${res.status})`);
  const data = normalize(await res.json());
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Penyimpanan penuh atau diblokir: app tetap jalan, hanya tanpa cadangan offline.
  }
  return data;
}

export function loadCache(): SheetData | null {
  try {
    const s = localStorage.getItem(CACHE_KEY);
    return s ? normalize(JSON.parse(s)) : null;
  } catch {
    return null;
  }
}
