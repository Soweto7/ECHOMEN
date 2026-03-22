import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_FILE = path.join(__dirname, 'results', 'history.json');

const COMPLETION_DROP_THRESHOLD = Number(process.env.EVAL_MAX_COMPLETION_DROP ?? 2);
const LATENCY_INCREASE_THRESHOLD = Number(process.env.EVAL_MAX_LATENCY_INCREASE_MS ?? 400);
const HALLUCINATION_INCREASE_THRESHOLD = Number(process.env.EVAL_MAX_HALLUCINATION_INCREASE ?? 0);
const RETRIES_INCREASE_THRESHOLD = Number(process.env.EVAL_MAX_RETRIES_INCREASE ?? 0.5);

async function main() {
  const history = JSON.parse(await readFile(HISTORY_FILE, 'utf8'));

  if (!Array.isArray(history) || history.length < 2) {
    console.log('Not enough eval history to detect regressions; skipping gate.');
    return;
  }

  const current = history[history.length - 1];
  const previous = history[history.length - 2];

  const previousByConfig = new Map(previous.summaries.map((entry) => [entry.configId, entry]));
  const regressions = [];

  for (const latestSummary of current.summaries) {
    const baseline = previousByConfig.get(latestSummary.configId);
    if (!baseline) continue;

    const completionDrop = baseline.taskCompletionRate - latestSummary.taskCompletionRate;
    const latencyIncrease = latestSummary.latencyAvgMs - baseline.latencyAvgMs;
    const hallucinationIncrease =
      latestSummary.hallucinationIncidents - baseline.hallucinationIncidents;
    const retriesIncrease = latestSummary.retriesPerTask - baseline.retriesPerTask;

    if (completionDrop > COMPLETION_DROP_THRESHOLD) {
      regressions.push(
        `${latestSummary.configId}: task completion rate dropped by ${completionDrop.toFixed(2)}%`
      );
    }

    if (latencyIncrease > LATENCY_INCREASE_THRESHOLD) {
      regressions.push(
        `${latestSummary.configId}: latency increased by ${latencyIncrease}ms`
      );
    }

    if (hallucinationIncrease > HALLUCINATION_INCREASE_THRESHOLD) {
      regressions.push(
        `${latestSummary.configId}: hallucination incidents increased by ${hallucinationIncrease}`
      );
    }

    if (retriesIncrease > RETRIES_INCREASE_THRESHOLD) {
      regressions.push(
        `${latestSummary.configId}: retries per task increased by ${retriesIncrease.toFixed(2)}`
      );
    }
  }

  if (regressions.length > 0) {
    console.error('Eval regression gate failed:');
    for (const regression of regressions) {
      console.error(` - ${regression}`);
    }
    process.exit(1);
  }

  console.log('Eval regression gate passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
