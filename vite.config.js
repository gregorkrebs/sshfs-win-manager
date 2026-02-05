import { defineConfig } from 'vite'
import vue2 from '@vitejs/plugin-vue2'
import path from 'node:path'

// Vite + Vue 2.7 setup.
export default defineConfig({
  // Required for file:// loads in packaged Electron apps.
  // Without this, Vite emits absolute /assets/... URLs which blank-screen under file://.
  base: './',

  plugins: [vue2()],
  root: process.cwd(),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),

      // Electron renderer runs with Node integration in this app.
      // Force Node built-ins to resolve to node: specifiers (avoid Vite browser stubs).
      fs: 'node:fs',
      path: 'node:path',
      os: 'node:os',
      events: 'node:events',
      child_process: 'node:child_process'
    }
  },
  optimizeDeps: {
    exclude: ['electron']
  },
  css: {
    preprocessorOptions: {
      less: {
        globalVars: {
          'main-color': '#21252b',
          'primary-color': '#2486d8',
          'success-color': '#6ba368',
          'danger-color': '#e71d36'
        }
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // Electron renderer has access to Node built-ins (nodeIntegration=true).
      // Treat them as externals to avoid Vite's browser compatibility stubs.
      external: [
        'electron',
        'fs', 'path', 'os', 'events', 'child_process',
        'node:fs', 'node:path', 'node:os', 'node:events', 'node:child_process'
      ]
    }
  }
})
