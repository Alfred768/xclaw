/**
 * Sidebar Component
 * Navigation sidebar with menu items.
 * No longer fixed - sits inside the flex layout below the title bar.
 */
import { NavLink } from 'react-router-dom';
import {
  House,
  ChatCircle,
  Broadcast,
  PuzzlePiece,
  Clock,
  Gear,
  CaretLeft,
  CaretRight,
  Terminal,
  ArrowSquareOut,
  CheckSquare,
  NewspaperClipping,
  ChartBar,
  User,
  CreditCard,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  collapsed?: boolean;
}

function NavItem({ to, icon, label, badge, collapsed }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground',
          collapsed && 'justify-center px-2'
        )
      }
    >
      {icon}
      {!collapsed && (
        <>
          <span className="flex-1">{label}</span>
          {badge && (
            <Badge variant="secondary" className="ml-auto">
              {badge}
            </Badge>
          )}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((state) => state.setSidebarCollapsed);
  const devModeUnlocked = useSettingsStore((state) => state.devModeUnlocked);

  const openDevConsole = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('gateway:getControlUiUrl') as {
        success: boolean;
        url?: string;
        error?: string;
      };
      if (result.success && result.url) {
        window.electron.openExternal(result.url);
      } else {
        console.error('Failed to get Dev Console URL:', result.error);
      }
    } catch (err) {
      console.error('Error opening Dev Console:', err);
    }
  };

  const { t } = useTranslation();

  const navItems = [
    { to: '/', icon: <ChatCircle className="h-5 w-5" weight="regular" />, label: t('sidebar.chat') },
    { to: '/cron', icon: <Clock className="h-5 w-5" weight="regular" />, label: t('sidebar.cronTasks') },
    { to: '/skills', icon: <PuzzlePiece className="h-5 w-5" weight="regular" />, label: t('sidebar.skills') },
    { to: '/channels', icon: <Broadcast className="h-5 w-5" weight="regular" />, label: t('sidebar.channels') },
    { to: '/dashboard', icon: <House className="h-5 w-5" weight="regular" />, label: t('sidebar.dashboard') },
    { to: '/todo', icon: <CheckSquare className="h-5 w-5" weight="regular" />, label: t('sidebar.todo') },
    { to: '/briefing', icon: <NewspaperClipping className="h-5 w-5" weight="regular" />, label: t('sidebar.briefing') },
    { to: '/subscription', icon: <CreditCard className="h-5 w-5" weight="regular" />, label: t('sidebar.subscription') },
    { to: '/usage', icon: <ChartBar className="h-5 w-5" weight="regular" />, label: t('sidebar.usage') },
    { to: '/account', icon: <User className="h-5 w-5" weight="regular" />, label: t('sidebar.account') },
    { to: '/settings', icon: <Gear className="h-5 w-5" weight="regular" />, label: t('sidebar.settings') },
  ];

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r bg-background transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64',
        // Mobile: hide on small screens, show on md and above
        'hidden md:flex'
      )}
    >
      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-auto p-2">
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            {...item}
            collapsed={sidebarCollapsed}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 space-y-2">
        {devModeUnlocked && !sidebarCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={openDevConsole}
          >
            <Terminal className="h-4 w-4 mr-2" weight="regular" />
            {t('sidebar.devConsole')}
            <ArrowSquareOut className="h-3 w-3 ml-auto" weight="regular" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="w-full"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? (
            <CaretRight className="h-4 w-4" weight="bold" />
          ) : (
            <CaretLeft className="h-4 w-4" weight="bold" />
          )}
        </Button>
      </div>
    </aside>
  );
}
