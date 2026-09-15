import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

// Temporary workaround for the injected DevTools web-vitals error in development.
if (!environment.production) {
  window.addEventListener('error', (event) => {
    const stack = String(event.error?.stack ?? '');

    if (
      event.filename === '' &&
      event.message?.includes("reading 'startTime'") &&
      stack.includes('reportAllChanges')
    ) {
      event.preventDefault();
    }
  });
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

// Auto-reload when chunk fails to load (stale cache after new deployment)
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message ?? '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed')
  ) {
    window.location.reload();
  }
});
