import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        'react',
        'react/',
        'react/jsx-runtime',
        'react-dom',
        'react-dom/',
        'react-dom/client',
        'firebase/app',
        'firebase/firestore',
        '@google/genai'
      ]
    }
  }
});