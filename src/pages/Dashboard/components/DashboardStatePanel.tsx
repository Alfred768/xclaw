import { ArrowClockwise, CheckCircle, CircleNotch, Info, WarningCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

export type DashboardStateVariant = 'loading' | 'error' | 'empty' | 'success';

interface DashboardStatePanelProps {
  variant: DashboardStateVariant;
  error?: string;
  onRetry?: () => void;
}

export function DashboardStatePanel({ variant, error, onRetry }: DashboardStatePanelProps) {
  const { t } = useTranslation('dashboard');

  if (variant === 'loading') {
    return (
      <Card data-testid="dashboard-state-loading" className="border-border/70">
        <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
          <CircleNotch className="h-4 w-4 animate-spin" weight="bold" />
          {t('state.loading', {
            defaultValue: 'Gateway is starting. Dashboard data is loading...',
          })}
        </CardContent>
      </Card>
    );
  }

  if (variant === 'error') {
    return (
      <Card data-testid="dashboard-state-error" className="border-destructive/40">
        <CardContent className="space-y-3 py-5">
          <div className="flex items-start gap-2 text-sm">
            <WarningCircle className="mt-0.5 h-4 w-4 text-destructive" weight="fill" />
            <div>
              <p className="font-medium text-foreground">
                {t('state.error.title', {
                  defaultValue: 'Dashboard data is unavailable',
                })}
              </p>
              <p className="text-muted-foreground">
                {error || t('state.error.description', { defaultValue: 'Unknown gateway error.' })}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            data-testid="dashboard-retry-action"
          >
            <ArrowClockwise className="mr-1.5 h-4 w-4" weight="regular" />
            {t('common:actions.refresh')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'empty') {
    return (
      <Card data-testid="dashboard-state-empty" className="border-dashed border-border/80">
        <CardContent className="py-6 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4" weight="regular" />
            <div>
              <p className="font-medium text-foreground">
                {t('state.empty.title', {
                  defaultValue: 'No active channels or skills yet',
                })}
              </p>
              <p>
                {t('state.empty.description', {
                  defaultValue: 'Add a channel or enable a skill to populate the dashboard.',
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="dashboard-state-success" className="border-border/70">
      <CardContent className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <CheckCircle className="h-4 w-4 text-green-600" weight="fill" />
        {t('state.success', { defaultValue: 'Dashboard data is up to date.' })}
      </CardContent>
    </Card>
  );
}
