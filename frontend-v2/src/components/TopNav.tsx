"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Radio, Shield, Hospital, Users, Siren, HeartPulse,
  Activity, Phone, Wifi, Clock
} from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface TopNavProps {
  role?: 'USER' | 'HOSPITAL' | 'ADMIN';
}

export default function TopNav({ role }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [time, setTime] = useState('');
  const [activeRole, setActiveRole] = useState<'USER' | 'HOSPITAL' | 'ADMIN'>(role || 'USER');
  const [simulating, setSimulating] = useState(false);
  const [verifiedCount, setVerifiedCount] = useState(48);
  const [avgResponse, setAvgResponse] = useState('3.1s');

  useEffect(() => {
    if (pathname?.startsWith('/hospital')) setActiveRole('HOSPITAL');
    else if (pathname?.startsWith('/admin')) setActiveRole('ADMIN');
    else if (pathname?.startsWith('/user')) setActiveRole('USER');

    const interval = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(interval);
  }, [pathname]);

  const switchRole = (r: 'USER' | 'HOSPITAL' | 'ADMIN') => {
    setActiveRole(r);
    localStorage.setItem('medlink_role', r);
    if (r === 'USER') router.push('/user/dashboard');
    else if (r === 'HOSPITAL') router.push('/hospital/dashboard');
    else router.push('/admin/dashboard');
  };

  const runGoldenPath = async () => {
    try {
      setSimulating(true);
      const res = await api.post('/simulation/golden-path');
      localStorage.setItem('medlink_current_case_id', res.data.id.toString());
      localStorage.setItem('medlink_role', 'USER');
      setActiveRole('USER');
      router.push(`/user/hospitals?case_id=${res.data.id}`);
    } catch {
      router.push('/user/emergency/new');
    } finally {
      setSimulating(false);
    }
  };

  const navLinks = activeRole === 'USER'
    ? [
        { label: '🚨 SOS Quick Access', href: '/user/emergency/new', hot: true },
        { label: 'User Portal', href: '/user/dashboard' },
        { label: 'Hospital Discovery', href: '/user/hospitals' },
        { label: 'Case History', href: '/user/history' },
      ]
    : activeRole === 'HOSPITAL'
    ? [
        { label: 'Hospital Inbox', href: '/hospital/dashboard', hot: true },
        { label: 'Active Cases', href: '/hospital/active-cases' },
        { label: 'Resources', href: '/hospital/resources' },
      ]
    : [
        { label: 'Live Command', href: '/admin/dashboard', hot: true },
        { label: 'Verification', href: '/admin/hospitals' },
        { label: 'Emergency Feed', href: '/admin/emergencies' },
        { label: 'Users', href: '/admin/users' },
      ];

  return (
    <header className="topnav">
      {/* Main nav row */}
      <div className="flex items-center justify-between px-4 py-2 gap-3">
        {/* Left — Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded bg-sos-400 flex items-center justify-center">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight hidden sm:block">MedLink</span>
        </Link>

        {/* Center — nav pills */}
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1 mx-4">
          {navLinks.map((l) => {
            const active = pathname === l.href || (l.href !== '/' && pathname?.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  active
                    ? 'bg-sos-400 text-white shadow-glow-red'
                    : l.hot
                    ? 'bg-[#21262d] text-sos-300 border border-sos-400/40 hover:bg-sos-400/20'
                    : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* Right — status + SOS */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Help desk pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#21262d] border border-[#30363d] text-[11px] text-[#8b949e]">
            <Phone size={11} className="text-ok-400" />
            <span className="text-white font-mono font-bold">HELP DESK</span>
            <span className="text-ok-400 font-mono">108 / 112</span>
            <span className="text-[#484f58]">Free</span>
          </div>

          {/* Role switcher */}
          <div className="flex rounded border border-[#30363d] overflow-hidden text-[10px]">
            {(['USER', 'HOSPITAL', 'ADMIN'] as const).map((r) => (
              <button
                key={r}
                onClick={() => switchRole(r)}
                className={`px-2 py-1 font-bold transition-colors ${
                  activeRole === r
                    ? 'bg-sos-400 text-white'
                    : 'bg-[#21262d] text-[#6e7681] hover:text-white'
                }`}
              >
                {r === 'USER' ? 'USR' : r === 'HOSPITAL' ? 'HSP' : 'ADM'}
              </button>
            ))}
          </div>

          {/* Time */}
          <span className="hidden lg:block text-[11px] font-mono text-[#6e7681]">{time}</span>

          {/* Emergency SOS */}
          <button
            onClick={runGoldenPath}
            disabled={simulating}
            className="sos-btn flex items-center gap-1.5 shrink-0"
          >
            <Siren size={13} className="shrink-0" />
            <span className="hidden sm:inline">{simulating ? 'Starting...' : 'Emergency SOS'}</span>
          </button>
        </div>
      </div>

      {/* Status ticker row */}
      <div className="status-ticker py-1 px-4">
        <div className="flex items-center gap-6 text-[11px] font-mono overflow-hidden">
          <span className="flex items-center gap-1.5 text-ok-400 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-ok-400 animate-pulse-dot inline-block" />
            Verified Network Status:
            <span className="text-white font-bold ml-1">{verifiedCount} Verified Hospitals Ready (Zero Wait)</span>
          </span>
          <span className="text-[#484f58] shrink-0">|</span>
          <span className="text-[#8b949e] shrink-0 flex items-center gap-1">
            <HeartPulse size={11} className="text-sos-300" />
            Pre-cleared Trauma Centers
          </span>
          <span className="text-[#484f58] shrink-0">|</span>
          <span className="text-[#8b949e] shrink-0 flex items-center gap-1">
            <Activity size={11} className="text-ok-400" />
            Avg Response Time:
            <span className="text-white ml-1">{avgResponse}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
