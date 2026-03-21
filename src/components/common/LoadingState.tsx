/**
 * LoadingState Component
 * Displays animated loading indicators with optional message
 */
import * as React from 'react';

export interface LoadingStateProps {
  message?: string;
  variant?: 'spinner' | 'skeleton' | 'dots';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  variant = 'spinner',
  className = '',
}) => {
  if (variant === 'skeleton') {
    return <SkeletonLoader className={className} />;
  }

  if (variant === 'dots') {
    return (
      <div
        className={`flex flex-col items-center justify-center p-8 ${className}`}
      >
        <div className="flex space-x-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-3 w-3 rounded-full bg-primary animate-bounce"
              style={{
                animationDelay: `${i * 0.15}s`,
                animationDuration: '0.6s',
              }}
            />
          ))}
        </div>
        {message && (
          <p className="mt-4 text-sm text-muted-foreground">{message}</p>
        )}
      </div>
    );
  }

  // Default spinner
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 ${className}`}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      {message && (
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
};

// Skeleton variants for different use cases
export const SkeletonCard: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <div
    className={`rounded-lg border bg-card p-6 space-y-4 animate-pulse ${className}`}
  >
    <div className="h-4 bg-muted rounded w-3/4" />
    <div className="space-y-2">
      <div className="h-3 bg-muted rounded" />
      <div className="h-3 bg-muted rounded w-5/6" />
    </div>
    <div className="h-8 bg-muted rounded w-1/3" />
  </div>
);

export const SkeletonList: React.FC<{ count?: number; className?: string }> = ({
  count = 3,
  className = '',
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="flex items-center space-x-4 p-4 rounded-lg border bg-card animate-pulse"
      >
        <div className="h-12 w-12 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-3 bg-muted rounded w-3/4" />
        </div>
      </div>
    ))}
  </div>
);

const SkeletonLoader: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`space-y-4 p-4 ${className}`}>
    <div className="h-8 bg-muted rounded animate-pulse w-1/3" />
    <SkeletonList count={2} />
  </div>
);
