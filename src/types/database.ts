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
          display_name: string | null;
          avatar_url: string | null;
          wechat_openid: string | null;
          alipay_user_id: string | null;
          subscription_tier: 'free' | 'pro' | 'enterprise';
          preferences: Json | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          wechat_openid?: string | null;
          alipay_user_id?: string | null;
          subscription_tier?: 'free' | 'pro' | 'enterprise';
          preferences?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          wechat_openid?: string | null;
          alipay_user_id?: string | null;
          subscription_tier?: 'free' | 'pro' | 'enterprise';
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
