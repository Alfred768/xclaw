/**
 * NavigationButtons Component
 * Back/Next/Skip buttons for setup wizard
 */

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { STEP } from '../constants';

interface NavigationButtonsProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  currentStep: number;
  canProceed: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}

export function NavigationButtons({
  isFirstStep,
  isLastStep,
  currentStep,
  canProceed,
  onBack,
  onNext,
  onSkip,
}: NavigationButtonsProps) {
  const { t } = useTranslation('setup');

  return (
    <div className="flex justify-between">
      <div>
        {!isFirstStep && (
          <Button variant="ghost" onClick={onBack}>
            <CaretLeft className="h-4 w-4 mr-2" weight="bold" />
            {t('nav.back')}
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        {currentStep === STEP.CHANNEL && (
          <Button variant="ghost" onClick={onNext}>
            {t('nav.skipStep')}
          </Button>
        )}
        {!isLastStep && currentStep !== STEP.RUNTIME && currentStep !== STEP.CHANNEL && currentStep !== STEP.AUTH && (
          <Button variant="ghost" onClick={onSkip}>
            {t('nav.skipSetup')}
          </Button>
        )}
        <Button onClick={onNext} disabled={!canProceed}>
          {isLastStep ? (
            t('nav.getStarted')
          ) : (
            <>
              {t('nav.next')}
              <CaretRight className="h-4 w-4 ml-2" weight="bold" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
