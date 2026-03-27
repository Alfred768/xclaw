import { BarChart2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface AccountUsageSummaryProps {
  planLabel: string;
  usagePercentage: number;
  usedTokens: number;
  totalTokens: number;
}

export function AccountUsageSummary({
  planLabel,
  usagePercentage,
  usedTokens,
  totalTokens,
}: AccountUsageSummaryProps) {
  const { t } = useTranslation('account');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5" />
          {t('usage.title')}
        </CardTitle>
        <CardDescription>{t('usage.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{t('usage.currentPlan')}</p>
            <Badge variant="secondary" className="max-w-full truncate">
              {planLabel}
            </Badge>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <a href="#account-usage">
              {t('usage.openDetailed', { defaultValue: 'Open Detailed Usage' })}
            </a>
          </Button>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>{t('usage.tokensUsed')}</span>
            <span className="font-medium">
              {usedTokens.toLocaleString()} / {totalTokens.toLocaleString()}
            </span>
          </div>
          <Progress value={usagePercentage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
