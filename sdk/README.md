# @dds/node-sdk

Official Node.js SDK for **DDS Authentication Approval Platform**.

Replace SMS OTP costs with secure push-based authentication approvals. DDS replaces traditional OTP verification by pushing instant interactive popups to users' devices while leaving final authentication verification in control of your backend.

---

## 📦 Installation

```bash
npm install @dds/node-sdk
```

---

## 🔑 Environment Variables

Add your DDS credentials generated from the **DDS Developer Portal** to your `.env` file:

```env
DDS_APP_ID=dds_app_52b171f451f34e3499ea
DDS_API_KEY=dds_pk_live_B5T7N2XP8P1M4
DDS_SECRET_KEY=dds_sk_live_HJ82KSLMNPQ98765
DDS_BASE_URL=https://api.dds.com
```

---

## 🚀 Quick Start

```javascript
const DDS = require("@dds/node-sdk");

// Initialize DDS Client
const dds = new DDS({
  appId: process.env.DDS_APP_ID,
  apiKey: process.env.DDS_API_KEY,
  secretKey: process.env.DDS_SECRET_KEY,
  baseUrl: process.env.DDS_BASE_URL
});

// 1. Initiate Authentication
async function handleLogin(mobileNumber) {
  const auth = await dds.authenticate({
    mobileNumber: "+919876543210"
  });

  // 2. Wait for User Approval on DDS Mobile App
  const result = await dds.waitForApproval(auth.authenticationId);

  if (result.approved) {
    console.log("✅ Login Success! Verified Authentication ID:", result.authenticationId);
    return { login: true };
  } else {
    console.log("❌ Login Rejected / Failed. Status:", result.status);
    return { login: false, status: result.status };
  }
}
```

---

## 🛠️ SDK Methods

| Method | Description |
| :--- | :--- |
| `dds.authenticate({ mobileNumber, metadata })` | Initiate push authentication request |
| `dds.getStatus(authenticationId)` | Poll request status (`pending`, `approved`, `rejected`, `expired`, `cancelled`) |
| `dds.waitForApproval(authenticationId, options)` | Auto-poll helper until approval, rejection, or timeout |
| `dds.verifyCode({ authenticationId, verificationCode })` | Manually verify numeric code |
| `dds.cancel(authenticationId)` | Cancel an active pending request |
| `dds.logout(authenticationId)` | Logout helper |
| `dds.refreshKeys()` | Refresh usage metrics |
| `dds.health()` | Health check DDS platform API |
| `dds.validateCredentials()` | Validate developer credentials against DDS backend |

---

## 🚨 Typed Error Handling

The SDK exports typed error classes for clean error handling:

```javascript
const {
  DDS,
  DDSApplicationNotFoundError,
  DDSInvalidApiKeyError,
  DDSInvalidSecretKeyError,
  DDSInvalidSignatureError,
  DDSRateLimitError,
  DDSTimeoutError
} = require("@dds/node-sdk");

try {
  await dds.authenticate({ mobileNumber: "+919876543210" });
} catch (err) {
  if (err instanceof DDSApplicationNotFoundError) {
    console.error("404 Application not found on DDS platform.");
  } else if (err instanceof DDSInvalidApiKeyError || err instanceof DDSInvalidSecretKeyError) {
    console.error("401 Invalid developer credentials.");
  } else if (err instanceof DDSInvalidSignatureError) {
    console.error("401 HMAC signature mismatch.");
  } else if (err instanceof DDSRateLimitError) {
    console.error("429 Rate limit or daily limit exceeded.");
  }
}
```

---

## 💻 Integration Examples

### 1. Express.js Example

```javascript
const express = require('express');
const DDS = require('@dds/node-sdk');

const app = express();
app.use(express.json());

const dds = new DDS({
  appId: process.env.DDS_APP_ID,
  apiKey: process.env.DDS_API_KEY,
  secretKey: process.env.DDS_SECRET_KEY,
  baseUrl: process.env.DDS_BASE_URL
});

app.post('/api/login', async (req, res) => {
  const { mobileNumber } = req.body;

  try {
    const auth = await dds.authenticate({ mobileNumber });
    return res.status(200).json({ success: true, authenticationId: auth.authenticationId });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});
```

### 2. Next.js App Router Example (Route Handler)

```typescript
import { NextResponse } from 'next/server';
import DDS, { DDSApplicationNotFoundError } from '@dds/node-sdk';

const dds = new DDS({
  appId: process.env.DDS_APP_ID,
  apiKey: process.env.DDS_API_KEY,
  secretKey: process.env.DDS_SECRET_KEY,
  baseUrl: process.env.DDS_BASE_URL
});

export async function POST(req: Request) {
  const { mobileNumber } = await req.json();

  try {
    const auth = await dds.authenticate({ mobileNumber });
    return NextResponse.json({ success: true, authenticationId: auth.authenticationId });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: err.statusCode || 500 });
  }
}
```

### 3. NestJS Service Example

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import DDS from '@dds/node-sdk';

@Injectable()
export class DdsService implements OnModuleInit {
  private dds: DDS;

  onModuleInit() {
    this.dds = new DDS({
      appId: process.env.DDS_APP_ID,
      apiKey: process.env.DDS_API_KEY,
      secretKey: process.env.DDS_SECRET_KEY,
      baseUrl: process.env.DDS_BASE_URL
    });
  }

  async login(mobileNumber: string) {
    return await this.dds.authenticate({ mobileNumber });
  }
}
```

---

## 📜 License

MIT License.
