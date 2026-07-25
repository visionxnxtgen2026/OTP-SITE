const fs = require('fs');
const path = require('path');

// Step 2 Requirement: Load .env values BEFORE any SDK or service initialization
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valParts] = trimmed.split('=');
        const val = valParts.join('=').trim();
        if (key) {
          process.env[key.trim()] = val;
        }
      }
    });
  }
}

loadEnv();

const maskKey = (key) => key ? `${key.slice(0, 10)}...${key.slice(-4)}` : '(missing)';

console.log('=================================================');
console.log('✓ DDS Configuration Loaded from .env:');
console.log(`  Loaded DDS_BASE_URL:   ${process.env.DDS_BASE_URL || 'http://localhost:5000'}`);
console.log(`  Loaded DDS_APP_ID:     ${process.env.DDS_APP_ID || '(missing)'}`);
console.log(`  Loaded DDS_API_KEY:    ${maskKey(process.env.DDS_API_KEY)}`);
console.log(`  Loaded DDS_SECRET_KEY: ${maskKey(process.env.DDS_SECRET_KEY)}`);
console.log('=================================================');

let express;
try {
  express = require('express');
} catch (_) {
  express = require('../../server/node_modules/express');
}

let cors;
try {
  cors = require('cors');
} catch (_) {
  try {
    cors = require('../../server/node_modules/cors');
  } catch (_) {
    cors = null;
  }
}

const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

if (cors) {
  app.use(cors());
}

app.use(express.json());

// 1. Mount API Routes FIRST
app.use('/api', authRoutes);

// 2. Serve static frontend files SECOND
app.use(express.static(path.join(__dirname, '../frontend')));

// 3. Fallback route for HTML navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Sample Third-Party Demo Website Backend Running on http://localhost:${PORT}`);
});
