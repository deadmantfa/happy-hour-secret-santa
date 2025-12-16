import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { name, pin, gender, partnerId, foodPref, funFact, isChild } = await req.json();

    if (!name || !pin) {
      throw new Error("Name and PIN are required.");
    }

    const { error } = await supabaseAdmin.from('participants').insert({
      name,
      pin,
      gender,
      partner_id: partnerId,
      food_preference: foodPref,
      fun_fact: funFact,
      is_child: isChild || false,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});