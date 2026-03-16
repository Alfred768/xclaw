import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * One-time migration to add missing columns to user_profiles table
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Execute the migration SQL
    const { error } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE user_profiles
        ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
      `
    });

    // If RPC doesn't work, try direct SQL via REST API
    if (error) {
      console.log('RPC method failed, trying alternative approach:', error);

      // Try using the REST API to execute SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          query: `
            ALTER TABLE user_profiles
            ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
          `
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('REST API failed:', text);

        // Last resort: try raw SQL execution via Postgres connection
        // This won't work in Edge Functions, so we need to report the issue
        return new Response(
          JSON.stringify({
            error: 'Could not execute migration',
            details: 'Please run the migration SQL manually in Supabase Dashboard',
            sql: `
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
            `.trim()
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Migration completed successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({
        error: 'Migration failed',
        details: String(error),
        manualSql: `
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
        `.trim()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
