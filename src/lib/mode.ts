/**
 * Gaya per moda perjalanan. Kelas Tailwind ditulis utuh di sini supaya ikut terbaca saat build.
 * - kereta, bus, pesawat: kartu tiket dengan warna kepala dan garis rute masing-masing
 * - jalan kaki: kartu terang tanpa tiket (lihat WalkCard)
 */
export type ModeIcon = 'train' | 'bus' | 'plane' | 'walk';

export interface ModeStyle {
  /** Nama singkat di kepala kartu dan pil "berikutnya". */
  label: string;
  /** Latar kepala kartu dan tombol utama. */
  head: string;
  /** Warna teks kecil di atas latar kepala. */
  eyebrow: string;
  /** Warna ikon dan aksen di badan kartu. */
  text: string;
  /** Warna terang untuk pil gelap di kanan atas. */
  pill: string;
  /** Latar dan warna ikon di minimap. */
  mapBg: string;
  mapFg: string;
  /** Kalimat saat pindah kendaraan di panel tiket. */
  change: string;
}

export const MODE: Record<ModeIcon, ModeStyle> = {
  train: {
    label: 'Kereta',
    head: 'bg-rail',
    eyebrow: 'text-[#BFD0FF]',
    text: 'text-rail',
    pill: '#93C5FD',
    mapBg: '#DCE8FF',
    mapFg: '#1E3A8A',
    change: 'Ganti kereta',
  },
  bus: {
    label: 'Bus',
    head: 'bg-road',
    eyebrow: 'text-[#FDE3C2]',
    text: 'text-road',
    pill: '#FDBA74',
    mapBg: '#FDEBD3',
    mapFg: '#9A4A0B',
    change: 'Ganti bus',
  },
  plane: {
    label: 'Pesawat',
    head: 'bg-air',
    eyebrow: 'text-[#BAE6FD]',
    text: 'text-air',
    pill: '#7DD3FC',
    mapBg: '#D6EEFB',
    mapFg: '#075985',
    change: 'Transit',
  },
  walk: {
    label: 'Jalan kaki',
    head: 'bg-trail',
    eyebrow: 'text-[#CDEBD3]',
    text: 'text-trail',
    pill: '#86EFAC',
    mapBg: '#DFF0E2',
    mapFg: '#166534',
    change: 'Lanjut jalan',
  },
};
