import type { ReactNode } from 'react';
import { WarningCircle, FileText } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

interface TodoStatePanelProps {
  state: 'loading' | 'empty' | 'error' | 'success';
  title?: string;
  description?: string;
  error?: string | null;
  onDismissError?: () => void;
  children?: ReactNode;
}

export function TodoStatePanel({
  state,
  title,
  description,
  error,
  onDismissError,
  children,
}: TodoStatePanelProps) {
  const { t } = useTranslation('todo');

  if (state === 'loading') {
    return (
      <div className="py-10 text-center" data-testid="todo-state-loading">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        <p className="mt-4 text-sm text-muted-foreground">{description ?? title}</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div
        className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        data-testid="todo-state-error"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-center gap-2">
            <WarningCircle className="h-4 w-4" weight="fill" />
            <span>{error}</span>
          </p>
          {onDismissError ? (
            <button
              className="shrink-0 text-xs underline"
              onClick={onDismissError}
              data-testid="todo-error-dismiss"
            >
              {t('dismiss')}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <Card data-testid="todo-state-empty">
        <CardContent className="py-12 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          {title ? <h3 className="mb-2 text-lg font-medium">{title}</h3> : null}
          {description ? <p className="mb-4 text-muted-foreground">{description}</p> : null}
          {children}
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className="mb-4 rounded-lg border border-border/60 bg-card/60 px-4 py-3"
      data-testid="todo-state-success"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          {title ? <p className="text-sm font-medium">{title}</p> : null}
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {children}
      </div>
    </div>
  );
}

export function TodoStateActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="outline" asChild>
      <a href={href}>{label}</a>
    </Button>
  );
}
