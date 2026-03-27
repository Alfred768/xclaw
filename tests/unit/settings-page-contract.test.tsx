import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

vi.mock('@/components/settings/ProvidersSettings', () => ({
  ProvidersSettings: () => <div data-testid="providers-settings">providers-settings</div>,
}));

vi.mock('@/components/settings/UpdateSettings', () => ({
  UpdateSettings: () => <div data-testid="update-settings">update-settings</div>,
}));

import { Settings } from '@/pages/Settings';
import { SettingsStatePanel } from '@/pages/Settings/components/SettingsStatePanel';
import { useGatewayStore } from '@/stores/gateway';
import { useSettingsStore } from '@/stores/settings';
import { useUpdateStore } from '@/stores/update';

const invokeMock = vi.fn();

describe('Settings page contract', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockImplementation(async (channel: string) => {
      if (channel === 'openclaw:getCliCommand') {
        return { success: true, command: 'openclaw --help' };
      }
      if (channel === 'gateway:getControlUiUrl') {
        return { success: true, url: 'http://localhost:18789', token: 'gw-token', port: 18789 };
      }
      return { success: true };
    });

    window.electron.ipcRenderer.invoke = invokeMock;

    useSettingsStore.setState((state) => ({
      ...state,
      theme: 'system',
      language: 'en',
      gatewayAutoStart: true,
      autoCheckUpdate: true,
      autoDownloadUpdate: false,
      devModeUnlocked: true,
      setTheme: vi.fn(),
      setLanguage: vi.fn(),
      setGatewayAutoStart: vi.fn(),
      setAutoCheckUpdate: vi.fn(),
      setAutoDownloadUpdate: vi.fn(),
      setDevModeUnlocked: vi.fn(),
    }));

    useGatewayStore.setState((state) => ({
      ...state,
      status: { state: 'stopped', port: 18789 },
      restart: vi.fn(),
    }));

    useUpdateStore.setState((state) => ({
      ...state,
      currentVersion: '1.2.3',
      setAutoDownload: vi.fn(async () => {}),
    }));
  });

  it('preserves settings section navigation and all key entry points', () => {
    render(<Settings />);

    expect(screen.getByRole('navigation', { name: 'Settings sections' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'appearance.title' })).toHaveAttribute('href', '#settings-appearance');
    expect(screen.getByRole('link', { name: 'aiProviders.title' })).toHaveAttribute('href', '#settings-ai-providers');
    expect(screen.getByRole('link', { name: 'gateway.title' })).toHaveAttribute('href', '#settings-gateway');
    expect(screen.getByRole('link', { name: 'updates.title' })).toHaveAttribute('href', '#settings-updates');
    expect(screen.getByRole('link', { name: 'advanced.title' })).toHaveAttribute('href', '#settings-advanced');
    expect(screen.getByRole('link', { name: 'developer.title' })).toHaveAttribute('href', '#settings-developer');
    expect(screen.getByRole('link', { name: 'about.title' })).toHaveAttribute('href', '#settings-about');

    expect(screen.getByRole('button', { name: 'appearance.light' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'appearance.dark' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'appearance.system' })).toBeInTheDocument();

    expect(screen.getByTestId('providers-settings')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common:actions.restart' })).toBeInTheDocument();
    expect(screen.getByTestId('update-settings')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'about.docs' })).toBeInTheDocument();
  });

  it('prevents hash-router route replacement when clicking section anchors', () => {
    render(<Settings />);

    const sectionLink = screen.getByRole('link', { name: 'aiProviders.title' });
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    const dispatchResult = sectionLink.dispatchEvent(clickEvent);

    expect(dispatchResult).toBe(false);
    expect(clickEvent.defaultPrevented).toBe(true);
  });

  it('maps gateway states to loading/empty/error/success panels', () => {
    useGatewayStore.setState((state) => ({ ...state, status: { state: 'starting', port: 18789 } }));
    const view = render(<Settings />);
    expect(screen.getByTestId('settings-state-panel-loading')).toBeInTheDocument();

    useGatewayStore.setState((state) => ({ ...state, status: { state: 'stopped', port: 18789 } }));
    view.rerender(<Settings />);
    expect(screen.getByTestId('settings-state-panel-empty')).toBeInTheDocument();

    useGatewayStore.setState((state) => ({ ...state, status: { state: 'error', port: 18789, error: 'boom' } }));
    view.rerender(<Settings />);
    expect(screen.getByTestId('settings-state-panel-error')).toBeInTheDocument();

    useGatewayStore.setState((state) => ({ ...state, status: { state: 'running', port: 18789 } }));
    view.rerender(<Settings />);
    expect(screen.getByTestId('settings-state-panel-success')).toBeInTheDocument();
  });

  it('keeps long copy from squeezing action controls', () => {
    render(
      <SettingsStatePanel
        state="error"
        title="A very long settings copy that should wrap naturally without pushing away controls"
        description="Another long description that should keep action buttons reachable and visible."
        action={<button type="button">Retry</button>}
      />
    );

    expect(screen.getByTestId('settings-state-panel-content')).toHaveClass('min-w-0');
    expect(screen.getByTestId('settings-state-panel-action')).toHaveClass('shrink-0');
  });
});
