/**
 * API Token Component
 * Displays the Yunwu API token and usage information
 */
import { useState } from 'react';
import { Key, Copy, Clock, Eye, EyeSlash, Warning, ArrowUp } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { YunwuToken, PlanId } from './types';
import { useTranslation } from 'react-i18next';

interface APITokenProps {
  yunwuToken: YunwuToken;
  onCopyToClipboard: (text: string) => void;
  formatNumber: (num: number | undefined | null) => string;
  formatDate: (dateStr: string) => string;
  getTierDisplayName: () => string;
  onUpgradeClick?: (planId: PlanId) => void;
}

/**
 * Mask API key to show only first 4 and last 4 characters
 * Example: "sk-abc123xyz789token" -> "sk-a****oken"
 */
function maskApiKey(apiKey: string | undefined): string {
  if (!apiKey) return '';
  if (apiKey.length <= 8) {
    // Too short to mask meaningfully, just show asterisks
    return '*'.repeat(apiKey.length);
  }
  const firstPart = apiKey.slice(0, 4);
  const lastPart = apiKey.slice(-4);
  const maskedLength = apiKey.length - 8;
  return `${firstPart}${'*'.repeat(Math.min(maskedLength, 8))}${lastPart}`;
}

export function APIToken({
  yunwuToken,
  onCopyToClipboard,
  formatNumber,
  formatDate,
  getTierDisplayName,
  onUpgradeClick,
}: APITokenProps) {
  const { t } = useTranslation('subscription');
  const [showFullKey, setShowFullKey] = useState(false);

  const displayKey = showFullKey
    ? yunwuToken.apiKey
    : maskApiKey(yunwuToken.apiKey);

  // Check if quota is exceeded
  // Case 1: token data exists and available <= 0
  // Case 2: API returned error with "quota" or "exhausted" keyword
  const isQuotaExceeded =
    (yunwuToken.token && yunwuToken.token.total_available <= 0) ||
    (yunwuToken.error &&
      (yunwuToken.error.toLowerCase().includes('quota') ||
        yunwuToken.error.toLowerCase().includes('exhausted')));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" weight="regular" />
          {t('apiToken.title')}
        </CardTitle>
        <CardDescription>{t('apiToken.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Security Warning */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Warning className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" weight="regular" />
          <div className="text-sm">
            <p className="font-medium text-amber-600 dark:text-amber-400">
              {t('apiToken.warningTitle')}
            </p>
            <p className="text-muted-foreground mt-1">
              {t('apiToken.warningBody')}
            </p>
          </div>
        </div>

        {/* API Key Display */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">{t('apiToken.apiKeyLabel')}</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono truncate select-none">
              {displayKey}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFullKey(!showFullKey)}
              title={showFullKey ? t('apiToken.hideKey') : t('apiToken.showKey')}
            >
              {showFullKey ? (
                <EyeSlash className="h-4 w-4" weight="regular" />
              ) : (
                <Eye className="h-4 w-4" weight="regular" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => yunwuToken.apiKey && onCopyToClipboard(yunwuToken.apiKey)}
              title={t('apiToken.copyKey')}
            >
              <Copy className="h-4 w-4" weight="regular" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('apiToken.toggleHint', { action: showFullKey ? t('apiToken.hide') : t('apiToken.show') })}
          </p>
        </div>

        {/* Quota Exceeded Warning */}
        {isQuotaExceeded && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <Warning className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" weight="regular" />
            <div className="text-sm flex-1">
              <p className="font-medium text-destructive">
                {t('apiToken.quotaExceededTitle')}
              </p>
              <p className="text-muted-foreground mt-1">
                {t('apiToken.quotaExceededBody')}
              </p>
              {onUpgradeClick && (
                <Button
                  variant="default"
                  size="sm"
                  className="mt-3 gap-2"
                  onClick={() => onUpgradeClick('monthly')}
                >
                  <ArrowUp className="h-4 w-4" weight="bold" />
                  {t('apiToken.renewNow')}
                </Button>
              )}
            </div>
          </div>
        )}

        {yunwuToken.token && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>{t('apiToken.used')}</span>
              <span className="font-medium">
                {formatNumber(yunwuToken.token.total_used)} / {formatNumber(yunwuToken.token.total_granted)}
              </span>
            </div>
            <Progress
              value={yunwuToken.token.total_granted ? Math.min((yunwuToken.token.total_used / yunwuToken.token.total_granted) * 100, 100) : 0}
              className={`h-2 ${isQuotaExceeded ? '[&>div]:bg-destructive' : ''}`}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className={isQuotaExceeded ? 'text-destructive font-medium' : ''}>
                {t('apiToken.remainingLabel')} {formatNumber(yunwuToken.token.total_available)} tokens
              </span>
              {yunwuToken.token.expires_at > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" weight="regular" />
                  {t('apiToken.expires')} {new Date(yunwuToken.token.expires_at * 1000).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* When API returns error but no token data - show error info */}
        {!yunwuToken.token && yunwuToken.error && (
          <div className="rounded-lg bg-muted/50 p-3 border border-muted">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('apiToken.usageInfo')}</span>
              <span className="text-destructive font-medium text-xs">
                {t('apiToken.usageUnavailable')}
              </span>
            </div>
          </div>
        )}

        {yunwuToken.subscription && (
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('apiToken.subscriptionType')}</span>
              <Badge variant={yunwuToken.subscription.tier === 'yearly' ? 'default' : 'secondary'}>
                {getTierDisplayName()}
              </Badge>
            </div>
            {yunwuToken.subscription.endsAt && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">{t('apiToken.endsAt')}</span>
                <span className="text-sm">{formatDate(yunwuToken.subscription.endsAt)}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
