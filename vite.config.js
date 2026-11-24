import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// Only release deployments to Cloudflare use the hostname root.
// GitHub Pages remains under the repository subpath.
const base = process.env.VITE_DEPLOY_TARGET === 'cloudflare'
  ? '/'
  : process.env.VITE_PREVIEW === 'true'
    ? '/MonsterArena/preview/'
    : '/MonsterArena/'

export default defineConfig({
  plugins: [react()],
  css: { postcss: fileURLToPath(new URL('./config/', import.meta.url)) },
  base,
})
