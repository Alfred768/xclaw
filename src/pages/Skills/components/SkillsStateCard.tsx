import type { ReactNode } from 'react';
import { CircleNotch, Info, WarningCircle } from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type SkillsStateVariant = 'loading' | 'error' | 'empty';

interface SkillsStateCardProps {
  variant: SkillsStateVariant;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  testId?: string;
}

const variantStyles: Record<SkillsStateVariant, string> = {
  loading: 'border-border/70 bg-card/70',
  empty: 'border-dashed border-border/80 bg-muted/20',
  error: 'border-destructive/40 bg-destructive/5',
};

const variantIcon: Record<SkillsStateVariant, ReactNode> = {
  loading: <CircleNotch className="h-5 w-5 animate-spin text-muted-foreground" weight="bold" />,
  empty: <Info className="h-5 w-5 text-muted-foreground" weight="regular" />,
  error: <WarningCircle className="h-5 w-5 text-destructive" weight="fill" />,
};

export function SkillsStateCard({
  variant,
  title,
  description,
  action,
  className,
  testId,
}: SkillsStateCardProps) {
  return (
    <Card
      data-testid={testId ?? `skills-state-${variant}`}
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn('border-border/70', variantStyles[variant], className)}
    >
      <CardContent className="flex items-start gap-3 p-4 sm:p-5">
        <div className="mt-0.5 shrink-0">{variantIcon[variant]}</div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
          {action ? <div className="pt-2">{action}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}
