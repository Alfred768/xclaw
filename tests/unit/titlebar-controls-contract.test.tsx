import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

async function importTitleBarForPlatform(platform: 'darwin' | 'win32') {
  vi.resetModules();
  (window.electron as { platform: string }).platform = platform;
  const module = await import('@/components/layout/TitleBar');
  return module.TitleBar;
}

describe('titlebar controls contract', () => {
  it('toggles maximize/restore control state on non-mac platforms', async () => {
    let maximized = false;
    const invoke = window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>;

    invoke.mockImplementation(async (channel: string) => {
      if (channel === 'window:isMaximized') {
        return maximized;
      }
      if (channel === 'window:maximize') {
        maximized = !maximized;
        return undefined;
      }
      if (channel === 'window:minimize' || channel === 'window:close') {
        return undefined;
      }
      return undefined;
    });

    const TitleBar = await importTitleBarForPlatform('win32');
    render(<TitleBar />);

    await waitFor(() => {
      expect(screen.getByTitle('Maximize')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Maximize'));

    await waitFor(() => {
      expect(screen.getByTitle('Restore')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Restore'));

    await waitFor(() => {
      expect(screen.getByTitle('Maximize')).toBeInTheDocument();
    });

    expect(invoke).toHaveBeenCalledWith('window:maximize');
    expect(invoke).toHaveBeenCalledWith('window:isMaximized');
  });
});
