/**
 * API Configuration Component
 * Provider configuration form for Yunwu AI
 */
import { Sliders, Check, Eye, EyeSlash, CircleNotch } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { YunwuToken } from './types';
import { useTranslation } from 'react-i18next';

interface APIConfigurationProps {
  yunwuToken: YunwuToken | null;
  providerApiKey: string;
  providerModelId: string;
  showProviderApiKey: boolean;
  isSavingProvider: boolean;
  isEditingProvider: boolean;
  yunwuProviderExists: boolean;
  existingProviderModel?: string;
  onApiKeyChange: (value: string) => void;
  onModelIdChange: (value: string) => void;
  onToggleShowApiKey: () => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
}

export function APIConfiguration({
  yunwuToken,
  providerApiKey,
  providerModelId,
  showProviderApiKey,
  isSavingProvider,
  isEditingProvider,
  yunwuProviderExists,
  existingProviderModel,
  onApiKeyChange,
  onModelIdChange,
  onToggleShowApiKey,
  onSave,
  onCancel,
  onEdit,
}: APIConfigurationProps) {
  const { t } = useTranslation('subscription');

  // Show configuration form
  if (!yunwuProviderExists || isEditingProvider) {
    return (
      <Card className="border-2 border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sliders className="h-5 w-5" weight="regular" />
            {isEditingProvider ? t('apiConfig.editTitle') : t('apiConfig.title')}
          </CardTitle>
          <CardDescription>
            {isEditingProvider ? t('apiConfig.editDescription') : t('apiConfig.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 mb-4">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              {yunwuToken?.apiKey ? t('apiConfig.tipWithAutoFill') : t('apiConfig.tipWithoutAutoFill')}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Base URL</Label>
            <Input
              value="https://yunwu.ai/v1"
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">{t('apiConfig.baseUrlHint')}</p>
          </div>

          <div className="space-y-2">
            <Label>API Type</Label>
            <Input
              value="OpenAI Completions"
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">{t('apiConfig.apiTypeHint')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="providerModelId">{t('apiConfig.modelIdLabel')}</Label>
            <Input
              id="providerModelId"
              placeholder={t('apiConfig.modelIdPlaceholder')}
              value={providerModelId}
              onChange={(e) => onModelIdChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('apiConfig.modelIdHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="providerApiKey">{t('apiConfig.apiKeyLabel')}</Label>
            <div className="relative">
              <Input
                id="providerApiKey"
                type={showProviderApiKey ? 'text' : 'password'}
                placeholder={t('apiConfig.apiKeyPlaceholder')}
                value={providerApiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={onToggleShowApiKey}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showProviderApiKey ? <EyeSlash className="h-4 w-4" weight="regular" /> : <Eye className="h-4 w-4" weight="regular" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {yunwuToken?.apiKey ? t('apiConfig.apiKeyHintAutoFill') : t('apiConfig.apiKeyHintManual')}
            </p>
          </div>

          <div className="flex gap-2">
            {isEditingProvider && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={onCancel}
                disabled={isSavingProvider}
              >
                {t('apiConfig.cancel')}
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={onSave}
              disabled={isSavingProvider || !providerApiKey.trim()}
            >
              {isSavingProvider ? (
                <>
                  <CircleNotch className="h-4 w-4 mr-2 animate-spin" weight="bold" />
                  {t('apiConfig.saving')}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" weight="bold" />
                  {isEditingProvider ? t('apiConfig.updateConfig') : t('apiConfig.saveConfig')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show configured status
  return (
    <Card className="border-2 border-green-500/50">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
            <Check className="h-5 w-5" weight="bold" />
            <div>
              <p className="font-medium">{t('apiConfig.configuredTitle')}</p>
              <p className="text-sm text-muted-foreground">
                {t('apiConfig.currentModel', { model: existingProviderModel || t('apiConfig.defaultModel') })}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={onEdit}
          >
            {t('apiConfig.editConfig')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
