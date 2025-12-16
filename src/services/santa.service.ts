import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NotificationService } from './notification.service';

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://awhftldondqmopnxbjie.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3aGZ0bGRvbmRxbW9wbnhiamllIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTkzNjA0MDQsImV4cCI6MjAxNDkzNjQwNH0.dJqL4DBvfJ-22e3s3CRgtu-1eea4y-Q5r_i2z192H3E'; 

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

  // --- SECURE DATA FETCHING ---

  // 1. Fetch only non-sensitive data for the public list
  async fetchPublicData() {
    const { data: configData, error: configError } = await this.supabase.from('config').select('*').limit(1).maybeSingle();
    if (configError) throw configError;
    if (configData) {
      this._config.set(configData);
    } else {
        // If config is null (e.g., table empty), ensure a default exists by calling an edge function.
        await this.supabase.functions.invoke('ensure-config');
        // Re-fetch after ensuring it exists.
        const { data: newConfigData } = await this.supabase.from('config').select('*').limit(1).single();
        if (newConfigData) this._config.set(newConfigData);
    }


    const { data: parts, error } = await this.supabase
      .from('participants')
      .select('id, name, revealed'); // ONLY public fields. No PINs, no assignments.
    
    if (error) {
        console.error('Error fetching public participants:', error);
        throw error;
    }
    if (parts) {
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
    try {
      const { data, error } = await this.supabase.functions.invoke('verify-admin', {
        body: { password },
      });

      if (error) throw error;

      if (data?.isAdmin) {
        this._isAdmin.set(true);
        await this.fetchAdminData();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Admin login failed:', e);
      this.notificationService.show('Error during admin login.', 'error');
      return false;
    }
  }

  logoutAdmin() {
    this._isAdmin.set(false);
    this._adminParticipants.set([]); // Clear secrets from memory
  }

  async verifyUserAndGetTarget(userId: string | number, pin: string): Promise<Participant | null> {
    try {
      const { data, error } = await this.supabase.functions.invoke('verify-pin-and-get-target', {
        body: { userId, pin }
      });
      
      if (error) throw error;

      if (data.target) {
        return data.target as Participant;
      }
      return null;
    } catch (error: any) {
      console.error('Verification via function failed:', error);
      return null;
    }
  }

  // --- DATA MANAGEMENT ---

  async addParticipant(name: string, pin: string, partnerId: string | number | null, foodPref: string, funFact: string): Promise<boolean> {
     try {
        const { error } = await this.supabase.functions.invoke('add-participant', {
          body: { name, pin, partnerId, foodPref, funFact }
        });
        
        if (error) throw error;

        // Realtime will update lists, but we can fetch to be sure
        await this.fetchPublicData();
        return true;
      } catch (error: any) {
        console.error('Error adding participant via function:', error);
        this.notificationService.show(`Error adding elf: ${error.message}`, 'error');
        return false;
      }
  }

  async updatePartner(participantId: string | number, newPartnerId: string | number | null) {
    try {
      const { error } = await this.supabase.functions.invoke('update-partner', {
        body: { participantId, newPartnerId }
      });
      if (error) throw error;
      if (this._isAdmin()) this.fetchAdminData();
    } catch (error: any) {
      console.error('Error updating partner:', error);
      this.notificationService.show(`Failed to update partner constraint: ${error.message}`, 'error');
    }
  }

  async removeParticipant(id: string | number): Promise<boolean> {
    try {
      const { error } = await this.supabase.functions.invoke('remove-participant', {
        body: { id }
      });
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
    if (!this.isAdmin()) {
      this.notificationService.show('You must be an admin to perform this action.', 'error');
      return false;
    }
    try {
      const { error } = await this.supabase.functions.invoke('generate-matches');
      if (error) throw error;
      
      await this.fetchAdminData();
      await this.fetchPublicData();
      return true;
    } catch (e: any) {
      console.error('Error generating matches via function:', e);
      this.notificationService.show(`Failed to generate matches: ${e.message || 'Server error'}.`, 'error');
      return false;
    }
  }

  async resetDraw() {
    if (!this.isAdmin()) {
      this.notificationService.show('You must be an admin to perform this action.', 'error');
      return;
    }
    try {
      const { error } = await this.supabase.functions.invoke('reset-draw');
      if (error) throw error;

      await this.fetchAdminData();
      await this.fetchPublicData();
    } catch (e: any) {
      console.error('Error resetting draw via function:', e);
      this.notificationService.show(`Failed to reset draw: ${e.message || 'Server error'}.`, 'error');
    }
  }

  exportData(): string {
    return JSON.stringify({ participants: this._adminParticipants(), config: this._config() });
  }
  
  // This method is no longer needed on the client, as the logic will be on the server.
  // It's kept here for reference to show what the server-side function `ensure-config` would do.
  private async ensureConfigExists() {
    // This logic is now handled by the 'ensure-config' edge function
    // and the initial `fetchPublicData` call.
  }
}