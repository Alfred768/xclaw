/**
 * Usage Page
 * Token Usage Analytics Dashboard
 */
import { useEffect } from 'react';
import {
  ArrowClockwise,
  Coins,
  Pulse,
  Trash,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useUsageStore } from '@/stores/usage';

// Format number with commas
function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Custom tooltip for area chart
const CustomAreaTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">
          {formatNumber(payload[0].value)} tokens
        </p>
      </div>
    );
  }
  return null;
};

export function Usage() {
  const { t } = useTranslation('usage');
  const { data, isLoading, timeRange, lastUpdated, fetchUsage, setTimeRange, clearRecords } = useUsageStore();

  // Fetch data on mount
  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeRange(e.target.value as '7d' | '30d' | '90d' | 'thisMonth' | 'lastMonth');
  };

  const handleRefresh = () => {
    fetchUsage();
  };

  const handleClear = async () => {
    if (confirm(t('clear') + '?')) {
      await clearRecords();
    }
  };

  // Render loading state
  if (isLoading && !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <ArrowClockwise className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">{t('noData')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onChange={handleTimeRangeChange} className="bg-card border-border">
            <option value="7d">{t('timeRange.last7Days')}</option>
            <option value="30d">{t('timeRange.last30Days')}</option>
            <option value="90d">{t('timeRange.last90Days')}</option>
            <option value="thisMonth">{t('timeRange.thisMonth')}</option>
            <option value="lastMonth">{t('timeRange.lastMonth')}</option>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <ArrowClockwise className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleClear}
            title={t('clear')}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          title={t('metrics.totalTokens')}
          value={formatNumber(data.totalTokens)}
          icon={<Coins className="h-4 w-4" />}
          color="text-blue-500"
        />
        <MetricCard
          title={t('metrics.apiRequests')}
          value={formatNumber(data.totalRequests)}
          icon={<Pulse className="h-4 w-4" weight="regular" />}
          color="text-green-500"
        />
      </div>

      {/* Token Usage Over Time - Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('charts.tokenUsageOverTime')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {data.tokenOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.tokenOverTime}>
                  <defs>
                    <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip content={<CustomAreaTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="tokens"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#tokenGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                {t('noData')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Model Breakdown - Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('charts.modelBreakdown')}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.modelBreakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">{t('table.model')}</th>
                    <th className="pb-2 font-medium text-right">{t('table.requests')}</th>
                    <th className="pb-2 font-medium text-right">{t('table.tokens')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.modelBreakdown.map((item) => (
                    <tr key={item.model} className="border-b last:border-0">
                      <td className="py-3 text-sm font-medium">{item.model}</td>
                      <td className="py-3 text-right text-sm text-muted-foreground">
                        {formatNumber(item.requests)}
                      </td>
                      <td className="py-3 text-right text-sm font-medium">
                        {formatNumber(item.tokens)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex h-[100px] items-center justify-center text-muted-foreground">
              {t('noData')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Updated */}
      {lastUpdated && (
        <p className="text-center text-xs text-muted-foreground">
          Last updated: {new Date(lastUpdated).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

/**
 * Metric Card Component
 */
interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

function MetricCard({ title, value, icon, color }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className={color}>{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default Usage;
