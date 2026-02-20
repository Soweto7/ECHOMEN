# Real-Tool Backend Setup

This guide outlines the recommended backend layer to move from simulated tools to real integrations.

## Architecture
- **Frontend (ECHO):** orchestration and UX.
- **Backend proxy (recommended):** signed tool calls, secret management, policy checks.
- **Integrations:** GitHub, file system bridge, web automation workers.

## Minimum backend responsibilities
1. Store provider credentials server-side.
2. Validate requested tool + args against allowlist.
3. Enforce per-user quotas and rate limits.
4. Return structured execution events to UI.
5. Redact secrets before log persistence.

## Recommended endpoints
- `POST /tools/execute`
- `GET /runs/:id`
- `GET /runs/:id/artifacts`
- `POST /runs/:id/share` (returns share URL for sanitized report)

## Security baseline
- JWT auth + workspace scoping.
- Signed webhook callbacks for async jobs.
- Immutable audit logs for tool execution.
