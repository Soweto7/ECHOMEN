import path from 'node:path';

export interface ToolExecutionPolicy {
  allowedPaths: string[];
  blockedCommands: string[];
  allowedDomains: string[];
}

export interface PolicyDenial {
  reason: string;
  remediation: string;
}

export const defaultPolicy: ToolExecutionPolicy = {
  allowedPaths: ['./workspace', './tmp'],
  blockedCommands: ['rm -rf /', 'shutdown', 'reboot', 'mkfs'],
  allowedDomains: ['example.com'],
};

const normalizePath = (value: string): string => path.resolve(value);

const matchesBlockedCommand = (command: string, blockedCommands: string[]): string | null => {
  const lower = command.toLowerCase();
  const match = blockedCommands.find((blocked) => lower.includes(blocked.toLowerCase()));
  return match ?? null;
};

const isPathAllowed = (requestedPath: string, allowedPaths: string[]): boolean => {
  const normalizedRequestedPath = normalizePath(requestedPath);
  return allowedPaths
    .map(normalizePath)
    .some((allowedPath) => normalizedRequestedPath === allowedPath || normalizedRequestedPath.startsWith(`${allowedPath}${path.sep}`));
};

const isDomainAllowed = (urlValue: string, allowedDomains: string[]): boolean => {
  try {
    const hostname = new URL(urlValue).hostname.toLowerCase();
    return allowedDomains.some((allowedDomain) => {
      const normalizedAllowedDomain = allowedDomain.toLowerCase();
      return hostname === normalizedAllowedDomain || hostname.endsWith(`.${normalizedAllowedDomain}`);
    });
  } catch {
    return false;
  }
};

export const validatePolicy = (candidate: unknown): ToolExecutionPolicy => {
  const casted = candidate as Partial<ToolExecutionPolicy>;
  if (!casted || !Array.isArray(casted.allowedPaths) || !Array.isArray(casted.blockedCommands) || !Array.isArray(casted.allowedDomains)) {
    return defaultPolicy;
  }

  return {
    allowedPaths: casted.allowedPaths.filter((value): value is string => typeof value === 'string' && value.trim().length > 0),
    blockedCommands: casted.blockedCommands.filter((value): value is string => typeof value === 'string' && value.trim().length > 0),
    allowedDomains: casted.allowedDomains.filter((value): value is string => typeof value === 'string' && value.trim().length > 0),
  };
};

export const checkPolicy = (
  tool: string,
  args: Record<string, unknown>,
  policy: ToolExecutionPolicy,
): PolicyDenial | null => {
  if (tool.endsWith('readFile') || tool.endsWith('writeFile') || tool.endsWith('listFiles')) {
    const pathArg = typeof args.path === 'string' ? args.path : '';
    if (!pathArg || !isPathAllowed(pathArg, policy.allowedPaths)) {
      return {
        reason: `Path '${pathArg || '[missing]'}' is not included in policy.allowedPaths.`,
        remediation: 'Update policy.allowedPaths in settings or choose a path within an allowed directory.',
      };
    }
  }

  if (tool.endsWith('executeShellCommand')) {
    const command = typeof args.command === 'string' ? args.command : '';
    const blockedMatch = matchesBlockedCommand(command, policy.blockedCommands);
    if (blockedMatch) {
      return {
        reason: `Command contains blocked pattern '${blockedMatch}'.`,
        remediation: 'Modify the command to remove blocked behavior or update policy.blockedCommands if intentional.',
      };
    }
  }

  if (tool === 'browse_web') {
    const url = typeof args.url === 'string' ? args.url : '';
    if (!isDomainAllowed(url, policy.allowedDomains)) {
      return {
        reason: `Domain for URL '${url || '[missing]'}' is not in policy.allowedDomains.`,
        remediation: 'Add the target domain to policy.allowedDomains in settings before retrying.',
      };
    }
  }

  return null;
};
