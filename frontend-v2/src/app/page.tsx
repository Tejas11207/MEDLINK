"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Radio, Shield, Hospital, Users, ArrowRight, Play, Zap, HeartPulse, Siren, Activity } from 'lucide-react';
import { useState } from 'react';
import api from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [simulating, setSimulating] = useState(false);

  const startGoldenPath = async () => {
    try {
      setSimulating(true);
      const res = await api.post('/simulation/golden-path');
      localStorage.setItem('medlink_current_case_id', res.data.id.toString());
      localStorage.setItem('medlink_role', 'USER');
      router.push(`/user/hospitals?case_id=${res.data.id}`);
    } catch {
      router.push('/user/emergency/new');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] flex flex-col">
      {/* Top Bar */}
      <header className="px-6 py-3 border-b border-[#21262d] bg-[#161b22] flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-sos-400 flex items-center justify-center">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold text-white block">MedLink</span>
            <span className="text-[10px] text-[#6e7681] block tracking-wide">Emergency Coordination Network</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login" className="px-3 py-1.5 rounded border border-[#30363d] bg-[#21262d] text-xs text-[#8b949e] hover:text-white font-medium transition-colors">
            Sign In
          </Link>
          <button
            onClick={startGoldenPath}
            disabled={simulating}
            className="sos-btn flex items-center gap-1.5"
          >
            <Siren size={13} />
            <span>{simulating ? 'Starting...' : 'Emergency SOS'}</span>
          </button>
        </div>
      </header>

      {/* Status ticker */}
      <div className="status-ticker py-1 px-6 text-[11px] font-mono text-[#8b949e] flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-ok-400">
          <span className="w-1.5 h-1.5 rounded-full bg-ok-400 animate-pulse-dot inline-block" />
          48 Verified Hospitals Ready (Zero Wait)
        </span>
        <span className="text-[#484f58]">|</span>
        <span>Pre-cleared Trauma Centers</span>
        <span className="text-[#484f58]">|</span>
        <span>Avg Response Time: <span className="text-white">3.1s</span></span>
      </div>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#30363d] bg-[#21262d] text-xs text-sos-300 font-mono mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-sos-400 animate-pulse-dot inline-block" />
          COMFORTING & GUIDED EMERGENCY ASSISTANCE
        </div>

        <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-4 leading-tight">
          Help is already<br />
          <span className="text-sos-300">standing by.</span>
        </h1>

        <p className="text-[#8b949e] text-sm md:text-base max-w-lg mb-10 leading-relaxed">
          Stay calm. Complete these quick details to lock your bed and alert trauma physicians in advance before arrival.
        </p>

        {/* Step progress preview */}
        <div className="flex items-center gap-3 mb-12 flex-wrap justify-center">
          {[
            { n: 1, label: 'Transportation Mode', sub: 'Step 1 of 3' },
            { n: 2, label: 'Urgency & Symptoms', sub: 'Patient Detail 3' },
            { n: 3, label: 'Hospital Broadcast', sub: 'Auto-Receive' },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#30363d] bg-[#161b22]">
                <span className="w-5 h-5 rounded-full bg-[#21262d] border border-[#30363d] text-[10px] font-bold text-[#8b949e] flex items-center justify-center">{s.n}</span>
                <div className="text-left">
                  <div className="text-xs font-semibold text-[#e6edf3]">{s.label}</div>
                  <div className="text-[10px] text-[#6e7681]">{s.sub}</div>
                </div>
              </div>
              {i < 2 && <div className="w-4 h-px bg-[#30363d]" />}
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 justify-center mb-16">
          <button
            onClick={startGoldenPath}
            disabled={simulating}
            className="sos-btn flex items-center gap-2 px-6 py-3 text-sm"
          >
            <Play size={16} className="fill-white" />
            {simulating ? 'Starting Demo...' : 'Start Emergency Demo'}
          </button>
          <Link href="/user/emergency/new" className="px-6 py-3 rounded border border-[#30363d] bg-[#161b22] hover:bg-[#21262d] text-white text-sm font-semibold flex items-center gap-2 transition-colors">
            Create Emergency Case
            <ArrowRight size={15} />
          </Link>
          <Link href="/login" className="px-6 py-3 rounded border border-[#30363d] bg-[#161b22] hover:bg-[#21262d] text-[#8b949e] hover:text-white text-sm font-medium flex items-center gap-2 transition-colors">
            Sign In
          </Link>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl w-full">
          {/* User */}
          <div className="v2-card v2-card-hover p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-sos-400/10 border border-sos-400/25 flex items-center justify-center text-sos-300">
                <Users size={20} />
              </div>
              <h3 className="text-sm font-bold text-white">1. USER Portal</h3>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                Submit emergency, view live hospital acceptances, and navigate directly to the fastest accepted ER.
              </p>
              <ul className="space-y-1 text-xs text-[#6e7681]">
                <li className="flex items-center gap-1.5"><span className="text-ok-400">✓</span> Self Transport & Ambulance</li>
                <li className="flex items-center gap-1.5"><span className="text-ok-400">✓</span> Live Hospital Responses</li>
                <li className="flex items-center gap-1.5"><span className="text-ok-400">✓</span> Turn-by-Turn Navigation</li>
              </ul>
            </div>
            <Link href="/user/dashboard" className="mt-4 w-full py-2 rounded border border-sos-400/30 bg-sos-400/10 hover:bg-sos-400 text-sos-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all">
              Open User Dashboard <ArrowRight size={13} />
            </Link>
          </div>

          {/* Hospital */}
          <div className="v2-card v2-card-hover p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-ok-400/10 border border-ok-400/25 flex items-center justify-center text-ok-400">
                <Hospital size={20} />
              </div>
              <h3 className="text-sm font-bold text-white">2. HOSPITAL Portal</h3>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                ER staff intake desk. Receive incoming cases, 1-click Accept/Reject, manage ICU readiness.
              </p>
              <ul className="space-y-1 text-xs text-[#6e7681]">
                <li className="flex items-center gap-1.5"><span className="text-ok-400">✓</span> Real-Time ER Case Inbox</li>
                <li className="flex items-center gap-1.5"><span className="text-ok-400">✓</span> 1-Click Accept / Reject</li>
                <li className="flex items-center gap-1.5"><span className="text-ok-400">✓</span> Pre-Arrival Trauma Checklist</li>
              </ul>
            </div>
            <Link href="/hospital/dashboard" className="mt-4 w-full py-2 rounded border border-ok-400/30 bg-ok-400/10 hover:bg-ok-500 text-ok-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all">
              Open Hospital Dashboard <ArrowRight size={13} />
            </Link>
          </div>

          {/* Admin */}
          <div className="v2-card v2-card-hover p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-info-400/10 border border-info-400/25 flex items-center justify-center text-info-300">
                <Shield size={20} />
              </div>
              <h3 className="text-sm font-bold text-white">3. ADMIN Control</h3>
              <p className="text-xs text-[#8b949e] leading-relaxed">
                State-level network operations. Verify hospitals, monitor active cases, track dispatch metrics.
              </p>
              <ul className="space-y-1 text-xs text-[#6e7681]">
                <li className="flex items-center gap-1.5"><span className="text-ok-400">✓</span> Hospital Verification Queue</li>
                <li className="flex items-center gap-1.5"><span className="text-ok-400">✓</span> Live Emergency Stream</li>
                <li className="flex items-center gap-1.5"><span className="text-ok-400">✓</span> RBAC & System Audit</li>
              </ul>
            </div>
            <Link href="/admin/dashboard" className="mt-4 w-full py-2 rounded border border-info-400/30 bg-info-400/10 hover:bg-info-500 text-info-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all">
              Open Admin Dashboard <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </main>

      <footer className="px-6 py-3 border-t border-[#21262d] text-[11px] font-mono text-[#484f58] flex items-center justify-between">
        <span>▸ Medium Emergency Coordinator Engine Safe, panic-free checks and optimal medical routing.</span>
        <span>Toll-Free SOS: <span className="text-sos-300">108 / 112</span> · © 2026 MedLink. All rights reserved.</span>
      </footer>
    </div>
  );
}
