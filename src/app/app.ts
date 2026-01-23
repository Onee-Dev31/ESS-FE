import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AlertModals } from './components/modals/alert-modals/alert-modals';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AlertModals],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('my-angular-app');
}
