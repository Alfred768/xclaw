/**
 * Main Layout Component
 * TitleBar at top, then sidebar + content below.
 */
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
import { MobileNav } from './MobileNav';

export function MainLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Title bar: drag region on macOS, icon + controls on Windows */}
      <TitleBar onMenuClick={() => setMobileNavOpen(true)} />

      {/* Below the title bar: sidebar + content */}
      <div className="flex flex-1 overflow-hidden bg-[radial-gradient(circle_at_8%_-20%,_hsl(var(--primary)/0.14),_transparent_46%),radial-gradient(circle_at_94%_4%,_hsl(var(--accent-foreground)/0.08),_transparent_34%)] p-2 md:p-3">
        <div className="flex flex-1 overflow-hidden rounded-2xl border border-border/60 bg-background/86 shadow-[0_24px_45px_-34px_hsl(var(--foreground)/0.45)]">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <div className="mx-auto h-full w-full max-w-[1600px] p-4 md:p-6 lg:p-7">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </div>
  );
}
