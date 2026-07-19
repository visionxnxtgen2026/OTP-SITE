/**
 * DDS External API Routes — v2
 *
 * Base: /api/v1/auth
 *
 * All routes are authenticated via resolveApiKey middleware.
 * Developers only need their dds_sk_xxx secret key.
 * No applicationId or developerId required in request bodies.
 */

import express from 'express';
import { resolveApiKey } from '../middleware/apiKeyMiddleware.js';
import {
  requestVerification,
  submitVerificationCode,
  checkVerificationStatus,
  approveAuthRequest,
  rejectAuthRequest
} from '../controllers/apiController.js';

const router = express.Router();

// Apply key resolution middleware to external API routes that use API key
router.post('/request', resolveApiKey, requestVerification);
router.post('/code', resolveApiKey, submitVerificationCode);
router.get('/status/:requestId', resolveApiKey, checkVerificationStatus);

// User app / approval endpoints (can be called with requestId)
router.post('/approve', approveAuthRequest);
router.post('/reject', rejectAuthRequest);

export default router;
