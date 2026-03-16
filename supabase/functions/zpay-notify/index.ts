import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { md5 } from '../_shared/md5.ts';

/**
 * Create API token on yunwu.ai
 */
async function createYunwuToken(
  userId: string,
  remainQuota: number,
  expiredTime: number
): Promise<{ success: boolean; key?: string; error?: string }> {
  const newApiUser = Deno.env.get('NEW_API_USER');
  const newApiAuth = Deno.env.get('NEW_API_AUTHORIZATION');
  const newApiBaseUrl = Deno.env.get('NEW_API_BASE_URL') || 'https://yunwu.ai';

  if (!newApiUser || !newApiAuth) {
    console.error('Yunwu API credentials not configured');
    return { success: false, error: 'API credentials not configured' };
  }

  try {
    const response = await fetch(`${newApiBaseUrl}/api/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'new-api-user': newApiUser,
        'Authorization': newApiAuth,
      },
      body: JSON.stringify({
        name: `clawx_${userId.substring(0, 8)}`,
        remain_quota: remainQuota,
        expired_time: expiredTime,
        unlimited_quota: false,
        model_limits_enabled: false,
        model_limits: '',
        allow_ips: '',
        group: 'default',
        selected_groups: ['default'],
        mj_image_mode: 'default',
        mj_custom_proxy: '',
      }),
    });

    const result = await response.json();
    console.log('[createYunwuToken] Yunwu API response:', JSON.stringify(result, null, 2));

    if (response.ok && result.success !== false) {
      // Yunwu API returns: { data: 'sk-xxx', success: true } or { data: { key: 'sk-xxx' } }
      const apiKey = result.data?.key || result.key || result.data;
      console.log('[createYunwuToken] Extracted API key:', apiKey ? apiKey.substring(0, 15) + '...' : 'undefined');
      return { success: true, key: apiKey };
    } else {
      return { success: false, error: result.message || 'Failed to create token' };
    }
  } catch (error) {
    console.error('Error creating yunwu token:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Build ZPay signature for verification
 * Same algorithm as create function
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
 * Verify callback signature
 */
async function verifySign(
  params: Record<string, string>,
  receivedSign: string,
  key: string
): Promise<boolean> {
  const calculatedSign = await buildSign(params, key);
  return calculatedSign.toLowerCase() === receivedSign.toLowerCase();
}

Deno.serve(async (req) => {
  // Only accept GET requests (ZPay uses GET for callbacks)
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const zpayKey = Deno.env.get('ZPAY_KEY')!;

    if (!zpayKey) {
      console.error('ZPay configuration missing');
      return new Response('fail', { status: 500 });
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse callback parameters from URL
    const url = new URL(req.url);
    const params: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    // Extract required fields
    const {
      out_trade_no: outTradeNo,
      trade_no: tradeNo,
      money: moneyStr,
      trade_status: tradeStatus,
      sign: receivedSign,
    } = params;

    console.log('ZPay callback received:', {
      outTradeNo,
      tradeNo,
      moneyStr,
      tradeStatus,
    });

    // Validate required fields
    if (!outTradeNo || !tradeNo || !moneyStr || !tradeStatus || !receivedSign) {
      console.error('Missing required callback parameters');
      return new Response('fail: missing parameters');
    }

    // Verify signature
    const isValidSign = await verifySign(params, receivedSign, zpayKey);
    if (!isValidSign) {
      console.error('Invalid signature for callback:', outTradeNo);
      return new Response('fail: invalid signature');
    }

    // Check trade status (TRADE_SUCCESS indicates successful payment)
    if (tradeStatus !== 'TRADE_SUCCESS') {
      console.log('Trade not successful:', tradeStatus);
      // Still return success to acknowledge receipt
      return new Response('success');
    }

    // Get original transaction to verify amount
    const { data: transaction, error: fetchError } = await supabase
      .from('zpay_transactions')
      .select('*')
      .eq('out_trade_no', outTradeNo)
      .single();

    if (fetchError || !transaction) {
      console.error('Transaction not found:', outTradeNo);
      return new Response('fail: transaction not found');
    }

    // Verify amount matches (prevent tampering)
    const callbackAmount = parseFloat(moneyStr);
    const expectedAmount = parseFloat(transaction.amount);
    if (Math.abs(callbackAmount - expectedAmount) > 0.01) {
      console.error('Amount mismatch:', {
        expected: expectedAmount,
        received: callbackAmount,
      });
      return new Response('fail: amount mismatch');
    }

    // Use optimistic lock to prevent duplicate processing
    // Try to update processed_trade_no only if it's currently null
    const { data: updateResult, error: lockError } = await supabase
      .from('zpay_transactions')
      .update({ processed_trade_no: tradeNo })
      .eq('out_trade_no', outTradeNo)
      .is('processed_trade_no', null)
      .select();

    if (lockError) {
      console.error('Error acquiring lock:', lockError);
      return new Response('fail: database error');
    }

    // If no rows were updated, this transaction is already being processed or processed
    if (!updateResult || updateResult.length === 0) {
      console.log('Transaction already processed:', outTradeNo);
      // Return success to acknowledge receipt (idempotent)
      return new Response('success');
    }

    // Update transaction status to paid
    const { error: statusError } = await supabase
      .from('zpay_transactions')
      .update({
        status: 'paid',
        trade_no: tradeNo,
        callback_data: params,
        paid_at: new Date().toISOString(),
      })
      .eq('out_trade_no', outTradeNo);

    if (statusError) {
      console.error('Error updating transaction status:', statusError);
      // Transaction is locked but status update failed
      // This will need manual intervention
      return new Response('fail: status update failed');
    }

    console.log('Payment successful:', {
      outTradeNo,
      tradeNo,
      amount: callbackAmount,
    });

    // Upgrade user subscription based on payment
    const metadata = transaction.metadata as Record<string, unknown> | null;
    const planId = metadata?.plan_id as string | undefined;

    if (planId && transaction.user_id) {
      console.log('Upgrading subscription for user:', transaction.user_id, 'plan:', planId);

      // Calculate duration based on plan
      const durationMonths = planId === 'yearly' ? 12 : 1;

      // Update user profile subscription
      const subscriptionEndsAt = new Date();
      subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + durationMonths);

      const tokensQuota = planId === 'yearly' ? 100000000 : 1000000; // 100M or 1M

      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          subscription_tier: planId,
          is_trial: false,
          trial_ends_at: null,
          subscription_ends_at: subscriptionEndsAt.toISOString(),
        })
        .eq('id', transaction.user_id);

      if (profileError) {
        console.error('Error updating user profile:', profileError);
      }

      // Update usage quota
      const { error: quotaError } = await supabase
        .from('usage_quotas')
        .update({
          total_tokens_quota: tokensQuota,
          tokens_used: 0,
          billing_cycle_start: new Date().toISOString(),
          billing_cycle_end: subscriptionEndsAt.toISOString(),
        })
        .eq('user_id', transaction.user_id);

      if (quotaError) {
        console.error('Error updating quota:', quotaError);
      }

      // Create yunwu API token for the user
      const remainQuota = planId === 'yearly' ? 100000000 : 1000000; // 100M or 1M
      const expiredTime = Math.floor(subscriptionEndsAt.getTime() / 1000); // Convert to Unix timestamp

      console.log('Creating yunwu token for user:', transaction.user_id);
      const tokenResult = await createYunwuToken(
        transaction.user_id,
        remainQuota,
        expiredTime
      );

      if (tokenResult.success) {
        console.log('Yunwu token created successfully:', tokenResult.key);

        // Save the API key to user profile
        const { error: keyError } = await supabase
          .from('user_profiles')
          .update({
            yunwu_api_key: tokenResult.key,
          })
          .eq('id', transaction.user_id);

        if (keyError) {
          console.error('Error saving yunwu API key:', keyError);
        }
      } else {
        console.error('Failed to create yunwu token:', tokenResult.error);
      }

      console.log('Subscription upgraded successfully:', {
        userId: transaction.user_id,
        planId,
        tokensQuota,
        endsAt: subscriptionEndsAt,
      });
    }

    return new Response('success');
  } catch (error) {
    console.error('Error in zpay-notify function:', error);
    return new Response('fail: internal error');
  }
});
