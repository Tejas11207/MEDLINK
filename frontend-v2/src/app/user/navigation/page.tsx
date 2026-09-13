"use client";
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navigation, MapPin, Clock, CheckCircle2, Radio, AlertTriangle, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { EmergencyCase } from '@/types';
import { formatEnum } from '@/lib/format';
import OpenStreetMap, { MapLocation } from '@/components/OpenStreetMap';

export default function NavigationPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-[#6e7681] font-mono text-xs">Loading navigation...</div>}>
      <NavigationInner />
    </Suspense>
  );
}

function NavigationInner() {
  const searchParams = useSearchParams();
  const caseIdParam = searchParams.get('case_id');
  const [currentCase, setCurrentCase] = useState<EmergencyCase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const id = caseIdParam || localStorage.getItem('medlink_current_case_id');
        if (id) {
          const res = await api.get(`/emergency/${id}`);
          setCurrentCase(res.data);
        }
      } catch {}
      finally { setLoading(false); }
    };
    fetchCase();
    const interval = setInterval(fetchCase, 5000);
    return () => clearInterval(interval);
  }, [caseIdParam]);

  const distanceInKm = currentCase?.selected_hospital
    ? (() => {
        const toRadians = (value: number) => value * Math.PI / 180;
        const latDelta = toRadians(currentCase.selected_hospital!.latitude - currentCase.latitude);
        const lngDelta = toRadians(currentCase.selected_hospital!.longitude - currentCase.longitude);
        const a = Math.sin(latDelta / 2) ** 2
          + Math.cos(toRadians(currentCase.latitude)) * Math.cos(toRadians(currentCase.selected_hospital!.latitude)) * Math.sin(lngDelta / 2) ** 2;
        return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      })()
    : null;
  const destination: MapLocation | null = currentCase?.selected_hospital ? {
    latitude: currentCase.selected_hospital.latitude,
    longitude: currentCase.selected_hospital.longitude,
    label: currentCase.selected_hospital.name,
    detail: currentCase.selected_hospital.address,
  } : null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-ok-400 font-semibold uppercase tracking-wider mb-1">
          <Navigation size={13} className="shrink-0" /> Route & Navigation
        </div>
        <h1 className="text-2xl font-bold text-white">Turn-by-Turn Navigation</h1>
        <p className="text-xs text-[#6e7681] mt-0.5">Live route to selected hospital ER bay</p>
      </div>

      {currentCase ? (
        <>
          {/* Destination card */}
          <div className="v2-card p-5 border-l-4 border-ok-400 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="badge-green px-2 py-0.5 rounded font-mono text-xs font-bold">EN ROUTE</span>
              <span className="badge-red px-2 py-0.5 rounded font-mono text-xs">{currentCase.case_code}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${currentCase.priority === 'CRITICAL' ? 'badge-red' : 'badge-amber'}`}>
                {formatEnum(currentCase.priority)}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{currentCase.selected_hospital?.name || 'Hospital ER'}</h2>
              <p className="text-xs text-[#6e7681] flex items-center gap-1 mt-0.5">
                <MapPin size={12} className="text-[#484f58]" />
                {currentCase.selected_hospital?.address || 'Navigating...'}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'ETA', value: currentCase.selected_hospital_eta ? `${Math.round(currentCase.selected_hospital_eta)} MIN` : '—', color: 'text-sos-300' },
                { label: 'Distance', value: distanceInKm !== null ? `${distanceInKm.toFixed(1)} km` : '—', color: 'text-white' },
                { label: 'ICU Beds', value: `${currentCase.selected_hospital?.available_icu || '—'} Open`, color: 'text-ok-400' },
              ].map(m => (
                <div key={m.label} className="p-3 rounded-lg bg-[#21262d] border border-[#30363d]">
                  <span className="text-[10px] font-mono text-[#484f58] uppercase block">{m.label}</span>
                  <span className={`text-sm font-bold ${m.color}`}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive destination map */}
          <div className="v2-card overflow-hidden">
            {destination ? (
              <OpenStreetMap
                location={destination}
                showDirectionsFrom={{ latitude: currentCase.latitude, longitude: currentCase.longitude }}
                className="h-72 border-x-0 border-t-0"
              />
            ) : (
              <div className="h-72 bg-[#21262d] flex items-center justify-center text-center p-6">
                <div className="space-y-2"><MapPin size={30} className="mx-auto text-[#6e7681]" /><p className="text-xs text-[#8b949e]">The selected hospital location is unavailable.</p></div>
              </div>
            )}
            <div className="p-4 border-t border-[#21262d] flex items-center justify-between">
              <div className="text-xs font-mono text-[#6e7681]">
                <span className="text-ok-400">●</span> Destination located · Open route for turn-by-turn navigation
              </div>
              <span className="text-[11px] text-[#484f58]">
                Lat: {currentCase.latitude?.toFixed(4)} · Lng: {currentCase.longitude?.toFixed(4)}
              </span>
            </div>
          </div>

          {/* Arrival instructions */}
          <div className="v2-card p-4 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 size={15} className="text-ok-400" /> Pre-Arrival Instructions
            </h3>
            <ul className="space-y-2 text-xs text-[#8b949e]">
              {[
                'ER staff have been alerted — go directly to Emergency Bay 2',
                'Bring patient ID and any existing medical records',
                `Tell reception your case code: ${currentCase.case_code}`,
                'Doctor pre-arrival protocol is active — trauma team is ready',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#21262d] border border-[#30363d] text-[10px] font-bold text-[#6e7681] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="v2-card p-8 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 mx-auto text-sos-400" />
          <h2 className="text-sm font-bold text-white">No Active Navigation</h2>
          <p className="text-xs text-[#6e7681]">Select a hospital from the discovery page to start navigation.</p>
          <Link href="/user/hospitals" className="inline-flex items-center gap-1.5 py-2 px-4 rounded bg-sos-400 text-white text-xs font-semibold">
            Hospital Discovery <ArrowRight size={13} />
          </Link>
        </div>
      )}
    </div>
  );
}
