"use client";
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Radio, CheckCircle2, XCircle, Clock, Navigation, Shield,
  Hospital as HospitalIcon, MapPin, ArrowRight, AlertTriangle, Zap, RefreshCw
} from 'lucide-react';
import api from '@/lib/api';
import OpenStreetMap, { MapLocation } from '@/components/OpenStreetMap';
import { EmergencyCase, DecisionEngineResult, Hospital } from '@/types';

export default function HospitalDiscoveryPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-[#6e7681] font-mono text-xs"><span className="animate-pulse">Connecting to emergency dispatch stream...</span></div>}>
      <HospitalDiscoveryInner />
    </Suspense>
  );
}

function HospitalDiscoveryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseIdParam = searchParams.get('case_id');
  const [currentCase, setCurrentCase] = useState<EmergencyCase | null>(null);
  const [decision, setDecision] = useState<DecisionEngineResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [mappedHospitalId, setMappedHospitalId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [caseIdParam]);

  useEffect(() => {
    api.get<Hospital[]>('/hospitals/verified')
      .then((res) => setHospitals(res.data))
      .catch(() => setHospitals([]));
  }, []);

  useEffect(() => {
    if (decision?.recommended_hospital) setMappedHospitalId(decision.recommended_hospital.hospital_id);
  }, [decision?.recommended_hospital?.hospital_id]);

  const fetchData = async () => {
    try {
      let targetId = caseIdParam || localStorage.getItem('medlink_current_case_id');
      let caseData: EmergencyCase;
      if (targetId) {
        const res = await api.get(`/emergency/${targetId}`);
        caseData = res.data;
      } else {
        const activeRes = await api.get('/emergency/active/current');
        caseData = activeRes.data;
      }
      if (caseData) {
        setCurrentCase(caseData);
        const recRes = await api.get(`/emergency/${caseData.id}/recommendation`);
        setDecision(recRes.data);
      }
    } catch {}
    finally { setLoading(false); }
  };

  const handleSelect = async (hospitalId: number) => {
    if (!currentCase) return;
    setSelecting(true);
    try {
      await api.post(`/emergency/${currentCase.id}/select-hospital`, { hospital_id: hospitalId });
      router.push(`/user/navigation?case_id=${currentCase.id}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to select hospital.');
    } finally { setSelecting(false); }
  };

  if (loading && !currentCase) return (
    <div className="p-12 text-center text-[#6e7681] font-mono space-y-3">
      <Radio className="w-8 h-8 animate-spin mx-auto text-sos-400" />
      <p className="text-xs">Connecting to emergency dispatch stream...</p>
    </div>
  );

  if (!currentCase) return (
    <div className="p-12 text-center space-y-4 max-w-md mx-auto">
      <AlertTriangle className="w-10 h-10 mx-auto text-sos-400" />
      <h2 className="text-base font-bold text-white">No Active Emergency Found</h2>
      <p className="text-xs text-[#6e7681]">Create a new emergency case to start hospital discovery.</p>
      <Link href="/user/emergency/new" className="inline-block py-2 px-5 rounded bg-sos-400 text-white text-xs font-semibold">Create Emergency</Link>
    </div>
  );

  const recommended = decision?.recommended_hospital;
  const mappedHospital = hospitals.find((hospital) => hospital.id === mappedHospitalId);
  const mappedLocation: MapLocation | null = mappedHospital ? {
    latitude: mappedHospital.latitude,
    longitude: mappedHospital.longitude,
    label: mappedHospital.name,
    detail: mappedHospital.address,
  } : null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Case Header */}
      <div className="v2-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="badge-red px-2 py-0.5 rounded font-mono font-bold">{currentCase.case_code}</span>
            <span className="text-[#6e7681] font-mono">· {currentCase.transport_mode}</span>
            <span className="text-ok-400 font-mono flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-ok-400 animate-pulse-dot inline-block" />
              Broadcast Active
            </span>
          </div>
          <h1 className="text-lg font-bold text-white">
            {currentCase.patient_name} — <span className="text-sos-300">{currentCase.condition}</span>
          </h1>
          <p className="text-xs text-[#6e7681]">
            Required: <strong className="text-[#8b949e]">{currentCase.requirements}</strong> · Priority: <span className="font-bold text-sos-300">{currentCase.priority}</span>
          </p>
        </div>
        <button onClick={fetchData} className="p-2 rounded border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] flex items-center gap-1 text-xs font-semibold transition-colors shrink-0">
          <RefreshCw size={13} /> Sync
        </button>
      </div>

      {/* Recommended Hero */}
      {recommended ? (
        <div className="v2-card p-5 space-y-4 border border-sos-400/40 shadow-glow-red/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sos-400 text-white text-[11px] font-semibold font-mono">
              <Zap size={12} className="fill-white" /> RECOMMENDED FASTEST ACCEPTED OPTION
            </span>
            <span className="text-2xl font-extrabold text-sos-300 font-mono">
              {recommended.eta} <span className="text-xs text-[#6e7681] font-normal">MIN ETA</span>
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <HospitalIcon size={20} className="text-sos-300 shrink-0" />
                {recommended.hospital_name}
              </h2>
              <p className="text-xs text-[#8b949e] flex items-center gap-1.5">
                <MapPin size={12} className="text-[#484f58]" />
                {recommended.hospital_address} · <strong>{recommended.distance_km} km away</strong>
              </p>
              <p className="text-xs text-ok-400 font-semibold">
                ✓ Accepted by ER Desk · {recommended.available_icu} ICU beds available
              </p>
            </div>
            <button
              onClick={() => handleSelect(recommended.hospital_id)}
              disabled={selecting}
              className="sos-btn flex items-center gap-2 px-5 py-2.5 text-sm shrink-0"
            >
              <Navigation size={15} />
              {selecting ? 'Routing...' : 'SELECT & START NAVIGATION'}
              <ArrowRight size={15} />
            </button>
          </div>

          {recommended.explanation?.length > 0 && (
            <div className="p-3 rounded-lg bg-[#21262d] border border-[#30363d] text-xs text-[#8b949e] space-y-1.5">
              <div className="font-mono text-[10px] text-[#484f58] uppercase tracking-wider">Decision Explanation Factors</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {recommended.explanation.map((exp, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 size={11} className="text-ok-400 shrink-0" />
                    <span>{exp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="v2-card p-5 border border-warn-400/20 bg-warn-400/5 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-warn-300">
            <Clock size={14} className="animate-spin" /> Broadcasting to Nearby Verified Hospitals...
          </div>
          <p className="text-xs text-[#8b949e] leading-relaxed">
            Hospitals within range are reviewing the emergency request. As soon as facilities accept, MedLink will calculate real-time ETAs and recommend the fastest destination.
          </p>
        </div>
      )}

      {/* Live hospital locator */}
      {mappedLocation && (
        <div id="hospital-locator" className="v2-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#21262d]">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><MapPin size={14} className="text-sos-300" /> Hospital Locator</h3>
              <p className="text-[11px] text-[#6e7681] mt-0.5">Showing {mappedLocation.label}. Choose any listed facility to locate it on the map.</p>
            </div>
            <span className="text-[10px] font-mono text-ok-400 shrink-0">LIVE MAP</span>
          </div>
          <OpenStreetMap
            location={mappedLocation}
            showDirectionsFrom={{ latitude: currentCase.latitude, longitude: currentCase.longitude }}
            className="h-64 border-x-0 border-b-0"
          />
        </div>
      )}

      {/* All Options */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Radio size={14} className="text-sos-400" /> Nearby Hospital Responses
          </h3>
          <span className="text-xs font-mono text-[#6e7681]">
            {decision?.accepted_count || 0} Accepted · {decision?.rejected_count || 0} Rejected · {decision?.pending_count || 0} Pending
          </span>
        </div>

        <div className="space-y-2">
          {decision?.all_options?.map(opt => (
            <div
              key={opt.hospital_id}
              className={`v2-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-all ${
                opt.is_recommended ? 'border-sos-400/40' :
                opt.response === 'ACCEPTED' ? 'border-ok-400/20' :
                opt.response === 'REJECTED' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                  opt.response === 'ACCEPTED' ? 'bg-ok-400/10 text-ok-400' :
                  opt.response === 'REJECTED' ? 'bg-sos-400/10 text-sos-300' :
                  'bg-[#21262d] text-[#6e7681]'
                }`}>
                  <HospitalIcon size={16} />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-white text-sm">{opt.hospital_name}</h4>
                    {opt.is_recommended && (
                      <span className="match-badge">FASTEST ACCEPTED</span>
                    )}
                    {opt.match_score && (
                      <span className="match-badge">{opt.match_score}% MATCH</span>
                    )}
                  </div>
                  <p className="text-[#6e7681]">{opt.hospital_address} · {opt.distance_km} km</p>
                  {opt.hospital_capabilities && (
                    <p className="font-mono text-[#484f58]">Specialties: <span className="text-[#8b949e]">{opt.hospital_capabilities}</span></p>
                  )}
                  {opt.rejection_reason && (
                    <p className="text-sos-300 font-semibold">Reason: {opt.rejection_reason}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className={`flex items-center gap-1 font-semibold font-mono text-xs ${
                    opt.response === 'ACCEPTED' ? 'text-ok-400' :
                    opt.response === 'REJECTED' ? 'text-sos-300' :
                    'text-warn-300'
                  }`}>
                    {opt.response === 'ACCEPTED' ? <><CheckCircle2 size={12} /> ACCEPTED ({opt.eta}m)</> :
                     opt.response === 'REJECTED' ? <><XCircle size={12} /> REJECTED</> :
                     <><Clock size={12} /> PENDING</>}
                  </div>
                  <span className="text-[10px] text-[#484f58] font-mono block">ICU: {opt.available_icu} beds</span>
                </div>
                {opt.response === 'ACCEPTED' && (
                  <button
                    onClick={() => handleSelect(opt.hospital_id)}
                    disabled={selecting}
                    className="py-1.5 px-3 rounded border border-[#30363d] bg-[#21262d] hover:bg-sos-400 hover:border-sos-400 hover:text-white text-[#8b949e] font-semibold text-xs flex items-center gap-1 transition-all"
                  >
                    Select <ArrowRight size={11} />
                  </button>
                )}
                {hospitals.some((hospital) => hospital.id === opt.hospital_id) && (
                  <button
                    onClick={() => {
                      setMappedHospitalId(opt.hospital_id);
                      document.getElementById('hospital-locator')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="py-1.5 px-3 rounded border border-[#30363d] bg-[#21262d] hover:border-info-400/50 hover:text-info-300 text-[#8b949e] font-semibold text-xs flex items-center gap-1 transition-all"
                  >
                    <MapPin size={11} /> Locate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
