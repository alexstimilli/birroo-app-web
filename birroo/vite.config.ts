import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Birroo - Veloce. Risparmia.',
          short_name: 'Birroo',
          description: 'Traccia, confronta i prezzi del carburante e trova sempre il distributore più conveniente.',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/birroo-icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/birroo-icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/birroo-icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true', allowedHosts: true,
    },
  };
});
