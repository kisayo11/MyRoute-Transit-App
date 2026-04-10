import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vercel/GitHub Pages 공용 호환을 위한 상대 경로 설정
export default defineConfig({
  base: './',
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
