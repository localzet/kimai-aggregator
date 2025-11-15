import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    modules: {
      localsConvention: 'camelCase'
    }
  },
  server: {
    proxy: {
      '/api/proxy': {
        target: process.env.VITE_KIMAI_URL || '',
        changeOrigin: true,
        rewrite: (path) => {
          // Убираем /api/proxy и query параметры
          const cleanPath = path.replace(/^\/api\/proxy/, '').split('?')[0]
          return cleanPath
        },
        secure: true,
        followRedirects: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Явно передаем все заголовки из оригинального запроса
            const authHeader = req.headers['authorization']
            if (authHeader) {
              proxyReq.setHeader('Authorization', authHeader)
            }
            // Передаем все заголовки из оригинального запроса
            Object.keys(req.headers).forEach(key => {
              if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'connection') {
                proxyReq.setHeader(key, req.headers[key])
              }
            })
            // Логируем для отладки
            console.log('Proxying request:', {
              path: proxyReq.path,
              method: proxyReq.method,
              hasAuth: !!authHeader,
              target: proxyReq.getHeader('host')
            })
          })
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            // При редиректе убеждаемся, что заголовки сохраняются
            if (proxyRes.statusCode === 301 || proxyRes.statusCode === 302) {
              console.log('Redirect detected:', proxyRes.headers.location)
            }
          })
        },
      },
    },
  },
})

