/**
 * Mengubah isi sheet menjadi hari dan kartu.
 *
 * Tab rundown adalah sumber utama: satu baris = satu kartu. Tab acara hanya dipakai untuk foto
 * (dicocokkan lewat tanggal + jam). Tab lain (perjalanan, penginapan, catatan, segmen) tidak dibaca.
 *
 * Kolom rundown: tanggal, mulai, selesai, kategori, kegiatan, tempat, keterangan, gmaps, kota,
 * link tiket, booking. Kolom opsional yang mengalahkan tebakan otomatis: dari, ke, moda, aksi, status.
 */
import type { Card, Day, DestInfo, Detail, HotelInfo, Kategori, Row, SheetData, TicketInfo } from '../types';
import type { ModeIcon } from './mode';
import { addDays, fmtTime, labelShort, parseDateKey, parseTime } from './time';

const KATEGORI: Kategori[] = ['transport', 'hotel', 'makan', 'wisata', 'belanja', 'acara'];

const STATUS_HIDDEN = new Set(['', 'fix', 'deutschlandticket']);

function get(row: Row | undefined, ...names: string[]): string {
  if (!row) return '';
  for (const n of names) {
    const v = row[n];
    if (v) return v;
  }
  return '';
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function kategoriOf(s: string): Kategori {
  const k = s.trim().toLowerCase() as Kategori;
  return KATEGORI.includes(k) ? k : 'wisata';
}

/** "ICE 78", "ECE 198 + IR 2114", "FlixBus 806", "TGV 9571". */
function trainNo(text: string): string {
  const trains = text.match(/\b(ICE|ECE|EC|IC|IR|RE|RB|TGV|ES)\s?\d{1,5}\b/g);
  if (trains) return [...new Set(trains)].join(' + ');
  return text.match(/FlixBus\s?\d+/i)?.[0] ?? '';
}

function modeOf(r: Row): string {
  const own = get(r, 'moda');
  if (own) return own;
  const text = `${get(r, 'kegiatan')} ${get(r, 'tempat')} ${get(r, 'keterangan')}`;
  const train = trainNo(`${get(r, 'kegiatan')} ${get(r, 'tempat')}`);
  if (train) return train;
  const metros = [...text.matchAll(/Metro\s?(\d+)/gi)].map((m) => m[1]);
  if (metros.length) return `Metro ${[...new Set(metros)].join(' + ')}`;
  const city = [...new Set(text.match(/\b[SU]\d{1,2}\b/g) ?? [])];
  if (city.length) return city.join(' + ');
  if (/kereta tidur/i.test(text)) return 'Kereta tidur';
  if (/taksi|bus/i.test(text)) return 'Taksi atau bus';
  if (/pesawat|check-in|imigrasi/i.test(text)) return 'Pesawat';
  if (/kereta/i.test(text)) return 'Kereta';
  if (/jalan|menuju/i.test(text)) return 'Jalan kaki';
  return 'Perjalanan';
}

const PLANE = /pesawat|penerbangan|flight|\bterbang\b|boarding|imigrasi/i;
const BUS = /flix|\bbus\b|taksi|taxi|shuttle/i;
const TRAIN = /kereta|\bice\b|\bece\b|tgv|metro|tram|\bre\b|\brb\b|\bes\b|\b[su]\d|\bir\s?\d|\bic\s?\d|\bec\s?\d/i;
const WALK = /jalan|kaki|menuju/i;

function iconOf(mode: string, r: Row): ModeIcon {
  // Moda dicek dulu sendirian, baru judulnya: "Taksi ke bandara" itu bus, bukan pesawat.
  for (const text of [mode, get(r, 'kegiatan')]) {
    if (PLANE.test(text)) return 'plane';
    if (BUS.test(text)) return 'bus';
    if (TRAIN.test(text)) return 'train';
    if (WALK.test(text)) return 'walk';
  }
  if (/check-in|bandara|airport/i.test(get(r, 'kegiatan'))) return 'plane';
  return 'walk';
}

/** Tujuan dari judul seperti "Kereta tidur ES 452 ke Amsterdam". */
function destinationFromTitle(title: string): string {
  const m = title.match(/\bke\s+(.+?)(?:,|$)/i);
  return m ? cap(m[1].trim()) : '';
}

/** Tiket dari kolom rundown saja: jam, dari-ke, booking, link tiket. */
function buildTicket(r: Row, dayKey: string): TicketInfo {
  const dep = parseTime(get(r, 'mulai')) ?? 0;
  const arr = parseTime(get(r, 'selesai')) ?? dep;
  const label = trainNo(`${get(r, 'kegiatan')} ${get(r, 'tempat')}`) || 'Tiket';
  const from = get(r, 'dari') || get(r, 'tempat');
  const to = get(r, 'ke') || destinationFromTitle(get(r, 'kegiatan'));
  const booking = get(r, 'booking');
  return {
    label,
    from,
    to,
    dep: fmtTime(dep),
    arr: fmtTime(arr),
    nextDay: arr < dep,
    dateFrom: labelShort(dayKey),
    dateTo: labelShort(arr < dep ? addDays(dayKey, 1) : dayKey),
    booking: booking || undefined,
    note: get(r, 'keterangan') || undefined,
    pdf: get(r, 'link tiket') || undefined,
    legs: [{ train: label, from, dep: fmtTime(dep), to, arr: fmtTime(arr), seat: booking || undefined }],
  };
}

/** Hotel dari kolom rundown saja: nama dari kolom tempat. */
function hotelOf(r: Row): HotelInfo {
  const tempat = get(r, 'tempat');
  const generic = !tempat || /^hotel$/i.test(tempat);
  return {
    name: generic ? `Hotel di ${cap(get(r, 'kota'))}` : tempat,
    booked: !/belum/i.test(get(r, 'status')),
  };
}

function actionOf(r: Row): string {
  const own = get(r, 'aksi');
  if (own) return own;
  const t = get(r, 'kegiatan').toLowerCase();
  if (t.includes('cek out')) return 'Cek out';
  if (t.includes('cek in')) return 'Cek in';
  if (t.includes('titip koper')) return 'Titip koper';
  if (t.includes('ambil koper')) return 'Ambil koper';
  if (t.includes('sarapan')) return 'Sarapan';
  if (t.includes('bangun')) return 'Bangun';
  if (t.includes('packing')) return 'Packing';
  return 'Di hotel';
}

/** Foto dari tab acara: baris acara di tanggal sama yang jamnya mencakup jam mulai kegiatan. */
function photoFor(dayKey: string, startMin: number, acara: Row[]): DestInfo | undefined {
  const hit = acara.find((a) => {
    if (parseDateKey(get(a, 'tanggal')) !== dayKey || !get(a, 'foto')) return false;
    const s = parseTime(get(a, 'mulai'));
    const e = parseTime(get(a, 'selesai'));
    return s != null && e != null && startMin >= s && startMin < e;
  });
  return hit ? { name: get(hit, 'destinasi'), photo: get(hit, 'foto') } : undefined;
}

function routeOf(cities: string[]): string {
  const seq: string[] = [];
  for (const c of cities) if (c && seq[seq.length - 1] !== c) seq.push(c);
  if (seq.length <= 1) return cap(seq[0] ?? '');
  if (seq.length === 2) return `${cap(seq[0])} → ${cap(seq[1])}`;
  return `${cap(seq[0])} → ${cap(seq[seq.length - 1])}`;
}

export function buildTrip(data: SheetData): Day[] {
  const rundown = data.sheets['rundown'] ?? [];
  const acara = data.sheets['acara'] ?? [];

  const byDay = new Map<string, Card[]>();

  rundown.forEach((r, i) => {
    const dayKey = parseDateKey(get(r, 'tanggal'));
    const startMin = parseTime(get(r, 'mulai'));
    if (!dayKey || startMin == null) return;

    const endRaw = parseTime(get(r, 'selesai'));
    const kategori = kategoriOf(get(r, 'kategori'));
    const base = {
      id: `${dayKey}-${i}`,
      dayKey,
      startMin,
      endMin: endRaw ?? undefined,
      endNextDay: endRaw != null && endRaw < startMin,
      kategori,
      title: get(r, 'kegiatan'),
      place: get(r, 'tempat'),
      note: get(r, 'keterangan'),
      city: get(r, 'kota'),
      status: STATUS_HIDDEN.has(get(r, 'status').toLowerCase()) ? '' : get(r, 'status'),
      nav: get(r, 'gmaps') || undefined,
      link: get(r, 'link tiket') || undefined,
    };

    let card: Card;
    switch (kategori) {
      case 'transport': {
        const ticket = get(r, 'link tiket') ? buildTicket(r, dayKey) : undefined;
        const mode = ticket?.label && ticket.label !== 'Tiket' ? ticket.label : modeOf(r);
        const to = get(r, 'ke') || ticket?.to || destinationFromTitle(base.title) || base.place;
        let from = get(r, 'dari') || ticket?.from || base.place;
        if (!from || from === to) from = cap(base.city);

        const details: Detail[] = [];
        if (get(r, 'booking')) details.push({ label: 'Detail', value: get(r, 'booking') });

        card = { ...base, kind: 'ticket', mode, icon: iconOf(mode, r), from, to, details, ticket };
        break;
      }
      case 'hotel':
        card = { ...base, kind: 'key', hotel: hotelOf(r), action: actionOf(r) };
        break;
      case 'makan':
        card = { ...base, kind: 'receipt' };
        break;
      case 'belanja':
        card = { ...base, kind: 'tag', taxFree: /tax free/i.test(`${base.note} ${base.title}`) };
        break;
      case 'acara':
        card = { ...base, kind: 'invite', dest: photoFor(dayKey, startMin, acara) };
        break;
      default:
        card = { ...base, kind: 'postcard', dest: photoFor(dayKey, startMin, acara) };
    }

    byDay.set(dayKey, [...(byDay.get(dayKey) ?? []), card]);
  });

  return [...byDay.keys()].sort().map((key) => {
    const cards = (byDay.get(key) ?? []).sort((a, b) => a.startMin - b.startMin);
    const cities = cards.map((c) => c.city.toLowerCase());
    const sightseeing = cards.find((c) => c.kategori === 'wisata' || c.kategori === 'acara');
    return {
      key,
      cards,
      route: routeOf(cities),
      city: cap(sightseeing?.city || cities[cities.length - 1] || ''),
      special: cards.some((c) => c.kategori === 'acara'),
    };
  });
}
