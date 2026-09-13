"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Radio, Activity, Users, ChevronRight, RefreshCw, Shield, Zap } from 'lucide-react';
import api from '@/lib/api';
import { AdminMetrics } from '@/types';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/admin/metrics');
      setMetrics(res.data);
    } catch {}
    finally { setLoading(false); }
  };

  const kpis = [
    { label: 'Active Emergencies', value: metrics?.active_emergencies ?? 0, sub: 'Live Broadcasts', color: 'text-sos-300' },
    { label: 'Verified Hospitals', value: `${metrics?.verified_hospitals ?? 0}/${metrics?.total_hospitals ?? 0}`, sub: 'Licensed Centers', color: 'text-ok-400' },
    { label: 'Cases Today', value: metrics?.cases_today ?? 0, sub: '24h Dispatch Volume', color: 'text-white' },
    { label: 'Avg Response', value: `${metrics?.avg_response_time_minutes ?? 8.4}m`, sub: 'Allocation Speed', color: 'text-info-300' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-info-300 font-semibold uppercase tracking-wider mb-1">
            <Shield size={13} /> State Emergency Surveillance Operations
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Network Command Center</h1>
          <p className="text-xs text-[#6e7681] mt-0.5">Monitor state-wide hospital verifications, active emergency streams, and decision metrics</p>
        </div>
        <button
          onClick={fetchMetrics}
          className="py-2 px-3.5 rounded border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="v2-card p-4 space-y-1">
            <span className="text-[10px] font-mono text-[#484f58] uppercase block">{k.label}</span>
            <div className={`text-2xl font-extrabold font-mono ${k.color}`}>{loading ? '—' : k.value}</div>
            <span className="text-[10px] text-[#484f58] block">{k.sub}</span>
          </div>
        ))}
      </div>

      {/* Action panels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/admin/hospitals" className="v2-card v2-card-hover p-5 flex flex-col gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-info-400/10 border border-info-400/20 text-info-300 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white group-hover:text-info-300 transition-colors">Hospital Verification</h3>
            <ChevronRight size={15} className="text-[#484f58]" />
          </div>
          <p className="text-xs text-[#6e7681] leading-relaxed">Review pending hospital registrations and issue licensed emergency dispatch clearance.</p>
        </Link>

        <Link href="/admin/emergencies" className="v2-card v2-card-hover p-5 flex flex-col gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-sos-400/10 border border-sos-400/20 text-sos-300 flex items-center justify-center">
            <Radio size={20} />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white group-hover:text-sos-300 transition-colors">Live Emergency Feed</h3>
            <ChevronRight size={15} className="text-[#484f58]" />
          </div>
          <p className="text-xs text-[#6e7681] leading-relaxed">Real-time state emergency stream with live hospital acceptances and route status.</p>
        </Link>

        <Link href="/admin/users" className="v2-card v2-card-hover p-5 flex flex-col gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-ok-400/10 border border-ok-400/20 text-ok-400 flex items-center justify-center">
            <Users size={20} />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white group-hover:text-ok-400 transition-colors">User Directory Audit</h3>
            <ChevronRight size={15} className="text-[#484f58]" />
          </div>
          <p className="text-xs text-[#6e7681] leading-relaxed">Audit platform accounts across USER, HOSPITAL, and ADMIN role permissions.</p>
        </Link>
      </div>
    </div>
  );
}
