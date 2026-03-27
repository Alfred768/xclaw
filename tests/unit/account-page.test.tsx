import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  fetchProfile: vi.fn(),
  fetchQuota: vi.fn(),
  fetchApiKeys: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

import { Account } from '@/pages/Account';
import { AccountStatePanel } from '@/pages/Account/components/AccountStatePanel';
import { useAccountStore } from '@/stores/account';
import { useAuthStore } from '@/stores/auth';

describe('Account page', () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.fetchProfile.mockReset();
    mocks.fetchQuota.mockReset();
    mocks.fetchApiKeys.mockReset();

    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      authProvider: null,
      loginToken: null,
      oauthUrl: null,
      authStatus: 'idle',
    });

    useAccountStore.setState((state) => ({
      ...state,
      profile: null,
      quota: null,
      apiKeys: [],
      isLoading: false,
      fetchProfile: mocks.fetchProfile,
      fetchQuota: mocks.fetchQuota,
      fetchApiKeys: mocks.fetchApiKeys,
    }));
  });

  it('shows a login-required fallback and routes to /setup when unauthenticated', () => {
    render(<Account />);

    expect(screen.getByText('Please sign in to manage your account')).toBeInTheDocument();
    expect(screen.queryByText('tabs.profile')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Go to Sign In' }));

    expect(mocks.navigate).toHaveBeenCalledWith('/setup');
    expect(mocks.fetchProfile).not.toHaveBeenCalled();
    expect(mocks.fetchQuota).not.toHaveBeenCalled();
    expect(mocks.fetchApiKeys).not.toHaveBeenCalled();
  });

  it('uses section-first layout and keeps profile/security/developer/usage reachable when authenticated', async () => {
    useAuthStore.setState({
      user: {
        id: 'user-1',
        publicId: 'usr_TEST123',
        displayName: 'First User',
        subscriptionTier: 'free',
        alipayUserId: null,
        wechatOpenid: null,
      },
      isAuthenticated: true,
      isLoading: false,
      accessToken: 'access-token',
      authProvider: null,
      loginToken: null,
      oauthUrl: null,
      authStatus: 'idle',
    });

    useAccountStore.setState((state) => ({
      ...state,
      profile: {
        id: 'user-1',
        public_id: 'usr_TEST123',
        display_name: 'First User',
        avatar_url: '',
        subscription_tier: 'free',
        is_trial: false,
        trial_ends_at: null,
        subscription_ends_at: null,
        alipay_user_id: null,
        wechat_openid: null,
        yunwu_api_key: null,
        preferences: null,
        created_at: '2026-03-17T00:00:00.000Z',
      } as never,
      quota: {
        id: 'quota-1',
        user_id: 'user-1',
        tokens_used: 12,
        total_tokens_quota: 100,
        billing_cycle_start: '2026-03-01T00:00:00.000Z',
        billing_cycle_end: '2026-04-01T00:00:00.000Z',
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-17T00:00:00.000Z',
      } as never,
      apiKeys: [],
    }));

    render(<Account />);

    await waitFor(() => {
      expect(mocks.fetchProfile).toHaveBeenCalledTimes(1);
      expect(mocks.fetchQuota).toHaveBeenCalledTimes(1);
      expect(mocks.fetchApiKeys).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Account sections' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'tabs.profile' })).toHaveAttribute('href', '#account-profile');
    expect(screen.getByRole('link', { name: 'tabs.security' })).toHaveAttribute('href', '#account-security');
    expect(screen.getByRole('link', { name: 'tabs.developer' })).toHaveAttribute('href', '#account-developer');
    expect(screen.getByRole('link', { name: 'Usage' })).toHaveAttribute('href', '#account-usage');

    expect(screen.getByTestId('account-section-profile')).toBeInTheDocument();
    expect(screen.getByTestId('account-section-security')).toBeInTheDocument();
    expect(screen.getByTestId('account-section-developer')).toBeInTheDocument();
    expect(screen.getByTestId('account-section-usage')).toBeInTheDocument();
  });

  it('keeps account state panel content readable under long copy', () => {
    render(
      <AccountStatePanel
        state="error"
        title="A very long account-state message that should wrap and stay readable in narrow widths"
        description="Another long sentence to ensure controls do not get pushed away when localized strings are long."
        action={<button type="button">Retry</button>}
      />
    );

    expect(screen.getByTestId('account-state-panel-content')).toHaveClass('min-w-0');
    expect(screen.getByTestId('account-state-panel-action')).toHaveClass('shrink-0');
  });
});
