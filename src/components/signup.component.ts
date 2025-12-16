
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SantaService } from '../services/santa.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative w-full max-w-2xl mx-auto">
      
      <!-- BYOB Banner -->
      <div class="mb-6 bg-yellow-500/20 border-2 border-gold p-3 rounded-xl text-center backdrop-blur-sm animate-pulse">
        <span class="text-2xl mr-2">🍺🍷</span>
        <span class="font-christmas text-xl text-gold">Note: It's BYOB (Bring Your Own Booze)!</span>
        <span class="text-2xl ml-2">🥂</span>
      </div>

      <!-- Decor Characters -->
      <div class="absolute -top-12 -left-12 text-6xl animate-bounce hidden md:block" style="animation-duration: 2s;">🦌</div>
      <div class="absolute -bottom-8 -right-10 text-6xl animate-pulse hidden md:block">⛄</div>

      <div class="p-6 frosty-glass rounded-3xl shadow-2xl relative z-10 text-center border-t border-white/30">
        <h2 class="text-4xl font-christmas text-gold mb-2 drop-shadow-sm">Join "The Happy Hour"</h2>
        <h3 class="text-xl font-christmas text-white mb-6">Secret Santa Exchange</h3>

        @if (service.config().drawComplete) {
          <div class="bg-red-900/80 p-6 rounded-xl border border-gold animate-float shadow-xl">
            <p class="text-xl mb-4 font-bold">🎅 The pairings are complete!</p>
            <p>Signups are closed. Head over to the Reveal page to see who you got!</p>
          </div>
        } @else {
          <div class="space-y-4 text-left">
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Name -->
              <div class="bg-black/20 p-4 rounded-xl">
                <label class="block text-sm font-bold mb-1 text-green-200">Your Name</label>
                <input 
                  type="text" 
                  [(ngModel)]="name" 
                  placeholder="e.g. Buddy the Elf"
                  class="w-full p-3 rounded-lg bg-white/90 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold font-body"
                />
              </div>

              <!-- Gender (For Avatars) -->
              <div class="bg-black/20 p-4 rounded-xl">
                <label class="block text-sm font-bold mb-1 text-green-200">Elf Identity ⚧</label>
                <select 
                  [(ngModel)]="gender" 
                  class="w-full p-3 rounded-lg bg-white/90 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold font-body">
                  <option value="Male">Gentleman Elf 🎅</option>
                  <option value="Female">Lady Elf 🤶</option>
                  <option value="Other">Mysterious Elf 🧝</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Food Preference -->
              <div class="bg-black/20 p-4 rounded-xl">
                <label class="block text-sm font-bold mb-1 text-green-200">Dietary Style 🍗🥗</label>
                <select 
                  [(ngModel)]="foodPref" 
                  class="w-full p-3 rounded-lg bg-white/90 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold font-body">
                  <option value="Non-Veg">Non-Veg (I eat everything)</option>
                  <option value="Veg">Veg (No meat please)</option>
                  <option value="Vegan">Vegan (Plants only)</option>
                  <option value="Eggetarian">Eggetarian</option>
                </select>
              </div>

              <!-- SECRET PIN -->
              <div class="bg-red-900/40 p-4 rounded-xl border border-red-500/30">
                <label class="block text-sm font-bold mb-1 text-gold">Secret PIN 🔒</label>
                <p class="text-xs text-gray-300 mb-1">Remember this! You need it to see your match.</p>
                <input 
                  type="text" 
                  [(ngModel)]="pin" 
                  maxlength="4"
                  placeholder="e.g. 1234"
                  class="w-full p-3 rounded-lg bg-white/90 text-gray-900 font-bold tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-red-500 font-body"
                />
              </div>
            </div>

            <!-- Fun Question -->
            <div class="bg-black/20 p-4 rounded-xl">
              <label class="block text-sm font-bold mb-1 text-green-200">Gift Hint / Fun Fact 🎁</label>
              <p class="text-xs text-gray-300 mb-1">Help your Santa out! Or tell us your favorite drink.</p>
              <input 
                type="text" 
                [(ngModel)]="funFact" 
                placeholder="e.g. I love dark chocolate / I drink Gin"
                class="w-full p-3 rounded-lg bg-white/90 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold font-body"
              />
            </div>

            <!-- Partner -->
            <div class="bg-black/20 p-4 rounded-xl">
              <label class="block text-sm font-bold mb-1 text-green-200">Are you a couple? (Optional)</label>
              <p class="text-xs text-gray-300 mb-2">Select your partner so you don't gift them! ❤️</p>
              <select 
                [(ngModel)]="partnerId" 
                class="w-full p-3 rounded-lg bg-white/90 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold font-body">
                <option [ngValue]="null">-- No Partner / Partner not listed yet --</option>
                @for (p of service.participants(); track p.id) {
                  <!-- Use ngValue to preserve ID type (number vs string) -->
                  <option [ngValue]="p.id">{{ p.name }}</option>
                }
              </select>
            </div>

            <div class="pt-4">
              <button 
                (click)="join()"
                [disabled]="!name() || !funFact() || !pin() || isJoining()"
                class="w-full bg-berry-red hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all transform hover:scale-105 shadow-lg border-b-4 border-red-900 active:border-b-0 active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                @if (isJoining()) {
                  <span class="animate-spin text-xl">❄️</span> <span>Sending to North Pole...</span>
                } @else {
                  <span>Join the Fun!</span> <span>🎁</span>
                }
              </button>
            </div>
          </div>

          <div class="mt-8 pt-6 border-t border-white/20">
            <h4 class="font-christmas text-2xl text-gold mb-4 text-center">Who's In?</h4>
            <div class="flex flex-wrap justify-center gap-2">
              @for (p of service.participants(); track p.id) {
                <span class="px-3 py-1 bg-green-800/60 rounded-full border border-green-600 text-sm flex items-center gap-1">
                  <span>{{ getAvatar(p.gender) }}</span> {{ p.name }}
                </span>
              } @empty {
                <span class="text-gray-400 italic">No elves have signed up yet...</span>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class SignupComponent {
  service = inject(SantaService);
  name = signal('');
  gender = signal('Male');
  pin = signal('');
  foodPref = signal('Non-Veg');
  funFact = signal('');
  partnerId = signal<string | number | null>(null);
  isJoining = signal(false);

  async join() {
    if (!this.name() || !this.funFact() || !this.pin()) return;
    
    // Basic PIN validation
    if (this.pin().length < 3) {
      alert('Please enter a secure PIN (at least 3 digits/letters).');
      return;
    }

    this.isJoining.set(true);

    try {
      console.log('Attempting to join...');
      const success = await this.service.addParticipant(
        this.name(), 
        this.gender(),
        this.pin(),
        this.partnerId(), 
        this.foodPref(), 
        this.funFact()
      );
      
      if (success) {
        // Reset form only on success
        this.name.set('');
        this.funFact.set('');
        this.pin.set('');
        this.partnerId.set(null);
        alert('Ho Ho Ho! You have been added to the list! Don\'t forget your PIN!');
      }
    } catch (e: any) {
      console.error('Join Error:', e);
      alert('Network Error: ' + (e.message || 'Unknown error occurred.'));
    } finally {
      this.isJoining.set(false);
    }
  }

  getAvatar(gender: string): string {
    if (gender === 'Female') return '🤶';
    if (gender === 'Male') return '🎅';
    return '🧝';
  }
}
