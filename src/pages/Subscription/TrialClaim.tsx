/**
 * Trial Claim Component
 * Free trial claim card
 */
import { Gift, CircleNotch } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrialClaimResult, TrialConfig, YunwuToken } from './types';
import { useTranslation } from 'react-i18next';

interface TrialClaimProps {
  trialConfig: TrialConfig;
  yunwuToken: YunwuToken | null;
  accessToken: string | null;
  isClaimingTrial: boolean;
  trialClaimResult: TrialClaimResult | null;
  onClaimTrial: () => void;
  onResetTrial: () => void;
}

export function TrialClaim({
  trialConfig,
  yunwuToken,
  accessToken,
  isClaimingTrial,
  trialClaimResult,
  onClaimTrial,
  onResetTrial,
}: TrialClaimProps) {
  const { t } = useTranslation('subscription');

  return (
    <Card className="border-purple-200 dark:border-purple-800">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Gift className="h-5 w-5 mr-2 text-purple-500" weight="fill" />
          {t('trial.title')}
        </CardTitle>
        <CardDescription>
          {t('trial.description', {
            quotaK: (trialConfig.quota / 1000).toFixed(0),
            days: trialConfig.durationDays,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-purple-50 dark:bg-purple-950 p-3 mb-4">
          <p className="text-sm text-purple-700 dark:text-purple-400">
            🎁 {t('trial.tip')}
          </p>
        </div>

        {/* Check if user already has yunwu_api_key */}
        {!yunwuToken?.hasToken ? (
          <>
            {!accessToken && (
              <div className="text-sm p-3 rounded-md bg-yellow-50 dark:bg-yellow-950 text-yellow-600 mb-3">
                ⚠️ {t('trial.loginRequired')}
              </div>
            )}
            <Button
              className="w-full bg-purple-500 hover:bg-purple-600"
              onClick={onClaimTrial}
              disabled={isClaimingTrial || !accessToken}
            >
              {isClaimingTrial ? (
                <>
                  <CircleNotch className="h-4 w-4 mr-2 animate-spin" weight="bold" />
                  {t('trial.claiming')}
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" weight="fill" />
                  {t('trial.claimButton')}
                </>
              )}
            </Button>
            {trialClaimResult && (
              <div className={`text-sm p-3 rounded-md ${trialClaimResult.success ? 'text-green-600 bg-green-50 dark:bg-green-950' : 'text-red-600 bg-red-50 dark:bg-red-950'}`}>
                {trialClaimResult.message}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <div className="text-sm p-3 rounded-md bg-green-50 dark:bg-green-950 text-green-600">
              ✓ {t('trial.hasToken')}
            </div>
            {/* Reset trial button for testing */}
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={onResetTrial}
            >
              {t('trial.resetForTesting')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
