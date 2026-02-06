// Shared CORS configuration for all edge functions
// Restricts CORS to trusted origins only

const ALLOWED_ORIGINS = [
  'https://mesachef.lovable.app',
  'https://id-preview--ff07262f-c0bc-4f46-b9f9-f0b2860b311e.lovable.app',
  'https://ff07262f-c0bc-4f46-b9f9-f0b2860b311e.lovableproject.com',
];

// In development, also allow localhost
if (Deno.env.get('DENO_ENV') !== 'production') {
  ALLOWED_ORIGINS.push('http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000');
}

export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  // Check if the origin is in our allowed list
  const origin = requestOrigin && ALLOWED_ORIGINS.some(allowed => 
    requestOrigin === allowed || requestOrigin.endsWith('.lovable.app') || requestOrigin.endsWith('.lovableproject.com')
  ) ? requestOrigin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function handleCorsPreFlight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('Origin');
    return new Response('ok', { headers: getCorsHeaders(origin) });
  }
  return null;
}
