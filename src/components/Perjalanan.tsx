import React from 'react';
import { Polyline, Marker } from 'react-leaflet';
import * as turf from '@turf/turf';
import L from 'leaflet';
import type { RoutePoint } from '../types/tour';

interface PerjalananProps {
  routes: RoutePoint[];
  selectedCity?: RoutePoint | null;
  focusedRoute?: RoutePoint | null;
  isHotelSelected?: boolean; // Props baru untuk mengecek apakah penginapan sedang diklik
  onSelectCity?: (city: RoutePoint) => void;
  onFocusRoute?: (route: RoutePoint) => void;
}

// Helper: Membuat rute garis melengkung
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

// Helper: Marker Panah
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

export const Perjalanan: React.FC<PerjalananProps> = ({
  routes,
  selectedCity,
  focusedRoute,
  isHotelSelected = false,
  onSelectCity,
  onFocusRoute,
}) => {
  // Sembunyikan seluruh garis rute & panah jika penginapan sedang diklik/aktif
  if (isHotelSelected) {
    return null;
  }

  const activeFocus = focusedRoute || selectedCity;
  const segments = [];

  for (let i = 0; i < routes.length - 1; i++) {
    const route = routes[i];
    const nextRoute = routes[i + 1];
    const curvature = i % 2 === 0 ? 0.12 : -0.12;

    const { path, midPoint, angle } = createCurvedSegment(
      route.coords,
      nextRoute.coords,
      curvature
    );

    segments.push({ path, midPoint, angle, route });
  }

  return (
    <>
      {segments.map(({ path, midPoint, angle, route }, idx) => {
        const isFocused = focusedRoute?.id === route.id;
        const isSelected = selectedCity?.id === route.id;
        const isActive = isFocused || isSelected;

        let opacity = 0.5;
        if (activeFocus) {
          opacity = isActive ? 1 : 0.15;
        }

        const handleClick = () => {
          onFocusRoute?.(route);
          onSelectCity?.(route);
        };

        return (
          <React.Fragment key={idx}>
            {/* Invisible Hit Area Polyline */}
            <Polyline
              positions={path}
              eventHandlers={{ click: handleClick }}
              pathOptions={{ color: 'transparent', weight: 16 }}
            />

            {/* Visible Polyline */}
            <Polyline
              positions={path}
              eventHandlers={{ click: handleClick }}
              pathOptions={{
                color: isActive ? '#facc15' : '#a1a1aa',
                weight: isActive ? 4 : 2,
                opacity,
                dashArray: isActive ? undefined : '4, 4',
              }}
            />

            {/* Marker Panah */}
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