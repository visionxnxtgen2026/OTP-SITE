// ── 1. Load Dotenv & Validate Environment ──────────────────────────────────────
import validateEnv from './config/env.js';
validateEnv();

// ── 2. Initialize Firebase Admin SDK ──────────────────────────────────────────
import './config/firebase.js';

// ── Imports for Database & Core Services ───────────────────────────────────────
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cron from 'node-cron';
import crypto from 'crypto';

import connectDB from './config/db.js';

// Real-Time WebSockets Handler
import { initSocket } from './sockets/socketHandler.js';

// Models
import Client from './models/clientModel.js';
import Developer from './models/developerModel.js';
import Application from './models/applicationModel.js';
import ApiKey from './models/apiKeyModel.js';
import Configuration from './models/configModel.js';
import { Invoice } from './models/billingModel.js';
import billingService from './services/billingService.js';

// Controllers & Routes
import { stripeWebhook, getPublicConfig } from './controllers/billingController.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import apiRoutes from './routes/apiRoutes.js';
import developerAuthRoutes from './routes/developerAuthRoutes.js';
import developerRoutes from './routes/developerRoutes.js';
import configRoutes from './routes/configRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Central Error Handlers
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// ── 3. Connect MongoDB Database ───────────────────────────────────────────────
await connectDB();

// Seeding helper functions
const seedDatabase = async () => {
  try {
    // A. Seed OAuth Client
    const clientCount = await Client.countDocuments();
    if (clientCount === 0) {
      await Client.create({
        clientId: 'client_123',
        clientSecret: 'secret_abc',
        clientName: 'TravelLoop',
        apiKey: 'api_key_travel_loop_999',
        status: 'active'
      });
      console.log('[Database] Pre-seeded developer client: TravelLoop');
    }

    // System Configurations
    const defaults = [
      { key: 'authRequestPricePaise', value: 50, description: 'Authentication Request Price (Paise)' },
      { key: 'dailyFreeRequests', value: 100, description: 'Daily Free Requests' },
      { key: 'monthlyGracePeriodDays', value: 7, description: 'Monthly Grace Period (Days)' },
      { key: 'maxVerificationAttempts', value: 3, description: 'Max Verification Attempts' },
      { key: 'verificationLockTimeMins', value: 30, description: 'Verification Lock Time (Minutes)' },
      { key: 'accountDeleteOtpAttempts', value: 3, description: 'Account Delete OTP Attempts' },
      { key: 'deleteLockTimeHours', value: 24, description: 'Delete Lock Time (Hours)' }
    ];

    for (const d of defaults) {
      await Configuration.findOneAndUpdate(
        { key: d.key },
        { $setOnInsert: d },
        { upsert: true }
      );
    }

    console.log('[Database] Seeding verification completed successfully.');
  } catch (err) {
    console.error('[Database Seeding Warning]', err.message);
  }
};

await seedDatabase();

// ── 4. Initialize Express Application ─────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── 5. Register Middleware ────────────────────────────────────────────────────
// Initialize WebSocket Server
const { io, socketHelpers } = initSocket(server);
app.set('socketHelpers', socketHelpers);
app.set('io', io);

// Security Headers & CORS (Allows Google OAuth popup windows to communicate safely)
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5176',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:5176',
        'https://otp-site-black.vercel.app',
        'https://visionx2026.duckdns.org'
      ];

      if (process.env.ALLOWED_ORIGINS) {
        process.env.ALLOWED_ORIGINS.split(',').forEach(o => allowedOrigins.push(o.trim()));
      } else {
        if (process.env.CLIENT_URL) allowedOrigins.push(process.env.CLIENT_URL);
        if (process.env.DEV_PORTAL_URL) allowedOrigins.push(process.env.DEV_PORTAL_URL);
      }

      if (!origin) return callback(null, true);

      const isAllowedExact = allowedOrigins.includes(origin);
      const isAllowedVercelPreview = /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin);

      if (isAllowedExact || isAllowedVercelPreview) {
        callback(null, true);
      } else {
        console.warn(`[CORS Blocked] Request from origin: ${origin}`);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Accept',
      'Origin',
      'X-Requested-With',
      'x-device-id',
      'x-app-id',
      'x-api-key',
      'x-dds-public-key',
      'x-dds-secret'
    ],
    credentials: true,
    optionsSuccessStatus: 200
  })
);

// Mount Stripe Webhook route FIRST using raw parser
app.post('/api/dev/billing/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Body Parser for all other JSON routes
app.use(express.json());

// Request Logging Middleware
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
  next();
});

// Automated Cron Jobs
cron.schedule('50 23 28-31 * *', async () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (tomorrow.getDate() === 1) {
    console.log('[Billing Cron] Last day of month detected. Finalizing invoices...');
    try {
      const developers = await Developer.find({ status: 'active' });
      const currentMonth = today.toISOString().slice(0, 7);
      for (const dev of developers) {
        await billingService.generateMonthEndInvoice(dev._id, currentMonth);
      }
      console.log('[Billing Cron] Invoices successfully generated for the month.');
    } catch (err) {
      console.error('[Billing Cron] Critical error during monthly invoicing:', err.message);
    }
  }
});

const checkOverdueInvoicesJob = async () => {
  console.log('[Billing Cron] Checking for overdue invoices and expired grace periods...');
  try {
    const now = new Date();
    const overdueInvoices = await Invoice.find({
      status: 'payment_pending',
      gracePeriodExpiresAt: { $lt: now }
    });

    for (const inv of overdueInvoices) {
      await billingService.markInvoiceOverdue(inv.invoiceId);
    }
  } catch (err) {
    console.error('[Billing Cron] Error checking overdue invoices:', err.message);
  }
};

cron.schedule('*/15 * * * *', checkOverdueInvoicesJob);
checkOverdueInvoicesJob();

// ── 6. Register Routes ────────────────────────────────────────────────────────
app.use('/api/config', configRoutes);
app.get('/api/config/public', getPublicConfig);
app.get('/config/public', getPublicConfig);
app.get('/api/developer/billing-config', getPublicConfig);
app.get('/api/dev/billing-config', getPublicConfig);

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/v1/auth', apiRoutes);
app.use('/api/dev/auth', developerAuthRoutes);
app.use('/api/dev', developerRoutes);
app.use('/api/admin', adminRoutes);

// Health check API endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development',
    uptime: `${Math.floor(process.uptime())}s`,
    onlineUsersCount: socketHelpers.getOnlineUserIds().length
  });
});

// Default Root Route
app.get('/', (req, res) => {
  res.status(200).send('DDS Authentication Module API is running.');
});

// Fallback Middleware for Unmatched Routes & Global Errors
app.use(notFound);
app.use(errorHandler);

// ── 7. Start Server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.on('error', async (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n======================================================`);
    console.error(`[Server Error] Port ${PORT} is already in use.`);
    try {
      const axios = (await import('axios')).default;
      const healthCheck = await axios.get(`http://localhost:${PORT}/api/health`, { timeout: 1500 });
      if (healthCheck.data && healthCheck.data.status === 'healthy') {
        console.error(`[Info] DDS Backend is already running on port ${PORT}.`);
        console.error(`======================================================\n`);
        process.exit(0);
      }
    } catch (err) {
      // Not a DDS instance or not responding to /api/health
    }
    console.error(`[Error] Port ${PORT} belongs to another process or application.`);
    console.error(`Please free port ${PORT} or change your PORT env variable.`);
    console.error(`======================================================\n`);
    process.exit(1);
  } else {
    console.error('[Server Error] Critical exception occurred:', error.message);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`[Server] Started Successfully`);
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`MongoDB: Connected`);
  console.log(`Firebase: Initialized`);
  console.log(`Socket.IO: Ready`);
  console.log(`=========================================\n`);
});

// Centralized Graceful Shutdown Function
const gracefulShutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('[Server] HTTP server and Socket.IO connections closed.');
    try {
      const mongoose = (await import('mongoose')).default;
      await mongoose.connection.close();
      console.log('[MongoDB] Connection closed successfully.');
    } catch (err) {
      console.error('[MongoDB] Error during close:', err.message);
    }
    console.log('[Server] Graceful shutdown complete. Exiting.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[Server] Shutdown timeout reached. Forcing exit.');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
