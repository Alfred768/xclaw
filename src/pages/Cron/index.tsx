import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleNotch, Timer, WarningCircle, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCronStore } from '@/stores/cron';
import { useChannelsStore } from '@/stores/channels';
import { useGatewayStore } from '@/stores/gateway';
import { toast } from 'sonner';
import type { Channel } from '@/types/channel';
import { CHANNEL_ICONS } from '@/types/channel';
import type { CronJob, CronJobCreateInput, ScheduleType } from '@/types/cron';
import { CronHeader } from './components/CronHeader';
import { CronTaskList } from './components/CronTaskList';
import { CronStatePanel } from './components/CronStatePanel';
import { useTranslation } from 'react-i18next';

const schedulePresets: Array<{ key: string; value: string; type: ScheduleType }> = [
  { key: 'everyMinute', value: '* * * * *', type: 'interval' },
  { key: 'every5Min', value: '*/5 * * * *', type: 'interval' },
  { key: 'every15Min', value: '*/15 * * * *', type: 'interval' },
  { key: 'everyHour', value: '0 * * * *', type: 'interval' },
  { key: 'daily9am', value: '0 9 * * *', type: 'daily' },
  { key: 'daily6pm', value: '0 18 * * *', type: 'daily' },
  { key: 'weeklyMon', value: '0 9 * * 1', type: 'weekly' },
  { key: 'monthly1st', value: '0 9 1 * *', type: 'monthly' },
];

function parseCronExpr(cron: string): string {
  const preset = schedulePresets.find((item) => item.value === cron);
  if (preset) {
    if (preset.key === 'everyMinute') return 'Every minute';
    if (preset.key === 'every5Min') return 'Every 5 minutes';
    if (preset.key === 'every15Min') return 'Every 15 minutes';
    if (preset.key === 'everyHour') return 'Every hour';
    if (preset.key === 'daily9am') return 'Daily at 9am';
    if (preset.key === 'daily6pm') return 'Daily at 6pm';
    if (preset.key === 'weeklyMon') return 'Weekly (Mon 9am)';
    if (preset.key === 'monthly1st') return 'Monthly (1st at 9am)';
  }
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;

  const [minute, hour, dayOfMonth, , dayOfWeek] = parts;
  if (minute === '*' && hour === '*') return 'Every minute';
  if (minute.startsWith('*/')) return `Every ${minute.slice(2)} minutes`;
  if (hour === '*' && minute === '0') return 'Every hour';
  if (dayOfWeek !== '*' && dayOfMonth === '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `Weekly on ${days[Number.parseInt(dayOfWeek, 10)]} at ${hour}:${minute.padStart(2, '0')}`;
  }
  if (dayOfMonth !== '*') return `Monthly on day ${dayOfMonth} at ${hour}:${minute.padStart(2, '0')}`;
  if (hour !== '*') return `Daily at ${hour}:${minute.padStart(2, '0')}`;
  return cron;
}

function extractCronExpr(schedule: CronJob['schedule']): string {
  if (typeof schedule === 'string') return schedule;
  if (schedule.kind === 'cron') return schedule.expr;
  return '0 9 * * *';
}

function describeSchedule(schedule: CronJob['schedule']): string {
  if (typeof schedule === 'string') return parseCronExpr(schedule);
  if (schedule.kind === 'cron') return parseCronExpr(schedule.expr);
  if (schedule.kind === 'every') {
    const ms = schedule.everyMs;
    if (ms < 60_000) return `Every ${Math.round(ms / 1000)}s`;
    if (ms < 3_600_000) return `Every ${Math.round(ms / 60_000)} minutes`;
    if (ms < 86_400_000) return `Every ${Math.round(ms / 3_600_000)} hours`;
    return `Every ${Math.round(ms / 86_400_000)} days`;
  }
  return `Once at ${new Date(schedule.at).toLocaleString()}`;
}

type DialogMode = 'create' | 'edit' | 'view';

interface TaskDialogProps {
  mode: DialogMode;
  job?: CronJob;
  channels: Channel[];
  onClose: () => void;
  onSave: (input: CronJobCreateInput) => Promise<void>;
}

function TaskDialog({ mode, job, channels, onClose, onSave }: TaskDialogProps) {
  const { t } = useTranslation('cron');
  const readOnly = mode === 'view';
  const [saving, setSaving] = useState(false);

  const initialSchedule = job ? extractCronExpr(job.schedule) : '0 9 * * *';
  const matchedPreset = schedulePresets.some((preset) => preset.value === initialSchedule);
  const initialChannelId = (() => {
    if (job) {
      const directMatch = channels.find((channel) => channel.id === job.target.channelId);
      if (directMatch) return directMatch.id;

      const typeMatch = channels.find((channel) => channel.type === job.target.channelType);
      if (typeMatch) return typeMatch.id;
    }
    return channels[0]?.id || '';
  })();

  const [name, setName] = useState(job?.name || '');
  const [message, setMessage] = useState(job?.message || '');
  const [schedule, setSchedule] = useState(matchedPreset ? initialSchedule : schedulePresets[4].value);
  const [customSchedule, setCustomSchedule] = useState(matchedPreset ? '' : initialSchedule);
  const [useCustom, setUseCustom] = useState(!matchedPreset);
  const [channelId, setChannelId] = useState(initialChannelId);
  const [discordChannelId, setDiscordChannelId] = useState(
    job?.target.channelType === 'discord' ? job.target.channelId : ''
  );
  const [enabled, setEnabled] = useState(job?.enabled ?? true);

  useEffect(() => {
    if (!channelId && channels.length > 0) {
      setChannelId(channels[0].id);
    }
  }, [channelId, channels]);

  const selectedChannel = channels.find((channel) => channel.id === channelId);
  const isDiscord = selectedChannel?.type === 'discord';

  const handleSubmit = async () => {
    if (readOnly) {
      onClose();
      return;
    }

    if (!name.trim()) {
      toast.error(t('toast.nameRequired'));
      return;
    }
    if (!message.trim()) {
      toast.error(t('toast.messageRequired'));
      return;
    }
    if (!selectedChannel) {
      toast.error(t('toast.channelRequired'));
      return;
    }

    const finalSchedule = (useCustom ? customSchedule : schedule).trim();
    if (!finalSchedule) {
      toast.error(t('toast.scheduleRequired'));
      return;
    }

    if (selectedChannel.type === 'discord' && !discordChannelId.trim()) {
      toast.error(t('toast.discordIdRequired'));
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        message: message.trim(),
        schedule: finalSchedule,
        enabled,
        target: {
          channelType: selectedChannel.type,
          channelId: selectedChannel.type === 'discord' ? discordChannelId.trim() : '',
          channelName: selectedChannel.name,
        },
      });
      onClose();
      toast.success(mode === 'edit' ? t('toast.updated') : t('toast.created'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const dialogTitle = mode === 'create'
    ? t('dialog.createTitle')
    : mode === 'edit'
      ? t('dialog.editTitle')
      : t('dialog.viewTitle', { defaultValue: 'View Task' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <Card className="w-full max-w-xl" onClick={(event) => event.stopPropagation()}>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>{dialogTitle}</CardTitle>
            <CardDescription>{t('dialog.description')}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" weight="regular" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cron-name">{t('dialog.taskName')}</Label>
            <Input
              id="cron-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('dialog.taskNamePlaceholder')}
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cron-message">{t('dialog.message')}</Label>
            <Textarea
              id="cron-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              placeholder={t('dialog.messagePlaceholder')}
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('dialog.schedule')}</Label>
            {!useCustom ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {schedulePresets.map((preset) => (
                  <Button
                    key={preset.value}
                    type="button"
                    variant={schedule === preset.value ? 'default' : 'outline'}
                    size="sm"
                    className="justify-start"
                    onClick={() => setSchedule(preset.value)}
                    disabled={readOnly}
                  >
                    <Timer className="mr-2 h-4 w-4" weight="regular" />
                    {t(`presets.${preset.key}`)}
                  </Button>
                ))}
              </div>
            ) : (
              <Input
                id="cron-schedule"
                value={customSchedule}
                onChange={(event) => setCustomSchedule(event.target.value)}
                placeholder={t('dialog.cronPlaceholder')}
                disabled={readOnly}
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (readOnly) return;
                setUseCustom((prev) => {
                  if (!prev && !customSchedule) {
                    setCustomSchedule(schedule);
                  }
                  return !prev;
                });
              }}
              className="text-xs"
              disabled={readOnly}
            >
              {useCustom ? t('dialog.usePresets') : t('dialog.useCustomCron')}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>{t('dialog.targetChannel')}</Label>
            {channels.length === 0 ? (
              <p className="rounded-md border border-dashed border-border/70 px-3 py-2 text-sm text-muted-foreground">
                {t('dialog.noChannels')}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {channels.map((channel) => (
                  <Button
                    key={channel.id}
                    type="button"
                    variant={channel.id === channelId ? 'default' : 'outline'}
                    className="justify-start"
                    onClick={() => setChannelId(channel.id)}
                    disabled={readOnly}
                  >
                    <span className="mr-2">{CHANNEL_ICONS[channel.type]}</span>
                    {channel.name}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {isDiscord && (
            <div className="space-y-2">
              <Label htmlFor="cron-discord-channel-id">{t('dialog.discordChannelId')}</Label>
              <Input
                id="cron-discord-channel-id"
                value={discordChannelId}
                onChange={(event) => setDiscordChannelId(event.target.value)}
                placeholder={t('dialog.discordChannelIdPlaceholder')}
                disabled={readOnly}
              />
              <p className="text-xs text-muted-foreground">{t('dialog.discordChannelIdDesc')}</p>
            </div>
          )}

          <div className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
            <div>
              <p className="text-sm font-medium">{t('dialog.enableImmediately')}</p>
              <p className="text-xs text-muted-foreground">{t('dialog.enableImmediatelyDesc')}</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} disabled={readOnly} />
          </div>

          <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
            <Button variant="outline" onClick={onClose}>
              {t('common:actions.cancel')}
            </Button>
            {!readOnly && (
              <Button onClick={handleSubmit} disabled={saving || channels.length === 0}>
                {saving ? (
                  <>
                    <CircleNotch className="mr-2 h-4 w-4 animate-spin" weight="bold" />
                    {t('common:status.saving')}
                  </>
                ) : mode === 'edit' ? (
                  t('dialog.saveChanges')
                ) : (
                  t('dialog.createTitle')
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function Cron() {
  const { t } = useTranslation('cron');
  const {
    jobs,
    loading,
    error,
    fetchJobs,
    createJob,
    updateJob,
    toggleJob,
    deleteJob,
    triggerJob,
  } = useCronStore();
  const channels = useChannelsStore((state) => state.channels);
  const fetchChannels = useChannelsStore((state) => state.fetchChannels);
  const gatewayStatus = useGatewayStore((state) => state.status);

  const isGatewayRunning = gatewayStatus.state === 'running';

  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [activeJob, setActiveJob] = useState<CronJob | undefined>();

  useEffect(() => {
    if (isGatewayRunning) {
      void fetchJobs();
      void fetchChannels();
    }
  }, [isGatewayRunning, fetchJobs, fetchChannels]);

  const closeDialog = () => {
    setDialogMode(null);
    setActiveJob(undefined);
  };

  const openCreate = () => {
    setActiveJob(undefined);
    setDialogMode('create');
  };

  const openEdit = (job: CronJob) => {
    setActiveJob(job);
    setDialogMode('edit');
  };

  const openView = (job: CronJob) => {
    setActiveJob(job);
    setDialogMode('view');
  };

  const handleSave = useCallback(async (input: CronJobCreateInput) => {
    if (dialogMode === 'edit' && activeJob) {
      await updateJob(activeJob.id, input);
      toast.success(t('toast.updated'));
      return;
    }

    await createJob(input);
    toast.success(t('toast.created'));
  }, [dialogMode, activeJob, updateJob, createJob, t]);

  const handleToggle = useCallback(async (job: CronJob, enabled: boolean) => {
    try {
      await toggleJob(job.id, enabled);
      toast.success(enabled ? t('toast.enabled') : t('toast.paused'));
    } catch {
      toast.error(t('toast.failedUpdate'));
    }
  }, [toggleJob, t]);

  const handleDelete = useCallback(async (job: CronJob) => {
    if (!confirm(t('card.deleteConfirm'))) return;

    try {
      await deleteJob(job.id);
      toast.success(t('toast.deleted'));
    } catch {
      toast.error(t('toast.failedDelete'));
    }
  }, [deleteJob, t]);

  const handleTrigger = useCallback(async (job: CronJob) => {
    try {
      await triggerJob(job.id);
      toast.success(t('toast.triggered'));
    } catch (err) {
      toast.error(
        `${t('toast.failedTrigger', { defaultValue: 'Failed to trigger task' })}: ${err instanceof Error ? err.message : String(err)}`
      );
      throw err;
    }
  }, [triggerJob, t]);

  const metrics = useMemo(() => {
    const total = jobs.length;
    const active = jobs.filter((job) => job.enabled).length;
    const paused = jobs.filter((job) => !job.enabled).length;
    const failed = jobs.filter((job) => Boolean(job.lastRun && !job.lastRun.success)).length;
    return { total, active, paused, failed };
  }, [jobs]);

  const canInteract = isGatewayRunning;

  return (
    <div className="space-y-4">
      <CronHeader
        title={t('title')}
        subtitle={t('subtitle')}
        canInteract={canInteract}
        onRefresh={() => void fetchJobs()}
        onCreate={openCreate}
      />

      {!isGatewayRunning && (
        <Card className="border-yellow-500/40 bg-yellow-50/60 dark:bg-yellow-900/10">
          <CardContent className="flex items-center gap-2 py-4 text-sm text-yellow-700 dark:text-yellow-300">
            <WarningCircle className="h-4 w-4" weight="fill" />
            {t('gatewayWarning')}
          </CardContent>
        </Card>
      )}

      {loading && jobs.length === 0 && <CronStatePanel variant="loading" />}

      {!loading && error && (
        <CronStatePanel
          variant="error"
          error={error}
          onRetry={() => void fetchJobs()}
        />
      )}

      {!loading && !error && jobs.length === 0 && (
        <CronStatePanel
          variant="empty"
          onCreate={openCreate}
        />
      )}

      {!loading && !error && jobs.length > 0 && (
        <>
          <CronTaskList
            jobs={jobs}
            canInteract={canInteract}
            formatSchedule={describeSchedule}
            onView={openView}
            onEdit={openEdit}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onTrigger={handleTrigger}
          />
          <CronStatePanel variant="success" metrics={metrics} />
        </>
      )}

      {dialogMode && (
        <TaskDialog
          mode={dialogMode}
          job={activeJob}
          channels={channels}
          onClose={closeDialog}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default Cron;
