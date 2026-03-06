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
 * Subscribe to auth session changes
 */
export function subscribeToAuthSession(
  loginToken: string,
  onUpdate: (status: AuthSessionStatus) => void
): () => void {
  if (!supabase) {
    console.error('Supabase not configured');
    return () => {};
  }

  console.log('[Supabase] Setting up realtime subscription for token:', loginToken?.substring(0, 8) + '...');

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
        onUpdate(payload.new as AuthSessionStatus);
      }
    )
    .subscribe((status) => {
      console.log('[Supabase] Subscription status:', status);
    });

  return () => {
    console.log('[Supabase] Unsubscribing from channel');
    supabase.removeChannel(channel);
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
 */
export async function initAuthSession(provider: 'wechat' | 'alipay'): Promise<{
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
