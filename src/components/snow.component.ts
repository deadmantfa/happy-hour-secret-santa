
import { Component, OnInit, signal } from '@angular/core';

@Component({
  selector: 'app-snow',
  standalone: true,
  template: `
    <div class="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      @for (flake of flakes(); track flake.id) {
        <div 
          class="absolute text-white opacity-80 animate-fall"
          [style.left.%]="flake.left"
          [style.animation-duration.s]="flake.duration"
          [style.animation-delay.s]="flake.delay"
          [style.font-size.px]="flake.size">
          ❄
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes fall {
      0% { transform: translateY(-10vh) translateX(0); opacity: 0; }
      10% { opacity: 0.8; }
      100% { transform: translateY(110vh) translateX(20px); opacity: 0.3; }
    }
    .animate-fall {
      animation-name: fall;
      animation-timing-function: linear;
      animation-iteration-count: infinite;
    }
  `]
})
export class SnowComponent implements OnInit {
  flakes = signal<{id: number, left: number, duration: number, delay: number, size: number}[]>([]);

  ngOnInit() {
    const count = 30;
    const newFlakes = [];
    for (let i = 0; i < count; i++) {
      newFlakes.push({
        id: i,
        left: Math.random() * 100,
        duration: 5 + Math.random() * 10,
        delay: Math.random() * 5,
        size: 10 + Math.random() * 20
      });
    }
    this.flakes.set(newFlakes);
  }
}
