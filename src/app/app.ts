/**
 * @file App
 * @description Logic for App
 */

// Section: Imports
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoaderComponent } from './components/layout/loader/loader';
import { ToastComponent } from './components/shared/toast/toast';
import { ConfirmationDialogComponent } from './components/shared/confirmation-dialog/confirmation-dialog';

// Section: Logic
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoaderComponent, ToastComponent, ConfirmationDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('my-angular-app');
}
