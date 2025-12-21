import { Component, inject, signal, effect } from '@angular/core';
import { SantaService } from '../services/santa.service';
import { NotificationService } from '../services/notification.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    @if (!service.isAdmin()) {
      <!-- Login screen -->
      <div class="max-w-md mx-auto p-8 frosty-glass rounded-3xl text-center mt-10 shadow-2xl relative z-10">
        <div class="absolute -top-6 -right-6 text-6xl animate-bounce">🎅</div>
        <div class="absolute -bottom-8 -left-8 text-5xl animate-float" style="animation-duration: 4s;">🧝</div>
        <h2 class="text-3xl font-christmas text-gold mb-2">Santa's Workshop</h2>
        <p class="text-white/80 mb-6 text-sm">Restricted Area. Elves only.</p>
        
        <input 
          type="password" 
          [(ngModel)]="passwordAttempt" 
          (keyup.enter)="login()" 
          placeholder="Enter Admin Password" 
          class="w-full p-3 rounded-lg bg-white/90 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold font-body mb-4 shadow-inner"
        >
        
        <button 
          (click)="login()" 
          class="w-full bg-berry-red hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg border-b-4 border-red-900 active:border-b-0 active:translate-y-1">
          Unlock Workshop 🔑
        </button>
      </div>
    } @else {
      <!-- Admin Dashboard -->
      <div class="max-w-7xl mx-auto p-4 md:p-6 frosty-glass rounded-3xl shadow-2xl relative z-10 my-4 md:my-8 animate-fade-in">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-white/10 pb-6">
          <div>
            <h2 class="text-4xl font-christmas text-gold drop-shadow-md">Admin Workshop 🔨</h2>
            <p class="text-white/60 text-sm mt-1">Manage your elves and the secret draw.</p>
          </div>
          <div class="flex gap-2">
            <button (click)="backupData()" class="bg-blue-600/80 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold backdrop-blur-md transition-all border border-blue-400/30 flex items-center gap-2">
              <span>💾</span> Backup
            </button>
            <button (click)="service.logoutAdmin()" class="bg-red-600/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold backdrop-blur-md transition-all border border-red-400/30 flex items-center gap-2">
              <span>🚪</span> Exit
            </button>
          </div>
        </div>

        <div class="grid lg:grid-cols-12 gap-8">
          
          <!-- LEFT COLUMN: Participants -->
          <div class="lg:col-span-7">
            <div class="bg-black/20 p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-white flex items-center gap-2">
                  <span class="text-2xl">🧝</span> Manage Elves <span class="bg-white/10 text-xs px-2 py-1 rounded-full">{{service.adminParticipants().length}}</span>
                </h3>
              </div>
              
              <div class="space-y-3 max-h-[600px] overflow-y-auto custom-scroll pr-1">
                @for (p of service.adminParticipants(); track p.id) {
                  <!-- Participant Card -->
                  <div 
                    class="group relative bg-gradient-to-r from-white/5 to-transparent hover:from-white/10 border border-white/5 hover:border-gold/30 rounded-xl p-4 transition-all duration-300"
                    (mouseenter)="hoveredParticipantId.set(p.id)"
                    (mouseleave)="hoveredParticipantId.set(null)"
                    [ngClass]="{
                      'ring-2 ring-red-500 bg-red-900/10': isPartnerOfHovered(p.id)
                    }"
                    [style.box-shadow]="isPartnerOfHovered(p.id) ? '0 0 15px rgba(239,68,68,0.3)' : ''"
                  >
                    
                    <!-- Highlight Badge -->
                    @if (isPartnerOfHovered(p.id)) {
                      <div class="absolute -top-2 right-4 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md z-10 animate-pulse border border-red-400">
                        🚫 RESTRICTED PARTNER
                      </div>
                    }

                    <div class="flex items-start justify-between gap-4">
                      
                      <!-- Info -->
                      <div class="flex items-center gap-3">
                        <div class="text-3xl bg-white/5 p-2 rounded-full shadow-inner">🧝</div>
                        <div>
                          <div class="font-bold text-lg text-green-200 leading-tight">{{ p.name }}</div>
                          <div class="flex flex-wrap gap-2 text-xs text-gray-300 mt-1">
                            <span class="bg-black/30 px-2 py-0.5 rounded border border-white/5" title="Secret PIN">🔑 <span class="font-mono text-gold font-bold">{{ p.pin }}</span></span>
                            <span class="bg-black/30 px-2 py-0.5 rounded border border-white/5">{{ p.foodPreference }}</span>
                          </div>
                        </div>
                      </div>

                      <!-- Actions -->
                      <button 
                        type="button"
                        (click)="deleteParticipant($event, p.id)" 
                        [disabled]="isParticipantRemoving(p.id)"
                        class="relative z-50 p-2 rounded-lg transition-all disabled:opacity-50 min-w-[40px] flex items-center justify-center cursor-pointer shadow-sm"
                        style="background-color: {{ confirmingDeleteId() === p.id ? '#dc2626' : 'rgba(127, 29, 29, 0.2)' }}; color: {{ confirmingDeleteId() === p.id ? 'white' : '#f87171' }}"
                        title="Remove Participant">
                        
                        @if(isParticipantRemoving(p.id)) {
                          <span class="animate-spin inline-block text-xs">⏳</span>
                        } @else if (confirmingDeleteId() === p.id) {
                          <span class="text-xs font-bold px-1">Sure?</span>
                        } @else {
                          <span class="pointer-events-none">🗑️</span>
                        }
                      </button>
                    </div>

                    <!-- Constraints -->
                    <div class="mt-3 pt-3 border-t border-white/5 flex items-center gap-3">
                      <label class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Constraint:</label>
                      <div class="flex-grow relative">
                        <select 
                          [ngModel]="p.partnerId" 
                          (ngModelChange)="updatePartner(p.id, $event)"
                          class="w-full bg-black/40 text-white text-xs py-1.5 px-2 rounded border border-white/10 focus:outline-none focus:border-gold/50 appearance-none cursor-pointer hover:bg-black/60 transition-colors">
                          <option [ngValue]="null">No Partner Restriction</option>
                          @for (potential of service.adminParticipants(); track potential.id) {
                            @if(potential.id !== p.id) {
                              <option [value]="potential.id">Cannot gift: {{ potential.name }}</option>
                            }
                          }
                        </select>
                        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 text-xs">▼</div>
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="text-white/40 italic text-center py-8 border-2 border-dashed border-white/10 rounded-xl">
                    No participants yet. Share the link!
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: Settings & Actions -->
          <div class="lg:col-span-5">
            <div class="lg:sticky lg:top-8 space-y-6">
              <!-- Magic Button -->
              <div class="bg-gradient-to-br from-black/40 to-black/20 p-6 rounded-2xl border border-gold/30 shadow-lg relative overflow-hidden">
                <div class="absolute top-0 right-0 p-4 opacity-10 text-6xl pointer-events-none">🎲</div>
                <h3 class="text-xl font-bold text-gold mb-4">The Draw</h3>
                
                @if (service.config().drawComplete) {
                  <div class="bg-green-900/40 border border-green-500/50 p-4 rounded-xl text-center mb-4">
                    <div class="text-green-300 font-bold text-xl flex items-center justify-center gap-2 mb-1">
                      <span>✅</span> Draw Completed!
                    </div>
                    <p class="text-xs text-green-100/70">Matches are secure. Users can reveal now.</p>
                  </div>
                  <button (click)="service.resetDraw()" class="w-full py-2 text-xs text-red-400 hover:text-red-200 hover:bg-red-900/20 rounded transition-colors border border-transparent hover:border-red-900/50">
                    ⚠️ Reset Pairing (Danger)
                  </button>
                } @else {
                  <button 
                    (click)="draw()"
                    [disabled]="isDrawing || service.adminParticipants().length < 2"
                    class="w-full bg-gold hover:bg-yellow-400 text-red-900 font-bold py-4 rounded-xl shadow-lg border-b-4 border-yellow-700 active:border-b-0 active:translate-y-1 disabled:opacity-50 disabled:grayscale text-lg transition-all flex justify-center items-center gap-2">
                    @if (isDrawing) {
                      <span class="animate-spin">❄️</span> Calculating...
                    } @else {
                      <span>🎲</span> GENERATE PAIRINGS
                    }
                  </button>
                  <div class="mt-4 text-xs text-gray-400 bg-black/20 p-3 rounded-lg border border-white/5">
                    <p class="mb-1 font-bold text-gray-300">Smart Constraints Active:</p>
                    <ul class="list-disc list-inside space-y-1 opacity-80">
                      <li>Self-gifting prevented</li>
                      <li>Partner restrictions respected</li>
                      <li>Reciprocal gifting (A↔B) avoided</li>
                    </ul>
                  </div>
                }
              </div>

              <!-- Stats -->
              <div class="grid grid-cols-2 gap-4">
                <div class="bg-black/20 p-4 rounded-xl text-center border border-white/5">
                  <div class="text-2xl font-bold text-yellow-300">₹{{ service.config().budget }}</div>
                  <div class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Min Budget</div>
                </div>
                <div class="bg-black/20 p-4 rounded-xl text-center border border-white/5">
                  <div class="text-lg font-bold text-red-300 truncate">{{ service.config().deadline }}</div>
                  <div class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Deadline</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .custom-scroll::-webkit-scrollbar { width: 4px; }
    .custom-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
    .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
    .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
    .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class AdminComponent {
  service = inject(SantaService);
  notificationService = inject(NotificationService);
  isDrawing = false;
  isRemoving = signal<string | null>(null);
  confirmingDeleteId = signal<string | number | null>(null);
  passwordAttempt = '';
  
  hoveredParticipantId = signal<string | number | null>(null);

  async login() {
    if (await this.service.checkAdminPassword(this.passwordAttempt)) {
      this.passwordAttempt = '';
    } else {
      this.notificationService.show('🚫 Naughty list! Incorrect password.', 'error');
    }
  }

  isPartnerOfHovered(id: string | number): boolean {
    const hoveredId = this.hoveredParticipantId();
    if (!hoveredId) return false;
    
    const participants = this.service.adminParticipants();
    const hoveredParticipant = participants.find(p => p.id === hoveredId);
    
    return hoveredParticipant?.partnerId === id;
  }

  async deleteParticipant(event: Event, id: string | number) {
    event.stopPropagation();
    event.preventDefault();
    
    if (this.confirmingDeleteId() === id) {
      this.isRemoving.set(String(id));
      this.confirmingDeleteId.set(null);
      
      try {
        const success = await this.service.removeParticipant(id);
        if (success) {
          this.notificationService.show('Participant removed.', 'success');
        }
      } catch (e) {
        console.error('[DEBUG] Delete error:', e);
      } finally {
        this.isRemoving.set(null);
      }
    } else {
      this.confirmingDeleteId.set(id);
      setTimeout(() => {
        if (this.confirmingDeleteId() === id) {
          this.confirmingDeleteId.set(null);
        }
      }, 3000);
    }
  }

  isParticipantRemoving(id: string | number): boolean {
    return this.isRemoving() === String(id);
  }

  updatePartner(id: string | number, partnerId: string | number | null) {
    if (id === partnerId) return;
    this.service.updatePartner(id, partnerId);
  }

  async draw() {
    this.isDrawing = true;
    const success = await this.service.generateMatches();
    this.isDrawing = false;
    
    if (success) {
      this.notificationService.show('Draw Successful! Matches are hidden safely in the cloud.', 'success');
    } else {
      this.notificationService.show('Could not generate valid matches. Check constraints (too many couples?).', 'error');
    }
  }

  backupData() {
    const data = this.service.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `santa-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
