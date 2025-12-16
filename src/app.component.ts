
import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnowComponent } from './components/snow.component';
import { SignupComponent } from './components/signup.component';
import { AdminComponent } from './components/admin.component';
import { RevealComponent } from './components/reveal.component';
import { SantaService } from './services/santa.service';

type ViewState = 'home' | 'admin' | 'reveal';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SnowComponent, SignupComponent, AdminComponent, RevealComponent],
  template: `
    <app-snow></app-snow>
    
    <div class="min-h-screen flex flex-col">
      <!-- Header -->
      <header class="p-4 z-20 flex justify-between items-center bg-black/20 backdrop-blur-sm sticky top-0">
        <h1 class="text-2xl font-christmas text-gold drop-shadow-md">The Happy Hour 🎄</h1>
        <nav class="space-x-2 text-sm font-bold">
          <button (click)="navigateTo('home')" [class.text-gold]="view === 'home'" class="hover:text-white transition-colors">Home</button>
          <button (click)="navigateTo('reveal')" [class.text-gold]="view === 'reveal'" class="hover:text-white transition-colors">Reveal</button>
          <button (click)="navigateTo('admin')" [class.text-gold]="view === 'admin'" class="hover:text-white transition-colors text-xs opacity-50">Admin</button>
        </nav>
      </header>

      <!-- Main Content -->
      <main class="flex-grow p-4 relative flex flex-col justify-center items-center">
        
        @switch (view) {
          @case ('home') {
            <!-- Gallery if images exist -->
            @if (service.config().galleryImages.length > 0) {
              <div class="w-full max-w-2xl mb-8 z-10 relative">
                <div class="absolute -top-6 -left-6 text-4xl animate-bounce z-20">🎅</div>
                <div class="frosty-glass p-2 rounded-2xl overflow-hidden">
                  <div class="flex gap-4 overflow-x-auto p-2 scrollbar-hide">
                    @for (img of service.config().galleryImages; track $index) {
                      <img [src]="img" class="h-48 rounded-xl object-cover shadow-lg border-2 border-gold/50 flex-shrink-0 animate-fade-in transition-transform hover:scale-105">
                    }
                  </div>
                </div>
              </div>
            }

            <!-- Countdown Timer -->
            @if (!service.config().drawComplete) {
              <div class="z-10 mb-8 w-full max-w-2xl flex flex-col items-center animate-fade-in">
                <p class="text-gold font-christmas text-xl mb-2 tracking-widest uppercase text-shadow-sm">Time Left to Sign Up</p>
                
                @if (!timerExpired()) {
                  <div class="flex flex-wrap justify-center gap-3 md:gap-6">
                    <!-- Days -->
                    <div class="flex flex-col items-center bg-black/30 backdrop-blur-md border border-white/10 rounded-xl p-3 md:p-4 min-w-[80px] md:min-w-[100px] shadow-lg transform hover:scale-105 transition-transform duration-300">
                      <span class="text-3xl md:text-5xl font-bold text-white font-body">{{ timeLeft().days }}</span>
                      <span class="text-[10px] md:text-xs uppercase tracking-wider text-gold mt-1">Days</span>
                    </div>
                    
                    <div class="text-2xl md:text-4xl font-christmas text-white/50 pt-4 animate-pulse">:</div>

                    <!-- Hours -->
                    <div class="flex flex-col items-center bg-black/30 backdrop-blur-md border border-white/10 rounded-xl p-3 md:p-4 min-w-[80px] md:min-w-[100px] shadow-lg transform hover:scale-105 transition-transform duration-300">
                      <span class="text-3xl md:text-5xl font-bold text-white font-body">{{ timeLeft().hours }}</span>
                      <span class="text-[10px] md:text-xs uppercase tracking-wider text-gold mt-1">Hours</span>
                    </div>

                    <div class="text-2xl md:text-4xl font-christmas text-white/50 pt-4 animate-pulse">:</div>

                    <!-- Minutes -->
                    <div class="flex flex-col items-center bg-black/30 backdrop-blur-md border border-white/10 rounded-xl p-3 md:p-4 min-w-[80px] md:min-w-[100px] shadow-lg transform hover:scale-105 transition-transform duration-300">
                      <span class="text-3xl md:text-5xl font-bold text-white font-body">{{ timeLeft().minutes }}</span>
                      <span class="text-[10px] md:text-xs uppercase tracking-wider text-gold mt-1">Mins</span>
                    </div>

                    <div class="text-2xl md:text-4xl font-christmas text-white/50 pt-4 animate-pulse hidden md:block">:</div>

                    <!-- Seconds -->
                    <div class="flex flex-col items-center bg-black/30 backdrop-blur-md border border-white/10 rounded-xl p-3 md:p-4 min-w-[80px] md:min-w-[100px] shadow-lg transform hover:scale-105 transition-transform duration-300">
                      <span class="text-3xl md:text-5xl font-bold text-red-400 font-body w-[2ch] text-center">{{ timeLeft().seconds }}</span>
                      <span class="text-[10px] md:text-xs uppercase tracking-wider text-gold mt-1">Secs</span>
                    </div>
                  </div>
                } @else {
                  <div class="bg-red-900/80 text-white px-8 py-4 rounded-xl border-2 border-red-500 shadow-xl animate-bounce">
                    <span class="text-2xl font-bold">🚫 Signups Closed!</span>
                  </div>
                }
              </div>
            }
            
            <!-- Only show signup if timer is running OR if draw is already complete (which shows a message) -->
            @if (!timerExpired() || service.config().drawComplete) {
              <app-signup></app-signup>
            }
            
            <div class="mt-8 text-center z-10 text-green-100 text-sm bg-black/30 p-2 rounded-full px-6 flex items-center gap-2 border border-white/5">
              <span>📅 Deadline: <span class="text-gold font-bold">{{ service.config().deadline }}</span></span>
              <span class="text-white/30">|</span>
              <span>💰 Budget: <span class="text-gold font-bold">Rs. {{ service.config().budget }}</span></span>
            </div>
          }
          @case ('admin') {
            <app-admin></app-admin>
          }
          @case ('reveal') {
            <app-reveal></app-reveal>
          }
        }

      </main>

      <!-- Footer -->
      <footer class="p-4 text-center text-xs text-white/40 z-10 relative flex justify-center items-center gap-2">
        <span>Made with ❤️ for The Happy Hour</span>
        <span class="text-lg">☃️</span>
      </footer>
    </div>
  `,
  styles: [`
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
    .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-fade-in {
      animation: fadeIn 0.5s ease-out forwards;
    }
    .text-shadow-sm {
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  service = inject(SantaService);
  view: ViewState = 'home';
  
  timeLeft = signal({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  timerExpired = signal(false);
  private intervalId: any;

  ngOnInit() {
    this.updateTimer();
    this.intervalId = setInterval(() => this.updateTimer(), 1000);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  updateTimer() {
    // Treat deadline as end of the day (approx) or just generic date comparison
    // Assuming YYYY-MM-DD string from service
    const deadlineStr = this.service.config().deadline;
    const deadline = new Date(deadlineStr).setHours(23, 59, 59, 999); // End of the deadline day
    const now = new Date().getTime();
    const diff = deadline - now;

    if (diff < 0) {
      this.timerExpired.set(true);
      this.timeLeft.set({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    this.timerExpired.set(false);
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    this.timeLeft.set({ days, hours, minutes, seconds });
  }

  navigateTo(target: ViewState) {
    this.view = target;
  }
}
