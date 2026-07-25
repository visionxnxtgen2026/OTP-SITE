/**
 * @dds/node-sdk — Enterprise TypeScript Definitions
 */

export interface DDSConfig {
  appId?: string;
  apiKey?: string;
  secretKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface AuthenticateParams {
  userId?: string;
  mobileNumber?: string;
  phone?: string;
  codeLength?: number; // 4 to 20
  expiresIn?: number;  // 30, 60, 120
  metadata?: Record<string, any>;
}

export interface VerifyParams {
  authenticationId?: string;
  requestId?: string;
  verificationCode: string;
}

export interface WaitForApprovalOptions {
  intervalMs?: number;
  timeoutMs?: number;
}

export interface AuthResponse {
  success: boolean;
  authenticationId: string;
  requestId?: string;
  verificationCode?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  approved?: boolean;
  expiresIn?: number;
  userVerified?: boolean;
  user?: Record<string, any>;
}

export interface UsageResponse {
  success: boolean;
  applicationId: string;
  applicationName: string;
  dailyUsage: number;
  dailyLimit: number;
  monthlyUsage: number;
  monthlyLimit: number;
  totalRequests: number;
}

export interface HealthResponse {
  success: boolean;
  status: string;
  timestamp: string;
}

export interface ValidateCredentialsResponse {
  success: boolean;
  valid: boolean;
  details?: UsageResponse;
  error?: string;
}

export declare class DDSError extends Error {
  name: string;
  code: string;
  statusCode: number;
  details: Record<string, any>;
  toJSON(): object;
}

export declare class DDSConfigurationError extends DDSError {}
export declare class DDSApplicationNotFoundError extends DDSError {}
export declare class DDSInvalidApiKeyError extends DDSError {}
export declare class DDSInvalidSecretKeyError extends DDSError {}
export declare class DDSInvalidSignatureError extends DDSError {}
export declare class DDSUnauthorizedError extends DDSError {}
export declare class DDSRateLimitError extends DDSError {}
export declare class DDSServerError extends DDSError {}
export declare class DDSTimeoutError extends DDSError {}
export declare class DDSNetworkError extends DDSError {}
export declare class DDSAuthenticationError extends DDSError {}

export declare class DDS {
  constructor(config?: DDSConfig);

  authenticate(params: AuthenticateParams): Promise<AuthResponse>;
  getStatus(authenticationId: string): Promise<AuthResponse>;
  waitForApproval(authenticationId: string, options?: WaitForApprovalOptions): Promise<AuthResponse>;
  cancel(authenticationId: string): Promise<AuthResponse>;
  verify(params: VerifyParams): Promise<AuthResponse>;
  verifyCode(params: VerifyParams): Promise<AuthResponse>;
  logout(authenticationId?: string): Promise<{ success: boolean; message: string }>;
  refreshKeys(): Promise<UsageResponse>;
  getUsage(): Promise<UsageResponse>;
  validateCredentials(): Promise<ValidateCredentialsResponse>;
  health(): Promise<HealthResponse>;
}

export declare class DDSClient extends DDS {}

export default DDS;
