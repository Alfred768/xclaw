import { ArrowClockwise, Broadcast, Plus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface ChannelsHeaderProps {
  onRefresh: () => void;
  onAddChannel: () => void;
}

export function ChannelsHeader({ onRefresh, onAddChannel }: ChannelsHeaderProps) {
  const { t } = useTranslation('channels');

  return (
    <header
      data-testid="channels-header"
      className="rounded-2xl border border-border/70 bg-background/85 p-5 shadow-sm backdrop-blur"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Broadcast className="h-3.5 w-3.5" weight="regular" />
            {t('available', { defaultValue: 'Messaging channels' })}
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {t('title')}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={onRefresh}
            data-testid="channels-refresh-action"
          >
            <ArrowClockwise className="mr-2 h-4 w-4" weight="regular" />
            {t('refresh')}
          </Button>
          <Button onClick={onAddChannel} data-testid="channels-add-action">
            <Plus className="mr-2 h-4 w-4" weight="bold" />
            {t('addChannel')}
          </Button>
        </div>
      </div>
    </header>
  );
}
