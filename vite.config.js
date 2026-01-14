import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // SWC options agar issue ho
      tsDecorators: true,
      plugins: [],
    }),
    tailwindcss(),
  ],
  server: {
    host: true, // Mobile access
    port: 5173,
    hmr: {
      // Hot Module Replacement ke liye
      overlay: true,
    },
    watch: {
      // File changes detect karne ke liye
      usePolling: true,
    },
  },
  // Optimizations
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: [],
  },
  resolve: {
    alias: {
      // Agar aapke project mein aliases use ho rahe hain
      '@': '/src',
    },
  },
})




// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react-swc'
// import tailwindcss from '@tailwindcss/vite'


// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [
//     react(),
//     tailwindcss(),
//   ],
// })