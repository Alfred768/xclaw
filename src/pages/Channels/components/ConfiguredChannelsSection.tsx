import { Trash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, type Status } from '@/components/common/StatusBadge';
import { CHANNEL_ICONS, CHANNEL_NAMES, type Channel } from '@/types/channel';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface ConfiguredChannelsSectionProps {
  channels: Channel[];
  onDelete: (channel: Channel) => void;
  onAddChannel: () => void;
}

export function ConfiguredChannelsSection({
  channels,
  onDelete,
  onAddChannel,
}: ConfiguredChannelsSectionProps) {
  const { t } = useTranslation('channels');

  return (
    <Card className="border-border/70 bg-background/80" data-testid="channels-configured-section">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <CardTitle>{t('configured', { defaultValue: 'Configured channels' })}</CardTitle>
            <CardDescription>{t('configuredDesc', { defaultValue: 'Channels already linked to the gateway.' })}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onAddChannel} data-testid="channels-configured-add">
            {t('addChannel')}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {channels.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-6">
            <p className="text-sm font-medium text-foreground">
              {t('configuredEmpty', { defaultValue: 'No channels are connected yet.' })}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('configuredEmptyDesc', {
                defaultValue: 'Use the add button to connect Telegram, Discord, WhatsApp, or another supported channel.',
              })}
            </p>
          </div>
        ) : (
          channels.map((channel) => {
            const status = channel.status as Status;

            return (
              <article
                key={channel.id}
                className={cn(
                  'rounded-2xl border border-border/70 bg-background/70 p-4 transition-colors',
                  channel.error && 'border-destructive/30 bg-destructive/[0.04]'
                )}
                data-testid={`channel-card-${channel.id}`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/30 text-xl">
                      {CHANNEL_ICONS[channel.type]}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-medium text-foreground">{channel.name}</h3>
                        <Badge variant="secondary" className="shrink-0">
                          {CHANNEL_NAMES[channel.type]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('configuredItemDesc', {
                          defaultValue: 'Managed by the gateway and ready for chat workflows.',
                        })}
                      </p>
                      {channel.error ? (
                        <p className="text-xs text-destructive">{channel.error}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <StatusBadge status={status} />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(channel)}
                      data-testid={`channel-delete-${channel.id}`}
                    >
                      <Trash className="mr-2 h-4 w-4" weight="regular" />
                      {t('delete', { defaultValue: 'Delete' })}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
