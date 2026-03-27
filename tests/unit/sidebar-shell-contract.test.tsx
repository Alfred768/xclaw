import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { Sidebar } from '@/components/layout/Sidebar';
import { mockDevModeUnlocked, renderWithRouter, resetShellSettings } from '../utils/redesignTestHelpers';

describe('sidebar shell contract', () => {
  beforeEach(() => {
    resetShellSettings({ devModeUnlocked: false, sidebarCollapsed: false });
  });

  it('does not render dev console entry when dev mode is locked', () => {
    renderWithRouter(<Sidebar />);

    expect(screen.queryByRole('button', { name: 'sidebar.devConsole' })).not.toBeInTheDocument();
  });

  it('opens dev console only when dev mode is unlocked', async () => {
    mockDevModeUnlocked(true);

    const invoke = window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>;
    invoke.mockImplementation(async (channel: string) => {
      if (channel === 'gateway:getControlUiUrl') {
        return { success: true, url: 'https://localhost:3111/control' };
      }
      return undefined;
    });

    renderWithRouter(<Sidebar />);

    fireEvent.click(screen.getByRole('button', { name: 'sidebar.devConsole' }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('gateway:getControlUiUrl');
      expect(window.electron.openExternal).toHaveBeenCalledWith('https://localhost:3111/control');
    });
  });
});
