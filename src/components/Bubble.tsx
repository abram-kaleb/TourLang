import { useState, type ReactNode } from 'react';
import { MODE } from '../lib/mode';
import { fmtTime } from '../lib/time';
import type { Card, Rel, TicketCardData } from '../types';
import { Icon, type IconName } from './Icon';

/**
 * Satu agenda = satu bubble obrolan. Semua bubble dari "pengirim" (rata kanan, ekor di kanan atas).
 * Tombol aksi ada di dalam bubble, di baris paling bawah, seperti tombol pesan bisnis.
 * - Tempat (wisata, makan, hotel, belanja): bubble putih, label berwarna sesuai kategori
 * - Acara: bubble gelap dengan judul emas
 * - Kereta, bus, pesawat: bubble berwarna moda
 * - Jalan kaki: bubble kecil hijau muda
 */
export function Bubble({
  card,
  rel,
  first,
  onOpenTicket,
}: {
  card: Card;
  rel: Rel;
  /** Bubble pertama dari pengirim ini secara berurutan: tampilkan avatarnya. */
  first: boolean;
  onOpenTicket: (c: TicketCardData) => void;
}) {
  const sender = senderOf(card);
  if (card.kind === 'ticket') {
    if (card.icon === 'walk') return <WalkBubble card={card} rel={rel} sender={sender} first={first} onOpenTicket={onOpenTicket} />;
    return <RideBubble card={card} rel={rel} sender={sender} first={first} onOpenTicket={onOpenTicket} />;
  }
  return <PlaceBubble card={card} rel={rel} sender={sender} first={first} />;
}

/* ---------- Pengirim: tiap moda dan kategori jadi "anggota grup" dengan avatarnya sendiri ---------- */

export interface Sender {
  key: string;
  name: string;
  icon: IconName;
  /** Warna avatar (latar + ikon). */
  avatar: string;
  /** Warna nama pengirim di dalam bubble. */
  color: string;
}

const SENDERS: Record<string, Sender> = {
  train: { key: 'train', name: 'Kereta', icon: 'train', avatar: 'bg-rail text-white', color: 'text-[#BFD0FF]' },
  bus: { key: 'bus', name: 'Bus', icon: 'bus', avatar: 'bg-road text-white', color: 'text-[#FDE3C2]' },
  plane: { key: 'plane', name: 'Pesawat', icon: 'plane', avatar: 'bg-air text-white', color: 'text-[#BAE6FD]' },
  walk: { key: 'walk', name: 'Jalan kaki', icon: 'walk', avatar: 'bg-trail text-white', color: 'text-trail' },
  key: { key: 'key', name: 'Hotel', icon: 'hotel', avatar: 'bg-keycard text-[#E9C46A]', color: 'text-[#5B21B6]' },
  receipt: { key: 'receipt', name: 'Makan', icon: 'food', avatar: 'bg-[#F59E0B] text-white', color: 'text-[#B45309]' },
  postcard: { key: 'postcard', name: 'Wisata', icon: 'camera', avatar: 'bg-postal text-white', color: 'text-postal' },
  tag: { key: 'tag', name: 'Belanja', icon: 'bag', avatar: 'bg-tag text-white', color: 'text-tag' },
  invite: { key: 'invite', name: 'Acara spesial', icon: 'cap', avatar: 'bg-ink text-gold', color: 'text-gold' },
};

export function senderOf(card: Card): Sender {
  return SENDERS[card.kind === 'ticket' ? card.icon : card.kind];
}

function Avatar({ sender }: { sender: Sender }) {
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm ${sender.avatar}`} title={sender.name}>
      <Icon name={sender.icon} size={18} stroke={2.2} />
    </span>
  );
}

/* ---------- Bagian yang dipakai bersama ---------- */

function timeRange(card: Card): string {
  const end = card.endMin != null ? fmtTime(card.endMin) + (card.endNextDay ? '+1' : '') : '';
  return end ? `${fmtTime(card.startMin)} – ${end}` : fmtTime(card.startMin);
}

function durOf(card: Card): number | null {
  if (card.endMin == null) return null;
  const d = card.endMin - card.startMin + (card.endNextDay ? 1440 : 0);
  return d > 0 ? d : null;
}

function fmtDur(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} mnt`;
  return m ? `${h}j ${m}m` : `${h} jam`;
}

/** Jam di pojok bubble, plus centang dua kalau sudah selesai (seperti pesan terbaca). */
function Stamp({ card, rel, light }: { card: Card; rel: Rel; light?: boolean }) {
  return (
    <span className={`flex items-center justify-end gap-1 font-mono text-[11px] font-semibold ${light ? 'text-white/75' : 'text-muted'}`}>
      {rel.kind === 'future' && <span className="mr-1 font-sans font-bold">{rel.text}</span>}
      {timeRange(card)}
      {rel.kind === 'done' && (
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" aria-label="Selesai" className={light ? 'text-white' : 'text-[#2563EB]'}>
          <path d="M1 6l3 3 6-7M6 9l1 0.5L14 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

function LiveTag() {
  return (
    <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
      <span className="animate-live h-2 w-2 rounded-full bg-accent" />
      Sedang berlangsung
    </span>
  );
}

function Todo({ text }: { text: string }) {
  if (!text) return null;
  return (
    <span className="mt-2 inline-flex items-center gap-1.5 self-start rounded-lg bg-[#FFE4D5] px-2 py-1 text-xs font-bold text-[#9A3412]">
      <Icon name="alert" size={13} stroke={2.4} />
      {text}
    </span>
  );
}

/** Kerangka bubble masuk: rata kiri dengan avatar pengirim, ekor di kiri atas pada bubble pertama. */
function Shell({
  rel,
  sender,
  first,
  className,
  narrow,
  children,
}: {
  rel: Rel;
  sender: Sender;
  first: boolean;
  className: string;
  narrow?: boolean;
  children: ReactNode;
}) {
  const live = rel.kind === 'live';
  return (
    <div className={`flex flex-col ${narrow ? 'pr-14' : 'pr-6'} ${rel.kind === 'done' ? 'opacity-70' : ''}`}>
      {live && (
        <span className="pl-11">
          <LiveTag />
        </span>
      )}
      <div className="flex items-start gap-2">
        {first ? <Avatar sender={sender} /> : <span className="w-9 shrink-0" aria-hidden="true" />}
        <div
          className={`relative min-w-0 max-w-[340px] overflow-hidden rounded-[20px] shadow-card ${first ? 'rounded-tl-[6px]' : ''} ${className} ${
            live ? 'ring-[3px] ring-accent ring-offset-2 ring-offset-wall' : ''
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* Tombol di dalam bubble: satu baris di bawah, dipisah garis tipis. */
export interface Action {
  label: string;
  icon: IconName;
  href?: string;
  onClick?: () => void;
}

function Actions({ items, tone }: { items: Action[]; tone: 'light' | 'dark' | 'walk' }) {
  if (!items.length) return null;
  const line = tone === 'dark' ? 'border-white/20 divide-white/20' : tone === 'walk' ? 'border-trail/20 divide-trail/20' : 'border-line divide-line';
  const text = tone === 'dark' ? 'text-white' : tone === 'walk' ? 'text-trail' : 'text-[#1D4ED8]';
  const btn = `flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 px-2 text-[14px] font-bold ${text} active:bg-black/5`;
  return (
    <div className={`flex divide-x border-t ${line}`}>
      {items.map((a) =>
        a.href ? (
          <a key={a.label} href={a.href} target="_blank" rel="noopener noreferrer" className={btn}>
            <Icon name={a.icon} size={16} stroke={2.2} />
            <span className="truncate">{a.label}</span>
          </a>
        ) : (
          <button key={a.label} type="button" onClick={a.onClick} className={btn}>
            <Icon name={a.icon} size={16} stroke={2.2} />
            <span className="truncate">{a.label}</span>
          </button>
        ),
      )}
    </div>
  );
}

/* ---------- Kereta, bus, pesawat ---------- */

function RideBubble({ card, rel, sender, first, onOpenTicket }: { card: TicketCardData; rel: Rel; sender: Sender; first: boolean; onOpenTicket: (c: TicketCardData) => void }) {
  const icon = card.icon === 'walk' ? 'train' : card.icon;
  const m = MODE[icon];
  const dur = durOf(card);
  const actions: Action[] = [];
  if (card.ticket || card.pass) actions.push({ label: icon === 'plane' ? 'Boarding pass' : 'Lihat tiket', icon: 'ticket', onClick: () => onOpenTicket(card) });
  if (card.nav) actions.push({ label: 'Navigasi', icon: 'navigate', href: card.nav });

  return (
    <Shell rel={rel} sender={sender} first={first} className={`flex-1 text-white ${m.head}`}>
      <div className="px-4 pb-2.5 pt-3">
        <span className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] ${m.eyebrow}`}>
          {m.label}
          {card.mode.toLowerCase() !== m.label.toLowerCase() && <span className="normal-case tracking-normal">· {card.mode}</span>}
        </span>

        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-2">
          <span className="line-clamp-2 font-display text-[19px] font-bold leading-tight">{card.from}</span>
          <span className="flex flex-col items-center pt-1 text-white/80">
            <Icon name="arrowRight" size={18} stroke={2.4} />
            {dur && <span className="mt-0.5 whitespace-nowrap font-mono text-[10px] font-semibold">{fmtDur(dur)}</span>}
          </span>
          <span className="line-clamp-2 text-right font-display text-[19px] font-bold leading-tight">{card.to}</span>
        </div>

        <p className="mt-2 text-sm font-semibold text-white/90">{card.title}</p>
        {card.note && <p className="mt-0.5 line-clamp-3 text-[13px] leading-snug text-white/75">{card.note}</p>}

        {card.details.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {card.details.map((d) => (
              <span key={d.label} className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-semibold">
                <span className="text-white/70">{d.label}</span> {d.value}
              </span>
            ))}
          </div>
        )}
        {card.status && (
          <div className="flex">
            <Todo text={card.status} />
          </div>
        )}
        <div className="mt-1.5">
          <Stamp card={card} rel={rel} light />
        </div>
      </div>
      <Actions items={actions} tone="dark" />
    </Shell>
  );
}

/* ---------- Jalan kaki: pesan pendek ---------- */

function WalkBubble({ card, rel, sender, first, onOpenTicket }: { card: TicketCardData; rel: Rel; sender: Sender; first: boolean; onOpenTicket: (c: TicketCardData) => void }) {
  const dur = durOf(card);
  const actions: Action[] = [];
  if (card.nav) actions.push({ label: 'Tunjukkan jalan', icon: 'navigate', href: card.nav });
  if (card.ticket || card.pass) actions.push({ label: 'Tiket', icon: 'ticket', onClick: () => onOpenTicket(card) });

  return (
    <Shell rel={rel} sender={sender} first={first} narrow className="border border-dashed border-trail/40 bg-[#DCF2DC] text-ink">
      <div className="px-3.5 pb-2 pt-2.5">
        <p className="text-[15px] leading-snug">
          <span>
            <b className="text-trail">{dur ? `${fmtDur(dur)} jalan kaki` : 'Jalan kaki'}</b>
            {card.to && (
              <>
                {' '}ke <b>{card.to}</b>
              </>
            )}
          </span>
        </p>
        {card.title && !card.title.toLowerCase().includes(card.to.toLowerCase()) && <p className="mt-1 text-[13px] text-soft">{card.title}</p>}
        {card.note && <p className="mt-1 text-[13px] leading-snug text-soft">{card.note}</p>}
        {card.status && (
          <div className="flex">
            <Todo text={card.status} />
          </div>
        )}
        <div className="mt-1">
          <Stamp card={card} rel={rel} />
        </div>
      </div>
      <Actions items={actions} tone="walk" />
    </Shell>
  );
}

/* ---------- Tempat ---------- */

const PLACE: Record<Exclude<Card['kind'], 'ticket'>, { label: string; icon: IconName; color: string }> = {
  key: { label: 'Hotel', icon: 'hotel', color: 'text-[#5B21B6]' },
  receipt: { label: 'Makan', icon: 'food', color: 'text-[#B45309]' },
  postcard: { label: 'Wisata', icon: 'camera', color: 'text-postal' },
  tag: { label: 'Belanja', icon: 'bag', color: 'text-tag' },
  invite: { label: 'Acara spesial', icon: 'cap', color: 'text-gold' },
};

function PlaceBubble({ card, rel, sender, first }: { card: Exclude<Card, TicketCardData>; rel: Rel; sender: Sender; first: boolean }) {
  const p = PLACE[card.kind];
  const invite = card.kind === 'invite';
  const [story, setStory] = useState(false);
  const dest = card.dest;
  const photo = dest?.photo;
  const hotel = card.kind === 'key' ? card.hotel : undefined;
  const unbooked = hotel && !hotel.booked;
  const city = card.city ? card.city.charAt(0).toUpperCase() + card.city.slice(1) : '';
  const where = hotel ? '' : card.place || city;

  const actions: Action[] = [];
  if (dest?.history) actions.push({ label: story ? 'Tutup' : 'Sejarah', icon: 'book', onClick: () => setStory((v) => !v) });
  if (card.link) actions.push({ label: hotel ? 'Booking' : 'Tiket', icon: 'file', href: card.link });
  if (card.nav) actions.push({ label: 'Navigasi', icon: 'navigate', href: card.nav });

  const shell = invite ? 'bg-ink text-white' : unbooked ? 'border-2 border-dashed border-[#F59E0B] bg-[#FFF7ED] text-ink' : 'bg-white text-ink';

  return (
    <Shell rel={rel} sender={sender} first={first} className={`flex-1 ${shell}`}>
      {photo && (
        <div className="h-40 w-full bg-postal">
          <img src={photo} alt={card.title} loading="lazy" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="px-4 pb-2.5 pt-3">
        <span className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] ${p.color}`}>
          {p.label}
          {where && <span className={`truncate normal-case tracking-normal ${invite ? 'text-white/60' : 'text-muted'}`}>· {where}</span>}
        </span>

        {hotel ? (
          <>
            <p className="mt-1 font-display text-lg font-bold leading-tight">{hotel.name}</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-2">
              {card.kind === 'key' && (
                <span className="rounded-md border-2 border-current px-2 py-0.5 text-xs font-extrabold uppercase tracking-[0.06em] text-[#5B21B6]">
                  {card.action}
                </span>
              )}
              <span className="text-sm">{card.title}</span>
            </p>
            {unbooked && <p className="mt-1.5 text-[13px] font-semibold text-[#9A3412]">Belum dipesan.</p>}
          </>
        ) : (
          <p className={`mt-1 font-bold leading-snug ${invite ? 'font-display text-xl text-gold' : 'text-base'}`}>{card.title}</p>
        )}

        {card.note && <p className={`mt-1 text-[14px] leading-snug ${invite ? 'text-white/80' : 'text-soft'}`}>{card.note}</p>}
        {card.kind === 'tag' && card.taxFree && (
          <span className="mt-2 inline-block -rotate-2 rounded-md bg-tag px-2 py-0.5 text-xs font-extrabold tracking-[0.08em] text-white">TAX FREE</span>
        )}
        {card.status && (
          <div className="flex">
            <Todo text={card.status} />
          </div>
        )}

        {story && dest?.history && (
          <div className={`mt-2.5 rounded-xl p-3 text-[14px] leading-relaxed ${invite ? 'bg-white/10' : 'bg-paper'}`}>
            <p className={`mb-1 text-[11px] font-bold uppercase tracking-[0.08em] ${p.color}`}>Sejarah {dest.name}</p>
            <p className="whitespace-pre-line">{dest.history}</p>
            {dest.photoSource && (
              <a href={dest.photoSource} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-block text-xs underline opacity-70">
                Sumber foto
              </a>
            )}
          </div>
        )}

        <div className="mt-1.5">
          <Stamp card={card} rel={rel} light={invite} />
        </div>
      </div>
      <Actions items={actions} tone={invite ? 'dark' : 'light'} />
    </Shell>
  );
}
