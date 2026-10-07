import React, { useEffect, useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import TourMap from '../components/TourMap';
import type { PenginapanItem } from '../components/Penginapan';

import type { RoutePoint } from '../types/tour';
import itineraryCsv from '../assets/perjalanan.csv?raw';
import penginapanCsv from '../assets/penginapan.csv?raw';
import acaraCsv from '../assets/acara.csv?raw';

type CategoryTab = 'travel' | 'hotel' | 'other';

const capitalize = (str: string) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

export const Dashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<RoutePoint | null>(null);
  const [focusedRoute, setFocusedRoute] = useState<RoutePoint | null>(null);
  const [routeList, setRouteList] = useState<(RoutePoint & { gmaps?: string; linkTiket?: string })[]>([]);
  const [hotelList, setHotelList] = useState<PenginapanItem[]>([]);
  const [acaraList, setAcaraList] = useState<(RoutePoint & { gmaps?: string })[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  
  // State untuk mengontrol mode Fullscreen
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<CategoryTab>('travel');

  const scrollRef = useRef<HTMLDivElement>(null);
  const dateButtonRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef<boolean>(false);

  // 1. Parse perjalanan.csv (Menambahkan gmaps & link tiket)
  useEffect(() => {
    Papa.parse(itineraryCsv, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData: (RoutePoint & { gmaps?: string; linkTiket?: string })[] = results.data
          .filter((row: any) => row.dari && row.lat && row.lng)
          .map((row: any, idx: number) => ({
            id: row.id && !isNaN(Number(row.id)) ? Number(row.id) : idx + 1,
            dari: row.dari,
            ke: row.ke,
            tanggal: row.tanggal,
            berangkat: row.berangkat || undefined,
            sampai: row.sampai || undefined,
            transportasi: row.transportasi || undefined,
            catatanLain: row.catatan || row.aktivitas || undefined,
            coords: [parseFloat(row.lat), parseFloat(row.lng)],
            gmaps: row.gmaps || row.link || row.map || undefined,
            linkTiket: row['link tiket'] || row.tiket || row.link_tiket || undefined,
          }));

        setRouteList(parsedData);
      },
    });
  }, []);

  // 2. Parse penginapan.csv
  useEffect(() => {
    Papa.parse(penginapanCsv, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        setHotelList(results.data as PenginapanItem[]);
      },
    });
  }, []);

  // 3. Parse acara.csv
  useEffect(() => {
    Papa.parse(acaraCsv, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData: (RoutePoint & { gmaps?: string })[] = results.data
          .filter((row: any) => row.destinasi && row.lat && row.lng)
          .map((row: any, idx: number) => ({
            id: row.id && !isNaN(Number(row.id)) ? Number(row.id) : idx + 1000,
            dari: row.destinasi,
            ke: row.aktivitas,
            tanggal: row.tanggal,
            berangkat: row.mulai || undefined,
            sampai: row.selesai || undefined,
            transportasi: row.keterangan || undefined,
            coords: [parseFloat(row.lat), parseFloat(row.lng)],
            gmaps: row.gmaps || row.link || row.map || undefined,
          }));

        setAcaraList(parsedData);
      },
    });
  }, []);

  const getDayNumber = useCallback((dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split(/[/.-]/);
    if (parts.length >= 2) {
      const day = parts.length === 3 && parts[2].length === 4 ? Number(parts[1]) : Number(parts[0]);
      return isNaN(day) ? null : day;
    }
    return null;
  }, []);

  const scrollToSelectedDate = useCallback((dayNum: number) => {
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
  }, []);

  useEffect(() => {
    if (isCalendarOpen && routeList.length > 0) {
      const firstAvailableRoute = routeList[0];
      if (firstAvailableRoute && firstAvailableRoute.tanggal) {
        setSelectedDate(firstAvailableRoute.tanggal);
        setSelectedCity(firstAvailableRoute);
        setFocusedRoute(null);

        const dayNum = getDayNumber(firstAvailableRoute.tanggal);
        if (dayNum) {
          const timer = setTimeout(() => {
            scrollToSelectedDate(dayNum);
          }, 100);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [isCalendarOpen, routeList, getDayNumber, scrollToSelectedDate]);

  // Handle Scroll Swipe Kartu
  const handleCardScroll = () => {
    if (isProgrammaticScroll.current) return;
    const container = cardContainerRef.current;
    if (!container) return;

    const scrollLeft = container.scrollLeft;
    const width = container.clientWidth;
    if (width === 0) return;

    const tabIndex = Math.round(scrollLeft / width);
    const tabs: CategoryTab[] = ['travel', 'hotel', 'other'];
    if (tabs[tabIndex] && tabs[tabIndex] !== activeTab) {
      setActiveTab(tabs[tabIndex]);
    }
  };

  // Navigasi via Tab
  const handleTabClick = (tab: CategoryTab) => {
    setActiveTab(tab);
    const container = cardContainerRef.current;
    if (!container) return;

    const tabs: CategoryTab[] = ['travel', 'hotel', 'other'];
    const index = tabs.indexOf(tab);

    isProgrammaticScroll.current = true;
    container.scrollTo({
      left: index * container.clientWidth,
      behavior: 'smooth',
    });

    setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 300);
  };

  const routesOnSelectedDate = selectedDate
    ? routeList.filter((r) => r.tanggal === selectedDate)
    : [];

  const hotelsOnSelectedDate = selectedDate
    ? hotelList.filter((h) => h.tanggal === selectedDate)
    : [];

  const acaraOnSelectedDate = selectedDate
    ? acaraList.filter((a) => a.tanggal === selectedDate)
    : [];

  const daysInNovember = Array.from({ length: 30 }, (_, i) => i + 1);
  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const renderDateButton = (dayNum: number, isMobile = false) => {
    const matchedRoutes = routeList.filter((r) => getDayNumber(r.tanggal) === dayNum);
    const matchedHotels = hotelList.filter((h) => getDayNumber(h.tanggal) === dayNum);
    const matchedAcara = acaraList.filter((a) => getDayNumber(a.tanggal) === dayNum);

    const hasData = matchedRoutes.length > 0 || matchedHotels.length > 0 || matchedAcara.length > 0;

    const isSelected =
      selectedDate &&
      (matchedRoutes.some((r) => r.tanggal === selectedDate) ||
        matchedHotels.some((h) => h.tanggal === selectedDate) ||
        matchedAcara.some((a) => a.tanggal === selectedDate));

    let bgStyle = 'bg-zinc-900/40 text-zinc-600';

    if (hasData) {
      bgStyle = 'bg-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-700 hover:text-white';
    }

    if (isSelected) {
      bgStyle = 'bg-zinc-100 text-zinc-950 font-bold scale-105 z-10 shadow-sm';
    }

    const sizeClasses = isMobile
      ? 'h-8 w-8 min-w-[32px] text-[11px] rounded-lg'
      : 'h-7 w-full min-w-0 text-xs rounded';

    const handleClickDate = () => {
      if (!hasData) return;

      const targetDate = matchedRoutes[0]?.tanggal || matchedHotels[0]?.tanggal || matchedAcara[0]?.tanggal;
      if (!targetDate) return;

      setSelectedDate(targetDate);

      if (activeTab === 'travel') {
        if (matchedRoutes.length > 0) {
          setSelectedCity(matchedRoutes[0]);
          setFocusedRoute(matchedRoutes[0]);
        } else {
          setSelectedCity(null);
          setFocusedRoute(null);
        }
      } else if (activeTab === 'hotel') {
        if (matchedHotels.length > 0) {
          const targetHotel = matchedHotels[0];
          const hotelPoint: RoutePoint & { isHotelActive: boolean } = {
            id: targetHotel.id,
            dari: targetHotel.nama,
            ke: targetHotel.kota,
            tanggal: targetHotel.tanggal,
            coords: [Number(targetHotel.lat), Number(targetHotel.lng)],
            isHotelActive: true,
          };

          setSelectedCity(hotelPoint);
          setFocusedRoute(hotelPoint);
        } else {
          setSelectedCity(null);
          setFocusedRoute(null);
        }
      } else if (activeTab === 'other') {
        if (matchedAcara.length > 0) {
          setSelectedCity(matchedAcara[0]);
          setFocusedRoute(matchedAcara[0]);
        } else {
          setSelectedCity(null);
          setFocusedRoute(null);
        }
      }

      if (dayNum) {
        scrollToSelectedDate(dayNum);
      }
    };

    return (
      <button
        key={`${isMobile ? 'm' : 'd'}-${dayNum}`}
        ref={(el) => {
          if (isMobile) {
            dateButtonRefs.current[dayNum] = el;
          }
        }}
        onClick={handleClickDate}
        disabled={!hasData}
        className={`flex flex-col items-center justify-center transition-all duration-150 active:scale-90 flex-shrink-0 relative ${sizeClasses} ${bgStyle} ${
          hasData ? 'cursor-pointer' : 'opacity-30 cursor-default'
        }`}
      >
        <span>{dayNum}</span>
        {(matchedRoutes.length > 1 || matchedHotels.length > 0 || matchedAcara.length > 0) && (
          <span className="absolute bottom-0.5 flex gap-0.5">
            <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-zinc-950' : 'bg-zinc-100'}`}></span>
            {(matchedRoutes.length > 1 || matchedAcara.length > 0) && (
              <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-zinc-950' : 'bg-zinc-100'}`}></span>
            )}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100">
      
      {/* MAP CONTAINER FULL SCREEN - SELALU RENDERING & DI LATAR BELAKANG */}
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
          activeTab={activeTab}
          isCalendarOpen={isCalendarOpen}
        />
      </main>

      {/* FLOATING WIDGET & TRIGGER DI POJOK KANAN BAWAH LAYAR */}
      <div
        className={
          isFullscreen
            ? 'fixed inset-0 md:inset-auto md:bottom-5 md:right-5 z-50 flex items-end justify-end p-0 md:p-0 pointer-events-none'
            : 'fixed z-30 bottom-5 right-5 flex flex-col items-end gap-3 pointer-events-auto'
        }
      >
        {/* POPUP CONTAINER */}
        {isCalendarOpen && (
          <div
            className={`bg-zinc-950/95 backdrop-blur-md overflow-hidden flex flex-col shadow-2xl transition-all duration-300 pointer-events-auto ${
              isFullscreen
                ? 'w-full h-full md:w-96 md:h-[88vh] p-4 justify-between border-0 md:border md:border-zinc-800 rounded-none md:rounded-2xl'
                : 'w-[90vw] max-w-sm md:w-80 p-3.5 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 border border-zinc-800/80'
            }`}
          >
            <div className="w-full flex flex-col h-full justify-between">
              
              {/* DETAIL ITEM DENGAN HEADER FIXED HEIGHT & CAROUSEL SWIPE */}
              {selectedDate && (
                <div className={`bg-zinc-900/80 overflow-hidden ${isFullscreen ? 'flex-1 mb-3 flex flex-col rounded-xl min-h-0' : 'mb-3 rounded-xl'}`}>
                  
                 {/* NAVIGASI TAB KATEGORI */}
<div className="flex items-center gap-1 p-2 bg-zinc-950/80 flex-shrink-0">
  <button
    onClick={() => handleTabClick('travel')}
    className={`flex-1 text-xs font-bold py-1.5 px-2 rounded-md transition-all duration-150 active:scale-95 text-center ${
      activeTab === 'travel'
        ? 'bg-zinc-100 text-zinc-950 shadow-sm'
        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
    }`}
  >
    Perjalanan
  </button>
  <button
    onClick={() => handleTabClick('hotel')}
    className={`flex-1 text-xs font-bold py-1.5 px-2 rounded-md transition-all duration-150 active:scale-95 text-center ${
      activeTab === 'hotel'
        ? 'bg-zinc-100 text-zinc-950 shadow-sm'
        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
    }`}
  >
    Penginapan
  </button>
  <button
    onClick={() => handleTabClick('other')}
    className={`flex-1 text-xs font-bold py-1.5 px-2 rounded-md transition-all duration-150 active:scale-95 text-center ${
      activeTab === 'other'
        ? 'bg-zinc-100 text-zinc-950 shadow-sm'
        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
    }`}
  >
    Acara
  </button>
</div>

                  {/* SWIPEABLE CONTAINER */}
                  <div
                    ref={cardContainerRef}
                    onScroll={handleCardScroll}
                    className={`flex overflow-x-auto snap-x snap-mandatory no-scrollbar [scroll-snap-stop:always] ${
                      isFullscreen ? 'flex-1 h-full' : 'h-44'
                    }`}
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {/* CARD 1: PERJALANAN */}
                    <div className="w-full flex-shrink-0 snap-start [scroll-snap-stop:always] p-2.5 overflow-y-auto space-y-1.5">
                      {routesOnSelectedDate.length > 0 ? (
                        routesOnSelectedDate.map((route, idx) => {
                          const isSubSelected = selectedCity?.id === route.id && !(selectedCity as any)?.isHotelActive;

                          return (
                            <div 
                              key={route.id} 
                              onClick={() => {
                                setSelectedCity(route);
                                setFocusedRoute(route);
                              }}
                              className={`p-2.5 rounded-lg transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                                isSubSelected 
                                  ? 'bg-zinc-800 text-white' 
                                  : 'bg-zinc-950/50 text-zinc-300 hover:bg-zinc-800/60'
                              }`}
                            >
                              <div className="flex items-center justify-between">
  <h3 className="text-sm font-bold capitalize tracking-wide">
    {idx + 1}. {capitalize(route.dari)} {route.ke ? `-> ${capitalize(route.ke)}` : ''}
  </h3>
  {route.transportasi && (
    <span className="text-xs font-bold bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
      {route.transportasi}
    </span>
  )}
</div>

{(route.berangkat || route.sampai) && (
  <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
    <span>
      {route.berangkat || '--:--'} - {route.sampai || '--:--'}
    </span>
  </div>
)}

{(route.gmaps || route.linkTiket) && (
  <div className="mt-2 flex gap-1.5">
    {route.gmaps && (
      <a
        href={route.gmaps}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 py-1.5 px-2 text-xs font-bold bg-zinc-100 hover:bg-white text-zinc-950 rounded text-center transition-all duration-150 active:scale-95"
        onClick={(e) => e.stopPropagation()}
      >
        Maps ↗
      </a>
    )}
    {route.linkTiket && (
      <a
        href={route.linkTiket}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 py-1.5 px-2 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-center transition-all duration-150 active:scale-95"
        onClick={(e) => e.stopPropagation()}
      >
        Tiket
      </a>
    )}
  </div>
)}
                            </div>
                          );
                        })
                      ) : (
                        <div className="h-full flex items-center justify-center text-center text-xs text-zinc-500">
                          Tidak ada data perjalanan untuk tanggal ini.
                        </div>
                      )}
                    </div>

                    {/* CARD 2: PENGINAPAN */}
                    <div className="w-full flex-shrink-0 snap-start [scroll-snap-stop:always] p-2.5 overflow-y-auto space-y-1.5">
                      {hotelsOnSelectedDate.length > 0 ? (
                        hotelsOnSelectedDate.map((hotel) => {
                          const isSubSelected = selectedCity?.id === hotel.id && (selectedCity as any)?.isHotelActive;

                          return (
                            <div
                              key={`hotel-${hotel.id}`}
                              onClick={() => {
                                if (hotel.lat && hotel.lng) {
                                  const hotelPoint: RoutePoint & { isHotelActive: boolean } = {
                                    id: hotel.id,
                                    dari: hotel.nama,
                                    ke: hotel.kota,
                                    tanggal: hotel.tanggal,
                                    coords: [Number(hotel.lat), Number(hotel.lng)],
                                    isHotelActive: true,
                                  };
                                  
                                  setSelectedCity(hotelPoint);
                                  setFocusedRoute(hotelPoint);
                                }
                              }}
                              className={`p-2.5 rounded-lg transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                                isSubSelected 
                                  ? 'bg-zinc-800 text-white' 
                                  : 'bg-zinc-950/50 text-zinc-300 hover:bg-zinc-800/60'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <h3 className="text-xs font-bold capitalize text-white">
                                  {hotel.nama}
                                </h3>
                              </div>

                              <p className="text-xs text-zinc-400 mt-1">
                                Lokasi: {capitalize(hotel.kota)}
                              </p>

                              <div className="mt-1.5 flex items-center justify-between text-xs font-mono text-zinc-400 bg-zinc-900/60 p-1 rounded">
                                <div><span className="text-zinc-500">In:</span> {hotel['cek in']}</div>
                                <div><span className="text-zinc-500">Out:</span> {hotel['cek out']}</div>
                              </div>

                              {(hotel.gmaps || hotel['link tiket']) && (
                                <div className="mt-2 flex gap-1">
                                  {hotel.gmaps && (
                                    <a
                                      href={hotel.gmaps}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 py-1 px-1.5 text-xs font-bold bg-zinc-100 hover:bg-white text-zinc-950 rounded text-center transition-all duration-150 active:scale-95"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Maps ↗
                                    </a>
                                  )}
                                  {hotel['link tiket'] && (
                                    <a
                                      href={hotel['link tiket']}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 py-1 px-1.5 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-center transition-all duration-150 active:scale-95"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Tiket
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="h-full flex items-center justify-center text-center text-xs text-zinc-500">
                          Tidak ada data penginapan untuk tanggal ini.
                        </div>
                      )}
                    </div>

                    {/* CARD 3: ACARA */}
                    <div className="w-full flex-shrink-0 snap-start [scroll-snap-stop:always] p-2.5 overflow-y-auto space-y-1.5">
                      {acaraOnSelectedDate.length > 0 ? (
                        acaraOnSelectedDate.map((item, idx) => {
                          const isSubSelected = selectedCity?.id === item.id;

                          return (
                            <div
                              key={`acara-${item.id}`}
                              onClick={() => {
                                setSelectedCity(item);
                                setFocusedRoute(item);
                              }}
                              className={`p-2.5 rounded-lg transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                                isSubSelected
                                  ? 'bg-zinc-800 text-white'
                                  : 'bg-zinc-950/50 text-zinc-300 hover:bg-zinc-800/60'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="text-xs font-bold capitalize text-white">
                                  {idx + 1}. {capitalize(item.dari)}
                                </h3>
                                {(item.berangkat || item.sampai) && (
                                  <span className="text-[9px] font-bold font-mono bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded flex-shrink-0">
                                    {item.berangkat || '--:--'} - {item.sampai || '--:--'}
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] font-medium text-zinc-200 mt-1 leading-snug">
                                {item.ke}
                              </p>

                              {item.transportasi && (
                                <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                                  {item.transportasi}
                                </p>
                              )}

                              {item.gmaps && (
                                <div className="mt-2">
                                  <a
                                    href={item.gmaps}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block w-full py-1 px-1.5 text-[9px] font-bold bg-zinc-100 hover:bg-white text-zinc-950 rounded text-center transition-all duration-150 active:scale-95"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Maps ↗
                                  </a>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="h-full flex items-center justify-center text-center text-xs text-zinc-500">
                          Tidak ada acara untuk tanggal ini.
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* GRID KALENDER FULL UNTUK DESKTOP */}
              <div className="hidden md:block bg-zinc-900/60 p-2 rounded-xl mb-3 flex-shrink-0">
                <div className="text-xs font-medium text-zinc-400 tracking-wider uppercase mb-2">
                  November 2026
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                  {daysOfWeek.map((day, i) => (
                    <span key={i} className="text-[9px] font-bold text-zinc-500">
                      {day}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {daysInNovember.map((dayNum) => renderDateButton(dayNum, false))}
                </div>
              </div>

              {/* FOOTER BARIS BAWAH */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span className="text-[9px] font-medium text-zinc-400 tracking-wider uppercase mb-1 px-1 md:hidden">
                    November 2026
                  </span>

                  <div 
                    ref={scrollRef}
                    className="flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1 bg-zinc-900/60 rounded-xl"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {daysInNovember.map((dayNum) => renderDateButton(dayNum, true))}
                  </div>
                </div>

                {/* TOMBOL TOGGLE FULLSCREEN */}
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="w-10 h-10 bg-zinc-800 text-zinc-100 rounded-full flex items-center justify-center shadow-md transition-all duration-150 active:scale-90 hover:scale-105 cursor-pointer flex-shrink-0 self-end"
                  aria-label={isFullscreen ? 'Minimize' : 'Full Screen'}
                  title={isFullscreen ? 'Minimize' : 'Full Screen'}
                >
                  {isFullscreen ? (
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                    </svg>
                  )}
                </button>

                {/* TOMBOL CLOSE X */}
                <button
                  onClick={() => {
                    setIsCalendarOpen(false);
                    setIsFullscreen(false);
                    setSelectedCity(null);
                    setSelectedDate(null);
                    setFocusedRoute(null);
                  }}
                  className="w-10 h-10 bg-zinc-800 text-zinc-100 rounded-full flex items-center justify-center shadow-md transition-all duration-150 active:scale-90 hover:scale-105 cursor-pointer flex-shrink-0 self-end"
                  aria-label="Tutup Kalender"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* TOMBOL TOGGLE UNTUK MEMBUKA KALENDER */}
        {!isCalendarOpen && (
          <button
            onClick={() => setIsCalendarOpen(true)}
            className="w-10 h-10 bg-zinc-100 text-zinc-950 rounded-full flex items-center justify-center shadow-xl transition-all duration-150 active:scale-90 hover:scale-105 cursor-pointer pointer-events-auto"
            aria-label="Buka Kalender"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>
        )}
      </div>

    </div>
  );
};

export default Dashboard;