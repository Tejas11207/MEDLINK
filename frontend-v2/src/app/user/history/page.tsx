"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, ChevronRight, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { EmergencyCase } from '@/types';
import { formatEnum } from '@/lib/format';

export default function HistoryPage() {
  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/emergency/history/all')
      .then(r => setCases(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#6e7681] font-semibold uppercase tracking-wider mb-1">
          <Clock size={13} /> Case History
        </div>
        <h1 className="text-2xl font-bold text-white">Emergency Case History</h1>
        <p className="text-xs text-[#6e7681] mt-0.5">Complete record of all emergency cases</p>
      </div>

      {loading ? (
        <div className="v2-card p-8 text-center text-xs text-[#6e7681] font-mono">Loading history...</div>
      ) : cases.length === 0 ? (
        <div className="v2-card p-10 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 mx-auto text-[#484f58]" />
          <p className="text-sm text-[#6e7681]">No emergency cases found.</p>
          <Link href="/user/emergency/new" className="inline-flex items-center gap-1.5 py-2 px-4 rounded bg-sos-400 text-white text-xs font-semibold">
            Create Emergency
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {cases.map(c => (
            <div key={c.id} className="v2-card v2-card-hover p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#21262d] border border-[#30363d] text-[#8b949e] flex items-center justify-center font-mono font-bold text-xs shrink-0">
                  {c.case_code.split('-')[1] || c.id}
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-white">{c.patient_name}</h4>
                  <p className="text-xs text-[#8b949e]">{c.condition}</p>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-[#484f58]">
                    <span>{formatEnum(c.transport_mode)}</span>
                    <span>·</span>
                    <span>{formatEnum(c.priority)}</span>
                    <span>·</span>
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                  c.status === 'COMPLETED' ? 'badge-green' :
                  c.status === 'CANCELLED' ? 'badge-subtle' :
                  'badge-amber'
                }`}>
                  {formatEnum(c.status)}
                </span>
                {c.selected_hospital && (
                  <span className="text-[11px] text-[#6e7681] max-w-[120px] truncate hidden sm:block">→ {c.selected_hospital.name}</span>
                )}
                <Link href={`/user/hospitals?case_id=${c.id}`} className="p-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] transition-colors">
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
