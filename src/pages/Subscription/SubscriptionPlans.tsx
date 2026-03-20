/**
 * Subscription Plans Component
 * Displays plan selection cards (Free/Monthly/Yearly)
 */
import { Gift, Lightning, Buildings, Check } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlanId, SubscriptionPlan } from './types';
import { useTranslation } from 'react-i18next';

interface SubscriptionPlansProps {
  plans: Record<PlanId, SubscriptionPlan>;
  currentTier?: string;
  onUpgradeClick: (planId: PlanId) => void;
}

export function SubscriptionPlans({ plans, currentTier, onUpgradeClick }: SubscriptionPlansProps) {
  const { t } = useTranslation('subscription');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('plans.title')}</CardTitle>
        <CardDescription>{t('plans.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Free Trial */}
          <div className="rounded-lg border p-4 flex flex-col">
            <Gift className="h-6 w-6 text-green-500 mb-2" weight="fill" />
            <h3 className="font-semibold">{plans.free.name}</h3>
            <div className="mt-2">
              <span className="text-2xl font-bold">{plans.free.priceText}</span>
              <span className="text-muted-foreground">{plans.free.period}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{plans.free.tokensText}</p>
            <ul className="mt-4 space-y-2 flex-1">
              {plans.free.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" weight="bold" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full mt-auto" disabled>
              {t('plans.newUserExclusive')}
            </Button>
          </div>

          {/* Monthly */}
          <div className="rounded-lg border-2 border-primary p-4 relative flex flex-col">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              <Badge>{t('plans.recommended')}</Badge>
            </div>
            <Lightning className="h-6 w-6 text-blue-500 mb-2" weight="fill" />
            <h3 className="font-semibold">{plans.monthly.name}</h3>
            <div className="mt-2">
              <span className="text-2xl font-bold">{plans.monthly.priceText}</span>
              <span className="text-muted-foreground">{plans.monthly.period}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{plans.monthly.tokensText}</p>
            <ul className="mt-4 space-y-2 flex-1">
              {plans.monthly.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" weight="bold" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              className="w-full mt-auto"
              onClick={() => onUpgradeClick('monthly')}
            >
              {currentTier === 'monthly' ? t('plans.renew') : t('plans.subscribeNow')}
            </Button>
          </div>

          {/* Yearly */}
          <div className="rounded-lg border p-4 relative flex flex-col">
            {plans.yearly.savings && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <Badge variant="secondary">{plans.yearly.savings}</Badge>
              </div>
            )}
            <Buildings className="h-6 w-6 text-purple-500 mb-2" weight="regular" />
            <h3 className="font-semibold">{plans.yearly.name}</h3>
            <div className="mt-2">
              <span className="text-2xl font-bold">{plans.yearly.priceText}</span>
              <span className="text-muted-foreground">{plans.yearly.period}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{plans.yearly.tokensText}</p>
            <ul className="mt-4 space-y-2 flex-1">
              {plans.yearly.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" weight="bold" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              className="w-full mt-auto"
              variant="outline"
              onClick={() => onUpgradeClick('yearly')}
            >
              {currentTier === 'yearly' ? t('plans.renew') : t('plans.subscribeNow')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
