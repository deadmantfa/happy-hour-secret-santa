
import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://awhftldondqmopnxbjie.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WLeZyOD9vxomb8tYYAsIxw_iFMVCPSt'; 

export interface Participant {
  id: string | number; 
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  // Sensitive fields (optional because they are not loaded in public view)
  pin?: string; 
  partner_id?: string | number | null;
  assigned_to_id?: string | number | null;
  food_preference?: string;
  fun_fact?: string;
  
  revealed: boolean;
  
  // Mapped properties for UI convenience
  partnerId?: string | number | null; 
  assignedToId?: string | number | null;
  foodPreference?: string;
  funFact?: string;
}

export interface AppState {
  id?: number | string;
  deadline: string;
  budget: number;
  draw_complete: boolean;
  gallery_images: string[];
  drawComplete?: boolean;
  galleryImages?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class SantaService {
  private supabase: SupabaseClient;

  // State
  private _participants = signal<Participant[]>([]); // Public safe list
  private _adminParticipants = signal<Participant[]>([]); // Full list with secrets (Admin only)
  
  private _config = signal<AppState>({
    id: undefined,
    deadline: '2023-12-20',
    budget: 500,
    draw_complete: false,
    gallery_images: []
  });
  private _isAdmin = signal(false);

  // Projections
  readonly participants = computed(() => this._participants()); // Public access
  readonly adminParticipants = computed(() => this._adminParticipants()); // Admin access

  readonly config = computed(() => ({
    ...this._config(),
    drawComplete: this._config().draw_complete,
    galleryImages: this._config().gallery_images || []
  }));

  readonly isAdmin = this._isAdmin.asReadonly();

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    this.init();
  }

  async init() {
    try {
      await this.ensureConfigExists();
      await this.fetchPublicData();
      this.subscribeToRealtime();
    } catch (e) {
      console.error('Initialization failed', e);
    }
  }

  async ensureConfigExists() {
    const { data, error } = await this.supabase.from('config').select('*').limit(1).maybeSingle();
    if (!data && !error) {
      await this.supabase.from('config').insert({ 
        deadline: '2023-12-20', 
        budget: 500, 
        draw_complete: false, 
        gallery_images: [] 
      });
    }
  }

  // --- SECURE DATA FETCHING ---

  // 1. Fetch only non-sensitive data for the public list
  async fetchPublicData() {
    const { data: configData } = await this.supabase.from('config').select('*').limit(1).maybeSingle();
    if (configData) this._config.set(configData);

    const { data: parts, error } = await this.supabase
      .from('participants')
      .select('id, name, gender, revealed'); // ONLY public fields. No PINs, no assignments.
    
    if (error) console.error('Error fetching public participants:', error);
    if (parts) {
      // Map to Participant interface
      this._participants.set(parts.map(p => ({
        ...p,
        gender: p.gender || 'Other', // Fallback
        revealed: p.revealed || false
      })) as Participant[]);
    }
  }

  // 2. Fetch EVERYTHING for Admin (Only called after password check)
  async fetchAdminData() {
    const { data: parts, error } = await this.supabase.from('participants').select('*');
    if (error) {
      console.error('Admin fetch error:', error);
      return;
    }
    if (parts) {
      this._adminParticipants.set(parts.map(p => ({
        ...p,
        partnerId: p.partner_id,
        assignedToId: p.assigned_to_id,
        foodPreference: p.food_preference,
        funFact: p.fun_fact
      })));
    }
  }

  subscribeToRealtime() {
    this.supabase.channel('santa-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => {
        this.fetchPublicData();
        if (this._isAdmin()) this.fetchAdminData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'config' }, () => {
        this.fetchPublicData();
      })
      .subscribe();
  }

  // --- AUTH ---

  async checkAdminPassword(password: string): Promise<boolean> {
    if (password === 'hohoho' || password === 'admin123') {
      this._isAdmin.set(true);
      await this.fetchAdminData(); // Load secrets now
      return true;
    }
    return false;
  }

  logoutAdmin() {
    this._isAdmin.set(false);
    this._adminParticipants.set([]); // Clear secrets from memory
  }

  // Securely verify PIN on the server query side (simulated via strict query)
  async verifyUserAndGetTarget(userId: string | number, pin: string): Promise<Participant | null> {
    // 1. Try to find the user with matching ID AND PIN
    const { data: me, error } = await this.supabase
      .from('participants')
      .select('id, assigned_to_id')
      .eq('id', userId)
      .eq('pin', pin)
      .maybeSingle();

    if (error || !me) {
      console.error('Verification failed:', error);
      return null;
    }

    // 2. User verified. If they have a target, fetch the target's details.
    if (me.assigned_to_id) {
      const { data: target } = await this.supabase
        .from('participants')
        .select('name, gender, food_preference, fun_fact')
        .eq('id', me.assigned_to_id)
        .single();
      
      if (target) {
        // Mark as revealed
        await this.supabase.from('participants').update({ revealed: true }).eq('id', userId);
        
        return {
          id: me.assigned_to_id,
          name: target.name,
          gender: target.gender,
          foodPreference: target.food_preference,
          funFact: target.fun_fact,
          revealed: false,
          pin: '' // Don't need target pin
        } as Participant;
      }
    }
    return null;
  }

  // --- DATA MANAGEMENT ---

  async addParticipant(name: string, gender: string, pin: string, partnerId: string | number | null, foodPref: string, funFact: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('participants')
      .insert({ 
        name, 
        gender,
        pin,
        partner_id: partnerId,
        food_preference: foodPref,
        fun_fact: funFact
      });
    
    if (error) {
      console.error('Error adding participant:', error);
      if (error.code === 'PGRST204') {
        alert('DATABASE ERROR: Missing Columns! Please run the SQL script provided to add "gender", "pin", "food_preference" columns.');
      } else {
        alert(`Error adding elf: ${error.message}`);
      }
      return false;
    }

    await this.fetchPublicData(); 
    return true;
  }

  async updatePartner(participantId: string | number, newPartnerId: string | number | null) {
    const { error } = await this.supabase
      .from('participants')
      .update({ partner_id: newPartnerId })
      .eq('id', participantId);

    if (error) console.error(error);
    else if (this._isAdmin()) this.fetchAdminData();
  }

  async removeParticipant(id: string | number): Promise<boolean> {
    try {
      await Promise.all([
        this.supabase.from('participants').update({ partner_id: null }).eq('partner_id', id),
        this.supabase.from('participants').update({ assigned_to_id: null }).eq('assigned_to_id', id)
      ]);

      const { error } = await this.supabase.from('participants').delete().eq('id', id);
      if (error) throw error;
      
      if (this._isAdmin()) {
        await this.fetchAdminData();
      }
      await this.fetchPublicData();
      
      return true;
    } catch (e: any) {
      alert(`Could not remove participant: ${e.message || e}`);
      return false;
    }
  }

  // --- DRAW LOGIC ---

  async generateMatches(): Promise<boolean> {
    // Must use Admin data for logic because public data lacks partner_id constraints
    if (!this._isAdmin()) await this.fetchAdminData();
    const p = [...this._adminParticipants()];
    
    if (p.length < 2) return false;

    let attempts = 0;
    const maxAttempts = 5000;
    let success = false;
    let assignments = new Map<string | number, string | number>(); 
    
    while (attempts < maxAttempts && !success) {
      const receivers = p.map(x => x.id);
      
      // Shuffle
      for (let i = receivers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [receivers[i], receivers[j]] = [receivers[j], receivers[i]];
      }

      let valid = true;
      assignments.clear();

      for (let i = 0; i < p.length; i++) {
        const giver = p[i];
        const receiverId = receivers[i]; 
        
        if (String(giver.id) === String(receiverId)) { valid = false; break; }
        if (giver.partner_id && String(giver.partner_id) === String(receiverId)) { valid = false; break; }
        
        const receiverHasGiver = assignments.get(receiverId) === giver.id;
        if (receiverHasGiver && p.length > 2) { valid = false; break; }
        
        assignments.set(giver.id, receiverId);
      }

      if (valid) success = true;
      attempts++;
    }

    if (success) {
      // Batch update logic
      for (const p of this._adminParticipants()) {
        const targetId = assignments.get(p.id);
        if (targetId) {
          await this.supabase.from('participants').update({ assigned_to_id: targetId }).eq('id', p.id);
        }
      }
      
      const configId = this._config().id || 1;
      await this.supabase.from('config').update({ draw_complete: true }).eq('id', configId);
      return true;
    }
    return false;
  }

  async resetDraw() {
    const configId = this._config().id || 1;
    await this.supabase.from('participants').update({ assigned_to_id: null, revealed: false }).neq('id', '0'); 
    await this.supabase.from('config').update({ draw_complete: false }).eq('id', configId);
  }

  // --- IMAGES ---
  
  async addImage(source: string) {
    const id = this._config().id || 1;
    const currentImages = this._config().gallery_images || [];
    await this.supabase.from('config').update({ gallery_images: [...currentImages, source] }).eq('id', id);
  }

  async removeImage(index: number) {
    const id = this._config().id || 1;
    const currentImages = [...(this._config().gallery_images || [])];
    currentImages.splice(index, 1);
    await this.supabase.from('config').update({ gallery_images: currentImages }).eq('id', id);
  }

  exportData(): string {
    return JSON.stringify({ participants: this._adminParticipants(), config: this._config() });
  }
}
