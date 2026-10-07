import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';

import itineraryCsv from '../assets/perjalanan.csv?raw';
import penginapanCsv from '../assets/penginapan.csv?raw';
import acaraCsv from '../assets/acara.csv?raw';

export interface NextEvent {
  id: string;
  type: 'perjalanan' | 'penginapan' | 'acara';
  title: string;
  dateStr: string;
  timeStr: string;
  eventDate: Date;
  gmaps?: string;
  linkTiket?: string;
}

const parseDateTime = (dateStr: string, timeStr?: string): Date | null => {
  if (!dateStr) return null;

  const cleanDate = String(dateStr).trim();
  let day = 1, month = 0, year = 2026;

  if (cleanDate.includes('/')) {
    const parts = cleanDate.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
      month = parseInt(parts[0], 10) - 1;
      day = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    }
  } else if (cleanDate.includes('-')) {
    const parts = cleanDate.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    }
  }

  let hours = 0, minutes = 0;
  if (timeStr && String(timeStr).includes(':')) {
    const [h, m] = String(timeStr).split(':');
    hours = parseInt(h, 10) || 0;
    minutes = parseInt(m, 10) || 0;
  }

  const parsed = new Date(year, month, day, hours, minutes);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const Reminder: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<NextEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [ackedIds, setAckedIds] = useState<string[]>([]);
  
  // State default ketutup
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const allEvents: NextEvent[] = [];

    // Parse CSV
    Papa.parse(itineraryCsv, {
      header: true,
      skipEmptyLines: true,
      complete: (resTravel) => {
        resTravel.data.forEach((row: any, idx: number) => {
          if (!row.dari || !row.tanggal) return;
          const dt = parseDateTime(row.tanggal, row.berangkat || '00:00');
          if (dt) {
            allEvents.push({
              id: `travel-${idx}-${row.tanggal}`,
              type: 'perjalanan',
              title: `${row.dari}${row.ke ? ` ke ${row.ke}` : ''}`,
              dateStr: row.tanggal,
              timeStr: row.berangkat || '00:00',
              eventDate: dt,
              gmaps: row.gmaps || row.link || row.map,
              linkTiket: row['link tiket'] || row.tiket || row.link_tiket,
            });
          }
        });

        Papa.parse(penginapanCsv, {
          header: true,
          skipEmptyLines: true,
          complete: (resHotel) => {
            resHotel.data.forEach((row: any, idx: number) => {
              if (!row.nama || !row.tanggal) return;
              const dt = parseDateTime(row.tanggal, row['cek in'] || '14:00');
              if (dt) {
                allEvents.push({
                  id: `hotel-${idx}-${row.tanggal}`,
                  type: 'penginapan',
                  title: row.nama,
                  dateStr: row.tanggal,
                  timeStr: row['cek in'] || '14:00',
                  eventDate: dt,
                  gmaps: row.gmaps,
                  linkTiket: row['link tiket'],
                });
              }
            });

            Papa.parse(acaraCsv, {
              header: true,
              skipEmptyLines: true,
              complete: (resAcara) => {
                resAcara.data.forEach((row: any, idx: number) => {
                  if (!row.destinasi || !row.tanggal) return;
                  const dt = parseDateTime(row.tanggal, row.mulai || '00:00');
                  if (dt) {
                    allEvents.push({
                      id: `acara-${idx}-${row.tanggal}`,
                      type: 'acara',
                      title: row.destinasi,
                      dateStr: row.tanggal,
                      timeStr: row.mulai || '00:00',
                      eventDate: dt,
                      gmaps: row.gmaps,
                    });
                  }
                });

                const sorted = allEvents.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
                
                // Murni hanya filter event 24 jam ke depan (sekarang s/d +24 jam)
                const upcoming24h = sorted.filter(
                  (e) => e.eventDate.getTime() >= now.getTime() && e.eventDate.getTime() <= twentyFourHoursLater.getTime()
                );

                setEvents(upcoming24h);
                setLoading(false);
              },
            });
          },
        });
      },
    });
  }, []);

  const handleAck = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setAckedIds((prev) => [...prev, id]);
  };

  const handleCardClick = (id: string) => {
    navigate(`/dashboard?focusId=${encodeURIComponent(id)}`);
  };

  if (loading) return null;

  const visibleEvents = events.filter((e) => !ackedIds.includes(e.id)).slice(0, 3);
  
  // Jika tidak ada event dalam 24 jam ke depan, komponen tidak menampilkan apapun (termasuk tombolnya)
  if (visibleEvents.length === 0) return null;

  return (
    <div className="relative flex items-start gap-2 font-mono text-xs select-none">
      {/* Tombol Panah Buka / Tutup */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="bg-zinc-900/95 hover:bg-zinc-800 text-zinc-200 p-2 rounded-md shadow-md backdrop-blur-sm transition-all duration-200 shrink-0 flex items-center justify-center cursor-pointer border border-zinc-800"
        title={isOpen ? 'Sembunyikan Notifikasi' : 'Tampilkan Notifikasi'}
      >
        <span
          className={`transform transition-transform duration-200 text-[10px] inline-block ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
        >
          ▶
        </span>
        {!isOpen && (
          <span className="ml-1 text-[11px] font-medium text-zinc-400">
            {visibleEvents.length}
          </span>
        )}
      </button>

      {/* Kontainer Notifikasi */}
      {isOpen && (
        <div className="flex flex-col gap-2 w-72 animate-in fade-in slide-in-from-left-2 duration-200">
          {visibleEvents.map((item) => (
            <div
              key={item.id}
              onClick={() => handleCardClick(item.id)}
              className="bg-zinc-900/95 hover:bg-zinc-800 text-zinc-200 px-3 py-2 rounded-md shadow-md backdrop-blur-sm w-full overflow-hidden cursor-pointer transition-colors border border-zinc-800/50"
            >
              {/* Baris Atas */}
              <div className="text-zinc-400 text-[11px] mb-0.5 truncate">
                {item.dateStr} - {item.timeStr} - {item.type}
              </div>

              {/* Baris Bawah */}
              <div className="flex items-center justify-between gap-2 font-sans font-medium text-white text-xs">
                <div className="flex-1 overflow-hidden relative group">
                  <div className="whitespace-nowrap inline-block animate-[marquee_8s_linear_infinite] group-hover:[animation-play-state:paused]">
                    <span>{item.title}</span>
                  </div>
                </div>

                {/* Tombol Close (x) */}
                <button
                  onClick={(e) => handleAck(e, item.id)}
                  className="text-xs text-zinc-500 hover:text-white font-mono transition-colors shrink-0 px-1"
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reminder;