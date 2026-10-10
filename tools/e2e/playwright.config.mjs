// Runs in the Edge already installed on the machine — no browser download.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['cards.spec.mjs'],
  workers: 1,               // clicks.json is collected across the whole run
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { channel: 'msedge', headless: true, viewport: { width: 1500, height: 1000 } },
});
