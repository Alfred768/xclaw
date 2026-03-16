/**
 * Usage Section
 * Displays current usage quota and subscription tier with ZPay payment integration
 */
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart2,
  Zap,
  Crown,
  Building2,
  ArrowUpRight,
  Gift,
  Check,
  Loader2,
  ExternalLink,
  Key,
  Copy,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
    tokens: 100000, // 100K
    tokensText: '100K tokens',
    features: ['3天免费试用', '100K tokens', '基础模型访问'],
  },
  monthly: {
    id: 'monthly',
    name: '月度会员',
    price: 29.9,
    priceText: '¥29.9',
    period: '/月',
    tokens: 1000000, // 1M
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
    tokens: 100000000, // 100M
    tokensText: '100M tokens/年',
    features: ['100M tokens 每年', '所有模型访问', '优先支持', '专属客服'],
    savings: '省 ¥59.8',
  },
} as const;

type PlanId = keyof typeof SUBSCRIPTION_PLANS;

export function UsageSection() {
  const { t } = useTranslation('account');
  const { quota, profile, fetchProfile, fetchQuota } = useAccountStore();
  const { accessToken } = useAuthStore();

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Yunwu token state
  const [yunwuToken, setYunwuToken] = useState<{
    hasToken: boolean;
    apiKey?: string;
    token?: {
      name: string;
      total_granted: number;
      total_used: number;
      total_available: number;
      unlimited_quota: boolean;
      expires_at: number;
    };
    subscription?: {
      tier: string;
      endsAt: string;
    };
  } | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);

  // Available models state
  const [availableModels, setAvailableModels] = useState<{
    models: Array<{ id: string; name: string }>;
    recommendedModels: string[];
    isLoading: boolean;
  }>({ models: [], recommendedModels: [], isLoading: false });

  // Test token creation state
  const [isTestCreating, setIsTestCreating] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    apiKey?: string;
  } | null>(null);

  // Store polling cleanup function
  const pollingCleanupRef = useRef<(() => void) | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingCleanupRef.current) {
        pollingCleanupRef.current();
      }
    };
  }, []);

  const getUsagePercentage = () => {
    if (!quota || !quota.total_tokens_quota) return 0;
    return Math.min((quota.tokens_used / quota.total_tokens_quota) * 100, 100);
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

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Fetch yunwu token status
  const fetchYunwuToken = async () => {
    // Get fresh session token from Supabase client
    if (!supabase) {
      console.log('[fetchYunwuToken] Supabase client not available');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const currentToken = session?.access_token;

    console.log('[fetchYunwuToken] Session token check:', {
      hasSession: !!session,
      tokenPreview: currentToken?.substring(0, 30) + '...',
      tokenLength: currentToken?.length,
    });

    if (!currentToken) {
      console.log('[fetchYunwuToken] No token available, skipping');
      return;
    }

    setIsLoadingToken(true);
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

      console.log('[fetchYunwuToken] Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[fetchYunwuToken] Data received:', data);
        setYunwuToken(data);
      } else {
        const errorText = await response.text();
        console.error('[fetchYunwuToken] Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching yunwu token:', error);
    } finally {
      setIsLoadingToken(false);
    }
  };

  // Fetch available models
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
          recommendedModels: data.recommendedModels || ['gpt-3.5-turbo-1106'],
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Error fetching available models:', error);
      setAvailableModels(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Fetch token on mount and when profile changes
  useEffect(() => {
    if (accessToken && profile) {
      fetchYunwuToken();
      fetchAvailableModels();
    }
  }, [accessToken, profile?.subscription_tier]);

  // Copy API key to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Test token creation (bypasses payment)
  const handleTestTokenCreate = async (planId: 'monthly' | 'yearly' = 'monthly') => {
    setIsTestCreating(true);
    setTestResult(null);

    try {
      // First, try to get fresh session from Supabase client
      let currentToken: string | null = null;

      if (supabase) {
        console.log('[handleTestTokenCreate] Trying to get session from Supabase client...');
        const { data: { session } } = await supabase.auth.getSession();
        currentToken = session?.access_token || null;
        console.log('[handleTestTokenCreate] Supabase session:', {
          hasSession: !!session,
          hasToken: !!currentToken,
          tokenPreview: currentToken?.substring(0, 30) + '...',
        });
      } else {
        console.log('[handleTestTokenCreate] Supabase client is null, falling back to accessToken');
      }

      // Fallback to accessToken from auth store
      if (!currentToken && accessToken) {
        currentToken = accessToken;
        console.log('[handleTestTokenCreate] Using accessToken from store:', {
          tokenPreview: currentToken?.substring(0, 30) + '...',
        });
      }

      if (!currentToken) {
        setTestResult({
          success: false,
          message: '请先登录 (无有效会话)。请尝试刷新页面或重新登录。',
        });
        return;
      }

      // Pass token in body to bypass Supabase's automatic JWT validation
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-token-create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: currentToken, plan_id: planId }),
        }
      );

      const data = await response.json();
      console.log('Test token create response:', data);

      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: `令牌创建成功！计划: ${planId}`,
          apiKey: data.apiKey,
        });
        // Refresh profile, quota and token
        fetchProfile();
        fetchQuota();
        fetchYunwuToken();
      } else {
        setTestResult({
          success: false,
          message: data.error || data.details || '创建失败',
        });
      }
    } catch (error) {
      console.error('Test token create error:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '网络错误',
      });
    } finally {
      setIsTestCreating(false);
    }
  };

  const handleUpgradeClick = (planId: PlanId) => {
    if (planId === 'free') {
      // Free plan doesn't need payment
      return;
    }
    setSelectedPlan(planId);
    setIsPaymentDialogOpen(true);
    setPaymentStatus('idle');
    setPaymentUrl(null);
    setOrderId(null);
    setErrorMessage(null);
  };

  const handlePaymentConfirm = async () => {
    if (!selectedPlan || !accessToken) {
      setErrorMessage('请先登录');
      return;
    }

    const plan = SUBSCRIPTION_PLANS[selectedPlan];
    setIsProcessing(true);
    setPaymentStatus('pending');
    setErrorMessage(null);

    try {
      // Create payment order
      const result = await createPayment({
        amount: plan.price,
        type: 'alipay',
        productName: plan.name,
        metadata: {
          plan_id: plan.id,
          tokens: plan.tokens,
        },
      });

      setPaymentUrl(result.paymentUrl);
      setOrderId(result.orderId);

      // Open payment in new window
      window.open(result.paymentUrl, '_blank');

      // Start polling for payment status
      const cleanup = pollPaymentStatus(
        result.orderId,
        () => {
          // Payment successful
          setPaymentStatus('success');
          setIsProcessing(false);
          pollingCleanupRef.current = null;
          // Refresh profile, quota and token
          fetchProfile();
          fetchQuota();
          fetchYunwuToken();
        },
        (error) => {
          // Payment failed
          setPaymentStatus('failed');
          setErrorMessage(error);
          setIsProcessing(false);
          pollingCleanupRef.current = null;
        }
      );

      // Store cleanup function for later cancellation
      pollingCleanupRef.current = cleanup;
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      setErrorMessage(error instanceof Error ? error.message : '支付创建失败');
      setIsProcessing(false);

      // Debug: log auth state
      console.log('Debug - accessToken exists:', !!accessToken);
      console.log('Debug - accessToken preview:', accessToken?.substring(0, 30) + '...');
    }
  };

  const handleCloseDialog = () => {
    // Stop polling if active
    if (pollingCleanupRef.current) {
      pollingCleanupRef.current();
      pollingCleanupRef.current = null;
    }
    setIsPaymentDialogOpen(false);
    setSelectedPlan(null);
    setPaymentUrl(null);
    setOrderId(null);
    setIsProcessing(false);
    setPaymentStatus('idle');
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            {t('usage.title')}
          </CardTitle>
          <CardDescription>{t('usage.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getTierIcon(profile?.subscription_tier)}
              <div>
                <p className="text-sm text-muted-foreground">{t('usage.currentPlan')}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={getTierBadgeVariant()} className="text-base px-3 py-1">
                    {getTierDisplayName()}
                  </Badge>
                  {profile?.is_trial && (
                    <Badge variant="outline" className="text-xs">
                      试用中
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {(profile?.subscription_tier === 'free' || !profile?.subscription_tier) && !profile?.is_trial && (
              <Button className="gap-2" onClick={() => handleUpgradeClick('monthly')}>
                <ArrowUpRight className="h-4 w-4" />
                {t('usage.upgrade')}
              </Button>
            )}
          </div>

          {/* Token Usage */}
          {quota && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>{t('usage.tokensUsed')}</span>
                <span className="font-medium">
                  {formatNumber(quota.tokens_used)} / {formatNumber(quota.total_tokens_quota)}
                </span>
              </div>
              <Progress value={getUsagePercentage()} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{getUsagePercentage().toFixed(1)}% 已使用</span>
                {quota.billing_cycle_end && (
                  <span>
                    {t('usage.resetDate')} {formatDate(quota.billing_cycle_end)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Trial info */}
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

          {/* No quota data */}
          {!quota && (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-muted-foreground">{t('errors.fetchFailed')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Comparison */}
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
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-6 w-6 text-purple-500" />
                <Badge variant="secondary" className="text-xs">
                  {SUBSCRIPTION_PLANS.yearly.savings}
                </Badge>
              </div>
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
                onClick={() => handleUpgradeClick('yearly')}
                disabled={profile?.subscription_tier === 'yearly'}
              >
                {profile?.subscription_tier === 'yearly' ? '当前计划' : '立即订阅'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Yunwu API Token */}
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
            {/* API Key Display */}
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

            {/* Token Usage */}
            {yunwuToken.token && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>已使用</span>
                  <span className="font-medium">
                    {formatNumber(yunwuToken.token?.total_used)} / {formatNumber(yunwuToken.token?.total_granted)}
                  </span>
                </div>
                <Progress
                  value={yunwuToken.token?.total_granted ? (yunwuToken.token.total_used / yunwuToken.token.total_granted) * 100 : 0}
                  className="h-2"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    剩余 {formatNumber(yunwuToken.token?.total_available)} tokens
                  </span>
                  {yunwuToken.token?.expires_at && yunwuToken.token.expires_at > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      到期: {new Date(yunwuToken.token.expires_at * 1000).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Subscription Info */}
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

      {/* Supported Models - Always visible */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            支持的模型
          </CardTitle>
          <CardDescription>
            点击模型名称复制到剪贴板
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recommended Models */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-primary">推荐模型:</span>
            <div className="flex flex-wrap gap-2">
              {['gpt-3.5-turbo-1106', 'gpt-4', 'gpt-4-turbo', 'claude-3-opus', 'claude-3-sonnet'].map((model) => (
                <Badge
                  key={model}
                  variant="default"
                  className="text-xs cursor-pointer hover:bg-primary/80 transition-colors"
                  onClick={() => copyToClipboard(model)}
                  title="点击复制模型名称"
                >
                  {model}
                </Badge>
              ))}
            </div>
          </div>

          {/* All Available Models (if token exists) */}
          {availableModels.models.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                查看全部 {availableModels.models.length} 个可用模型
              </summary>
              <div className="mt-2 max-h-40 overflow-y-auto rounded border p-2 bg-muted/30">
                <div className="flex flex-wrap gap-1">
                  {availableModels.models.map((model) => (
                    <Badge
                      key={model.id}
                      variant="outline"
                      className="text-xs cursor-pointer hover:bg-muted"
                      onClick={() => copyToClipboard(model.id)}
                      title="点击复制模型名称"
                    >
                      {model.id}
                    </Badge>
                  ))}
                </div>
              </div>
            </details>
          )}

          {!yunwuToken?.hasToken && (
            <p className="text-xs text-muted-foreground">
              💡 创建 API 令牌后可查看完整模型列表
            </p>
          )}
        </CardContent>
      </Card>

      {/* Loading Token */}
      {isLoadingToken && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-muted-foreground">加载令牌信息...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Token Creation (DEV MODE) */}
      <Card className="border-dashed border-2 border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
            <Zap className="h-5 w-5" />
            测试模式 - 令牌创建
          </CardTitle>
          <CardDescription>
            跳过支付直接测试令牌创建功能（仅用于开发测试）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleTestTokenCreate('monthly')}
              disabled={isTestCreating}
              variant="outline"
              className="gap-2"
            >
              {isTestCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              测试月度会员
            </Button>
            <Button
              onClick={() => handleTestTokenCreate('yearly')}
              disabled={isTestCreating}
              variant="outline"
              className="gap-2"
            >
              {isTestCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
              测试年度会员
            </Button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`rounded-lg p-4 ${
              testResult.success
                ? 'bg-green-100 dark:bg-green-950'
                : 'bg-red-100 dark:bg-red-950'
            }`}>
              <div className="flex items-start gap-2">
                {testResult.success ? (
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <span className="text-red-600">❌</span>
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    testResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {testResult.message}
                  </p>
                  {testResult.apiKey && (
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 px-2 py-1 bg-white dark:bg-gray-800 rounded text-sm font-mono truncate">
                        {testResult.apiKey}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(testResult.apiKey!)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {paymentStatus === 'success' ? '支付成功' :
               paymentStatus === 'failed' ? '支付失败' :
               '确认订阅'}
            </DialogTitle>
            <DialogDescription>
              {paymentStatus === 'success' ? '您的订阅已激活' :
               paymentStatus === 'failed' ? errorMessage :
               selectedPlan && `您将订阅 ${SUBSCRIPTION_PLANS[selectedPlan].name}`}
            </DialogDescription>
          </DialogHeader>

          {paymentStatus === 'idle' && selectedPlan && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{SUBSCRIPTION_PLANS[selectedPlan].name}</span>
                  <span className="font-bold">{SUBSCRIPTION_PLANS[selectedPlan].priceText}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {SUBSCRIPTION_PLANS[selectedPlan].tokensText}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleCloseDialog}>
                  取消
                </Button>
                <Button className="flex-1" onClick={handlePaymentConfirm}>
                  支付宝支付
                </Button>
              </div>
            </div>
          )}

          {paymentStatus === 'pending' && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-center text-muted-foreground">
                  请在新窗口中完成支付...
                </p>
                {paymentUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={paymentUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      重新打开支付页面
                    </a>
                  </Button>
                )}
              </div>
              <Button variant="ghost" className="w-full" onClick={handleCloseDialog}>
                取消
              </Button>
            </div>
          )}

          {paymentStatus === 'success' && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-green-100 p-3">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-center">订阅成功！您的额度已更新。</p>
              </div>
              <Button className="w-full" onClick={handleCloseDialog}>
                完成
              </Button>
            </div>
          )}

          {paymentStatus === 'failed' && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-red-100 p-3">
                  <span className="text-2xl">❌</span>
                </div>
                <p className="text-center text-muted-foreground">{errorMessage}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleCloseDialog}>
                  取消
                </Button>
                <Button className="flex-1" onClick={handlePaymentConfirm}>
                  重试
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
