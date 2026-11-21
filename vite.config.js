import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

// legacy: osobny pakiet dla starszych przeglądarek w telewizorach (Tizen, webOS, stare Android TV)
export default defineConfig({
  plugins: [
    react(),
    legacy({ targets: ['chrome >= 56', 'safari >= 11', 'samsung >= 6', 'firefox >= 60'] }),
  ],
  build: { target: 'es2017' },
  define: { __BUILD__: JSON.stringify(String(Date.now())) },
});
