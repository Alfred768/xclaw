import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  initAuthSession: vi.fn(),
  subscribeToAuthSession: vi.fn(),
  getSessionToken: vi.fn(),
  setSession: vi.fn(),
  signOut: vi.fn(),
  navigate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      setSession: mocks.setSession,
      signOut: mocks.signOut,
    },
  },
  initAuthSession: mocks.initAuthSession,
  subscribeToAuthSession: mocks.subscribeToAuthSession,
  getSessionToken: mocks.getSessionToken,
}));

import { SecuritySection } from '@/pages/Account/SecuritySection';
import { useAccountStore } from '@/stores/account';
import { useAuthStore } from '@/stores/auth';

describe('SecuritySection', () => {
  beforeEach(() => {
    mocks.initAuthSession.mockReset();
    mocks.subscribeToAuthSession.mockReset();
    mocks.getSessionToken.mockReset();
    mocks.setSession.mockReset();
    mocks.signOut.mockReset();
    mocks.navigate.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.setSession.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue(undefined);

    useAuthStore.setState({
      user: {
        id: 'user-1',
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

    const fetchProfile = vi.fn(async () => {
      const authUser = useAuthStore.getState().user;

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
          alipay_user_id: authUser?.alipayUserId ?? null,
          wechat_openid: authUser?.wechatOpenid ?? null,
          yunwu_api_key: null,
          preferences: null,
          created_at: '2026-03-17T00:00:00.000Z',
        },
      }));
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
      },
      quota: null,
      apiKeys: [],
      isLoading: false,
      fetchProfile,
    }));

    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('refreshes account binding state after the auth session completes', async () => {
    let onStatusChange: ((status: { status: 'completed' | 'pending' | 'error' | 'expired' }) => void) | null = null;

    mocks.initAuthSession.mockResolvedValue({
      loginToken: 'bind-token',
      oauthUrl: 'https://example.com/alipay',
    });
    mocks.subscribeToAuthSession.mockImplementation((_loginToken: string, callback: typeof onStatusChange) => {
      onStatusChange = callback;
      return vi.fn();
    });
    mocks.getSessionToken.mockResolvedValue({
      sessionToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      user: {
        id: 'user-1',
        public_id: 'usr_TEST123',
        email: 'user@example.com',
        display_name: 'First User',
        avatar_url: '',
        subscription_tier: 'free',
        is_trial: false,
        trial_ends_at: null,
        subscription_ends_at: null,
        alipay_user_id: 'alipay-user-1',
        wechat_openid: null,
      },
    });

    render(<SecuritySection />);

    fireEvent.click(screen.getByRole('button', { name: 'security.bind' }));

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith(
        'https://example.com/alipay',
        '_blank',
        'width=600,height=700'
      );
    });

    await waitFor(() => {
      expect(mocks.subscribeToAuthSession).toHaveBeenCalledWith(
        'bind-token',
        expect.any(Function)
      );
    });

    await act(async () => {
      onStatusChange?.({ status: 'completed' });
    });

    await waitFor(() => {
      expect(mocks.getSessionToken).toHaveBeenCalledWith('bind-token');
    });

    await waitFor(() => {
      expect(useAccountStore.getState().fetchProfile).toHaveBeenCalledTimes(1);
    });

    expect(screen.getAllByText('security.alipayBound').length).toBeGreaterThan(0);
  });

  it('redirects to /setup after logout', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<SecuritySection />);

    fireEvent.click(screen.getByRole('button', { name: 'security.logout' }));

    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalledTimes(1);
    });

    expect(mocks.navigate).toHaveBeenCalledWith('/setup');
  });
});
