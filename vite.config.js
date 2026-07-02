import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const buildVersion = String(Date.now())
writeFileSync(
  fileURLToPath(new URL('./public/version.json', import.meta.url)),
  JSON.stringify({ version: buildVersion }),
)

export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(buildVersion),
  },
})