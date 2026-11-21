// Netlify Serverless Function: OTP Generation & Verification
const activeOtps = new Map();

exports.handler = async function (event, context) {
  const path = event.path;
  const isSend = path.endsWith('/send');
  const isVerify = path.endsWith('/verify');

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    if (isSend) {
      const { phone, name } = body;
      if (!phone || !/^[6-9]\d{9}$/.test(String(phone).trim())) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, message: 'Valid 10-digit mobile number required.' })
        };
      }

      const cleanPhone = String(phone).trim();
      const otp = String(Math.floor(1000 + Math.random() * 9000));
      activeOtps.set(cleanPhone, { otp, expiresAt: Date.now() + 300000, name });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: `[Demo Sandbox] Verification OTP generated for +91-${cleanPhone}`,
          phone: cleanPhone,
          isDemoSandbox: true,
          sandboxOtp: otp
        })
      };
    }

    if (isVerify) {
      const { phone, otp, profile } = body;
      const cleanPhone = String(phone).trim();
      const record = activeOtps.get(cleanPhone);

      if (!record) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, message: 'No OTP requested for this number.' })
        };
      }

      if (record.otp !== String(otp).trim()) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, message: 'Incorrect OTP code entered.' })
        };
      }

      activeOtps.delete(cleanPhone);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'Farmer verified successfully',
          farmer: {
            name: profile?.name || record.name || 'Registered Farmer',
            phone: cleanPhone,
            location: profile?.location || 'Fatehgarh Sahib',
            crop: profile?.crop || 'Wheat',
            verifiedAt: new Date().toISOString()
          }
        })
      };
    }

    return { statusCode: 404, body: JSON.stringify({ error: 'Endpoint not found' }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
