import { useEffect } from 'react';
import { MODE } from '../lib/mode';
import { parseTime } from '../lib/time';
import type { Leg, TicketCardData } from '../types';
import { Icon } from './Icon';
import { LinkButton, Perforation } from './ui';

type Step =
  | { type: 'stop'; time: string; station: string; platform?: string }
  | { type: 'ride'; train: string; seat?: string }
  | { type: 'transfer'; title: string; sub?: string };

function stepsOf(legs: Leg[], change: string): Step[] {
  const out: Step[] = [];
  legs.forEach((leg, i) => {
    if (i > 0) {
      const prev = legs[i - 1];
      const gap = (parseTime(leg.dep) ?? 0) - (parseTime(prev.arr) ?? 0);
      const sub =
        prev.arrPlatform && leg.platform ? `Turun di peron ${prev.arrPlatform}, pindah ke peron ${leg.platform}.` : undefined;
      out.push({ type: 'transfer', title: `${change} di ${prev.to}${gap > 0 ? ` · ${gap} menit` : ''}`, sub });
    }
    out.push({ type: 'stop', time: leg.dep, station: leg.from, platform: leg.platform });
    out.push({ type: 'ride', train: leg.train, seat: leg.seat });
    out.push({ type: 'stop', time: leg.arr, station: leg.to, platform: leg.arrPlatform });
  });
  return out;
}

/** Panel tiket dari bawah: boarding pass dengan rute per kereta, atau kartu Deutschlandticket / metro. */
export function TicketSheet({ card, onClose }: { card: TicketCardData; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const t = card.ticket;
  const pass = card.pass;

  return (
    <div className="fixed inset-0 z-[600] flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="Tiket">
      <button type="button" aria-label="Tutup tiket" onClick={onClose} className="absolute inset-0 cursor-pointer bg-ink/50" />
      <div className="animate-sheet-up relative flex max-h-[92%] flex-col gap-3.5 overflow-y-auto rounded-t-[28px] bg-wall px-4 pb-7 pt-3">
        <span className="h-[5px] w-10 self-center rounded-full bg-[#C3CAD5]" aria-hidden="true" />
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display text-2xl font-bold">Tiket</h2>
          <button type="button" aria-label="Tutup" onClick={onClose} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white">
            <Icon name="close" size={18} stroke={2.2} />
          </button>
        </div>

        {t && (
          <>
            <div className="relative rounded-[20px] bg-ink text-white">
              <div className="flex flex-col gap-3.5 px-4 pb-3.5 pt-4">
                <span className="text-[13px] font-semibold text-[#C9D1DD]">{t.label}</span>
                <div className="flex items-start gap-2">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-display text-2xl font-bold">{t.from}</span>
                    <span className="pt-1.5 font-mono text-[22px] font-semibold">{t.dep}</span>
                    <span className="text-xs text-[#C9D1DD]">{t.dateFrom}</span>
                  </div>
                  <span className="mt-3.5 h-0 flex-1 border-t-2 border-dashed border-[#3B4A63]" aria-hidden="true" />
                  <div className="flex min-w-0 flex-col items-end gap-0.5 text-right">
                    <span className="font-display text-2xl font-bold">{t.to}</span>
                    <span className="flex items-baseline gap-1 pt-1.5">
                      <span className="font-mono text-[22px] font-semibold">{t.arr}</span>
                      {t.nextDay && <span className="rounded bg-gold px-1.5 text-xs font-bold text-ink">+1</span>}
                    </span>
                    <span className="text-xs text-[#C9D1DD]">{t.dateTo}</span>
                  </div>
                </div>
              </div>
              <Perforation notch="bg-wall" line="border-[#3B4A63]" />
              <ol className="flex flex-col px-4 pb-4 pt-2.5">
                {stepsOf(t.legs, MODE[card.icon].change).map((s, i) => (
                  <li key={i}>
                    {s.type === 'stop' && (
                      <div className="flex items-start gap-3">
                        <span className="w-[50px] shrink-0 font-mono text-[17px] font-semibold">{s.time}</span>
                        <span className="flex w-3 shrink-0 justify-center pt-[5px]">
                          <span className="h-2.5 w-2.5 rounded-full bg-gold" />
                        </span>
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span className="text-[15px] font-bold">{s.station}</span>
                          {s.platform && (
                            <span className="whitespace-nowrap rounded-md bg-gold px-[7px] py-0.5 text-xs font-bold text-ink">Peron {s.platform}</span>
                          )}
                        </span>
                      </div>
                    )}
                    {s.type === 'ride' && (
                      <div className="flex items-stretch gap-3">
                        <span className="w-[50px] shrink-0" />
                        <span className="flex w-3 shrink-0 justify-center">
                          <span className="w-0.5 bg-[#3B4A63]" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col items-start gap-1 pb-2.5 pt-2">
                          <span className="rounded-md bg-[#1E2A3D] px-2 py-[3px] text-[13px] font-bold">{s.train}</span>
                          {s.seat && <span className="text-[13px] leading-snug text-[#C9D1DD]">{s.seat}</span>}
                        </span>
                      </div>
                    )}
                    {s.type === 'transfer' && (
                      <div className="my-1.5 flex items-center gap-2.5 rounded-xl bg-gold px-3 py-2.5 text-ink">
                        <Icon name="swap" size={20} stroke={2.2} />
                        <span className="flex flex-col">
                          <span className="text-sm font-bold">{s.title}</span>
                          {s.sub && <span className="text-[13px]">{s.sub}</span>}
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
            {t.note && <p className="px-1 text-sm leading-relaxed text-soft">{t.note}</p>}
            {t.pdf && (
              <div className="flex">
                <LinkButton href={t.pdf} icon="file" className="bg-accent text-white">
                  Buka PDF tiket
                </LinkButton>
              </div>
            )}
          </>
        )}

        {!t && pass && (
          <div className="flex flex-col gap-3 rounded-[20px] bg-[#DCE8FF] p-[18px]">
            <span className="font-display text-2xl font-bold text-rail">{pass.name}</span>
            <div className="flex flex-col gap-1 rounded-[14px] bg-white/75 p-3">
              <span className="text-base font-bold">
                {card.from} → {card.to}
              </span>
              <span className="font-mono text-[15px] font-semibold text-soft">{card.mode}</span>
              {pass.via && <span className="text-sm text-soft">{pass.via}</span>}
            </div>
            {pass.tips && <p className="text-[15px] leading-relaxed">{pass.tips}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
