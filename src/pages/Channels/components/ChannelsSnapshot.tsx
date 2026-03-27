import type { ReactNode } from 'react';
import { Broadcast, Power, Radio } from '@phosphor-icons/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

interface ChannelsSnapshotProps {
  total: number;
  connected: number;
  disconnected: number;
  configuredTypes: number;
}

function SnapshotItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

export function ChannelsSnapshot({
  total,
  connected,
  disconnected,
  configuredTypes,
}: ChannelsSnapshotProps) {
  const { t } = useTranslation('channels');

  return (
    <Card className="border-border/70 bg-background/80" data-testid="channels-snapshot">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t('snapshotTitle', { defaultValue: 'Channel snapshot' })}
        </CardTitle>
        <CardDescription>
          {t('snapshotDescription', {
            defaultValue: 'Live view of configured connections and gateway reachability.',
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SnapshotItem
            label={t('stats.total')}
            value={total}
            icon={<Radio className="h-3.5 w-3.5" weight="regular" />}
          />
          <SnapshotItem
            label={t('stats.connected')}
            value={connected}
            icon={<Power className="h-3.5 w-3.5" weight="regular" />}
          />
          <SnapshotItem
            label={t('stats.disconnected')}
            value={disconnected}
            icon={<Broadcast className="h-3.5 w-3.5" weight="regular" />}
          />
          <SnapshotItem
            label={t('configuredTypes', { defaultValue: 'Configured types' })}
            value={configuredTypes}
            icon={<Power className="h-3.5 w-3.5" weight="regular" />}
          />
        </div>
      </CardContent>
    </Card>
  );
}
