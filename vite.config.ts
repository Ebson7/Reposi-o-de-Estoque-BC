
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Garante que process.env.API_KEY funcione no navegador através do Vite
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});