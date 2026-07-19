/**
 * @dds/auth-sdk — TypeScript Definitions
 */

export interface DDSConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface AuthResult {
  status: 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'PENDING';
  ddsId: string | null;
  requestId: string;
}

export interface WaitOptions {
  timeoutMs?: number;
  intervalMs?: number;
  onPoll?: (current: AuthResult) => void;
}

export declare class AuthRequest {
  requestId: string;
  verificationCode: string;
  expiresAt: Date;
  expiresIn: number;
  userOnline: boolean;

  status(): Promise<AuthResult>;
  waitForApproval(opts?: WaitOptions): Promise<AuthResult>;
}

export declare class DDSError extends Error {
  name: 'DDSError';
  code: string;
  status?: number;
}

export declare class DDS {
  constructor(apiKey: string);
  constructor(config: DDSConfig);

  authenticate(params: {
    phoneNumber: string;
    country?: string;
  }): Promise<AuthRequest>;

  getAuthStatus(requestId: string): Promise<AuthResult>;

  static DDSError: typeof DDSError;
  static AuthRequest: typeof AuthRequest;
  static normalizePhone(raw: string, country?: string): string;
}

export default DDS;
