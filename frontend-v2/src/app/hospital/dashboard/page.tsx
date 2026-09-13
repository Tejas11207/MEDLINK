"use client";
import { useEffect, useState } from 'react';
import { Radio, CheckCircle2, XCircle, Clock, Hospital as HospitalIcon, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { formatEnum } from '@/lib/format';
import { EmergencyCase, Hospital as HospitalType } from '@/types';

export default function HospitalDashboard() {
  const [inboxCases, setInboxCases] = useState<EmergencyCase[]>([]);
  const [hospitalInfo, setHospitalInfo] = useState<HospitalType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedForReject, setSelectedForReject] = useState<EmergencyCase | null>(null);
  const [rejectionReason, setRejectionReason] = useState('ICU Bed Capacity Full');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const hospId = localStorage.getItem('medlink_hospital_id') || '2';
      const [infoRes, inboxRes] = await Promise.all([
        api.get(`/hospitals/${hospId}`),
        api.get(`/hospitals/${hospId}/incoming`),
      ]);
      setHospitalInfo(infoRes.data);
      setInboxCases(inboxRes.data);
    } catch {}
    finally { setLoading(false); }
  };

  const handleAccept = async (caseId: number) => {
    setProcessing(true);
    try {
      const hospId = localStorage.getItem('medlink_hospital_id') || '2';
      await api.post(`/hospitals/${hospId}/respond/${caseId}`, { response: 'ACCEPTED', eta: 8.0 });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to accept.');
    } finally { setProcessing(false); }
  };

  const handleReject = async () => {
    if (!selectedForReject) return;
    setProcessing(true);
    try {
      const hospId = localStorage.getItem('medlink_hospital_id') || '2';
      await api.post(`/hospitals/${hospId}/respond/${selectedForReject.id}`, {
        response: 'REJECTED', rejection_reason: rejectionReason,
      });
      setSelectedForReject(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to reject.');
    } finally { setProcessing(false); }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Header banner */}
      <div className="v2-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge-green px-2 py-0.5 rounded font-mono text-xs font-bold">VERIFIED ER DESK</span>
            <span className="text-xs text-[#6e7681] font-mono">· {hospitalInfo?.name || 'Fortis Escorts Hospital'}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Emergency ER Case Intake</h1>
          <p className="text-xs text-[#6e7681]">
            Incoming emergency broadcasts within range. Accept or Reject with capacity reasoning in 1-click.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-3 rounded-lg bg-[#21262d] border border-[#30363d] text-center">
            <span className="text-[10px] font-mono text-[#484f58] block uppercase">Available ICU</span>
            <span className="text-xl font-bold text-ok-400 font-mono">{hospitalInfo?.available_icu || 14}</span>
          </div>
          <button onClick={fetchData} className="p-2.5 rounded border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] flex items-center gap-1 text-xs font-semibold transition-colors">
            <RefreshCw size={13} /> Sync
          </button>
        </div>
      </div>

      {/* Inbox */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Radio size={15} className="text-sos-400 animate-pulse" />
            Incoming Emergency Broadcasts ({inboxCases.length})
          </h2>
          <span className="text-xs font-mono text-[#484f58]">Real-Time Sync</span>
        </div>

        {inboxCases.length === 0 && !loading ? (
          <div className="v2-card p-10 text-center space-y-2">
            <CheckCircle2 size={28} className="mx-auto text-ok-400" />
            <h3 className="text-sm font-bold text-white">ER Inbox Empty</h3>
            <p className="text-xs text-[#6e7681]">No active unresponded emergency broadcasts in your coverage zone.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {inboxCases.map(c => (
              <div key={c.id} className="v2-card p-5 space-y-4 border-l-4 border-sos-400 shadow-glow-red/10">
                {/* Case header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#21262d]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-sos-400 text-white font-mono font-bold text-xs px-2.5 py-0.5 rounded">{c.case_code}</span>
                    <span className="text-xs font-mono text-[#6e7681]">Mode: {formatEnum(c.transport_mode)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${c.priority === 'CRITICAL' ? 'badge-red' : 'badge-amber'}`}>
                      {formatEnum(c.priority)} Priority
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#484f58] shrink-0">{new Date(c.created_at).toLocaleTimeString()}</span>
                </div>

                {/* Case details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="font-mono text-[10px] text-[#484f58] uppercase block mb-1">Patient Symptoms</span>
                    <span className="font-bold text-white">{c.patient_name} ({c.patient_age || 'N/A'} y/o)</span>
                    <span className="text-sos-300 font-semibold block">{c.condition}</span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-[#484f58] uppercase block mb-1">Required Capability</span>
                    <span className="font-bold text-[#e6edf3]">{c.requirements}</span>
                    <span className="text-[#6e7681] block mt-0.5">Vitals: {c.vitals || 'Pending'}</span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-[#484f58] uppercase block mb-1">Patient Location</span>
                    <span className="text-[#8b949e] font-medium">{c.address || 'Bengaluru, Karnataka'}</span>
                    {c.ambulance_details && (
                      <span className="text-ok-400 font-mono text-[11px] block mt-0.5">{c.ambulance_details}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    onClick={() => setSelectedForReject(c)}
                    disabled={processing}
                    className="py-2 px-4 rounded border border-sos-400/30 bg-sos-400/10 hover:bg-sos-400/20 text-sos-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <XCircle size={14} /> Reject Case
                  </button>
                  <button
                    onClick={() => handleAccept(c.id)}
                    disabled={processing}
                    className="py-2 px-5 rounded bg-ok-500 hover:bg-ok-400 text-white text-xs font-semibold flex items-center gap-1.5 shadow-glow-green/30 transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} /> ACCEPT EMERGENCY (ETA 8m)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {selectedForReject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md v2-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <XCircle size={17} className="text-sos-400" /> Reject Case {selectedForReject.case_code}
            </h3>
            <p className="text-xs text-[#6e7681]">Provide a clear refusal rationale for MedLink Decision Engine audit:</p>
            <div className="space-y-2">
              {['ICU Bed Capacity Full', 'Required Specialist Unavailable', 'Oxygen Supply Constraints', 'Emergency Department Maintenance'].map(reason => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setRejectionReason(reason)}
                  className={`w-full p-2.5 rounded-lg text-left text-xs font-medium border transition-all ${
                    rejectionReason === reason
                      ? 'border-sos-400/50 bg-sos-400/10 text-sos-300 font-semibold'
                      : 'border-[#30363d] bg-[#21262d] text-[#8b949e] hover:border-[#484f58]'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={() => setSelectedForReject(null)}
                className="py-1.5 px-4 rounded border border-[#30363d] bg-[#21262d] text-[#8b949e] text-xs font-medium hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                className="py-2 px-5 rounded bg-sos-400 hover:bg-sos-500 text-white text-xs font-semibold transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
