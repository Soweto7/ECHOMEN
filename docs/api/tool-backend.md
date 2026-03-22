# Tool Backend API

This document describes the Tool Backend service used by the frontend (`services/tools.ts`).

## Base URL

`http://localhost:3001`

## Correlation IDs

Every tool request must include a correlation ID that is echoed in responses and backend logs.

- Header: `X-Correlation-ID: <uuid>`
- Body: `correlationId: string`

The backend should copy this value into all logs and responses so a single tool call can be traced end-to-end.

---

## `GET /health`

Health probe for readiness/liveness checks.

### Response `200`

```json
{
  "status": "ok",
  "service": "tool-backend",
  "timestamp": "2026-01-10T14:25:16.921Z"
}
```

---

## `GET /tools`

Returns supported tool actions and their schemas.

### Response `200`

```json
{
  "tools": [
    {
      "name": "readFile",
      "description": "Read a file from the sandbox",
      "requestSchema": {
        "type": "object",
        "properties": {
          "path": { "type": "string" }
        },
        "required": ["path"]
      },
      "responseSchema": {
        "type": "object",
        "properties": {
          "content": { "type": "string" }
        },
        "required": ["content"]
      }
    }
  ]
}
```

---

## `POST /execute-tool`

Executes one tool action.

### Request schema

```json
{
  "type": "object",
  "properties": {
    "tool": { "type": "string" },
    "args": { "type": "object" },
    "correlationId": { "type": "string" }
  },
  "required": ["tool", "args", "correlationId"]
}
```

### Success response schema

```json
{
  "type": "object",
  "properties": {
    "result": {},
    "correlationId": { "type": "string" }
  },
  "required": ["result", "correlationId"]
}
```

### Error response schema

```json
{
  "type": "object",
  "properties": {
    "error": {
      "type": "object",
      "properties": {
        "code": { "type": "string" },
        "message": { "type": "string" },
        "retryable": { "type": "boolean" },
        "remediation": { "type": "string" },
        "details": { "type": "object" }
      },
      "required": ["code", "message", "retryable"]
    },
    "correlationId": { "type": "string" }
  },
  "required": ["error", "correlationId"]
}
```

---

## Tool Action Schemas

All tool actions use `POST /execute-tool` with the `tool` field identifying the action.

### `readFile`
- Request args:

```json
{ "path": "./src/index.ts" }
```

- Response result:

```json
{ "content": "file text" }
```

### `writeFile`
- Request args:

```json
{ "path": "./src/index.ts", "content": "new file text" }
```

- Response result:

```json
{ "message": "File written successfully" }
```

### `listFiles`
- Request args:

```json
{ "path": "./src" }
```

- Response result:

```json
{ "files": ["index.ts", "utils.ts"] }
```

### `executeShellCommand`
- Request args:

```json
{ "command": "npm test" }
```

- Response result:

```json
{ "stdout": "...", "stderr": "", "exitCode": 0 }
```

### `browse_web`
- Request args:

```json
{
  "url": "https://example.com",
  "task_description": "Summarize the page"
}
```

- Response result:

```json
{ "summary": "..." }
```

### `github_create_repo`
- Request args:

```json
{ "name": "repo", "description": "demo", "is_private": false }
```

- Response result:

```json
{ "repo_url": "https://github.com/org/repo" }
```

### `github_get_pr_details`
- Request args:

```json
{ "pr_url": "https://github.com/org/repo/pull/1" }
```

- Response result:

```json
{ "title": "PR title", "body": "...", "files": ["a.ts"] }
```

### `github_post_pr_comment`
- Request args:

```json
{ "pr_url": "https://github.com/org/repo/pull/1", "comment": "Looks good" }
```

- Response result:

```json
{ "message": "Comment posted" }
```

### `github_merge_pr`
- Request args:

```json
{ "pr_url": "https://github.com/org/repo/pull/1", "method": "squash" }
```

- Response result:

```json
{ "message": "PR merged" }
```

### `github_create_file_in_repo`
- Request args:

```json
{
  "repo_name": "org/repo",
  "path": "README.md",
  "content": "# Hello",
  "commit_message": "Add readme"
}
```

- Response result:

```json
{ "commit_sha": "abc123" }
```

### `memory_save`
- Request args:

```json
{ "key": "k", "value": "v", "tags": ["project"] }
```

- Response result:

```json
{ "message": "Memory saved" }
```

### `memory_retrieve`
- Request args:

```json
{ "key": "k", "tags": ["project"] }
```

- Response result:

```json
{ "items": [{ "key": "k", "value": "v", "tags": ["project"] }] }
```

### `memory_delete`
- Request args:

```json
{ "key": "k" }
```

- Response result:

```json
{ "message": "Memory deleted" }
```

### `data_analyze`
- Request args:

```json
{ "input_file_path": "./data.csv", "analysis_script": "print('ok')" }
```

- Response result:

```json
{ "stdout": "analysis output" }
```

### `data_visualize`
- Request args:

```json
{
  "input_file_path": "./data.csv",
  "visualization_script": "...",
  "output_image_path": "./plot.png"
}
```

- Response result:

```json
{ "message": "Visualization generated", "output_image_path": "./plot.png" }
```

## Structured error examples

### Non-retryable error

```json
{
  "error": {
    "code": "INVALID_ARGUMENT",
    "message": "Missing required field: path",
    "retryable": false,
    "remediation": "Provide a valid path and retry"
  },
  "correlationId": "0f5f34c2-d3d7-4fc6-9d1c-e4cd735b6880"
}
```

### Retryable error

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "retryable": true,
    "remediation": "Retry after 30 seconds",
    "details": { "retryAfterSeconds": 30 }
  },
  "correlationId": "0f5f34c2-d3d7-4fc6-9d1c-e4cd735b6880"
}
```
