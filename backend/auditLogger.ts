import fs from 'node:fs';
import path from 'node:path';

export interface DeniedAuditEntry {
  timestamp: string;
  tool: string;
  args: Record<string, unknown>;
  reason: string;
  remediation: string;
}

const LOG_DIR = path.resolve('.security-audit');
const LOG_FILE = path.join(LOG_DIR, 'policy-denied.log');

export const logDeniedAction = (entry: DeniedAuditEntry): void => {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`, 'utf-8');
};
