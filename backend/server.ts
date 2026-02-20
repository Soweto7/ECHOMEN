import http from 'node:http';
import { checkPolicy, defaultPolicy, validatePolicy } from './policy.ts';
import type { ToolExecutionPolicy } from './policy.ts';
import { logDeniedAction } from './auditLogger.ts';

interface ExecuteToolRequest {
  tool: string;
  args: Record<string, unknown>;
}

let activePolicy: ToolExecutionPolicy = defaultPolicy;

const toolHandlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
  browse_web: async ({ url, task_description }) => `Stubbed browse result for ${String(url)} (${String(task_description || 'no task')})`,
  daytona_readFile: async ({ path }) => `Stubbed file content from ${String(path)}`,
  daytona_writeFile: async ({ path }) => `Stubbed write successful: ${String(path)}`,
  daytona_listFiles: async () => ['stub-a.txt', 'stub-b.txt'],
  daytona_executeShellCommand: async ({ command }) => `Stubbed command output: ${String(command)}`,
  codesandbox_readFile: async ({ path }) => `Stubbed file content from ${String(path)}`,
  codesandbox_writeFile: async ({ path }) => `Stubbed write successful: ${String(path)}`,
  codesandbox_listFiles: async () => ['stub-a.txt', 'stub-b.txt'],
  codesandbox_executeShellCommand: async ({ command }) => `Stubbed command output: ${String(command)}`,
};

const readBody = (req: http.IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });

const json = (res: http.ServerResponse, statusCode: number, payload: unknown): void => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/policy') {
    try {
      const body = await readBody(req);
      activePolicy = validatePolicy(JSON.parse(body));
      json(res, 200, { policy: activePolicy });
      return;
    } catch {
      json(res, 400, { error: 'Invalid policy payload.' });
      return;
    }
  }

  if (req.method === 'GET' && req.url === '/policy') {
    json(res, 200, { policy: activePolicy });
    return;
  }

  if (req.method === 'POST' && req.url === '/execute-tool') {
    try {
      const body = await readBody(req);
      const parsed = JSON.parse(body) as ExecuteToolRequest;
      const denial = checkPolicy(parsed.tool, parsed.args || {}, activePolicy);

      if (denial) {
        logDeniedAction({
          timestamp: new Date().toISOString(),
          tool: parsed.tool,
          args: parsed.args || {},
          reason: denial.reason,
          remediation: denial.remediation,
        });

        json(res, 403, {
          error: 'policy_denied',
          reason: denial.reason,
          remediation: denial.remediation,
        });
        return;
      }

      const handler = toolHandlers[parsed.tool];
      if (!handler) {
        json(res, 404, { error: `No backend handler found for tool '${parsed.tool}'.` });
        return;
      }

      const result = await handler(parsed.args || {});
      json(res, 200, { result });
    } catch (error) {
      json(res, 500, { error: error instanceof Error ? error.message : 'Unknown server error.' });
    }
    return;
  }

  json(res, 404, { error: 'Not found.' });
});

server.listen(3001, () => {
  console.log('ECHO backend listening on http://localhost:3001');
});
