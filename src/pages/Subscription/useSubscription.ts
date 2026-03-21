/**
 * Custom hook for Subscription page logic
 * Handles API calls, state management, and utility functions
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAccountStore } from '@/stores/account';
import { useAuthStore } from '@/stores/auth';
import { useProviderStore } from '@/stores/providers';
import { createPayment, pollPaymentStatus } from '@/lib/payment';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { PlanId, SubscriptionPlan, YunwuToken, AvailableModels, TrialClaimResult, TrialConfig, PaymentStatus } from './types';

// Trial config for display
export const TRIAL_CONFIG: TrialConfig = {
  quota: 100000, // 10万 tokens
  durationDays: 7,
};

export function useSubscription() {
  const { t, i18n } = useTranslation('subscription');
  const { quota, profile, fetchProfile, fetchQuota } = useAccountStore();
  const { accessToken } = useAuthStore();
  const { providers, addProvider, updateProviderWithKey, setDefaultProvider, fetchProviders } = useProviderStore();

  const SUBSCRIPTION_PLANS: Record<PlanId, SubscriptionPlan> = useMemo(() => ({
    free: {
      id: 'free',
      name: t('plan.free.name'),
      price: 0,
      priceText: t('plan.free.priceText'),
      period: t('plan.free.period'),
      tokens: 1000000,
      tokensText: t('plan.free.tokensText'),
      features: [
        t('plan.free.features.f1'),
        t('plan.free.features.f2'),
        t('plan.free.features.f3'),
      ],
    },
    monthly: {
      id: 'monthly',
      name: t('plan.monthly.name'),
      price: 29.9,
      priceText: t('plan.monthly.priceText'),
      period: t('plan.monthly.period'),
      tokens: 10000000,
      tokensText: t('plan.monthly.tokensText'),
      features: [
        t('plan.monthly.features.f1'),
        t('plan.monthly.features.f2'),
        t('plan.monthly.features.f3'),
      ],
      popular: true,
    },
    yearly: {
      id: 'yearly',
      name: t('plan.yearly.name'),
      price: 299,
      priceText: t('plan.yearly.priceText'),
      period: t('plan.yearly.period'),
      tokens: 130000000,
      tokensText: t('plan.yearly.tokensText'),
      features: [
        t('plan.yearly.features.f1'),
        t('plan.yearly.features.f2'),
        t('plan.yearly.features.f3'),
        t('plan.yearly.features.f4'),
      ],
      savings: t('plan.yearly.savings'),
    },
  }), [t]);

  // Payment state
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Yunwu token state
  const [yunwuToken, setYunwuToken] = useState<YunwuToken | null>(null);

  // Available models state
  const [availableModels, setAvailableModels] = useState<AvailableModels>({
    models: [],
    recommendedModels: [],
    isLoading: false,
  });

  // Trial claim state
  const [isClaimingTrial, setIsClaimingTrial] = useState(false);
  const [trialClaimResult, setTrialClaimResult] = useState<TrialClaimResult | null>(null);
  const [subscriptionPrompt, setSubscriptionPrompt] = useState<TrialClaimResult | null>(null);

  // Provider configuration state
  const [providerApiKey, setProviderApiKey] = useState('');
  const [providerModelId, setProviderModelId] = useState('');
  const [showProviderApiKey, setShowProviderApiKey] = useState(false);
  const [isSavingProvider, setIsSavingProvider] = useState(false);
  const [yunnwuProviderExists, setYunwuProviderExists] = useState(false);
  const [existingYunwuProviderId, setExistingYunwuProviderId] = useState<string | null>(null);
  const [isEditingProvider, setIsEditingProvider] = useState(false);
  const [showAllModels, setShowAllModels] = useState(false);

  const pollingCleanupRef = useRef<(() => void) | null>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchProfile();
    fetchQuota();
    // Only fetch providers if running in Electron
    if (typeof window !== 'undefined' && window.electron) {
      fetchProviders();
    } else {
      console.log('[Subscription] Skipping fetchProviders - not in Electron environment');
    }
  }, [fetchProfile, fetchQuota, fetchProviders]);

  // Check if yunwu provider already exists
  useEffect(() => {
    console.log('[Subscription] Checking providers:', providers.length, providers);
    if (providers.length > 0) {
      const yunwuProvider = providers.find(
        (p) => p.baseUrl?.includes('yunwu.ai') || p.name?.toLowerCase().includes('云雾') || p.name?.toLowerCase().includes('yunwu')
      );
      console.log('[Subscription] Yunwu provider found:', !!yunwuProvider, yunwuProvider);
      setYunwuProviderExists(!!yunwuProvider);
      if (yunwuProvider) {
        setExistingYunwuProviderId(yunwuProvider.id);
        // Pre-fill model ID if exists
        if (yunwuProvider.model) {
          setProviderModelId(yunwuProvider.model);
        }
      }
    }
  }, [providers]);

  // Pre-fill API key from yunwuToken
  useEffect(() => {
    if (yunwuToken?.apiKey) {
      setProviderApiKey(yunwuToken.apiKey);
    }
  }, [yunwuToken?.apiKey]);

  useEffect(() => {
    if (accessToken) {
      setSubscriptionPrompt(null);
    }
  }, [accessToken]);

  // API calls
  const fetchYunwuToken = useCallback(async () => {
    if (!accessToken) {
      console.log('[Subscription] No accessToken available, skipping fetchYunwuToken');
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/yunwu-token-status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setYunwuToken(data);
      }
    } catch (error) {
      console.error('Error fetching yunwu token:', error);
    }
  }, [accessToken]);

  const fetchAvailableModels = useCallback(async () => {
    if (!accessToken) return;

    setAvailableModels(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/yunwu-models`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAvailableModels({
          models: data.models || [],
          recommendedModels: data.recommendedModels || [],
          isLoading: false,
          error: data.error, // Capture error message (e.g., "Token quota exhausted")
        });
      } else {
        // Try to read error from response body even when not OK
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // Can't parse JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        setAvailableModels({
          models: [],
          recommendedModels: ['gpt-3.5-turbo-1106', 'gpt-4', 'claude-3-sonnet'],
          isLoading: false,
          error: errorMessage,
        });
      }
    } catch (error) {
      console.error('Error fetching available models:', error);
      setAvailableModels({
        models: [],
        recommendedModels: ['gpt-3.5-turbo-1106', 'gpt-4', 'claude-3-sonnet'],
        isLoading: false,
        error: String(error),
      });
    }
  }, [accessToken]);

  // Fetch token and models when accessToken and profile are available
  useEffect(() => {
    if (accessToken && profile) {
      fetchYunwuToken();
      fetchAvailableModels();
    }
  }, [accessToken, fetchAvailableModels, fetchYunwuToken, profile]);

  // Utility functions
  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) {
      return '0';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return num.toLocaleString();
  };

  const formatDate = (dateStr: string) => {
    const language = i18n.language.split('-')[0];
    const localeMap: Record<string, string> = {
      zh: 'zh-CN',
      en: 'en-US',
      ja: 'ja-JP',
    };
    return new Date(dateStr).toLocaleDateString(localeMap[language] || 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTierDisplayName = () => {
    if (profile?.is_trial) {
      return t('tier.trial');
    }
    const tier = profile?.subscription_tier || 'free';
    return t(`tier.${tier}`, { defaultValue: t('tier.free') });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('message.copied'));
  };

  // Event handlers
  const handleUpgradeClick = (planId: PlanId) => {
    if (!accessToken) {
      const loginRequiredMessage = t('message.loginRequiredToSubscribe');
      setIsPaymentDialogOpen(false);
      setSelectedPlan(null);
      setPaymentStatus('idle');
      setErrorMessage(null);
      setSubscriptionPrompt({ success: false, message: loginRequiredMessage });
      toast.error(loginRequiredMessage);
      return;
    }

    setSubscriptionPrompt(null);
    setSelectedPlan(planId);
    setIsPaymentDialogOpen(true);
    setPaymentStatus('idle');
    setErrorMessage(null);
  };

  const handleClaimTrial = async () => {
    console.log('[handleClaimTrial] Called, accessToken:', accessToken ? 'exists' : 'null');
    if (!accessToken) {
      setTrialClaimResult({ success: false, message: t('message.loginRequired') });
      return;
    }

    setIsClaimingTrial(true);
    setTrialClaimResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claim-trial`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setTrialClaimResult({
          success: true,
          message: t('message.claimSuccess', {
            quotaK: (data.trial?.quota / 1000).toFixed(0),
            days: TRIAL_CONFIG.durationDays,
          }),
        });
        // Refresh profile, token and models
        fetchProfile();
        fetchQuota();
        fetchYunwuToken();
        fetchAvailableModels();
      } else {
        setTrialClaimResult({
          success: false,
          message: data.error || t('message.claimFailed'),
        });
      }
    } catch (error) {
      console.error('Claim trial error:', error);
      setTrialClaimResult({
        success: false,
        message: error instanceof Error ? error.message : t('message.claimFailed'),
      });
    } finally {
      setIsClaimingTrial(false);
    }
  };

  const handleResetTrial = async () => {
    if (!accessToken) {
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-trial`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setTrialClaimResult(null);
        // Refresh profile and token
        fetchProfile();
        fetchQuota();
        fetchYunwuToken();
      }
    } catch (error) {
      console.error('Reset trial error:', error);
    }
  };

  const handlePayment = async () => {
    if (!selectedPlan || !accessToken) {
      setErrorMessage(t('message.loginRequired'));
      return;
    }

    const plan = SUBSCRIPTION_PLANS[selectedPlan];
    setPaymentStatus('pending');
    setErrorMessage(null);

    try {
      const result = await createPayment({
        amount: plan.price,
        type: 'alipay',
        productName: plan.name,
        metadata: {
          plan_id: plan.id,
          tokens: plan.tokens,
        },
      });

      window.open(result.paymentUrl, '_blank');

      const cleanup = pollPaymentStatus(
        result.orderId,
        () => {
          setPaymentStatus('success');
          pollingCleanupRef.current = null;
          fetchProfile();
          fetchQuota();
          fetchYunwuToken();
        },
        (error) => {
          setPaymentStatus('failed');
          setErrorMessage(error);
          pollingCleanupRef.current = null;
        }
      );

      pollingCleanupRef.current = cleanup;
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      setErrorMessage(error instanceof Error ? error.message : t('message.paymentCreateFailed'));
    }
  };

  const handleCloseDialog = () => {
    if (pollingCleanupRef.current) {
      pollingCleanupRef.current();
      pollingCleanupRef.current = null;
    }
    setIsPaymentDialogOpen(false);
    setSelectedPlan(null);
    setPaymentStatus('idle');
    setErrorMessage(null);
  };

  const handleSaveProvider = async () => {
    if (!providerApiKey.trim()) {
      toast.error(t('message.apiKeyRequired'));
      return;
    }

    setIsSavingProvider(true);
    try {
      // If provider already exists, update it
      if (existingYunwuProviderId) {
        await updateProviderWithKey(
          existingYunwuProviderId,
          {
            name: '云雾 AI (Yunwu)',
            baseUrl: 'https://yunwu.ai/v1',
            model: providerModelId.trim() || undefined,
            apiType: 'openai-completions',
            enabled: true,
          },
          providerApiKey.trim()
        );
        setIsEditingProvider(false);
        await setDefaultProvider(existingYunwuProviderId);
        toast.success(t('message.providerUpdated'));
      } else {
        // Create new provider
        const providerId = `yunwu-${crypto.randomUUID()}`;
        await addProvider(
          {
            id: providerId,
            type: 'custom',
            name: '云雾 AI (Yunwu)',
            baseUrl: 'https://yunwu.ai/v1',
            model: providerModelId.trim() || undefined,
            apiType: 'openai-completions',
            enabled: true,
          },
          providerApiKey.trim()
        );

        // Set as default provider
        await setDefaultProvider(providerId);
        setYunwuProviderExists(true);
        setExistingYunwuProviderId(providerId);
        toast.success(t('message.providerSaved'));
      }
    } catch (error) {
      console.error('Failed to save provider:', error);
      toast.error(t('message.saveFailed', { error: String(error) }));
    } finally {
      setIsSavingProvider(false);
    }
  };

  return {
    // State
    quota,
    profile,
    accessToken,
    providers,
    isPaymentDialogOpen,
    selectedPlan,
    paymentStatus,
    errorMessage,
    yunwuToken,
    availableModels,
    isClaimingTrial,
    trialClaimResult,
    subscriptionPrompt,
    providerApiKey,
    providerModelId,
    showProviderApiKey,
    isSavingProvider,
    yunnwuProviderExists,
    existingYunwuProviderId,
    isEditingProvider,
    showAllModels,

    // Constants
    SUBSCRIPTION_PLANS,
    TRIAL_CONFIG,

    // Utility functions
    formatNumber,
    formatDate,
    getTierDisplayName,
    copyToClipboard,

    // Event handlers
    handleUpgradeClick,
    handleClaimTrial,
    handleResetTrial,
    handlePayment,
    handleCloseDialog,
    handleSaveProvider,

    // State setters
    setProviderApiKey,
    setProviderModelId,
    setShowProviderApiKey,
    setIsEditingProvider,
    setShowAllModels,
  };
}
