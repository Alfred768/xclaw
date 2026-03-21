/**
 * Account State Store
 * Manages user account data including profile, quota, and API keys
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getCurrentAccessToken, supabase } from '@/lib/supabase';
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

let inFlightProfileFetch: Promise<void> | null = null;
let inFlightQuotaFetch: Promise<void> | null = null;

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      ...defaultState,

      fetchProfile: async () => {
        if (inFlightProfileFetch) {
          return inFlightProfileFetch;
        }

        inFlightProfileFetch = (async () => {
          set({ isLoading: true });

          try {
            const authUser = useAuthStore.getState().user;

            if (!authUser?.id) {
              set({ profile: null, isLoading: false });
              return;
            }

            const resolveAccessToken = async (forceRefresh = false) => {
              const accessToken = await getCurrentAccessToken({ forceRefresh });
              if (accessToken) {
                useAuthStore.getState().setAccessToken(accessToken);
              }

              return accessToken;
            };

            // Fetch fresh profile data from database via Edge Function
            // This ensures we get the latest subscription status after payment
            const accessToken = await resolveAccessToken();
            if (accessToken) {
              try {
                const fetchProfileResponse = (token: string) => fetch(
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-profile`,
                  {
                    method: 'GET',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    },
                  }
                );

                let response = await fetchProfileResponse(accessToken);
                if (response.status === 401) {
                  const refreshedAccessToken = await resolveAccessToken(true);
                  if (refreshedAccessToken && refreshedAccessToken !== accessToken) {
                    response = await fetchProfileResponse(refreshedAccessToken);
                  } else {
                    console.warn('get-profile retry skipped: no new validated token available');
                  }
                }

                if (response.ok) {
                  const data = await response.json();
                  if (data.profile) {
                    // Update auth store with fresh data
                    useAuthStore.getState().setUser({
                      ...authUser,
                      publicId: data.profile.public_id ?? authUser.publicId,
                      displayName: data.profile.display_name ?? authUser.displayName,
                      avatarUrl: data.profile.avatar_url ?? authUser.avatarUrl,
                      subscriptionTier: data.profile.subscription_tier,
                      isTrial: data.profile.is_trial,
                      trialEndsAt: data.profile.trial_ends_at,
                      subscriptionEndsAt: data.profile.subscription_ends_at,
                      alipayUserId: data.profile.alipay_user_id,
                      wechatOpenid: data.profile.wechat_openid,
                    });

                    set({ profile: data.profile as UserProfile, isLoading: false });
                    return;
                  }
                } else if (response.status === 401) {
                  console.warn('get-profile rejected the current session token');
                }
              } catch (e) {
                console.error('Error fetching profile from get-profile:', e);
                // Fall through to build from auth store
              }
            }

            // Fallback: Build profile from auth store data
            let avatarUrl = authUser.avatarUrl || '';
            if (!avatarUrl) {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
              if (supabaseUrl) {
                avatarUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${authUser.id}/avatar`;
              }
            }

            const profile: UserProfile = {
              id: authUser.id,
              public_id: authUser.publicId || '',
              display_name: authUser.displayName || 'User',
              avatar_url: avatarUrl,
              subscription_tier: authUser.subscriptionTier || 'free',
              is_trial: authUser.isTrial ?? false,
              trial_ends_at: authUser.trialEndsAt || null,
              subscription_ends_at: authUser.subscriptionEndsAt || null,
              alipay_user_id: authUser.alipayUserId || null,
              wechat_openid: authUser.wechatOpenid || null,
              yunwu_api_key: null,
              preferences: null,
              created_at: new Date().toISOString(),
            };

            set({ profile, isLoading: false });
          } catch (error) {
            console.error('Error fetching profile:', error);
            set({ isLoading: false });
          } finally {
            inFlightProfileFetch = null;
          }
        })();

        return inFlightProfileFetch;
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
        if (!profile) return null;

        set({ isLoading: true });

        try {
          const formData = new FormData();
          formData.append('file', file);

          const buildHeaders = (token: string | null) => {
            const headers: Record<string, string> = {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            };

            if (token) {
              headers.Authorization = `Bearer ${token}`;
            }

            return headers;
          };

          let accessToken = await getCurrentAccessToken({ forceRefresh: false });
          if (accessToken) {
            useAuthStore.getState().setAccessToken(accessToken);
          }

          const uploadAvatarRequest = (token: string | null) => fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-avatar`,
            {
              method: 'POST',
              headers: buildHeaders(token),
              body: formData,
            }
          );

          if (!accessToken) {
            console.warn('upload-avatar skipped because no validated session token is available');
            set({ isLoading: false });
            return null;
          }

          let response = await uploadAvatarRequest(accessToken);
          if (response.status === 401) {
            const refreshedAccessToken = await getCurrentAccessToken({ forceRefresh: true });
            if (refreshedAccessToken) {
              useAuthStore.getState().setAccessToken(refreshedAccessToken);
              response = await uploadAvatarRequest(refreshedAccessToken);
            }
          }

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
        if (inFlightQuotaFetch) {
          return inFlightQuotaFetch;
        }

        inFlightQuotaFetch = (async () => {
          try {
            if (!supabase) {
              console.warn('Supabase not configured');
              return;
            }

            const authUser = useAuthStore.getState().user;
            if (!authUser?.id) return;

            const { data, error } = await supabase
              .from('usage_quotas')
              .select('*')
              .eq('user_id', authUser.id)
              .single();

            if (error) {
              console.error('Error fetching quota:', error);
              return;
            }

            set({ quota: data as UsageQuota });
          } catch (error) {
            console.error('Error fetching quota:', error);
          } finally {
            inFlightQuotaFetch = null;
          }
        })();

        return inFlightQuotaFetch;
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

useAuthStore.subscribe((state, previousState) => {
  const nextUserId = state.user?.id ?? null;
  const previousUserId = previousState.user?.id ?? null;

  if (nextUserId === previousUserId) {
    return;
  }

  const { profile, quota, apiKeys, reset } = useAccountStore.getState();
  const hasStaleAccountState = profile !== null || quota !== null || apiKeys.length > 0;

  if (hasStaleAccountState && profile?.id !== nextUserId) {
    reset();
  }
});
