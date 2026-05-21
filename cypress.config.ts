import { defineConfig } from 'cypress';
require('dotenv').config();
const {
  setupSheet,
  uploadSpecResults,
  finalizeSheet,
} = require('./scripts/upload-cypress-results');

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 8000,
    setupNodeEvents(on) {
      on('before:run', async () => {
        await setupSheet();
      });
      on('after:spec', async (_spec, results) => {
        await uploadSpecResults(_spec, results);
      });
      on('after:run', async () => {
        await finalizeSheet();
      });
    },
  },
  env: {
    username: 'NoppornEam',
    password: 'Nueng@1616',
  },
});
