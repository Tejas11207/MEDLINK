import TopNav from '@/components/TopNav';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      <TopNav role="USER" />
      <main className="flex-1">{children}</main>
      <footer className="px-6 py-3 border-t border-[#21262d] text-[11px] font-mono text-[#484f58] flex items-center justify-between">
        <span>▸ Medium Emergency Coordinator Engine Safe, panic-free checks and optimal medical routing.</span>
        <span>Toll-Free SOS: <span className="text-sos-300">108 / 112</span> · © 2026 MedLink. All rights reserved.</span>
      </footer>
    </div>
  );
}
