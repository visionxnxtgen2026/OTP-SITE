import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Database & Services Configurations
import connectDB from './config/db.js';
import './config/firebase.js'; // Imports & initializes Firebase Admin SDK

// Real-Time WebSockets Handler
import { initSocket } from './sockets/socketHandler.js';

// API Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import apiRoutes from './routes/apiRoutes.js';
import developerAuthRoutes from './routes/developerAuthRoutes.js';
import developerRoutes from './routes/developerRoutes.js';
import Client from './models/clientModel.js';

// Central Error Handlers
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Load environmental variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Connect to MongoDB Database
connectDB().then(() => {
  // Pre-seed API OAuth Client for testing
  const seedClient = async () => {
    try {
      const clientCount = await Client.countDocuments();
      if (clientCount === 0) {
        await Client.create({
          clientId: 'client_123',
          clientSecret: 'secret_abc',
          clientName: 'TravelLoop',
          apiKey: 'api_key_travel_loop_999',
          status: 'active'
        });
        console.log('[Database] Pre-seeded developer client: TravelLoop (clientId: client_123, apiKey: api_key_travel_loop_999)');
      }
    } catch (err) {
      console.error('[Database Seeding Warning]', err.message);
    }
  };

  const seedCartify = async () => {
    try {
      const Developer = (await import('./models/developerModel.js')).default;
      const Application = (await import('./models/applicationModel.js')).default;
      const ApiKey = (await import('./models/apiKeyModel.js')).default;
      const crypto = (await import('crypto')).default;

      // ── Well-known demo secret key for Cartify integration ──────────────────
      // Format: dds_sk_<suffix>
      // Must match DDS_API_KEY in d:/demo/project/.env exactly.
      // The seed upserts (not just inserts) so restarts never silently break the demo.
      const CARTIFY_SECRET = 'dds_sk_CartifyDemoRealSecret20261234';
      const CARTIFY_PUBLIC = 'dds_pk_CartifyDemoPublic000000000000000';
      const cartifySecretSha256 = crypto
        .createHash('sha256')
        .update(CARTIFY_SECRET)
        .digest('hex');

      // Upsert Developer ─────────────────────────────────────────────────────
      let dev = await Developer.findOneAndUpdate(
        { email: 'developer@cartify.com' },
        {
          $setOnInsert: {
            firebaseUid: 'dev_firebase_cartify_uid_999',
            email: 'developer@cartify.com',
            displayName: 'Cartify Inc.',
            developerId: 'DEV_CARTIFY',
            mobileVerified: true,
            phoneNumber: '+919999999999',
            freeCreditsRemaining: 9999
          }
        },
        { upsert: true, new: true }
      );

      // Upsert Application ───────────────────────────────────────────────────
      let application = await Application.findOneAndUpdate(
        { applicationId: 'app_cartify_123' },
        {
          $setOnInsert: {
            developerId: dev._id,
            applicationId: 'app_cartify_123',
            applicationName: 'Cartify',
            description: 'Cartify Demo E-commerce Application',
            environment: 'development',
            status: 'active'
          }
        },
        { upsert: true, new: true }
      );

      // Upsert API Key — always write secretSha256 so restarts stay authoritative
      await ApiKey.findOneAndUpdate(
        { publicKey: CARTIFY_PUBLIC },
        {
          $set: {
            secretSha256: cartifySecretSha256,   // always kept in sync with CARTIFY_SECRET
            secretPreview: 'dds_sk_Cart...1234',
            status: 'active'
          },
          $setOnInsert: {
            applicationId: application._id,
            developerId: dev._id,
            keyLabel: 'Demo Integration',
            publicKey: CARTIFY_PUBLIC,
            scopes: ['auth', 'verify']
          }
        },
        { upsert: true, new: true }
      );
      console.log('[Database] Cartify demo seed verified (public key + secret hash)');
    } catch (err) {
      console.error('[Database Seeding Warning]', err.message);
    }
  };

  const seedConfigs = async () => {
    try {
      const Configuration = (await import('./models/configModel.js')).default;
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
      console.log('[Database] System configurations default seeding checked');
    } catch (err) {
      console.error('[Database Seeding Warning] config seed failed:', err.message);
    }
  };

  seedClient();
  seedCartify();
  seedConfigs();

});

// Initialize WebSocket Server
const { io, socketHelpers } = initSocket(server);

// Share socket helpers globally within the express application context
app.set('socketHelpers', socketHelpers);
app.set('io', io);

// Security & Parsing Middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Local development and standard allowed origins
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5176',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:5176'
      ];

      // Add environmental variables dynamically if specified
      if (process.env.ALLOWED_ORIGINS) {
        process.env.ALLOWED_ORIGINS.split(',').forEach(o => allowedOrigins.push(o.trim()));
      } else {
        if (process.env.CLIENT_URL) allowedOrigins.push(process.env.CLIENT_URL);
        if (process.env.DEV_PORTAL_URL) allowedOrigins.push(process.env.DEV_PORTAL_URL);
      }

      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin || allowedOrigins.includes(origin)) {
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
      'x-device-id',
      'x-app-id',
      'x-api-key',
      'x-dds-public-key',
      'x-dds-secret'
    ],
    credentials: true,
    optionsSuccessStatus: 200 // Return 200 OK for preflight OPTIONS requests
  })
);
// Mount Stripe Webhook route FIRST using raw parser (Stripe signature verification requires raw body)
import { stripeWebhook } from './controllers/billingController.js';
app.post('/api/dev/billing/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json());

// Initialize monthly invoice generation cron (at 23:50 on the last day of the month)
import cron from 'node-cron';
import Developer from './models/developerModel.js';
import billingService from './services/billingService.js';
import { Invoice } from './models/billingModel.js';

cron.schedule('50 23 28-31 * *', async () => {
  // Check if today is indeed the last day of the month
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (tomorrow.getDate() === 1) {
    console.log('[Billing Cron] Last day of month detected. Finalizing invoices...');
    try {
      const developers = await Developer.find({ status: 'active' });
      const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM

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
    // 1. Overdue invoices whose grace period has expired
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

// Run overdue check every 15 minutes
cron.schedule('*/15 * * * *', checkOverdueInvoicesJob);
// Run overdue check on server startup
checkOverdueInvoicesJob();

// Log incoming HTTP requests
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
  next();
});

import configRoutes from './routes/configRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

import { getPublicConfig } from './controllers/billingController.js';

// Mount Routes
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

// Server status API endpoint
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

// Fallback Middlewares for Route Errors
app.use(notFound);
app.use(errorHandler);

// Listen to Port with EADDRINUSE handling
const PORT = process.env.PORT || 5000;

server.on('error', async (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n======================================================`);
    console.error(`[Server Error] Port ${PORT} is already in use.`);
    
    // Check if the occupying process is a DDS Backend instance
    try {
      const axios = (await import('axios')).default;
      const healthCheck = await axios.get(`http://localhost:${PORT}/api/health`, { timeout: 1500 });
      if (healthCheck.data && healthCheck.data.status === 'healthy') {
        console.error(`[Info] DDS Backend is already running on port ${PORT}.`);
        console.error(`======================================================\n`);
        process.exit(0); // Clean, non-crashing exit
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
  console.log(`\n=========================================`);
  console.log(`[Server] Started Successfully`);
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`MongoDB: Connected`);
  console.log(`Firebase: Connected`);
  console.log(`Socket.IO: Ready`);
  console.log(`=========================================\n`);
});

// Centralized Graceful Shutdown Function
const gracefulShutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
  
  // 1. Close HTTP Server & Socket.IO
  server.close(async () => {
    console.log('[Server] HTTP server and Socket.IO connections closed.');
    
    // 2. Disconnect MongoDB
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

  // Force close after 10s if connections linger
  setTimeout(() => {
    console.error('[Server] Shutdown timeout reached. Forcing exit.');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
