import { Broadcast, Clock, Pulse, PuzzlePiece } from '@phosphor-icons/react';
import type { GatewayStatus } from '@/types/gateway';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useTranslation } from 'react-i18next';

interface DashboardSummaryProps {
  gatewayStatus: GatewayStatus;
  connectedChannels: number;
  totalChannels: number;
  enabledSkills: number;
  totalSkills: number;
  uptimeLabel: string;
}

export function DashboardSummary({
  gatewayStatus,
  connectedChannels,
  totalChannels,
  enabledSkills,
  totalSkills,
  uptimeLabel,
}: DashboardSummaryProps) {
  const { t } = useTranslation('dashboard');

  return (
    <section data-testid="dashboard-summary" className="space-y-3">
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Pulse className="h-4 w-4 text-primary" weight="regular" />
            {t('gateway')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <StatusBadge status={gatewayStatus.state} />
          {gatewayStatus.state === 'running' && (
            <p className="text-xs text-muted-foreground">
              {t('port', { port: gatewayStatus.port })} | {t('pid', { pid: gatewayStatus.pid || 'N/A' })}
            </p>
          )}
          {gatewayStatus.error && (
            <p className="text-xs text-destructive">{gatewayStatus.error}</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="grid grid-cols-1 gap-3 p-4">
          <div className="flex items-center justify-between rounded-md border border-border/60 bg-background/60 px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Broadcast className="h-4 w-4" weight="regular" />
              {t('channels')}
            </div>
            <p className="text-sm font-semibold text-foreground">{t('connectedOf', { connected: connectedChannels, total: totalChannels })}</p>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border/60 bg-background/60 px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PuzzlePiece className="h-4 w-4" weight="regular" />
              {t('skills')}
            </div>
            <p className="text-sm font-semibold text-foreground">{t('enabledOf', { enabled: enabledSkills, total: totalSkills })}</p>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border/60 bg-background/60 px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" weight="regular" />
              {t('uptime')}
            </div>
            <p className="text-sm font-semibold text-foreground">{uptimeLabel}</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
