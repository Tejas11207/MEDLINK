"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, Navigation, Clock, Activity,
  Radio, ChevronRight, ArrowRight, HeartPulse
} from 'lucide-react';
import api from '@/lib/api';
import { formatEnum } from '@/lib/format';
import { EmergencyCase } from '@/types';

export default function UserDashboard() {
  const [activeCase, setActiveCase] = useState<EmergencyCase | null>(null);
  const [recentCases, setRecentCases] = useState<EmergencyCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [activeRes, historyRes] = await Promise.all([
        api.get('/emergency/active/current'),
        api.get('/emergency/history/all'),
      ]);
      setActiveCase(activeRes.data);
      setRecentCases(historyRes.data.slice(0, 5));
    } catch {}
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-sos-300 font-semibold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-sos-400 animate-pulse-dot inline-block" />
            User Emergency Portal
          </div>
          <h1 className="text-2xl font-bold text-white">Emergency Response Overview</h1>
          <p className="text-xs text-[#6e7681] mt-0.5">Manage ongoing emergency coordination and review hospital responses</p>
        </div>
        <Link
          href="/user/emergency/new"
          className="sos-btn flex items-center gap-2 px-5 py-2.5 text-sm shrink-0"
        >
          <AlertTriangle size={15} className="shrink-0" />
          CREATE EMERGENCY
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Active Case */}
      {loading ? (
        <div className="v2-card p-8 text-center text-[#6e7681] text-xs font-mono">
          <Radio className="w-6 h-6 animate-spin mx-auto mb-2 text-sos-400" />
          Loading emergency data...
        </div>
      ) : activeCase ? (
        <div className="v2-card p-5 space-y-4 border-l-4 border-sos-400">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#21262d]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sos-400/10 border border-sos-400/25 flex items-center justify-center font-mono font-bold text-xs text-sos-300">
                {activeCase.case_code}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{activeCase.condition}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    activeCase.priority === 'CRITICAL' ? 'badge-red' : 'badge-amber'
                  }`}>
                    {formatEnum(activeCase.priority)}
                  </span>
                </h3>
                <p className="text-xs text-[#6e7681]">
                  Patient: <strong className="text-[#8b949e]">{activeCase.patient_name}</strong> · Mode: <span className="font-mono text-sos-300">{formatEnum(activeCase.transport_mode)}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[10px] font-mono text-[#484f58] block uppercase">Status</span>
                <span className="text-xs font-bold text-sos-300 font-mono">{formatEnum(activeCase.status)}</span>
              </div>
              <Link
                href={activeCase.status === 'HOSPITAL_SELECTED' || activeCase.status === 'EN_ROUTE'
                  ? `/user/navigation?case_id=${activeCase.id}`
                  : `/user/hospitals?case_id=${activeCase.id}`
                }
                className="py-2 px-3 rounded bg-sos-400 hover:bg-sos-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                Track Route <ChevronRight size={13} />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Responses', value: `${activeCase.responses?.filter(r => r.response === 'ACCEPTED').length || 0} Accepted / ${activeCase.responses?.length || 0} Total` },
              { label: 'Requirements', value: activeCase.requirements || 'General' },
              { label: 'Vitals', value: activeCase.vitals || 'Recorded', accent: true },
              { label: 'Destination', value: activeCase.selected_hospital?.name || 'Evaluating...', ok: true },
            ].map(m => (
              <div key={m.label} className="p-3 rounded-lg bg-[#21262d] border border-[#30363d]">
                <span className="text-[10px] font-mono text-[#484f58] uppercase block">{m.label}</span>
                <span className={`text-xs font-bold mt-0.5 block ${m.accent ? 'text-sos-300' : m.ok ? 'text-ok-400' : 'text-white'}`}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="v2-card p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#21262d] flex items-center justify-center mx-auto">
            <Activity size={22} className="text-[#484f58]" />
          </div>
          <h3 className="text-sm font-bold text-white">No Active Emergency Case</h3>
          <p className="text-xs text-[#6e7681] max-w-sm mx-auto leading-relaxed">
            If a medical situation arises, click Create Emergency to broadcast your case to nearby verified hospitals.
          </p>
          <Link href="/user/emergency/new" className="inline-flex items-center gap-1.5 py-2 px-4 rounded bg-sos-400 hover:bg-sos-500 text-white text-xs font-semibold transition-colors">
            <AlertTriangle size={14} /> Create Emergency Case
          </Link>
        </div>
      )}

      {/* Recent Cases */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock size={14} className="text-[#484f58]" /> Recent Emergency Cases
          </h2>
          <Link href="/user/history" className="text-xs text-sos-300 hover:underline font-semibold">View History →</Link>
        </div>
        <div className="space-y-2">
          {recentCases.length === 0 && !loading ? (
            <div className="v2-card p-6 text-center text-xs text-[#6e7681]">No case history yet.</div>
          ) : (
            recentCases.map(c => (
              <div key={c.id} className="v2-card v2-card-hover p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#21262d] border border-[#30363d] text-[#8b949e] flex items-center justify-center font-mono font-semibold text-xs shrink-0">
                    {c.case_code.split('-')[1] || c.id}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{c.patient_name} — {c.condition}</h4>
                    <p className="text-[11px] text-[#484f58] font-mono">
                      {formatEnum(c.transport_mode)} · {formatEnum(c.priority)} · {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${c.status === 'COMPLETED' ? 'badge-green' : 'badge-subtle'}`}>
                    {formatEnum(c.status)}
                  </span>
                  <Link href={`/user/hospitals?case_id=${c.id}`} className="p-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] transition-colors">
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
