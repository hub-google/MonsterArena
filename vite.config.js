import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Only release deployments to Cloudflare use the hostname root.
// GitHub Pages remains under the repository subpath.
const base = process.env.VITE_DEPLOY_TARGET === 'cloudflare'
  ? '/'
  : process.env.VITE_PREVIEW === 'true'
    ? '/monster-arena-web/preview/'
    : '/monster-arena-web/'

export default defineConfig({
  plugins: [react()],
  base,
})
