import { SkillTelemetryEvent } from '../types';

const TELEMETRY_STORAGE_KEY = 'echo-skill-telemetry';

export const recordSkillTelemetry = (event: SkillTelemetryEvent) => {
  const history = JSON.parse(localStorage.getItem(TELEMETRY_STORAGE_KEY) || '[]') as SkillTelemetryEvent[];
  history.push(event);
  localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(history.slice(-200)));
};

export const getSkillTelemetrySummary = () => {
  const history = JSON.parse(localStorage.getItem(TELEMETRY_STORAGE_KEY) || '[]') as SkillTelemetryEvent[];
  if (history.length === 0) {
    return {
      totalRuns: 0,
      completionRate: 0,
      avgLatencyMs: 0,
      avgTokenCost: 0,
    };
  }

  const completed = history.filter((item) => item.completed).length;
  const totalLatency = history.reduce((sum, item) => sum + item.latencyMs, 0);
  const totalCost = history.reduce((sum, item) => sum + item.tokenCost, 0);

  return {
    totalRuns: history.length,
    completionRate: completed / history.length,
    avgLatencyMs: Math.round(totalLatency / history.length),
    avgTokenCost: Math.round(totalCost / history.length),
  };
};
