# Evaluation Harness

This folder contains benchmark tasks and scripts used to evaluate code, web, and documentation workflows before release.

## Benchmarks

- `tasks/code.json`: coding and debugging scenarios.
- `tasks/web.json`: frontend accessibility and performance scenarios.
- `tasks/docs.json`: release-note and runbook authoring scenarios.

Each task defines:

- `prompt`: evaluation input prompt.
- `mustInclude`: required response signals used for pass/fail scoring.
- `hallucinationTriggers`: terms that count as hallucination incidents if present in responses.

## Metrics

For each provider/router configuration (`configs/providers.json`), the runner computes:

- **Task completion rate**: percentage of tasks that pass required signals.
- **Retries per task**: average retry count used before a pass (or exhaustion).
- **Hallucination incidents**: count of responses containing hallucination triggers.
- **Latency average (ms)**: average response latency across tasks and attempts.

## Running evaluations

```bash
npm run evals:run
```

Outputs are written to `evals/results/`:

- `latest.json`: current run details.
- `history.json`: append-only run history.
- `leaderboard.json`: ranked summary across configs.
- `trends.json`: per-config metric trend over time.

## Provider/router execution

By default the runner uses deterministic mock responses for local validation.

To run through a real router:

```bash
EVAL_ROUTER_URL="https://router.example.com/eval" \
EVAL_ROUTER_API_KEY="..." \
npm run evals:run
```

The endpoint should accept JSON:

```json
{ "prompt": "...", "config": { "id": "..." }, "attempt": 0 }
```

and return:

```json
{ "output": "model response text" }
```

## Release gate

Run regression checks before production deploy:

```bash
npm run evals:gate
```

The gate compares the latest run against the previous run and fails if thresholds are exceeded:

- completion drop > `EVAL_MAX_COMPLETION_DROP` (default `2` points)
- latency increase > `EVAL_MAX_LATENCY_INCREASE_MS` (default `400ms`)
- hallucination increase > `EVAL_MAX_HALLUCINATION_INCREASE` (default `0`)
- retries increase > `EVAL_MAX_RETRIES_INCREASE` (default `0.5`)

Set `npm run evals:gate` in CI/CD as a required pre-deploy check.
