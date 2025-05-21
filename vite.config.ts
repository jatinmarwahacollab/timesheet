import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  build:{
    target: "esnext", // or "es2019",
  },
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});