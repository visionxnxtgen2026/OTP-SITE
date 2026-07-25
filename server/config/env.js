import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

/**
 * Enterprise Environment Variable Loader & Validator
 * 
 * Ensures `.env` is loaded from the correct directory before any application components access `process.env`.
 * Validates required configuration variables and provides clear, secure console diagnostics.
 */
import { fileURLToPath } from 'url';

export const validateEnv = () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const serverEnvPath = path.resolve(__dirname, '../.env');
  const cwdEnvPath = path.resolve(process.cwd(), '.env');

  if (fs.existsSync(serverEnvPath)) {
    dotenv.config({ path: serverEnvPath });
  } else if (fs.existsSync(cwdEnvPath)) {
    dotenv.config({ path: cwdEnvPath });
  } else {
    dotenv.config();
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = process.env.PORT || 5000;
  const mongoUriExists = Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim() !== '');
  const jwtSecretExists = Boolean(process.env.JWT_SECRET || process.env.DEVELOPER_JWT_SECRET);

  console.log('Checking Environment...');
  console.log(`NODE_ENV: ${nodeEnv}`);
  console.log(`PORT: ${port}`);
  console.log(`MongoDB URI: ${mongoUriExists ? 'Configured \u2713' : 'Missing \u2717'}`);
  console.log(`JWT Secret: ${jwtSecretExists ? 'Configured \u2713' : 'Using Fallback Default'}`);
  console.log('');

  if (!mongoUriExists) {
    console.error('====================================');
    console.error(' MongoDB Connection Failed');
    console.error('====================================');
    console.error('Reason: MONGODB_URI environment variable is not defined.');
    console.error('====================================\n');
    throw new Error('[Environment Error] MONGODB_URI is required to start backend.');
  }

  return {
    nodeEnv,
    port,
    mongoUriExists,
    jwtSecretExists
  };
};

export default validateEnv;
