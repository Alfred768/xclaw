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
      const { data, error } = await supabase
        .from('auth_sessions')
        .select('*')
        .eq('login_token', loginToken)
        .single();

      if (data && !error) {
        console.log('[Poll] Session status:', data.status);
        onUpdate(data as AuthSessionStatus);

        // Stop polling if completed, expired, or error
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
  if (!supabase) {
    console.error('Supabase not configured');
    return () => {};
  }

  console.log('[Supabase] Setting up realtime subscription + polling for token:', loginToken?.substring(0, 8) + '...');

  let isCompleted = false;

  // Wrapper to prevent duplicate updates after completion
  const handleUpdate = (status: AuthSessionStatus) => {
    if (isCompleted) return;
    if (['completed', 'expired', 'error'].includes(status.status)) {
      isCompleted = true;
    }
    onUpdate(status);
  };

  // 1. First, immediately check current status
  supabase
    .from('auth_sessions')
    .select('*')
    .eq('login_token', loginToken)
    .single()
    .then(({ data }) => {
      if (data) {
        console.log('[Supabase] Initial status check:', data.status);
        if (['completed', 'expired', 'error'].includes(data.status)) {
          handleUpdate(data as AuthSessionStatus);
          return; // Already done, no need to subscribe
        }
      }
    });

  // 2. Set up Realtime subscription
  const channel = supabase
    .channel(`auth-session-${loginToken}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'auth_sessions',
        filter: `login_token=eq.${loginToken}`,
      },
      (payload) => {
        console.log('[Supabase] Received realtime update:', payload);
        handleUpdate(payload.new as AuthSessionStatus);
      }
    )
    .subscribe((status) => {
      console.log('[Supabase] Subscription status:', status);
    });

  // 3. Start polling as backup
  const stopPolling = pollAuthSession(loginToken, handleUpdate);

  // Return cleanup function that stops both Realtime and polling
  return () => {
    console.log('[Supabase] Unsubscribing from channel and stopping polling');
    supabase.removeChannel(channel);
    stopPolling();
  };
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
 * @param userId - Optional current user ID for binding provider to existing account
 */
export async function initAuthSession(provider: 'wechat' | 'alipay', userId?: string): Promise<{
  loginToken: string;
  oauthUrl: string;
} | null> {
  if (!supabase) {
    console.error('Supabase not configured');
    return null;
  }

  try {
    const response = await fetch('/api/auth-init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ provider, userId }),
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
