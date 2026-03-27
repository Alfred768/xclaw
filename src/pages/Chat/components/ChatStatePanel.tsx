import type { ReactNode } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface ChatStatePanelProps {
  state: 'loading' | 'empty' | 'success';
  title?: string;
  description?: string;
  children?: ReactNode;
}

export function ChatStatePanel({ state, title, description, children }: ChatStatePanelProps) {
  return (
    <section
      className="rounded-xl border border-border/60 bg-card/70 p-5"
      data-testid={`chat-state-${state}`}
    >
      {state === 'loading' ? (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoadingSpinner size="sm" />
          <span>{description ?? title}</span>
        </div>
      ) : (
        <div className="space-y-3">
          {title ? <h2 className="text-base font-medium">{title}</h2> : null}
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          {children}
        </div>
      )}
    </section>
  );
}
