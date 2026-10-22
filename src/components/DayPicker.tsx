import { useEffect } from 'react';
import { dateRange, dayOfMonth, DOW_SHORT, dow, fmtAgo } from '../lib/time';
import type { Day } from '../types';
import { Icon } from './Icon';

/** Kalender seluruh trip. Titik oranye = hari spesial (ada kegiatan berkategori acara). */
export function DayPicker({
  days,
  current,
  onPick,
  onClose,
  updatedAt,
  error,
  loading,
  onRefresh,
}: {
  days: Day[];
  current: number;
  onPick: (d: number) => void;
  onClose: () => void;
  updatedAt?: string;
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const keys = days.length ? dateRange(days[0].key, days[days.length - 1].key) : [];

  return (
    <div className="fixed inset-0 z-[500] flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="Pilih hari">
      <button type="button" aria-label="Tutup" onClick={onClose} className="absolute inset-0 cursor-pointer bg-ink/45" />
      <div className="animate-sheet-up relative flex max-h-[90%] flex-col gap-3.5 overflow-y-auto rounded-t-[28px] bg-white px-5 pb-7 pt-3">
        <span className="h-[5px] w-10 self-center rounded-full bg-line" aria-hidden="true" />
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold">Pilih hari</h2>
          <span className="font-mono text-[13px] font-semibold text-muted">{keys.length} hari</span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {keys.map((key) => {
            const di = days.findIndex((d) => d.key === key);
            const day = di >= 0 ? days[di] : undefined;
            const selected = di === current;
            return (
              <button
                key={key}
                type="button"
                disabled={!day}
                onClick={() => day && onPick(di)}
                className={`relative flex h-16 min-w-0 cursor-pointer flex-col items-center justify-center gap-px rounded-[14px] px-1 disabled:cursor-default disabled:opacity-50 ${
                  selected ? 'bg-accent text-white' : day ? 'border border-line bg-white' : 'border border-line bg-[#F3F5F8]'
                }`}
              >
                <span className="text-[11px] font-semibold">{DOW_SHORT[dow(key)]}</span>
                <span className="font-mono text-lg font-semibold leading-tight">{dayOfMonth(key)}</span>
                <span className="max-w-full truncate text-[11px] font-semibold">{day?.city ?? ''}</span>
                {day?.special && <span className="absolute right-[7px] top-[7px] h-2 w-2 rounded-full bg-[#F59E0B]" aria-label="Hari spesial" />}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-3 text-[13px] text-muted">
          <span>
            {error ? `Offline · data ${fmtAgo(updatedAt)}` : `Data diperbarui ${fmtAgo(updatedAt)}`}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 font-semibold text-ink disabled:opacity-50"
          >
            <Icon name="refresh" size={16} />
            {loading ? 'Memuat…' : 'Muat ulang'}
          </button>
        </div>
      </div>
    </div>
  );
}
