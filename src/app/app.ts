import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoaderComponent } from './components/layout/loader/loader';
import { ToastComponent } from './components/shared/toast/toast';
import { ConfirmationDialogComponent } from './components/shared/confirmation-dialog/confirmation-dialog';
import { TechInfoComponent } from './components/shared/tech-info/tech-info';
import { SignalrService } from './services/signalr.service';
import { AuthService } from './services/auth.service';
import { VersionCheckService } from './services/version-check.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    LoaderComponent,
    ToastComponent,
    ConfirmationDialogComponent,
    TechInfoComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly title = signal('my-angular-app');
  private signalrService = inject(SignalrService);
  private authService = inject(AuthService);
  private versionCheckService = inject(VersionCheckService);

  ngOnInit() {
    // this.authService.initializeFromBackend().subscribe();
    this.signalrService.startConnection();
    this.versionCheckService.start();
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  }
}
