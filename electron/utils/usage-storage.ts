/**
 * Usage Records Storage
 * Stores token usage records for analytics
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { app } from 'electron';
import { join } from 'path';

export interface UsageRecord {
  id: string;
  timestamp: number;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface UsageStore {
  records: UsageRecord[];
}

/**
 * Get the usage store file path
 */
function getUsageStorePath(): string {
  const userDataPath = app.getPath('userData');
  return join(userDataPath, 'usage-records.json');
}

/**
 * Load usage records from disk
 */
export function loadUsageRecords(): UsageRecord[] {
  try {
    const filePath = getUsageStorePath();
    if (!existsSync(filePath)) {
      return [];
    }
    const data = readFileSync(filePath, 'utf-8');
    const store: UsageStore = JSON.parse(data);
    return store.records || [];
  } catch (error) {
    console.error('Failed to load usage records:', error);
    return [];
  }
}

/**
 * Save usage records to disk
 */
function saveUsageRecords(records: UsageRecord[]): void {
  try {
    const filePath = getUsageStorePath();
    const dir = join(filePath, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const store: UsageStore = { records };
    writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save usage records:', error);
  }
}

/**
 * Add a new usage record
 */
export function addUsageRecord(record: Omit<UsageRecord, 'id'>): UsageRecord {
  const newRecord: UsageRecord = {
    ...record,
    id: `usage-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  };
  const records = loadUsageRecords();
  records.push(newRecord);

  // Keep only last 10000 records to prevent file from growing too large
  const trimmedRecords = records.slice(-10000);
  saveUsageRecords(trimmedRecords);

  return newRecord;
}

/**
 * Get usage records for a time range
 */
export function getUsageRecordsByTimeRange(startTime: number, endTime: number): UsageRecord[] {
  const records = loadUsageRecords();
  return records.filter(r => r.timestamp >= startTime && r.timestamp <= endTime);
}

/**
 * Get aggregated usage stats
 */
export function getUsageStats(startTime: number, endTime: number): {
  totalTokens: number;
  totalRequests: number;
  byModel: Record<string, { tokens: number; requests: number }>;
} {
  const records = getUsageRecordsByTimeRange(startTime, endTime);

  const stats = {
    totalTokens: 0,
    totalRequests: records.length,
    byModel: {} as Record<string, { tokens: number; requests: number }>,
  };

  for (const record of records) {
    stats.totalTokens += record.totalTokens;

    if (!stats.byModel[record.model]) {
      stats.byModel[record.model] = { tokens: 0, requests: 0 };
    }
    stats.byModel[record.model].tokens += record.totalTokens;
    stats.byModel[record.model].requests += 1;
  }

  return stats;
}

/**
 * Clear all usage records
 */
export function clearUsageRecords(): void {
  saveUsageRecords([]);
}
