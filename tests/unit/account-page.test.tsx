import { fireEvent, render, screen } from '@testing-library/react';
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
});
