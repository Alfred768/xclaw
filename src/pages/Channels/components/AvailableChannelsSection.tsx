import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CHANNEL_ICONS, CHANNEL_META, getPrimaryChannels, type ChannelMeta, type ChannelType } from '@/types/channel';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface AvailableChannelsSectionProps {
  configuredTypes: string[];
  onSelectType: (type: ChannelType) => void;
}

function ConnectionTypeLabel({ type }: { type: ChannelMeta['connectionType'] }) {
  const { t } = useTranslation('channels');

  const label =
    type === 'qr'
      ? t('dialog.qrCode')
      : type === 'webhook'
        ? 'Webhook'
        : t('dialog.token');

  return <span>{label}</span>;
}

export function AvailableChannelsSection({
  configuredTypes,
  onSelectType,
}: AvailableChannelsSectionProps) {
  const { t } = useTranslation('channels');
  const displayedTypes = getPrimaryChannels();

  return (
    <Card className="border-border/70 bg-background/80" data-testid="channels-available-section">
      <CardHeader className="pb-4">
        <CardTitle>{t('available')}</CardTitle>
        <CardDescription>{t('availableDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {displayedTypes.map((type) => {
            const meta = CHANNEL_META[type];
            const isConfigured = configuredTypes.includes(type);

            return (
              <button
                key={type}
                type="button"
                className={cn(
                  'group relative overflow-hidden rounded-2xl border border-border/70 bg-background/70 p-4 text-left transition-all',
                  'hover:-translate-y-0.5 hover:border-border hover:bg-accent/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isConfigured && 'border-emerald-500/35 bg-emerald-500/[0.05]'
                )}
                onClick={() => onSelectType(type)}
                data-testid={`channel-available-${type}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/30 text-xl">
                    {CHANNEL_ICONS[type]}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium text-foreground">{meta.name}</h3>
                      {isConfigured ? (
                        <Badge variant="secondary">
                          {t('configuredBadge', { defaultValue: 'Configured' })}
                        </Badge>
                      ) : null}
                      {meta.isPlugin ? (
                        <Badge variant="outline">{t('pluginBadge')}</Badge>
                      ) : null}
                    </div>
                    <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {t(meta.description)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <ConnectionTypeLabel type={meta.connectionType} />
                  <span className="opacity-0 transition-opacity group-hover:opacity-100">
                    {t('dialog.selectDesc')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
