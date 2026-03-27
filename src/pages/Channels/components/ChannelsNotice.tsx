import { WarningCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ChannelsNoticeProps {
  title: string;
  description: string;
  tone?: 'warning' | 'error';
  actionLabel?: string;
  onAction?: () => void;
}

export function ChannelsNotice({
  title,
  description,
  tone = 'warning',
  actionLabel,
  onAction,
}: ChannelsNoticeProps) {
  const isWarning = tone === 'warning';

  return (
    <Card
      className={cn(
        'border',
        isWarning ? 'border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/20' : 'border-destructive/30 bg-destructive/5'
      )}
      data-testid={`channels-notice-${tone}`}
    >
      <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <WarningCircle
            className={cn('mt-0.5 h-5 w-5', isWarning ? 'text-amber-600' : 'text-destructive')}
            weight="fill"
          />
          <div className="space-y-1">
            <p className="font-medium text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        {actionLabel && onAction ? (
          <Button variant="outline" size="sm" onClick={onAction} data-testid="channels-notice-action">
            {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
