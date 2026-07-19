const DDS = require('./index');

async function testSDK() {
  console.log('--- Testing @dds/auth-sdk ---');

  const dds = new DDS({
    appId: 'app_cartify_123',
    publicKey: 'dds_pk_CartifyDemoPublic000000000000000',
    secretKey: 'dds_sk_CartifyDemoRealSecret20261234',
    baseUrl: 'http://localhost:5000'
  });

  console.log('1. Initiating single-line authenticate()...');

  // Launch authenticate in background
  const authPromise = dds.authenticate({
    mobileNumber: '+919876543210',
    timeoutMs: 15000,
    pollIntervalMs: 1000,
    onCodeGenerated: ({ verificationCode, requestId }) => {
      console.log(`   [SDK Event] Code Generated: ${verificationCode} for Request: ${requestId}`);

      // Simulate User App Approval after 2 seconds
      setTimeout(async () => {
        console.log('2. Simulating User App entering code and tapping Approve...');
        const axios = require('axios');
        await axios.post('http://localhost:5000/api/v1/auth/approve', {
          requestId,
          enteredCode: verificationCode
        });
      }, 2000);
    }
  });

  const result = await authPromise;
  console.log('3. SDK Result Received:', result);

  if (result.success && result.userVerified) {
    console.log('✅ SDK Test PASSED: User verified successfully!');
  } else {
    console.error('❌ SDK Test FAILED:', result);
  }
}

testSDK().catch(console.error);
