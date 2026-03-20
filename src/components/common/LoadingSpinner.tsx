/**
 * Loading Spinner Component
 * Displays a spinning loader animation
 */
import { CircleNotch } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <CircleNotch
        className={cn('animate-spin text-primary', sizeClasses[size])}
        weight="bold"
      />
    </div>
  );
}

/**
 * Full page loading spinner
 */
export function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
