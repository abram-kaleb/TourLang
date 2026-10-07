import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import acaraCsv from '../assets/acara.csv?raw';

export interface AcaraItem {
  id: number;
  tanggal: string;
  destinasi: string;
  kota: string;
  mulai: string;
  selesai: string;
  aktivitas: string;
  keterangan: string;
  gmaps: string;
  lat: number;
  lng: number;
}

interface AcaraProps {
  selectedDate?: string | null;
  onSelectAcara?: (item: AcaraItem) => void;
}

export const Acara: React.FC<AcaraProps> = ({ selectedDate, onSelectAcara }) => {
  const [acaraList, setAcaraList] = useState<AcaraItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');

  useEffect(() => {
    if (selectedDate) {
      setFilterDate(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    Papa.parse(acaraCsv, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const parsedData: AcaraItem[] = results.data.map((row: any) => ({
          id: Number(row.id),
          tanggal: String(row.tanggal || ''),
          destinasi: String(row.destinasi || ''),
          kota: String(row.kota || ''),
          mulai: String(row.mulai || ''),
          selesai: String(row.selesai || ''),
          aktivitas: String(row.aktivitas || ''),
          keterangan: String(row.keterangan || ''),
          gmaps: String(row.gmaps || ''),
          lat: Number(row.lat),
          lng: Number(row.lng),
        }));

        setAcaraList(parsedData);
      },
    });
  }, []);

  const filteredAcara = acaraList.filter((item) => {
    const matchSearch =
      item.destinasi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kota.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.aktivitas.toLowerCase().includes(searchTerm.toLowerCase());

    const matchDate = filterDate ? item.tanggal === filterDate : true;

    return matchSearch && matchDate;
  });

  return (
    <div className="w-full max-w-4xl mx-auto p-4 text-zinc-100 font-sans">
      {/* HEADER & FILTER */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Jadwal Acara & Agenda</h2>
          <p className="text-xs text-zinc-400">
            Daftar kegiatan dan destinasi kunjungan harian
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* SEARCH INPUT */}
          <input
            type="text"
            placeholder="Cari destinasi / kota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 px-3 py-2 rounded-lg focus:outline-none focus:border-zinc-500 w-full sm:w-48 placeholder-zinc-500"
          />

          {/* CLEAR DATE FILTER IF ACTIVE */}
          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] px-2.5 py-2 rounded-lg transition-all"
            >
              Reset Tanggal
            </button>
          )}
        </div>
      </div>

      {/* LIST ACARA */}
      {filteredAcara.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredAcara.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectAcara && onSelectAcara(item)}
              className="bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 p-4 rounded-xl transition-all duration-150 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                {/* METADATA ATAS */}
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-2">
                  <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-semibold">
                    {item.tanggal}
                  </span>
                  <span className="bg-zinc-950/60 px-2 py-0.5 rounded text-zinc-400 capitalize">
                    {item.kota}
                  </span>
                </div>

                {/* DESTINASI & JAM */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="text-sm font-bold text-white group-hover:text-zinc-200 transition-colors">
                    {item.destinasi}
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-300 bg-zinc-800/90 px-1.5 py-0.5 rounded flex-shrink-0">
                    {item.mulai} - {item.selesai}
                  </span>
                </div>

                {/* AKTIVITAS */}
                <p className="text-xs font-medium text-zinc-300 mb-2 leading-relaxed">
                  {item.aktivitas}
                </p>

                {/* KETERANGAN / CATATAN */}
                {item.keterangan && (
                  <p className="text-[11px] text-zinc-400 leading-normal bg-zinc-950/40 p-2 rounded-lg border border-zinc-800/40 mb-3">
                    {item.keterangan}
                  </p>
                )}
              </div>

              {/* ACTION LINK */}
              {item.gmaps && (
                <div className="pt-2 border-t border-zinc-800/50 flex justify-end">
                  <a
                    href={item.gmaps}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-950 bg-zinc-100 hover:bg-white px-2.5 py-1 rounded-md transition-all active:scale-95"
                  >
                    Google Maps ↗
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-8 text-center text-zinc-500 text-xs">
          Tidak ada acara yang ditemukan.
        </div>
      )}
    </div>
  );
};

export default Acara;