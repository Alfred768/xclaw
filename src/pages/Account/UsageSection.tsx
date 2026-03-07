/**
 * Usage Section
 * Displays current usage quota and subscription tier
 */
import { useTranslation } from 'react-i18next';
import { BarChart2, Zap, Crown, Building2, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAccountStore } from '@/stores/account';

export function UsageSection() {
  const { t } = useTranslation('account');
  const { quota, profile } = useAccountStore();

  const getUsagePercentage = () => {
    if (!quota || !quota.total_tokens_quota) return 0;
    return Math.min((quota.tokens_used / quota.total_tokens_quota) * 100, 100);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const getTierIcon = () => {
    switch (profile?.subscription_tier) {
      case 'pro':
        return <Zap className="h-5 w-5 text-blue-500" />;
      case 'enterprise':
        return <Building2 className="h-5 w-5 text-purple-500" />;
      default:
        return <Crown className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTierBadgeVariant = () => {
    switch (profile?.subscription_tier) {
      case 'pro':
        return 'default';
      case 'enterprise':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
              {getTierIcon()}
              <div>
                <p className="text-sm text-muted-foreground">{t('usage.currentPlan')}</p>
                <Badge variant={getTierBadgeVariant()} className="text-base px-3 py-1">
                  {t(`usage.plans.${profile?.subscription_tier || 'free'}`)}
                </Badge>
              </div>
            </div>
            {(profile?.subscription_tier === 'free' || !profile?.subscription_tier) && (
              <Button className="gap-2">
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
                <span>{getUsagePercentage().toFixed(1)}% used</span>
                {quota.billing_cycle_end && (
                  <span>
                    {t('usage.resetDate')} {formatDate(quota.billing_cycle_end)}
                  </span>
                )}
              </div>
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

      {/* Plan Comparison (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>{t('usage.planComparison', { defaultValue: 'Plan Comparison' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Free */}
            <div className="rounded-lg border p-4">
              <Crown className="h-6 w-6 text-gray-500 mb-2" />
              <h3 className="font-semibold">{t('usage.plans.free')}</h3>
              <p className="text-2xl font-bold mt-2">$0</p>
              <p className="text-sm text-muted-foreground">100K tokens/month</p>
            </div>

            {/* Pro */}
            <div className="rounded-lg border-2 border-primary p-4 relative">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <Badge>Popular</Badge>
              </div>
              <Zap className="h-6 w-6 text-blue-500 mb-2" />
              <h3 className="font-semibold">{t('usage.plans.pro')}</h3>
              <p className="text-2xl font-bold mt-2">$9.99</p>
              <p className="text-sm text-muted-foreground">1M tokens/month</p>
            </div>

            {/* Enterprise */}
            <div className="rounded-lg border p-4">
              <Building2 className="h-6 w-6 text-purple-500 mb-2" />
              <h3 className="font-semibold">{t('usage.plans.enterprise')}</h3>
              <p className="text-2xl font-bold mt-2">Custom</p>
              <p className="text-sm text-muted-foreground">Unlimited tokens</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
