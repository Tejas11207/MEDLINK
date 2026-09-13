import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MedLink | Emergency Coordination',
  description: 'Fastest Accepted Hospital Allocation & Emergency Telemetry',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0d1117] text-[#e6edf3] min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
