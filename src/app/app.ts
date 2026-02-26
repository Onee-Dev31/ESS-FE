import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoaderComponent } from './components/layout/loader/loader';
import { ToastComponent } from './components/shared/toast/toast';
import { ConfirmationDialogComponent } from './components/shared/confirmation-dialog/confirmation-dialog';
import { SignalrService } from './services/signalr.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoaderComponent, ToastComponent, ConfirmationDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {

  protected readonly title = signal('my-angular-app');
  private signalrService = inject(SignalrService);

  ngOnInit() {
    this.signalrService.startConnection();
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  }
}