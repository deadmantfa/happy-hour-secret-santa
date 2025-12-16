// File: supabase/functions/_shared/supabaseAdmin.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Create a Supabase client with the Service Role Key
export const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);