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
      <div className="drag-region flex h-11 shrink-0 items-center border-b border-border/60 bg-background/92 px-2">
        {/* Mobile menu button - only visible on small screens */}
        <button
          onClick={onMenuClick}
          className="no-drag z-10 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground md:hidden"
          aria-label="Open menu"
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
    <div className="drag-region flex h-11 shrink-0 items-center justify-between border-b border-border/60 bg-background/92 px-2">
      {/* Left: Mobile menu + Icon + App Name */}
      <div className="no-drag flex items-center gap-2">
        {/* Mobile menu button - only visible on small screens */}
        <button
          onClick={onMenuClick}
          className="-ml-1 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground md:hidden"
          aria-label="Open menu"
        >
          <List className="h-5 w-5" weight="regular" />
        </button>
        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/85 px-2 py-1 shadow-sm">
          <img src={logoSvg} alt="XClaw" className="h-4 w-auto" />
          <span className="hidden select-none text-xs font-medium text-muted-foreground sm:inline">
            XClaw
          </span>
        </div>
      </div>

      {/* Right: Window Controls */}
      <div className="no-drag flex items-center gap-1 rounded-xl border border-border/70 bg-background/80 p-1 shadow-sm">
        <button
          onClick={handleMinimize}
          className="flex h-7 w-9 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          title="Minimize"
        >
          <Minus className="h-4 w-4" weight="regular" />
        </button>
        <button
          onClick={handleMaximize}
          className={maximized
            ? 'flex h-7 w-9 items-center justify-center rounded bg-accent/70 text-foreground transition-colors hover:bg-accent'
            : 'flex h-7 w-9 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground'}
          title={maximized ? 'Restore' : 'Maximize'}
        >
          {maximized ? <Copy className="h-3.5 w-3.5" weight="regular" /> : <Square className="h-3.5 w-3.5" weight="regular" />}
        </button>
        <button
          onClick={handleClose}
          className="flex h-7 w-9 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-red-500 hover:text-white"
          title="Close"
        >
          <X className="h-4 w-4" weight="regular" />
        </button>
      </div>
    </div>
  );
}
