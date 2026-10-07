import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import type { RoutePoint } from '../components/Perjalanan';

// Re-export tipe RoutePoint agar file lain bisa mengimpornya dari hook ini jika dibutuhkan
export type { RoutePoint };

const CSV_URL = import.meta.env.VITE_GOOGLE_SHEETS_CSV_URL as string | undefined;

export const useRouteData = () => {
  const [routes, setRoutes] = useState<RoutePoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!CSV_URL) {
      setError('URL Google Sheets CSV tidak ditemukan di .env');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(CSV_URL);
        const csvText = await response.text();

        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedRoutes = results.data
              .map((row: any, idx: number): RoutePoint | null => {
                const latNum = Number(row.lat);
                const lngNum = Number(row.lng);

                let parsedCoords: [number, number] | null = null;

                if (row.coords && typeof row.coords === 'string') {
                  const parts = row.coords.split(',').map((v: string) => Number(v.trim()));
                  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    parsedCoords = [parts[0], parts[1]];
                  }
                } else if (!isNaN(latNum) && !isNaN(lngNum) && row.lat !== '' && row.lng !== '') {
                  parsedCoords = [latNum, lngNum];
                }

                // Lewati baris jika koordinat tidak valid
                if (!parsedCoords) return null;

                return {
                  id: row.id ? String(row.id) : `route-${idx}`, // Pastikan ID selalu dikonversi ke String
                  dari: row.dari || '',
                  ke: row.ke || '',
                  tanggal: row.tanggal || '',
                  berangkat: row.berangkat || undefined,
                  sampai: row.sampai || undefined,
                  transportasi: row.transportasi || undefined,
                  catatanLain: row.catatanLain || undefined,
                  keterangan: row.keterangan || undefined,
                  coords: parsedCoords,
                  gmaps: row.gmaps || undefined,
                  tiket: row.tiket || undefined,
                  lat: row.lat || undefined,
                  lng: row.lng || undefined,
                };
              })
              .filter((item): item is RoutePoint => item !== null);

            setRoutes(parsedRoutes);
            setLoading(false);
          },
          error: (err: any) => {
            setError(err.message);
            setLoading(false);
          },
        });
      } catch (err: any) {
        setError(err.message || 'Gagal mengambil data dari Google Sheets');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { routes, loading, error };
};