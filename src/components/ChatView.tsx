import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { findNowPos } from '../lib/position';
import { dayOfMonth, DOW_SHORT, dow, labelShort, type Now } from '../lib/time';
import type { Day, TicketCardData } from '../types';
import { DayFeed } from './DayFeed';
import { DayPicker } from './DayPicker';
import { TicketSheet } from './TicketSheet';

interface Props {
  days: Day[];
  now: Now;
  updatedAt?: string;
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
}

/**
 * Tampilan v2: tiap hari satu halaman obrolan.
 * Geser kiri-kanan untuk pindah hari (scroll-snap bawaan browser, jadi mulus di HP),
 * scroll ke bawah untuk melihat agenda hari itu.
 */
export function ChatView({ days, now, updatedAt, error, loading, onRefresh }: Props) {
  const nowPos = useMemo(() => findNowPos(days, now), [days, now]);
  const [d, setD] = useState(nowPos.d);
  const [picker, setPicker] = useState(false);
  const [ticketCard, setTicketCard] = useState<TicketCardData | null>(null);

  const pagerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stripRef = useRef<HTMLDivElement>(null);

  const cur = Math.min(d, days.length - 1);

  /** Scroll vertikal halaman hari ke agenda "sekarang" (atau ke atas untuk hari lain). */
  const focusPage = useCallback(
    (di: number, smooth: boolean) => {
      const page = pageRefs.current[di];
      if (!page) return;
      const target =
        di === nowPos.d
          ? page.querySelector<HTMLElement>('#now-line') ?? page.querySelector<HTMLElement>(`#card-${CSS.escape(days[di].cards[nowPos.i]?.id ?? '')}`)
          : null;
      if (target) {
        const top = target.offsetTop - page.clientHeight * 0.3;
        page.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
      }
    },
    [days, nowPos],
  );

  const goDay = useCallback((di: number, smooth = true) => {
    const pager = pagerRef.current;
    if (!pager) return;
    pager.scrollTo({ left: di * pager.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
    setD(di);
  }, []);

  // Pertama dibuka: langsung ke hari ini dan ke agenda yang sedang/akan berlangsung.
  useLayoutEffect(() => {
    goDay(nowPos.d, false);
    focusPage(nowPos.d, false);
    // Hanya sekali saat mulai; perubahan data berikutnya tidak memindahkan layar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hari aktif mengikuti posisi geser.
  const onScroll = () => {
    const pager = pagerRef.current;
    if (!pager || !pager.clientWidth) return;
    const di = Math.round(pager.scrollLeft / pager.clientWidth);
    if (di !== cur && di >= 0 && di < days.length) setD(di);
  };

  // Jaga posisi saat layar diputar atau ukurannya berubah.
  useEffect(() => {
    const onResize = () => {
      const pager = pagerRef.current;
      if (pager) pager.scrollTo({ left: cur * pager.clientWidth });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [cur]);

  // Strip tanggal di bawah ikut menggeser supaya hari aktif selalu kelihatan.
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-day="${cur}"]`);
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [cur]);

  // Panah kiri/kanan di keyboard (untuk dicoba di laptop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (picker || ticketCard) return;
      if (e.key === 'ArrowRight' && cur < days.length - 1) goDay(cur + 1);
      if (e.key === 'ArrowLeft' && cur > 0) goDay(cur - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cur, days.length, goDay, picker, ticketCard]);

  const goNow = () => {
    goDay(nowPos.d);
    // Tunggu geser horizontal selesai dulu baru scroll vertikal.
    window.setTimeout(() => focusPage(nowPos.d, true), cur === nowPos.d ? 0 : 380);
  };

  const onToday = cur === nowPos.d;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-wall">
      {/* Halaman per hari, berjajar ke samping */}
      <div ref={pagerRef} onScroll={onScroll} className="day-pager flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        {days.map((dd, di) => (
          <DayFeed
            key={dd.key}
            ref={(el) => {
              pageRefs.current[di] = el;
            }}
            day={dd}
            now={now}
            isLast={di === days.length - 1}
            hasNext={di < days.length - 1}
            offline={Boolean(error)}
            onOpenTicket={setTicketCard}
            onNext={() => goDay(di + 1)}
            onPickDay={() => setPicker(true)}
          />
        ))}
      </div>

      {/* Strip tanggal di bawah, mengambang di atas obrolan */}
      <nav
        aria-label="Hari perjalanan"
        className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 px-3 pb-[max(env(safe-area-inset-bottom),12px)]"
      >
        {!onToday && (
          <button
            type="button"
            onClick={goNow}
            aria-label="Kembali ke sekarang"
            className="pointer-events-auto flex h-14 shrink-0 cursor-pointer flex-col items-center justify-center rounded-full bg-accent px-3.5 text-[11px] font-bold leading-tight text-white shadow-card"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            Sekarang
          </button>
        )}
        <div
          ref={stripRef}
          className="no-scrollbar pointer-events-auto flex max-w-[440px] gap-1 overflow-x-auto rounded-full bg-ink/90 p-1.5 shadow-card backdrop-blur"
        >
          {days.map((dd, di) => {
            const active = di === cur;
            const isNow = di === nowPos.d;
            return (
              <button
                key={dd.key}
                type="button"
                data-day={di}
                onClick={() => goDay(di)}
                aria-label={labelShort(dd.key)}
                aria-current={active ? 'date' : undefined}
                className={`relative flex h-11 w-10 shrink-0 cursor-pointer flex-col items-center justify-center rounded-full leading-none transition-colors ${
                  active ? 'bg-white text-ink' : 'text-white/80'
                }`}
              >
                <span className={`text-[9px] font-bold uppercase ${active ? 'text-muted' : 'text-white/50'}`}>{DOW_SHORT[dow(dd.key)]}</span>
                <span className="font-display text-[15px] font-bold">{dayOfMonth(dd.key)}</span>
                {(isNow || dd.special) && (
                  <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isNow ? 'bg-accent' : 'bg-gold'}`} aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {picker && (
        <DayPicker
          days={days}
          current={cur}
          onPick={(di) => {
            setPicker(false);
            goDay(di, false);
          }}
          onClose={() => setPicker(false)}
          updatedAt={updatedAt}
          error={error}
          loading={loading}
          onRefresh={onRefresh}
        />
      )}
      {ticketCard && <TicketSheet card={ticketCard} onClose={() => setTicketCard(null)} />}
    </div>
  );
}
