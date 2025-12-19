import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'vite.svg'],
      manifest: {
        name: 'Kimai Aggregator',
        short_name: 'Kimai',
        description: 'Web application for aggregating and analyzing data from Kimai time tracking system',
        theme_color: '#161B23',
        background_color: '#161B23',
        display: 'standalone',
        orientation: 'portrait',
        scope: './',
        start_url: './',
        icons: [
          {
            src: 'vite.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Кэширование месячных данных из IndexedDB через специальный endpoint
            urlPattern: /\/api\/monthly-data/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'monthly-data-cache',
              expiration: {
                maxEntries: 12, // 12 месяцев
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // Disable in dev to avoid issues
      },
    }),
  ],
  css: {
    modules: {
      localsConvention: 'camelCase'
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            // Mantine core
            if (id.includes('@mantine/core') || id.includes('@mantine/hooks') || 
                id.includes('@mantine/modals') || id.includes('@mantine/notifications') ||
                id.includes('@mantine/nprogress') || id.includes('@mantine/dates')) {
              return 'mantine-core'
            }
            // Charts
            if (id.includes('@mantine/charts') || id.includes('recharts')) {
              return 'charts'
            }
            // Tables
            if (id.includes('mantine-react-table') || id.includes('@tanstack/react-table') ||
                id.includes('mantine-datatable')) {
              return 'tables'
            }
            // Icons
            if (id.includes('@tabler/icons-react') || id.includes('react-icons')) {
              return 'icons'
            }
            // Motion
            if (id.includes('motion')) {
              return 'motion'
            }
            // Router
            if (id.includes('react-router')) {
              return 'router'
            }
            // Dayjs
            if (id.includes('dayjs')) {
              return 'dayjs'
            }
            // Data connector
            if (id.includes('@localzet/data-connector')) {
              return 'data-connector'
            }
            // Other vendor code
            return 'vendor'
          }
          // App chunks
          if (id.includes('/src/app/')) {
            return 'app'
          }
          if (id.includes('/src/widgets/')) {
            return 'widgets'
          }
          if (id.includes('/src/shared/')) {
            return 'shared'
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']
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

