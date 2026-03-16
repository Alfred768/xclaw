/**
 * Subscription Page
 * Subscription plans, API token, and supported models
 * Standalone page for better visibility and conversion
 */
import { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Crown,
  Building2,
  ArrowUpRight,
  Gift,
  Check,
  Loader2,
  Key,
  Copy,
  Clock,
  Settings2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProviderStore } from '@/stores/providers';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAccountStore } from '@/stores/account';
import { useAuthStore } from '@/stores/auth';
import { createPayment, pollPaymentStatus } from '@/lib/payment';
import { supabase } from '@/lib/supabase';

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: '免费试用',
    price: 0,
    priceText: '免费',
    period: '3天试用',
    tokens: 100000,
    tokensText: '100K tokens',
    features: ['3天免费试用', '100K tokens', '基础模型访问'],
  },
  monthly: {
    id: 'monthly',
    name: '月度会员',
    price: 29.9,
    priceText: '¥29.9',
    period: '/月',
    tokens: 1000000,
    tokensText: '1M tokens/月',
    features: ['1M tokens 每月', '所有模型访问', '优先支持'],
    popular: true,
  },
  yearly: {
    id: 'yearly',
    name: '年度会员',
    price: 299,
    priceText: '¥299',
    period: '/年',
    tokens: 100000000,
    tokensText: '100M tokens/年',
    features: ['100M tokens 每年', '所有模型访问', '优先支持', '专属客服'],
    savings: '省 ¥59.8',
  },
} as const;

type PlanId = keyof typeof SUBSCRIPTION_PLANS;

export function Subscription() {
  const { quota, profile, fetchProfile, fetchQuota } = useAccountStore();
  const { accessToken } = useAuthStore();
  const { providers, addProvider, setDefaultProvider, fetchProviders } = useProviderStore();

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Yunwu token state
  const [yunwuToken, setYunwuToken] = useState<{
    hasToken: boolean;
    apiKey?: string;
    token?: {
      total_granted: number;
      total_used: number;
      total_available: number;
      expires_at: number;
    };
    subscription?: {
      tier: string;
      endsAt: string;
    };
  } | null>(null);

  // Available models state
  const [availableModels, setAvailableModels] = useState<{
    models: Array<{ id: string; name: string }>;
    recommendedModels: string[];
    isLoading: boolean;
  }>({ models: [], recommendedModels: [], isLoading: false });

  // Test token creation state
  const [testPlanId, setTestPlanId] = useState<PlanId | null>(null);
  const [isCreatingTestToken, setIsCreatingTestToken] = useState(false);
  const [testTokenResult, setTestTokenResult] = useState<{
    success: boolean;
    message?: string;
  } | null>(null);

  // Provider configuration state
  const [providerApiKey, setProviderApiKey] = useState('');
  const [providerModelId, setProviderModelId] = useState('');
  const [showProviderApiKey, setShowProviderApiKey] = useState(false);
  const [isSavingProvider, setIsSavingProvider] = useState(false);
  const [yunnwuProviderExists, setYunwuProviderExists] = useState(false);

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
      console.log('[Subscription] Yunwu provider found:', !!yunwuProvider);
      setYunwuProviderExists(!!yunwuProvider);
    }
  }, [providers]);

  // Pre-fill API key from yunwuToken
  useEffect(() => {
    if (yunwuToken?.apiKey) {
      setProviderApiKey(yunwuToken.apiKey);
    }
  }, [yunwuToken?.apiKey]);

  // Fetch token and models when accessToken and profile are available
  useEffect(() => {
    if (accessToken && profile) {
      fetchYunwuToken();
      fetchAvailableModels();
    }
  }, [accessToken, profile?.subscription_tier]);

  const fetchYunwuToken = async () => {
    if (!supabase) return;

    const { data: { session } } = await supabase.auth.getSession();
    const currentToken = session?.access_token;

    if (!currentToken) {
      console.log('[Subscription] No token available, skipping fetchYunwuToken');
      return;
    }

    try {
      // Pass token in body to bypass Supabase's automatic JWT validation
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/yunwu-token-status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: currentToken }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setYunwuToken(data);
      }
    } catch (error) {
      console.error('Error fetching yunwu token:', error);
    }
  };

  const fetchAvailableModels = async () => {
    if (!supabase) return;

    const { data: { session } } = await supabase.auth.getSession();
    const currentToken = session?.access_token;

    if (!currentToken) return;

    setAvailableModels(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/yunwu-models`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: currentToken }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAvailableModels({
          models: data.models || [],
          recommendedModels: data.recommendedModels || [],
          isLoading: false,
        });
      } else {
        setAvailableModels(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error fetching available models:', error);
      setAvailableModels(prev => ({ ...prev, isLoading: false }));
    }
  };

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
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTierIcon = (tier?: string) => {
    switch (tier) {
      case 'monthly':
      case 'pro':
        return <Zap className="h-5 w-5 text-blue-500" />;
      case 'yearly':
      case 'enterprise':
        return <Building2 className="h-5 w-5 text-purple-500" />;
      default:
        return profile?.is_trial ? (
          <Gift className="h-5 w-5 text-green-500" />
        ) : (
          <Crown className="h-5 w-5 text-gray-500" />
        );
    }
  };

  const getTierBadgeVariant = () => {
    switch (profile?.subscription_tier) {
      case 'monthly':
      case 'yearly':
      case 'pro':
      case 'enterprise':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getTierDisplayName = () => {
    if (profile?.is_trial) {
      return '免费试用';
    }
    const tierMap: Record<string, string> = {
      free: '免费版',
      monthly: '月度会员',
      yearly: '年度会员',
      pro: '专业版',
      enterprise: '企业版',
    };
    return tierMap[profile?.subscription_tier || 'free'] || '免费版';
  };

  const getUsagePercentage = () => {
    if (!quota || !quota.total_tokens_quota) return 0;
    return Math.min((quota.tokens_used / quota.total_tokens_quota) * 100, 100);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleUpgradeClick = (planId: PlanId) => {
    setSelectedPlan(planId);
    setIsPaymentDialogOpen(true);
    setPaymentStatus('idle');
    setErrorMessage(null);
  };

  const handleTestTokenCreate = async (planId: PlanId) => {
    if (!accessToken) {
      setTestTokenResult({ success: false, message: '请先登录' });
      return;
    }

    setIsCreatingTestToken(true);
    setTestPlanId(planId);
    setTestTokenResult(null);

    try {
      if (!supabase) {
        setTestTokenResult({ success: false, message: 'Supabase 未配置' });
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || accessToken;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-token-create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ token, plan_id: planId }),
      });

      const data = await response.json();
      console.log('Test token create response:', data);

      if (response.ok && data.success) {
        setTestTokenResult({
          success: true,
          message: `令牌创建成功！计划: ${planId}`,
        });

        // Update auth store with new subscription info
        const authUser = useAuthStore.getState().user;
        if (authUser) {
          useAuthStore.getState().setUser({
            ...authUser,
            subscriptionTier: planId as 'monthly' | 'yearly',
            isTrial: false,
            trialEndsAt: null,
            subscriptionEndsAt: data.subscription?.endsAt || null,
          });
        }

        // Refresh profile and token data
        fetchProfile();
        fetchQuota();
        fetchYunwuToken();
      } else {
        setTestTokenResult({
          success: false,
          message: data.error || '创建失败',
        });
      }
    } catch (error) {
      console.error('Test token create error:', error);
      setTestTokenResult({
        success: false,
        message: error instanceof Error ? error.message : '创建失败',
      });
    } finally {
      setIsCreatingTestToken(false);
      setTestPlanId(null);
    }
  };

  const handlePayment = async () => {
    if (!selectedPlan || !accessToken) {
      setErrorMessage('请先登录');
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
      setErrorMessage(error instanceof Error ? error.message : '支付创建失败');
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

  // Save yunwu provider configuration
  const handleSaveProvider = async () => {
    if (!providerApiKey.trim()) {
      toast.error('请输入 API Key');
      return;
    }

    setIsSavingProvider(true);
    try {
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
      toast.success('AI 模型提供商配置成功！');
    } catch (error) {
      console.error('Failed to save provider:', error);
      toast.error(`保存失败: ${error}`);
    } finally {
      setIsSavingProvider(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">订阅与 API</h1>
        <p className="text-muted-foreground">管理您的订阅计划和 API 令牌</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getTierIcon(profile?.subscription_tier)}
            当前套餐
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <Badge variant={getTierBadgeVariant()} className="text-base px-3 py-1">
                  {getTierDisplayName()}
                </Badge>
                {profile?.is_trial && (
                  <Badge variant="outline" className="text-xs ml-2">
                    试用中
                  </Badge>
                )}
              </div>
            </div>
            {(profile?.subscription_tier === 'free' || !profile?.subscription_tier) && !profile?.is_trial && (
              <Button className="gap-2" onClick={() => handleUpgradeClick('monthly')}>
                <ArrowUpRight className="h-4 w-4" />
                升级套餐
              </Button>
            )}
          </div>

          {/* Subscription Expiry - 显示到期时间 */}
          {(profile?.subscription_tier === 'monthly' || profile?.subscription_tier === 'yearly') && profile?.subscription_ends_at && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 border-2 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Clock className="h-5 w-5" />
                <span className="font-semibold text-base">到期时间</span>
              </div>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-300 mt-2">
                {formatDate(profile.subscription_ends_at)}
              </p>
              <p className="text-sm text-blue-500 dark:text-blue-400 mt-1">
                {(() => {
                  const endsAt = new Date(profile.subscription_ends_at!);
                  const now = new Date();
                  const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  if (daysLeft > 0) {
                    return `还剩 ${daysLeft} 天`;
                  } else if (daysLeft === 0) {
                    return '今天到期';
                  } else {
                    return '已过期';
                  }
                })()}
              </p>
            </div>
          )}

          {profile?.is_trial && profile?.trial_ends_at && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Gift className="h-4 w-4" />
                <span className="font-medium">试用期</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                试用期至 {formatDate(profile.trial_ends_at)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Plans */}
      <Card>
        <CardHeader>
          <CardTitle>订阅计划</CardTitle>
          <CardDescription>选择适合您的计划</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Free Trial */}
            <div className="rounded-lg border p-4">
              <Gift className="h-6 w-6 text-green-500 mb-2" />
              <h3 className="font-semibold">{SUBSCRIPTION_PLANS.free.name}</h3>
              <div className="mt-2">
                <span className="text-2xl font-bold">{SUBSCRIPTION_PLANS.free.priceText}</span>
                <span className="text-muted-foreground">{SUBSCRIPTION_PLANS.free.period}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{SUBSCRIPTION_PLANS.free.tokensText}</p>
              <ul className="mt-4 space-y-2">
                {SUBSCRIPTION_PLANS.free.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full mt-4" disabled>
                新用户专享
              </Button>
            </div>

            {/* Monthly */}
            <div className="rounded-lg border-2 border-primary p-4 relative">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <Badge>推荐</Badge>
              </div>
              <Zap className="h-6 w-6 text-blue-500 mb-2" />
              <h3 className="font-semibold">{SUBSCRIPTION_PLANS.monthly.name}</h3>
              <div className="mt-2">
                <span className="text-2xl font-bold">{SUBSCRIPTION_PLANS.monthly.priceText}</span>
                <span className="text-muted-foreground">{SUBSCRIPTION_PLANS.monthly.period}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{SUBSCRIPTION_PLANS.monthly.tokensText}</p>
              <ul className="mt-4 space-y-2">
                {SUBSCRIPTION_PLANS.monthly.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full mt-4"
                onClick={() => handleUpgradeClick('monthly')}
                disabled={profile?.subscription_tier === 'monthly'}
              >
                {profile?.subscription_tier === 'monthly' ? '当前计划' : '立即订阅'}
              </Button>
            </div>

            {/* Yearly */}
            <div className="rounded-lg border p-4 relative">
              {SUBSCRIPTION_PLANS.yearly.savings && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <Badge variant="secondary">{SUBSCRIPTION_PLANS.yearly.savings}</Badge>
                </div>
              )}
              <Building2 className="h-6 w-6 text-purple-500 mb-2" />
              <h3 className="font-semibold">{SUBSCRIPTION_PLANS.yearly.name}</h3>
              <div className="mt-2">
                <span className="text-2xl font-bold">{SUBSCRIPTION_PLANS.yearly.priceText}</span>
                <span className="text-muted-foreground">{SUBSCRIPTION_PLANS.yearly.period}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{SUBSCRIPTION_PLANS.yearly.tokensText}</p>
              <ul className="mt-4 space-y-2">
                {SUBSCRIPTION_PLANS.yearly.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full mt-4"
                variant="outline"
                onClick={() => handleUpgradeClick('yearly')}
                disabled={profile?.subscription_tier === 'yearly'}
              >
                {profile?.subscription_tier === 'yearly' ? '当前计划' : '立即订阅'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Token */}
      {yunwuToken?.hasToken && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API 令牌
            </CardTitle>
            <CardDescription>您的云雾 AI API 访问令牌</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono truncate">
                {yunwuToken.apiKey}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => yunwuToken.apiKey && copyToClipboard(yunwuToken.apiKey)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {yunwuToken.token && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>已使用</span>
                  <span className="font-medium">
                    {formatNumber(yunwuToken.token.total_used)} / {formatNumber(yunwuToken.token.total_granted)}
                  </span>
                </div>
                <Progress
                  value={yunwuToken.token.total_granted ? (yunwuToken.token.total_used / yunwuToken.token.total_granted) * 100 : 0}
                  className="h-2"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>剩余 {formatNumber(yunwuToken.token.total_available)} tokens</span>
                  {yunwuToken.token.expires_at > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      到期: {new Date(yunwuToken.token.expires_at * 1000).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            )}

            {yunwuToken.subscription && (
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">订阅类型</span>
                  <Badge variant={yunwuToken.subscription.tier === 'yearly' ? 'default' : 'secondary'}>
                    {getTierDisplayName()}
                  </Badge>
                </div>
                {yunwuToken.subscription.endsAt && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">到期时间</span>
                    <span className="text-sm">{formatDate(yunwuToken.subscription.endsAt)}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Model Provider Configuration */}
      {!yunnwuProviderExists && (
        <Card className="border-2 border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              AI 模型提供商
            </CardTitle>
            <CardDescription>
              配置云雾 AI 作为您的 AI 模型提供商，即可开始使用
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 mb-4">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                💡 订阅成功后，请在此配置您的 AI 模型提供商。{yunwuToken?.apiKey ? 'API Key 已自动填充，' : ''}点击保存即可开始使用。
              </p>
            </div>

            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input
                value="https://yunwu.ai/v1"
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">云雾 API 地址（已预填）</p>
            </div>

            <div className="space-y-2">
              <Label>API Type</Label>
              <Input
                value="OpenAI Completions"
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">API 兼容格式（已预填）</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="providerModelId">Model ID（可选）</Label>
              <Input
                id="providerModelId"
                placeholder="例如: gpt-4o, claude-3-5-sonnet-20241022"
                value={providerModelId}
                onChange={(e) => setProviderModelId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                留空则使用默认模型，或从上方「支持的模型」中选择
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="providerApiKey">API Key</Label>
              <div className="relative">
                <Input
                  id="providerApiKey"
                  type={showProviderApiKey ? 'text' : 'password'}
                  placeholder="输入您的 API Key"
                  value={providerApiKey}
                  onChange={(e) => setProviderApiKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowProviderApiKey(!showProviderApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showProviderApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {yunwuToken?.apiKey ? '已自动填充您的云雾 API 令牌' : '请输入您的云雾 API 令牌'}
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleSaveProvider}
              disabled={isSavingProvider || !providerApiKey.trim()}
            >
              {isSavingProvider ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  保存配置
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Provider Already Configured Message */}
      {yunnwuProviderExists && (
        <Card className="border-2 border-green-500/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
              <Check className="h-5 w-5" />
              <div>
                <p className="font-medium">AI 模型提供商已配置</p>
                <p className="text-sm text-muted-foreground">
                  您可以在「设置」页面管理您的提供商配置
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supported Models */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            支持的模型
          </CardTitle>
          <CardDescription>点击模型名称复制到剪贴板</CardDescription>
        </CardHeader>
        <CardContent>
          {availableModels.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {availableModels.recommendedModels.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">推荐模型:</p>
                  <div className="flex flex-wrap gap-2">
                    {availableModels.recommendedModels.map((modelId) => (
                      <Badge
                        key={modelId}
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80"
                        onClick={() => copyToClipboard(modelId)}
                      >
                        {modelId}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {availableModels.models.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  查看全部 {availableModels.models.length} 个可用模型
                </p>
              )}

              {!yunwuToken?.hasToken && (
                <p className="text-xs text-muted-foreground">
                  创建 API 令牌后可查看完整模型列表
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Test Mode - Token Creation (Development Only) */}
      {import.meta.env.DEV && (
        <Card className="border-yellow-500/50">
          <CardHeader>
            <CardTitle className="text-yellow-600">测试模式 - 令牌创建</CardTitle>
            <CardDescription>跳过支付直接测试令牌创建功能（仅用于开发测试）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleTestTokenCreate('monthly')}
                disabled={isCreatingTestToken}
              >
                {isCreatingTestToken && testPlanId === 'monthly' && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                测试月度会员
              </Button>
              <Button
                variant="outline"
                onClick={() => handleTestTokenCreate('yearly')}
                disabled={isCreatingTestToken}
              >
                {isCreatingTestToken && testPlanId === 'yearly' && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                测试年度会员
              </Button>
            </div>
            {testTokenResult && (
              <div className={`text-sm ${testTokenResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {testTokenResult.message}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>订阅 {selectedPlan && SUBSCRIPTION_PLANS[selectedPlan]?.name}</DialogTitle>
            <DialogDescription>
              {selectedPlan && (
                <span>
                  价格: {SUBSCRIPTION_PLANS[selectedPlan]?.priceText}
                  {SUBSCRIPTION_PLANS[selectedPlan]?.period}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {paymentStatus === 'idle' && (
              <>
                <p className="text-sm text-muted-foreground">
                  点击下方按钮将打开支付宝支付页面，完成支付后将自动刷新您的账户状态。
                </p>
                <Button onClick={handlePayment} className="w-full">
                  去支付
                </Button>
              </>
            )}

            {paymentStatus === 'pending' && (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <p className="text-center text-sm">等待支付完成...</p>
                <p className="text-center text-xs text-muted-foreground">请在打开的支付页面完成付款</p>
              </div>
            )}

            {paymentStatus === 'success' && (
              <div className="space-y-4">
                <div className="flex items-center justify-center text-green-600">
                  <Check className="h-8 w-8" />
                </div>
                <p className="text-center font-medium text-green-600">支付成功！</p>
                <Button onClick={handleCloseDialog} className="w-full">
                  完成
                </Button>
              </div>
            )}

            {paymentStatus === 'failed' && (
              <div className="space-y-4">
                <p className="text-center text-sm text-red-600">
                  {errorMessage || '支付失败，请重试'}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCloseDialog} className="flex-1">
                    取消
                  </Button>
                  <Button onClick={handlePayment} className="flex-1">
                    重试
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Subscription;
