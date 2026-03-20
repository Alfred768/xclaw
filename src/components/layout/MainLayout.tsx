/**
 * Main Layout Component
 * TitleBar at top, then sidebar + content below.
 */
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
import { MessageSquare, Home, ListTodo, Settings, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const mobileNavItems = [
  { to: '/', icon: MessageSquare, label: 'nav.chat' },
  { to: '/dashboard', icon: Home, label: 'nav.home' },
  { to: '/todo', icon: ListTodo, label: 'nav.todo' },
  { to: '/usage', icon: BarChart2, label: 'nav.usage' },
  { to: '/settings', icon: Settings, label: 'nav.settings' },
];

export function MainLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Title bar: drag region on macOS, icon + controls on Windows */}
      <TitleBar />

      {/* Below the title bar: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation - shown only on small screens */}
      <nav className="flex md:hidden border-t bg-background fixed bottom-0 left-0 right-0 z-50">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={cn(
                'flex flex-1 flex-col items-center justify-center py-2 text-xs transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span>{t(item.label)}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
