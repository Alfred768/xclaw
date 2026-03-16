import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  console.log('[jwt-debug] Authorization header:', authHeader?.substring(0, 50) + '...');
  console.log('[jwt-debug] Token length:', token?.length);

  let jwtInfo: Record<string, unknown> = {};

  if (token) {
    const parts = token.split('.');
    if (parts.length === 3) {
      try {
        // Decode header
        const headerB64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
        const headerPadded = headerB64 + '='.repeat((4 - headerB64.length % 4) % 4);
        const header = JSON.parse(atob(headerPadded));

        // Decode payload
        const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payloadPadded = payloadB64 + '='.repeat((4 - payloadB64.length % 4) % 4);
        const payload = JSON.parse(atob(payloadPadded));

        jwtInfo = {
          header,
          payload: {
            sub: payload.sub,
            aud: payload.aud,
            iss: payload.iss,
            exp: payload.exp,
            iat: payload.iat,
            role: payload.role,
            email: payload.email,
            expDate: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
            now: new Date().toISOString(),
            isExpired: payload.exp ? payload.exp * 1000 < Date.now() : null,
          },
          tokenPreview: token.substring(0, 50) + '...',
          tokenLength: token.length,
        };
      } catch (e) {
        jwtInfo = { error: 'Failed to decode JWT', details: String(e) };
      }
    } else {
      jwtInfo = { error: 'Invalid JWT format', partsCount: parts.length };
    }
  } else {
    jwtInfo = { error: 'No token provided' };
  }

  return new Response(
    JSON.stringify(jwtInfo, null, 2),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
