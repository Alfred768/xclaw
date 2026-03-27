import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { MobileNav } from '@/components/layout/MobileNav';
import { mockDevModeUnlocked, renderWithRouter, resetShellSettings } from '../utils/redesignTestHelpers';

describe('mobile nav contract', () => {
  beforeEach(() => {
    resetShellSettings({ devModeUnlocked: false, sidebarCollapsed: false });
  });

  it('closes from backdrop click and Escape key', () => {
    const onClose = vi.fn();

    renderWithRouter(<MobileNav isOpen onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mobile-nav-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('closes after navigation link click and keeps route mapping', () => {
    const onClose = vi.fn();

    renderWithRouter(<MobileNav isOpen onClose={onClose} />);

    const targetLink = screen
      .getAllByRole('link')
      .find((link) => new URL((link as HTMLAnchorElement).href).pathname === '/skills');

    expect(targetLink).toBeDefined();
    fireEvent.click(targetLink!);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location-path')).toHaveTextContent('/skills');
  });

  it('only allows dev console trigger when dev mode is unlocked', async () => {
    const invoke = window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>;
    invoke.mockImplementation(async (channel: string) => {
      if (channel === 'gateway:getControlUiUrl') {
        return { success: true, url: 'https://localhost:3111/control' };
      }
      return undefined;
    });

    renderWithRouter(<MobileNav isOpen onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'sidebar.devConsole' })).not.toBeInTheDocument();

    cleanup();
    mockDevModeUnlocked(true);
    const onClose = vi.fn();
    renderWithRouter(<MobileNav isOpen onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'sidebar.devConsole' }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('gateway:getControlUiUrl');
      expect(window.electron.openExternal).toHaveBeenCalledWith('https://localhost:3111/control');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
