'use client';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { MapPin, Navigation } from 'lucide-react';

interface ListingMapWidgetProps {
  cityName: string;
  locality?: string;
  state?: string;
  title?: string;
  priceFormatted?: string;
}

// Coordinate mapping for major Indian cities
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  mumbai: { lat: 19.076, lng: 72.8777 },
  delhi: { lat: 28.6139, lng: 77.209 },
  'new delhi': { lat: 28.6139, lng: 77.209 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  pune: { lat: 18.5204, lng: 73.8567 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  lucknow: { lat: 26.8467, lng: 80.9462 },
  chandigarh: { lat: 30.7333, lng: 76.7794 },
  surat: { lat: 21.1702, lng: 72.8311 },
  nagpur: { lat: 21.1458, lng: 79.0882 },
  indore: { lat: 22.7196, lng: 75.8577 },
  thane: { lat: 19.2183, lng: 72.9781 },
  'navi mumbai': { lat: 19.033, lng: 73.0297 },
  gurgaon: { lat: 28.4595, lng: 77.0266 },
  noida: { lat: 28.5355, lng: 77.391 },
};

export const ListingMapWidget: React.FC<ListingMapWidgetProps> = ({
  cityName,
  locality,
  state,
  priceFormatted,
}) => {
  const apiKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) ||
    'AIzaSyB2M-uQo8veNV4B2iG3B9JEd7u74rGQxUg';

  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoadMap, setShouldLoadMap] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || shouldLoadMap) return;
    if (typeof IntersectionObserver === 'undefined') {
      const timer = setTimeout(() => setShouldLoadMap(true), 0);
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoadMap(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldLoadMap]);

  const position = useMemo(() => {
    const key = (cityName || '').toLowerCase().trim();
    if (CITY_COORDINATES[key]) {
      return CITY_COORDINATES[key];
    }
    return { lat: 19.076, lng: 72.8777 };
  }, [cityName]);

  const fullAddress = [locality, cityName, state].filter(Boolean).join(', ');

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
    >
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Ad Location Map
          </h4>
          <p className="text-xs font-bold text-slate-900 mt-0.5 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">{fullAddress || 'India'}</span>
          </p>
        </div>

        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            fullAddress || cityName
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 hover:underline"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Get Directions</span>
        </a>
      </div>

      <div className="h-64 sm:h-72 w-full relative bg-slate-100">
        {shouldLoadMap ? (
          <APIProvider apiKey={apiKey} libraries={['marker']}>
            <Map
              mapId={'DEMO_MAP_ID'}
              defaultZoom={12}
              defaultCenter={position}
              gestureHandling={'greedy'}
              disableDefaultUI={false}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              className="w-full h-full"
            >
              <AdvancedMarker position={position}>
                <div className="relative group cursor-pointer">
                  <div className="bg-slate-950 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-lg border-2 border-white flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>{priceFormatted || locality || cityName}</span>
                  </div>
                  <div className="w-2.5 h-2.5 bg-slate-950 rotate-45 mx-auto -mt-1 border-r border-b border-white"></div>
                </div>
              </AdvancedMarker>
            </Map>
          </APIProvider>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-500 p-4 text-center">
            <div className="bg-slate-950 text-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-md border-2 border-white flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>{fullAddress || cityName}</span>
            </div>
            <button
              type="button"
              onClick={() => setShouldLoadMap(true)}
              className="text-xs font-semibold text-blue-600 hover:underline mt-1"
            >
              Load Interactive Map
            </button>
          </div>
        )}
      </div>

      <div className="p-3 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-200/80">
        <span>Exact location provided by seller in {cityName}</span>
        <span className="font-semibold text-slate-700">Chillyads Maps</span>
      </div>
    </div>
  );
};
