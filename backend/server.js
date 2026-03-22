import http from 'node:http';

const PORT = process.env.PORT || 3001;

const json = (res, statusCode, payload) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
};

const validationTargets = {
  openai: (credentials) => ({
    url: `${credentials.apiUrl || 'https://api.openai.com/v1'}/models`,
    headers: { Authorization: `Bearer ${credentials.apiKey}` },
  }),
  github: (credentials) => ({
    url: `${credentials.apiUrl || 'https://api.github.com'}/user`,
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
      'User-Agent': 'ECHOMEN-Validator',
    },
  }),
};

const validateServiceCredential = async (serviceId, credentials) => {
  const builder = validationTargets[serviceId];
  if (!builder) {
    if (!credentials?.apiKey) {
      return { valid: false, errorType: 'invalid_key' };
    }
    return { valid: true, lastValidatedAt: new Date().toISOString() };
  }

  const { url, headers } = builder(credentials);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    clearTimeout(timeout);

    if (response.status === 401 || response.status === 403) {
      return { valid: false, errorType: 'invalid_key' };
    }

    if (!response.ok) {
      return { valid: false, errorType: 'provider_down' };
    }

    return { valid: true, lastValidatedAt: new Date().toISOString() };
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      return { valid: false, errorType: 'timeout' };
    }
    return { valid: false, errorType: 'provider_down' };
  }
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/validate-service') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const { serviceId, credentials } = JSON.parse(body || '{}');
        if (!serviceId || !credentials || typeof credentials !== 'object') {
          return json(res, 400, { valid: false, errorType: 'invalid_key' });
        }

        const result = await validateServiceCredential(serviceId, credentials);
        return json(res, result.valid ? 200 : 400, result);
      } catch {
        return json(res, 400, { valid: false, errorType: 'provider_down' });
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/execute-tool') {
    return json(res, 501, { error: 'Tool execution handler not configured in this sample server.' });
  }

  return json(res, 404, { error: 'Not Found' });
});

server.listen(PORT, () => {
  console.log(`ECHOMEN backend listening on http://localhost:${PORT}`);
});
