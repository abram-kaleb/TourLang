import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import acaraCsv from '../assets/acara.csv?raw';

export interface AcaraItem {
  id: number;
  tanggal: string;
  destinasi: string;
  kota: string;
  mulai?: string;
  selesai?: string;
  aktivitas: string;
  keterangan?: string;
  lat: number;
  lng: number;
}

interface AcaraProps {
  selectedDate?: string | null;
  onSelectAcara?: (item: AcaraItem) => void;
  activeAcaraId?: number | null;
}

export const Acara: React.FC<AcaraProps> = ({
  selectedDate,
  onSelectAcara,
  activeAcaraId,
}) => {
  const [acaraList, setAcaraList] = useState<AcaraItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Papa.parse(acaraCsv, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: AcaraItem[] = results.data
          .filter((row: any) => row.destinasi && row.lat && row.lng)
          .map((row: any, idx: number) => ({
            id: row.id && !isNaN(Number(row.id)) ? Number(row.id) : idx + 1,
            tanggal: row.tanggal,
            destinasi: row.destinasi,
            kota: row.kota,
            mulai: row.mulai || undefined,
            selesai: row.selesai || undefined,
            aktivitas: row.aktivitas,
            keterangan: row.keterangan || undefined,
            lat: parseFloat(row.lat),
            lng: parseFloat(row.lng),
          }));

        setAcaraList(parsed);
        setLoading(false);
      },
    });
  }, []);

  const filteredAcara = selectedDate
    ? acaraList.filter((item) => item.tanggal === selectedDate)
    : acaraList;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-4 text-xs text-zinc-500">
        Memuat data acara...
      </div>
    );
  }

  if (filteredAcara.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <p className="text-xs text-zinc-500">
          {selectedDate
            ? `Tidak ada agenda acara pada tanggal ${selectedDate}`
            : 'Data acara tidak ditemukan.'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto space-y-2 p-1 no-scrollbar">
      {filteredAcara.map((item, index) => {
        const isSelected = activeAcaraId === item.id;

        return (
          <div
            key={item.id}
            onClick={() => onSelectAcara && onSelectAcara(item)}
            className={`p-3 rounded-xl transition-all duration-150 cursor-pointer border ${
              isSelected
                ? 'bg-zinc-800 text-white border-zinc-600 shadow-md scale-[0.99]'
                : 'bg-zinc-950/60 text-zinc-300 border-zinc-900 hover:bg-zinc-800/50 hover:border-zinc-800'
            }`}
          >
            {/* Header: Destinasi & Waktu */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 flex-shrink-0">
                  #{index + 1}
                </span>
                <h4 className="text-xs font-bold capitalize text-zinc-100 truncate">
                  {item.destinasi}
                </h4>
              </div>

              {(item.mulai || item.selesai) && (
                <span className="text-[9px] font-mono font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded flex-shrink-0">
                  {item.mulai || '--:--'} - {item.selesai || '--:--'}
                </span>
              )}
            </div>

            {/* Kota Badges */}
            <div className="mb-2">
              <span className="text-[9px] font-semibold text-zinc-400 capitalize bg-zinc-900/80 px-1.5 py-0.5 rounded border border-zinc-800/80">
                📍 {item.kota}
              </span>
            </div>

            {/* Detail Aktivitas */}
            <p className="text-[11px] font-medium text-zinc-200 leading-relaxed mb-1.5">
              {item.aktivitas}
            </p>

            {/* Catatan / Keterangan Tambahan */}
            {item.keterangan && (
              <p className="text-[10px] text-zinc-400 italic bg-zinc-900/40 p-2 rounded-lg border border-zinc-900/60 leading-snug">
                "{item.keterangan}"
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Acara;