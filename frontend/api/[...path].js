// Vercel Serverless Function — CineVerse API Proxy
// CommonJS format (Vercel default when no package.json type)

module.exports = async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Extract path: /api/api/countries -> ['api', 'countries']
  let pathSegments = req.query.path;
  if (!Array.isArray(pathSegments)) {
    pathSegments = pathSegments ? [pathSegments] : [];
  }
  const apiPath = pathSegments.join('/');

  // Build query string (exclude 'path')
  const params = new URLSearchParams();
  Object.keys(req.query).forEach((k) => {
    if (k !== 'path') params.append(k, req.query[k]);
  });
  const qs = params.toString() ? '?' + params.toString() : '';

  const targetUrl = `https://cineverse-api.infinityfreeapp.com/public/${apiPath}${qs}`;

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
        'Referer': 'https://cineverse-api.infinityfreeapp.com/',
        'Origin': 'https://cineverse-api.infinityfreeapp.com',
      },
      redirect: 'follow',
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
      fetchOptions.body = body;
      fetchOptions.headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(targetUrl, fetchOptions);
    const text = await response.text();

    let body = text;
    try { body = JSON.parse(text); } catch {}

    res.status(response.status).json(body);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Proxy error',
        detail: error.message,
        url: targetUrl,
      },
    });
  }
};