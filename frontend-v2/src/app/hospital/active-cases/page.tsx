"use client";
import { useEffect, useState } from 'react';
import { Activity, Clock, CheckCircle2, XCircle, Radio, MapPin } from 'lucide-react';
import api from '@/lib/api';
import { EmergencyCase } from '@/types';
import { formatEnum } from '@/lib/format';

export default function ActiveCasesPage() {
  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const hospId = localStorage.getItem('medlink_hospital_id') || '2';
        const res = await api.get(`/hospitals/${hospId}/incoming`);
        setCases(res.data);
      } catch {}
      finally { setLoading(false); }
    };
    fetchCases();
    const interval = setInterval(fetchCases, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-ok-400 font-semibold uppercase tracking-wider mb-1">
          <Activity size={13} /> Active Cases Monitor
        </div>
        <h1 className="text-2xl font-bold text-white">Incoming Cases Stream</h1>
        <p className="text-xs text-[#6e7681] mt-0.5">All cases currently in range of this ER facility</p>
      </div>

      {loading ? (
        <div className="v2-card p-8 text-center text-xs text-[#6e7681] font-mono">
          <Radio className="w-6 h-6 animate-spin mx-auto mb-2 text-sos-400" />
          Syncing case stream...
        </div>
      ) : cases.length === 0 ? (
        <div className="v2-card p-10 text-center space-y-2">
          <CheckCircle2 size={28} className="mx-auto text-ok-400" />
          <h3 className="text-sm font-bold text-white">No Active Cases</h3>
          <p className="text-xs text-[#6e7681]">Your ER intake queue is clear.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map(c => (
            <div key={c.id} className="v2-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-sos-400/10 border border-sos-400/25 text-sos-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                  {c.case_code.split('-')[1] || c.id}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-white">{c.patient_name}</h4>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${c.priority === 'CRITICAL' ? 'badge-red' : 'badge-amber'}`}>
                      {formatEnum(c.priority)}
                    </span>
                  </div>
                  <p className="text-xs text-sos-300">{c.condition}</p>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-[#484f58]">
                    <Clock size={10} /> {new Date(c.created_at).toLocaleTimeString()}
                    <MapPin size={10} /> {c.address || 'Bengaluru'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="badge-amber text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  {formatEnum(c.transport_mode)}
                </span>
                <span className="badge-subtle text-[10px] px-2 py-0.5 rounded font-mono">
                  {formatEnum(c.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
