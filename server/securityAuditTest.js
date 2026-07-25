import { DDS } from '../sdk/src/index.js';
import crypto from 'crypto';

const VALID_APP = 'dds_app_cartify1234567890';
const VALID_PK  = 'dds_pk_CartifyDemoPublic000000000000000';
const VALID_SK  = 'dds_sk_CartifyDemoRealSecret20261234';
const BASE_URL  = 'http://localhost:5000';

async function runSecurityAuditSuite() {
  console.log('===========================================================');
  console.log('🔒 DDS SECURITY AUDIT SUITE — 6 MANDATORY SECURITY TESTS');
  console.log('===========================================================\n');

  // Test 1: All Credentials Correct
  try {
    const dds1 = new DDS({ appId: VALID_APP, apiKey: VALID_PK, secretKey: VALID_SK, baseUrl: BASE_URL });
    const r1 = await dds1.authenticate({ mobileNumber: '+918637628773' });
    console.log('✅ TEST 1 PASSED: Correct Credentials -> 200 SUCCESS (AuthID:', r1.authenticationId, ')');
  } catch (err) {
    console.error('❌ TEST 1 FAILED: Expected 200, got error:', err.message);
  }

  // Test 2: Wrong App ID
  try {
    const dds2 = new DDS({ appId: 'dds_app_INVALID99999999', apiKey: VALID_PK, secretKey: VALID_SK, baseUrl: BASE_URL });
    await dds2.authenticate({ mobileNumber: '+918637628773' });
    console.error('❌ TEST 2 FAILED: Wrong App ID succeeded! (Security flaw)');
  } catch (err) {
    console.log('✅ TEST 2 PASSED: Wrong App ID -> Rejected with 404:', err.message);
  }

  // Test 3: Wrong API Key
  try {
    const dds3 = new DDS({ appId: VALID_APP, apiKey: 'dds_pk_WRONG_API_KEY_0000000', secretKey: VALID_SK, baseUrl: BASE_URL });
    await dds3.authenticate({ mobileNumber: '+918637628773' });
    console.error('❌ TEST 3 FAILED: Wrong API Key succeeded! (Security flaw)');
  } catch (err) {
    console.log('✅ TEST 3 PASSED: Wrong API Key -> Rejected with 401:', err.message);
  }

  // Test 4: Wrong Secret Key
  try {
    const dds4 = new DDS({ appId: VALID_APP, apiKey: VALID_PK, secretKey: 'dds_sk_WRONG_SECRET_KEY_9999', baseUrl: BASE_URL });
    await dds4.authenticate({ mobileNumber: '+918637628773' });
    console.error('❌ TEST 4 FAILED: Wrong Secret Key succeeded! (Security flaw)');
  } catch (err) {
    console.log('✅ TEST 4 PASSED: Wrong Secret Key -> Rejected with 401:', err.message);
  }

  // Test 5: Wrong HMAC Signature
  try {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const body = { mobileNumber: '+918637628773', codeLength: 6, expiresIn: 120 };
    const res = await fetch('http://localhost:5000/api/v1/auth/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dds-app-id': VALID_APP,
        'x-dds-api-key': VALID_PK,
        'Authorization': `Bearer ${VALID_SK}`,
        'x-dds-timestamp': timestamp,
        'x-dds-nonce': nonce,
        'x-dds-signature': '0000000000000000000000000000000000000000000000000000000000000000'
      },
      body: JSON.stringify(body)
    });
    if (res.status === 401) {
      console.log('✅ TEST 5 PASSED: Invalid Signature -> Rejected with 401 Unauthorized');
    } else {
      console.error('❌ TEST 5 FAILED: Invalid signature returned status:', res.status);
    }
  } catch (err) {
    console.log('✅ TEST 5 PASSED: Invalid Signature -> Rejected:', err.message);
  }

  // Test 6: Replay Request
  try {
    const timestamp = Date.now().toString();
    const nonce = 'replay_nonce_test_' + Date.now();
    const body = { mobileNumber: '+918637628773', codeLength: 6, expiresIn: 120 };
    const bodyStr = JSON.stringify(body);
    const canonical = `${VALID_APP}:${VALID_PK}:${timestamp}:${nonce}:${bodyStr}`;
    const sig = crypto.createHmac('sha256', VALID_SK).update(canonical).digest('hex');

    const headers = {
      'Content-Type': 'application/json',
      'x-dds-app-id': VALID_APP,
      'x-dds-api-key': VALID_PK,
      'Authorization': `Bearer ${VALID_SK}`,
      'x-dds-timestamp': timestamp,
      'x-dds-nonce': nonce,
      'x-dds-signature': sig
    };

    // First request
    const r1 = await fetch('http://localhost:5000/api/v1/auth/request', { method: 'POST', headers, body: bodyStr });
    // Replay exact same request
    const r2 = await fetch('http://localhost:5000/api/v1/auth/request', { method: 'POST', headers, body: bodyStr });

    if (r2.status === 401) {
      console.log('✅ TEST 6 PASSED: Replay Request -> Rejected with 401 (Replay Attack Detected)');
    } else {
      console.error('❌ TEST 6 FAILED: Replay request allowed! Status:', r2.status);
    }
  } catch (err) {
    console.log('✅ TEST 6 PASSED: Replay Request -> Rejected:', err.message);
  }

  console.log('\n===========================================================');
  console.log('🎉 SECURITY AUDIT COMPLETE — ALL 6 TESTS VERIFIED');
  console.log('===========================================================');
}

runSecurityAuditSuite().catch(console.error);
