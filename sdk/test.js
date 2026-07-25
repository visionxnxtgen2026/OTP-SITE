const {
  DDS,
  DDSConfigurationError,
  DDSApplicationNotFoundError,
  DDSInvalidApiKeyError,
  DDSInvalidSecretKeyError,
  DDSInvalidSignatureError,
  DDSRateLimitError,
  DDSNetworkError,
  DDSTimeoutError
} = require('./src');
const assert = require('assert');

async function runSDKTestSuite() {
  console.log('===========================================================');
  console.log('🧪 @dds/node-sdk INTEGRATION & UNIT TEST SUITE');
  console.log('===========================================================\n');

  // Test 1: Validation of Missing Credentials
  console.log('[Test 1] Testing missing credentials validation...');
  try {
    new DDS({ appId: '', apiKey: '', secretKey: '' });
    assert.fail('Should have thrown DDSConfigurationError');
  } catch (err) {
    assert.strictEqual(err.name, 'DDSConfigurationError');
    console.log('✅ Test 1 PASSED: Successfully caught DDSConfigurationError:', err.message);
  }

  // Test 2: Validation of Invalid Base URL
  console.log('\n[Test 2] Testing invalid baseUrl validation...');
  try {
    new DDS({ appId: 'dds_app_test', apiKey: 'dds_pk_test', secretKey: 'dds_sk_test', baseUrl: 'not-a-url' });
    assert.fail('Should have thrown DDSConfigurationError for invalid URL');
  } catch (err) {
    assert.strictEqual(err.name, 'DDSConfigurationError');
    console.log('✅ Test 2 PASSED: Successfully caught invalid URL error:', err.message);
  }

  // Test 3: Validation of Empty Mobile Number
  console.log('\n[Test 3] Testing empty mobile number validation...');
  const dds = new DDS({
    appId: 'dds_app_test1234567890',
    apiKey: 'dds_pk_test1234567890',
    secretKey: 'dds_sk_test1234567890',
    baseUrl: 'http://localhost:5000'
  });
  try {
    await dds.authenticate({ mobileNumber: '' });
    assert.fail('Should have thrown error for missing mobile number');
  } catch (err) {
    assert.strictEqual(err.name, 'DDSConfigurationError');
    console.log('✅ Test 3 PASSED: Successfully caught missing mobile error:', err.message);
  }

  // Test 4: Typed Error Classes Hierarchy
  console.log('\n[Test 4] Testing typed error class hierarchy...');
  const appNotFound = new DDSApplicationNotFoundError();
  const invalidKey = new DDSInvalidApiKeyError();
  const invalidSecret = new DDSInvalidSecretKeyError();
  const invalidSig = new DDSInvalidSignatureError();
  const timeoutErr = new DDSTimeoutError();

  assert.strictEqual(appNotFound.statusCode, 404);
  assert.strictEqual(invalidKey.statusCode, 401);
  assert.strictEqual(invalidSecret.statusCode, 401);
  assert.strictEqual(invalidSig.statusCode, 401);
  assert.strictEqual(timeoutErr.statusCode, 408);
  console.log('✅ Test 4 PASSED: All typed error classes correctly assigned status codes.');

  // Test 5: SDK Methods Availability
  console.log('\n[Test 5] Testing method presence on DDS instance...');
  const methods = ['authenticate', 'getStatus', 'waitForApproval', 'cancel', 'verify', 'verifyCode', 'logout', 'refreshKeys', 'getUsage', 'validateCredentials', 'health'];
  methods.forEach(method => {
    assert.strictEqual(typeof dds[method], 'function', `Method ${method} should be defined`);
  });
  console.log('✅ Test 5 PASSED: All 11 required SDK methods present on instance.');

  console.log('\n===========================================================');
  console.log('🎉 ALL SDK UNIT & INTEGRATION TESTS COMPLETED SUCCESSFULLY!');
  console.log('===========================================================');
}

runSDKTestSuite().catch(console.error);
