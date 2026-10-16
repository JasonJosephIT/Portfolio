// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Tech-only preview: the home and art pages are ported in later PRs (migration ticket, PR B).
  redirects: { "/": "/tech" },
  integrations: [react()],
  devToolbar: { enabled: false },

  vite: {
    plugins: [tailwindcss()]
  }
});