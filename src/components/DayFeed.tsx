import { forwardRef, Fragment, type ReactNode } from 'react';
import { relOf } from '../lib/position';
import { fmtDuration, fmtTime, labelShort, type Now } from '../lib/time';
import type { Day, TicketCardData } from '../types';
import { Bubble, senderOf } from './Bubble';

/** Pesan sistem di tengah, seperti label tanggal di aplikasi chat. */
function SystemPill({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-center">
      <span
        className="rounded-full bg-white/70 px-3 py-1 text-center text-xs font-semibold text-muted shadow-sm"
      >
        {children}
      </span>
    </div>
  );
}

function NowLine({ min }: { min: number }) {
  return (
    <div id="now-line" className="flex scroll-mt-28 items-center gap-2 py-1" aria-label={`Sekarang ${fmtTime(min)}`}>
      <span className="h-0.5 flex-1 rounded bg-accent" />
      <span className="rounded-full bg-accent px-2.5 py-0.5 font-mono text-xs font-bold text-white">Sekarang {fmtTime(min)}</span>
      <span className="h-0.5 flex-1 rounded bg-accent" />
    </div>
  );
}

/** Jeda kosong lebih dari ini (menit) diberi pesan "waktu bebas". */
const GAP_MIN = 45;

/**
 * Satu hari = satu halaman yang di-scroll ke bawah.
 * Isinya: label tanggal, bubble per agenda berurutan jam, garis "Sekarang" kalau hari ini,
 * jeda waktu bebas, dan pesan penutup yang mengajak geser ke hari berikutnya.
 */
export const DayFeed = forwardRef<
  HTMLDivElement,
  {
    day: Day;
    now: Now;
    isLast: boolean;
    hasNext: boolean;
    offline: boolean;
    onOpenTicket: (c: TicketCardData) => void;
    onNext: () => void;
    onPickDay: () => void;
  }
>(function DayFeed({ day, now, isLast, hasNext, offline, onOpenTicket, onNext, onPickDay }, ref) {
  const today = day.key === now.key;
  // Garis "Sekarang" ditaruh sebelum agenda pertama yang belum mulai.
  const nowIdx = today ? day.cards.findIndex((c) => c.startMin > now.min) : -1;
  const nowAt = today ? (nowIdx < 0 ? day.cards.length : nowIdx) : -1;

  return (
    <div ref={ref} className="day-page chat-wall h-full w-full shrink-0 overflow-y-auto">
      {/* Header tipis milik halaman ini: hari, tanggal, lokasi. Ketuk untuk buka kalender. */}
      <button
        type="button"
        onClick={onPickDay}
        aria-label={`${labelShort(day.key)}, ${day.route}. Pilih hari lain`}
        className="sticky top-0 z-10 flex w-full cursor-pointer items-center justify-center gap-1.5 border-b border-black/5 bg-wall/85 px-4 pb-2 pt-[max(env(safe-area-inset-top),8px)] text-[13px] backdrop-blur"
      >
        <span className="font-bold">{labelShort(day.key)}</span>
        {(day.route || day.city) && <span className="truncate text-muted">· {day.route || day.city}</span>}
        {offline && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F59E0B]" title="Offline, memakai data simpanan" />}
      </button>
      <div className="mx-auto flex max-w-[440px] flex-col gap-3 px-3 pb-28 pt-3">
        {day.special && <SystemPill>Ada acara spesial hari ini</SystemPill>}

        {day.cards.map((card, i) => {
          const prev = day.cards[i - 1];
          const prevEnd = prev ? (prev.endMin ?? prev.startMin) + (prev.endNextDay ? 1440 : 0) : null;
          const gap = prevEnd != null && !prev.endNextDay ? card.startMin - prevEnd : 0;
          const showNow = nowAt === i;
          // Avatar muncul lagi kalau pengirim berganti, atau ada pemisah (jeda, garis sekarang) di antaranya.
          const first = !prev || senderOf(prev).key !== senderOf(card).key || gap >= GAP_MIN || showNow;
          return (
            <Fragment key={card.id}>
              {nowAt === i && now.min <= (prevEnd ?? 0) && <NowLine min={now.min} />}
              {gap >= GAP_MIN && <SystemPill>Waktu bebas {fmtDuration(gap)}</SystemPill>}
              {nowAt === i && now.min > (prevEnd ?? 0) && <NowLine min={now.min} />}
              <div id={`card-${card.id}`} className="animate-bubble scroll-mt-28" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                <Bubble card={card} rel={relOf(card, now)} first={first} onOpenTicket={onOpenTicket} />
              </div>
            </Fragment>
          );
        })}
        {nowAt === day.cards.length && <NowLine min={now.min} />}

        <div className="mt-4 flex justify-center">
          {hasNext ? (
            <button
              type="button"
              onClick={onNext}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[13px] font-bold text-white shadow-card"
            >
              Lanjut ke hari berikutnya
              <span aria-hidden="true">→</span>
            </button>
          ) : (
            isLast && <SystemPill>Akhir perjalanan. Sampai jumpa di rumah!</SystemPill>
          )}
        </div>
      </div>
    </div>
  );
});
