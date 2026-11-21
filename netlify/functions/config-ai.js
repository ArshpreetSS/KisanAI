// Netlify Serverless Function: AI Engine Configuration Status
exports.handler = async function (event) {
  if (event.httpMethod === 'GET') {
    const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activeProvider: hasOpenAI ? 'openai' : (hasGemini ? 'gemini' : 'offline'),
        hasGemini,
        hasOpenAI
      })
    };
  }

  if (event.httpMethod === 'POST') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'On Netlify serverless, please configure GEMINI_API_KEY or OPENAI_API_KEY in Netlify Site Settings > Environment Variables.'
      })
    };
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method Not Allowed' })
  };
};
