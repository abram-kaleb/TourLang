export interface RoutePoint {
  id: number | string;
  dari: string;
  ke: string;
  tanggal: string;
  berangkat?: string;
  sampai?: string;
  transportasi?: string;
  catatanLain?: string;
  keterangan?: string; // Tambahan opsional untuk acara
  coords: [number, number];

  // Tambahkan 2 baris ini agar link Maps & Tiket terbaca:
  gmaps?: string;
  tiket?: string;

  // Opsional: jika CSV menyediakan lat & lng terpisah sebelum digabung ke coords
  lat?: number | string;
  lng?: number | string;
}