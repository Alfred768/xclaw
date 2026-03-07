/**
 * Account State Store
 * Manages user account data including profile, quota, and API keys
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import type { UserProfile, ApiKey, UsageQuota } from '@/types/database';

interface AccountState {
  // State
  profile: UserProfile | null;
  quota: UsageQuota | null;
  apiKeys: ApiKey[];
  isLoading: boolean;

  // Profile Actions
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;

  // Quota Actions
  fetchQuota: () => Promise<void>;

  // API Key Actions
  fetchApiKeys: () => Promise<void>;
  createApiKey: (name?: string) => Promise<string | null>;
  revokeApiKey: (keyId: string) => Promise<void>;

  // Reset
  reset: () => void;
}

const defaultState = {
  profile: null,
  quota: null,
  apiKeys: [],
  isLoading: false,
};

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      ...defaultState,

      fetchProfile: async () => {
        set({ isLoading: true });

        try {
          // Get user from auth store (set during OAuth login)
          // Use auth store data directly to avoid RLS issues
          // The get-session Edge Function already fetched profile with service_role
          const authUser = useAuthStore.getState().user;
          if (!authUser?.id) {
            set({ profile: null, isLoading: false });
            return;
          }

          // Build profile from auth store data
          // This avoids RLS issues since get-session already has the profile data
          const profile: UserProfile = {
            id: authUser.id,
            display_name: authUser.displayName || 'User',
            avatar_url: authUser.avatarUrl || '',
            subscription_tier: authUser.subscriptionTier || 'free',
            alipay_user_id: authUser.alipayUserId || null,
            wechat_openid: authUser.wechatOpenid || null,
            preferences: null,
            created_at: new Date().toISOString(),
          };

          set({ profile, isLoading: false });
        } catch (error) {
          console.error('Error building profile from auth store:', error);
          set({ isLoading: false });
        }
      },

      updateProfile: async (updates: Partial<UserProfile>) => {
        if (!supabase) {
          console.warn('Supabase not configured');
          return;
        }

        const { profile } = get();
        if (!profile) return;

        set({ isLoading: true });

        try {
          const { error } = await supabase
            .from('user_profiles')
            .update(updates)
            .eq('id', profile.id);

          if (error) {
            console.error('Error updating profile:', error);
            set({ isLoading: false });
            return;
          }

          set({
            profile: { ...profile, ...updates },
            isLoading: false,
          });
        } catch (error) {
          console.error('Error updating profile:', error);
          set({ isLoading: false });
        }
      },

      fetchQuota: async () => {
        if (!supabase) {
          console.warn('Supabase not configured');
          return;
        }

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data, error } = await supabase
            .from('usage_quotas')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (error) {
            console.error('Error fetching quota:', error);
            return;
          }

          set({ quota: data as UsageQuota });
        } catch (error) {
          console.error('Error fetching quota:', error);
        }
      },

      fetchApiKeys: async () => {
        if (!supabase) {
          console.warn('Supabase not configured');
          return;
        }

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data, error } = await supabase
            .from('api_keys')
            .select('id, key_prefix, name, last_used_at, created_at, is_active')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching API keys:', error);
            return;
          }

          set({ apiKeys: (data || []) as ApiKey[] });
        } catch (error) {
          console.error('Error fetching API keys:', error);
        }
      },

      createApiKey: async (name?: string) => {
        if (!supabase) {
          console.warn('Supabase not configured');
          return null;
        }

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.error('No active session');
            return null;
          }

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-api-key`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ name }),
            }
          );

          if (!response.ok) {
            const error = await response.json();
            console.error('Error creating API key:', error);
            return null;
          }

          const result = await response.json();

          // Refresh the API keys list
          await get().fetchApiKeys();

          return result.key;
        } catch (error) {
          console.error('Error creating API key:', error);
          return null;
        }
      },

      revokeApiKey: async (keyId: string) => {
        if (!supabase) {
          console.warn('Supabase not configured');
          return;
        }

        try {
          const { error } = await supabase
            .from('api_keys')
            .update({ is_active: false })
            .eq('id', keyId);

          if (error) {
            console.error('Error revoking API key:', error);
            return;
          }

          // Refresh the API keys list
          await get().fetchApiKeys();
        } catch (error) {
          console.error('Error revoking API key:', error);
        }
      },

      reset: () => {
        set(defaultState);
      },
    }),
    {
      name: 'clawx-account',
      partialize: (state) => ({
        // Only persist minimal data
        profile: state.profile,
        quota: state.quota,
      }),
    }
  )
);
