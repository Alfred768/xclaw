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
import { preloadRouteByPath } from '@/lib/routePreload';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  collapsed?: boolean;
}

function NavItem({ to, icon, label, badge, collapsed }: NavItemProps) {
  const prefetchRoute = () => preloadRouteByPath(to);

  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      aria-label={label}
      onPointerDown={prefetchRoute}
      onMouseEnter={prefetchRoute}
      onFocus={prefetchRoute}
      className={({ isActive }) =>
        cn(
          'group relative flex h-11 w-full items-center rounded-xl text-sm font-medium transition-all',
          collapsed ? 'justify-center px-0' : 'gap-3 px-3',
          isActive
            ? 'bg-card text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border)),0_8px_18px_-14px_hsl(var(--foreground)/0.6)]'
            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden
            className={cn(
              'absolute left-1 top-1/2 h-5 -translate-y-1/2 rounded-full bg-primary transition-all duration-200',
              isActive ? 'w-1 opacity-100' : 'w-0 opacity-0'
            )}
          />
          <span
            className={cn(
              'shrink-0',
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground group-hover:text-foreground'
            )}
          >
            {icon}
          </span>
          {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
          {!collapsed && badge && (
            <Badge variant="secondary" className="ml-auto shrink-0">
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

  const navGroups = [
    {
      id: 'workspace',
      label: 'Workspace',
      items: [
        { to: '/', icon: <ChatCircle className="h-5 w-5" weight="regular" />, label: t('sidebar.chat') },
      ],
    },
    {
      id: 'operations',
      label: 'Operations',
      items: [
        { to: '/cron', icon: <Clock className="h-5 w-5" weight="regular" />, label: t('sidebar.cronTasks') },
        { to: '/skills', icon: <PuzzlePiece className="h-5 w-5" weight="regular" />, label: t('sidebar.skills') },
        { to: '/channels', icon: <Broadcast className="h-5 w-5" weight="regular" />, label: t('sidebar.channels') },
        { to: '/dashboard', icon: <House className="h-5 w-5" weight="regular" />, label: t('sidebar.dashboard') },
        { to: '/todo', icon: <CheckSquare className="h-5 w-5" weight="regular" />, label: t('sidebar.todo') },
        { to: '/briefing', icon: <NewspaperClipping className="h-5 w-5" weight="regular" />, label: t('sidebar.briefing') },
      ],
    },
    {
      id: 'account',
      label: 'Account',
      items: [
        { to: '/subscription', icon: <CreditCard className="h-5 w-5" weight="regular" />, label: t('sidebar.subscription') },
        { to: '/usage', icon: <ChartBar className="h-5 w-5" weight="regular" />, label: t('sidebar.usage') },
        { to: '/account', icon: <User className="h-5 w-5" weight="regular" />, label: t('sidebar.account') },
        { to: '/settings', icon: <Gear className="h-5 w-5" weight="regular" />, label: t('sidebar.settings') },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-border/65 bg-background/92 transition-[width] duration-200 ease-out md:flex',
        sidebarCollapsed ? 'w-[74px]' : 'w-[274px]',
        // Mobile: hide on small screens, show on md and above
        'md:flex'
      )}
    >
      <div className="flex h-full flex-col gap-3 p-2">
        {/* Navigation */}
        <nav className="flex-1 overflow-auto pr-1">
          <div className="space-y-2">
            {navGroups.map((group) => (
              <section key={group.id} className="space-y-1">
                {!sidebarCollapsed && (
                  <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
                    {group.label}
                  </p>
                )}
                {group.items.map((item) => (
                  <NavItem
                    key={item.to}
                    {...item}
                    collapsed={sidebarCollapsed}
                  />
                ))}
              </section>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="space-y-2 border-t border-border/70 pt-2">
          {devModeUnlocked && !sidebarCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-full justify-start rounded-md border border-border/70 bg-background/70 text-muted-foreground hover:text-foreground"
              onClick={openDevConsole}
            >
              <Terminal className="mr-2 h-4 w-4" weight="regular" />
              {t('sidebar.devConsole')}
              <ArrowSquareOut className="ml-auto h-3 w-3" weight="regular" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-9 rounded-xl border border-transparent text-muted-foreground hover:border-border/80 hover:bg-accent/60 hover:text-foreground',
              sidebarCollapsed ? 'w-full' : 'w-full justify-start px-3'
            )}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <CaretRight className="h-4 w-4" weight="bold" />
            ) : (
              <CaretLeft className="h-4 w-4" weight="bold" />
            )}
            {!sidebarCollapsed && (
              <span className="ml-2 text-xs font-medium">
                Collapse sidebar
              </span>
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}
