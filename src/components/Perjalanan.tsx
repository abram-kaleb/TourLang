import React, { useMemo } from 'react';
import { Polyline, Marker } from 'react-leaflet';
import * as turf from '@turf/turf';
import L from 'leaflet';

export interface RoutePoint {
  id: string | number; // BISA STRING ATAU NUMBER
  dari: string;
  ke: string;
  tanggal: string;
  coords: [number, number];
  startCoords?: [number, number] | string;
  endCoords?: [number, number] | string;
  berangkat?: string;
  sampai?: string;
  transportasi?: string;
  catatanLain?: string;
  keterangan?: string;
  gmaps?: string;
  tiket?: string;
  lat?: string | number;
  lng?: string | number;
}

// Tambahkan interface ini
export interface PerjalananProps {
  routes?: RoutePoint[];
  selectedCity?: RoutePoint | null;
  onSelectCity?: (city: RoutePoint) => void;
  [key: string]: any;
}

// Helper: Memastikan koordinat valid berupa array [number, number]
const parseCoords = (coords: string | [number, number] | null | undefined): [number, number] | null => {
  if (!coords) return null;
  if (Array.isArray(coords)) return coords;
  if (typeof coords === 'string') {
    const parts = coords.split(',').map((v) => Number(v.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return [parts[0], parts[1]];
    }
  }
  return null;
};

// Helper: Membuat rute garis melengkung yang aman
const createCurvedSegment = (
  start: [number, number],
  end: [number, number],
  curvature = 0.15
) => {
  try {
    const line = turf.lineString([[start[1], start[0]], [end[1], end[0]]]);
    const distance = turf.length(line, { units: 'kilometers' });

    // Jika jarak sangat dekat (kurang dari 5km), kembalikan garis lurus
    if (distance < 5) {
      const angle = turf.bearing(
        turf.point([start[1], start[0]]),
        turf.point([end[1], end[0]])
      );
      const midPoint: [number, number] = [
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2,
      ];
      return { path: [start, end], midPoint, angle };
    }

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
      { resolution: 30, sharpness: 0.85 }
    );

    const coords = curved.geometry.coordinates.map(
      (c) => [c[1], c[0]] as [number, number]
    );
    const midIdx = Math.floor(coords.length / 2);

    const p1 = turf.point([coords[midIdx - 1][1], coords[midIdx - 1][0]]);
    const p2 = turf.point([coords[midIdx + 1][1], coords[midIdx + 1][0]]);
    const angle = turf.bearing(p1, p2);

    return { path: coords, midPoint: coords[midIdx], angle };
  } catch (err) {
    // Fallback jika terjadi error kalkulasi turf
    const midPoint: [number, number] = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    return { path: [start, end], midPoint, angle: 0 };
  }
};

// Helper: Icon Panah
const createFlatArrow = (angle: number, isSelected: boolean, opacity = 1) =>
  L.divIcon({
    className: 'custom-arrow-icon',
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
        transition: opacity 0.2s ease;
      ">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="${isSelected ? '#ffffff' : '#facc15'}">
          <path d="M12 2L22 22L12 17L2 22L12 2Z"/>
        </svg>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

export const Perjalanan: React.FC<PerjalananProps> = ({
  routes,
  selectedCity,
  focusedRoute,
  isHotelSelected = false,
  onSelectCity,
  onFocusRoute,
}) => {
  if (isHotelSelected || !Array.isArray(routes) || routes.length === 0) {
    return null;
  }

  const activeFocus = focusedRoute || selectedCity;

  // Menggunakan useMemo agar segmen kurva tidak dihitung ulang setiap kali re-render jika `routes` tidak berubah
  const segments = useMemo(() => {
    const list: Array<{
      path: [number, number][];
      midPoint: [number, number];
      angle: number;
      route: RoutePoint;
    }> = [];

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];

      // OPSI A: Jika 1 Leg menggunakan startCoords & endCoords pada route yang sama
      let startCoords = parseCoords(route.startCoords);
      let endCoords = parseCoords(route.endCoords);

      // OPSI B: Fallback jika rute menggunakan urutan array routes[i] ke routes[i+1]
      if (!startCoords || !endCoords) {
        if (i < routes.length - 1) {
          const nextRoute = routes[i + 1];
          const currCoords = parseCoords(route.coords) || [Number(route.lat), Number(route.lng)];
          const nextCoords = parseCoords(nextRoute.coords) || [Number(nextRoute.lat), Number(nextRoute.lng)];

          if (!isNaN(currCoords[0]) && !isNaN(nextCoords[0])) {
            startCoords = currCoords as [number, number];
            endCoords = nextCoords as [number, number];
          }
        }
      }

      if (!startCoords || !endCoords) continue;
      if (startCoords[0] === endCoords[0] && startCoords[1] === endCoords[1]) continue;

      const curvature = i % 2 === 0 ? 0.12 : -0.12;
      const { path, midPoint, angle } = createCurvedSegment(startCoords, endCoords, curvature);

      list.push({ path, midPoint, angle, route });
    }

    return list;
  }, [routes]);

  return (
    <>
      {segments.map(({ path, midPoint, angle, route }, idx) => {
        const isFocused = focusedRoute?.id === route.id;
        const isSelected = selectedCity?.id === route.id;
        const isActive = isFocused || isSelected;

        let opacity = 0.6;
        if (activeFocus) {
          opacity = isActive ? 1 : 0.2;
        }

        const handleClick = () => {
          onFocusRoute?.(route);
          onSelectCity?.(route);
        };

        return (
          <React.Fragment key={route.id || idx}>
            {/* Hit Area Luas (Memudahkan Sentuhan pada Layar Mobile) */}
            <Polyline
              positions={path}
              eventHandlers={{ click: handleClick }}
              pathOptions={{ color: 'transparent', weight: 20 }}
            />

            {/* Garis Rute Utama */}
            <Polyline
              positions={path}
              eventHandlers={{ click: handleClick }}
              pathOptions={{
                color: isActive ? '#facc15' : '#a1a1aa',
                weight: isActive ? 4 : 2,
                opacity,
                dashArray: isActive ? undefined : '5, 5',
              }}
            />

            {/* Marker Panah Arah */}
            <Marker
              position={midPoint}
              icon={createFlatArrow(angle, isActive, opacity)}
              eventHandlers={{ click: handleClick }}
            />
          </React.Fragment>
        );
      })}
    </>
  );
};

export default Perjalanan;