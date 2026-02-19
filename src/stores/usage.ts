/**
 * Usage Store
 * Manages token usage analytics data
 * Fetches real data from electron-store via IPC
 */
import { create } from 'zustand';

export interface UsageRecord {
  id: string;
  timestamp: number;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface UsageStats {
  totalTokens: number;
  totalRequests: number;
  byModel: Record<string, { tokens: number; requests: number }>;
}

export interface UsageData {
  totalTokens: number;
  totalRequests: number;
  tokenOverTime: { date: string; tokens: number }[];
  modelBreakdown: { model: string; requests: number; tokens: number }[];
}

type TimeRange = '7d' | '30d' | '90d' | 'thisMonth' | 'lastMonth';

interface UsageState {
  data: UsageData | null;
  records: UsageRecord[];
  isLoading: boolean;
  timeRange: TimeRange;
  lastUpdated: number | null;

  // Actions
  fetchUsage: () => Promise<void>;
  setTimeRange: (range: TimeRange) => void;
  clearRecords: () => Promise<void>;
}

// Get time range in milliseconds
function getTimeRangeMs(range: TimeRange): number {
  const now = Date.now();
  switch (range) {
    case '7d':
      return 7 * 24 * 60 * 60 * 1000;
    case '30d':
      return 30 * 24 * 60 * 60 * 1000;
    case '90d':
      return 90 * 24 * 60 * 60 * 1000;
    case 'thisMonth':
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      return now - startOfMonth.getTime();
    case 'lastMonth':
      const startOfLastMonth = new Date();
      startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
      startOfLastMonth.setDate(1);
      startOfLastMonth.setHours(0, 0, 0, 0);
      const endOfLastMonth = new Date();
      endOfLastMonth.setDate(0);
      endOfLastMonth.setHours(23, 59, 59, 999);
      return endOfLastMonth.getTime() - startOfLastMonth.getTime();
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

// Transform raw records to usage data for charts
function transformUsageData(records: UsageRecord[], timeRange: TimeRange): UsageData {
  const now = new Date();
  const rangeMs = getTimeRangeMs(timeRange);
  const startTime = now.getTime() - rangeMs;

  // Filter records by time range
  const filteredRecords = records.filter(r => r.timestamp >= startTime);

  // Calculate totals
  const totalTokens = filteredRecords.reduce((sum, r) => sum + r.totalTokens, 0);
  const totalRequests = filteredRecords.length;

  // Group by date for token over time chart
  const byDate: Record<string, number> = {};
  for (const record of filteredRecords) {
    const date = new Date(record.timestamp).toISOString().split('T')[0];
    byDate[date] = (byDate[date] || 0) + record.totalTokens;
  }

  // Sort dates and create tokenOverTime array
  const tokenOverTime = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, tokens]) => ({ date, tokens }));

  // Group by model for model breakdown
  const byModel: Record<string, { tokens: number; requests: number }> = {};
  for (const record of filteredRecords) {
    if (!byModel[record.model]) {
      byModel[record.model] = { tokens: 0, requests: 0 };
    }
    byModel[record.model].tokens += record.totalTokens;
    byModel[record.model].requests += 1;
  }

  // Sort by tokens and create model breakdown array
  const modelBreakdown = Object.entries(byModel)
    .sort(([, a], [, b]) => b.tokens - a.tokens)
    .map(([model, data]) => ({
      model,
      requests: data.requests,
      tokens: data.tokens,
    }));

  return {
    totalTokens,
    totalRequests,
    tokenOverTime,
    modelBreakdown,
  };
}

export const useUsageStore = create<UsageState>((set, get) => ({
  data: null,
  records: [],
  isLoading: false,
  timeRange: '7d',
  lastUpdated: null,

  fetchUsage: async () => {
    set({ isLoading: true });

    try {
      const timeRange = get().timeRange;
      const rangeMs = getTimeRangeMs(timeRange);
      const endTime = Date.now();
      const startTime = endTime - rangeMs;

      // Get usage stats
      const result = await window.electron.ipcRenderer.invoke('usage:getRecords', {
        startTime,
        endTime,
      }) as { success: boolean; data?: UsageStats; error?: string };

      // Get all records for detailed breakdown
      const recordsResult = await window.electron.ipcRenderer.invoke('usage:getAllRecords', {
        limit: 1000,
      }) as { success: boolean; data?: UsageRecord[]; error?: string };

      if (result.success && result.data && recordsResult.success && recordsResult.data) {
        const data = transformUsageData(recordsResult.data, timeRange);
        set({
          data,
          records: recordsResult.data,
          isLoading: false,
          lastUpdated: Date.now(),
        });
      } else {
        console.error('Failed to fetch usage data:', result.error);
        set({
          data: null,
          records: [],
          isLoading: false,
          lastUpdated: Date.now(),
        });
      }
    } catch (error) {
      console.error('Error fetching usage data:', error);
      set({
        data: null,
        records: [],
        isLoading: false,
        lastUpdated: Date.now(),
      });
    }
  },

  setTimeRange: (range: TimeRange) => {
    set({ timeRange: range });
    get().fetchUsage();
  },

  clearRecords: async () => {
    try {
      await window.electron.ipcRenderer.invoke('usage:clear') as { success: boolean; error?: string };
      set({
        data: null,
        records: [],
        lastUpdated: Date.now(),
      });
    } catch (error) {
      console.error('Error clearing usage records:', error);
    }
  },
}));
