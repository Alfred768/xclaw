import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { ProfileSection } from '@/pages/Account/ProfileSection';
import { useAccountStore } from '@/stores/account';
import { useAuthStore } from '@/stores/auth';

describe('ProfileSection', () => {
  const internalUserId = '550e8400-e29b-41d4-a716-446655440000';
  const publicUserId = 'usr_9X4K2M7Q';

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });

    useAuthStore.setState({
      user: {
        id: internalUserId,
        publicId: publicUserId,
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
        id: internalUserId,
        public_id: publicUserId,
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
      quota: null,
      apiKeys: [],
      isLoading: false,
      updateProfile: vi.fn(),
      uploadAvatar: vi.fn(),
    }));
  });

  it('shows the public account id instead of the internal auth user id', () => {
    render(<ProfileSection />);

    expect(screen.getByText(publicUserId)).toBeInTheDocument();
    expect(screen.queryByText(internalUserId)).not.toBeInTheDocument();
  });
});
