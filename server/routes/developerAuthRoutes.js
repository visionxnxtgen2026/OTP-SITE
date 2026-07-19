import express from 'express';
import { protectDeveloper } from '../middleware/developerAuthMiddleware.js';
import {
  developerGoogleLogin,
  developerVerifyPhone,
  getDeveloperProfile,
  updateDeveloperProfile,
  developerLogout,
  refreshToken
} from '../controllers/developerAuthController.js';

const router = express.Router();

// ─── Public Authentication Routes ─────────────────────────────────────────────
router.post('/google-login', developerGoogleLogin);
router.post('/logout', developerLogout);
router.post('/refresh', refreshToken);

// ─── Protected Developer Authentication Routes ───────────────────────────────
router.get('/profile', protectDeveloper, getDeveloperProfile);
router.get('/me', protectDeveloper, getDeveloperProfile);
router.patch('/profile', protectDeveloper, updateDeveloperProfile);
router.patch('/me', protectDeveloper, updateDeveloperProfile);
router.post('/verify-phone', protectDeveloper, developerVerifyPhone);

export default router;
