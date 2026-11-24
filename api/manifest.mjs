const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')

  let appName = 'Class Bank'
  let shortName = 'ClassBank'
  let logoUrl = '/icons/icon-192.png'
  let logo512Url = '/icons/icon-512.png'

  try {
    if (SUPABASE_URL && SERVICE_ROLE_KEY) {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?select=key,value&key=in.(app_name,app_logo_url)`, {
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
        },
      })
      if (resp.ok) {
        const rows = await resp.json()
        if (Array.isArray(rows)) {
          for (const row of rows) {
            if (row.key === 'app_name' && row.value && row.value.trim()) {
              appName = row.value.trim()
              shortName = row.value.trim()
            }
            if (row.key === 'app_logo_url' && row.value && row.value.trim()) {
              logoUrl = row.value.trim()
              logo512Url = row.value.trim()
            }
          }
        }
      }
    }
  } catch (err) {
    // fallback to defaults if database is unreachable
  }

  const manifest = {
    id: '/',
    name: appName,
    short_name: shortName,
    description: `${appName} - Class Contribution Transparency System`,
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
        src: logoUrl,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: logoUrl,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: logo512Url,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: logo512Url,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }

  return res.status(200).json(manifest)
}
