import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Papa from 'papaparse';
import * as turf from '@turf/turf';

import type { RoutePoint } from '../types/tour';
import itineraryCsv from '../assets/itinerary.csv?raw';

const TILE_LAYER_URL =
  import.meta.env.VITE_MAP_TILE_URL;

const capitalize = (str: string) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

const createCurvedSegment = (
  start: [number, number],
  end: [number, number],
  curvature = 0.15
) => {
  const line = turf.lineString([[start[1], start[0]], [end[1], end[0]]]);
  const distance = turf.length(line, { units: 'kilometers' });

  if (distance === 0) return { path: [start], midPoint: start, angle: 0 };

  const mid = turf.midpoint(
    turf.point([start[1], start[0]]),
    turf.point([end[1], end[0]])
  );
  const bearing = turf.bearing(
    turf.point([start[1], start[0]]),
    turf.point([end[1], end[0]])
  );
  const dest = turf.destination(mid, distance * curvature, bearing + 90, {
    units: 'kilometers',
  });

  const curved = turf.bezierSpline(
    turf.lineString([
      [start[1], start[0]],
      dest.geometry.coordinates,
      [end[1], end[0]],
    ]),
    { resolution: 50, sharpness: 0.85 }
  );

  const coords = curved.geometry.coordinates.map(
    (c) => [c[1], c[0]] as [number, number]
  );
  const midIdx = Math.floor(coords.length / 2);

  const p1 = turf.point([coords[midIdx - 1][1], coords[midIdx - 1][0]]);
  const p2 = turf.point([coords[midIdx + 1][1], coords[midIdx + 1][0]]);
  const angle = turf.bearing(p1, p2);

  return { path: coords, midPoint: coords[midIdx], angle };
};

// Mengubah fungsi pembuat marker kota agar mendukung tingkat opacity (transparansi)
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

const createFlatArrow = (angle: number, isSelected: boolean, opacity = 1) =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        transform: rotate(${angle}deg);
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: ${opacity};
        transition: opacity 0.3s ease;
      ">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="${isSelected ? '#ffffff' : '#facc15'}">
          <path d="M12 2L22 22L12 17L2 22L12 2Z"/>
        </svg>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

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

    if (focusedRoute && activeSegmentCoords.length > 0) {
      map.fitBounds(L.latLngBounds(activeSegmentCoords), {
        paddingTopLeft: [50, 50],
        paddingBottomRight: [50, bottomPadding],
        maxZoom: 9,
        animate: true,
      });
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
  isCalendarOpen?: boolean;
}

export const TourMap: React.FC<MapProps> = ({
  selectedCity,
  focusedRoute,
  onSelectCity,
  onFocusRoute,
  allRoutes,
  isCalendarOpen = true,
}) => {
  const [routes, setRoutes] = useState<RoutePoint[]>([]);

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

  const activeRoutes = allRoutes && allRoutes.length > 0 ? allRoutes : routes;
  const coords = activeRoutes.map((r) => r.coords);

  const segments = [];
  let activeSegmentCoords: [number, number][] = [];

  for (let i = 0; i < activeRoutes.length - 1; i++) {
    const route = activeRoutes[i];
    const nextRoute = activeRoutes[i + 1];
    const start = route.coords;
    const end = nextRoute.coords;
    const curvature = i % 2 === 0 ? 0.12 : -0.12;

    const { path, midPoint, angle } = createCurvedSegment(start, end, curvature);

    if (focusedRoute && route.id === focusedRoute.id) {
      activeSegmentCoords = [start, end];
    }

    segments.push({
      path,
      midPoint,
      angle,
      route,
      nextRoute,
    });
  }

  // Cek apakah sedang ada rute yang difokuskan/dipilih
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

        {/* GARIS RUTE PERJALANAN */}
        {segments.map(({ path, midPoint, angle, route }, idx) => {
          const isFocused = focusedRoute?.id === route.id;
          const isSelected = selectedCity?.id === route.id;
          const isActive = isFocused || isSelected;

          // Logika Opacity: Jika ada yang fokus/dipilih, rute lain dibuat transparan (0.15)
          let opacity = 0.5;
          if (activeFocus) {
            opacity = isActive ? 1 : 0.15;
          }

          return (
            <React.Fragment key={idx}>
              {/* Invisible Hit Area Polyline */}
              <Polyline
                positions={path}
                eventHandlers={{
                  click: () => {
                    onFocusRoute?.(route);
                    onSelectCity?.(route);
                  },
                }}
                pathOptions={{
                  color: 'transparent',
                  weight: 16,
                }}
              />

              {/* Visible Polyline */}
              <Polyline
                positions={path}
                eventHandlers={{
                  click: () => {
                    onFocusRoute?.(route);
                    onSelectCity?.(route);
                  },
                }}
                pathOptions={{
                  color: isActive ? '#facc15' : '#a1a1aa',
                  weight: isActive ? 4 : 2,
                  opacity: opacity,
                  dashArray: isActive ? undefined : '4, 4',
                }}
              />

              {/* Marker Panah */}
              <Marker
                position={midPoint}
                icon={createFlatArrow(angle, isActive, opacity)}
                eventHandlers={{
                  click: () => {
                    onFocusRoute?.(route);
                    onSelectCity?.(route);
                  },
                }}
              />
            </React.Fragment>
          );
        })}

        {/* MARKER KOTA (TIDAK INTERAKTIF) */}
        {activeRoutes.map((item, idx) => {
          const isSelected = selectedCity?.id === item.id;

          // Menentukan apakah kota ini merupakan kota asal atau tujuan dari rute yang sedang aktif
          let isCityActive = false;
          if (activeFocus) {
            const activeIdx = activeRoutes.findIndex((r) => r.id === activeFocus.id);
            const isCurrentCity = item.id === activeFocus.id;
            const isNextCity = idx === activeIdx + 1;
            isCityActive = isCurrentCity || isNextCity;
          }

          // Logika Opacity Kota: Jika ada rute aktif, kota lain transparan (0.2)
          let opacity = 1;
          if (activeFocus) {
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
      </MapContainer>
    </div>
  );
};

export default TourMap;