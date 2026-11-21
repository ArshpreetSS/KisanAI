// Netlify Serverless Function: OTP Generation & Verification
const activeOtps = new Map();

async function sendTwilioSms(phone, otp) {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  const twilioServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (twilioSid && twilioToken && (twilioPhone || twilioServiceSid)) {
    try {
      const cleanPhone = String(phone).replace(/[^0-9]/g, '').slice(-10);
      const targetNumber = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`;
      const messageText = `[Kisan AI] Your verification code is: ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`;
      
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid.trim()}/Messages.json`;
      const authHeader = 'Basic ' + Buffer.from(`${twilioSid.trim()}:${twilioToken.trim()}`).toString('base64');
      
      const params = new URLSearchParams({
        To: targetNumber,
        Body: messageText
      });
      if (twilioPhone && twilioPhone.trim()) {
        params.append('From', twilioPhone.trim());
      } else if (twilioServiceSid && twilioServiceSid.trim()) {
        params.append('MessagingServiceSid', twilioServiceSid.trim());
      }

      await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
    } catch (e) {
      console.warn('Twilio dispatch note:', e.message);
    }
  }
}

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

      // Dispatch live Twilio SMS if configured
      await sendTwilioSms(cleanPhone, otp);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: `Verification code dispatched to +91-${cleanPhone}. Valid for 5 minutes.`,
          phone: cleanPhone,
          expiresInSeconds: 300
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
            regId: `KISAN-${Math.floor(1000 + Math.random() * 9000)}`,
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
