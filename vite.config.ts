import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'robots.txt', 'sitemap.xml'],
      // 1. Tell VitePWA to inject our custom Service Worker handler
      workbox: {
        importScripts: ['/share-target-handler.js']
      },
      manifest: {
        name: 'ChocoShare',
        short_name: 'ChocoShare',
        description: 'Share files securely device-to-device with no size limits.',
        theme_color: '#3C1F00',
        background_color: '#FFFDD0',
        display: 'standalone',
        
        // 2. Add the Share Target API Configuration
        share_target: {
          action: '/share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
            files: [
              {
                name: 'shared_files',
                accept: ['*/*'] // Accepts all file types (images, pdfs, videos)
              }
            ]
          }
        },
        
        icons: [
          {
            src: '/logo-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/logo-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
});
