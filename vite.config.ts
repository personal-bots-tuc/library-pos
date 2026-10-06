import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: isProduction
        ? undefined
        : {
            '/api': {
              target: 'http://localhost:3000',
              changeOrigin: true,
              rewrite: path => path.replace(/^\/api/, ''),
            },
          },
    },
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || '/api'),
      'import.meta.env.VITE_APP_NAME': JSON.stringify(
        process.env.VITE_APP_NAME || 'Library System POS'
      ),
      'import.meta.env.VITE_POS_BASE_URL': JSON.stringify(''),
    },
  };
});
