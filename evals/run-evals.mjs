import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TASKS_DIR = path.join(__dirname, 'tasks');
const CONFIGS_FILE = path.join(__dirname, 'configs', 'providers.json');
const RESULTS_DIR = path.join(__dirname, 'results');
const HISTORY_FILE = path.join(RESULTS_DIR, 'history.json');
const LATEST_FILE = path.join(RESULTS_DIR, 'latest.json');
const LEADERBOARD_FILE = path.join(RESULTS_DIR, 'leaderboard.json');
const TRENDS_FILE = path.join(RESULTS_DIR, 'trends.json');

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function seededRandom(seedText) {
  let hash = 0;
  for (let index = 0; index < seedText.length; index += 1) {
    hash = (hash * 31 + seedText.charCodeAt(index)) >>> 0;
  }

  return () => {
    hash = (1664525 * hash + 1013904223) >>> 0;
    return hash / 0xffffffff;
  };
}

async function runPromptWithOptionalRouter({ prompt, config, attempt }) {
  const routerUrl = process.env.EVAL_ROUTER_URL;
  if (routerUrl) {
    const start = performance.now();
    const response = await fetch(routerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.EVAL_ROUTER_API_KEY
          ? { Authorization: `Bearer ${process.env.EVAL_ROUTER_API_KEY}` }
          : {})
      },
      body: JSON.stringify({ prompt, config, attempt })
    });

    if (!response.ok) {
      throw new Error(`Router call failed (${response.status}) for ${config.id}`);
    }

    const payload = await response.json();
    return {
      output: payload.output ?? '',
      latencyMs: performance.now() - start
    };
  }

  const random = seededRandom(`${config.id}:${prompt}:${attempt}`);
  const latencyMs = Math.round(300 + random() * 1000);
  const quality = random();

  let output = `${config.provider} (${config.model}) response for: ${prompt}`;
  if (quality > 0.15) output += ' Includes React and performance context with practical recommendations.';
  if (quality < 0.12) output += ' Mentions HTTP/4 as a standard.';

  return { output, latencyMs };
}

function evaluateResponse(task, output) {
  const normalized = output.toLowerCase();
  const completionPass = task.mustInclude.every((term) => normalized.includes(term.toLowerCase()));
  const hallucinationIncident = task.hallucinationTriggers.some((term) => normalized.includes(term.toLowerCase()));
  return { completionPass, hallucinationIncident };
}

function summarizeConfiguration(configId, evaluations) {
  const total = evaluations.length;
  const completed = evaluations.filter((entry) => entry.completionPass).length;
  const hallucinations = evaluations.filter((entry) => entry.hallucinationIncident).length;
  const totalRetries = evaluations.reduce((sum, entry) => sum + entry.retriesUsed, 0);
  const latencyAvgMs = Math.round(
    evaluations.reduce((sum, entry) => sum + entry.latencyMs, 0) / Math.max(total, 1)
  );

  return {
    configId,
    totalTasks: total,
    taskCompletionRate: Number(((completed / Math.max(total, 1)) * 100).toFixed(2)),
    retriesPerTask: Number((totalRetries / Math.max(total, 1)).toFixed(2)),
    hallucinationIncidents: hallucinations,
    latencyAvgMs
  };
}

async function loadTasks() {
  const taskFiles = ['code.json', 'web.json', 'docs.json'];
  const allTasks = await Promise.all(taskFiles.map((file) => readJson(path.join(TASKS_DIR, file))));
  return allTasks.flat();
}

async function loadHistory() {
  try {
    return await readJson(HISTORY_FILE);
  } catch {
    return [];
  }
}

function buildTrends(history) {
  const byConfig = {};
  for (const run of history) {
    for (const summary of run.summaries) {
      byConfig[summary.configId] ??= [];
      byConfig[summary.configId].push({
        runId: run.runId,
        timestamp: run.timestamp,
        taskCompletionRate: summary.taskCompletionRate,
        retriesPerTask: summary.retriesPerTask,
        hallucinationIncidents: summary.hallucinationIncidents,
        latencyAvgMs: summary.latencyAvgMs
      });
    }
  }
  return byConfig;
}

function buildLeaderboard(summaries) {
  return [...summaries].sort((a, b) => {
    if (b.taskCompletionRate !== a.taskCompletionRate) {
      return b.taskCompletionRate - a.taskCompletionRate;
    }
    if (a.hallucinationIncidents !== b.hallucinationIncidents) {
      return a.hallucinationIncidents - b.hallucinationIncidents;
    }
    return a.latencyAvgMs - b.latencyAvgMs;
  });
}

async function main() {
  await mkdir(RESULTS_DIR, { recursive: true });

  const [tasks, configs, history] = await Promise.all([loadTasks(), readJson(CONFIGS_FILE), loadHistory()]);
  const runId = `eval-${Date.now()}`;
  const timestamp = new Date().toISOString();

  const evaluations = [];

  for (const config of configs) {
    for (const task of tasks) {
      let finalOutput = '';
      let latencyMs = 0;
      let retriesUsed = 0;
      let completionPass = false;
      let hallucinationIncident = false;

      for (let attempt = 0; attempt <= config.retries; attempt += 1) {
        const result = await runPromptWithOptionalRouter({ prompt: task.prompt, config, attempt });
        finalOutput = result.output;
        latencyMs += result.latencyMs;

        const evaluation = evaluateResponse(task, finalOutput);
        completionPass = evaluation.completionPass;
        hallucinationIncident = evaluation.hallucinationIncident;

        if (completionPass && !hallucinationIncident) {
          retriesUsed = attempt;
          break;
        }

        retriesUsed = attempt;
      }

      evaluations.push({
        configId: config.id,
        provider: config.provider,
        router: config.router,
        model: config.model,
        taskId: task.id,
        category: task.category,
        completionPass,
        retriesUsed,
        hallucinationIncident,
        latencyMs,
        outputSample: finalOutput.slice(0, 160)
      });
    }
  }

  const summaries = configs.map((config) =>
    summarizeConfiguration(
      config.id,
      evaluations.filter((entry) => entry.configId === config.id)
    )
  );

  const runPayload = { runId, timestamp, summaries, evaluations };
  const updatedHistory = [...history, runPayload];
  const leaderboard = buildLeaderboard(summaries);
  const trends = buildTrends(updatedHistory);

  await Promise.all([
    writeFile(LATEST_FILE, JSON.stringify(runPayload, null, 2)),
    writeFile(HISTORY_FILE, JSON.stringify(updatedHistory, null, 2)),
    writeFile(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2)),
    writeFile(TRENDS_FILE, JSON.stringify(trends, null, 2))
  ]);

  console.log(`Run ${runId} completed. Leaderboard saved to ${LEADERBOARD_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
