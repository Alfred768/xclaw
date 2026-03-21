/**
 * Subscription Page
 * Subscription plans, API token, and supported models
 * Standalone page for better visibility and conversion
 */

// Import refactored components
import { SubscriptionPlans } from './SubscriptionPlans';
import { PaymentDialog } from './PaymentDialog';
import { APIConfiguration } from './APIConfiguration';
import { ModelsList } from './ModelsList';
import { CurrentPlan } from './CurrentPlan';
import { TrialClaim } from './TrialClaim';
import { APIToken } from './APIToken';
import { useSubscription } from './useSubscription';
import { useTranslation } from 'react-i18next';

export function Subscription() {
  const { t } = useTranslation('subscription');
  const {
    // State
    quota,
    profile,
    accessToken,
    providers,
    isPaymentDialogOpen,
    selectedPlan,
    paymentStatus,
    errorMessage,
    yunwuToken,
    availableModels,
    isClaimingTrial,
    trialClaimResult,
    subscriptionPrompt,
    providerApiKey,
    providerModelId,
    showProviderApiKey,
    isSavingProvider,
    yunnwuProviderExists,
    existingYunwuProviderId,
    isEditingProvider,
    showAllModels,

    // Constants
    SUBSCRIPTION_PLANS,
    TRIAL_CONFIG,

    // Utility functions
    formatNumber,
    formatDate,
    getTierDisplayName,
    copyToClipboard,

    // Event handlers
    handleUpgradeClick,
    handleClaimTrial,
    handleResetTrial,
    handlePayment,
    handleCloseDialog,
    handleSaveProvider,

    // State setters
    setProviderApiKey,
    setProviderModelId,
    setShowProviderApiKey,
    setIsEditingProvider,
    setShowAllModels,
  } = useSubscription();

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('page.title')}</h1>
        <p className="text-muted-foreground">{t('page.subtitle')}</p>
      </div>

      {/* Current Plan */}
      <CurrentPlan
        profile={profile}
        quota={quota}
        onUpgradeClick={handleUpgradeClick}
        formatDate={formatDate}
      />

      {subscriptionPrompt && (
        <div className="text-sm p-3 rounded-md bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900">
          {subscriptionPrompt.message}
        </div>
      )}

      {/* Subscription Plans */}
      <SubscriptionPlans
        plans={SUBSCRIPTION_PLANS}
        currentTier={profile?.subscription_tier}
        onUpgradeClick={handleUpgradeClick}
      />

      {/* API Token */}
      {yunwuToken?.hasToken && (
        <APIToken
          yunwuToken={yunwuToken}
          onCopyToClipboard={copyToClipboard}
          formatNumber={formatNumber}
          formatDate={formatDate}
          getTierDisplayName={getTierDisplayName}
          onUpgradeClick={handleUpgradeClick}
        />
      )}

      {/* AI Model Provider Configuration */}
      <APIConfiguration
        yunwuToken={yunwuToken}
        providerApiKey={providerApiKey}
        providerModelId={providerModelId}
        showProviderApiKey={showProviderApiKey}
        isSavingProvider={isSavingProvider}
        isEditingProvider={isEditingProvider}
        yunwuProviderExists={yunnwuProviderExists}
        existingProviderModel={providers.find(p => p.id === existingYunwuProviderId)?.model}
        onApiKeyChange={setProviderApiKey}
        onModelIdChange={setProviderModelId}
        onToggleShowApiKey={() => setShowProviderApiKey(!showProviderApiKey)}
        onSave={handleSaveProvider}
        onCancel={() => setIsEditingProvider(false)}
        onEdit={() => setIsEditingProvider(true)}
      />

      {/* Supported Models */}
      <ModelsList
        availableModels={availableModels}
        yunwuToken={yunwuToken}
        showAllModels={showAllModels}
        onToggleShowAll={() => setShowAllModels(!showAllModels)}
        onCopyToClipboard={copyToClipboard}
      />

      {/* Trial Claim Card */}
      <TrialClaim
        trialConfig={TRIAL_CONFIG}
        yunwuToken={yunwuToken}
        accessToken={accessToken}
        isClaimingTrial={isClaimingTrial}
        trialClaimResult={trialClaimResult}
        onClaimTrial={handleClaimTrial}
        onResetTrial={handleResetTrial}
      />

      {/* Payment Dialog */}
      <PaymentDialog
        isOpen={isPaymentDialogOpen}
        selectedPlan={selectedPlan}
        plans={SUBSCRIPTION_PLANS}
        paymentStatus={paymentStatus}
        errorMessage={errorMessage}
        onPayment={handlePayment}
        onClose={handleCloseDialog}
      />
    </div>
  );
}

export default Subscription;
