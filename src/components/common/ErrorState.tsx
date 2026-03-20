/**
 * ErrorState Component
 * Displays when operations fail with retry option
 */
import * as React from 'react';
import { WarningCircle, ArrowClockwise } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryText = 'Try again',
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
    >
      <div className="mb-4 rounded-full bg-destructive/10 p-4">
        <WarningCircle className="h-8 w-8 text-destructive" weight="fill" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">{message}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="mt-4"
          size="default"
        >
          <ArrowClockwise className="mr-2 h-4 w-4" weight="bold" />
          {retryText}
        </Button>
      )}
    </div>
  );
};
