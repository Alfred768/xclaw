import { CircleNotch, CheckCircle, WarningCircle, Info } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SettingsState = 'loading' | 'empty' | 'error' | 'success';

interface SettingsStatePanelProps {
  state: SettingsState;
  title: string;
  description?: string;
  action?: ReactNode;
}

const stateStyles: Record<SettingsState, string> = {
  loading: 'border-border bg-muted/30',
  empty: 'border-dashed border-border bg-muted/20',
  error: 'border-destructive/40 bg-destructive/5',
  success: 'border-green-500/30 bg-green-500/5',
};

const stateIcon: Record<SettingsState, ReactNode> = {
  loading: <CircleNotch className="h-4 w-4 animate-spin text-muted-foreground" weight="bold" />,
  empty: <Info className="h-4 w-4 text-muted-foreground" weight="regular" />,
  error: <WarningCircle className="h-4 w-4 text-destructive" weight="fill" />,
  success: <CheckCircle className="h-4 w-4 text-green-600" weight="fill" />,
};

export function SettingsStatePanel({
  state,
  title,
  description,
  action,
}: SettingsStatePanelProps) {
  return (
    <div
      data-testid={`settings-state-panel-${state}`}
      role={state === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start justify-between gap-3 rounded-lg border px-3 py-2',
        stateStyles[state]
      )}
    >
      <div
        data-testid="settings-state-panel-content"
        className="min-w-0 flex items-start gap-2"
      >
        <span className="mt-0.5 shrink-0">{stateIcon[state]}</span>
        <div className="min-w-0">
          <p className="break-words text-sm font-medium">{title}</p>
          {description ? (
            <p className="break-words text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? (
        <div data-testid="settings-state-panel-action" className="shrink-0">
          {action}
        </div>
      ) : null}
    </div>
  );
}

export type { SettingsState };
