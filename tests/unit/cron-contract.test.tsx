import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { CronJob } from '@/types/cron';

const mocks = vi.hoisted(() => {
  const fetchJobs = vi.fn(async () => undefined);
  const createJob = vi.fn(async () => undefined);
  const updateJob = vi.fn(async () => undefined);
  const toggleJob = vi.fn(async () => undefined);
  const deleteJob = vi.fn(async () => undefined);
  const triggerJob = vi.fn(async () => undefined);
  const fetchChannels = vi.fn(async () => undefined);

  return {
    cronStore: {
      jobs: [] as CronJob[],
      loading: false,
      error: null as string | null,
      fetchJobs,
      createJob,
      updateJob,
      toggleJob,
      deleteJob,
      triggerJob,
    },
    channelsStore: {
      channels: [],
      fetchChannels,
    },
    gatewayStore: {
      status: {
        state: 'running' as const,
        port: 18789,
      },
    },
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/stores/cron', () => ({
  useCronStore: (selector?: (state: typeof mocks.cronStore) => unknown) =>
    selector ? selector(mocks.cronStore) : mocks.cronStore,
}));

vi.mock('@/stores/channels', () => ({
  useChannelsStore: (selector?: (state: typeof mocks.channelsStore) => unknown) =>
    selector ? selector(mocks.channelsStore) : mocks.channelsStore,
}));

vi.mock('@/stores/gateway', () => ({
  useGatewayStore: (selector?: (state: typeof mocks.gatewayStore) => unknown) =>
    selector ? selector(mocks.gatewayStore) : mocks.gatewayStore,
}));

import { Cron } from '@/pages/Cron';

function buildJob(overrides: Partial<CronJob> = {}): CronJob {
  return {
    id: 'job-1',
    name: 'Daily sync',
    message: 'Run daily sync',
    schedule: '0 9 * * *',
    target: {
      channelType: 'telegram',
      channelId: 'channel-1',
      channelName: 'Ops',
    },
    enabled: true,
    createdAt: '2026-03-26T10:00:00.000Z',
    updatedAt: '2026-03-26T10:00:00.000Z',
    ...overrides,
  };
}

describe('cron contract', () => {
  beforeEach(() => {
    mocks.cronStore.jobs = [];
    mocks.cronStore.loading = false;
    mocks.cronStore.error = null;
    mocks.gatewayStore.status = { state: 'running', port: 18789 };

    mocks.cronStore.fetchJobs.mockClear();
    mocks.cronStore.createJob.mockClear();
    mocks.cronStore.updateJob.mockClear();
    mocks.cronStore.toggleJob.mockClear();
    mocks.cronStore.deleteJob.mockClear();
    mocks.cronStore.triggerJob.mockClear();
    mocks.channelsStore.fetchChannels.mockClear();
  });

  it('keeps refresh/create and row view/edit actions reachable in success state', () => {
    mocks.cronStore.jobs = [buildJob()];

    render(<Cron />);

    expect(screen.getByTestId('cron-refresh-action')).toBeInTheDocument();
    expect(screen.getByTestId('cron-create-action')).toBeInTheDocument();
    expect(screen.getByTestId('cron-view-job-job-1')).toBeInTheDocument();
    expect(screen.getByTestId('cron-edit-job-job-1')).toBeInTheDocument();
    expect(screen.getByTestId('cron-state-success')).toBeInTheDocument();
  });

  it('renders explicit loading state panel', () => {
    mocks.cronStore.loading = true;

    render(<Cron />);

    expect(screen.getByTestId('cron-state-loading')).toBeInTheDocument();
  });

  it('renders explicit error state panel with retry action', () => {
    mocks.cronStore.error = 'rpc failed';

    render(<Cron />);

    fireEvent.click(screen.getByTestId('cron-retry-action'));

    expect(screen.getByTestId('cron-state-error')).toBeInTheDocument();
    expect(mocks.cronStore.fetchJobs).toHaveBeenCalled();
  });

  it('renders explicit empty state panel with create CTA', () => {
    render(<Cron />);

    expect(screen.getByTestId('cron-state-empty')).toBeInTheDocument();
    expect(screen.getByTestId('cron-empty-create-action')).toBeInTheDocument();
  });
});
