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
  // ✅ Base ko '/' kiya taaki deep links (livesession/id/code) par refresh karne par error na aaye
  base: '/', 
  
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT || 4173,
    allowedHosts: true
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
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  worker: {
    format: 'es',
    plugins: () => [],
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'mediasoup-client', 'socket.io-client'],
    exclude: [],
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@workers': path.resolve(__dirname, './src/workers'),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
  },

  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'recording-worker': ['./src/workers/recordingWorker.js'],
          'audio-mixer-worker': ['./src/workers/audioMixerWorker.js'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mediasoup: ['mediasoup-client'],
        },
        // Standard naming for better compatibility
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1000,
  },

  define: {
    'process.env': {},
    'global': 'window', // Mediasoup/Socket compatibility ke liye
  },

  esbuild: {
    target: 'es2020',
    supported: {
      'top-level-await': true,
    },
  },
  
  // ❌ experimental renderBuiltUrl ko hata diya gaya hai kyunki wo paths ko corrupt kar raha tha
})