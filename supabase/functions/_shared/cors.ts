/**
 * CORS Headers Helper
 * Shared utility for handling CORS in Edge Functions
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

export function handleOptions(): Response {
  return new Response('ok', { headers: corsHeaders });
}
