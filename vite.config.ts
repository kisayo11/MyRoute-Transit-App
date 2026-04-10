import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages 배포용으로 롤백 (Vercel에서는 호스트에서 corsproxy를 차단함)
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
