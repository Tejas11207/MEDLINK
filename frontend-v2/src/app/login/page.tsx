"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Radio, Lock, Mail, ArrowRight, Shield, Hospital, Users, Siren } from 'lucide-react';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (loginEmail?: string, loginPass?: string) => {
    setError('');
    setLoading(true);
    const useEmail = loginEmail || email;
    const usePass = loginPass || password;
    try {
      const formData = new FormData();
      formData.append('username', useEmail);
      formData.append('password', usePass);
      const res = await api.post('/auth/login', formData);
      const { access_token, role, user_name, hospital_id } = res.data;
      localStorage.setItem('medlink_token', access_token);
      localStorage.setItem('medlink_role', role);
      localStorage.setItem('medlink_user_name', user_name);
      if (hospital_id) localStorage.setItem('medlink_hospital_id', hospital_id.toString());
      if (role === 'HOSPITAL') router.push('/hospital/dashboard');
      else if (role === 'ADMIN') router.push('/admin/dashboard');
      else router.push('/user/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid credentials. Try demo accounts below.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('Demo@123');
    handleLogin(roleEmail, 'Demo@123');
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center px-4 py-12">
      {/* Brand */}
      <div className="w-full max-w-md space-y-5">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded bg-sos-400 flex items-center justify-center">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">MedLink</span>
          </Link>
          <h2 className="text-lg font-bold text-white">Access Emergency Network</h2>
          <p className="text-xs text-[#6e7681]">Select your role or enter credentials</p>
        </div>

        {/* Quick Demo Logins */}
        <div className="v2-card p-4 space-y-3">
          <div className="text-[10px] font-mono text-[#6e7681] uppercase tracking-wider">Demo Accounts</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => quickLogin('user@medlink.demo')}
              className="py-3 rounded border border-[#30363d] bg-[#21262d] hover:border-sos-400/50 hover:bg-sos-400/10 text-[#8b949e] hover:text-sos-300 text-xs font-semibold flex flex-col items-center gap-1.5 transition-all"
            >
              <Users size={16} />
              <span>USER</span>
            </button>
            <button
              type="button"
              onClick={() => quickLogin('fortis@medlink.demo')}
              className="py-3 rounded border border-[#30363d] bg-[#21262d] hover:border-ok-400/50 hover:bg-ok-400/10 text-[#8b949e] hover:text-ok-400 text-xs font-semibold flex flex-col items-center gap-1.5 transition-all"
            >
              <Hospital size={16} />
              <span>HOSPITAL</span>
            </button>
            <button
              type="button"
              onClick={() => quickLogin('admin@medlink.demo')}
              className="py-3 rounded border border-[#30363d] bg-[#21262d] hover:border-info-400/50 hover:bg-info-400/10 text-[#8b949e] hover:text-info-300 text-xs font-semibold flex flex-col items-center gap-1.5 transition-all"
            >
              <Shield size={16} />
              <span>ADMIN</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleLogin(); }}
          className="v2-card p-5 space-y-4"
        >
          {error && (
            <div className="p-3 rounded border border-sos-400/30 bg-sos-400/10 text-sos-300 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#8b949e]">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#484f58]" size={14} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@medlink.demo"
                required
                className="v2-input pl-9"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#8b949e]">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#484f58]" size={14} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="v2-input pl-9"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded bg-sos-400 hover:bg-sos-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight size={15} />
          </button>
        </form>

        <p className="text-center text-xs text-[#484f58]">
          <Link href="/" className="text-sos-300 hover:underline">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
