/**
 * DDS External API Routes (Base: /api/v1/auth)
 * Enterprise 12-Step Security Validated Endpoints for DDS SDK & User App
 */

import express from 'express';
import { resolveApiKey } from '../middleware/apiKeyMiddleware.js';
import {
  requestVerification,
  verifyAuthentication,
  checkVerificationStatus,
  cancelAuthRequest,
  getAppUsage,
  getHealthStatus,
  approveAuthRequest,
  rejectAuthRequest
} from '../controllers/apiController.js';

const router = express.Router();

// Public Health Check
router.get('/health', getHealthStatus);

// SDK Authenticated Endpoints (Enforces ordered 12-step security pipeline)
router.post('/request', resolveApiKey, requestVerification);
router.post('/verify', resolveApiKey, verifyAuthentication);
router.get('/status/:requestId', resolveApiKey, checkVerificationStatus);
router.post('/cancel', resolveApiKey, cancelAuthRequest);
router.get('/usage', resolveApiKey, getAppUsage);

// User App Mobile Approval / Rejection Endpoints
router.post('/approve', approveAuthRequest);
router.post('/reject', rejectAuthRequest);

export default router;
