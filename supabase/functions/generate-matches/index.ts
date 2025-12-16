import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

serve(async (_req) => {
  if (_req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { data: participants, error: fetchError } = await supabaseAdmin.from('participants').select('id, partner_id, is_child');
    if (fetchError) throw fetchError;
    if (participants.length < 2) throw new Error("Not enough participants to draw.");

    // Split participants into pools
    const adults = participants.filter(p => !p.is_child);
    const kids = participants.filter(p => p.is_child);

    // Helper function to find a valid assignment for a group
    const findMatches = (group) => {
      if (group.length < 2) {
         if (group.length === 1) throw new Error("Only one participant in a group (Adults or Kids). Cannot match.");
         return new Map(); // Empty group is fine (e.g. no kids)
      }

      const map = new Map(group.map(p => [String(p.id), p]));
      let attempts = 0;
      const maxAttempts = 5000;
      
      while (attempts < maxAttempts) {
        let receivers = group.map(p => p.id);
        // Shuffle
        for (let i = receivers.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [receivers[i], receivers[j]] = [receivers[j], receivers[i]];
        }

        let valid = true;
        const currentAssignments = new Map();

        for (let i = 0; i < group.length; i++) {
          const giver = group[i];
          const receiverId = receivers[i];
          const receiver = map.get(String(receiverId));

          // 1. Cannot gift self
          if (String(giver.id) === String(receiverId)) {
            valid = false;
            break;
          }

          // 2. Cannot gift partner (only applies if partner is in the SAME group)
          if (giver.partner_id && String(giver.partner_id) === String(receiverId)) {
            valid = false;
            break;
          }

          // 3. Symmetric check: If receiver's partner is giver
          if (receiver && receiver.partner_id && String(receiver.partner_id) === String(giver.id)) {
            valid = false;
            break;
          }
          
          // 4. Mutual exclusion check (A->B then B cannot -> A) - Optional but good for variety
          const receiversGiverId = currentAssignments.get(receiverId);
          if (receiversGiverId && String(receiversGiverId) === String(giver.id) && group.length > 2) {
              valid = false;
              break;
          }

          currentAssignments.set(giver.id, receiverId);
        }

        if (valid) return currentAssignments;
        attempts++;
      }
      throw new Error("Could not find a valid assignment for one of the groups. Please check constraints.");
    };

    const adultAssignments = findMatches(adults);
    const kidAssignments = findMatches(kids);

    // Merge assignments
    const allAssignments = new Map([...adultAssignments, ...kidAssignments]);
    
    const updates = Array.from(allAssignments.entries()).map(([giverId, receiverId]) => 
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