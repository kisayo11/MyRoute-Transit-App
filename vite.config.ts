import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages용 최적화 설정 (v1.1.0)
// 모든 PWA 및 서비스 워커 관련 로직을 제거하여 MIME 에러를 방지합니다.
export default defineConfig({
  base: '/MyRoute-Transit-App/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // 점 파일(.nojekyll 등) 처리를 위해 청소 방지 설정은 하되, 
    // 기본적으로는 clean을 true로 하여 잔재를 없앱니다.
    emptyOutDir: true,
  }
})
