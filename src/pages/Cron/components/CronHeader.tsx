import { ArrowClockwise, Plus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface CronHeaderProps {
  title: string;
  subtitle: string;
  canInteract: boolean;
  onRefresh: () => void;
  onCreate: () => void;
}

export function CronHeader({
  title,
  subtitle,
  canInteract,
  onRefresh,
  onCreate,
}: CronHeaderProps) {
  const { t } = useTranslation('cron');

  return (
    <header className="rounded-xl border border-border/70 bg-background/70 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={!canInteract}
            data-testid="cron-refresh-action"
          >
            <ArrowClockwise className="mr-2 h-4 w-4" weight="regular" />
            {t('refresh')}
          </Button>
          <Button
            onClick={onCreate}
            disabled={!canInteract}
            data-testid="cron-create-action"
          >
            <Plus className="mr-2 h-4 w-4" weight="bold" />
            {t('newTask')}
          </Button>
        </div>
      </div>
    </header>
  );
}
