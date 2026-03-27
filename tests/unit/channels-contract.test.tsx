import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Channel } from '@/types/channel';

const mocks = vi.hoisted(() => {
  const fetchChannels = vi.fn(async () => undefined);
  const deleteChannel = vi.fn(async () => undefined);
  const addChannel = vi.fn(async () => undefined);
  const handlers: Record<string, (...args: unknown[]) => void> = {};

  return {
    channelsStore: {
      channels: [] as Channel[],
      loading: false,
      error: null as string | null,
      fetchChannels,
      deleteChannel,
      addChannel,
    },
    gatewayStore: {
      status: {
        state: 'running' as const,
        port: 18789,
      },
    },
    fetchChannels,
    deleteChannel,
    addChannel,
    handlers,
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

vi.mock('@/stores/channels', () => ({
  useChannelsStore: () => mocks.channelsStore,
}));

vi.mock('@/stores/gateway', () => ({
  useGatewayStore: () => mocks.gatewayStore,
}));

import { Channels } from '@/pages/Channels';

function resetMockHandlers() {
  for (const key of Object.keys(mocks.handlers)) {
    delete mocks.handlers[key];
  }
}

describe('Channels page contract', () => {
  const invoke = window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>;
  const on = window.electron.ipcRenderer.on as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mocks.channelsStore.channels = [];
    mocks.channelsStore.loading = false;
    mocks.channelsStore.error = null;
    mocks.gatewayStore.status = { state: 'running', port: 18789 };

    mocks.fetchChannels.mockClear();
    mocks.deleteChannel.mockClear();
    mocks.addChannel.mockClear();
    invoke.mockReset();
    on.mockReset();
    resetMockHandlers();
    window.electron.openExternal.mockReset();
    window.confirm = vi.fn(() => true);

    on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      mocks.handlers[event] = handler;
      return vi.fn();
    });

    invoke.mockImplementation(async (channel: string, ...args: unknown[]) => {
      if (channel === 'channel:listConfigured') {
        return { success: true, channels: ['telegram'] };
      }

      if (channel === 'channel:getFormValues') {
        const selectedType = args[0] as string | undefined;
        if (selectedType === 'telegram') {
          return { success: true, values: {} };
        }
        return { success: true, values: {} };
      }

      if (channel === 'channel:validateCredentials') {
        return {
          success: true,
          valid: true,
          warnings: [],
          details: { botUsername: 'clawbot' },
        };
      }

      if (channel === 'channel:saveConfig') {
        return { success: true };
      }

      if (channel === 'channel:requestWhatsAppQr') {
        return { success: true };
      }

      if (channel === 'gateway:restart') {
        return { success: true };
      }

      if (channel === 'channel:cancelWhatsAppQr') {
        return { success: true };
      }

      return { success: true };
    });
  });

  it('keeps the redesigned shell and core entry points reachable', async () => {
    mocks.channelsStore.channels = [
      {
        id: 'telegram-main',
        type: 'telegram',
        name: 'Ops',
        status: 'connected',
      },
    ];

    render(<Channels />);

    await waitFor(() => {
      expect(mocks.fetchChannels).toHaveBeenCalledTimes(1);
      expect(invoke).toHaveBeenCalledWith('channel:listConfigured');
    });

    expect(screen.getByTestId('channels-page-root')).toBeInTheDocument();
    expect(screen.getByTestId('channels-header')).toBeInTheDocument();
    expect(screen.getByTestId('channels-snapshot')).toBeInTheDocument();
    expect(screen.getByTestId('channels-configured-section')).toBeInTheDocument();
    expect(screen.getByTestId('channels-available-section')).toBeInTheDocument();
    expect(screen.getByTestId('channels-refresh-action')).toBeInTheDocument();
    expect(screen.getByTestId('channels-add-action')).toBeInTheDocument();
    expect(screen.getByTestId('channel-delete-telegram-main')).toBeInTheDocument();
    expect(screen.getByTestId('channel-available-telegram')).toBeInTheDocument();
    expect(screen.getByTestId('channel-available-whatsapp')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('channel-delete-telegram-main'));
    expect(mocks.deleteChannel).toHaveBeenCalledWith('telegram-main');

    mocks.fetchChannels.mockClear();
    fireEvent.click(screen.getByTestId('channels-refresh-action'));
    expect(mocks.fetchChannels).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('channels-add-action'));
    expect(screen.getByTestId('channel-dialog-root')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('channel-dialog-root')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('channels-add-action'));
    expect(screen.getByTestId('channel-dialog-root')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('channel-dialog-close'));
    expect(screen.queryByTestId('channel-dialog-root')).not.toBeInTheDocument();
  });

  it('preserves token-based configuration, validation, docs and reconnect flow', async () => {
    render(<Channels />);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('channel:listConfigured');
    });

    fireEvent.click(screen.getByTestId('channel-available-telegram'));

    const nameInput = await screen.findByTestId('channel-dialog-name');
    await screen.findByTestId('channel-config-field-botToken');
    fireEvent.change(nameInput, { target: { value: 'Ops Telegram' } });

    fireEvent.change(screen.getByTestId('channel-config-input-botToken'), {
      target: { value: 'bot-token-value' },
    });
    fireEvent.change(screen.getByTestId('channel-config-input-allowedUsers'), {
      target: { value: '123456789' },
    });

    fireEvent.click(screen.getByTestId('channel-dialog-open-docs'));
    expect(window.electron.openExternal).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('channel-dialog-validate'));
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith(
        'channel:validateCredentials',
        'telegram',
        expect.objectContaining({
          botToken: 'bot-token-value',
          allowedUsers: '123456789',
        })
      );
    });

    expect(screen.getByTestId('channel-dialog-validation-result')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('channel-dialog-connect'));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('channel:saveConfig', 'telegram', expect.any(Object));
      expect(invoke).toHaveBeenCalledWith('gateway:restart');
      expect(mocks.addChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'telegram',
          name: 'Ops Telegram',
        })
      );
    });
  });

  it('preserves WhatsApp QR generation and completion flow', async () => {
    render(<Channels />);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('channel:listConfigured');
    });

    fireEvent.click(screen.getByTestId('channel-available-whatsapp'));

    const nameInput = await screen.findByTestId('channel-dialog-name');
    fireEvent.change(nameInput, { target: { value: 'Ops WhatsApp' } });

    fireEvent.click(screen.getByTestId('channel-dialog-connect'));
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('channel:requestWhatsAppQr', 'Ops WhatsApp');
    });

    expect(mocks.handlers['channel:whatsapp-qr']).toBeDefined();
    await act(async () => {
      mocks.handlers['channel:whatsapp-qr']?.({ qr: 'QUJD', raw: 'raw-data' });
    });

    expect(await screen.findByTestId('channel-dialog-qr')).toBeInTheDocument();
    expect(screen.getByTestId('channel-dialog-refresh-qr')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('channel-dialog-refresh-qr'));
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('channel:requestWhatsAppQr', 'Ops WhatsApp');
    });

    await act(async () => {
      mocks.handlers['channel:whatsapp-success']?.({ accountId: 'ops-1' });
    });

    await waitFor(() => {
      expect(mocks.addChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'whatsapp',
          name: 'Ops WhatsApp',
        })
      );
    });
  });

  it('shows loading and notice states without dropping the shell', async () => {
    mocks.channelsStore.loading = true;

    const { rerender } = render(<Channels />);
    expect(screen.getByTestId('channels-loading-state')).toBeInTheDocument();

    mocks.channelsStore.loading = false;
    mocks.channelsStore.error = 'gateway rpc failed';
    mocks.gatewayStore.status = { state: 'stopped', port: 18789 };
    await act(async () => {
      rerender(<Channels />);
    });

    expect(screen.getByTestId('channels-notice-warning')).toBeInTheDocument();
    expect(screen.getByTestId('channels-notice-error')).toBeInTheDocument();

    mocks.fetchChannels.mockClear();
    fireEvent.click(screen.getByTestId('channels-notice-action'));
    expect(mocks.fetchChannels).toHaveBeenCalledTimes(1);
  });
});
