import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (notificationService.message(); as message) {
      <div 
        (click)="notificationService.hide()"
        [ngClass]="{
          'bg-green-600 border-green-800': notificationService.type() === 'success',
          'bg-red-600 border-red-800': notificationService.type() === 'error',
          'bg-blue-600 border-blue-800': notificationService.type() === 'info'
        }"
        class="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl shadow-2xl text-white font-bold border-b-4 cursor-pointer animate-slide-down-fade-in max-w-[90%] text-center">
        <span class="mr-2">
          {{ notificationService.type() === 'success' ? '✅' : (notificationService.type() === 'error' ? '❌' : 'ℹ️') }}
        </span>
        {{ message }}
      </div>
    }
  `,
  styles: [`
    @keyframes slide-down-fade-in {
      from {
        opacity: 0;
        transform: translate(-50%, -20px);
      }
      to {
        opacity: 1;
        transform: translate(-50%, 0);
      }
    }
    .animate-slide-down-fade-in {
      animation: slide-down-fade-in 0.3s ease-out forwards;
    }
  `]
})
export class NotificationComponent {
  notificationService = inject(NotificationService);
}
