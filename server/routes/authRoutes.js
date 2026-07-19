import express from 'express';
import { googleLogin } from '../controllers/authController.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { protect, verifiedOnly } from '../middleware/authMiddleware.js';
import { resolveApiKey } from '../middleware/apiKeyMiddleware.js';
import { requestVerification, submitVerificationCode } from '../controllers/apiController.js';

// Prompt controllers imports
import {
  requestSecureVerification,
  verifyApprovalCode,
  approveSecureVerification,
  rejectSecureVerification,
  checkSecureVerificationStatus
} from '../controllers/authApprovalController.js';

const router = express.Router();

// Apply auth rate limiter only to google login attempts
router.post('/google-login', authLimiter, googleLogin);

// 3rd-Party developer endpoints (Standard & Legacy)
router.post('/request', resolveApiKey, requestVerification);
router.post('/code', resolveApiKey, submitVerificationCode);
router.post('/request-verification', requestSecureVerification);
router.get('/status/:verificationRequestId', checkSecureVerificationStatus);

// User-facing (DDS App) endpoints
router.post('/verify-code', protect, verifiedOnly, verifyApprovalCode);
router.post('/approve-verification', protect, verifiedOnly, approveSecureVerification);
router.post('/reject-verification', protect, verifiedOnly, rejectSecureVerification);

export default router;
