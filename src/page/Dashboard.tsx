import React, { useEffect, useState, useRef } from 'react';
import Papa from 'papaparse';
import TourMap from '../components/TourMap';

import type { RoutePoint } from '../types/tour';
import itineraryCsv from '../assets/itinerary.csv?raw';

// Tipe kategori tab yang dapat diperluas
type CategoryTab = 'travel' | 'hotel' | 'other';

const capitalize = (str: string) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

export const Dashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<RoutePoint | null>(null);
  const [focusedRoute, setFocusedRoute] = useState<RoutePoint | null>(null);
  const [routeList, setRouteList] = useState<RoutePoint[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);

  // STATE BARU: Menyimpan tab aktif ('travel', 'hotel', atau 'other')
  const [activeTab, setActiveTab] = useState<CategoryTab>('travel');

  const scrollRef = useRef<HTMLDivElement>(null);
  const dateButtonRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});

  useEffect(() => {
    Papa.parse(itineraryCsv, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData: RoutePoint[] = results.data
          .filter((row: any) => row.dari && row.lat && row.lng)
          .map((row: any, idx: number) => ({
            id: row.id && !isNaN(Number(row.id)) ? Number(row.id) : idx + 1,
            dari: row.dari,
            ke: row.ke,
            tanggal: row.tanggal,
            berangkat: row.berangkat || undefined,
            sampai: row.sampai || undefined,
            transportasi: row.transportasi || undefined,
            // Ekstensi bidang untuk penginapan & opsi lainnya dari CSV (jika ada)
            hotel: row.hotel || row.penginapan || undefined,
            hotelCoords: row.hotel_lat && row.hotel_lng ? [parseFloat(row.hotel_lat), parseFloat(row.hotel_lng)] : undefined,
            catatanLain: row.catatan || row.aktivitas || undefined,
            coords: [parseFloat(row.lat), parseFloat(row.lng)],
          }));

        setRouteList(parsedData);
      },
    });
  }, []);

  const getDayNumber = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split(/[/.-]/);
    if (parts.length >= 2) {
      const day = parts.length === 3 && parts[2].length === 4 ? Number(parts[1]) : Number(parts[0]);
      return isNaN(day) ? null : day;
    }
    return null;
  };

  const scrollToSelectedDate = (dayNum: number) => {
    const container = scrollRef.current;
    const targetButton = dateButtonRefs.current[dayNum];

    if (container && targetButton) {
      const containerWidth = container.clientWidth;
      const buttonLeft = targetButton.offsetLeft;
      const buttonWidth = targetButton.clientWidth;

      const scrollPosition = buttonLeft - containerWidth / 2 + buttonWidth / 2;

      container.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth',
      });
    }
  };

  const handleSelectDate = (dateStr: string, firstRoute: RoutePoint) => {
    setSelectedDate(dateStr);
    setSelectedCity(firstRoute);
    setFocusedRoute(null);

    const dayNum = getDayNumber(dateStr);
    if (dayNum) {
      scrollToSelectedDate(dayNum);
    }
  };

  const handleClearSelection = () => {
    setSelectedDate(null);
    setSelectedCity(null);
    setFocusedRoute(null);
  };

  const routesOnSelectedDate = selectedDate
    ? routeList.filter((r) => r.tanggal === selectedDate)
    : [];

  const daysInNovember = Array.from({ length: 30 }, (_, i) => i + 1);
  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100">
      
      {/* 1. MAP CONTAINER FULL SCREEN */}
      <main className="absolute inset-0 w-full h-full z-0">
        <TourMap
          selectedCity={selectedCity}
          focusedRoute={focusedRoute}
          onSelectCity={(city) => {
            setSelectedCity(city);
            setSelectedDate(city.tanggal);
            const dayNum = getDayNumber(city.tanggal);
            if (dayNum) {
              scrollToSelectedDate(dayNum);
            }
          }}
          onFocusRoute={(route) => {
            setFocusedRoute(route);
          }}
          allRoutes={routeList}
          isCalendarOpen={isCalendarOpen}
        />
      </main>

      {/* 2. FLOATING WIDGET & TRIGGER DI POJOK KANAN BAWAH LAYAR */}
      <div className="fixed z-30 bottom-5 right-5 flex flex-col items-end gap-3 pointer-events-auto">
        
        {/* POPUP KALENDER MONOCHROME */}
        {isCalendarOpen && (
          <div className="bg-zinc-950/95 backdrop-blur-md rounded-2xl overflow-hidden flex flex-col items-center w-[90vw] max-w-sm md:w-80 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 p-3.5">
            <div className="w-full">
              
              {/* HEADER TANGGAL */}
              <div className="flex justify-between items-center mb-3 px-1">
                <h2 className="text-[11px] font-black text-white tracking-widest uppercase">November 2026</h2>
              </div>

              {/* CONTAINER GRID TANGGAL */}
              <div className="bg-zinc-900/60 p-2 rounded-xl">
                
                {/* Header Hari */}
                <div className="hidden md:grid grid-cols-7 gap-1 text-center mb-1.5">
                  {daysOfWeek.map((day, i) => (
                    <span key={i} className="text-[9px] font-extrabold text-zinc-500">
                      {day}
                    </span>
                  ))}
                </div>

                {/* Grid Tanggal */}
                <div 
                  ref={scrollRef}
                  className="flex md:grid md:grid-cols-7 gap-1.5 md:gap-1 overflow-x-auto md:overflow-x-visible no-scrollbar scroll-smooth py-1 md:py-0"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {daysInNovember.map((dayNum) => {
                    const matchedRoutes = routeList.filter((r) => getDayNumber(r.tanggal) === dayNum);
                    const hasRoute = matchedRoutes.length > 0;
                    const isSelected = selectedDate && matchedRoutes.some((r) => r.tanggal === selectedDate);

                    let bgStyle = 'bg-zinc-900/40 text-zinc-600';

                    if (hasRoute) {
                      bgStyle = 'bg-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-700 hover:text-white';
                    }

                    if (isSelected) {
                      bgStyle = 'bg-white text-zinc-950 font-black scale-105 z-10 shadow-md';
                    }

                    return (
                      <button
                        key={dayNum}
                        ref={(el) => {
                          dateButtonRefs.current[dayNum] = el;
                        }}
                        onClick={() => hasRoute && handleSelectDate(matchedRoutes[0].tanggal, matchedRoutes[0])}
                        disabled={!hasRoute}
                        className={`h-8 w-8 min-w-[32px] md:h-7 md:w-full md:min-w-0 rounded-lg md:rounded flex flex-col items-center justify-center text-[11px] md:text-[10px] transition-all flex-shrink-0 relative ${bgStyle} ${
                          hasRoute ? 'cursor-pointer' : 'opacity-30 cursor-default'
                        }`}
                      >
                        <span>{dayNum}</span>
                        
                        {/* Indikator Titik Multiple Travel */}
                        {matchedRoutes.length > 1 && (
                          <span className="absolute bottom-0.5 flex gap-0.5">
                            <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-zinc-950' : 'bg-zinc-100'}`}></span>
                            <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-zinc-950' : 'bg-zinc-100'}`}></span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DETAIL RUTE PERJALANAN / PENGINAPAN / LAINNYA */}
              {selectedDate && routesOnSelectedDate.length > 0 && (
                <div className="mt-2.5 p-2.5 bg-zinc-900/80 rounded-xl animate-fade-in max-h-56 overflow-y-auto">
                  <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-zinc-800">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-zinc-100 text-zinc-950 uppercase tracking-widest">
                      Tgl {getDayNumber(selectedDate)} • {selectedDate}
                    </span>
                    <button
                      onClick={handleClearSelection}
                      className="text-zinc-400 hover:text-white text-[10px] font-bold px-1.5 py-0.5 rounded hover:bg-zinc-800 transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  {/* NAVIGASI TAB KATEGORI (Perjalanan, Penginapan, Lainnya) */}
                  <div className="flex items-center gap-1 mb-2 bg-zinc-950/60 p-1 rounded-lg">
                    <button
                      onClick={() => setActiveTab('travel')}
                      className={`flex-1 text-[10px] font-bold py-1 px-1.5 rounded-md transition-all text-center ${
                        activeTab === 'travel'
                          ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                      }`}
                    >
                      🗺️ Perjalanan
                    </button>
                    <button
                      onClick={() => setActiveTab('hotel')}
                      className={`flex-1 text-[10px] font-bold py-1 px-1.5 rounded-md transition-all text-center ${
                        activeTab === 'hotel'
                          ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                      }`}
                    >
                      🏨 Penginapan
                    </button>
                    <button
                      onClick={() => setActiveTab('other')}
                      className={`flex-1 text-[10px] font-bold py-1 px-1.5 rounded-md transition-all text-center ${
                        activeTab === 'other'
                          ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                      }`}
                    >
                      📌 Lainnya
                    </button>
                  </div>

                  {/* ISI TAB 1: PERJALANAN */}
                  {activeTab === 'travel' && (
                    <div className="space-y-1.5">
                      {routesOnSelectedDate.map((route, idx) => {
                        const isSubSelected = selectedCity?.id === route.id;

                        return (
                          <div 
                            key={route.id} 
                            onClick={() => {
                              setSelectedCity(route);
                              setFocusedRoute(route);
                            }}
                            className={`p-2.5 rounded-lg transition-all cursor-pointer ${
                              isSubSelected 
                                ? 'bg-zinc-800 text-white shadow-sm' 
                                : 'bg-zinc-950/50 text-zinc-300 hover:bg-zinc-800/60'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <h3 className="text-xs font-bold capitalize tracking-wide">
                                {idx + 1}. {capitalize(route.dari)} {route.ke ? `→ ${capitalize(route.ke)}` : ''}
                              </h3>
                              {route.transportasi && (
                                <span className="text-[9px] font-extrabold bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">
                                  🚆 {route.transportasi}
                                </span>
                              )}
                            </div>

                            {(route.berangkat || route.sampai) && (
                              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-200 animate-pulse"></span>
                                <span>
                                  ⏰ {route.berangkat || '--:--'} - {route.sampai || '--:--'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ISI TAB 2: PENGINAPAN */}
                  {activeTab === 'hotel' && (
                    <div className="space-y-1.5">
                      {routesOnSelectedDate.some((r) => (r as any).hotel) ? (
                        routesOnSelectedDate
                          .filter((r) => (r as any).hotel)
                          .map((route) => (
                            <div
                              key={`hotel-${route.id}`}
                              onClick={() => {
                                // Contoh: Fokus peta ke koordinat hotel jika ada
                                if ((route as any).hotelCoords) {
                                  setSelectedCity({
                                    ...route,
                                    coords: (route as any).hotelCoords,
                                  });
                                }
                              }}
                              className="p-2.5 rounded-lg bg-zinc-950/50 text-zinc-300 hover:bg-zinc-800/60 transition-all cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold capitalize text-white">
                                  🏨 {(route as any).hotel}
                                </h3>
                                <span className="text-[9px] font-extrabold bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded">
                                  Check-in
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-400 mt-1">
                                Lokasi: {capitalize(route.ke || route.dari)}
                              </p>
                            </div>
                          ))
                      ) : (
                        <div className="p-3 text-center text-[10px] text-zinc-500 bg-zinc-950/30 rounded-lg">
                          Tidak ada data penginapan untuk tanggal ini.
                        </div>
                      )}
                    </div>
                  )}

                  {/* ISI TAB 3: LAINNYA (Aktivitas / Catatan / Kuliner / dsb) */}
                  {activeTab === 'other' && (
                    <div className="space-y-1.5">
                      {routesOnSelectedDate.some((r) => (r as any).catatanLain) ? (
                        routesOnSelectedDate
                          .filter((r) => (r as any).catatanLain)
                          .map((route) => (
                            <div
                              key={`other-${route.id}`}
                              className="p-2.5 rounded-lg bg-zinc-950/50 text-zinc-300"
                            >
                              <div className="text-xs font-bold text-white mb-1">
                                📌 Catatan / Agenda:
                              </div>
                              <p className="text-[10px] text-zinc-400">
                                {(route as any).catatanLain}
                              </p>
                            </div>
                          ))
                      ) : (
                        <div className="p-3 text-center text-[10px] text-zinc-500 bg-zinc-950/30 rounded-lg">
                          Belum ada agenda tambahan untuk tanggal ini.
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

            </div>
          </div>
        )}

        {/* TOMBOL TOGGLE KALENDER */}
        <button
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          className="w-12 h-12 bg-zinc-100 text-black rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Toggle Kalender"
        >
          {isCalendarOpen ? (
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          )}
        </button>

      </div>

    </div>
  );
};

export default Dashboard;