import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

export interface PenginapanItem {
  id: number;
  kota: string;
  nama: string;
  tanggal: string;
  'cek in': string;
  'cek out': string;
  gmaps: string;
  lat: number;
  lng: number;
  'link tiket'?: string;
}

interface PenginapanProps {
  hotels: PenginapanItem[];
  selectedHotelId?: number | null;
  onSelectHotel?: (hotel: PenginapanItem) => void;
}

const capitalize = (str: string) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

// Marker Icon Flat Monochrome (Tanpa Border Line / Animation Ping)
const createHotelIcon = (isSelected: boolean, isTrain = false) =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${isSelected ? '32px' : '26px'};
        height: ${isSelected ? '32px' : '26px'};
        background: ${isSelected ? '#ffffff' : '#18181b'};
        color: ${isSelected ? '#09090b' : '#a1a1aa'};
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: ${isSelected ? '14px' : '11px'};
      ">
        ${isTrain ? '🚆' : '🏨'}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });

export const Penginapan: React.FC<PenginapanProps> = ({
  hotels = [],
  selectedHotelId,
  onSelectHotel,
}) => {
  const validHotels = hotels.filter((item) => item && item.lat && item.lng);

  return (
    <>
      {validHotels.map((item) => {
        const isSelected = selectedHotelId === item.id;
        const isTrain = item.kota?.toLowerCase() === 'kereta';
        const position: [number, number] = [item.lat, item.lng];

        return (
          <Marker
            key={`hotel-marker-${item.id}`}
            position={position}
            icon={createHotelIcon(isSelected, isTrain)}
            eventHandlers={{
              click: () => onSelectHotel?.(item),
            }}
          >
            {/* POPUP FLAT MONOCHROME */}
            <Popup className="custom-hotel-popup">
              <div className="p-1.5 min-w-[200px] font-sans text-zinc-100 bg-zinc-950 rounded-lg">
                
                {/* Header Tag + Tanggal */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    {isTrain ? 'Night Train' : 'Hotel'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {item.tanggal}
                  </span>
                </div>

                {/* Nama Tempat */}
                <h4 className="text-xs font-bold text-zinc-100 leading-tight mb-1">
                  {item.nama}
                </h4>

                {/* Lokasi */}
                <p className="text-[10px] text-zinc-400 mb-2.5">
                  {capitalize(item.kota)}
                </p>

                {/* Info In & Out (Flat Solid Background) */}
                <div className="text-[9px] bg-zinc-900 p-2 rounded text-zinc-400 flex justify-between gap-2 mb-2 font-mono">
                  <div>
                    <span className="text-zinc-500">In:</span> {item['cek in']}
                  </div>
                  <div>
                    <span className="text-zinc-500">Out:</span> {item['cek out']}
                  </div>
                </div>

                {/* Action Buttons Monochrome */}
                <div className="flex flex-col gap-1.5">
                  {item.gmaps && (
                    <a
                      href={item.gmaps}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-1.5 px-2 text-[10px] font-semibold bg-zinc-100 hover:bg-white text-zinc-950 rounded transition-colors text-center"
                    >
                      Google Maps ↗
                    </a>
                  )}

                  {item['link tiket'] && (
                    <a
                      href={item['link tiket']}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-1.5 px-2 text-[10px] font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors text-center"
                    >
                      Lihat Tiket 📄
                    </a>
                  )}
                </div>

              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

export default Penginapan;