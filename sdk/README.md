# @dds/auth-sdk

Official Node.js SDK for **DDS Authentication Approval Platform**.

Replace SMS OTP costs with secure push-based authentication approvals. DDS replaces traditional OTP verification by pushing instant interactive popups to users' devices while leaving final authentication verification in control of your backend.

---

## 📦 Installation

```bash
npm install @dds/auth-sdk
```

---

## 🔑 Environment Variables

Add your DDS credentials generated from the **DDS Developer Portal** to your `.env` file:

```env
DDS_APP_ID=app_52b171f451f34e3499ea
DDS_PUBLIC_KEY=dds_pk_live_B5T7N2XP8P1M4
DDS_SECRET_KEY=dds_sk_live_HJ82KSLMNPQ98765
```

---

## 🚀 Quick Start

```javascript
const DDS = require("@dds/auth-sdk");

// Initialize DDS Client
const dds = new DDS({
  appId: process.env.DDS_APP_ID,
  publicKey: process.env.DDS_PUBLIC_KEY,
  secretKey: process.env.DDS_SECRET_KEY
});

// Single line authentication call
async function handleLogin(userMobileNumber) {
  const result = await dds.authenticate({
    mobileNumber: userMobileNumber // e.g. "+919876543210"
  });

  if (result.success) {
    console.log("✅ Login Success! User verified:", result.requestId);
    return { login: true };
  } else {
    console.log("❌ Login Failed. Reason:", result.reason);
    return { login: false, reason: result.reason };
  }
}
```

---

## ⚙️ How the SDK Works Internally

The SDK automates the entire authentication lifecycle internally:

1. **Credentials Validation**: Validates `appId`, `publicKey`, and `secretKey`.
2. **Secure Code Generation**: Generates a random 6-digit verification code (`583921`) on **your server** using cryptographically secure random bytes.
3. **Session Allocation**: Temporarily stores the generated code with a 2-minute TTL.
4. **DDS Communication**: Requests authentication from DDS (`POST /api/v1/auth/request`) and transmits the code (`POST /api/v1/auth/code`).
5. **DDS Mobile App Popup**: DDS sends a live push notification to the user's phone.
6. **Automatic Verification**: Polls DDS status and automatically compares **Generated Code vs Entered Code**.
7. **Result Delivery**: Returns clean `{ success: true, userVerified: true }` or exact failure reason (`"Invalid Verification Code"`, `"User Rejected Request"`, or `"Authentication Expired"`).

---

## 💻 Integration Examples

### 1. Express.js Example

```javascript
const express = require('express');
const DDS = require('@dds/auth-sdk');

const app = express();
app.use(express.json());

const dds = new DDS({
  appId: process.env.DDS_APP_ID,
  publicKey: process.env.DDS_PUBLIC_KEY,
  secretKey: process.env.DDS_SECRET_KEY
});

app.post('/api/auth/login', async (req, res) => {
  const { mobileNumber } = req.body;

  try {
    const result = await dds.authenticate({ mobileNumber });

    if (result.success) {
      // Issue session / JWT token to user
      return res.status(200).json({ success: true, message: 'Authentication successful' });
    } else {
      return res.status(401).json({ success: false, reason: result.reason });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

---

### 2. Fastify Example

```javascript
const fastify = require('fastify')({ logger: true });
const DDS = require('@dds/auth-sdk');

const dds = new DDS({
  appId: process.env.DDS_APP_ID,
  publicKey: process.env.DDS_PUBLIC_KEY,
  secretKey: process.env.DDS_SECRET_KEY
});

fastify.post('/api/auth/login', async (request, reply) => {
  const { mobileNumber } = request.body;

  const result = await dds.authenticate({ mobileNumber });

  if (result.success) {
    return reply.status(200).send({ success: true, userVerified: true });
  } else {
    return reply.status(401).send({ success: false, reason: result.reason });
  }
});

fastify.listen({ port: 3000 });
```

---

### 3. NestJS Example

```typescript
import { Injectable, Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import DDS from '@dds/auth-sdk';

@Injectable()
export className DdsService {
  private dds: any;

  constructor() {
    this.dds = new DDS({
      appId: process.env.DDS_APP_ID,
      publicKey: process.env.DDS_PUBLIC_KEY,
      secretKey: process.env.DDS_SECRET_KEY,
    });
  }

  async authenticateUser(mobileNumber: string) {
    return await this.dds.authenticate({ mobileNumber });
  }
}

@Controller('auth')
export className AuthController {
  constructor(private readonly ddsService: DdsService) {}

  @Post('login')
  async login(@Body('mobileNumber') mobileNumber: string) {
    const result = await this.ddsService.authenticateUser(mobileNumber);
    if (!result.success) {
      throw new UnauthorizedException(result.reason);
    }
    return { success: true };
  }
}
```

---

### 4. Next.js API Route Example (App Router)

```typescript
// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import DDS from '@dds/auth-sdk';

const dds = new DDS({
  appId: process.env.DDS_APP_ID!,
  publicKey: process.env.DDS_PUBLIC_KEY!,
  secretKey: process.env.DDS_SECRET_KEY!
});

export async function POST(request: Request) {
  const { mobileNumber } = await request.json();

  const result = await dds.authenticate({ mobileNumber });

  if (result.success) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ success: false, reason: result.reason }, { status: 401 });
  }
}
```

---

## ⚠️ Error Handling & Return Types

### Success Response
```json
{
  "success": true,
  "userVerified": true,
  "requestId": "cbe57959-863d-4fa2-9c30-be8eaede6f20",
  "verificationCode": "583921"
}
```

### Failure Responses
```json
{ "success": false, "userVerified": false, "reason": "Invalid Verification Code" }
```
```json
{ "success": false, "userVerified": false, "reason": "User Rejected Request" }
```
```json
{ "success": false, "userVerified": false, "reason": "Authentication Expired" }
```
```json
{ "success": false, "userVerified": false, "reason": "User Not Found on DDS" }
```

---

## 🛡 Best Practices

1. **Keep `secretKey` Hidden**: Never expose your `DDS_SECRET_KEY` in client-side code. Always execute `dds.authenticate()` on your backend server.
2. **E.164 Phone Formatting**: Pass mobile numbers in E.164 format (e.g., `+919876543210`). The SDK automatically normalizes 10-digit Indian mobile numbers.
3. **Session Timeout**: The default authentication window is 2 minutes (120,000 ms). You can customize it via `dds.authenticate({ mobileNumber, timeoutMs: 60000 })`.

---

## 📄 License
MIT © DDS Authentication Platform
