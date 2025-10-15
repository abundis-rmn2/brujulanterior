import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isDev = command === 'serve';

  // Solo intenta cargar HTTPS si estamos en modo desarrollo
  const httpsConfig = isDev
    ? (() => {
        const keyPath = path.resolve(__dirname, 'certs/localhost-key.pem');
        const certPath = path.resolve(__dirname, 'certs/localhost.pem');

        if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
          return {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
          };
        } else {
          console.warn(
            '[vite] ⚠️ Certificados HTTPS no encontrados, iniciando servidor en HTTP.'
          );
          return undefined;
        }
      })()
    : undefined;

  return {
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler']],
        },
      }),
    ],
    server: {
      https: httpsConfig,
      host: 'localhost',
      port: 5173,
    },
    build: {
      outDir: 'dist',
    },
  };
});
