/**
 * Models List Component
 * Supported models display with copy functionality
 */
import { Lightning, CircleNotch, Warning } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AvailableModels, YunwuToken } from './types';
import { useTranslation } from 'react-i18next';

interface ModelsListProps {
  availableModels: AvailableModels;
  yunwuToken: YunwuToken | null;
  showAllModels: boolean;
  onToggleShowAll: () => void;
  onCopyToClipboard: (text: string) => void;
}

export function ModelsList({
  availableModels,
  yunwuToken,
  showAllModels,
  onToggleShowAll,
  onCopyToClipboard,
}: ModelsListProps) {
  const { t } = useTranslation('subscription');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightning className="h-5 w-5" weight="fill" />
          {t('models.title')}
        </CardTitle>
        <CardDescription>{t('models.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {availableModels.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <CircleNotch className="h-6 w-6 animate-spin text-muted-foreground" weight="bold" />
          </div>
        ) : (
          <>
            {availableModels.recommendedModels.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">{t('models.recommended')}</p>
                <div className="flex flex-wrap gap-2">
                  {availableModels.recommendedModels.map((modelId) => (
                    <Badge
                      key={modelId}
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80 transition-colors"
                      onClick={() => onCopyToClipboard(modelId)}
                    >
                      {modelId}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {availableModels.models.length > 0 && (
              <div className="space-y-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground p-0 h-auto"
                  onClick={onToggleShowAll}
                >
                  {showAllModels ? t('models.collapse') : t('models.showAll', { count: availableModels.models.length })}
                </Button>

                {showAllModels && (
                  <div className="max-h-64 overflow-y-auto border rounded-md p-3">
                    <div className="flex flex-wrap gap-2">
                      {availableModels.models.map((model) => (
                        <Badge
                          key={model.id}
                          variant="outline"
                          className="cursor-pointer hover:bg-secondary/80 transition-colors font-mono text-xs"
                          onClick={() => onCopyToClipboard(model.id)}
                          title={model.name || model.id}
                        >
                          {model.id}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!yunwuToken?.hasToken && (
              <p className="text-xs text-muted-foreground">
                {t('models.noToken')}
              </p>
            )}

            {/* Show error when API fails (e.g., quota exhausted) */}
            {availableModels.error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Warning className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" weight="regular" />
                <div className="text-sm">
                  <p className="text-amber-600 dark:text-amber-400">
                    {t('models.quotaExceeded')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('models.quotaExceededHint')}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
