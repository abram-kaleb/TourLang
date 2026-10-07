export interface RoutePoint {
  id: number;
  dari: string;
  ke: string;
  tanggal: string;
  berangkat?: string;
  sampai?: string;
  transportasi?: string;
  catatanLain?: string;
  keterangan?: string; // Tambahan opsional untuk acara
  coords: [number, number];
}