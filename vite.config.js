import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      tsDecorators: true,
      plugins: [],
    }),
    tailwindcss(),
  ],
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT || 4173,
    allowedHosts: true // Saare hosts allow karega
  },
  server: {
    host: true,
    port: 5173,
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: true,
    },
    // Web Workers ke liye additional configuration
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  // ✅ Web Workers ke liye optimization
  worker: {
    format: 'es', // ES modules for workers
    plugins: () => [
      // Agar workers ke liye alag plugins chahiye to
    ],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'mediasoup-client'],
    exclude: [
      '/src/workers/*', // Workers ko exclude karo optimization se
    ],
  },
  resolve: {
    alias: {
      '@': '/src',
      // Workers ke liye easy imports
      '@workers': '/src/workers',
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
  },
  // ✅ Build configuration for workers
  build: {
    target: 'esnext', // Modern browsers support
    minify: 'esbuild',
    sourcemap: true, // Debugging ke liye
    rollupOptions: {
      output: {
        manualChunks: {
          // Recording worker ko separate chunk mein daalo
          'recording-worker': ['/src/workers/recordingWorker.js'],
          // Audio mixer worker ko separate chunk mein daalo
          'audio-mixer-worker': ['/src/workers/audioMixerWorker.js'],
          // Vendor libraries
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mediasoup: ['mediasoup-client'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
      // External dependencies
      external: [],
    },
    // Chunk size warnings hatao
    chunkSizeWarningLimit: 1000,
  },
  // ✅ Web Workers ke liye environment variables
  define: {
    'process.env': {},
    '__WORKER__': false, // Main thread ke liye
  },
  // ✅ ES Module compatibility
  esbuild: {
    target: 'es2020',
    supported: {
      'top-level-await': true, // Workers ke liye important
    },
  },
  // ✅ Public path for workers
  base: './',
  // ✅ Experimental features
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') {
        // Workers ke liye correct URLs
        return { relative: true }
      }
      return { relative: true }
    },
  },
})

