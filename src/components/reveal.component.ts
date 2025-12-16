
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SantaService, Participant } from '../services/santa.service';
import { GoogleGenAI } from '@google/genai';

@Component({
  selector: 'app-reveal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full flex flex-col items-center justify-center p-4 min-h-[80vh]">
      
      @if (!service.config().drawComplete) {
        <div class="frosty-glass p-12 rounded-3xl text-center shadow-xl relative max-w-md mx-auto animate-float">
          <div class="absolute -top-8 -right-8 text-7xl animate-pulse">🧝</div>
          <div class="text-7xl mb-6">🔒</div>
          <h2 class="text-5xl font-christmas text-gold mb-6">Not Yet!</h2>
          <p class="text-xl text-white">The elves are still calculating... <br>Check back after the 20th!</p>
        </div>
      } @else {
        
        @if (!selectedUser()) {
          <!-- Selection Step -->
          <div class="frosty-glass p-10 rounded-[2rem] shadow-2xl text-center w-full max-w-3xl border border-white/20">
            <h2 class="text-5xl font-christmas text-gold mb-4 drop-shadow-md">Identify Yourself</h2>
            <p class="text-lg text-gray-200 mb-10 font-body">Click your name to verify your identity.</p>
            
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto custom-scroll pr-2">
              @for (p of service.participants(); track p.id) {
                <button 
                  (click)="select(p)"
                  class="bg-white/10 hover:bg-white/25 text-white py-6 px-4 rounded-2xl transition-all border border-white/10 hover:border-gold hover:scale-105 hover:shadow-lg flex flex-col items-center gap-3 group relative overflow-hidden">
                  <div class="text-4xl group-hover:animate-bounce transition-transform">
                    {{ getAvatar(p.gender) }}
                  </div>
                  <span class="font-bold text-lg truncate w-full text-shadow-sm">{{ p.name }}</span>
                </button>
              }
            </div>
          </div>
        } @else if (!isAuthenticated()) {
          <!-- Security PIN Check -->
          <div class="frosty-glass p-8 rounded-[2rem] shadow-2xl text-center w-full max-w-md border border-red-500/30 animate-fade-in relative">
            <button (click)="reset($event)" class="absolute top-4 right-4 text-white/50 hover:text-white">✕</button>
            <div class="text-6xl mb-4">🔐</div>
            <h2 class="text-3xl font-christmas text-gold mb-2">Enter Secret PIN</h2>
            <p class="text-white/80 mb-6 text-sm">Verify you are {{ selectedUser()?.name }} to see your target.</p>
            
            <input 
              type="text" 
              [(ngModel)]="pinAttempt"
              (keyup.enter)="verifyPin()"
              maxlength="4"
              class="w-full text-center text-3xl font-bold tracking-[1em] bg-black/40 text-white border-2 border-gold/50 rounded-xl p-4 focus:outline-none focus:border-gold focus:bg-black/60 mb-6 font-body placeholder-white/20"
              placeholder="****"
            >

            <button 
              (click)="verifyPin()"
              [disabled]="isValidating"
              class="w-full bg-green-700 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg border-b-4 border-green-900 active:border-b-0 active:translate-y-1 transition-all flex justify-center gap-2">
              @if (isValidating) {
                <span class="animate-spin">⏳</span> Verifying...
              } @else {
                UNLOCK 🔓
              }
            </button>
            <p *ngIf="pinError" class="text-red-400 mt-4 font-bold text-sm animate-shake">Incorrect PIN! Try again.</p>
          </div>
        } @else {
          <!-- Big Reveal Card -->
          <div class="scene">
            <div class="card-container" [class.flipped]="isRevealed()" (click)="reveal()">
              
              <!-- Front of Card (The Gift) -->
              <div class="card-face card-front shadow-2xl border-4 border-gold bg-gradient-to-br from-red-900 via-red-800 to-red-950">
                <div class="h-full w-full flex flex-col items-center justify-center relative p-8">
                  
                  <!-- Texture Overlay -->
                  <div class="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none"></div>
                  
                  <!-- Content -->
                  <div class="z-10 text-center space-y-8">
                    <div>
                      <p class="text-gold font-body uppercase tracking-[0.2em] text-sm mb-2">Secret Mission For</p>
                      <h2 class="text-5xl md:text-7xl font-christmas text-white drop-shadow-lg leading-tight">{{ selectedUser()?.name }}</h2>
                    </div>

                    <div class="relative inline-block group">
                      <div class="absolute inset-0 bg-gold/30 blur-2xl rounded-full animate-pulse"></div>
                      <div class="text-9xl relative z-10 animate-float transform group-hover:scale-110 transition-transform duration-300">🎁</div>
                      <p class="mt-4 text-xl font-bold text-gold animate-bounce">Tap to Open!</p>
                    </div>

                    <div class="bg-black/30 backdrop-blur-md px-8 py-3 rounded-full border border-white/10 inline-block">
                      <p class="text-sm text-gray-300">Budget Constraint</p>
                      <p class="text-2xl font-bold text-gold">Rs. {{ service.config().budget }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Back of Card (The Reveal) -->
              <div class="card-face card-back shadow-2xl border-4 border-green-600 bg-white">
                <div class="h-full w-full flex flex-col relative overflow-hidden">
                  
                  <!-- Confetti/Decor -->
                  <div class="absolute top-0 right-0 p-4 text-6xl opacity-20 rotate-12 pointer-events-none">🎄</div>
                  <div class="absolute bottom-0 left-0 p-4 text-6xl opacity-20 -rotate-12 pointer-events-none">❄️</div>

                  <!-- Header -->
                  <div class="bg-green-700 p-6 text-center shadow-md z-10 shrink-0">
                    <h3 class="text-2xl font-christmas text-white tracking-wide">You are Secret Santa for...</h3>
                  </div>

                  <!-- Main Content -->
                  <div class="flex-grow flex flex-col justify-center items-center p-6 text-center overflow-y-auto custom-scroll relative z-10">
                    
                    @if (isLoadingAi()) {
                      <div class="flex flex-col items-center animate-pulse">
                        <span class="text-7xl mb-4">🦌</span>
                        <p class="text-xl text-green-800 font-bold">Asking the Reindeer...</p>
                        <p class="text-xs text-gray-400 mt-2">Checking naughty/nice list...</p>
                      </div>
                    } @else if (assignedTarget) {
                      <div class="space-y-6 w-full max-w-lg">
                        
                        <!-- Name & Avatar -->
                        <div class="transform scale-110 mb-2 mt-4 flex flex-col items-center">
                          <div class="text-6xl mb-2 animate-bounce">{{ getAvatar(assignedTarget?.gender) }}</div>
                          <h2 class="text-5xl md:text-7xl font-christmas text-red-700 drop-shadow-sm leading-tight">
                            {{ assignedTarget?.name }}
                          </h2>
                        </div>

                        <!-- Data Grid -->
                        <div class="grid grid-cols-1 gap-3 text-left">
                          <div class="bg-orange-50 p-4 rounded-xl border border-orange-200 shadow-sm">
                            <div class="flex items-center gap-2 mb-1 text-orange-800 font-bold text-xs uppercase tracking-wider">
                              <span>🍽️</span> Food Preference
                            </div>
                            <div class="text-xl text-gray-900 font-bold pl-7">
                              {{ assignedTarget?.foodPreference || 'No preference' }}
                            </div>
                          </div>

                          <div class="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm">
                            <div class="flex items-center gap-2 mb-1 text-blue-800 font-bold text-xs uppercase tracking-wider">
                              <span>💡</span> Fun Fact / Hint
                            </div>
                            <div class="text-lg text-gray-900 font-medium pl-7 leading-snug">
                              {{ assignedTarget?.funFact || 'Loves surprises!' }}
                            </div>
                          </div>
                        </div>

                        <!-- BYOB Reminder -->
                        <div class="bg-purple-100 p-3 rounded-lg border border-purple-200 text-purple-900 text-sm font-bold flex items-center justify-center gap-2">
                          <span>🍷</span> Don't forget, it's BYOB! <span>🍺</span>
                        </div>

                        <!-- AI Message -->
                        @if (aiMessage()) {
                          <div class="mt-2 p-4 bg-yellow-50 border border-yellow-200 rounded-xl relative">
                            <span class="absolute -top-2 -left-2 text-2xl">📜</span>
                            <p class="italic text-gray-700 font-serif text-lg leading-relaxed">
                              "{{ aiMessage() }}"
                            </p>
                          </div>
                        }
                      </div>
                    } @else {
                      <div class="text-red-600 font-bold p-4 bg-red-100 rounded-xl">
                        <p class="text-xl mb-2">⚠️ Assignment Error</p>
                        <p class="text-sm">We couldn't find your match. Please contact the admin!</p>
                      </div>
                    }
                  </div>

                  <!-- Footer Action -->
                  <div class="p-4 bg-gray-50 border-t border-gray-200 z-10 shrink-0">
                    <button (click)="reset($event)" class="w-full py-4 bg-gray-800 hover:bg-black text-white rounded-xl font-bold text-lg transition-all transform active:scale-95 shadow-lg">
                      Close & Keep it Secret 🤫
                    </button>
                  </div>

                </div>
              </div>

            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .scene {
      perspective: 1000px;
      width: 100%;
      display: flex;
      justify-content: center;
      padding: 1rem;
    }
    .card-container {
      position: relative;
      width: 100%;
      max-width: 500px;
      height: 70vh;
      min-height: 600px;
      transform-style: preserve-3d;
      transition: transform 1s cubic-bezier(0.4, 0.0, 0.2, 1);
      cursor: pointer;
    }
    .card-container.flipped {
      transform: rotateY(180deg);
    }
    .card-face {
      position: absolute;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      border-radius: 2.5rem;
      overflow: hidden;
      top: 0;
      left: 0;
    }
    .card-front {
      transform: rotateY(0deg);
      z-index: 2;
    }
    .card-back {
      transform: rotateY(180deg);
      z-index: 1;
    }
    .text-shadow-sm { text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
    .custom-scroll::-webkit-scrollbar { width: 6px; }
    .custom-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
    .animate-shake {
      animation: shake 0.3s ease-in-out;
    }
    .animate-fade-in {
      animation: fadeIn 0.5s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class RevealComponent {
  service = inject(SantaService);
  selectedUser = signal<Participant | null>(null);
  
  // Security State
  isAuthenticated = signal(false);
  pinAttempt = signal('');
  pinError = signal(false);
  isValidating = false;

  // UI State
  isRevealed = signal(false);
  aiMessage = signal('');
  isLoadingAi = signal(false);
  
  assignedTarget: Participant | null = null;

  select(user: Participant) {
    this.selectedUser.set(user);
    this.isAuthenticated.set(false);
    this.pinAttempt.set('');
    this.pinError.set(false);
    this.isRevealed.set(false);
    this.aiMessage.set('');
    this.isLoadingAi.set(false);
    this.isValidating = false;
  }

  async verifyPin() {
    const user = this.selectedUser();
    if (!user || this.isValidating) return;

    this.isValidating = true;
    
    try {
      // Secure server-side check
      const target = await this.service.verifyUserAndGetTarget(user.id, this.pinAttempt());
      
      if (target) {
        this.assignedTarget = target;
        this.isAuthenticated.set(true);
      } else {
        this.pinError.set(true);
        setTimeout(() => this.pinError.set(false), 2000); 
      }
    } finally {
      this.isValidating = false;
    }
  }

  async reveal() {
    if (this.isRevealed()) return;
    this.isRevealed.set(true);
    
    const targetName = this.assignedTarget?.name || 'someone special';

    if (!this.aiMessage()) {
      this.isLoadingAi.set(true);
      
      try {
        let apiKey = '';
        try {
          // @ts-ignore
          if (typeof process !== 'undefined' && process.env && process.env['API_KEY']) {
            // @ts-ignore
            apiKey = process.env['API_KEY'];
          }
        } catch (e) {}

        if (apiKey) {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Write a very short, 2-line rhyming Christmas poem announcing that I am the Secret Santa for "${targetName}". Be charming, funny and use festive emojis.`,
            });
            this.aiMessage.set(response.text.trim());
        } else {
            this.setFallbackMessage(targetName);
        }
      } catch (e) {
        console.error('AI Gen Error:', e);
        this.setFallbackMessage(targetName);
      } finally {
        this.isLoadingAi.set(false);
      }
    }
  }

  setFallbackMessage(name: string) {
    this.aiMessage.set(`Ho Ho Ho! Make ${name}'s Christmas bright,\nWith a gift that brings them delight! 🎄✨`);
  }

  reset(e: Event) {
    e.stopPropagation();
    this.selectedUser.set(null);
    this.isAuthenticated.set(false);
    this.isRevealed.set(false);
    this.pinAttempt.set('');
    this.assignedTarget = null;
  }

  getAvatar(gender: string | undefined): string {
    if (gender === 'Female') return '🤶';
    if (gender === 'Male') return '🎅';
    return '🧝';
  }
}
