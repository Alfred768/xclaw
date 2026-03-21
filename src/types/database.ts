/**
 * Supabase Database Types
 * Auto-generated types for Supabase database
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      auth_sessions: {
        Row: {
          id: string;
          login_token: string;
          provider: 'wechat' | 'alipay';
          status: 'pending' | 'completed' | 'expired' | 'error';
          provider_user_id: string | null;
          user_info: Json | null;
          supabase_user_id: string | null;
          session_token: string | null;
          processed_auth_code: string | null;
          created_at: string;
          expires_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          login_token: string;
          provider: 'wechat' | 'alipay';
          status?: 'pending' | 'completed' | 'expired' | 'error';
          provider_user_id?: string | null;
          user_info?: Json | null;
          supabase_user_id?: string | null;
          session_token?: string | null;
          processed_auth_code?: string | null;
          created_at?: string;
          expires_at: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          login_token?: string;
          provider?: 'wechat' | 'alipay';
          status?: 'pending' | 'completed' | 'expired' | 'error';
          provider_user_id?: string | null;
          user_info?: Json | null;
          supabase_user_id?: string | null;
          session_token?: string | null;
          processed_auth_code?: string | null;
          created_at?: string;
          expires_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'auth_sessions_supabase_user_id_fkey';
            columns: ['supabase_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      user_profiles: {
        Row: {
          id: string;
          public_id: string;
          display_name: string | null;
          avatar_url: string | null;
          wechat_openid: string | null;
          alipay_user_id: string | null;
          subscription_tier: 'free' | 'monthly' | 'yearly' | 'pro' | 'enterprise';
          is_trial: boolean;
          trial_ends_at: string | null;
          subscription_ends_at: string | null;
          yunwu_api_key: string | null;
          preferences: Json | null;
          created_at: string;
        };
        Insert: {
          id: string;
          public_id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          wechat_openid?: string | null;
          alipay_user_id?: string | null;
          subscription_tier?: 'free' | 'monthly' | 'yearly' | 'pro' | 'enterprise';
          is_trial?: boolean;
          trial_ends_at?: string | null;
          subscription_ends_at?: string | null;
          yunwu_api_key?: string | null;
          preferences?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          public_id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          wechat_openid?: string | null;
          alipay_user_id?: string | null;
          subscription_tier?: 'free' | 'monthly' | 'yearly' | 'pro' | 'enterprise';
          is_trial?: boolean;
          trial_ends_at?: string | null;
          subscription_ends_at?: string | null;
          yunwu_api_key?: string | null;
          preferences?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      api_keys: {
        Row: {
          id: string;
          user_id: string;
          key_hash: string;
          key_prefix: string;
          name: string | null;
          last_used_at: string | null;
          created_at: string;
          expires_at: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          key_hash: string;
          key_prefix: string;
          name?: string | null;
          last_used_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          key_hash?: string;
          key_prefix?: string;
          name?: string | null;
          last_used_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'api_keys_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      usage_quotas: {
        Row: {
          id: string;
          user_id: string;
          total_tokens_quota: number;
          tokens_used: number;
          billing_cycle_start: string;
          billing_cycle_end: string | null;
          reset_policy: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_tokens_quota?: number;
          tokens_used?: number;
          billing_cycle_start?: string;
          billing_cycle_end?: string | null;
          reset_policy?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total_tokens_quota?: number;
          tokens_used?: number;
          billing_cycle_start?: string;
          billing_cycle_end?: string | null;
          reset_policy?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'usage_quotas_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      zpay_transactions: {
        Row: {
          id: string;
          user_id: string;
          out_trade_no: string;
          trade_no: string | null;
          amount: number;
          payment_type: 'alipay' | 'wxpay';
          product_name: string;
          status: 'pending' | 'paid' | 'failed';
          processed_trade_no: string | null;
          metadata: Json | null;
          callback_data: Json | null;
          created_at: string;
          paid_at: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          out_trade_no: string;
          trade_no?: string | null;
          amount: number;
          payment_type: 'alipay' | 'wxpay';
          product_name: string;
          status?: 'pending' | 'paid' | 'failed';
          processed_trade_no?: string | null;
          metadata?: Json | null;
          callback_data?: Json | null;
          created_at?: string;
          paid_at?: string | null;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          out_trade_no?: string;
          trade_no?: string | null;
          amount?: number;
          payment_type?: 'alipay' | 'wxpay';
          product_name?: string;
          status?: 'pending' | 'paid' | 'failed';
          processed_trade_no?: string | null;
          metadata?: Json | null;
          callback_data?: Json | null;
          created_at?: string;
          paid_at?: string | null;
          expires_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'zpay_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type AuthSession = Database['public']['Tables']['auth_sessions']['Row'];
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type ApiKey = Database['public']['Tables']['api_keys']['Row'];
export type UsageQuota = Database['public']['Tables']['usage_quotas']['Row'];

// ZPay Transaction Types
export type ZpayTransaction = Database['public']['Tables']['zpay_transactions']['Row'];
export type ZpayTransactionInsert = Database['public']['Tables']['zpay_transactions']['Insert'];
export type ZpayTransactionUpdate = Database['public']['Tables']['zpay_transactions']['Update'];
