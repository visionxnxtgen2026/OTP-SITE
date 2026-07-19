import express from 'express';
import { getPublicConfig } from '../controllers/billingController.js';

const router = express.Router();

// GET /api/config/public & GET /api/config/public/
router.get('/public', getPublicConfig);
router.get('/', getPublicConfig);

export default router;
