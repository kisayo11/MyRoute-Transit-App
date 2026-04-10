import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// PWA 제거 — 서비스 워커 캐시가 MIME 오류의 근본 원인
// 개인용 앱에서 PWA는 필요 없고 오히려 구버전 캐시 문제를 유발함
export default defineConfig({
  base: '/MyRoute-Transit-App/',
  plugins: [
    react(),
    tailwindcss(),
  ],
})
