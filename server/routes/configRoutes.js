import express from 'express';
import { getPublicConfig } from '../controllers/billingController.js';
import { getIpCountry } from '../controllers/ipCountryController.js';

const router = express.Router();

// GET /api/config/public & GET /api/config/public/
router.get('/public', getPublicConfig);
router.get('/', getPublicConfig);
router.get('/ip-country', getIpCountry);

export default router;
