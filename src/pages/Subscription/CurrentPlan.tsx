/**
 * Current Plan Component
 * Displays current subscription status and usage
 */
import { Lightning, Crown, Buildings, Gift, ArrowUp, Clock } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserProfile, UsageQuota } from '@/types/database';
import { PlanId } from './types';
import { useTranslation } from 'react-i18next';

interface CurrentPlanProps {
  profile: UserProfile | null;
  quota: UsageQuota | null;
  onUpgradeClick: (planId: PlanId) => void;
  formatDate: (dateStr: string) => string;
}

export function CurrentPlan({ profile, onUpgradeClick, formatDate }: CurrentPlanProps) {
  const { t } = useTranslation('subscription');

  const getTierIcon = (tier?: string) => {
    switch (tier) {
      case 'monthly':
      case 'pro':
        return <Lightning className="h-5 w-5 text-blue-500" weight="fill" />;
      case 'yearly':
      case 'enterprise':
        return <Buildings className="h-5 w-5 text-purple-500" weight="regular" />;
      default:
        return profile?.is_trial ? (
          <Gift className="h-5 w-5 text-green-500" weight="fill" />
        ) : (
          <Crown className="h-5 w-5 text-gray-500" weight="regular" />
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
      return t('tier.trial');
    }
    const tier = profile?.subscription_tier || 'free';
    return t(`tier.${tier}`, { defaultValue: t('tier.free') });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getTierIcon(profile?.subscription_tier)}
          {t('current.title')}
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
                  {t('current.trialActive')}
                </Badge>
              )}
            </div>
          </div>
          {(profile?.subscription_tier === 'free' || !profile?.subscription_tier) && !profile?.is_trial ? (
            <Button className="gap-2" onClick={() => onUpgradeClick('monthly')}>
              <ArrowUp className="h-4 w-4" weight="bold" />
              {t('current.upgrade')}
            </Button>
          ) : (profile?.subscription_tier === 'monthly' || profile?.subscription_tier === 'yearly') ? (
            <Button className="gap-2" variant="outline" onClick={() => onUpgradeClick(profile.subscription_tier as PlanId)}>
              <ArrowUp className="h-4 w-4" weight="bold" />
              {t('current.renew')}
            </Button>
          ) : null}
        </div>

        {/* Subscription Expiry - 显示到期时间 */}
        {(profile?.subscription_tier === 'monthly' || profile?.subscription_tier === 'yearly') && profile?.subscription_ends_at && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 border-2 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Clock className="h-5 w-5" weight="regular" />
              <span className="font-semibold text-base">{t('current.expiryTitle')}</span>
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
                  return t('current.daysLeft', { days: daysLeft });
                } else if (daysLeft === 0) {
                  return t('current.expiresToday');
                } else {
                  return t('current.expired');
                }
              })()}
            </p>
          </div>
        )}

        {profile?.is_trial && profile?.trial_ends_at && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <Gift className="h-4 w-4" weight="fill" />
              <span className="font-medium">{t('current.trialPeriod')}</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-500 mt-1">
              {t('current.trialUntil', { date: formatDate(profile.trial_ends_at) })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
