export interface RoutePoint {
  id: number;
  dari: string;
  ke: string;
  tanggal: string;
  berangkat?: string;
  sampai?: string;
  transportasi?: string;
  coords: [number, number];
}