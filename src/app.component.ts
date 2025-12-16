import { Component, inject, OnDestroy, signal, computed, effect, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SnowComponent } from './components/snow.component';
import { SignupComponent } from './components/signup.component';
import { AdminComponent } from './components/admin.component';
import { RevealComponent } from './components/reveal.component';
import { SantaService } from './services/santa.service';
import { NotificationComponent } from './components/notification.component';

type ViewState = 'home' | 'admin' | 'reveal';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SnowComponent, SignupComponent, AdminComponent, RevealComponent, NotificationComponent],
  template: `
    <app-snow></app-snow>
    <app-notification></app-notification>
    
    <div class="h-screen flex flex-col">
      <!-- Header -->
      <header class="p-4 z-20 flex justify-between items-center bg-black/20 backdrop-blur-sm sticky top-0 shrink-0">
        <h1 class="text-2xl font-christmas text-gold drop-shadow-md">The Happy Hour 🎄 SECRET SANTA</h1>
        <nav class="space-x-2 text-sm font-bold">
          <button (click)="navigateTo('home')" [class.text-gold]="view === 'home'" class="hover:text-white transition-colors">Home</button>
          <button (click)="navigateTo('reveal')" [class.text-gold]="view === 'reveal'" class="hover:text-white transition-colors">Reveal</button>
          <button (click)="navigateTo('admin')" [class.text-gold]="view === 'admin'" class="hover:text-white transition-colors text-xs opacity-50">Admin</button>
        </nav>
      </header>

      <!-- Main Content -->
      <main class="flex-grow p-4 md:py-8 relative overflow-y-auto custom-scroll">
        
        @switch (view) {
          @case ('home') {
            <div class="flex flex-col items-center">
              @switch (service.loadingState()) {
                @case ('loading') {
                  <div class="frosty-glass p-12 rounded-3xl text-center shadow-xl animate-pulse mt-10">
                    <div class="text-5xl mb-4">❄️</div>
                    <h2 class="text-3xl font-christmas text-gold">Checking Santa's List...</h2>
                    <p class="text-white/60 mt-2">Getting the latest from the North Pole.</p>
                  </div>
                }
                @case ('error') {
                   <div class="frosty-glass p-12 rounded-3xl text-center shadow-xl animate-pulse mt-10">
                    <div class="text-5xl mb-4">☠️</div>
                    <h2 class="text-3xl font-christmas text-red-500">North Pole Comms Down!</h2>
                    <p class="text-white/60 mt-2">Could not connect to Santa's database. Please try again later.</p>
                  </div>
                }
                @case ('loaded') {
                  <div class="w-full max-w-6xl mx-auto md:grid md:grid-cols-12 md:gap-12">
                    
                    <!-- Left Sticky Column -->
                    <div class="md:col-span-5 z-10">
                      <div class="md:sticky md:top-8 flex flex-col items-center gap-8">

                        <!-- Countdown Timer -->
                        @if (!service.config().drawComplete) {
                          <div class="z-10 w-full flex flex-col items-center animate-fade-in">
                            <p class="text-gold font-christmas text-3xl mb-6 tracking-widest text-shadow-sm">Time Left to Sign Up</p>
                            
                            @if (!timerExpired()) {
                              <div class="flex flex-wrap justify-center gap-2 md:gap-4">
                                <!-- Days Ornament -->
                                <div class="ornament-container">
                                  <div class="ornament ornament-red">
                                    <span class="time-value">{{ timeLeft().days }}</span>
                                    <span class="time-label">Days</span>
                                  </div>
                                </div>
                                <!-- Hours Ornament -->
                                <div class="ornament-container">
                                  <div class="ornament ornament-green">
                                    <span class="time-value">{{ timeLeft().hours }}</span>
                                    <span class="time-label">Hours</span>
                                  </div>
                                </div>
                                <!-- Mins Ornament -->
                                <div class="ornament-container">
                                  <div class="ornament ornament-blue">
                                    <span class="time-value">{{ timeLeft().minutes }}</span>
                                    <span class="time-label">Mins</span>
                                  </div>
                                </div>
                                <!-- Secs Ornament -->
                                <div class="ornament-container">
                                  <div class="ornament ornament-gold">
                                    <span class="time-value">{{ timeLeft().seconds }}</span>
                                    <span class="time-label">Secs</span>
                                  </div>
                                </div>
                              </div>
                            } @else {
                              <div class="bg-red-900/80 text-white px-8 py-4 rounded-xl border-2 border-red-500 shadow-xl animate-bounce">
                                <span class="text-2xl font-bold">🚫 Signups Closed!</span>
                              </div>
                            }
                          </div>
                        }
                        
                        <div class="text-center z-10 text-green-100 text-sm bg-black/30 p-2 rounded-full px-6 flex items-center gap-2 border border-white/5 mx-auto">
                          <span>📅 Deadline: <span class="text-gold font-bold">{{ service.config().deadline }}</span></span>
                          <span class="text-white/30">|</span>
                          <span>💰 Budget: <span class="text-gold font-bold">Rs. {{ service.config().budget }}</span></span>
                        </div>

                        <!-- Party Location Map -->
                        <div class="w-full z-10 animate-fade-in" style="animation-delay: 0.2s;">
                            <div class="frosty-glass p-4 rounded-2xl shadow-lg text-center border-t border-white/20">
                                <h3 class="font-christmas text-2xl text-gold mb-3">The North Pole Annex 🎅</h3>
                                <p class="text-xs text-white/70 mb-4">Smaaash, Lower Parel, Mumbai</p>
                                <div class="relative rounded-xl overflow-hidden shadow-inner border-2 border-white/10">
                                    <iframe 
                                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3772.833118231924!2d72.8256334249129!3d19.00624238219985!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7ceeb51e0f071%3A0x33b32414b58490f8!2sSmaaash!5e0!3m2!1sen!2sin!4v1715848590123!5m2!1sen!2sin" 
                                        class="w-full h-64"
                                        style="border:0; filter: invert(90%) hue-rotate(180deg);" 
                                        allowfullscreen="" 
                                        referrerpolicy="no-referrer-when-downgrade">
                                    </iframe>
                                </div>
                                <a href="https://maps.app.goo.gl/MDPEtuGuwbpcUG6s6" target="_blank" rel="noopener noreferrer" class="mt-4 inline-block bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-full transition-all text-sm shadow-md border-b-2 border-green-900 active:border-b-0 active:translate-y-px">
                                    Get Directions 🦌
                                </a>
                            </div>
                        </div>

                      </div>
                    </div>

                    <!-- Right Scrollable Content -->
                    <div class="md:col-span-7 mt-8 md:mt-0">
                      <div class="w-full">
                        @if (!timerExpired() || service.config().drawComplete) {
                          <app-signup></app-signup>
                        } @else {
                          <div class="frosty-glass p-8 rounded-3xl text-center shadow-xl">
                              <p class="text-xl font-bold">The deadline has passed!</p>
                              <p class="mt-2 text-white/80">The elves are busy preparing for the draw. Check back soon!</p>
                          </div>
                        }
                      </div>
                    </div>

                  </div>
                }
              }
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
      <footer class="p-4 text-center text-xs text-white/40 z-10 relative flex flex-col justify-center items-center gap-2 shrink-0">
        <span>Made with ❤️ for The Happy Hour</span>
        <div class="flex gap-6 text-2xl mt-2">
          <span class="animate-float" style="animation-duration: 4s; animation-delay: 0s;">🦌</span>
          <span class="animate-float" style="animation-duration: 3s; animation-delay: 0.5s;">☃️</span>
          <span class="animate-float" style="animation-duration: 3.5s; animation-delay: 0.2s;">🐧</span>
        </div>
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
    .custom-scroll::-webkit-scrollbar { width: 4px; }
    .custom-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
    .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
    .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
    
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
    
    /* Festive Timer Styles */
    @keyframes swing {
      0%, 100% { transform: rotate(3deg); }
      50% { transform: rotate(-3deg); }
    }
    .ornament-container {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      animation: swing 4s ease-in-out infinite;
    }
    .ornament {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: 'Quicksand', sans-serif;
      box-shadow: inset 0 -5px 10px rgba(0,0,0,0.3), 0 5px 15px rgba(0,0,0,0.5);
      position: relative;
      border: 2px solid rgba(255, 255, 255, 0.2);
    }
    .ornament::before { /* Cap */
      content: '';
      position: absolute;
      top: -10px;
      width: 20px;
      height: 10px;
      background: #d4af37; /* gold */
      border-radius: 5px 5px 0 0;
      border: 1px solid #e6c76a;
    }
    .ornament::after { /* String */
      content: '';
      position: absolute;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      width: 2px;
      height: 12px;
      background: #d4af37;
      border-radius: 2px;
    }
    .ornament-red { background: linear-gradient(135deg, #d32f2f, #880e4f); }
    .ornament-green { background: linear-gradient(135deg, #388e3c, #1b5e20); }
    .ornament-blue { background: linear-gradient(135deg, #1976d2, #0d47a1); }
    .ornament-gold { background: linear-gradient(135deg, #f9a825, #c67c00); }

    .time-value {
      font-size: 2.25rem;
      line-height: 1;
      font-weight: 700;
      text-shadow: 0 2px 3px rgba(0,0,0,0.4);
    }
    .time-label {
      font-size: 0.6rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      opacity: 0.8;
      margin-top: 2px;
    }
    
    @media (min-width: 768px) {
      .ornament {
        width: 120px;
        height: 120px;
      }
       .time-value { font-size: 3rem; }
       .time-label { font-size: 0.75rem; }
       .ornament::before { top: -15px; width: 30px; height: 15px; }
       .ornament::after { top: -30px; height: 15px; }
    }
  `]
})
export class AppComponent implements OnDestroy {
  service = inject(SantaService);
  platformId = inject(PLATFORM_ID);
  view: ViewState = 'home';
  
  timeLeft = signal({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  timerExpired = signal(false);
  private intervalId: any;

  constructor() {
    effect(() => {
      // Start the timer only once the config is loaded and we are in the browser.
      if (isPlatformBrowser(this.platformId) && this.service.loadingState() === 'loaded' && !this.intervalId) {
        this.updateTimer(); // Run immediately
        this.intervalId = setInterval(() => this.updateTimer(), 1000);
      }
    });
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
