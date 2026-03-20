/**
 * Supabase Client Configuration
 * Handles authentication and realtime subscriptions
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not configured. Auth features will be disabled.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

async function isAccessTokenValid(token: string): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return false;
  }

  return true;
}

export async function getCurrentAccessToken(options: { forceRefresh?: boolean } = {}): Promise<string | null> {
  if (!supabase) {
    return null;
  }

  try {
    if (!options.forceRefresh) {
      const { data: { session } } = await supabase.auth.getSession();
      const now = Math.floor(Date.now() / 1000);

      if (
        session?.access_token &&
        (!session.expires_at || session.expires_at > now + 30) &&
        await isAccessTokenValid(session.access_token)
      ) {
        return session.access_token;
      }
    }

    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('[Supabase] Failed to refresh session:', error);
      return null;
    }

    if (!session?.access_token) {
      return null;
    }

    const isValidRefreshedToken = await isAccessTokenValid(session.access_token);
    if (!isValidRefreshedToken) {
      return null;
    }

    return session.access_token;
  } catch (error) {
    console.error('[Supabase] Failed to resolve access token:', error);
    return null;
  }
}

/**
 * Poll for auth session status as fallback
 * This ensures we detect completion even if Realtime fails
 */
export function pollAuthSession(
  loginToken: string,
  onUpdate: (status: AuthSessionStatus) => void,
  intervalMs = 1000,
  maxAttempts = 300 // 5 minutes max
): () => void {
  let attempts = 0;
  let stopped = false;

  const poll = async () => {
    if (stopped) return;

    try {
      const response = await fetch(`/api/auth-session-status?token=${encodeURIComponent(loginToken)}`, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[Poll] Session status:', data.status);
        onUpdate(data as AuthSessionStatus);

        if (['completed', 'expired', 'error'].includes(data.status)) {
          stopped = true;
          return;
        }
      }
    } catch (err) {
      console.error('[Poll] Error:', err);
    }

    attempts++;
    if (attempts < maxAttempts && !stopped) {
      setTimeout(poll, intervalMs);
    }
  };

  poll();

  return () => {
    stopped = true;
  };
}

/**
 * Subscribe to auth session changes using Realtime + Polling
 * This dual approach ensures reliability even if WebSocket fails
 */
export function subscribeToAuthSession(
  loginToken: string,
  onUpdate: (status: AuthSessionStatus) => void
): () => void {
  console.log('[Supabase] Polling auth session status for token:', loginToken?.substring(0, 8) + '...');
  return pollAuthSession(loginToken, onUpdate);
}

/**
 * Auth session status type
 */
export interface AuthSessionStatus {
  id: string;
  login_token: string;
  provider: 'wechat' | 'alipay';
  status: 'pending' | 'completed' | 'expired' | 'error';
  provider_user_id?: string;
  user_info?: {
    nickname?: string;
    avatar?: string;
  };
  supabase_user_id?: string;
  session_token?: string;
  created_at: string;
  expires_at: string;
  completed_at?: string;
}

/**
 * Initialize auth session
 * @param provider - OAuth provider (wechat or alipay)
 * @param accessToken - Optional session token used to bind a provider to the current account
 */
export async function initAuthSession(provider: 'wechat' | 'alipay', accessToken?: string): Promise<{
  loginToken: string;
  oauthUrl: string;
} | null> {
  if (!supabase) {
    console.error('Supabase not configured');
    return null;
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch('/api/auth-init', {
      method: 'POST',
      headers,
      body: JSON.stringify({ provider }),
    });

    if (!response.ok) {
      throw new Error('Failed to initialize auth session');
    }

    return await response.json();
  } catch (error) {
    console.error('Error initializing auth session:', error);
    return null;
  }
}

/**
 * Get session token after auth completion
 */
export async function getSessionToken(loginToken: string): Promise<{
  sessionToken: string;
  refreshToken?: string;
  expiresIn?: string;
  user: {
    id: string;
    public_id?: string;
    email?: string;
    display_name?: string;
    avatar_url?: string;
  };
} | null> {
  if (!supabase) {
    console.error('Supabase not configured');
    return null;
  }

  try {
    const response = await fetch(`/api/get-session?token=${loginToken}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to get session token');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting session token:', error);
    return null;
  }
}
