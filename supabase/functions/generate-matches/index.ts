import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

serve(async (_req) => {
  if (_req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { data: participants, error: fetchError } = await supabaseAdmin.from('participants').select('id, partner_id');
    if (fetchError) throw fetchError;
    if (participants.length < 2) throw new Error("Not enough participants to draw.");

    const participantsMap = new Map(participants.map(p => [String(p.id), p]));

    let attempts = 0;
    const maxAttempts = 5000;
    let success = false;
    let assignments = new Map();

    while (attempts < maxAttempts && !success) {
      let receivers = participants.map(p => p.id);
      for (let i = receivers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [receivers[i], receivers[j]] = [receivers[j], receivers[i]];
      }

      let valid = true;
      assignments.clear();
      for (let i = 0; i < participants.length; i++) {
        const giver = participants[i];
        const receiverId = receivers[i];
        const receiver = participantsMap.get(String(receiverId));

        if (String(giver.id) === String(receiverId)) {
          valid = false;
          break;
        }

        // Check if giver's partner is receiver
        if (giver.partner_id && String(giver.partner_id) === String(receiverId)) {
          valid = false;
          break;
        }

        // Check if receiver's partner is giver (symmetric check)
        if (receiver && receiver.partner_id && String(receiver.partner_id) === String(giver.id)) {
          valid = false;
          break;
        }
        
        const receiversGiverId = assignments.get(receiverId);
        if (receiversGiverId && String(receiversGiverId) === String(giver.id)) {
            valid = false;
            break;
        }

        assignments.set(giver.id, receiverId);
      }
      if (valid) success = true;
      attempts++;
    }

    if (!success) {
      throw new Error("Could not find a valid assignment. Please check constraints.");
    }
    
    const updates = Array.from(assignments.entries()).map(([giverId, receiverId]) => 
      supabaseAdmin.from('participants').update({ assigned_to_id: receiverId }).eq('id', giverId)
    );
    await Promise.all(updates);

    const { data: config } = await supabaseAdmin.from('config').select('id').limit(1).single();
    await supabaseAdmin.from('config').update({ draw_complete: true }).eq('id', config.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});