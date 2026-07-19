/**
 * Types & Constants for @dds/server
 */

const DEFAULT_BASE_URL = process.env.DDS_BASE_URL
  ? process.env.DDS_BASE_URL.replace(/\/$/, '')
  : 'http://localhost:5000';

const DEFAULT_TIMEOUT_MS = 120000; // 2 minutes (120 seconds)
const DEFAULT_POLL_INTERVAL_MS = 2000; // 2 seconds

const REQUEST_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
};

const FAILURE_REASONS = {
  INVALID_CODE: 'Invalid Verification Code',
  USER_REJECTED: 'User Rejected Request',
  EXPIRED: 'Authentication Expired',
  NETWORK_ERROR: 'Network or Server Error',
  USER_NOT_FOUND: 'User Not Found on DDS'
};

module.exports = {
  DEFAULT_BASE_URL,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_POLL_INTERVAL_MS,
  REQUEST_STATUS,
  FAILURE_REASONS
};
