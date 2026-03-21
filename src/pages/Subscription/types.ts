/**
 * Subscription Page Types
 * Shared types for subscription components
 */

export type PlanId = 'free' | 'monthly' | 'yearly';

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  price: number;
  priceText: string;
  period: string;
  tokens: number;
  tokensText: string;
  features: string[];
  popular?: boolean;
  savings?: string;
}

export interface YunwuToken {
  hasToken: boolean;
  apiKey?: string;
  token?: {
    total_granted: number;
    total_used: number;
    total_available: number;
    expires_at: number;
  };
  subscription?: {
    tier: string;
    endsAt: string;
  };
  error?: string; // API error message (e.g., "Token quota exhausted")
}

export interface AvailableModels {
  models: Array<{ id: string; name: string }>;
  recommendedModels: string[];
  isLoading: boolean;
  error?: string; // API error message (e.g., "Token quota exhausted")
}

export interface TrialClaimResult {
  success: boolean;
  message?: string;
}

export interface TrialConfig {
  quota: number;
  durationDays: number;
}

export type PaymentStatus = 'idle' | 'pending' | 'success' | 'failed';
