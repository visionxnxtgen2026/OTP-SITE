import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import Application from '../models/applicationModel.js';
import ApiKey from '../models/apiKeyModel.js';
import ApiRequestLog from '../models/apiRequestLogModel.js';
import {
  generateCredentialKeyPair,
  hashSecretKey,
  buildSecretPreview,
  generateUniqueApplicationId,
  generateUniqueKeyPair
} from '../utils/credentialGenerator.js';

// ─── Cost constants ────────────────────────────────────────────────────────────
const COST_PER_REQUEST_PAISE = 15; // ₹0.15 = 15 paise

// ─── Applications ─────────────────────────────────────────────────────────────

/**
 * GET /api/dev/apps
 * List all applications belonging to the authenticated developer.
 */
export const getApplications = async (req, res, next) => {
  try {
    const apps = await Application.find({ developerId: req.developer._id })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, applications: apps });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/dev/apps
 * Create a new application.
 */
export const createApplication = async (req, res, next) => {
  try {
    const { applicationName, environment, allowedDomains } = req.body;

    if (!applicationName?.trim()) {
      return res.status(400).json({ success: false, message: 'Application name is required.' });
    }

    let parsedDomains = [];
    if (Array.isArray(allowedDomains)) {
      parsedDomains = allowedDomains.map(d => String(d).trim()).filter(Boolean);
    } else if (typeof allowedDomains === 'string') {
      parsedDomains = allowedDomains.split(',').map(d => d.trim()).filter(Boolean);
    }

    const uniqueAppId = await generateUniqueApplicationId(Application, 28);

    const app = await Application.create({
      developerId: req.developer._id,
      applicationId: uniqueAppId,
      applicationName: applicationName.trim(),
      environment: environment || 'production',
      allowedDomains: parsedDomains
    });

    // Automatically generate initial primary API Key pair for the app
    const keyPair = await generateUniqueKeyPair(ApiKey, 56, 80);

    const key = await ApiKey.create({
      applicationId: app._id,
      developerId: req.developer._id,
      keyLabel: 'Primary Key',
      publicKey: keyPair.publicKey,
      secretSha256: keyPair.secretHash,
      secretPreview: keyPair.secretPreview,
      scopes: ['auth', 'verify'],
      status: 'active'
    });

    res.status(201).json({
      success: true,
      application: app,
      credentials: {
        applicationId: app.applicationId,
        publicKey: keyPair.publicKey,
        rawSecret: keyPair.rawSecret,
        secretPreview: keyPair.secretPreview,
        keyId: key._id
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dev/apps/:appId
 * Get a single application by its applicationId string.
 */
export const getApplication = async (req, res, next) => {
  try {
    const app = await Application.findOne({
      applicationId: req.params.appId,
      developerId: req.developer._id
    });

    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    res.status(200).json({ success: true, application: app });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/dev/apps/:appId
 * Update application name, description, environment, status, or verificationSettings.
 */
export const updateApplication = async (req, res, next) => {
  try {
    const { applicationName, description, environment, status, verificationSettings, allowedDomains, logoUrl } = req.body;

    // Build a flat $set object — only include fields that were actually sent
    const updates = {};
    if (applicationName)              updates.applicationName = applicationName.trim();
    if (description !== undefined)    updates.description = description.trim();
    if (environment)                  updates.environment = environment;
    if (status)                       updates.status = status;
    if (logoUrl !== undefined)        updates.logoUrl = logoUrl;
    if (allowedDomains !== undefined) updates.allowedDomains = allowedDomains;

    // Merge verificationSettings fields individually so partial updates work
    if (verificationSettings && typeof verificationSettings === 'object') {
      const vs = verificationSettings;
      if (vs.codeLength !== undefined)           updates['verificationSettings.codeLength'] = vs.codeLength;
      if (vs.expiry !== undefined)               updates['verificationSettings.expiry'] = vs.expiry;
      if (vs.maxAttempts !== undefined)          updates['verificationSettings.maxAttempts'] = vs.maxAttempts;
      if (vs.duplicateProtection !== undefined)  updates['verificationSettings.duplicateProtection'] = vs.duplicateProtection;
      if (vs.duplicateRequestDelay !== undefined)updates['verificationSettings.duplicateRequestDelay'] = vs.duplicateRequestDelay;
      if (vs.rateLimit !== undefined)            updates['verificationSettings.rateLimit'] = vs.rateLimit;
      if (vs.requestTimeout !== undefined)       updates['verificationSettings.requestTimeout'] = vs.requestTimeout;
      if (vs.webhookUrl !== undefined)           updates['verificationSettings.webhookUrl'] = vs.webhookUrl;
    }

    const app = await Application.findOneAndUpdate(
      { applicationId: req.params.appId, developerId: req.developer._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    res.status(200).json({ success: true, application: app });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/dev/apps/:appId/settings
 * Dedicated endpoint to update only the verificationSettings for an application.
 * Keeps concerns separated from general app metadata updates.
 */
export const updateVerificationSettings = async (req, res, next) => {
  try {
    const vs = req.body;
    if (!vs || typeof vs !== 'object') {
      return res.status(400).json({ success: false, message: 'verificationSettings object is required.' });
    }

    const updates = {};
    if (vs.codeLength !== undefined)           updates['verificationSettings.codeLength'] = vs.codeLength;
    if (vs.expiry !== undefined)               updates['verificationSettings.expiry'] = vs.expiry;
    if (vs.maxAttempts !== undefined)          updates['verificationSettings.maxAttempts'] = vs.maxAttempts;
    if (vs.duplicateProtection !== undefined)  updates['verificationSettings.duplicateProtection'] = vs.duplicateProtection;
    if (vs.duplicateRequestDelay !== undefined)updates['verificationSettings.duplicateRequestDelay'] = vs.duplicateRequestDelay;
    if (vs.rateLimit !== undefined)            updates['verificationSettings.rateLimit'] = vs.rateLimit;
    if (vs.requestTimeout !== undefined)       updates['verificationSettings.requestTimeout'] = vs.requestTimeout;
    if (vs.webhookUrl !== undefined)           updates['verificationSettings.webhookUrl'] = vs.webhookUrl;

    const app = await Application.findOneAndUpdate(
      { applicationId: req.params.appId, developerId: req.developer._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Verification settings updated.',
      verificationSettings: app.verificationSettings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/dev/apps/:appId
 * Delete application and all associated API keys and logs.
 */
export const deleteApplication = async (req, res, next) => {
  try {
    const appIdStr = req.params.appId || req.params.applicationId;
    const app = await Application.findOne({
      applicationId: appIdStr,
      developerId: req.developer._id
    });

    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const VerificationRequest = (await import('../models/requestModel.js')).default;

    // Cascade delete: Application, API Keys, Configuration, Analytics, and Auth Request history
    await ApiKey.deleteMany({ applicationId: app._id });
    await ApiRequestLog.deleteMany({ applicationId: app._id });
    await VerificationRequest.deleteMany({ clientId: app.applicationId });
    await app.deleteOne();

    res.status(200).json({ success: true, message: 'Application deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─── API Keys ─────────────────────────────────────────────────────────────────

/**
 * GET /api/dev/apps/:appId/keys
 * List all API keys for an application (without secretHash).
 */
export const getApiKeys = async (req, res, next) => {
  try {
    const app = await Application.findOne({
      applicationId: req.params.appId,
      developerId: req.developer._id
    });

    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const keys = await ApiKey.find({ applicationId: app._id }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, keys });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/dev/apps/:appId/keys
 * Generate a new API key pair.
 * ⚠️ The raw secret is returned ONCE in this response and never stored in plain.
 */
export const generateApiKey = async (req, res, next) => {
  try {
    const { keyLabel, scopes } = req.body;

    const app = await Application.findOne({
      applicationId: req.params.appId,
      developerId: req.developer._id
    });

    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // Generate cryptographically secure dds_sk_ / dds_pk_ key pair
    const keyPair = await generateUniqueKeyPair(ApiKey, 56, 80);

    const apiKey = await ApiKey.create({
      applicationId: app._id,
      developerId: req.developer._id,
      keyLabel: keyLabel?.trim() || 'Default',
      publicKey: keyPair.publicKey,
      secretSha256: keyPair.secretHash,   // O(1) lookup — SHA-256 of raw secret
      secretPreview: keyPair.secretPreview,
      scopes: scopes || ['auth', 'verify']
    });

    // ⚠️ Return raw secret ONCE — it is never stored and can never be recovered
    res.status(201).json({
      success: true,
      message: 'API key generated. Copy your secret key now — it will never be shown again.',
      key: {
        id: apiKey._id,
        keyLabel: apiKey.keyLabel,
        publicKey: apiKey.publicKey,
        rawSecret: keyPair.rawSecret,              // ⚠️ ONE-TIME REVEAL — copy immediately
        secretPreview: apiKey.secretPreview,
        scopes: apiKey.scopes,
        status: apiKey.status,
        createdAt: apiKey.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/dev/apps/:appId/keys/:keyId
 * Update API key label, status, or scopes.
 */
export const updateApiKey = async (req, res, next) => {
  try {
    const { keyLabel, status, scopes } = req.body;

    const key = await ApiKey.findOneAndUpdate(
      { _id: req.params.keyId, developerId: req.developer._id },
      {
        ...(keyLabel && { keyLabel: keyLabel.trim() }),
        ...(status && { status }),
        ...(scopes && { scopes })
      },
      { new: true, runValidators: true }
    );

    if (!key) {
      return res.status(404).json({ success: false, message: 'API key not found.' });
    }

    res.status(200).json({ success: true, key });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/dev/apps/:appId/keys/:keyId
 * Permanently revoke and delete an API key.
 */
export const deleteApiKey = async (req, res, next) => {
  try {
    const key = await ApiKey.findOneAndDelete({
      _id: req.params.keyId,
      developerId: req.developer._id
    });

    if (!key) {
      return res.status(404).json({ success: false, message: 'API key not found.' });
    }

    res.status(200).json({ success: true, message: 'API key permanently revoked.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/dev/apps/:appId/keys/:keyId/rotate
 * Rotate (regenerate) the secret for an existing key.
 * The old secret is immediately invalidated.
 * ⚠️ New raw secret is returned ONCE.
 */
export const rotateApiKey = async (req, res, next) => {
  try {
    const key = await ApiKey.findOne({
      _id: req.params.keyId,
      developerId: req.developer._id
    });

    if (!key) {
      return res.status(404).json({ success: false, message: 'API key not found.' });
    }

    // Generate fresh dds_sk_ key and update SHA-256
    const { rawSecret } = generateCredentialKeyPair();
    const secretSha256 = hashSecretKey(rawSecret);
    const secretPreview = buildSecretPreview(rawSecret);

    key.secretSha256 = secretSha256;
    key.secretHash = undefined;  // clear legacy bcrypt hash if present
    key.secretPreview = secretPreview;
    await key.save();

    res.status(200).json({
      success: true,
      message: 'Secret rotated. Copy your new secret now — it will never be shown again.',
      key: {
        id: key._id,
        keyLabel: key.keyLabel,
        publicKey: key.publicKey,
        rawSecret,  // ⚠️ ONE-TIME REVEAL
        secretPreview,
        status: key.status
      }
    });
  } catch (error) {
    next(error);
  }
};
