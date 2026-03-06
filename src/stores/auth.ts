/**
 * Authentication State Store
 * Manages user authentication state
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, subscribeToAuthSession, initAuthSession, getSessionToken } from '@/lib/supabase';

export type AuthProvider = 'wechat' | 'alipay';

export interface AuthUser {
  id: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
}

interface AuthState {
  // User state
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;

  // Auth flow state
  authProvider: AuthProvider | null;
  loginToken: string | null;
  oauthUrl: string | null;
  authStatus: 'idle' | 'pending' | 'scanning' | 'completed' | 'expired' | 'error';

  // Actions
  login: (provider: AuthProvider) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  setUser: (user: AuthUser | null) => void;
  setAccessToken: (token: string | null) => void;

  // Auth flow actions
  initAuthFlow: (provider: AuthProvider) => Promise<{ oauthUrl: string } | null>;
  subscribeToAuth: (onComplete: (user: AuthUser) => void) => (() => void) | null;
  completeAuthFlow: () => Promise<AuthUser | null>;
  resetAuthFlow: () => void;
}

const defaultAuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  accessToken: null,
  authProvider: null,
  loginToken: null,
  oauthUrl: null,
  authStatus: 'idle' as const,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...defaultAuthState,

      login: async (provider: AuthProvider) => {
        set({ isLoading: true });

        try {
          const result = await initAuthSession(provider);
          if (!result) {
            set({ isLoading: false, authStatus: 'error' });
            return false;
          }

          set({
            loginToken: result.loginToken,
            oauthUrl: result.oauthUrl,
            authProvider: provider,
            authStatus: 'scanning',
            isLoading: false,
          });

          return true;
        } catch (error) {
          console.error('Login error:', error);
          set({ isLoading: false, authStatus: 'error' });
          return false;
        }
      },

      logout: async () => {
        set({ isLoading: true });

        try {
          if (supabase) {
            await supabase.auth.signOut();
          }
        } catch (error) {
          console.error('Logout error:', error);
        }

        set({
          ...defaultAuthState,
        });
      },

      refreshSession: async () => {
        if (!supabase) {
          return false;
        }

        try {
          const { data: { session }, error } = await supabase.auth.refreshSession();

          if (error || !session) {
            return false;
          }

          set({
            accessToken: session.access_token,
            isAuthenticated: true,
          });

          return true;
        } catch (error) {
          console.error('Session refresh error:', error);
          return false;
        }
      },

      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      },

      setAccessToken: (token) => {
        set({ accessToken: token });
      },

      initAuthFlow: async (provider: AuthProvider) => {
        set({ isLoading: true, authProvider: provider });

        try {
          const result = await initAuthSession(provider);
          if (!result) {
            set({ isLoading: false, authStatus: 'error' });
            return null;
          }

          set({
            loginToken: result.loginToken,
            oauthUrl: result.oauthUrl,
            authStatus: 'pending',
            isLoading: false,
          });

          return { oauthUrl: result.oauthUrl };
        } catch (error) {
          console.error('Auth flow init error:', error);
          set({ isLoading: false, authStatus: 'error' });
          return null;
        }
      },

      subscribeToAuth: (onComplete: (user: AuthUser) => void) => {
        const { loginToken } = get();
        console.log('[AuthStore] subscribeToAuth called, loginToken:', loginToken?.substring(0, 8) + '...');

        if (!loginToken) {
          console.error('[AuthStore] No loginToken, cannot subscribe');
          return null;
        }

        set({ authStatus: 'scanning' });

        const unsubscribe = subscribeToAuthSession(loginToken, (status) => {
          console.log('[AuthStore] Received status update:', status);

          if (status.status === 'completed') {
            console.log('[AuthStore] Auth completed, calling onComplete callback');
            set({ authStatus: 'completed' });
            // Call the passed callback function
            onComplete(status as unknown as AuthUser);
          } else if (status.status === 'expired') {
            set({ authStatus: 'expired' });
          } else if (status.status === 'error') {
            set({ authStatus: 'error' });
          }
        });

        return unsubscribe;
      },

      completeAuthFlow: async () => {
        const { loginToken } = get();
        if (!loginToken) {
          return null;
        }

        set({ isLoading: true });

        try {
          const result = await getSessionToken(loginToken);
          if (!result) {
            set({ isLoading: false, authStatus: 'error' });
            return null;
          }

          const user: AuthUser = {
            id: result.user.id,
            email: result.user.email,
            displayName: result.user.display_name,
            avatarUrl: result.user.avatar_url,
            subscriptionTier: 'free',
          };

          set({
            user,
            accessToken: result.sessionToken,
            isAuthenticated: true,
            isLoading: false,
            authStatus: 'completed',
            // 清除 OAuth 流程相关的临时数据，防止 useEffect 重新触发订阅
            oauthUrl: null,
            loginToken: null,
          });

          return user;
        } catch (error) {
          console.error('Complete auth flow error:', error);
          set({ isLoading: false, authStatus: 'error' });
          return null;
        }
      },

      resetAuthFlow: () => {
        set({
          authProvider: null,
          loginToken: null,
          oauthUrl: null,
          authStatus: 'idle',
          isLoading: false,
        });
      },
    }),
    {
      name: 'clawx-auth',
      partialize: (state) => ({
        // Only persist essential auth data, not the flow state
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
      }),
    }
  )
);
