import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Channel } from '@/types/channel';
import type { Skill } from '@/types/skill';

const mocks = vi.hoisted(() => {
  const fetchChannels = vi.fn(async () => undefined);
  const fetchSkills = vi.fn(async () => undefined);

  return {
    gatewayStore: {
      status: {
        state: 'running' as const,
        port: 18789,
      },
    },
    channelsStore: {
      channels: [] as Channel[],
      fetchChannels,
    },
    skillsStore: {
      skills: [] as Skill[],
      fetchSkills,
    },
    settingsStore: {
      devModeUnlocked: false,
    },
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/stores/gateway', () => ({
  useGatewayStore: (selector?: (state: typeof mocks.gatewayStore) => unknown) =>
    selector ? selector(mocks.gatewayStore) : mocks.gatewayStore,
}));

vi.mock('@/stores/channels', () => ({
  useChannelsStore: (selector?: (state: typeof mocks.channelsStore) => unknown) =>
    selector ? selector(mocks.channelsStore) : mocks.channelsStore,
}));

vi.mock('@/stores/skills', () => ({
  useSkillsStore: (selector?: (state: typeof mocks.skillsStore) => unknown) =>
    selector ? selector(mocks.skillsStore) : mocks.skillsStore,
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: (selector?: (state: typeof mocks.settingsStore) => unknown) =>
    selector ? selector(mocks.settingsStore) : mocks.settingsStore,
}));

vi.mock('@/components/common/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span data-testid={`status-${status}`}>{status}</span>,
}));

import { Dashboard } from '@/pages/Dashboard';

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

describe('dashboard contract', () => {
  beforeEach(() => {
    mocks.gatewayStore.status = { state: 'running', port: 18789 };
    mocks.channelsStore.channels = [];
    mocks.skillsStore.skills = [];
    mocks.settingsStore.devModeUnlocked = false;

    mocks.channelsStore.fetchChannels.mockClear();
    mocks.skillsStore.fetchSkills.mockClear();
  });

  it('keeps quick actions and summary reachable in success state', () => {
    mocks.channelsStore.channels = [
      {
        id: 'channel-1',
        type: 'telegram',
        name: 'Ops',
        status: 'connected',
      },
    ];
    mocks.skillsStore.skills = [
      {
        id: 'skill-1',
        name: 'Summarizer',
        description: 'Summarize',
        enabled: true,
      },
    ];
    mocks.settingsStore.devModeUnlocked = true;

    renderDashboard();

    expect(screen.getByTestId('dashboard-quick-action-add-channel')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-quick-action-open-chat')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-summary')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-state-success')).toBeInTheDocument();
  });

  it('renders explicit loading state', () => {
    mocks.gatewayStore.status = { state: 'starting', port: 18789 };

    renderDashboard();

    expect(screen.getByTestId('dashboard-state-loading')).toBeInTheDocument();
  });

  it('renders explicit error state with retry action', () => {
    mocks.gatewayStore.status = { state: 'error', port: 18789, error: 'down' };

    renderDashboard();

    fireEvent.click(screen.getByTestId('dashboard-retry-action'));

    expect(screen.getByTestId('dashboard-state-error')).toBeInTheDocument();
    expect(mocks.channelsStore.fetchChannels).toHaveBeenCalled();
    expect(mocks.skillsStore.fetchSkills).toHaveBeenCalled();
  });

  it('renders explicit empty state when no channels and no enabled skills', () => {
    renderDashboard();

    expect(screen.getByTestId('dashboard-state-empty')).toBeInTheDocument();
  });
});
