import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'next/navigation': path.resolve(__dirname, './src/shims/next-navigation.ts'),
        'next/link': path.resolve(__dirname, './src/shims/next-link.tsx'),
        'next/dynamic': path.resolve(__dirname, './src/shims/next-dynamic.tsx'),
        'next/server': path.resolve(__dirname, './src/shims/next-server.ts'),
        'next/cache': path.resolve(__dirname, './src/shims/next-cache.ts'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'lucide-react',
        'clsx',
        'tailwind-merge',
        'motion',
      ],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
