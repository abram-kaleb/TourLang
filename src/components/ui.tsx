import type { ReactNode } from 'react';
import type { Rel } from '../types';
import { Icon, type IconName } from './Icon';

type Tone = 'light' | 'dark' | 'paper';

/** Label waktu relatif di pojok kartu. */
export function RelChip({ rel, tone }: { rel: Rel; tone: Tone }) {
  let cls = 'bg-white text-ink';
  if (tone === 'dark') cls = 'bg-white/15 text-white';
  if (tone === 'paper') cls = 'bg-ink/[0.06] text-ink';
  if (rel.kind === 'done') cls = tone === 'dark' ? 'bg-white/10 text-white/85' : 'bg-ink/[0.07] text-soft';
  if (rel.kind === 'live') cls = tone === 'dark' ? 'bg-accent text-white ring-2 ring-white/80' : 'bg-accent text-white';
  return <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-bold ${cls}`}>{rel.text}</span>;
}

/** Badge tugas yang belum beres (belum dipesan, reservasi, pesan online). */
export function TodoBadge({ text }: { text: string }) {
  if (!text) return null;
  return (
    <span className="inline-flex items-center gap-1.5 self-start rounded-lg bg-[#FFE4D5] px-2.5 py-1.5 text-xs font-bold text-[#9A3412]">
      <Icon name="alert" size={14} stroke={2.4} />
      {text}
    </span>
  );
}

const BTN = 'flex h-[50px] flex-1 items-center justify-center gap-2 rounded-[14px] text-[15px] font-bold';

export function LinkButton({ href, icon, children, className }: { href: string; icon: IconName; children: ReactNode; className: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${BTN} ${className}`}>
      <Icon name={icon} size={18} />
      {children}
    </a>
  );
}

export function ActionButton({
  onClick,
  icon,
  children,
  className,
}: {
  onClick: () => void;
  icon: IconName;
  children: ReactNode;
  className: string;
}) {
  return (
    <button type="button" onClick={onClick} className={`${BTN} cursor-pointer ${className}`}>
      <Icon name={icon} size={18} />
      {children}
    </button>
  );
}

/** Garis sobekan tiket dengan lekukan di kiri dan kanan. */
export function Perforation({ notch = 'bg-ground', line = 'border-[#C3CAD5]' }: { notch?: string; line?: string }) {
  return (
    <div className="relative flex h-6 items-center" aria-hidden="true">
      <span className={`absolute -left-[13px] h-6 w-6 rounded-full ${notch}`} />
      <span className={`mx-[22px] h-0 flex-1 border-t-2 border-dashed ${line}`} />
      <span className={`absolute -right-[13px] h-6 w-6 rounded-full ${notch}`} />
    </div>
  );
}

export function Eyebrow({ children, className = 'text-muted' }: { children: ReactNode; className?: string }) {
  return <span className={`text-[11px] font-bold uppercase tracking-[0.08em] ${className}`}>{children}</span>;
}
