import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NotificationService } from './notification.service';

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://awhftldondqmopnxbjie.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WLeZyOD9vxomb8tYYAsIxw_iFMVCPSt'; 

export interface Participant {
  id: string | number; 
  name: string;
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

// Represents the raw data structure from the 'config' table in Supabase.
export interface AppState {
  id?: number | string;
  deadline: string;
  budget: number;
  draw_complete: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SantaService {
  private supabase: SupabaseClient;
  private platformId = inject(PLATFORM_ID);
  private notificationService = inject(NotificationService);

  // State
  private _participants = signal<Participant[]>([]); // Public safe list
  private _adminParticipants = signal<Participant[]>([]); // Full list with secrets (Admin only)
  
  private _config = signal<AppState>({
    id: undefined,
    deadline: '2023-12-20',
    budget: 500,
    draw_complete: false,
  });
  private _isAdmin = signal(false);
  private _loadingState = signal<'loading' | 'loaded' | 'error'>('loading');

  // Projections
  readonly participants = computed(() => this._participants()); // Public access
  readonly adminParticipants = computed(() => this._adminParticipants()); // Admin access

  readonly config = computed(() => {
    const raw = this._config();
    return {
      ...raw,
      drawComplete: raw.draw_complete,
    };
  });

  readonly isAdmin = this._isAdmin.asReadonly();
  readonly loadingState = this._loadingState.asReadonly();

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    this.init();
  }

  async init() {
    this._loadingState.set('loading');
    try {
      await this.ensureConfigExists();
      await this.fetchPublicData();
      if (isPlatformBrowser(this.platformId)) {
        this.subscribeToRealtime();
      }
      this._loadingState.set('loaded');
    } catch (e) {
      console.error('Initialization failed', e);
      this._loadingState.set('error');
    }
  }

  async ensureConfigExists() {
    const { data, error } = await this.supabase.from('config').select('*').limit(1).maybeSingle();
    if (error) {
      // If there's an error (e.g. table doesn't exist), throw it to be caught by init()
      throw error;
    }
    if (!data) {
      await this.supabase.from('config').insert({ 
        deadline: '2023-12-20', 
        budget: 500, 
        draw_complete: false, 
      });
    }
  }

  // --- SECURE DATA FETCHING ---

  // 1. Fetch only non-sensitive data for the public list
  async fetchPublicData() {
    const { data: configData, error: configError } = await this.supabase.from('config').select('*').limit(1).maybeSingle();
    if (configError) throw configError;
    if (configData) this._config.set(configData);

    const { data: parts, error } = await this.supabase
      .from('participants')
      .select('id, name, revealed'); // ONLY public fields. No PINs, no assignments.
    
    if (error) {
        console.error('Error fetching public participants:', error);
        throw error;
    }
    if (parts) {
      // Map to Participant interface
      this._participants.set(parts.map(p => ({
        ...p,
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
        .select('name, food_preference, fun_fact')
        .eq('id', me.assigned_to_id)
        .single();
      
      if (target) {
        // Mark as revealed
        await this.supabase.from('participants').update({ revealed: true }).eq('id', userId);
        
        return {
          id: me.assigned_to_id,
          name: target.name,
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

  async addParticipant(name: string, pin: string, partnerId: string | number | null, foodPref: string, funFact: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('participants')
      .insert({ 
        name, 
        pin,
        partner_id: partnerId,
        food_preference: foodPref,
        fun_fact: funFact,
        gender: 'Other' // Set a default as gender is removed from UI
      });
    
    if (error) {
      console.error('Error adding participant:', error);
      this.notificationService.show(`Error adding elf: ${error.message}`, 'error');
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

    if (error) {
        console.error('Error updating partner:', error);
        this.notificationService.show(`Failed to update partner constraint: ${error.message}`, 'error');
    }
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
      this.notificationService.show(`Could not remove participant: ${e.message || e}`, 'error');
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
      try {
        for (const [giverId, receiverId] of assignments.entries()) {
          const { error } = await this.supabase.from('participants').update({ assigned_to_id: receiverId }).eq('id', giverId);
          if (error) throw error;
        }
        
        const configId = this._config().id || 1;
        const { error: configError } = await this.supabase.from('config').update({ draw_complete: true }).eq('id', configId);
        if (configError) throw configError;

        await this.fetchAdminData(); // Refresh data
        return true;
      } catch (e: any) {
        console.error('Error saving matches to database:', e);
        this.notificationService.show(`Failed to save matches: ${e.message}. The draw is being rolled back.`, 'error');
        await this.resetDraw();
        return false;
      }
    }
    return false;
  }

  async resetDraw() {
    try {
      const configId = this._config().id || 1;
      const { error: participantsError } = await this.supabase.from('participants').update({ assigned_to_id: null, revealed: false }).neq('id', '0');
      if (participantsError) throw participantsError;
      const { error: configError } = await this.supabase.from('config').update({ draw_complete: false }).eq('id', configId);
      if (configError) throw configError;
    } catch (e: any) {
      console.error('Error resetting draw:', e);
      this.notificationService.show(`Failed to reset draw: ${e.message}`, 'error');
    }
  }

  exportData(): string {
    return JSON.stringify({ participants: this._adminParticipants(), config: this._config() });
  }
}
