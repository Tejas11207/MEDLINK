"use client";
import { useEffect, useState } from 'react';
import { ShieldCheck, Hospital as HospitalIcon, CheckCircle2, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { Hospital } from '@/types';

export default function AdminHospitalsPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchHospitals(); }, []);

  const fetchHospitals = async () => {
    try {
      const res = await api.get('/admin/hospitals');
      setHospitals(res.data);
    } catch {}
    finally { setLoading(false); }
  };

  const toggleVerification = async (id: number, verify: boolean) => {
    try {
      await api.patch(`/admin/hospitals/${id}/verify?verify=${verify}`);
      fetchHospitals();
    } catch {}
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-info-300 font-semibold uppercase tracking-wider mb-1">
          <ShieldCheck size={13} /> Hospital Licensing & Verification Portal
        </div>
        <h1 className="text-2xl font-bold text-white">Hospital Network Licensing</h1>
        <p className="text-xs text-[#6e7681] mt-0.5">Verify medical licenses to allow emergency broadcast intake in the MedLink network.</p>
      </div>

      <div className="v2-card p-5 space-y-3">
        {loading ? (
          <div className="py-8 text-center text-xs text-[#6e7681] font-mono">Loading hospitals...</div>
        ) : (
          hospitals.map(h => (
            <div key={h.id} className="p-4 rounded-lg bg-[#21262d] border border-[#30363d] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#30363d] text-[#8b949e] shrink-0">
                  <HospitalIcon size={18} />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-white">{h.name}</h4>
                  <p className="text-[11px] text-[#6e7681]">{h.address}</p>
                  <p className="text-[11px] font-mono text-[#484f58]">Specialties: {h.capabilities}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <div className="text-right font-mono">
                  <span className={`text-[11px] font-bold ${h.verified ? 'badge-green' : 'badge-amber'} px-2 py-0.5 rounded block`}>
                    {h.verified ? '✓ VERIFIED' : 'PENDING'}
                  </span>
                  <span className="text-[10px] text-[#484f58] block mt-1">ICU: {h.available_icu} beds</span>
                </div>
                {h.verified ? (
                  <button
                    onClick={() => toggleVerification(h.id, false)}
                    className="py-1.5 px-3 rounded border border-sos-400/30 bg-sos-400/10 hover:bg-sos-400/20 text-sos-300 text-xs font-semibold transition-all"
                  >
                    Suspend
                  </button>
                ) : (
                  <button
                    onClick={() => toggleVerification(h.id, true)}
                    className="py-1.5 px-4 rounded bg-ok-500 hover:bg-ok-400 text-white text-xs font-semibold shadow-glow-green/20 transition-all"
                  >
                    Verify & License
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
