import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Skill, MarketplaceSkill } from '@/types/skill';

const mocks = vi.hoisted(() => {
  const fetchSkills = vi.fn(async () => undefined);
  const enableSkill = vi.fn(async () => undefined);
  const disableSkill = vi.fn(async () => undefined);
  const searchSkills = vi.fn(async () => undefined);
  const installSkill = vi.fn(async () => undefined);
  const uninstallSkill = vi.fn(async () => undefined);
  const invoke = vi.fn(async (channel: string) => {
    if (channel === 'openclaw:getSkillsDir') return '/tmp/clawx-skills';
    if (channel === 'shell:openPath') return '';
    return { success: true };
  });

  return {
    skillsStore: {
      skills: [] as Skill[],
      searchResults: [] as MarketplaceSkill[],
      loading: false,
      searching: false,
      searchError: null as string | null,
      installing: {} as Record<string, boolean>,
      error: null as string | null,
      fetchSkills,
      searchSkills,
      installSkill,
      uninstallSkill,
      enableSkill,
      disableSkill,
      setSkills: vi.fn(),
      updateSkill: vi.fn(),
    },
    gatewayStore: {
      status: {
        state: 'running' as const,
        port: 18789,
        error: null as string | null,
      },
    },
    invoke,
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/stores/skills', () => ({
  useSkillsStore: (selector?: (state: typeof mocks.skillsStore) => unknown) =>
    selector ? selector(mocks.skillsStore) : mocks.skillsStore,
}));

vi.mock('@/stores/gateway', () => ({
  useGatewayStore: (selector?: (state: typeof mocks.gatewayStore) => unknown) =>
    selector ? selector(mocks.gatewayStore) : mocks.gatewayStore,
}));

import { Skills } from '@/pages/Skills';

function buildSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: 'skill-1',
    slug: 'skill-1',
    name: 'Knowledge Base Cleanup',
    description: 'Trim, organize, and summarize knowledge base content.',
    enabled: true,
    icon: '🧠',
    version: '1.0.0',
    author: 'OpenClaw',
    configurable: true,
    config: {},
    isCore: false,
    isBundled: false,
    ...overrides,
  };
}

function buildMarketplaceSkill(overrides: Partial<MarketplaceSkill> = {}): MarketplaceSkill {
  return {
    slug: 'beta-skill',
    name: 'Beta Skill',
    description: 'A marketplace skill to expand the workspace.',
    version: '0.9.0',
    author: 'ClawHub',
    downloads: 1234,
    stars: 56,
    ...overrides,
  };
}

describe('Skills page contract', () => {
  beforeEach(() => {
    mocks.skillsStore.skills = [];
    mocks.skillsStore.searchResults = [];
    mocks.skillsStore.loading = false;
    mocks.skillsStore.searching = false;
    mocks.skillsStore.searchError = null;
    mocks.skillsStore.installing = {};
    mocks.skillsStore.error = null;
    mocks.gatewayStore.status = { state: 'running', port: 18789, error: null };

    mocks.skillsStore.fetchSkills.mockClear();
    mocks.skillsStore.searchSkills.mockClear();
    mocks.skillsStore.installSkill.mockClear();
    mocks.skillsStore.uninstallSkill.mockClear();
    mocks.skillsStore.enableSkill.mockClear();
    mocks.skillsStore.disableSkill.mockClear();
    mocks.invoke.mockClear();

    globalThis.__SKILLS_TEST_ELECTRON_BRIDGE__ = {
      ipcRenderer: {
        invoke: mocks.invoke,
      },
    };
  });

  it('keeps the redesigned shell, search controls, and refresh/open-folder actions reachable', async () => {
    mocks.skillsStore.skills = [buildSkill()];

    render(<Skills />);

    await waitFor(() => {
      expect(mocks.skillsStore.fetchSkills).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByTestId('skills-page-root')).toBeInTheDocument();
    expect(screen.getByTestId('skills-refresh-action')).toBeInTheDocument();
    expect(screen.getByTestId('skills-open-folder-action')).toBeInTheDocument();
    expect(screen.getByTestId('skills-search-input')).toBeInTheDocument();
    expect(screen.getByTestId('skills-source-all')).toBeInTheDocument();
    expect(screen.getByTestId('skills-source-built-in')).toBeInTheDocument();
    expect(screen.getByTestId('skills-source-marketplace')).toBeInTheDocument();
    expect(screen.getByTestId('skills-card-skill-1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('skills-refresh-action'));
    expect(mocks.skillsStore.fetchSkills).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByTestId('skills-open-folder-action'));
    expect(mocks.invoke).toHaveBeenCalledWith('openclaw:getSkillsDir');
    await waitFor(() => {
      expect(mocks.invoke).toHaveBeenCalledWith('shell:openPath', '/tmp/clawx-skills');
    });
  });

  it('keeps installed skill cards, details dialog, and enable toggle reachable', async () => {
    mocks.skillsStore.skills = [buildSkill({ slug: 'skill-1' })];

    render(<Skills />);

    await waitFor(() => {
      expect(mocks.skillsStore.fetchSkills).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByTestId('skills-card-skill-1'));

    expect(screen.getByTestId('skills-detail-dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ClawHub' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'detail.openManual' })).toBeInTheDocument();

    const configTab = screen.getByRole('tab', { name: 'detail.config' });
    fireEvent.mouseDown(configTab);
    fireEvent.click(configTab);
    await waitFor(() => {
      expect(screen.getByTestId('skills-detail-save')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('skills-detail-enabled-toggle'));
    expect(mocks.skillsStore.disableSkill).toHaveBeenCalledWith('skill-1');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('skills-detail-dialog')).not.toBeInTheDocument();
  });

  it('keeps marketplace search and install actions reachable', async () => {
    mocks.skillsStore.searchResults = [buildMarketplaceSkill()];

    render(<Skills />);

    await waitFor(() => {
      expect(mocks.skillsStore.fetchSkills).toHaveBeenCalledTimes(1);
    });

    const marketplaceTab = screen.getByRole('tab', { name: 'tabs.marketplace' });
    fireEvent.mouseDown(marketplaceTab);
    fireEvent.click(marketplaceTab);
    await waitFor(() => {
      expect(screen.getByTestId('skills-marketplace-search-input')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('skills-marketplace-search-input');
    fireEvent.change(searchInput, { target: { value: 'beta' } });
    fireEvent.click(screen.getByTestId('skills-marketplace-search-submit'));

    expect(mocks.skillsStore.searchSkills).toHaveBeenCalledWith('beta');
    expect(screen.getByTestId('skills-marketplace-card-beta-skill')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('skills-marketplace-install-beta-skill'));
    expect(mocks.skillsStore.installSkill).toHaveBeenCalledWith('beta-skill');
    await waitFor(() => {
      expect(mocks.skillsStore.enableSkill).toHaveBeenCalledWith('beta-skill');
    });
  });

  it('renders loading, error, and empty state surfaces', async () => {
    mocks.skillsStore.loading = true;

    const { rerender } = render(<Skills />);
    expect(screen.getByTestId('skills-state-loading')).toBeInTheDocument();

    mocks.skillsStore.loading = false;
    mocks.skillsStore.error = 'gateway unavailable';
    rerender(<Skills />);
    expect(screen.getByTestId('skills-state-error')).toBeInTheDocument();

    mocks.skillsStore.error = null;
    mocks.skillsStore.skills = [];
    rerender(<Skills />);
    expect(screen.getByTestId('skills-state-empty')).toBeInTheDocument();
  });
});
