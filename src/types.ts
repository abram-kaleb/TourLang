import type { ModeIcon } from './lib/mode';

/** Satu baris sheet. Nama kolom sudah huruf kecil, nilai sudah berupa teks. */
export type Row = Record<string, string>;

export interface SheetData {
  updatedAt: string;
  sheets: Record<string, Row[]>;
  /** Foto di folder Drive, urut jam diambil. */
  photos: Photo[];
}

export interface Photo {
  /** ID file Google Drive. */
  id: string;
  name: string;
  /** Jam diambil, waktu Eropa Tengah: "2026-11-06T08:35". */
  t: string;
}

export type Kategori = 'transport' | 'hotel' | 'makan' | 'wisata' | 'belanja' | 'acara';

export interface Detail {
  label: string;
  value: string;
}

export interface Leg {
  train: string;
  from: string;
  dep: string;
  platform?: string;
  to: string;
  arr: string;
  arrPlatform?: string;
  seat?: string;
}

export interface TicketInfo {
  label: string;
  from: string;
  to: string;
  dep: string;
  arr: string;
  nextDay: boolean;
  dateFrom: string;
  dateTo: string;
  booking?: string;
  note?: string;
  pdf?: string;
  legs: Leg[];
}

/** Tiket langganan atau kartu transport kota, diambil dari tab catatan. */
export interface PassInfo {
  name: string;
  tips: string;
  via?: string;
}

export interface HotelInfo {
  name: string;
  room?: string;
  checkIn?: string;
  booked: boolean;
}

export interface DestInfo {
  name: string;
  photo?: string;
  photoSource?: string;
  history?: string;
}

interface CardBase {
  id: string;
  dayKey: string;
  startMin: number;
  endMin?: number;
  /** Selesai keesokan harinya, misalnya kereta tidur. */
  endNextDay: boolean;
  kategori: Kategori;
  title: string;
  place: string;
  note: string;
  city: string;
  status: string;
  nav?: string;
  link?: string;
  /** Foto dan sejarah tempat (kolom foto, sumber foto, sejarah di rundown). */
  dest?: DestInfo;
}

export type TicketCardData = CardBase & {
  kind: 'ticket';
  mode: string;
  icon: ModeIcon;
  from: string;
  to: string;
  details: Detail[];
  ticket?: TicketInfo;
  pass?: PassInfo;
  /** Link Maps stasiun asal: kolom gmaps baris ini. */
  fromNav?: string;
  /** Link Maps stasiun tujuan: kolom gmaps baris rundown berikutnya yang tempatnya sama dengan tujuan. */
  toNav?: string;
};
export type KeyCardData = CardBase & { kind: 'key'; hotel: HotelInfo; action: string };
export type ReceiptCardData = CardBase & { kind: 'receipt' };
export type PostcardCardData = CardBase & { kind: 'postcard' };
export type TagCardData = CardBase & { kind: 'tag'; taxFree: boolean };
export type InviteCardData = CardBase & { kind: 'invite' };

export type Card =
  | TicketCardData
  | KeyCardData
  | ReceiptCardData
  | PostcardCardData
  | TagCardData
  | InviteCardData;

export interface Day {
  key: string; // yyyy-mm-dd
  route: string;
  city: string;
  special: boolean;
  cards: Card[];
}

export interface Rel {
  text: string;
  kind: 'done' | 'live' | 'future';
  /** Hanya untuk kind 'live': sejauh mana kegiatan berjalan. */
  progress?: Progress;
}

export interface Progress {
  /** 0..1 */
  pct: number;
  /** Sisa menit sampai selesai. */
  left: number;
  /** Jam selesai (menit sejak tengah malam, bisa > 1440). */
  end: number;
}
