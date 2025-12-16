import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NotificationService } from './notification.service';

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://awhftldondqmopnxbjie.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0HgDsnSagX4lBnRVUmwgZw_bd22p5RW'; 

export interface Participant {
  id: string | number; 
  name: string;
  // Sensitive fields (optional because they are not loaded in public view)
  pin?: string; 
  gender?: 'Male' | 'Female' | 'Other';
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

  // --- READ-ONLY DATA FETCHING ---
  async fetchPublicData() {
    const { data: configData, error: configError } = await this.supabase.from('config').select('*').limit(1).maybeSingle();
    if (configError) throw configError;
    if (configData) this._config.set(configData);

    const { data: parts, error } = await this.supabase
      .from('participants')
      .select('id, name, revealed'); 
    
    if (error) {
        console.error('Error fetching public participants:', error);
        throw error;
    }
    if (parts) {
      this._participants.set(parts.map(p => ({ ...p, revealed: p.revealed || false })) as Participant[]);
    }
  }

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

  // --- AUTH (via Edge Function) ---
  async checkAdminPassword(password: string): Promise<boolean> {
    const { data, error } = await this.supabase.functions.invoke('verify-admin', {
      body: { password }
    });
    if (error || !data?.authenticated) {
      return false;
    }
    this._isAdmin.set(true);
    await this.fetchAdminData();
    return true;
  }

  logoutAdmin() {
    this._isAdmin.set(false);
    this._adminParticipants.set([]);
  }
  
  async verifyUserAndGetTarget(userId: string | number, pin: string): Promise<Participant | null> {
    const { data, error } = await this.supabase.functions.invoke('verify-pin-and-get-target', {
      body: { userId, pin }
    });
    if (error) {
      console.error('Verification function error:', error.message);
      return null;
    }
    return data.target;
  }

  // --- DATA MANAGEMENT (via Edge Functions) ---

  async addParticipant(name: string, pin: string, gender: 'Male' | 'Female' | 'Other', partnerId: string | number | null, foodPref: string, funFact: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.functions.invoke('add-participant', {
        body: { name, pin, gender, partnerId, foodPref, funFact }
      });
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error adding participant:', error);
      this.notificationService.show(`Error adding elf: ${error.message}`, 'error');
      return false;
    }
  }

  async updatePartner(participantId: string | number, newPartnerId: string | number | null) {
    const { error } = await this.supabase.functions.invoke('update-participant', {
      body: { participantId, updates: { partner_id: newPartnerId } }
    });
    if (error) {
      console.error('Error updating partner:', error);
      this.notificationService.show(`Failed to update partner: ${error.message}`, 'error');
    }
  }

  async removeParticipant(id: string | number): Promise<boolean> {
    try {
      const { error } = await this.supabase.functions.invoke('remove-participant', { body: { id } });
      if (error) throw error;
      return true;
    } catch (e: any) {
      this.notificationService.show(`Could not remove participant: ${e.message || e}`, 'error');
      return false;
    }
  }

  // --- DRAW LOGIC (via Edge Function) ---

  async generateMatches(): Promise<boolean> {
    if (!this.isAdmin()) {
      this.notificationService.show('You must be an admin to perform this action.', 'error');
      return false;
    }
    const { error } = await this.supabase.functions.invoke('generate-matches');
    if (error) {
      console.error('Generate matches error:', error);
      this.notificationService.show(error.message, 'error');
      return false;
    }
    return true;
  }

  async resetDraw() {
    if (!this.isAdmin()) {
      this.notificationService.show('You must be an admin to perform this action.', 'error');
      return;
    }
    const { error } = await this.supabase.functions.invoke('reset-draw');
    if (error) {
       this.notificationService.show(`Failed to reset draw: ${error.message || 'Server error'}.`, 'error');
    }
  }

  exportData(): string {
    return JSON.stringify({ participants: this._adminParticipants(), config: this._config() });
  }
}
