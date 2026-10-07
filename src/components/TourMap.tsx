import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Papa from 'papaparse';

import type { RoutePoint } from '../types/tour';
import Perjalanan from './Perjalanan';
import Penginapan, { type PenginapanItem } from './Penginapan';

const TILE_LAYER_URL = import.meta.env.VITE_MAP_TILE_URL;

const GSHEET_PERJALANAN_URL = import.meta.env.VITE_GSHEET_PERJALANAN_CSV;
const GSHEET_PENGINAPAN_URL = import.meta.env.VITE_GSHEET_PENGINAPAN_CSV;
const GSHEET_ACARA_URL = import.meta.env.VITE_GSHEET_ACARA_CSV;

const capitalize = (str: string) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

// 1. Marker Label Kota (Perjalanan) - Flat & Clean
const createCityLabelMarker = (cityName: string, isSelected: boolean, opacity = 1) =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
        pointer-events: none;
        transform: translate(-4px, -50%);
        opacity: ${opacity};
        transition: opacity 0.2s ease;
      ">
        <div style="
          width: ${isSelected ? '8px' : '6px'};
          height: ${isSelected ? '8px' : '6px'};
          background: ${isSelected ? '#ffffff' : '#a1a1aa'};
          border-radius: 50%;
          flex-shrink: 0;
          transition: all 0.2s ease;
        "></div>

        <span style="
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: ${isSelected ? '12px' : '11px'};
          font-weight: ${isSelected ? '700' : '500'};
          color: ${isSelected ? '#ffffff' : '#a1a1aa'};
          background: #09090b;
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 0.2px;
        ">
          ${capitalize(cityName)}
        </span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

// 2. Marker Label Acara / Event - Flat & Clean
const createAcaraLabelMarker = (title: string, isSelected: boolean) =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
        transform: translate(-4px, -50%);
        cursor: pointer;
      ">
        <div style="
          width: ${isSelected ? '8px' : '6px'};
          height: ${isSelected ? '8px' : '6px'};
          background: ${isSelected ? '#ffffff' : '#38bdf8'};
          border-radius: 50%;
          flex-shrink: 0;
          transition: all 0.2s ease;
        "></div>

        <span style="
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: ${isSelected ? '12px' : '11px'};
          font-weight: ${isSelected ? '700' : '500'};
          color: ${isSelected ? '#ffffff' : '#e0f2fe'};
          background: #09090b;
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 0.2px;
        ">
          ${capitalize(title)}
        </span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

// Controller Viewport Peta
const MapController: React.FC<{
  coords: [number, number][];
  focusedRoute: RoutePoint | null;
  activeSegmentCoords: [number, number][];
  isCalendarOpen?: boolean;
}> = ({ coords, focusedRoute, activeSegmentCoords, isCalendarOpen }) => {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 320);

    const isMobile = window.innerWidth < 768;
    const bottomPadding = isMobile && isCalendarOpen ? 360 : 60;

    if (focusedRoute && focusedRoute.coords) {
      if (activeSegmentCoords.length > 0) {
        map.fitBounds(L.latLngBounds(activeSegmentCoords), {
          paddingTopLeft: [40, 40],
          paddingBottomRight: [40, bottomPadding],
          maxZoom: isMobile ? 8 : 9,
          animate: true,
        });
      } else {
        const targetZoom = isMobile ? 9 : 14;

        if (isMobile && isCalendarOpen) {
          const targetPoint = map.project(focusedRoute.coords, targetZoom);
          const offsetPoint = L.point(targetPoint.x, targetPoint.y + 140);
          const newCenter = map.unproject(offsetPoint, targetZoom);

          map.flyTo(newCenter, targetZoom, { animate: true });
        } else {
          map.flyTo(focusedRoute.coords, targetZoom, { animate: true });
        }
      }
    } else if (!focusedRoute && coords.length > 0) {
      map.fitBounds(L.latLngBounds(coords), {
        paddingTopLeft: [40, 40],
        paddingBottomRight: [40, bottomPadding],
        animate: true,
      });
    }

    return () => clearTimeout(timer);
  }, [map, focusedRoute, coords, activeSegmentCoords, isCalendarOpen]);

  return null;
};

interface MapProps {
  selectedCity?: RoutePoint | null;
  focusedRoute?: RoutePoint | null;
  onSelectCity?: (city: RoutePoint) => void;
  onFocusRoute?: (city: RoutePoint) => void;
  allRoutes?: RoutePoint[];
  activeTab?: 'travel' | 'hotel' | 'other';
  isCalendarOpen?: boolean;
}

export const TourMap: React.FC<MapProps> = ({
  selectedCity,
  focusedRoute,
  onSelectCity,
  onFocusRoute,
  allRoutes,
  activeTab = 'travel',
  isCalendarOpen = true,
}) => {
  const [routes, setRoutes] = useState<RoutePoint[]>([]);
  const [hotels, setHotels] = useState<PenginapanItem[]>([]);
  const [acaras, setAcaras] = useState<RoutePoint[]>([]);

  // Helper untuk parse koordinat dari tuple "lat, lng" atau kolom lat & lng terpisah
  const parseCoords = (r: any): [number, number] | null => {
    if (r.coords) {
      const parts = String(r.coords).split(',').map((v) => Number(v.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return [parts[0], parts[1]];
      }
    }
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      return [lat, lng];
    }
    return null;
  };

  // 1. Fetch data Perjalanan dari Google Sheets
  useEffect(() => {
    if (!GSHEET_PERJALANAN_URL) return;

    fetch(GSHEET_PERJALANAN_URL)
      .then((res) => res.text())
      .then((csvText) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => {
            const parsed = res.data
              .map((r: any, idx: number): RoutePoint | null => {
                const coords = parseCoords(r);
                if (!coords) return null;
                return {
                  id: r.id ? String(r.id) : `route-${idx + 1}`,
                  dari: r.dari || '',
                  ke: r.ke || '',
                  tanggal: r.tanggal || '',
                  coords,
                };
              })
              .filter((item): item is RoutePoint => item !== null);

            setRoutes(parsed);
          },
        });
      })
      .catch((err) => console.error('Error fetching perjalanan CSV:', err));
  }, []);

  // 2. Fetch data Penginapan dari Google Sheets
  useEffect(() => {
    if (!GSHEET_PENGINAPAN_URL) return;

    fetch(GSHEET_PENGINAPAN_URL)
      .then((res) => res.text())
      .then((csvText) => {
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (res) => {
            setHotels(res.data as PenginapanItem[]);
          },
        });
      })
      .catch((err) => console.error('Error fetching penginapan CSV:', err));
  }, []);

  // 3. Fetch data Acara dari Google Sheets
  useEffect(() => {
    if (!GSHEET_ACARA_URL) return;

    fetch(GSHEET_ACARA_URL)
      .then((res) => res.text())
      .then((csvText) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => {
            const parsed = res.data
              .map((r: any, idx: number): RoutePoint | null => {
                const coords = parseCoords(r);
                if (!coords) return null;

                return {
                  id: r.id ? String(r.id) : `acara-${idx + 1000}`,
                  dari: r.destinasi || r.dari || '',
                  ke: r.aktivitas || r.ke || '',
                  tanggal: r.tanggal || '',
                  berangkat: r.mulai || r.berangkat || undefined,
                  sampai: r.selesai || r.sampai || undefined,
                  transportasi: r.keterangan || r.transportasi || undefined,
                  coords,
                  gmaps: r.gmaps || undefined,
                };
              })
              .filter((item): item is RoutePoint => item !== null);

            setAcaras(parsed);
          },
        });
      })
      .catch((err) => console.error('Error fetching acara CSV:', err));
  }, []);

  const activeRoutes = allRoutes && allRoutes.length > 0 ? allRoutes : routes;

  let coords: [number, number][] = [];
  if (activeTab === 'other') {
    coords = acaras.map((a) => a.coords);
  } else {
    coords = activeRoutes.map((r) => r.coords);
  }

  const isHotelSelected = Boolean((selectedCity as any)?.isHotelActive);

  let activeSegmentCoords: [number, number][] = [];
  if (focusedRoute && !isHotelSelected && activeTab === 'travel') {
    const idx = activeRoutes.findIndex((r) => String(r.id) === String(focusedRoute.id));
    if (idx !== -1 && idx < activeRoutes.length - 1) {
      activeSegmentCoords = [activeRoutes[idx].coords, activeRoutes[idx + 1].coords];
    }
  }

  const activeFocus = focusedRoute || selectedCity;

  return (
    <div className="w-full h-full bg-zinc-950">
      <MapContainer
        center={[50.8503, 8.3517]}
        zoom={5}
        style={{ width: '100%', height: '100%' }}
        className="bg-zinc-950"
        zoomControl={false}
        attributionControl={false}
      >
        <MapController
          coords={coords}
          focusedRoute={focusedRoute || null}
          activeSegmentCoords={activeSegmentCoords}
          isCalendarOpen={isCalendarOpen}
        />

        <TileLayer url={TILE_LAYER_URL} keepBuffer={4} />

        {/* TAB PERJALANAN */}
        {activeTab === 'travel' && (
          <>
            <Perjalanan
              routes={activeRoutes}
              selectedCity={selectedCity}
              focusedRoute={focusedRoute}
              isHotelSelected={isHotelSelected}
              onSelectCity={onSelectCity}
              onFocusRoute={onFocusRoute}
            />

            {activeRoutes.map((item, idx) => {
              const isSelected = String(selectedCity?.id) === String(item.id);

              let isCityActive = false;
              if (activeFocus && !isHotelSelected) {
                const activeIdx = activeRoutes.findIndex((r) => String(r.id) === String(activeFocus.id));
                const isCurrentCity = String(item.id) === String(activeFocus.id);
                const isNextCity = idx === activeIdx + 1;
                isCityActive = isCurrentCity || isNextCity;
              }

              let opacity = 1;
              if (activeFocus && !isHotelSelected) {
                opacity = isCityActive ? 1 : 0.2;
              }

              return (
                <Marker
                  key={item.id}
                  position={item.coords}
                  icon={createCityLabelMarker(item.dari, isSelected, opacity)}
                  interactive={false}
                />
              );
            })}
          </>
        )}

        {/* TAB PENGINAPAN */}
        {activeTab === 'hotel' && (
          <Penginapan
            hotels={hotels}
            selectedHotelId={selectedCity?.id}
            onSelectHotel={(hotel) => {
              const hotelPoint: any = {
                id: hotel.id,
                dari: hotel.nama,
                ke: hotel.kota,
                tanggal: hotel.tanggal,
                coords: [hotel.lat, hotel.lng],
                isHotelActive: true,
              };
              onSelectCity?.(hotelPoint);
              onFocusRoute?.(hotelPoint);
            }}
          />
        )}

        {/* TAB ACARA */}
        {activeTab === 'other' && (
          <>
            {acaras.map((acara) => {
              const isSelected = String(selectedCity?.id) === String(acara.id);

              return (
                <Marker
                  key={`acara-marker-${acara.id}`}
                  position={acara.coords}
                  icon={createAcaraLabelMarker(acara.dari, isSelected)}
                  eventHandlers={{
                    click: () => {
                      onSelectCity?.(acara);
                      onFocusRoute?.(acara);
                    },
                  }}
                />
              );
            })}
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default TourMap;