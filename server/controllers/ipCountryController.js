import axios from 'axios';

/**
 * GET /api/config/ip-country
 * Detects client country based on client IP
 */
export const getIpCountry = async (req, res, next) => {
  try {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    if (ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }
    
    // Normalize IPv6 mapped IPv4 addresses
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }

    // Check for loopback or private ranges
    const isLocal = ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.');

    let countryCode = 'IN'; // default fallback
    
    if (!isLocal) {
      try {
        const response = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 3000 });
        if (response.data && response.data.status === 'success' && response.data.countryCode) {
          countryCode = response.data.countryCode;
        }
      } catch (err) {
        console.warn('[IP Geo Lookup Error]', err.message);
        try {
          const response = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 3000 });
          if (response.data && response.data.country_code) {
            countryCode = response.data.country_code;
          }
        } catch (err2) {
          console.warn('[IP Geo Lookup Fallback Error]', err2.message);
        }
      }
    } else {
      // If localhost, fetch the server's public IP location as a fallback
      try {
        const response = await axios.get('http://ip-api.com/json/', { timeout: 3000 });
        if (response.data && response.data.status === 'success' && response.data.countryCode) {
          countryCode = response.data.countryCode;
        }
      } catch (err) {
        console.warn('[Server Public IP Lookup Error]', err.message);
      }
    }

    res.status(200).json({
      success: true,
      countryCode: countryCode.toUpperCase()
    });
  } catch (error) {
    next(error);
  }
};
