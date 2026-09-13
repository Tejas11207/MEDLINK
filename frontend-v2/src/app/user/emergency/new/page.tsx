"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, Radio, MapPin, Car, Ambulance, ArrowRight,
  Navigation, HeartPulse, Crosshair, Shield,
  CheckCircle2, Loader2, User, Hash, FileText, Siren
} from 'lucide-react';
import api from '@/lib/api';
import OpenStreetMap, { MapLocation } from '@/components/OpenStreetMap';
import { Hospital } from '@/types';

/* ─── Severity options ────────────────────────────── */
const SEVERITY = [
  { id: 'LOW',      label: 'Mild',     sub: 'Stage 1', desc: 'Minor injury, stable',         color: 'border-ok-400/50 bg-ok-400/8 text-ok-400',      dot: 'bg-ok-400' },
  { id: 'MEDIUM',   label: 'Moderate', sub: 'Stage 2', desc: 'Fever, vomiting, laceration',  color: 'border-warn-400/50 bg-warn-400/8 text-warn-300', dot: 'bg-warn-400' },
  { id: 'HIGH',     label: 'Serious',  sub: 'Stage 3', desc: 'Fracture, heavy bleeding',     color: 'border-warn-500/60 bg-warn-500/10 text-warn-300', dot: 'bg-warn-500' },
  { id: 'CRITICAL', label: 'Critical', sub: 'P1',      desc: 'Cardiac arrest, unconscious',  color: 'border-sos-400/60 bg-sos-400/10 text-sos-300',   dot: 'bg-sos-400' },
];

/* ─── Quick condition tags ────────────────────────── */
const CONDITION_TAGS = [
  'Chest pain', 'Difficulty breathing', 'Severe bleeding',
  'Stroke symptoms', 'Unconscious', 'Accident / Trauma',
  'Severe burns', 'Allergic reaction', 'Seizure',
];

/* ─── One-Click countdown display ────────────────── */
function Countdown({ n }: { n: number }) {
  return (
    <span className="font-mono font-bold text-sos-300 tabular-nums">{n}</span>
  );
}

export default function CreateEmergencyPage() {
  const router = useRouter();

  /* ── Form state ── */
  const [mode, setMode] = useState<'SELF_TRANSPORT' | 'AMBULANCE'>('SELF_TRANSPORT');
  const [priority, setPriority] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [what, setWhat] = useState('');
  const [lat, setLat] = useState(12.9716);
  const [lng, setLng] = useState(77.5946);
  const [address, setAddress] = useState('Bengaluru, Karnataka');
  const [gpsLocked, setGpsLocked] = useState(false);
  const [locationMode, setLocationMode] = useState<'SAVED' | 'LOCATING' | 'GPS' | 'MANUAL'>('SAVED');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [locationUpdatedAt, setLocationUpdatedAt] = useState<Date | null>(null);
  const [gpsMessage, setGpsMessage] = useState('Using the saved incident location until GPS is available.');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  /* ── One-Click state ── */
  const [oneClickActive, setOneClickActive] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [oneClickStatus, setOneClickStatus] = useState('');
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const oneClickAborted = useRef(false);
  const locationWatchRef = useRef<number | null>(null);
  const locationRequestRef = useRef(0);

  /* ── Auto-detect GPS on mount ── */
  useEffect(() => {
    detectGPS();
    api.get<Hospital[]>('/hospitals/verified')
      .then((res) => setHospitals(res.data))
      .catch(() => setHospitals([]));

    return () => {
      if (locationWatchRef.current !== null) navigator.geolocation?.clearWatch(locationWatchRef.current);
    };
  }, []);

  const clearLocationWatch = () => {
    if (locationWatchRef.current !== null) {
      navigator.geolocation?.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    }
  };

  const detectGPS = () => {
    if (!navigator.geolocation) {
      setLocationMode('SAVED');
      setGpsMessage('This browser does not support location services. You can still submit using the saved location.');
      return;
    }
    const requestId = ++locationRequestRef.current;
    clearLocationWatch();
    setLocationMode('LOCATING');
    setGpsLocked(false);
    setGpsMessage('Requesting your device location…');

    const usePosition = (pos: GeolocationPosition) => {
      if (requestId !== locationRequestRef.current) return;
      const nextLat = pos.coords.latitude;
      const nextLng = pos.coords.longitude;
      const accuracy = Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy) : null;
      setLat(nextLat);
      setLng(nextLng);
      setAddress(`Current location — ${nextLat.toFixed(4)}° N, ${nextLng.toFixed(4)}° E`);
      setGpsAccuracy(accuracy);
      setLocationUpdatedAt(new Date());
      setGpsLocked(true);
      setLocationMode('GPS');
      setGpsMessage(accuracy ? `Live GPS locked within approximately ${accuracy} m.` : 'Live GPS location locked.');
    };

    const useError = (positionError: GeolocationPositionError) => {
      if (requestId !== locationRequestRef.current) return;
      setGpsLocked(false);
      setLocationMode('SAVED');
      setGpsAccuracy(null);
      setGpsMessage(positionError.code === positionError.PERMISSION_DENIED
        ? 'Location permission was denied. You can choose the incident pin manually or use the saved location.'
        : 'Could not determine your location. Try again or adjust the incident pin manually.');
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        usePosition(pos);
        locationWatchRef.current = navigator.geolocation.watchPosition(usePosition, () => {
          if (requestId === locationRequestRef.current) {
            setGpsMessage('Using your last GPS fix. Tap refresh to try for a newer location.');
          }
        }, { enableHighAccuracy: true, maximumAge: 15000 });
      },
      useError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const useManualLocation = () => {
    locationRequestRef.current += 1;
    clearLocationWatch();
    setGpsLocked(false);
    setLocationMode('MANUAL');
    setGpsAccuracy(null);
    setGpsMessage('Manual incident pin selected. Check the coordinates and add a landmark or address below.');
  };

  const updateManualCoordinate = (axis: 'lat' | 'lng', value: string) => {
    const coordinate = Number(value);
    const valid = Number.isFinite(coordinate) && (axis === 'lat' ? Math.abs(coordinate) <= 90 : Math.abs(coordinate) <= 180);
    if (!valid) return;
    if (axis === 'lat') setLat(coordinate);
    else setLng(coordinate);
    setLocationUpdatedAt(new Date());
  };

  const distanceInKm = (hospital: Hospital) => {
    const radius = 6371;
    const toRadians = (value: number) => value * Math.PI / 180;
    const latDelta = toRadians(hospital.latitude - lat);
    const lngDelta = toRadians(hospital.longitude - lng);
    const a = Math.sin(latDelta / 2) ** 2
      + Math.cos(toRadians(lat)) * Math.cos(toRadians(hospital.latitude)) * Math.sin(lngDelta / 2) ** 2;
    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const nearbyHospitals = hospitals
    .map((hospital) => ({ hospital, distance: distanceInKm(hospital) }))
    .sort((a, b) => a.distance - b.distance);
  const nearestHospital = nearbyHospitals[0];
  const incidentLocation: MapLocation = {
    latitude: lat,
    longitude: lng,
    label: gpsLocked ? 'Your current location' : 'Incident location',
    detail: `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`,
  };

  /* ─────────────────────────────────────────────────
     SUBMIT — sends emergency to backend & redirects
  ───────────────────────────────────────────────── */
  const submitEmergency = async (opts?: {
    overrideName?: string;
    overrideAge?: string;
    overrideCondition?: string;
    overridePriority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    overrideMode?: 'SELF_TRANSPORT' | 'AMBULANCE';
  }) => {
    setError('');
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      setError('Please enter a valid incident location before submitting.');
      return;
    }
    setSubmitting(true);
    const payload = {
      patient_name: opts?.overrideName || name || 'Unknown Patient',
      patient_age: parseInt(opts?.overrideAge || age) || undefined,
      transport_mode: opts?.overrideMode || mode,
      condition: opts?.overrideCondition || what || 'Emergency — details pending',
      priority: opts?.overridePriority || priority,
      requirements: 'General Emergency',
      latitude: lat,
      longitude: lng,
      address,
    };
    try {
      const res = await api.post('/emergency/new', payload);
      localStorage.setItem('medlink_current_case_id', res.data.id.toString());
      router.push(`/user/hospitals?case_id=${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not submit emergency. Please try again.');
      setSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!what.trim()) { setError('Please describe what happened.'); return; }
    submitEmergency();
  };

  /* ─────────────────────────────────────────────────
     ONE-CLICK SYSTEM
     Countdown 3 → 2 → 1 → auto-submit with GPS
     User can cancel during countdown.
  ───────────────────────────────────────────────── */
  const startOneClick = () => {
    oneClickAborted.current = false;
    setOneClickActive(true);
    setCountdown(3);
    setOneClickStatus('Locking GPS coordinates...');
    detectGPS();

    let n = 3;
    countdownRef.current = setInterval(() => {
      if (oneClickAborted.current) {
        clearInterval(countdownRef.current!);
        setOneClickActive(false);
        setOneClickStatus('');
        return;
      }
      n -= 1;
      setCountdown(n);
      if (n === 2) setOneClickStatus('Broadcasting to nearby hospitals...');
      if (n === 1) setOneClickStatus('Submitting emergency now...');
      if (n <= 0) {
        clearInterval(countdownRef.current!);
        setOneClickStatus('');
        // Auto-submit with defaults
        submitEmergency({
          overrideName: 'Anonymous (One-Click)',
          overrideAge: '',
          overrideCondition: 'EMERGENCY — One-Click Alert. Exact details unknown. Patient may be unable to speak.',
          overridePriority: 'HIGH',
          overrideMode: 'AMBULANCE',
        });
      }
    }, 1000);
  };

  const cancelOneClick = () => {
    oneClickAborted.current = true;
    if (countdownRef.current) clearInterval(countdownRef.current);
    setOneClickActive(false);
    setCountdown(3);
    setOneClickStatus('');
  };

  /* ─────────────────────── JSX ─────────────────── */
  return (
    <div className="min-h-screen bg-[#0d1117]">

      {/* ══════ ONE-CLICK BANNER ══════ */}
      <div className="bg-[#1a0f0f] border-b border-sos-400/30 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          {!oneClickActive ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={15} className="text-sos-300 fill-sos-300" />
                  <span className="text-sm font-bold text-white">ONE-CLICK EMERGENCY SYSTEM</span>
                  <span className="badge-red text-[10px] px-2 py-0.5 rounded font-mono font-bold">NO FORM REQUIRED</span>
                </div>
                <p className="text-[11px] text-[#8b949e] leading-snug max-w-xl">
                  Can't talk? Injured? Can't type? Press the button — MedLink instantly grabs your GPS,
                  alerts all nearby verified hospitals, and dispatches an ambulance. <strong className="text-sos-300">Zero form. Zero wait.</strong>
                </p>
              </div>
              <button
                onClick={startOneClick}
                className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-lg text-white font-black text-sm tracking-wide shadow-glow-red border border-sos-400 animate-glow"
                style={{ background: 'linear-gradient(135deg,#e53e3e 0%,#c53030 100%)' }}
              >
                <Siren size={18} className="fill-white" />
                ONE-CLICK SOS
              </button>
            </div>
          ) : (
            /* ── Countdown active ── */
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-4 border-sos-400 flex items-center justify-center shrink-0 animate-glow">
                    <Countdown n={countdown} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-sos-300" />
                      {oneClickStatus || 'Preparing emergency request...'}
                    </div>
                    <div className="text-xs text-[#8b949e] mt-0.5">
                      Submitting with: <strong className="text-ok-400">GPS Location</strong> + <strong className="text-sos-300">Ambulance Dispatch</strong>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={cancelOneClick}
                className="shrink-0 px-5 py-2.5 rounded border border-[#30363d] bg-[#21262d] text-[#8b949e] hover:text-white text-xs font-semibold transition-colors"
              >
                ✕ Cancel (I can fill the form)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══════ HERO BANNER ══════ */}
      <div className="bg-[#161b22] border-b border-[#21262d] py-7 px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#30363d] bg-[#21262d] text-[11px] text-[#8b949e] font-mono mb-3">
          ✦ GUIDED EMERGENCY ASSISTANCE — OR JUST HIT ONE-CLICK ABOVE
        </div>
        <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Help is already standing by.</h1>
        <p className="text-[#8b949e] text-sm max-w-lg mx-auto">
          Fill in 3 quick details below — or use the One-Click SOS above if you cannot type.
        </p>

        {/* Step progress */}
        <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
          {[
            { n: 1, label: 'Transport Mode' },
            { n: 2, label: 'Severity' },
            { n: 3, label: 'Patient Info' },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${i === 0 ? 'border-sos-400/50 bg-sos-400/10' : 'border-[#30363d] bg-[#21262d]'}`}>
                <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${i === 0 ? 'bg-sos-400 text-white' : 'bg-[#30363d] text-[#6e7681]'}`}>{s.n}</span>
                <span className={`text-[11px] font-semibold ${i === 0 ? 'text-sos-300' : 'text-[#8b949e]'}`}>{s.label}</span>
              </div>
              {i < 2 && <div className="w-4 h-px bg-[#30363d]" />}
            </div>
          ))}
        </div>
      </div>

      {/* ══════ MAIN FORM ══════ */}
      <form onSubmit={handleFormSubmit}>
        <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* LEFT — form steps */}
          <div className="lg:col-span-2 space-y-4">

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg border border-sos-400/40 bg-sos-400/10 text-sos-300 text-xs">
                ⚠ {error}
              </div>
            )}

            {/* ── STEP 1 — Transport Mode ── */}
            <div className="v2-card p-5 space-y-3">
              <div className="text-[10px] font-mono text-[#6e7681] uppercase tracking-wider">STEP 1 / HOW WILL YOU ARRIVE?</div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('SELF_TRANSPORT')}
                  className={`p-4 rounded-lg border text-left transition-all relative ${
                    mode === 'SELF_TRANSPORT'
                      ? 'border-ok-400/40 bg-ok-400/8'
                      : 'border-[#21262d] bg-[#161b22] hover:border-[#30363d]'
                  }`}
                >
                  {mode === 'SELF_TRANSPORT' && (
                    <span className="absolute top-2 right-2 text-[9px] font-mono font-bold bg-ok-500 text-white px-1.5 py-0.5 rounded">
                      SELECTED
                    </span>
                  )}
                  <div className={`w-8 h-8 rounded flex items-center justify-center mb-2 ${mode === 'SELF_TRANSPORT' ? 'bg-ok-400/20' : 'bg-[#30363d]'}`}>
                    <Car size={16} className={mode === 'SELF_TRANSPORT' ? 'text-ok-400' : 'text-[#8b949e]'} />
                  </div>
                  <h4 className="text-xs font-bold text-white">Self Transport</h4>
                  <p className="text-[11px] text-[#6e7681] mt-1 leading-snug">Drive or cab. ER staff meet you at arrival bay.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('AMBULANCE')}
                  className={`p-4 rounded-lg border text-left transition-all relative ${
                    mode === 'AMBULANCE'
                      ? 'border-sos-400/40 bg-sos-400/8'
                      : 'border-[#21262d] bg-[#161b22] hover:border-[#30363d]'
                  }`}
                >
                  {mode === 'AMBULANCE' && (
                    <span className="absolute top-2 right-2 text-[9px] font-mono font-bold bg-sos-400 text-white px-1.5 py-0.5 rounded">
                      SELECTED
                    </span>
                  )}
                  <div className={`w-8 h-8 rounded flex items-center justify-center mb-2 ${mode === 'AMBULANCE' ? 'bg-sos-400/20' : 'bg-[#30363d]'}`}>
                    <Ambulance size={16} className={mode === 'AMBULANCE' ? 'text-sos-300' : 'text-[#8b949e]'} />
                  </div>
                  <h4 className="text-xs font-bold text-white">Request Ambulance</h4>
                  <p className="text-[11px] text-[#6e7681] mt-1 leading-snug">ALS unit dispatched with paramedic + defibrillator.</p>
                  {mode === 'AMBULANCE' && (
                    <p className="text-[10px] text-sos-300 mt-1.5 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-sos-400 animate-pulse-dot inline-block" />
                      Nearest unit ~6 min away
                    </p>
                  )}
                </button>
              </div>
            </div>

            {/* ── STEP 2 — Severity ── */}
            <div className="v2-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-mono text-[#6e7681] uppercase tracking-wider">STEP 2 / HOW URGENT?</div>
                <span className="badge-red text-[10px] font-mono px-2 py-0.5 rounded">TRIAGE AI</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SEVERITY.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setPriority(s.id as any)}
                    className={`p-3 rounded-lg border text-left transition-all ${priority === s.id ? s.color : 'border-[#21262d] bg-[#161b22] hover:border-[#30363d]'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${priority === s.id ? s.dot : 'bg-[#484f58]'}`} />
                      <span className="text-[10px] font-mono text-[#6e7681]">{s.sub}</span>
                    </div>
                    <div className="text-xs font-bold text-white">{s.label}</div>
                    <div className="text-[10px] text-[#6e7681] mt-0.5 leading-snug">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── STEP 3 — Patient Info (simplified) ── */}
            <div className="v2-card p-5 space-y-4">
              <div className="text-[10px] font-mono text-[#6e7681] uppercase tracking-wider">STEP 3 / PATIENT INFORMATION</div>
              <p className="text-[11px] text-[#8b949e] -mt-2">Just 3 fields. That's all we need to alert the right hospital.</p>

              {/* Name + Age */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-[#6e7681] uppercase flex items-center gap-1 mb-1">
                    <User size={11} /> Patient Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="v2-input"
                  />
                  <span className="text-[10px] text-[#484f58] mt-0.5 block">Optional — leave blank if unknown</span>
                </div>
                <div>
                  <label className="text-[11px] font-mono text-[#6e7681] uppercase flex items-center gap-1 mb-1">
                    <Hash size={11} /> Age (Years)
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 54"
                    min="0"
                    max="120"
                    className="v2-input"
                  />
                  <span className="text-[10px] text-[#484f58] mt-0.5 block">Optional</span>
                </div>
              </div>

              {/* What happened — the key field */}
              <div>
                <label className="text-[11px] font-mono text-[#6e7681] uppercase flex items-center gap-1 mb-1">
                  <FileText size={11} /> What happened? <span className="text-sos-300 ml-1">*</span>
                </label>
                <textarea
                  value={what}
                  onChange={(e) => setWhat(e.target.value)}
                  placeholder="Describe what happened in plain words — e.g. 'He collapsed suddenly. Not breathing properly. Severe chest pain.'"
                  rows={3}
                  required
                  className="v2-input resize-none leading-relaxed"
                />
                <span className="text-[10px] text-[#484f58] mt-0.5 block">Required — use your own words, no medical terms needed</span>
              </div>

              {/* Quick tags */}
              <div>
                <div className="text-[10px] font-mono text-[#484f58] uppercase mb-1.5">Quick Select (tap to auto-fill)</div>
                <div className="flex flex-wrap gap-1.5">
                  {CONDITION_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setWhat(what ? `${what}, ${tag}` : tag)}
                      className={`text-[11px] px-2.5 py-1 rounded border font-mono transition-all ${
                        what.includes(tag)
                          ? 'border-sos-400/50 bg-sos-400/10 text-sos-300'
                          : 'border-[#30363d] bg-[#21262d] text-[#8b949e] hover:border-sos-400/30 hover:text-sos-300'
                      }`}
                    >
                      {what.includes(tag) ? `✓ ${tag}` : tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ══ RIGHT — Context Panel ══ */}
          <div className="space-y-4">

            {/* GPS Card */}
            <div className="v2-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-mono text-[#6e7681] uppercase tracking-wider">INCIDENT LOCATION</div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono flex items-center gap-1 ${
                  locationMode === 'GPS' ? 'badge-green' : locationMode === 'MANUAL' ? 'bg-blue-400/10 text-blue-300 border border-blue-400/20' : 'badge-amber'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                    locationMode === 'GPS' ? 'bg-ok-400 animate-pulse-dot' : locationMode === 'MANUAL' ? 'bg-blue-300' : 'bg-warn-400 animate-pulse-dot'
                  }`} />
                  {locationMode === 'GPS' ? 'GPS LIVE' : locationMode === 'LOCATING' ? 'LOCATING' : locationMode === 'MANUAL' ? 'MANUAL PIN' : 'SAVED PIN'}
                </span>
              </div>

              <OpenStreetMap location={incidentLocation} className="h-40 rounded-lg" />

              <div className={`text-[10px] font-mono flex items-center gap-1.5 ${gpsLocked ? 'text-ok-400' : locationMode === 'MANUAL' ? 'text-blue-300' : 'text-warn-300'}`}>
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${gpsLocked ? 'bg-ok-400 animate-pulse-dot' : locationMode === 'MANUAL' ? 'bg-blue-300' : 'bg-warn-400'}`} />
                {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
              </div>
              <div className="text-[11px] text-[#8b949e]">{address}</div>
              <p className={`text-[10px] leading-snug ${gpsLocked ? 'text-ok-400' : 'text-warn-300'}`}>{gpsMessage}</p>
              {locationUpdatedAt && (
                <p className="text-[10px] text-[#6e7681] -mt-1">
                  Updated {locationUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  {gpsAccuracy ? ` · accuracy ±${gpsAccuracy} m` : ''}
                </p>
              )}

              {locationMode === 'MANUAL' ? (
                <div className="space-y-2 border-t border-[#21262d] pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[10px] text-[#6e7681]">
                      Latitude
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="-90"
                        max="90"
                        value={lat}
                        onChange={(event) => updateManualCoordinate('lat', event.target.value)}
                        className="v2-input mt-1 py-1.5 text-xs"
                      />
                    </label>
                    <label className="text-[10px] text-[#6e7681]">
                      Longitude
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="-180"
                        max="180"
                        value={lng}
                        onChange={(event) => updateManualCoordinate('lng', event.target.value)}
                        className="v2-input mt-1 py-1.5 text-xs"
                      />
                    </label>
                  </div>
                  <label className="block text-[10px] text-[#6e7681]">
                    Landmark or address
                    <input
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder="e.g. Main entrance, City Hospital"
                      className="v2-input mt-1 py-1.5 text-xs"
                    />
                  </label>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={detectGPS}
                  className="py-2 rounded border border-[#30363d] bg-[#21262d] hover:border-ok-400/40 hover:bg-ok-400/8 text-ok-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Crosshair size={13} /> {locationMode === 'LOCATING' ? 'Locating…' : 'Refresh GPS'}
                </button>
                <button
                  type="button"
                  onClick={useManualLocation}
                  className="py-2 rounded border border-[#30363d] bg-[#21262d] hover:border-blue-400/40 hover:bg-blue-400/8 text-blue-300 text-xs font-semibold transition-all"
                >
                  Adjust pin
                </button>
              </div>
            </div>

            {/* Nearby stats */}
            <div className="v2-card p-4 space-y-3">
              <div className="text-[10px] font-mono text-warn-300 uppercase">NEARBY FACILITIES</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-mono text-[#484f58] uppercase">Ready Hospitals</div>
                  <div className="text-2xl font-bold text-white font-mono">{nearbyHospitals.filter(({ distance }) => distance <= 25).length}</div>
                  <div className="text-[10px] text-[#6e7681]">Within 25 km</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-[#484f58] uppercase">Est. Response</div>
                  <div className="text-2xl font-bold text-sos-300 font-mono">{nearestHospital ? `${Math.max(4, Math.round(nearestHospital.distance * 2 + 3))}m` : '—'}</div>
                  <div className="text-[10px] text-[#6e7681]">Nearest facility</div>
                </div>
              </div>
              {nearestHospital && (
                <p className="text-[10px] text-[#8b949e] border-t border-[#21262d] pt-2">
                  Closest verified facility: <span className="text-white font-semibold">{nearestHospital.hospital.name}</span> · {nearestHospital.distance.toFixed(1)} km away
                </p>
              )}

              {/* SUBMIT button — big and prominent */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-lg text-white font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{
                  background: submitting ? '#4b1a1a' : 'linear-gradient(135deg,#e53e3e 0%,#c53030 100%)',
                  boxShadow: submitting ? 'none' : '0 0 18px rgba(229,62,62,0.5)',
                }}
              >
                {submitting
                  ? <><Loader2 size={16} className="animate-spin" /> Broadcasting to Hospitals...</>
                  : <><Shield size={16} /> SUBMIT — FIND FASTEST HOSPITAL</>
                }
              </button>
              <p className="text-[10px] text-[#6e7681] text-center leading-snug">
                Broadcasts your emergency to all verified hospitals within range simultaneously.
              </p>
            </div>

            {/* Pre-Arrival Protocol */}
            <div className="v2-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-ok-400/15 flex items-center justify-center">
                  <HeartPulse size={13} className="text-ok-400" />
                </div>
                <span className="text-xs font-bold text-white">Doctor Pre-Arrival Protocol</span>
              </div>
              <p className="text-[11px] text-[#8b949e] leading-snug">
                Once submitted, on-call trauma specialists are notified before you arrive. No extra steps needed.
              </p>
              <ul className="space-y-1 text-[11px] text-[#6e7681]">
                <li className="flex items-center gap-1.5"><CheckCircle2 size={11} className="text-ok-400 shrink-0" /> ER bay pre-assigned</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 size={11} className="text-ok-400 shrink-0" /> Trauma team alerted</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 size={11} className="text-ok-400 shrink-0" /> Real-time hospital acceptance</li>
              </ul>
            </div>

            {/* One-Click reminder */}
            <div className="v2-card p-4 border border-sos-400/20 space-y-2">
              <div className="text-[10px] font-mono text-sos-300 font-bold uppercase">Can't fill the form?</div>
              <p className="text-[11px] text-[#8b949e] leading-snug">
                Use the <strong className="text-white">ONE-CLICK SOS</strong> at the top of this page. No typing required — just one button press.
              </p>
              <button
                type="button"
                onClick={startOneClick}
                className="w-full py-2 rounded border border-sos-400/40 bg-sos-400/10 text-sos-300 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-sos-400/20 transition-colors"
              >
                <Zap size={13} className="fill-sos-300" /> Activate One-Click SOS
              </button>
            </div>
          </div>
        </div>

        {/* ══ Bottom sticky bar ══ */}
        <div className="border-t border-[#21262d] bg-[#161b22] px-6 py-3 flex items-center justify-between gap-4">
          <div className="text-[11px] font-mono text-[#484f58] hidden sm:block">
            NEAREST FACILITIES · <span className="text-ok-400">Auto-polling verified hospitals in real time</span>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="sos-btn flex items-center gap-2 px-6 py-2.5 text-sm ml-auto"
          >
            {submitting
              ? <><Loader2 size={15} className="animate-spin" /> Broadcasting...</>
              : <><Radio size={15} className="animate-pulse-dot" /> SUBMIT EMERGENCY <ArrowRight size={15} /></>
            }
          </button>
        </div>
      </form>
    </div>
  );
}
