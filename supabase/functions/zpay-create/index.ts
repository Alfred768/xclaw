import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { md5 } from '../_shared/md5.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate a unique order number
 * Format: ZP + timestamp + random suffix
 */
function generateOrderNo(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomSuffix = crypto.randomUUID().split('-')[0].toUpperCase();
  return `ZP${timestamp}${randomSuffix}`;
}

/**
 * Build ZPay signature
 * 1. Sort parameters by ASCII (excluding sign, sign_type, empty values)
 * 2. Concatenate as a=b&c=d format
 * 3. Append merchant key
 * 4. MD5 hash, lowercase
 */
async function buildSign(params: Record<string, string>, key: string): Promise<string> {
  // Filter out empty values, sign, and sign_type
  const filteredParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== '' && k !== 'sign' && k !== 'sign_type') {
      filteredParams[k] = v;
    }
  }

  // Sort by ASCII key
  const sortedKeys = Object.keys(filteredParams).sort();

  // Build query string
  const queryString = sortedKeys
    .map(k => `${k}=${filteredParams[k]}`)
    .join('&');

  // Append key and MD5
  const signStr = queryString + key;
  return await md5(signStr);
}

/**
 * Build payment URL with parameters
 */
async function buildPaymentUrl(
  baseUrl: string,
  params: Record<string, string>,
  key: string
): Promise<string> {
  const sign = await buildSign(params, key);
  const allParams = { ...params, sign, sign_type: 'MD5' };
  const queryString = Object.entries(allParams)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return `${baseUrl}?${queryString}`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const zpayPid = Deno.env.get('ZPAY_PID')!;
    const zpayKey = Deno.env.get('ZPAY_KEY')!;
    const zpayApiUrl = Deno.env.get('ZPAY_API_URL') || 'https://api.zpay.vip/mapi.php';

    if (!zpayPid || !zpayKey) {
      console.error('ZPay configuration missing');
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the user's token using admin API
    // For Supabase Edge Functions, we need to use admin.getUser() with proper validation
    let userId: string;

    try {
      // Decode JWT to get user ID (the token is already validated by Supabase's gateway)
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const payload = JSON.parse(atob(parts[1]));

      // Verify token hasn't expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return new Response(
          JSON.stringify({ error: 'Token expired' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Verify issuer matches our project
      const expectedIssuer = `${supabaseUrl}/auth/v1`;
      if (payload.iss !== expectedIssuer) {
        console.error('Token issuer mismatch:', payload.iss, 'expected:', expectedIssuer);
        return new Response(
          JSON.stringify({ error: 'Invalid token issuer' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      userId = payload.sub;
      if (!userId) {
        throw new Error('No user ID in token');
      }

      console.log('Token validated for user:', userId);
    } catch (e) {
      console.error('Token validation error:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user details from auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

    if (authError || !authUser?.user) {
      console.error('Failed to get user:', authError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const user = authUser.user;

    // Parse request body
    const body = await req.json();
    const { amount, type, productName, metadata } = body as {
      amount: number;
      type: 'alipay' | 'wxpay';
      productName: string;
      metadata?: Record<string, unknown>;
    };

    // Validate input
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!type || !['alipay', 'wxpay'].includes(type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid payment type' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!productName) {
      return new Response(
        JSON.stringify({ error: 'Product name is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate order number
    const outTradeNo = generateOrderNo();

    // Build URLs
    const notifyUrl = `${supabaseUrl}/functions/v1/zpay-notify`;
    const returnUrl = `${Deno.env.get('NEXT_PUBLIC_BASE_URL') || 'http://localhost:3000'}/payment/result`;

    // Create transaction record
    const { error: insertError } = await supabase
      .from('zpay_transactions')
      .insert({
        user_id: user.id,
        out_trade_no: outTradeNo,
        amount: amount,
        payment_type: type,
        product_name: productName,
        status: 'pending',
        metadata: metadata || {},
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      });

    if (insertError) {
      console.error('Error creating transaction:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build ZPay parameters
    const zpayParams: Record<string, string> = {
      pid: zpayPid,
      type: type === 'alipay' ? 'alipay' : 'wxpay',
      out_trade_no: outTradeNo,
      notify_url: notifyUrl,
      return_url: returnUrl,
      name: productName,
      money: amount.toFixed(2),
    };

    // Generate payment URL
    const paymentUrl = await buildPaymentUrl(zpayApiUrl, zpayParams, zpayKey);

    return new Response(
      JSON.stringify({
        success: true,
        orderId: outTradeNo,
        paymentUrl: paymentUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in zpay-create function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
