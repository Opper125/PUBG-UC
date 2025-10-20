// Supabase Edge Function: validate-ml-account
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function generateUnipinAuth(partnerId: string, timestamp: number, path: string, secretKey: string): Promise<string> {
  const message = `${partnerId}${timestamp}${path}`
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secretKey)
  const messageData = encoder.encode(message)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, zoneId } = await req.json()

    // Validate input
    if (!userId || !zoneId) {
      throw new Error('User ID and Zone ID are required')
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get UniPin settings
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['unipin_partner_id', 'unipin_secret_key', 'unipin_api_base', 'mlbb_game_code'])

    if (settingsError) throw settingsError

    const config: Record<string, string> = {}
    settings.forEach((s: any) => {
      config[s.key] = s.value
    })

    // Call UniPin API
    const timestamp = Math.floor(Date.now() / 1000)
    const path = '/in-game-topup/user/validate'
    const auth = await generateUnipinAuth(
      config.unipin_partner_id,
      timestamp,
      path,
      config.unipin_secret_key
    )

    const response = await fetch(`${config.unipin_api_base}${path}`, {
      method: 'POST',
      headers: {
        'partnerid': config.unipin_partner_id,
        'timestamp': timestamp.toString(),
        'path': path,
        'auth': auth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        game_code: config.mlbb_game_code,
        fields: {
          userid: userId,
          zoneid: parseInt(zoneId)
        }
      })
    })

    const result = await response.json()

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        status: 0, 
        reason: error.message || 'Validation failed' 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
