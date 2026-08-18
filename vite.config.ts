import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import express from 'express';
import {
  handleIdentifyCard,
  handleGenerateMultiPlatformListings,
  handleDispatchPlatform,
  handleTestConnection,
} from './src/services/apiHandler';

function apiPlugin(): Plugin {
  return {
    name: 'omnicard-api-plugin',
    configureServer(server) {
      const app = express();
      app.use(express.json({ limit: '50mb' }));
      app.use(express.urlencoded({ extended: true, limit: '50mb' }));

      app.post('/api/identify-card', (req, res) => {
        handleIdentifyCard(req, res);
      });

      app.post('/api/generate-listings', (req, res) => {
        handleGenerateMultiPlatformListings(req, res);
      });

      app.post('/api/dispatch-platform', (req, res) => {
        handleDispatchPlatform(req, res);
      });

      app.post('/api/test-connection', (req, res) => {
        handleTestConnection(req, res);
      });

      app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', time: new Date().toISOString() });
      });

      server.middlewares.use(app);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
