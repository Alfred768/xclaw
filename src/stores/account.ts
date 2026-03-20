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
  uploadAvatar: (file: File) => Promise<string | null>;

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

          // Get avatar URL - use from auth store, or construct from Storage
          let avatarUrl = authUser.avatarUrl || '';
          if (!avatarUrl) {
            // Try to construct public URL from Storage (fixed filename: {userId}/avatar)
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            if (supabaseUrl) {
              avatarUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${authUser.id}/avatar`;
            }
          }

          // Build profile from auth store data
          // This avoids RLS issues since get-session already has the profile data
          const profile: UserProfile = {
            id: authUser.id,
            display_name: authUser.displayName || 'User',
            avatar_url: avatarUrl,
            subscription_tier: authUser.subscriptionTier || 'free',
            is_trial: authUser.isTrial ?? false,
            trial_ends_at: authUser.trialEndsAt || null,
            subscription_ends_at: authUser.subscriptionEndsAt || null,
            alipay_user_id: authUser.alipayUserId || null,
            wechat_openid: authUser.wechatOpenid || null,
            yunwu_api_key: null, // Not stored in auth store for security
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

      uploadAvatar: async (file: File): Promise<string | null> => {
        const { profile } = get();
        const accessToken = useAuthStore.getState().accessToken;
        if (!profile) return null;

        set({ isLoading: true });

        try {
          const formData = new FormData();
          formData.append('file', file);

          const headers: Record<string, string> = {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          };

          // Add Authorization header if we have a token
          if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
          }

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-avatar?user_id=${profile.id}`,
            {
              method: 'POST',
              headers,
              body: formData,
            }
          );

          if (!response.ok) {
            const error = await response.json();
            console.error('Error uploading avatar:', error);
            set({ isLoading: false });
            return null;
          }

          const result = await response.json();

          // Update local profile state
          set({
            profile: { ...profile, avatar_url: result.avatarUrl },
            isLoading: false,
          });

          // Sync with auth store
          const authUser = useAuthStore.getState().user;
          if (authUser) {
            useAuthStore.getState().setUser({
              ...authUser,
              avatarUrl: result.avatarUrl,
            });
          }

          return result.avatarUrl;
        } catch (error) {
          console.error('Error uploading avatar:', error);
          set({ isLoading: false });
          return null;
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
