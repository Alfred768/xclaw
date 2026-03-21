/**
 * TitleBar Component
 * macOS: empty drag region (native traffic lights handled by hiddenInset).
 * Windows/Linux: icon + "XClaw" on left, minimize/maximize/close on right.
 * Mobile: hamburger menu button on the left.
 */
import { useState, useEffect } from 'react';
import { Minus, Square, X, Copy, List } from '@phosphor-icons/react';
import logoSvg from '@/assets/logo.png';

const isMac = window.electron?.platform === 'darwin';

interface TitleBarProps {
  onMenuClick?: () => void;
}

export function TitleBar({ onMenuClick }: TitleBarProps) {
  if (isMac) {
    // macOS: just a drag region with hamburger for mobile
    return (
      <div className="drag-region h-10 shrink-0 border-b bg-background flex items-center">
        {/* Mobile menu button - only visible on small screens */}
        <button
          onClick={onMenuClick}
          className="no-drag h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors md:hidden z-10"
        >
          <List className="h-5 w-5" weight="regular" />
        </button>
      </div>
    );
  }

  return <WindowsTitleBar onMenuClick={onMenuClick} />;
}

function WindowsTitleBar({ onMenuClick }: TitleBarProps) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    // Check initial state
    window.electron?.ipcRenderer.invoke('window:isMaximized').then((val) => {
      setMaximized(val as boolean);
    });
  }, []);

  const handleMinimize = () => {
    window.electron?.ipcRenderer.invoke('window:minimize');
  };

  const handleMaximize = () => {
    window.electron?.ipcRenderer.invoke('window:maximize').then(() => {
      window.electron?.ipcRenderer.invoke('window:isMaximized').then((val) => {
        setMaximized(val as boolean);
      });
    });
  };

  const handleClose = () => {
    window.electron?.ipcRenderer.invoke('window:close');
  };

  return (
    <div className="drag-region flex h-10 shrink-0 items-center justify-between border-b bg-background">
      {/* Left: Mobile menu + Icon + App Name */}
      <div className="no-drag flex items-center gap-2 pl-3">
        {/* Mobile menu button - only visible on small screens */}
        <button
          onClick={onMenuClick}
          className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors md:hidden -ml-1"
        >
          <List className="h-5 w-5" weight="regular" />
        </button>
        <img src={logoSvg} alt="XClaw" className="h-5 w-auto" />
        <span className="text-xs font-medium text-muted-foreground select-none hidden sm:inline">
          XClaw
        </span>
      </div>

      {/* Right: Window Controls */}
      <div className="no-drag flex h-full">
        <button
          onClick={handleMinimize}
          className="flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          title="Minimize"
        >
          <Minus className="h-4 w-4" weight="regular" />
        </button>
        <button
          onClick={handleMaximize}
          className="flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          title={maximized ? 'Restore' : 'Maximize'}
        >
          {maximized ? <Copy className="h-3.5 w-3.5" weight="regular" /> : <Square className="h-3.5 w-3.5" weight="regular" />}
        </button>
        <button
          onClick={handleClose}
          className="flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-red-500 hover:text-white transition-colors"
          title="Close"
        >
          <X className="h-4 w-4" weight="regular" />
        </button>
      </div>
    </div>
  );
}
