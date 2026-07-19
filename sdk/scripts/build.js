const fs   = require('fs');
const path = require('path');

/**
 * Production Build Script for @dds/server
 * Generates dist/index.js (CommonJS), dist/index.mjs (ESM), and dist/index.d.ts (TypeScript declarations)
 */
function build() {
  console.log('🚀 Building @dds/server...');

  const rootDir = path.resolve(__dirname, '..');
  const srcDir  = path.join(rootDir, 'src');
  const distDir = path.join(rootDir, 'dist');

  // 1. Clean dist directory
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  // 2. Source files in dependency order
  const files = [
    'Errors.js',
    'Types.js',
    'Utils.js',
    'Validators.js',
    'CodeGenerator.js',
    'API.js',
    'AuthManager.js',
    'DDSClient.js',
    'index.js'
  ];

  // Write individual modules into dist/
  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    if (fs.existsSync(srcPath)) {
      const content = fs.readFileSync(srcPath, 'utf8');
      fs.writeFileSync(path.join(distDir, file), content);
    }
  }

  // 3. Create dist/index.js (CommonJS Main Entry)
  const mainIndexCJS = `/**
 * @dds/server v1.0.0
 * Official DDS Backend SDK — plug-and-play push-based authentication
 * (c) 2026 DDS. MIT License.
 *
 * Zero-config usage:
 *   const { DDS } = require("@dds/server");
 *   const dds = new DDS();
 *   const result = await dds.requestAuth({ mobileNumber: "+919876543210" });
 */
const DDSClient = require('./DDSClient');
const { DDSError } = require('./Errors');
const { generateCode } = require('./CodeGenerator');

function DDS(config) {
  return new DDSClient(config);
}

DDS.DDSClient = DDSClient;
DDS.DDSError  = DDSError;
DDS.generateCode = generateCode;

// Named exports: const { DDS } = require("@dds/server")
module.exports         = DDS;
module.exports.default = DDS;
module.exports.DDS     = DDS;
module.exports.DDSClient   = DDSClient;
module.exports.DDSError    = DDSError;
module.exports.generateCode = generateCode;
`;
  fs.writeFileSync(path.join(distDir, 'index.js'), mainIndexCJS);

  // 4. Create dist/index.mjs (ES Module Entry)
  const mainIndexESM = `/**
 * @dds/server v1.0.0 — ES Module Entry
 */
import DDSClient from './DDSClient.js';
import { DDSError } from './Errors.js';
import { generateCode } from './CodeGenerator.js';

export function DDS(config) {
  return new DDSClient(config);
}

DDS.DDSClient    = DDSClient;
DDS.DDSError     = DDSError;
DDS.generateCode = generateCode;

export { DDSClient, DDSError, generateCode };
export default DDS;
`;
  fs.writeFileSync(path.join(distDir, 'index.mjs'), mainIndexESM);

  // 5. Create dist/index.d.ts (TypeScript Type Declarations)
  const dtsContent = `/**
 * TypeScript Declarations for @dds/server
 * Official DDS Backend SDK — plug-and-play push-based authentication
 */

/**
 * SDK configuration.
 * All fields are optional — the SDK reads from environment variables when omitted:
 *   DDS_APP_ID, DDS_PUBLIC_KEY, DDS_SECRET_KEY, DDS_BASE_URL
 */
export interface DDSConfig {
  /** Application ID (app_xxxx). Reads from DDS_APP_ID if not provided. */
  appId?: string;
  /** Public API Key (dds_pk_xxxx). Reads from DDS_PUBLIC_KEY if not provided. */
  publicKey?: string;
  /** Secret API Key (dds_sk_xxxx). Reads from DDS_SECRET_KEY if not provided. */
  secretKey?: string;
  /** DDS Server base URL. Reads from DDS_BASE_URL. Defaults to http://localhost:5000. */
  baseUrl?: string;
  /** @alias appId */
  applicationId?: string;
  /** @alias publicKey */
  apiKey?: string;
  /** @alias secretKey */
  secret?: string;
  /** @alias baseUrl */
  apiUrl?: string;
}

export interface AuthenticateParams {
  mobileNumber: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
  onCodeGenerated?: (info: { verificationCode: string; requestId: string }) => void;
}

export interface AuthResult {
  success: boolean;
  userVerified?: boolean;
  reason?: string;
  requestId?: string;
  verificationCode?: string;
}

export interface RequestAuthResult {
  success: boolean;
  requestId: string;
  verificationCode: string;
}

export interface StatusResult {
  success: boolean;
  pending: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  enteredCode?: string;
}

export interface PingResult {
  success: boolean;
  connected: boolean;
  serverName?: string;
  version?: string | null;
  baseUrl?: string;
}

export class DDSError extends Error {
  name: 'DDSError';
  code: string;
  statusCode: number;
  details: object;
  constructor(message: string, code?: string, statusCode?: number, details?: object);
  toJSON(): { error: string; message: string; statusCode: number; details: object };
}

export class DDSClient {
  appId: string;
  publicKey: string;
  secretKey: string;
  baseUrl: string;

  /**
   * Create a DDS client.
   * Pass no arguments to auto-read from environment variables:
   *   DDS_APP_ID, DDS_PUBLIC_KEY, DDS_SECRET_KEY, DDS_BASE_URL
   */
  constructor(config?: DDSConfig);

  /**
   * Initiate a push-based authentication request.
   * Returns immediately with the requestId and verificationCode.
   */
  requestAuth(params: { mobileNumber: string }): Promise<RequestAuthResult>;

  /**
   * Poll the status of an authentication request.
   */
  getStatus(requestId: string): Promise<StatusResult>;

  /**
   * One-step authentication: requestAuth → poll → verify.
   */
  authenticate(params: AuthenticateParams): Promise<AuthResult>;

  /**
   * Manually verify a code against an active request.
   */
  verifyCode(params: { requestId: string; enteredCode: string }): Promise<AuthResult>;

  /**
   * Test DDS server connectivity. Useful for health checks and CLI diagnostics.
   */
  ping(): Promise<PingResult>;
}

/**
 * Create a DDS client.
 *
 * Zero-config usage (reads env variables automatically):
 * @example
 *   const { DDS } = require("@dds/server");
 *   const dds = new DDS();
 *
 * Explicit config:
 * @example
 *   const { DDS } = require("@dds/server");
 *   const dds = new DDS({ appId, publicKey, secretKey });
 */
export function DDS(config?: DDSConfig): DDSClient;

export { DDSClient, DDSError };
export default DDS;
`;
  fs.writeFileSync(path.join(distDir, 'index.d.ts'), dtsContent);

  console.log('✅ Build successful! Output files in dist/:');
  fs.readdirSync(distDir).forEach((file) => {
    const stats = fs.statSync(path.join(distDir, file));
    console.log(`   - dist/${file} (${stats.size} bytes)`);
  });
}

try {
  build();
} catch (err) {
  console.error('❌ Build failed:', err);
  process.exit(1);
}