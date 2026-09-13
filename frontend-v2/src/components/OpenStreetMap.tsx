"use client";

import { MapPin, Navigation } from 'lucide-react';

export type MapLocation = {
  latitude: number;
  longitude: number;
  label: string;
  detail?: string;
};

type OpenStreetMapProps = {
  location: MapLocation;
  className?: string;
  showDirectionsFrom?: Pick<MapLocation, 'latitude' | 'longitude'>;
};

const hasValidCoordinates = (latitude: number, longitude: number) =>
  Number.isFinite(latitude) && Number.isFinite(longitude)
  && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;

/**
 * A keyless, interactive map based on OpenStreetMap.  It deliberately uses the
 * official embed endpoint so the emergency workflow has no client-side API key
 * to configure or expose.
 */
export default function OpenStreetMap({ location, className = '', showDirectionsFrom }: OpenStreetMapProps) {
  const validLocation = hasValidCoordinates(location.latitude, location.longitude);
  const padding = 0.025;
  const bbox = validLocation
    ? `${location.longitude - padding},${location.latitude - padding},${location.longitude + padding},${location.latitude + padding}`
    : '';
  const source = validLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${location.latitude},${location.longitude}`)}`
    : '';
  const directionsUrl = showDirectionsFrom && validLocation
    ? `https://www.google.com/maps/dir/?api=1&origin=${showDirectionsFrom.latitude},${showDirectionsFrom.longitude}&destination=${location.latitude},${location.longitude}&travelmode=driving`
    : validLocation
      ? `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=15/${location.latitude}/${location.longitude}`
      : '';

  if (!validLocation) {
    return (
      <div className={`bg-[#21262d] border border-[#30363d] flex items-center justify-center text-center p-4 ${className}`}>
        <div>
          <MapPin size={22} className="mx-auto text-[#6e7681] mb-1" />
          <p className="text-[11px] text-[#8b949e]">A valid location is needed to load the map.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-[#21262d] border border-[#30363d] ${className}`}>
      <iframe
        title={`Map showing ${location.label}`}
        src={source}
        className="absolute inset-0 h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <div className="absolute left-2 top-2 max-w-[calc(100%-1rem)] rounded bg-[#0d1117]/90 px-2 py-1.5 shadow-lg backdrop-blur-sm">
        <p className="flex items-center gap-1 text-[10px] font-semibold text-white">
          <MapPin size={11} className="text-sos-300 shrink-0" />
          <span className="truncate">{location.label}</span>
        </p>
        {location.detail && <p className="truncate pl-4 text-[9px] text-[#8b949e]">{location.detail}</p>}
      </div>
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded bg-sos-400 px-2 py-1.5 text-[10px] font-bold text-white shadow-lg transition-colors hover:bg-sos-500"
      >
        <Navigation size={11} /> {showDirectionsFrom ? 'Open route' : 'Open map'}
      </a>
    </div>
  );
}
