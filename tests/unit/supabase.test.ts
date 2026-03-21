import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.fn();
const mockGetUser = vi.fn();
const mockRefreshSession = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: mockGetSession,
      getUser: mockGetUser,
      refreshSession: mockRefreshSession,
    },
  })),
}));

describe('getCurrentAccessToken', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
  });

  it('refreshes the session when the cached access token is rejected by auth', async () => {
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600;

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'stale-token',
          expires_at: futureExpiry,
        },
      },
    });

    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid JWT' },
    });
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    mockRefreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'fresh-token',
          expires_at: futureExpiry,
        },
      },
      error: null,
    });

    const { getCurrentAccessToken } = await import('@/lib/supabase');
    const accessToken = await getCurrentAccessToken({ forceRefresh: false });

    expect(accessToken).toBe('fresh-token');
    expect(mockGetUser).toHaveBeenCalledWith('stale-token');
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
  });

  it('rejects refreshed tokens that still fail auth validation', async () => {
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600;

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'stale-token',
          expires_at: futureExpiry,
        },
      },
    });

    mockGetUser
      .mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid JWT' },
      })
      .mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid refreshed JWT' },
      });

    mockRefreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'still-bad-token',
          expires_at: futureExpiry,
        },
      },
      error: null,
    });

    const { getCurrentAccessToken } = await import('@/lib/supabase');
    const accessToken = await getCurrentAccessToken({ forceRefresh: false });

    expect(accessToken).toBeNull();
    expect(mockGetUser).toHaveBeenNthCalledWith(1, 'stale-token');
    expect(mockGetUser).toHaveBeenNthCalledWith(2, 'still-bad-token');
  });
});
