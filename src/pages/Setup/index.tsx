/**
 * Setup Wizard Page
 * First-time setup experience for new users
 */
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TitleBar } from '@/components/layout/TitleBar';
import { useSettingsStore } from '@/stores/settings';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { StepIndicator } from './components/StepIndicator';
import { NavigationButtons } from './components/NavigationButtons';
import { WelcomeStep } from './steps/WelcomeStep';
import { AuthContent } from './AuthContent';
import { RuntimeStep } from './steps/RuntimeStep';
import { ProviderStep } from './steps/ProviderStep';
import { ChannelStep } from './steps/ChannelStep';
import { InstallingStep } from './steps/InstallingStep';
import { CompleteStep } from './steps/CompleteStep';
import { STEP, steps, defaultSkills } from './constants';

export function Setup() {
  const { t } = useTranslation(['setup', 'channels']);
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(STEP.WELCOME);

  // Setup state
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [apiKey, setApiKey] = useState('');
  // Installation state for the Installing step
  const [installedSkills, setInstalledSkills] = useState<string[]>([]);
  // Runtime check status
  const [runtimeChecksPassed, setRuntimeChecksPassed] = useState(false);
  // Auth status
  const [authCompleted, setAuthCompleted] = useState(false);

  const safeStepIndex = Number.isInteger(currentStep)
    ? Math.min(Math.max(currentStep, STEP.WELCOME), steps.length - 1)
    : STEP.WELCOME;
  const step = steps[safeStepIndex] ?? steps[STEP.WELCOME];
  const isFirstStep = safeStepIndex === STEP.WELCOME;
  const isLastStep = safeStepIndex === steps.length - 1;

  const markSetupComplete = useSettingsStore((state) => state.markSetupComplete);

  // Derive canProceed based on current step
  const canProceed = useMemo(() => {
    switch (safeStepIndex) {
      case STEP.WELCOME:
        return true;
      case STEP.AUTH:
        return authCompleted;
      case STEP.RUNTIME:
        return runtimeChecksPassed;
      case STEP.PROVIDER:
        return providerConfigured;
      case STEP.CHANNEL:
        return true; // Always allow proceeding — channel step is optional
      case STEP.INSTALLING:
        return false; // Cannot manually proceed, auto-proceeds when done
      case STEP.COMPLETE:
        return true;
      default:
        return true;
    }
  }, [safeStepIndex, providerConfigured, runtimeChecksPassed, authCompleted]);

  const handleNext = async () => {
    if (isLastStep) {
      // Complete setup
      markSetupComplete();
      toast.success(t('complete.title'));
      navigate('/');
    } else {
      setCurrentStep((i) => i + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((i) => Math.max(i - 1, 0));
  };

  const handleSkip = () => {
    markSetupComplete();
    navigate('/');
  };

  // Auto-proceed when installation is complete
  const handleInstallationComplete = useCallback((skills: string[]) => {
    setInstalledSkills(skills);
    // Auto-proceed to next step after a short delay
    setTimeout(() => {
      setCurrentStep((i) => i + 1);
    }, 1000);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TitleBar />
      <div className="flex-1 overflow-auto">
        {/* Progress Indicator */}
        <StepIndicator steps={steps} currentStep={safeStepIndex} />

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="mx-auto max-w-2xl p-8"
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">{t(`steps.${step.id}.title`)}</h1>
              <p className="text-slate-400">{t(`steps.${step.id}.description`)}</p>
            </div>

            {/* Step-specific content */}
            <div className="rounded-xl bg-card text-card-foreground border shadow-sm p-8 mb-8">
              {safeStepIndex === STEP.WELCOME && <WelcomeStep />}
              {safeStepIndex === STEP.AUTH && (
                <AuthContent onComplete={() => setAuthCompleted(true)} />
              )}
              {safeStepIndex === STEP.RUNTIME && <RuntimeStep onStatusChange={setRuntimeChecksPassed} />}
              {safeStepIndex === STEP.PROVIDER && (
                <ProviderStep
                  selectedProvider={selectedProvider}
                  onSelectProvider={setSelectedProvider}
                  apiKey={apiKey}
                  onApiKeyChange={setApiKey}
                  onConfiguredChange={setProviderConfigured}
                />
              )}
              {safeStepIndex === STEP.CHANNEL && <ChannelStep />}
              {safeStepIndex === STEP.INSTALLING && (
                <InstallingStep
                  skills={defaultSkills}
                  onComplete={handleInstallationComplete}
                  onSkip={() => setCurrentStep((i) => i + 1)}
                />
              )}
              {safeStepIndex === STEP.COMPLETE && (
                <CompleteStep
                  selectedProvider={selectedProvider}
                  installedSkills={installedSkills}
                />
              )}
            </div>

            {/* Navigation - hidden during installation step */}
            {safeStepIndex !== STEP.INSTALLING && (
              <NavigationButtons
                isFirstStep={isFirstStep}
                isLastStep={isLastStep}
                currentStep={safeStepIndex}
                canProceed={canProceed}
                onBack={handleBack}
                onNext={handleNext}
                onSkip={handleSkip}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Setup;
