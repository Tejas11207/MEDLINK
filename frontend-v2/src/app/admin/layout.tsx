import TopNav from '@/components/TopNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      <TopNav role="ADMIN" />
      <main className="flex-1">{children}</main>
      <footer className="px-6 py-3 border-t border-[#21262d] text-[11px] font-mono text-[#484f58] flex items-center justify-between">
        <span>▸ Admin Network Command — State-level emergency surveillance operations.</span>
        <span>Toll-Free SOS: <span className="text-sos-300">108 / 112</span> · © 2026 MedLink.</span>
      </footer>
    </div>
  );
}
