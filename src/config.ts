export const SHEET_API = import.meta.env.VITE_SHEET_API as string | undefined;

/**
 * Kode akses TIDAK ditanam di build (semua isi build bisa dibaca siapa pun).
 * Kode diketik sekali di tiap HP dan disimpan di HP itu saja.
 */
export const KEY_STORAGE = 'tourlang:key:v1';

/** Semua jam di sheet ditulis dalam waktu Eropa Tengah (Jerman, Belanda, Belgia, Prancis, Swiss). */
export const TIME_ZONE = 'Europe/Berlin';

export const CACHE_KEY = 'tourlang:data:v1';

/** Ambil data baru dari sheet setiap berapa menit selama app terbuka. */
export const REFRESH_MINUTES = 10;
