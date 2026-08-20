import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import {
  handleIdentifyCard,
  handleAppraiseComps,
  handleGenerateListings,
  handleDispatchPlatform,
} from './src/services/apiHandler';
import {
  handleGetVaultStatus,
  handleSaveCredentials,
  handleDisconnectPlatform,
  handleVerifyPlatform,
  handleVerifyAll,
} from './src/services/tokenVaultService';

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
      publishingMode: process.env.PUBLISHING_MODE || 'DRY_RUN',
      timestamp: new Date().toISOString(),
    });
  });

  // Collectible Card AI Appraisal & Identification API
  app.post('/api/identify-card', handleIdentifyCard);
  app.post('/api/appraise-comps', handleAppraiseComps);

  // Multi-Platform Listing Generator API
  app.post('/api/generate-listings', handleGenerateListings);

  // Live Webhook & Dispatch Engine
  app.post('/api/dispatch-platform', handleDispatchPlatform);

  // Server-Side Token Vault & Account Connection Management
  app.get('/api/vault/status', handleGetVaultStatus);
  app.post('/api/vault/save-credentials', handleSaveCredentials);
  app.post('/api/vault/disconnect', handleDisconnectPlatform);
  app.post('/api/vault/verify', handleVerifyPlatform);
  app.post('/api/vault/verify-all', handleVerifyAll);

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
