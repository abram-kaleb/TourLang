import { useCallback, useEffect, useMemo, useState } from 'react';
import { REFRESH_MINUTES } from '../config';
import { buildTrip } from '../lib/build';
import { AuthError, clearKey, fetchSheet, getKey, loadCache, setKey } from '../lib/sheet';
import { getNow, type Now } from '../lib/time';
import type { Day, SheetData } from '../types';

export interface TripState {
  days: Day[];
  now: Now;
  loading: boolean;
  /** Pesan kalau data terakhir gagal diambil (app tetap memakai data simpanan). */
  error: string | null;
  updatedAt?: string;
  /** true kalau kode akses belum ada atau salah: tampilkan form kode. */
  needKey: boolean;
  refresh: () => void;
  submitKey: (key: string) => void;
}

export function useTrip(): TripState {
  const [data, setData] = useState<SheetData | null>(() => (getKey() ? loadCache() : null));
  const [needKey, setNeedKey] = useState(() => !getKey());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Now>(() => getNow());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchSheet());
      setError(null);
      setNeedKey(false);
    } catch (e) {
      if (e instanceof AuthError) {
        // Kode salah atau sudah diganti: hapus data simpanan juga.
        if (getKey()) clearKey();
        setData(null);
        setNeedKey(true);
      }
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const tick = window.setInterval(() => setNow(getNow()), 30_000);
    const poll = window.setInterval(() => void refresh(), REFRESH_MINUTES * 60_000);
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      setNow(getNow());
      void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const days = useMemo(() => (data ? buildTrip(data) : []), [data]);

  const submitKey = useCallback(
    (key: string) => {
      setKey(key);
      void refresh();
    },
    [refresh],
  );

  return { days, now, loading, error, updatedAt: data?.updatedAt, needKey, refresh: () => void refresh(), submitKey };
}
