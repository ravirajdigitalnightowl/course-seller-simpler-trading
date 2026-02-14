import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve';
  const isProd = mode === 'production';
  
  return {
    plugins: [
      react({
        tsDecorators: true,
        plugins: [],
      }),
      tailwindcss(),
    ],
    
    // 🔴 IMPORTANT: Production ke liye base URL
    base: isProd ? '/' : './',
    
    // ========== PREVIEW CONFIG ==========
    preview: {
      host: '0.0.0.0',
      port: process.env.PORT || 4173,
      allowedHosts: true,
      // Production preview ke liye headers
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'X-Content-Type-Options': 'nosniff',
      },
    },
    
    // ========== SERVER CONFIG (Development) ==========
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      hmr: {
        overlay: true,
      },
      watch: {
        usePolling: true,
      },
      // Web Workers ke liye headers
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
      // 🔴 Development proxy (local API calls)
      proxy: {
        '/apis': {
          target: 'https://simplertradinglive.shop',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/apis/, '/apis'),
        },
        '/socket.io': {
          target: 'https://simplertradinglive.shop',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/mediasoup': {
          target: 'https://simplertradinglive.shop',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/yjs': {
          target: 'https://simplertradinglive.shop',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
    
    // ========== WEB WORKERS CONFIG ==========
    worker: {
      format: 'es',
      plugins: () => [],
      rollupOptions: {
        output: {
          entryFileNames: 'assets/workers/[name]-[hash].js',
          chunkFileNames: 'assets/workers/[name]-[hash].js',
        },
      },
    },
    
    // ========== DEPENDENCY OPTIMIZATION ==========
    optimizeDeps: {
      include: [
        'react', 
        'react-dom', 
        'react-router-dom',
        'mediasoup-client',
        'socket.io-client',
        'yjs',
        'y-websocket',
        'y-indexeddb'
      ],
      exclude: [
        '/src/workers/*',
      ],
      esbuildOptions: {
        target: 'es2020',
        supported: {
          'top-level-await': true,
        },
      },
    },
    
    // ========== RESOLVE ALIASES ==========
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@contexts': path.resolve(__dirname, './src/contexts'),
        '@workers': path.resolve(__dirname, './src/workers'),
        '@utils': path.resolve(__dirname, './src/utils'),
      },
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    },
    
    // ========== BUILD CONFIGURATION ==========
    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsDir: 'assets',
      minify: 'esbuild',
      sourcemap: isDev, // Sourcemap sirf development mein
      cssCodeSplit: true,
      
      rollupOptions: {
        output: {
          // ✅ Manual chunks for better caching
          manualChunks: (id) => {
            // Vendor chunks
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'vendor-react';
              }
              if (id.includes('mediasoup-client')) {
                return 'mediasoup';
              }
              if (id.includes('yjs') || id.includes('y-websocket') || id.includes('y-indexeddb')) {
                return 'yjs';
              }
              if (id.includes('socket.io-client')) {
                return 'socketio';
              }
              return 'vendor';
            }
            
            // Worker chunks
            if (id.includes('/src/workers/')) {
              if (id.includes('recordingWorker')) {
                return 'recording-worker';
              }
              if (id.includes('audioMixerWorker')) {
                return 'audio-mixer-worker';
              }
            }
          },
          
          // File naming patterns with hashes
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            
            if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(assetInfo.name)) {
              return `assets/images/[name]-[hash].[ext]`;
            }
            if (/\.(css)$/.test(assetInfo.name)) {
              return `assets/css/[name]-[hash].[ext]`;
            }
            if (/\.(woff2?|ttf|eot)$/.test(assetInfo.name)) {
              return `assets/fonts/[name]-[hash].[ext]`;
            }
            return `assets/[name]-[hash].[ext]`;
          },
        },
        
        // External dependencies agar koi ho
        external: [],
      },
      
      // Chunk size warnings
      chunkSizeWarningLimit: 1000,
      
      // Report compressed sizes
      reportCompressedSize: true,
    },
    
    // ========== ENVIRONMENT VARIABLES ==========
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      '__DEV__': isDev,
      '__PROD__': isProd,
    },
    
    // ========== ESBUILD OPTIONS ==========
    esbuild: {
      target: 'es2020',
      supported: {
        'top-level-await': true,
      },
      // JSX handling
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
    },
    
    // ========== EXPERIMENTAL FEATURES ==========
    experimental: {
      renderBuiltUrl(filename, { hostType }) {
        if (hostType === 'js') {
          return { relative: true };
        }
        return { relative: true };
      },
    },
    
    // ========== CSS OPTIONS ==========
    css: {
      devSourcemap: true,
      postcss: {
        plugins: [],
      },
    },
  };
});