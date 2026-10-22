/**
 * Mengubah isi sheet menjadi hari dan kartu.
 *
 * Tab rundown adalah tulang punggung: satu baris = satu kartu. Tab lain dicocokkan otomatis:
 * - perjalanan: lewat link tiket (file Drive yang sama di rundown dan perjalanan)
 * - penginapan: lewat tanggal malam menginap dan kota
 * - acara: lewat tanggal dan jam (foto, sejarah, kartu undangan)
 * - catatan: lewat kota atau cara bayar (Deutschlandticket, kartu metro, dan sebagainya)
 * - segmen (opsional): rute per kereta untuk tiket dengan transit
 *
 * Kolom opsional di rundown yang mengalahkan tebakan otomatis: dari, ke, moda, aksi.
 */
import type {
  Card,
  Day,
  DestInfo,
  Detail,
  HotelInfo,
  Kategori,
  Leg,
  PassInfo,
  Row,
  SheetData,
  TicketInfo,
} from '../types';
import type { ModeIcon } from './mode';
import { addDays, fmtTime, labelShort, parseDateKey, parseTime } from './time';

const KATEGORI: Kategori[] = ['transport', 'hotel', 'makan', 'wisata', 'belanja', 'acara'];

/** Nama kota yang ditulis berbeda di tab yang berbeda. */
const CITY_ALIAS: Record<string, string> = {
  lucerne: 'luzern',
  münchen: 'munich',
  muenchen: 'munich',
  zürich: 'zurich',
  füssen: 'fussen',
};

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

function city(s: string): string {
  const k = s.trim().toLowerCase();
  return CITY_ALIAS[k] ?? k;
}

function driveId(url: string): string {
  return url.match(/\/d\/([\w-]{10,})/)?.[1] ?? url.match(/[?&]id=([\w-]{10,})/)?.[1] ?? '';
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

function splitName(nama: string): { name: string; room?: string } {
  const m = nama.match(/^(.*?)\s*\((.*)\)\s*$/);
  return m ? { name: m[1].trim(), room: m[2].trim() } : { name: nama.trim() };
}

function legsFrom(segs: Row[]): Leg[] {
  return [...segs]
    .sort((a, b) => Number(get(a, 'urutan')) - Number(get(b, 'urutan')))
    .map((s) => ({
      train: get(s, 'kereta', 'transportasi'),
      from: get(s, 'dari'),
      dep: fmtTime(parseTime(get(s, 'berangkat')) ?? 0),
      platform: get(s, 'peron', 'peron berangkat') || undefined,
      to: get(s, 'ke'),
      arr: fmtTime(parseTime(get(s, 'tiba', 'sampai')) ?? 0),
      arrPlatform: get(s, 'peron tiba') || undefined,
      seat: get(s, 'gerbong/kursi', 'kursi', 'gerbong') || undefined,
    }));
}

function buildTicket(r: Row, p: Row | undefined, segs: Row[], dayKey: string): TicketInfo {
  const dateKey = parseDateKey(get(p, 'tanggal')) ?? dayKey;
  const dep = parseTime(get(p, 'berangkat') || get(r, 'mulai')) ?? 0;
  const arr = parseTime(get(p, 'sampai') || get(r, 'selesai')) ?? dep;
  const label = trainNo(`${get(r, 'kegiatan')} ${get(r, 'tempat')}`) || get(p, 'transportasi') || 'Tiket';
  const from = get(r, 'dari') || cap(get(p, 'dari')) || get(r, 'tempat');
  const to = get(r, 'ke') || cap(get(p, 'ke')) || destinationFromTitle(get(r, 'kegiatan'));
  const booking = get(r, 'booking');
  const legs = segs.length
    ? legsFrom(segs)
    : [{ train: label, from, dep: fmtTime(dep), to, arr: fmtTime(arr), seat: booking || undefined }];
  return {
    label,
    from,
    to,
    dep: fmtTime(dep),
    arr: fmtTime(arr),
    nextDay: arr < dep,
    dateFrom: labelShort(dateKey),
    dateTo: labelShort(arr < dep ? addDays(dateKey, 1) : dateKey),
    booking: booking || undefined,
    note: get(r, 'keterangan') || undefined,
    pdf: get(r, 'link tiket') || get(p, 'link tiket') || undefined,
    legs,
  };
}

function passName(caraBayar: string): string {
  return caraBayar.split(/[(,]|\sdi\s/)[0].trim().slice(0, 40);
}

function passFor(r: Row, catatan: Row[]): PassInfo | undefined {
  const status = get(r, 'status').toLowerCase();
  const text = `${get(r, 'kegiatan')} ${get(r, 'keterangan')}`.toLowerCase();
  const kota = city(get(r, 'kota'));

  let c: Row | undefined;
  if (status.includes('deutschlandticket') || text.includes('deutschlandticket')) {
    c = catatan.find((x) => /deutschlandticket/i.test(get(x, 'cara bayar')));
  } else if (/metro|tram|s-bahn|u-bahn|\bbus\b|kereta/.test(text)) {
    c = catatan.find((x) => kota && city(get(x, 'kota')).includes(kota));
  }
  if (!c) return undefined;
  return { name: passName(get(c, 'cara bayar')), tips: get(c, 'tips'), via: get(r, 'keterangan') || undefined };
}

function hotelFor(r: Row, dayKey: string, startMin: number, penginapan: Row[]): HotelInfo {
  const kota = city(get(r, 'kota'));
  const nightOf = (key: string) =>
    penginapan.find((x) => parseDateKey(get(x, 'tanggal')) === key && city(get(x, 'kota')) === kota);
  // Pagi hari biasanya masih bagian dari malam sebelumnya (sarapan, cek out).
  // Kalau kotanya beda (baru tiba, titip koper), pakai malam hari itu.
  const p = startMin < 12 * 60 ? nightOf(addDays(dayKey, -1)) ?? nightOf(dayKey) : nightOf(dayKey) ?? nightOf(addDays(dayKey, -1));

  const fromSheet = splitName(get(p, 'nama'));
  const tempat = get(r, 'tempat');
  const generic = !tempat || /^hotel$/i.test(tempat);
  const name = fromSheet.name || (generic ? `Hotel di ${cap(get(r, 'kota'))}` : tempat);
  const booked = Boolean(fromSheet.name) && !/belum/i.test(get(r, 'status'));
  return { name, room: fromSheet.room, checkIn: get(p, 'cek in') || undefined, booked };
}

function hotelLinks(r: Row, dayKey: string, startMin: number, penginapan: Row[]) {
  const kota = city(get(r, 'kota'));
  const keys = startMin < 12 * 60 ? [addDays(dayKey, -1), dayKey] : [dayKey, addDays(dayKey, -1)];
  for (const k of keys) {
    const p = penginapan.find((x) => parseDateKey(get(x, 'tanggal')) === k && city(get(x, 'kota')) === kota);
    if (p) return { nav: get(p, 'gmaps'), link: get(p, 'link tiket') };
  }
  return { nav: '', link: '' };
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

function destFor(dayKey: string, startMin: number, acara: Row[]): DestInfo | undefined {
  const hit = acara.find((a) => {
    if (parseDateKey(get(a, 'tanggal')) !== dayKey) return false;
    const s = parseTime(get(a, 'mulai'));
    const e = parseTime(get(a, 'selesai'));
    return s != null && e != null && startMin >= s && startMin < e;
  });
  if (!hit) return undefined;
  return {
    name: get(hit, 'destinasi'),
    photo: get(hit, 'foto') || undefined,
    photoSource: get(hit, 'sumber foto') || undefined,
    history: get(hit, 'sejarah') || undefined,
  };
}

function routeOf(cities: string[]): string {
  const seq: string[] = [];
  for (const c of cities) if (c && seq[seq.length - 1] !== c) seq.push(c);
  if (seq.length <= 1) return cap(seq[0] ?? '');
  if (seq.length === 2) return `${cap(seq[0])} → ${cap(seq[1])}`;
  return `${cap(seq[0])} → ${cap(seq[seq.length - 1])}`;
}

export function buildTrip(data: SheetData): Day[] {
  const S = data.sheets;
  const rundown = S['rundown'] ?? [];
  const perjalanan = S['perjalanan'] ?? [];
  const penginapan = S['penginapan'] ?? [];
  const acara = S['acara'] ?? [];
  const catatan = S['catatan'] ?? [];
  const segmen = S['segmen'] ?? [];

  const perjByDrive = new Map<string, Row>();
  for (const p of perjalanan) {
    const id = driveId(get(p, 'link tiket'));
    if (id && !perjByDrive.has(id)) perjByDrive.set(id, p);
  }
  const segByPerj = new Map<string, Row[]>();
  for (const s of segmen) {
    const id = get(s, 'perjalanan id', 'perjalanan_id', 'id perjalanan');
    if (!id) continue;
    segByPerj.set(id, [...(segByPerj.get(id) ?? []), s]);
  }

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
        const link = get(r, 'link tiket');
        const p = link ? perjByDrive.get(driveId(link)) : undefined;
        const ticket = link ? buildTicket(r, p, p ? segByPerj.get(get(p, 'id')) ?? [] : [], dayKey) : undefined;
        const pass = ticket ? undefined : passFor(r, catatan);
        let mode = ticket?.label && ticket.label !== 'Tiket' ? ticket.label : modeOf(r);
        if (pass && mode === 'Kereta') mode = 'Kereta regional';
        const to = get(r, 'ke') || ticket?.to || destinationFromTitle(base.title) || base.place;
        let from = get(r, 'dari') || ticket?.from || base.place;
        if (!from || from === to) from = cap(base.city);

        const details: Detail[] = [];
        if (ticket && ticket.legs.length > 1) {
          details.push({ label: 'Transit', value: ticket.legs.slice(0, -1).map((l) => l.to).join(', ') });
        }
        const firstPlatform = ticket?.legs[0]?.platform;
        if (firstPlatform) details.push({ label: 'Peron', value: firstPlatform });
        if (get(r, 'booking')) details.push({ label: 'Detail', value: get(r, 'booking') });
        if (pass) details.push({ label: 'Tiket', value: pass.name });

        card = {
          ...base,
          kind: 'ticket',
          mode,
          icon: iconOf(mode, r),
          from,
          to,
          details,
          ticket,
          pass,
        };
        break;
      }
      case 'hotel': {
        const links = hotelLinks(r, dayKey, startMin, penginapan);
        card = {
          ...base,
          nav: base.nav || links.nav || undefined,
          link: base.link || links.link || undefined,
          kind: 'key',
          hotel: hotelFor(r, dayKey, startMin, penginapan),
          action: actionOf(r),
        };
        break;
      }
      case 'makan':
        card = { ...base, kind: 'receipt' };
        break;
      case 'belanja':
        card = { ...base, kind: 'tag', taxFree: /tax free/i.test(`${base.note} ${base.title}`) };
        break;
      case 'acara':
        card = { ...base, kind: 'invite', dest: destFor(dayKey, startMin, acara) };
        break;
      default:
        card = { ...base, kind: 'postcard', dest: destFor(dayKey, startMin, acara) };
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
