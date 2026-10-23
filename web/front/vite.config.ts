import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 开发期把 /api 代理到 ASP.NET Core（5132）；生产由后端 wwwroot 托管构建产物
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:5132', changeOrigin: true },
      // 双保险：若仍有 /uploads 直链，同样转发后端，避免落入 SPA 兜底路由
      '/uploads': { target: 'http://127.0.0.1:5132', changeOrigin: true },
    },
  },
  build: {
    outDir: '../back/wwwroot',
    emptyOutDir: true,
  },
})
