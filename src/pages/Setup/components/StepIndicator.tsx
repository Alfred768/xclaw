/**
 * StepIndicator Component
 * Progress indicator circles for setup wizard
 */

import { Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { SetupStep } from '../types';

interface StepIndicatorProps {
  steps: SetupStep[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex justify-center pt-8">
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                i < currentStep
                  ? 'border-primary bg-primary text-primary-foreground'
                  : i === currentStep
                    ? 'border-primary text-primary'
                    : 'border-slate-600 text-slate-600'
              )}
            >
              {i < currentStep ? (
                <Check className="h-4 w-4" weight="bold" />
              ) : (
                <span className="text-sm">{i + 1}</span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-8 transition-colors',
                  i < currentStep ? 'bg-primary' : 'bg-slate-600'
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
