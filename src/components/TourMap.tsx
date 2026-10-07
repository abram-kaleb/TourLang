import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Papa from 'papaparse';

import type { RoutePoint } from '../types/tour';
import itineraryCsv from '../assets/perjalanan.csv?raw';
import penginapanCsv from '../assets/penginapan.csv?raw';

import Perjalanan from './Perjalanan';
import Penginapan, { type PenginapanItem } from './Penginapan';

const TILE_LAYER_URL = import.meta.env.VITE_MAP_TILE_URL;

const capitalize = (str: string) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

// Marker Label Nama Kota
const createCityLabelMarker = (cityName: string, isSelected: boolean, opacity = 1) =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
        pointer-events: none;
        transform: translate(-6px, -6px);
        opacity: ${opacity};
        transition: opacity 0.3s ease;
      ">
        <div style="
          width: ${isSelected ? '12px' : '8px'};
          height: ${isSelected ? '12px' : '8px'};
          background: ${isSelected ? '#ffffff' : '#a1a1aa'};
          border: 2px solid #000000;
          border-radius: 50%;
          box-shadow: 0 0 4px rgba(0,0,0,0.8);
          flex-shrink: 0;
          transition: all 0.2s ease;
        "></div>

        <span style="
          font-family: system-ui, -apple-system, sans-serif;
          font-size: ${isSelected ? '12px' : '11px'};
          font-weight: ${isSelected ? '800' : '600'};
          color: ${isSelected ? '#ffffff' : '#d4d4d8'};
          background: rgba(0, 0, 0, 0.75);
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid ${isSelected ? '#ffffff' : 'rgba(255,255,255,0.15)'};
          letter-spacing: 0.3px;
        ">
          ${capitalize(cityName)}
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
    const bottomPadding = isMobile && isCalendarOpen ? 320 : 60;

    if (focusedRoute && focusedRoute.coords) {
      // Jika yang difokuskan adalah titik spesifik (seperti hotel)
      if (activeSegmentCoords.length > 0) {
        map.fitBounds(L.latLngBounds(activeSegmentCoords), {
          paddingTopLeft: [50, 50],
          paddingBottomRight: [50, bottomPadding],
          maxZoom: 9,
          animate: true,
        });
      } else {
        map.flyTo(focusedRoute.coords, 14, { animate: true });
      }
    } else if (!focusedRoute && coords.length > 0) {
      map.fitBounds(L.latLngBounds(coords), {
        paddingTopLeft: [50, 50],
        paddingBottomRight: [50, bottomPadding],
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
  activeTab?: 'travel' | 'hotel' | 'other'; // Prop untuk memfilter visualisasi
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

  // Load perjalanan.csv
  useEffect(() => {
    Papa.parse(itineraryCsv, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const parsed = res.data
          .filter((r: any) => r.dari && r.lat && r.lng)
          .map((r: any, idx: number) => ({
            id: Number(r.id) || idx + 1,
            dari: r.dari,
            ke: r.ke,
            tanggal: r.tanggal,
            coords: [parseFloat(r.lat), parseFloat(r.lng)] as [number, number],
          }));
        setRoutes(parsed);
      },
    });
  }, []);

  // Load assets/penginapan.csv
  useEffect(() => {
    Papa.parse(penginapanCsv, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (res) => {
        setHotels(res.data as PenginapanItem[]);
      },
    });
  }, []);

  const activeRoutes = allRoutes && allRoutes.length > 0 ? allRoutes : routes;
  const coords = activeRoutes.map((r) => r.coords);

  const isHotelSelected = Boolean((selectedCity as any)?.isHotelActive);

  let activeSegmentCoords: [number, number][] = [];
  if (focusedRoute && !isHotelSelected) {
    const idx = activeRoutes.findIndex((r) => r.id === focusedRoute.id);
    if (idx !== -1 && idx < activeRoutes.length - 1) {
      activeSegmentCoords = [activeRoutes[idx].coords, activeRoutes[idx + 1].coords];
    }
  }

  const activeFocus = focusedRoute || selectedCity;

  return (
    <div className="w-full h-full bg-neutral-900">
      <MapContainer
        center={[50.8503, 8.3517]}
        zoom={5}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <MapController
          coords={coords}
          focusedRoute={focusedRoute || null}
          activeSegmentCoords={activeSegmentCoords}
          isCalendarOpen={isCalendarOpen}
        />

        <TileLayer url={TILE_LAYER_URL} />

        {/* ====================================================
            LOGIKA TAB PERJALANAN (travel / other)
           ==================================================== */}
        {(activeTab === 'travel' || activeTab === 'other') && (
          <>
            <Perjalanan
              routes={activeRoutes}
              selectedCity={selectedCity}
              focusedRoute={focusedRoute}
              isHotelSelected={isHotelSelected}
              onSelectCity={onSelectCity}
              onFocusRoute={onFocusRoute}
            />

            {/* MARKER KOTA (Garis, Arrow, Label Kota) */}
            {activeRoutes.map((item, idx) => {
              const isSelected = selectedCity?.id === item.id;

              let isCityActive = false;
              if (activeFocus && !isHotelSelected) {
                const activeIdx = activeRoutes.findIndex((r) => r.id === activeFocus.id);
                const isCurrentCity = item.id === activeFocus.id;
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

        {/* ====================================================
            LOGIKA TAB PENGINAPAN (hotel)
           ==================================================== */}
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
      </MapContainer>
    </div>
  );
};

export default TourMap;