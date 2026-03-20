/**
 * Zustand Stores Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: null,
  subscribeToAuthSession: vi.fn(),
  initAuthSession: vi.fn(),
  getSessionToken: vi.fn(),
  getCurrentAccessToken: vi.fn(),
}));

import { getCurrentAccessToken, initAuthSession } from '@/lib/supabase';
import { useSettingsStore } from '@/stores/settings';
import { useGatewayStore } from '@/stores/gateway';
import { useAuthStore } from '@/stores/auth';
import { useAccountStore } from '@/stores/account';

describe('Settings Store', () => {
  beforeEach(() => {
    // Reset store to default state
    useSettingsStore.setState({
      theme: 'system',
      language: 'en',
      sidebarCollapsed: false,
      devModeUnlocked: false,
      gatewayAutoStart: true,
      gatewayPort: 18789,
      autoCheckUpdate: true,
      autoDownloadUpdate: false,
      startMinimized: false,
      launchAtStartup: false,
      updateChannel: 'stable',
    });
  });
  
  it('should have default values', () => {
    const state = useSettingsStore.getState();
    expect(state.theme).toBe('system');
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.gatewayAutoStart).toBe(true);
  });
  
  it('should update theme', () => {
    const { setTheme } = useSettingsStore.getState();
    setTheme('dark');
    expect(useSettingsStore.getState().theme).toBe('dark');
  });
  
  it('should toggle sidebar collapsed state', () => {
    const { setSidebarCollapsed } = useSettingsStore.getState();
    setSidebarCollapsed(true);
    expect(useSettingsStore.getState().sidebarCollapsed).toBe(true);
  });
  
  it('should unlock dev mode', () => {
    const { setDevModeUnlocked } = useSettingsStore.getState();
    setDevModeUnlocked(true);
    expect(useSettingsStore.getState().devModeUnlocked).toBe(true);
  });
});

describe('Gateway Store', () => {
  beforeEach(() => {
    // Reset store
    useGatewayStore.setState({
      status: { state: 'stopped', port: 18789 },
      isInitialized: false,
    });
  });
  
  it('should have default status', () => {
    const state = useGatewayStore.getState();
    expect(state.status.state).toBe('stopped');
    expect(state.status.port).toBe(18789);
  });
  
  it('should update status', () => {
    const { setStatus } = useGatewayStore.getState();
    setStatus({ state: 'running', port: 18789, pid: 12345 });
    
    const state = useGatewayStore.getState();
    expect(state.status.state).toBe('running');
    expect(state.status.pid).toBe(12345);
  });
});

describe('Auth and Account Store', () => {
  beforeEach(() => {
    vi.mocked(initAuthSession).mockReset();
    vi.mocked(getCurrentAccessToken).mockReset();
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

    useAccountStore.setState({
      profile: null,
      quota: null,
      apiKeys: [],
      isLoading: false,
    });
  });

  it('uses the current access token when initializing an authenticated auth flow', async () => {
    vi.mocked(initAuthSession).mockResolvedValue({
      loginToken: 'bind-token',
      oauthUrl: 'https://example.com/alipay',
    });

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

    await useAuthStore.getState().initAuthFlow('alipay');

    expect(initAuthSession).toHaveBeenCalledWith('alipay', 'access-token');
  });

  it('uploads avatars without putting the internal user id in the request URL', async () => {
    vi.mocked(getCurrentAccessToken).mockResolvedValue('access-token');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ avatarUrl: 'https://cdn.example.com/avatar.png' }),
    });
    vi.stubGlobal('fetch', fetchMock);

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
    }));

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    await useAccountStore.getState().uploadAvatar(file);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/functions/v1/upload-avatar');
    expect(url).not.toContain('user_id=');
    expect(options.headers).toMatchObject({
      Authorization: 'Bearer access-token',
    });
  });

  it('fetches profile with the current Supabase session token and retries after a 401', async () => {
    vi.mocked(getCurrentAccessToken)
      .mockResolvedValueOnce('stale-token')
      .mockResolvedValueOnce('fresh-token');

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          profile: {
            id: 'user-1',
            public_id: 'usr_TEST123',
            display_name: 'First User',
            avatar_url: 'https://cdn.example.com/avatar.png',
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
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

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
      accessToken: null,
      authProvider: null,
      loginToken: null,
      oauthUrl: null,
      authStatus: 'idle',
    });

    await useAccountStore.getState().fetchProfile();

    expect(getCurrentAccessToken).toHaveBeenNthCalledWith(1, { forceRefresh: false });
    expect(getCurrentAccessToken).toHaveBeenNthCalledWith(2, { forceRefresh: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Authorization: 'Bearer stale-token',
      }),
    });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Authorization: 'Bearer fresh-token',
      }),
    });
    expect(useAuthStore.getState().accessToken).toBe('fresh-token');
    expect(useAccountStore.getState().profile?.public_id).toBe('usr_TEST123');
  });

  it('does not call get-profile when no validated Supabase session token is available', async () => {
    vi.mocked(getCurrentAccessToken).mockResolvedValue(null);

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    useAuthStore.setState({
      user: {
        id: 'user-1',
        publicId: 'usr_TEST123',
        displayName: 'First User',
        avatarUrl: '',
        subscriptionTier: 'free',
        alipayUserId: null,
        wechatOpenid: null,
      },
      isAuthenticated: true,
      isLoading: false,
      accessToken: 'stale-token',
      authProvider: null,
      loginToken: null,
      oauthUrl: null,
      authStatus: 'idle',
    });

    await useAccountStore.getState().fetchProfile();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(useAccountStore.getState().profile?.public_id).toBe('usr_TEST123');
  });

  it('deduplicates concurrent profile fetches', async () => {
    vi.mocked(getCurrentAccessToken).mockResolvedValue('fresh-token');

    let resolveResponse: ((value: unknown) => void) | null = null;
    const fetchMock = vi.fn().mockImplementation(() => new Promise((resolve) => {
      resolveResponse = resolve;
    }));
    vi.stubGlobal('fetch', fetchMock);

    useAuthStore.setState({
      user: {
        id: 'user-1',
        publicId: 'usr_TEST123',
        displayName: 'First User',
        avatarUrl: '',
        subscriptionTier: 'free',
        alipayUserId: null,
        wechatOpenid: null,
      },
      isAuthenticated: true,
      isLoading: false,
      accessToken: null,
      authProvider: null,
      loginToken: null,
      oauthUrl: null,
      authStatus: 'idle',
    });

    const firstFetch = useAccountStore.getState().fetchProfile();
    const secondFetch = useAccountStore.getState().fetchProfile();

    await Promise.resolve();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveResponse?.({
      ok: true,
      status: 200,
      json: async () => ({
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
      }),
    });

    await Promise.all([firstFetch, secondFetch]);
    expect(useAccountStore.getState().profile?.public_id).toBe('usr_TEST123');
  });

  it('does not retry get-profile when refresh returns the same token', async () => {
    vi.mocked(getCurrentAccessToken)
      .mockResolvedValueOnce('same-token')
      .mockResolvedValueOnce('same-token');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    useAuthStore.setState({
      user: {
        id: 'user-1',
        publicId: 'usr_TEST123',
        displayName: 'First User',
        avatarUrl: '',
        subscriptionTier: 'free',
        alipayUserId: null,
        wechatOpenid: null,
      },
      isAuthenticated: true,
      isLoading: false,
      accessToken: null,
      authProvider: null,
      loginToken: null,
      oauthUrl: null,
      authStatus: 'idle',
    });

    await useAccountStore.getState().fetchProfile();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        Authorization: 'Bearer same-token',
      }),
    });
  });

  it('should clear persisted account state on logout', async () => {
    useAuthStore.setState({
      user: {
        id: 'user-1',
        displayName: 'First User',
        subscriptionTier: 'free',
        alipayUserId: null,
        wechatOpenid: null,
      },
      isAuthenticated: true,
      accessToken: 'access-token',
    });

    useAccountStore.setState({
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
      quota: {
        id: 'quota-1',
        user_id: 'user-1',
        daily_limit: 100,
        daily_used: 10,
        monthly_limit: 1000,
        monthly_used: 100,
        reset_at: '2026-03-18T00:00:00.000Z',
      },
      apiKeys: [
        {
          id: 'key-1',
          user_id: 'user-1',
          name: 'Default Key',
          key_prefix: 'clawx_',
          key_hash: 'hash',
          is_active: true,
          last_used_at: null,
          expires_at: null,
          created_at: '2026-03-17T00:00:00.000Z',
        },
      ],
    } as never);

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAccountStore.getState().profile).toBeNull();
    expect(useAccountStore.getState().quota).toBeNull();
    expect(useAccountStore.getState().apiKeys).toEqual([]);
  });
});
