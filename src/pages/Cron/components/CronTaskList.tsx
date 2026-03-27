import { useState } from 'react';
import {
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  PencilSimple,
  Play,
  Trash,
  WarningCircle,
  XCircle,
  CircleNotch,
} from '@phosphor-icons/react';
import type { CronJob } from '@/types/cron';
import { CHANNEL_ICONS } from '@/types/channel';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { formatRelativeTime } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface CronTaskListProps {
  jobs: CronJob[];
  canInteract: boolean;
  formatSchedule: (schedule: CronJob['schedule']) => string;
  onView: (job: CronJob) => void;
  onEdit: (job: CronJob) => void;
  onToggle: (job: CronJob, enabled: boolean) => void;
  onDelete: (job: CronJob) => void;
  onTrigger: (job: CronJob) => Promise<void>;
}

export function CronTaskList({
  jobs,
  canInteract,
  formatSchedule,
  onView,
  onEdit,
  onToggle,
  onDelete,
  onTrigger,
}: CronTaskListProps) {
  const { t } = useTranslation('cron');
  const [triggering, setTriggering] = useState<Record<string, boolean>>({});

  const handleTrigger = async (job: CronJob) => {
    setTriggering((prev) => ({ ...prev, [job.id]: true }));
    try {
      await onTrigger(job);
    } finally {
      setTriggering((prev) => ({ ...prev, [job.id]: false }));
    }
  };

  return (
    <section className="space-y-3">
      {jobs.map((job) => {
        const isTriggering = Boolean(triggering[job.id]);

        return (
          <Card key={job.id} className="border-border/70">
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground">{job.name}</h3>
                    <Badge variant={job.enabled ? 'default' : 'secondary'}>
                      {job.enabled ? t('common:status.active') : t('common:status.paused')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{job.message}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" weight="regular" />
                      {formatSchedule(job.schedule)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span>{CHANNEL_ICONS[job.target.channelType]}</span>
                      {job.target.channelName}
                    </span>
                    {job.nextRun && job.enabled && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" weight="regular" />
                        {new Date(job.nextRun).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <Switch
                  checked={job.enabled}
                  onCheckedChange={(enabled) => onToggle(job, enabled)}
                  disabled={!canInteract}
                />
              </div>

              {job.lastRun && (
                <div className="rounded-md border border-border/70 bg-muted/30 p-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {job.lastRun.success ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-600" weight="fill" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-destructive" weight="fill" />
                    )}
                    <span>{t('card.last')}: {formatRelativeTime(job.lastRun.time)}</span>
                  </div>
                  {!job.lastRun.success && job.lastRun.error && (
                    <div className="mt-1 flex items-start gap-1 text-destructive">
                      <WarningCircle className="mt-0.5 h-3.5 w-3.5" weight="fill" />
                      <span>{job.lastRun.error}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(job)}
                  data-testid={`cron-view-job-${job.id}`}
                >
                  <Eye className="mr-1.5 h-4 w-4" weight="regular" />
                  {t('common:actions.view', { defaultValue: 'View' })}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(job)}
                  disabled={!canInteract}
                  data-testid={`cron-edit-job-${job.id}`}
                >
                  <PencilSimple className="mr-1.5 h-4 w-4" weight="regular" />
                  {t('common:actions.edit')}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTrigger(job)}
                  disabled={!canInteract || isTriggering}
                >
                  {isTriggering ? (
                    <CircleNotch className="mr-1.5 h-4 w-4 animate-spin" weight="bold" />
                  ) : (
                    <Play className="mr-1.5 h-4 w-4" weight="fill" />
                  )}
                  {t('card.runNow')}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(job)}
                  disabled={!canInteract}
                >
                  <Trash className="mr-1.5 h-4 w-4" weight="regular" />
                  {t('common:actions.delete')}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
