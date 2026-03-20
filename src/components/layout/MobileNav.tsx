/**
 * MobileNav Component
 * Drawer-style navigation for mobile devices.
 * Slides in from the left with backdrop overlay.
 */
import { useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChatCircle,
  Clock,
  PuzzlePiece,
  Broadcast,
  House,
  CheckSquare,
  NewspaperClipping,
  ChartBar,
  User,
  CreditCard,
  Gear,
  Terminal,
  ArrowSquareOut,
  X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const devModeUnlocked = useSettingsStore((state) => state.devModeUnlocked);
  const { t } = useTranslation();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

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
    onClose();
  };

  const handleNavClick = useCallback(() => {
    onClose();
  }, [onClose]);

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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-background shadow-xl md:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4">
              <span className="text-lg font-semibold">Menu</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-5 w-5" weight="regular" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 overflow-auto p-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground'
                    )
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Footer */}
            <div className="border-t p-4">
              {devModeUnlocked && (
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
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
