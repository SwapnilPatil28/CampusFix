import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          const packageName = id.split('node_modules/').at(-1)?.split('/')[0];
          if (['react', 'react-dom', 'scheduler', 'react-router', 'react-router-dom'].includes(packageName)) return 'react-vendor';
          if (packageName === 'framer-motion') return 'motion-vendor';
          if (packageName === 'lucide-react') return 'icons-vendor';
          if (packageName === 'axios') return 'http-vendor';
          return undefined;
        }
      }
    }
  }
});
