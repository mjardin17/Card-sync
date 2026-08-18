import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import {
  handleIdentifyCard,
  handleGenerateMultiPlatformListings,
  handleDispatchPlatform,
  handleTestConnection,
} from './src/services/apiHandler';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON payload parser for base64 image scans
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // Collectible Card AI Appraisal & Identification API
  app.post('/api/identify-card', handleIdentifyCard);

  // Multi-Platform Listing Generator API
  app.post('/api/generate-listings', handleGenerateMultiPlatformListings);

  // Live Webhook & Dispatch Engine (Discord, Slack, Telegram, Custom Webhooks, Zapier)
  app.post('/api/dispatch-platform', handleDispatchPlatform);

  // Connection & Token Verification Endpoint
  app.post('/api/test-connection', handleTestConnection);

  // Vite Middleware & SPA Handling
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
