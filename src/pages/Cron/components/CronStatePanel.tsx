import {
  Clock,
  CircleNotch,
  WarningCircle,
  CheckCircle,
  Pause,
  XCircle,
  Plus,
  ArrowClockwise,
} from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export type CronStateVariant = 'loading' | 'error' | 'empty' | 'success';

interface CronStatePanelProps {
  variant: CronStateVariant;
  error?: string | null;
  onRetry?: () => void;
  onCreate?: () => void;
  metrics?: {
    total: number;
    active: number;
    paused: number;
    failed: number;
  };
}

export function CronStatePanel({
  variant,
  error,
  onRetry,
  onCreate,
  metrics,
}: CronStatePanelProps) {
  const { t } = useTranslation('cron');

  if (variant === 'loading') {
    return (
      <Card data-testid="cron-state-loading" className="border-border/70">
        <CardContent className="flex items-center gap-3 py-10 text-muted-foreground">
          <CircleNotch className="h-5 w-5 animate-spin" weight="bold" />
          <div>
            <p className="font-medium text-foreground">{t('state.loadingTitle', { defaultValue: 'Loading scheduled tasks...' })}</p>
            <p className="text-sm">{t('state.loadingDescription', { defaultValue: 'Fetching the latest cron list and status.' })}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'error') {
    return (
      <Card data-testid="cron-state-error" className="border-destructive/40">
        <CardContent className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <WarningCircle className="mt-0.5 h-5 w-5 text-destructive" weight="fill" />
            <div>
              <p className="font-medium text-foreground">{t('state.errorTitle', { defaultValue: 'Could not load cron tasks' })}</p>
              <p className="text-sm text-muted-foreground">{error || t('state.errorDescription', { defaultValue: 'Unknown error.' })}</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={onRetry}
            data-testid="cron-retry-action"
          >
            <ArrowClockwise className="mr-2 h-4 w-4" weight="regular" />
            {t('common:actions.refresh')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'empty') {
    return (
      <Card data-testid="cron-state-empty" className="border-dashed border-border/80">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <Clock className="mb-4 h-10 w-10 text-muted-foreground" weight="regular" />
          <p className="text-base font-medium text-foreground">{t('empty.title')}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('empty.description')}
          </p>
          <Button
            className="mt-5"
            onClick={onCreate}
            data-testid="cron-empty-create-action"
          >
            <Plus className="mr-2 h-4 w-4" weight="bold" />
            {t('empty.create')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentMetrics = metrics || { total: 0, active: 0, paused: 0, failed: 0 };

  return (
    <div
      data-testid="cron-state-success"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      <Card className="border-border/70">
        <CardContent className="flex items-center gap-3 py-4">
          <Clock className="h-5 w-5 text-primary" weight="regular" />
          <div>
            <p className="text-xl font-semibold">{currentMetrics.total}</p>
            <p className="text-xs text-muted-foreground">{t('stats.total')}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle className="h-5 w-5 text-green-600" weight="regular" />
          <div>
            <p className="text-xl font-semibold">{currentMetrics.active}</p>
            <p className="text-xs text-muted-foreground">{t('stats.active')}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="flex items-center gap-3 py-4">
          <Pause className="h-5 w-5 text-yellow-600" weight="regular" />
          <div>
            <p className="text-xl font-semibold">{currentMetrics.paused}</p>
            <p className="text-xs text-muted-foreground">{t('stats.paused')}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="flex items-center gap-3 py-4">
          <XCircle className="h-5 w-5 text-destructive" weight="regular" />
          <div>
            <p className="text-xl font-semibold">{currentMetrics.failed}</p>
            <p className="text-xs text-muted-foreground">{t('stats.failed')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
