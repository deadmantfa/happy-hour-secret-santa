import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  message = signal<string | null>(null);
  type = signal<NotificationType>('info');
  private timer: any;

  show(message: string, type: NotificationType = 'info', duration: number = 4000) {
    // If a notification is already showing, clear its timeout
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.message.set(message);
    this.type.set(type);
    this.timer = setTimeout(() => this.hide(), duration);
  }

  hide() {
    this.message.set(null);
    clearTimeout(this.timer);
  }
}
