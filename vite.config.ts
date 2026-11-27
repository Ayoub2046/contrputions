import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

function apiDevServerPlugin(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next()

        const parsedUrl = new URL(req.url, 'http://localhost:5173')
        const pathname = parsedUrl.pathname

        if (!pathname.startsWith('/api/') && pathname !== '/manifest.webmanifest') {
          return next()
        }

        const enhancedRes = Object.assign(res, {
          status(code: number) {
            res.statusCode = code
            return this
          },
          json(data: any) {
            if (!res.getHeader('Content-Type')) {
              res.setHeader('Content-Type', 'application/json')
            }
            res.end(JSON.stringify(data))
            return this
          },
        })

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
          res.end()
          return
        }

        let body: any = {}
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          try {
            const chunks: any[] = []
            for await (const chunk of req) {
              chunks.push(chunk)
            }
            const rawBody = Buffer.concat(chunks).toString('utf-8')
            if (rawBody.trim()) {
              body = JSON.parse(rawBody)
            }
          } catch {
            body = {}
          }
        }
        ;(req as any).body = body
        ;(req as any).query = Object.fromEntries(parsedUrl.searchParams)

        try {
          if (pathname === '/api/manifest' || pathname === '/manifest.webmanifest') {
            // @ts-ignore
            const { default: handler } = await import('./api/manifest.mjs')
            return await handler(req, enhancedRes)
          }

          if (pathname.startsWith('/api/comments')) {
            // @ts-ignore
            const { default: handler } = await import('./api/comments.mjs')
            return await handler(req, enhancedRes)
          }

          if (pathname.startsWith('/api/chat')) {
            // @ts-ignore
            const { default: handler } = await import('./api/chat.mjs')
            return await handler(req, enhancedRes)
          }

          if (pathname.startsWith('/api/users')) {
            // @ts-ignore
            const { default: handler } = await import('./api/users.mjs')
            return await handler(req, enhancedRes)
          }

          if (pathname.startsWith('/api/push')) {
            // @ts-ignore
            const { default: handler } = await import('./api/push.mjs')
            return await handler(req, enhancedRes)
          }

          enhancedRes.status(404).json({ error: 'API route not found' })
        } catch (err: any) {
          console.error(`[api-dev] Error handling ${pathname}:`, err)
          if (!res.headersSent) {
            enhancedRes.status(500).json({ error: err.message || 'Internal server error' })
          }
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [
      apiDevServerPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      includeAssets: ['icons/*.png'],
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        importScripts: ['/custom-sw.js'],
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
      manifest: {
        id: '/',
        name: 'Class Bank',
        short_name: 'ClassBank',
        description: 'Class Contribution Transparency System',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#F4F6FA',
        background_color: '#F4F6FA',
        prefer_related_applications: false,
        categories: ['education', 'finance'],
        display_override: ['window-controls-overlay', 'minimal-ui'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
}
})
