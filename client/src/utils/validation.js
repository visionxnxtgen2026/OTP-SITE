import { z } from 'zod';

// Validate international phone format: e.g., +919876543210
export const phoneValidationSchema = z.object({
  phone: z.string()
    .min(10, { message: 'Phone number must be at least 10 digits.' })
    .max(12, { message: 'Phone number is too long.' })
    .regex(/^\d+$/, { message: 'Phone number must contain numbers only.' })
});

// Validate 6-digit OTP code input
export const otpValidationSchema = z.object({
  otp: z.string()
    .length(6, { message: 'OTP must be exactly 6 digits.' })
    .regex(/^\d+$/, { message: 'OTP must be numeric digits.' })
});
