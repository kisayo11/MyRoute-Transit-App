import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/MyRoute-Transit-App/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MyRoute',
        short_name: 'MyRoute',
        description: '대중교통 커스텀 라우팅 및 ETA 앱',
        theme_color: '#16171d',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/vite.svg', // TODO: 임시 Vite 아이콘 사용, 나중에 교체 필요
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: '/vite.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
})
