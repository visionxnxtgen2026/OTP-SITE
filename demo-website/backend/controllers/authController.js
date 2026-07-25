const { initiateAuthentication, getAuthenticationStatus } = require('../services/ddsService');

/**
 * GET /api/health
 * Demo Backend Health Check Endpoint
 */
const getHealth = (req, res) => {
  return res.status(200).json({
    success: true,
    status: 'online'
  });
};

/**
 * POST /api/login
 * Trigger DDS push authentication via backend SDK
 */
const login = async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber || typeof mobileNumber !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Verified Mobile Number is required.'
      });
    }

    // Call official DDS SDK
    const ddsResponse = await initiateAuthentication({
      mobileNumber: mobileNumber.trim(),
      codeLength: 6,
      expiresIn: 120
    });

    return res.status(200).json({
      success: true,
      authenticationId: ddsResponse.authenticationId || ddsResponse.requestId,
      verificationCode: ddsResponse.verificationCode || '583921',
      status: ddsResponse.status || 'pending',
      expiresIn: ddsResponse.expiresIn || 120
    });

  } catch (error) {
    console.error('[Demo Backend Error] Login failed:', error.message || error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Authentication request failed. Ensure DDS server is running.'
    });
  }
};

/**
 * GET /api/status/:authId
 * Poll DDS authentication status via backend SDK
 */
const checkStatus = async (req, res) => {
  try {
    const { authId } = req.params;

    if (!authId) {
      return res.status(400).json({
        success: false,
        message: 'Authentication ID is required.'
      });
    }

    // Poll status using SDK
    const statusResult = await getAuthenticationStatus(authId);
    const rawStatus = statusResult.status || (statusResult.approved ? 'approved' : 'pending');
    const status = String(rawStatus).toLowerCase();
    const isApproved = status === 'approved' || statusResult.approved === true;

    console.log(`[Demo Backend Status Poll] Auth ID: "${authId}" -> Status: "${status}" | Approved: ${isApproved}`);

    return res.status(200).json({
      success: true,
      authenticationId: authId,
      status: isApproved ? 'approved' : status,
      approved: isApproved
    });

  } catch (error) {
    console.error('[Demo Backend Error] Status check failed:', error.message || error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to fetch status.'
    });
  }
};

module.exports = {
  getHealth,
  login,
  checkStatus
};
