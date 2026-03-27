import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageFrameProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

interface PageContextBarProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

interface PageBodyProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export function PageFrame({ children, className, ...props }: PageFrameProps) {
  return (
    <section
      data-testid="page-frame"
      className={cn('flex flex-col gap-4', className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      data-testid="page-header"
      className={cn('flex items-start justify-between gap-4', className)}
      {...props}
    >
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div data-testid="page-header-actions">{actions}</div> : null}
    </header>
  );
}

export function PageContextBar({
  children,
  className,
  ...props
}: PageContextBarProps) {
  if (!children) {
    return null;
  }

  return (
    <div
      data-testid="page-context-bar"
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function PageBody({ children, className, ...props }: PageBodyProps) {
  return (
    <div
      data-testid="page-body"
      className={cn('min-h-0 flex-1', className)}
      {...props}
    >
      {children}
    </div>
  );
}
