 /**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Plane, Compass, Search, RefreshCw, SlidersHorizontal, Layers, 
  AlertTriangle, Volume2, VolumeX, Info, Activity, MapPin, 
  Gauge, Wind, Navigation, ChevronRight, X, Radio, ShieldAlert,
  Maximize, Minimize, Eye, EyeOff, Menu
} from 'lucide-react';

// API Key from Vite environment variables
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Preset locations in and around Israel / Middle East
const PRESET_LOCATIONS = [
  { name: 'תל אביב / נתב"ג (LLBG)', lat: 32.0055, lon: 34.8854, dist: 150 },
  { name: 'ירושלים והמרכז', lat: 31.7683, lon: 35.2137, dist: 100 },
  { name: 'חיפה והצפון', lat: 32.7940, lon: 34.9896, dist: 120 },
  { name: 'אילת והדרום', lat: 29.5581, lon: 34.9482, dist: 150 },
  { name: 'ביירות, לבנון', lat: 33.8938, lon: 35.5018, dist: 150 },
  { name: 'עמאן, ירדן', lat: 31.9454, lon: 35.9284, dist: 150 },
  { name: 'לרנקה, קפריסין', lat: 34.9056, lon: 33.6196, dist: 200 },
  { name: 'קהיר, מצרים', lat: 30.0444, lon: 31.2357, dist: 250 },
];

export interface Aircraft {
  hex: string;
  flight?: string;
  r?: string; // registration
  t?: string; // aircraft type
  alt_baro?: number | 'ground';
  alt_geom?: number;
  gs?: number; // knots
  track?: number; // degrees
  baro_rate?: number;
  lat?: number;
  lon?: number;
  squawk?: string;
  emergency?: string;
  category?: string;
  seen?: number;
  rssi?: number;
}

const getAircraftName = (ac: Aircraft) => {
  if (ac.flight && ac.flight.trim() !== '') return ac.flight.trim();
  if (ac.r && ac.r.trim() !== '') return ac.r.trim();
  return `מטוס (${ac.hex})`;
};

const getCountryInfo = (ac: Aircraft) => {
  const r = (ac.r || '').toUpperCase().trim();
  const callsign = (ac.flight || '').toUpperCase().trim();

  if (r.startsWith('4X') || callsign.startsWith('LY') || callsign.startsWith('ISR') || callsign.startsWith('ARK') || callsign.startsWith('IAF')) {
    return { country: 'ישראל', flag: '🇮🇱' };
  }
  if (r.startsWith('TC') || callsign.startsWith('THY')) {
    return { country: 'טורקיה', flag: '🇹🇷' };
  }
  if (r.startsWith('A6') || callsign.startsWith('UAE') || callsign.startsWith('ETD')) {
    return { country: 'איחוד האמירויות', flag: '🇦🇪' };
  }
  if (r.startsWith('4K')) {
    return { country: 'אזרבייג׳ן', flag: '🇦🇿' };
  }
  if (r.startsWith('A7') || callsign.startsWith('QTR')) {
    return { country: 'קטר', flag: '🇶🇦' };
  }
  if (r.startsWith('HZ') || callsign.startsWith('SVA')) {
    return { country: 'ערב הסעודית', flag: '🇸🇦' };
  }
  if (r.startsWith('JY') || callsign.startsWith('RJA')) {
    return { country: 'ירדן', flag: '🇯🇴' };
  }
  if (r.startsWith('OD')) {
    return { country: 'לבנון', flag: '🇱🇧' };
  }
  if (r.startsWith('G-') || r.startsWith('G')) {
    return { country: 'בריטניה', flag: '🇬🇧' };
  }
  if (r.startsWith('N')) {
    return { country: 'ארצות הברית', flag: '🇺🇸' };
  }
  if (r.startsWith('D-')) {
    return { country: 'גרמניה', flag: '🇩🇪' };
  }
  if (r.startsWith('F-') || r.startsWith('F')) {
    return { country: 'צרפת', flag: '🇫🇷' };
  }
  if (r.startsWith('SP-')) {
    return { country: 'פולין', flag: '🇵🇱' };
  }

  return { country: 'בינלאומי', flag: '🌐' };
};

const AircraftIcon = ({ type, className = "w-4 h-4", style }: { type?: string; className?: string; style?: React.CSSProperties }) => {
  switch (type) {
    case 'helicopter':
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor">
          <path d="M12 2C10.5 2 9.5 3.5 9.5 6V14C9.5 16 10.5 18 12 21C13.5 18 14.5 16 14.5 14V6C14.5 3.5 13.5 2 12 2ZM12 4H12.01M6 10H18M9 18H15" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'glider':
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor">
          <path d="M12 4L13 9L23 11V12.5L13 11.5V17L14.5 19V20L12 19L9.5 20V19L11 17V11.5L1 12.5V11L11 9L12 4Z" />
        </svg>
      );
    case 'light':
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor">
          <path d="M12 3C12.5 3 13 4.5 13 6V11L19 13V14.5L13 13.5V17.5L15 19.5V20.5L12 19.5L9 20.5V19.5L11 17.5V13.5L5 14.5V13L11 11V6C11 4.5 11.5 3 12 3Z" />
        </svg>
      );
    case 'turboprop':
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor">
          <path d="M12 1.5C12.7 1.5 13.5 2.5 13.5 4.5V10.5L21.5 11.5V13.5L13.5 12.5V18.5L16.5 21V22.5L12 21.5L7.5 22.5L11 21V18.5L10.5 12.5L2.5 13.5V11.5L10.5 10.5V4.5C10.5 2.5 11.3 1.5 12 1.5Z" />
          <rect x="6" y="9" width="2" height="5" rx="0.8" />
          <rect x="16" y="9" width="2" height="5" rx="0.8" />
        </svg>
      );
    case 'narrowbody':
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor">
          <path d="M12 1.5C12.5 1.5 13.5 3 13.5 5V9.5L20 13.5V15.5L13.5 13.5V18.5L16 21V22L12 21L8 22V21L10.5 18.5V13.5L4 15.5V13.5L10.5 9.5V5C10.5 3 11.5 1.5 12 1.5Z" />
        </svg>
      );
    case 'widebody':
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor">
          <path d="M12 1C12.5 1 14 2.5 14 4.5V9L22 13V15.5L14 13.5V18L17 20.5V21.5L12 20.5L7 21.5V20.5L10 18V13.5L2 15.5V13L10 9V4.5C10 2.5 11.5 1 12 1Z" />
        </svg>
      );
    case 'heavy':
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor">
          <path d="M12 0.5C12.8 0.5 14.5 1.5 14.5 3.5V7.5L19.5 8.5V10.5L14.5 9.5V14.5L23 17V19.5L14.5 17V21L17.5 23.5V24.5L12 23.5L6.5 24.5L9.5 21V17L1 19.5V17L9.5 14.5V9.5L4.5 10.5V8.5L9.5 7.5V3.5C9.5 1.5 11.2 0.5 12 0.5Z" />
        </svg>
      );
    case 'military':
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor">
          <path d="M12 0.5C12.5 0.5 14 2.5 14 5V11L22 17V19.5L14 16.5V21L16.5 23.5V24.5L12 23.5L7.5 24.5V23.5L10 21V16.5L2 19.5V17L10 11V5C10 2.5 11.5 0.5 12 0.5Z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor">
          <path d="M12 2L15 9L22 13V15L15 13.5V19L18 21.5V22.5L12 21.5L6 22.5V21.5L9 19V13.5L2 15V13L9 9L12 2Z" />
        </svg>
      );
  }
};

const getAircraftSvgString = (type?: string) => {
  switch (type) {
    case 'helicopter':
      return `<svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor"><path d="M12 2C10.5 2 9.5 3.5 9.5 6V14C9.5 16 10.5 18 12 21C13.5 18 14.5 16 14.5 14V6C14.5 3.5 13.5 2 12 2ZM12 4H12.01M6 10H18M9 18H15" stroke="currentColor" stroke-width="1.5" /></svg>`;
    case 'glider':
      return `<svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor"><path d="M12 4L13 9L23 11V12.5L13 11.5V17L14.5 19V20L12 19L9.5 20V19L11 17V11.5L1 12.5V11L11 9L12 4Z" /></svg>`;
    case 'light':
      return `<svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor"><path d="M12 3C12.5 3 13 4.5 13 6V11L19 13V14.5L13 13.5V17.5L15 19.5V20.5L12 19.5L9 20.5V19.5L11 17.5V13.5L5 14.5V13L11 11V6C11 4.5 11.5 3 12 3Z" /></svg>`;
    case 'turboprop':
      return `<svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor"><path d="M12 1.5C12.7 1.5 13.5 2.5 13.5 4.5V10.5L21.5 11.5V13.5L13.5 12.5V18.5L16.5 21V22.5L12 21.5L7.5 22.5L11 21V18.5L10.5 12.5L2.5 13.5V11.5L10.5 10.5V4.5C10.5 2.5 11.3 1.5 12 1.5Z" /><rect x="6" y="9" width="2" height="5" rx="0.8" /><rect x="16" y="9" width="2" height="5" rx="0.8" /></svg>`;
    case 'narrowbody':
      return `<svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor"><path d="M12 1.5C12.5 1.5 13.5 3 13.5 5V9.5L20 13.5V15.5L13.5 13.5V18.5L16 21V22L12 21L8 22V21L10.5 18.5V13.5L4 15.5V13.5L10.5 9.5V5C10.5 3 11.5 1.5 12 1.5Z" /></svg>`;
    case 'widebody':
      return `<svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor"><path d="M12 1C12.5 1 14 2.5 14 4.5V9L22 13V15.5L14 13.5V18L17 20.5V21.5L12 20.5L7 21.5V20.5L10 18V13.5L2 15.5V13L10 9V4.5C10 2.5 11.5 1 12 1Z" /></svg>`;
    case 'heavy':
      return `<svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor"><path d="M12 0.5C12.8 0.5 14.5 1.5 14.5 3.5V7.5L19.5 8.5V10.5L14.5 9.5V14.5L23 17V19.5L14.5 17V21L17.5 23.5V24.5L12 23.5L6.5 24.5L9.5 21V17L1 19.5V17L9.5 14.5V9.5L4.5 10.5V8.5L9.5 7.5V3.5C9.5 1.5 11.2 0.5 12 0.5Z" /></svg>`;
    case 'military':
      return `<svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor"><path d="M12 0.5C12.5 0.5 14 2.5 14 5V11L22 17V19.5L14 16.5V21L16.5 23.5V24.5L12 23.5L7.5 24.5V23.5L10 21V16.5L2 19.5V17L10 11V5C10 2.5 11.5 0.5 12 0.5Z" /></svg>`;
    default:
      return `<svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor"><path d="M12 2L15 9L22 13V15L15 13.5V19L18 21.5V22.5L12 21.5L6 22.5V21.5L9 19V13.5L2 15V13L9 9L12 2Z" /></svg>`;
  }
};

const createAircraftDivIcon = (ac: any, isSelected: boolean, showLabels: boolean) => {
  const isEmergency = ac.squawk && ['7700', '7600', '7500'].includes(ac.squawk);
  
  let bgStyle = 'bg-cyan-950/90 text-cyan-400 border-cyan-500/60 shadow-cyan-950/50';
  if (isEmergency) {
    bgStyle = 'bg-red-600 text-white border-red-400 shadow-red-500/50 animate-pulse';
  } else if (isSelected) {
    bgStyle = 'bg-cyan-500 text-slate-950 border-white shadow-cyan-500/80 scale-125';
  } else if (ac.categoryColor) {
    bgStyle = `${ac.categoryColor.bg} ${ac.categoryColor.text} ${ac.categoryColor.border}`;
  }

  const svgHtml = getAircraftSvgString(ac.aircraftIconType);
  const track = ac.track || 0;
  const name = ac.flight?.trim() || ac.r?.trim() || ac.hex;

  const html = `
    <div class="relative flex flex-col items-center justify-center cursor-pointer group pointer-events-auto">
      ${isSelected ? '<div class="absolute -inset-3 rounded-full bg-cyan-400/30 animate-ping pointer-events-none"></div>' : ''}
      ${isEmergency ? '<div class="absolute -inset-3 rounded-full bg-red-500/50 animate-ping pointer-events-none"></div>' : ''}
      <div class="p-1.5 rounded-full shadow-2xl flex items-center justify-center border transition-all duration-300 ${bgStyle}" style="transform: rotate(${track}deg);">
        ${svgHtml}
      </div>
      ${showLabels ? `
        <div class="mt-1 px-1.5 py-0.5 rounded bg-slate-950/90 text-[10px] font-bold font-mono text-cyan-300 border border-slate-700/80 shadow-md whitespace-nowrap backdrop-blur-sm pointer-events-none">
          ${name}
        </div>
      ` : ''}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'aircraft-leaflet-marker',
    iconSize: [36, 44],
    iconAnchor: [18, 18]
  });
};

const parseOpenSkyData = (states: any[]): Aircraft[] => {
  if (!Array.isArray(states)) return [];
  return states
    .map(s => {
      const hex = String(s[0] || '').toLowerCase();
      const flight = String(s[1] || '').trim();
      const lon = s[5];
      const lat = s[6];
      const altMeters = s[7];
      const alt_baro: number | 'ground' | undefined = s[8] ? 'ground' : (typeof altMeters === 'number' ? Math.round(altMeters * 3.28084) : undefined);
      const speedMs = s[9];
      const gs = typeof speedMs === 'number' ? Math.round(speedMs * 1.94384) : undefined;
      const track = typeof s[10] === 'number' ? Math.round(s[10]) : 0;
      const squawk = s[14] ? String(s[14]) : undefined;

      return {
        hex,
        flight,
        lat,
        lon,
        alt_baro,
        gs,
        track,
        squawk
      };
    })
    .filter(ac => typeof ac.lat === 'number' && typeof ac.lon === 'number');
};

const LeafletViewController = ({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.flyTo([center.lat, center.lng], zoom, { duration: 1.2 });
    }
  }, [center.lat, center.lng, zoom, map]);
  return null;
};

const LeafletEventsHandler = ({ onCenterChange }: { onCenterChange: (center: { lat: number; lng: number }, zoom: number) => void }) => {
  const map = useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      onCenterChange({ lat: c.lat, lng: c.lng }, map.getZoom());
    }
  });
  return null;
};

const enrichAircraftData = (ac: Aircraft) => {
  const callsign = (ac.flight || '').trim().toUpperCase();
  const t = (ac.t || '').toUpperCase();
  let airlineName = 'תעופה כללית / פרטי';
  let route = 'אזור המרכז / טיסה מקומית';
  let colorKey = 'default';
  const countryInfo = getCountryInfo(ac);

  let aircraftIconType = 'narrowbody';
  if (colorKey === 'military' || t.includes('F15') || t.includes('F16') || t.includes('F35') || t.includes('C130') || t.includes('B52') || t.includes('C17')) {
    aircraftIconType = 'military';
  } else if (t.includes('A388') || t.includes('A380') || t.includes('B744') || t.includes('B748') || t.includes('B747')) {
    aircraftIconType = 'heavy';
  } else if (t.includes('B772') || t.includes('B77W') || t.includes('B788') || t.includes('B789') || t.includes('A359') || t.includes('A333')) {
    aircraftIconType = 'widebody';
  } else if (t.includes('AT76') || t.includes('AT72') || t.includes('AT75') || t.includes('AT45') || t.includes('AT43') || t.includes('ATR') || t.includes('DH8D') || t.includes('DH8') || t.includes('DHC8') || t.includes('SF34') || t.includes('PC12') || t.includes('B350') || t.includes('BE20') || t.includes('MA60') || t.includes('AN24') || t.includes('F50')) {
    aircraftIconType = 'turboprop';
  } else if (t.includes('H64') || t.includes('B412') || t.includes('EC35') || t.includes('S76') || t.includes('R44')) {
    aircraftIconType = 'helicopter';
  } else if (t.includes('GLID') || t.includes('SF25')) {
    aircraftIconType = 'glider';
  } else if (t.includes('C172') || t.includes('PA28') || t.includes('SR22')) {
    aircraftIconType = 'light';
  } else {
    aircraftIconType = 'narrowbody';
  }

  if (callsign.startsWith('LY')) {
    airlineName = 'אל על (EL AL)';
    route = 'תל אביב (TLV) ⇄ יעדים בינלאומיים';
    colorKey = 'elal';
  } else if (callsign.startsWith('ISR')) {
    airlineName = 'ישראייר (Israir)';
    route = 'נתב"ג / חיפה ⇄ אילת / אירופה';
    colorKey = 'israir';
  } else if (callsign.startsWith('ARK')) {
    airlineName = 'ארקיע (Arkia)';
    route = 'נתב"ג ⇄ אילת / ים התיכון';
    colorKey = 'arkia';
  } else if (callsign.startsWith('UAE') || callsign.startsWith('ETD') || callsign.startsWith('QTR')) {
    airlineName = 'חברת תעופה בינלאומית (Emirates / Qatar)';
    route = 'מפרץ / אסיה ⇄ אירופה';
    colorKey = 'widebody';
  } else if (callsign.startsWith('THY')) {
    airlineName = 'טורקיש איירליינס (Turkish)';
    route = 'איסטנבול (IST) ⇄ תל אביב / עולם';
    colorKey = 'narrowbody';
  } else if (callsign.startsWith('BAH') || callsign.startsWith('GFA')) {
    airlineName = 'גאלף אייר (Gulf Air)';
    route = 'בחריין (BAH) ⇄ אזורי';
    colorKey = 'narrowbody';
  } else if (callsign.startsWith('RYR') || callsign.startsWith('EZY') || callsign.startsWith('WZZ')) {
    airlineName = 'לואו-קוסט (Ryanair / Wizz / EasyJet)';
    route = 'אירופה ⇄ ישראל / קפריסין';
    colorKey = 'lowcost';
  } else if (callsign.startsWith('IAF') || callsign.startsWith('RCH') || callsign.startsWith('CNV') || callsign.startsWith('MIL') || callsign.startsWith('ASY') || t.includes('C130') || t.includes('F15') || t.includes('F16') || t.includes('F35')) {
    airlineName = 'חיל האוויר / תעופה צבאית (Military)';
    route = 'טיסה מבצעית / אימון טקטי';
    colorKey = 'military';
  }

  let categoryColor = {
    bg: 'bg-cyan-950/80',
    text: 'text-cyan-400',
    border: 'border-cyan-500/55',
    badgeBg: 'bg-cyan-500/20',
    hex: '#06b6d4'
  };

  if (ac.squawk && ['7700', '7600', '7500'].includes(ac.squawk)) {
    categoryColor = { bg: 'bg-red-950/90', text: 'text-red-400', border: 'border-red-500', badgeBg: 'bg-red-500/20', hex: '#ef4444' };
  } else if (t.includes('A388') || t.includes('B772') || t.includes('B77W') || t.includes('B789') || t.includes('A359')) {
    categoryColor = { bg: 'bg-purple-950/80', text: 'text-purple-400', border: 'border-purple-500/60', badgeBg: 'bg-purple-500/20', hex: '#a855f7' };
  } else if (colorKey === 'elal') {
    categoryColor = { bg: 'bg-blue-950/80', text: 'text-blue-400', border: 'border-blue-500/60', badgeBg: 'bg-blue-500/20', hex: '#3b82f6' };
  } else if (colorKey === 'lowcost') {
    categoryColor = { bg: 'bg-amber-950/80', text: 'text-amber-400', border: 'border-amber-500/60', badgeBg: 'bg-amber-500/20', hex: '#f59e0b' };
  } else if (colorKey === 'military') {
    categoryColor = { bg: 'bg-amber-900/90', text: 'text-amber-200', border: 'border-amber-600', badgeBg: 'bg-amber-950/60', hex: '#78350f' };
  } else if (t.includes('AT76') || t.includes('DH8D')) {
    categoryColor = { bg: 'bg-emerald-950/80', text: 'text-emerald-400', border: 'border-emerald-500/60', badgeBg: 'bg-emerald-500/20', hex: '#10b981' };
  }

  return {
    ...ac,
    airlineName,
    route,
    country: countryInfo.country,
    flag: countryInfo.flag,
    aircraftIconType,
    categoryColor
  };
};

export default function App() {
  // Quota banner state
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // Map and Location state
  const [selectedPreset, setSelectedPreset] = useState(PRESET_LOCATIONS[0]);
  const [center, setCenter] = useState({ lat: PRESET_LOCATIONS[0].lat, lng: PRESET_LOCATIONS[0].lon });
  const [zoom, setZoom] = useState(8);
  const [distanceKm, setDistanceKm] = useState(150);

  // Flight data state
  const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLiveData, setIsLiveData] = useState<boolean>(false);

  // UI & Controls state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlight, setSelectedFlight] = useState<Aircraft | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(10); // seconds
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [mapStyle, setMapStyle] = useState<'dark' | 'standard'>('dark');
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');
  const [minAltitude, setMinAltitude] = useState<number>(0);
  const [maxAltitude, setMaxAltitude] = useState<number>(50000);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [audioAlertsTriggered, setAudioAlertsTriggered] = useState<Set<string>>(new Set());

  // Refs for debouncing map drag and aborting pending fetches
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Listen for GMP quota exceeded event
  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Fetch flights function with request cancellation
  const fetchFlights = useCallback(async () => {
    // Abort previous pending fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setLoading(prev => aircrafts.length === 0 ? true : prev);
      
      let liveAircrafts: Aircraft[] = [];
      const pointPath = `v2/point/${center.lat}/${center.lng}/${distanceKm}`;
      const latLonPath = `v2/lat/${center.lat}/lon/${center.lng}/dist/${distanceKm}`;
      const delta = distanceKm > 200 ? 2.5 : 1.5;

      const directEndpoints = [
        `/api/flights?lat=${center.lat}&lon=${center.lng}&dist=${distanceKm}`,
        `https://api.airplanes.live/${pointPath}`,
        `https://api.adsb.one/${pointPath}`,
        `https://api.adsb.lol/${latLonPath}`,
        `https://opensky-network.org/api/states/all?lamin=${center.lat - delta}&lomin=${center.lng - delta}&lamax=${center.lat + delta}&lomax=${center.lng + delta}`
      ];

      for (const endpoint of directEndpoints) {
        try {
          const res = await fetch(endpoint, {
            headers: { 'Accept': 'application/json' },
            signal: abortControllerRef.current.signal
          });
          if (res.ok) {
            const parsed = await res.json();
            if (endpoint.includes('opensky-network')) {
              if (parsed && Array.isArray(parsed.states) && parsed.states.length > 0) {
                liveAircrafts = parseOpenSkyData(parsed.states);
                if (liveAircrafts.length > 0) break;
              }
            } else if (parsed && Array.isArray(parsed.ac) && parsed.ac.length > 0) {
              liveAircrafts = parsed.ac;
              break;
            }
          }
        } catch (e: any) {
          if (e.name === 'AbortError') throw e;
        }
      }
      
      if (liveAircrafts.length > 0) {
        const validAc = liveAircrafts.filter((ac: Aircraft) => typeof ac.lat === 'number' && typeof ac.lon === 'number');
        setAircrafts(validAc);
        setIsLiveData(true);
        setError(null);
        setLastUpdated(new Date());

        // Check for emergency squawks (7700, 7600, 7500)
        validAc.forEach((ac: Aircraft) => {
          if (ac.squawk && ['7700', '7600', '7500'].includes(ac.squawk)) {
            if (soundEnabled && !audioAlertsTriggered.has(ac.hex)) {
              playEmergencyAlertSound();
              setAudioAlertsTriggered(prev => new Set(prev).add(ac.hex));
            }
          }
        });
      } else {
        // Fallback to regional simulated air traffic if no live receiver in range
        setAircrafts(getMockAircrafts(center.lat, center.lng));
        setIsLiveData(false);
        setError(null);
        setLastUpdated(new Date());
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error("Error fetching flight data:", err);
      setAircrafts(getMockAircrafts(center.lat, center.lng));
      setIsLiveData(false);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [center.lat, center.lng, distanceKm, soundEnabled, audioAlertsTriggered, aircrafts.length]);

  // Initial and interval fetch
  useEffect(() => {
    fetchFlights();
  }, [center, distanceKm]);

  useEffect(() => {
    if (!isAutoRefresh) return;
    const interval = setInterval(() => {
      fetchFlights();
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [isAutoRefresh, refreshInterval, fetchFlights]);

  // Audio alert beep generator using Web Audio API
  const playEmergencyAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio error:", e);
    }
  };

  // Fallback mock aircraft generator for resilience
  function getMockAircrafts(lat: number, lon: number): Aircraft[] {
    return [
      { hex: '740abc', flight: 'LY315', r: '4X-EED', t: 'B789', alt_baro: 36000, gs: 482, track: 285, lat: lat + 0.2, lon: lon - 0.3, squawk: '1000' },
      { hex: '740def', flight: 'ELAL1', r: '4X-EKC', t: 'B748', alt_baro: 12400, gs: 310, track: 140, lat: lat - 0.3, lon: lon + 0.2, squawk: '2000' },
      { hex: '43c123', flight: 'BAH123', r: 'G-XLEF', t: 'A359', alt_baro: 39000, gs: 512, track: 45, lat: lat + 0.5, lon: lon + 0.4, squawk: '7700', emergency: 'general' },
      { hex: 'abc456', flight: 'RYR432', r: 'SP-RKA', t: 'B738', alt_baro: 8200, gs: 260, track: 190, lat: lat - 0.4, lon: lon - 0.4, squawk: '1200' },
      { hex: '738910', flight: 'ISR902', r: '4X-ABX', t: 'AT76', alt_baro: 6500, gs: 210, track: 320, lat: lat + 0.1, lon: lon + 0.1, squawk: '7000' },
      { hex: '750111', flight: 'THY812', r: 'TC-JNC', t: 'A321', alt_baro: 28000, gs: 450, track: 210, lat: lat + 0.6, lon: lon - 0.5, squawk: '1000' },
      { hex: '760222', flight: 'UAE931', r: 'A6-EPL', t: 'A388', alt_baro: 41000, gs: 540, track: 290, lat: lat - 0.5, lon: lon + 0.6, squawk: '1000' },
      { hex: '770333', flight: 'IAF201', r: '4X-123', t: 'C130', alt_baro: 18500, gs: 315, track: 90, lat: lat + 0.15, lon: lon + 0.25, squawk: '7000' },
      { hex: '780444', flight: 'HEL01', r: '4X-H11', t: 'H64', alt_baro: 2500, gs: 120, track: 110, lat: lat - 0.2, lon: lon - 0.6, squawk: '1000' },
      { hex: '790555', flight: 'GLID1', r: '4X-G01', t: 'GLID', alt_baro: 4000, gs: 80, track: 60, lat: lat - 0.1, lon: lon - 0.2, squawk: '1000' },
      { hex: '790666', flight: 'CESSNA1', r: '4X-C55', t: 'C172', alt_baro: 3500, gs: 110, track: 150, lat: lat + 0.3, lon: lon - 0.1, squawk: '1000' }
    ];
  }

  // Filtered aircraft list
  const filteredAircrafts = useMemo(() => {
    return aircrafts
      .filter(ac => {
        // Search query filter (callsign, registration, hex, type)
        const q = searchQuery.toLowerCase().trim();
        if (q) {
          const matchCallsign = ac.flight?.toLowerCase().includes(q);
          const matchReg = ac.r?.toLowerCase().includes(q);
          const matchHex = ac.hex?.toLowerCase().includes(q);
          const matchType = ac.t?.toLowerCase().includes(q);
          if (!matchCallsign && !matchReg && !matchHex && !matchType) return false;
        }

        // Altitude filter
        const alt = ac.alt_baro === 'ground' ? 0 : (ac.alt_baro || 0);
        if (alt < minAltitude || alt > maxAltitude) return false;

        return true;
      })
      .map(ac => enrichAircraftData(ac));
  }, [aircrafts, searchQuery, minAltitude, maxAltitude]);

  const enrichedSelectedFlight = useMemo(() => {
    return selectedFlight ? enrichAircraftData(selectedFlight) : null;
  }, [selectedFlight]);

  // Handle selecting a preset location
  const handlePresetChange = (preset: typeof PRESET_LOCATIONS[0]) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setSelectedPreset(preset);
    setCenter({ lat: preset.lat, lng: preset.lon });
    setDistanceKm(preset.dist);
  };

  // Dark map custom styles for FlightRadar24 dark mode aesthetic
  const darkMapStyles = [
    { elementType: 'geometry', stylers: [{ color: '#090d16' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a2234' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8a99ad' }] },
    {
      featureType: 'administrative.locality',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#cbd5e1' }]
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#64748b' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#0f172a' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#1e293b' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#0f172a' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#334155' }]
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#020617' }]
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#475569' }]
    }
  ];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* GMP Quota Exceeded Banner (Required by Section 8 Case A) */}
      {quotaExceeded && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 text-amber-200 px-4 py-2 text-xs md:text-sm text-center sticky top-0 z-50 shadow-md backdrop-blur-md">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-100 hover:text-white"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-cyan-600 to-blue-500 p-2 rounded-xl shadow-lg shadow-cyan-500/20 text-white flex items-center justify-center">
            <Plane className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              Fly Radar Israel <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-normal border border-cyan-500/30">Live ADSB</span>
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isLiveData ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLiveData ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
              <span className={`text-xs font-medium ${isLiveData ? 'text-emerald-400' : 'text-amber-300'}`}>
                {isLiveData ? `מכ"ם חי ADS-B • ${aircrafts.length} טיסות` : `מכ"ם הדגמה / סימולציה • ${aircrafts.length} טיסות`}
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Search & Location Presets */}
        <div className="flex items-center gap-2 flex-1 max-w-xl mx-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="חיפוש לפי אות קריאה (Callsign), רישום, או סוג מטוס..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg pr-9 pl-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition shadow-inner"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedPreset.name}
            onChange={(e) => {
              const found = PRESET_LOCATIONS.find(p => p.name === e.target.value);
              if (found) handlePresetChange(found);
            }}
            className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition cursor-pointer"
          >
            {PRESET_LOCATIONS.map(p => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchFlights()}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="רענן עכשיו"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">רענן</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border text-xs transition ${soundEnabled ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
            title={soundEnabled ? 'התרעות קוליות פעילות' : 'התרעות קוליות מושתקות'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setMapStyle(mapStyle === 'dark' ? 'standard' : 'dark')}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition"
            title="החלף סגנון מפה"
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-lg border text-xs transition flex items-center gap-1.5 ${isSidebarOpen ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
            title="הצג/הסתר תפריט צד"
          >
            <Menu className="w-4 h-4" />
            <span className="hidden md:inline">תפריט</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Left Sidebar: Flight List & Stats */}
        <aside className={`w-full md:w-96 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 flex flex-col z-20 shadow-2xl absolute md:relative inset-y-0 right-0 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0 md:hidden'}`}>
          {/* Tabs */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition ${activeTab === 'list' ? 'border-cyan-500 text-cyan-400 bg-slate-800/50' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              רשימת טיסות ({filteredAircrafts.length})
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition ${activeTab === 'stats' ? 'border-cyan-500 text-cyan-400 bg-slate-800/50' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              סטטיסטיקה ומדדים
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeTab === 'list' ? (
              <>
                {/* Altitude Filter Slider */}
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 mb-3 text-xs space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>סינון בגובה:</span>
                    <span className="text-cyan-400 font-mono">{minAltitude.toLocaleString()} - {maxAltitude.toLocaleString()} ft</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="range"
                      min="0"
                      max="50000"
                      step="1000"
                      value={maxAltitude}
                      onChange={(e) => setMaxAltitude(Number(e.target.value))}
                      className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-200 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                {filteredAircrafts.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    <Plane className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    לא נמצאו טיסות תואמות לחיפוש או למסנן הנוכחי.
                  </div>
                ) : (
                  filteredAircrafts.map((ac) => {
                    const isSelected = selectedFlight?.hex === ac.hex;
                    const isEmergency = ac.squawk && ['7700', '7600', '7500'].includes(ac.squawk);
                    const altText = ac.alt_baro === 'ground' ? 'על הקרקע' : `${ac.alt_baro?.toLocaleString()} ft`;
                    const speedText = ac.gs ? `${ac.gs} kts` : '—';
                    
                    return (
                      <div
                        key={ac.hex}
                        onClick={() => {
                          setSelectedFlight(ac);
                          setIsSidebarOpen(true);
                          if (ac.lat && ac.lon) {
                            setCenter({ lat: ac.lat, lng: ac.lon });
                          }
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-500/10'
                            : isEmergency
                            ? 'bg-red-950/40 border-red-500 animate-pulse'
                            : 'bg-slate-950/40 hover:bg-slate-800/60 border-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${ac.categoryColor.badgeBg} ${ac.categoryColor.text} border ${ac.categoryColor.border}`}>
                            <AircraftIcon type={ac.aircraftIconType} className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white tracking-wide">
                                {getAircraftName(ac)}
                              </span>
                              {ac.t && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                                  {ac.t}
                                </span>
                              )}
                              {isEmergency && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white font-bold animate-bounce">
                                  חירום {ac.squawk}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-300 font-medium mt-0.5 flex items-center gap-1.5">
                              <span>{ac.flag}</span> <span className="text-cyan-400 font-semibold">{ac.country}</span> • <span>{ac.airlineName}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                              ✈️ {ac.route}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-3 mt-1 font-mono">
                              <span>גובה: {altText}</span>
                              <span>מהירות: {speedText}</span>
                            </div>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </div>
                    );
                  })
                )}
              </>
            ) : (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                  <h3 className="font-bold text-cyan-400 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> סיכום מרחב אווירי
                  </h3>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-slate-400">סה"כ מטוסים</div>
                      <div className="text-lg font-bold text-white font-mono mt-0.5">{aircrafts.length}</div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-slate-400">התרעות חירום</div>
                      <div className="text-lg font-bold text-red-400 font-mono mt-0.5">
                        {aircrafts.filter(a => a.squawk && ['7700', '7600', '7500'].includes(a.squawk)).length}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                  <h3 className="font-bold text-cyan-400 flex items-center gap-2">
                    <Compass className="w-4 h-4" /> מידע על אזור כיסוי
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    נתוני ADSB בזמן אמת מ-"ADSB.lol" סביב נקודת המרכז הנבחרת ({selectedPreset.name}). רדיוס חיפוש: {distanceKm} ק"מ.
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Center: OpenStreetMap / Leaflet Map */}
        <main className="flex-1 relative h-full">
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={zoom}
            zoomControl={true}
            className="w-full h-full z-0"
            style={{ background: '#090d16' }}
          >
            <LeafletViewController center={center} zoom={zoom} />
            <LeafletEventsHandler onCenterChange={(newCenter, newZoom) => {
              setZoom(newZoom);
              if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
              debounceTimerRef.current = setTimeout(() => {
                setCenter(newCenter);
              }, 600);
            }} />
            <TileLayer
              attribution={
                mapStyle === 'dark'
                  ? '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
                  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              }
              url={
                mapStyle === 'dark'
                  ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
                  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              }
              maxZoom={19}
            />
            {filteredAircrafts.map((ac) => {
              if (!ac.lat || !ac.lon) return null;
              const isSelected = selectedFlight?.hex === ac.hex;
              const customIcon = createAircraftDivIcon(ac, isSelected, showLabels);

              return (
                <Marker
                  key={ac.hex}
                  position={[ac.lat, ac.lon]}
                  icon={customIcon}
                  eventHandlers={{
                    click: () => {
                      setSelectedFlight(ac);
                      setIsSidebarOpen(true);
                    }
                  }}
                />
              );
            })}
          </MapContainer>

          {/* Floating Map Toolbar */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 rounded-xl border border-cyan-500/50 bg-slate-900/90 text-cyan-400 shadow-lg backdrop-blur-md transition flex items-center gap-2 text-xs font-medium hover:bg-slate-800"
              title="הצג/הסתר תפריט צד"
            >
              <Menu className="w-4 h-4" />
              <span className="hidden sm:inline">תפריט</span>
            </button>

            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`p-2.5 rounded-xl border shadow-lg backdrop-blur-md transition flex items-center gap-2 text-xs font-medium ${
                showLabels 
                  ? 'bg-slate-900/90 border-cyan-500/50 text-cyan-400' 
                  : 'bg-slate-900/90 border-slate-700 text-slate-400'
              }`}
              title="הצג/הסתר תוויות קריאה"
            >
              {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="hidden sm:inline">תוויות</span>
            </button>
          </div>
        </main>

        {/* Selected Flight HUD Modal / Bottom Drawer */}
        {enrichedSelectedFlight && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-2xl z-30 space-y-4 animate-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${enrichedSelectedFlight.categoryColor.badgeBg} ${enrichedSelectedFlight.categoryColor.text} ${enrichedSelectedFlight.categoryColor.border}`}>
                  <AircraftIcon type={enrichedSelectedFlight.aircraftIconType} className="w-5 h-5 transform" style={{ rotate: `${enrichedSelectedFlight.track || 0}deg` }} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    {getAircraftName(enrichedSelectedFlight)}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    רישום: {enrichedSelectedFlight.r || 'לא ידוע'} • סוג: {enrichedSelectedFlight.t || 'לא ידוע'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFlight(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Route / Destination Info Box */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="text-cyan-400 font-semibold flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5" /> פרטי טיסה ויעד:
                </div>
                <div className="bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 text-slate-200 font-medium flex items-center gap-1.5">
                  <span>{enrichedSelectedFlight.flag}</span> <span>{enrichedSelectedFlight.country}</span>
                </div>
              </div>
              <div className="text-white font-medium">{enrichedSelectedFlight.airlineName}</div>
              <div className="text-slate-300 font-mono">✈️ {enrichedSelectedFlight.route}</div>
            </div>

            {/* Flight Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" /> גובה נוכחי
                </div>
                <div className="font-bold text-white text-sm font-mono">
                  {enrichedSelectedFlight.alt_baro === 'ground' ? 'על הקרקע' : `${enrichedSelectedFlight.alt_baro?.toLocaleString()} ft`}
                </div>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" /> מהירות קרקע
                </div>
                <div className="font-bold text-white text-sm font-mono">
                  {enrichedSelectedFlight.gs ? `${enrichedSelectedFlight.gs} kts` : '—'}
                </div>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" /> כיוון (Track)
                </div>
                <div className="font-bold text-white text-sm font-mono">
                  {enrichedSelectedFlight.track !== undefined ? `${Math.round(enrichedSelectedFlight.track)}°` : '—'}
                </div>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" /> קוד Squawk
                </div>
                <div className={`font-bold text-sm font-mono ${enrichedSelectedFlight.squawk && ['7700', '7600', '7500'].includes(enrichedSelectedFlight.squawk) ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                  {enrichedSelectedFlight.squawk || '—'}
                </div>
              </div>
            </div>

            {/* Coordinates info */}
            <div className="text-[11px] text-slate-500 font-mono flex justify-between pt-1 border-t border-slate-800/80">
              <span>קו רוחב: {enrichedSelectedFlight.lat?.toFixed(4)}</span>
              <span>קו אורך: {enrichedSelectedFlight.lon?.toFixed(4)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
