import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const { userId, pin } = await req.json();

    const { data: me, error: verifyError } = await supabaseAdmin
      .from('participants')
      .select('id, assigned_to_id')
      .eq('id', userId)
      .eq('pin', pin)
      .maybeSingle();

    if (verifyError || !me) {
      throw new Error("Verification failed. Incorrect PIN or user ID.");
    }
    
    let targetData = null;
    if (me.assigned_to_id) {
      const { data: target } = await supabaseAdmin
        .from('participants')
        .select('name, food_preference, fun_fact')
        .eq('id', me.assigned_to_id)
        .single();

      if (target) {
        await supabaseAdmin.from('participants').update({ revealed: true }).eq('id', userId);
        targetData = {
          id: me.assigned_to_id,
          name: target.name,
          foodPreference: target.food_preference,
          funFact: target.fun_fact,
          revealed: false
        };
      }
    }
    
    return new Response(JSON.stringify({ target: targetData }), {
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