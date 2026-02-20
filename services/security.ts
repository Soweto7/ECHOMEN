export interface ToolExecutionPolicy {
    allowedPathPrefixes: string[];
    blockedCommandPatterns: RegExp[];
    allowedDomains: string[];
}

export interface AuditLogEntry {
    id: string;
    timestamp: string;
    eventType: 'tool_call' | 'external_integration' | 'policy_block';
    source: string;
    status: 'attempt' | 'success' | 'failure' | 'blocked';
    payload: Record<string, unknown>;
    previousHash: string;
    hash: string;
}

const AUDIT_LOG_STORAGE_KEY = 'echo-audit-log';
const REDACTED_PLACEHOLDER = '[REDACTED]';

const SENSITIVE_KEY_PATTERN = /(key|token|secret|password|authorization|credential|cookie|session|private)/i;
const SENSITIVE_VALUE_PATTERN = /(sk-[a-z0-9_\-]{8,}|ghp_[a-z0-9]{20,}|bearer\s+[a-z0-9\-_\.]+|api[_-]?key\s*[:=]|token\s*[:=])/i;

export const defaultToolExecutionPolicy: ToolExecutionPolicy = {
    allowedPathPrefixes: ['./', '/', '/workspace', '/tmp'],
    blockedCommandPatterns: [
        /\brm\s+-rf\s+\/$/i,
        /\bsudo\b/i,
        /\bcurl\b.*\|\s*(sh|bash)/i,
        /\bwget\b.*\|\s*(sh|bash)/i,
        /\bshutdown\b/i,
        /\breboot\b/i,
    ],
    allowedDomains: ['localhost', '127.0.0.1', 'github.com', 'api.github.com'],
};

const simpleHash = (value: string): string => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash) + value.charCodeAt(i);
        hash |= 0;
    }
    return `h${Math.abs(hash)}`;
};

const safelyParseAuditLog = (): AuditLogEntry[] => {
    try {
        const raw = localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const redactSensitiveData = <T>(input: T): T => {
    if (input === null || input === undefined) return input;
    if (typeof input === 'string') {
        return (SENSITIVE_VALUE_PATTERN.test(input) ? REDACTED_PLACEHOLDER : input) as T;
    }
    if (Array.isArray(input)) {
        return input.map(item => redactSensitiveData(item)) as T;
    }
    if (typeof input === 'object') {
        const out: Record<string, unknown> = {};
        Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
            out[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED_PLACEHOLDER : redactSensitiveData(value);
        });
        return out as T;
    }
    return input;
};

export const redactLogMessage = (message: string): string => {
    if (!message) return message;
    return message.replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*[^\s,]+/gi, (_, key) => `${key}=${REDACTED_PLACEHOLDER}`);
};

export const appendImmutableAuditLog = (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'previousHash' | 'hash'>): AuditLogEntry => {
    const existing = safelyParseAuditLog();
    const previousHash = existing.length > 0 ? existing[existing.length - 1].hash : 'GENESIS';
    const timestamp = new Date().toISOString();
    const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = redactSensitiveData(entry.payload);
    const hash = simpleHash(JSON.stringify({ id, timestamp, eventType: entry.eventType, source: entry.source, status: entry.status, payload, previousHash }));

    const newEntry: AuditLogEntry = Object.freeze({
        ...entry,
        payload,
        id,
        timestamp,
        previousHash,
        hash,
    });

    localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify([...existing, newEntry]));
    return newEntry;
};

export const enforcePathPolicy = (path: string, policy: ToolExecutionPolicy = defaultToolExecutionPolicy): void => {
    if (!policy.allowedPathPrefixes.some(prefix => path.startsWith(prefix))) {
        appendImmutableAuditLog({
            eventType: 'policy_block',
            source: 'path_policy',
            status: 'blocked',
            payload: { path },
        });
        throw new Error(`Path is blocked by policy: ${path}`);
    }
};

export const enforceCommandPolicy = (command: string, policy: ToolExecutionPolicy = defaultToolExecutionPolicy): void => {
    if (policy.blockedCommandPatterns.some(pattern => pattern.test(command))) {
        appendImmutableAuditLog({
            eventType: 'policy_block',
            source: 'command_policy',
            status: 'blocked',
            payload: { command },
        });
        throw new Error('Command is blocked by execution policy.');
    }
};

export const enforceDomainPolicy = (url: string, policy: ToolExecutionPolicy = defaultToolExecutionPolicy): void => {
    const parsed = new URL(url);
    if (!policy.allowedDomains.includes(parsed.hostname)) {
        appendImmutableAuditLog({
            eventType: 'policy_block',
            source: 'domain_policy',
            status: 'blocked',
            payload: { url },
        });
        throw new Error(`Domain is not allowed by policy: ${parsed.hostname}`);
    }
};
