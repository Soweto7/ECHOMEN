import { ModelProviderConfig, RoutingSettings, FallbackFailureReason } from '../types';

export interface ModelSelectionResult {
    primary: ModelProviderConfig;
    fallbackChain: ModelProviderConfig[];
}

const DEFAULT_PRICE = 1;
const DEFAULT_LATENCY = 1500;
const DEFAULT_QUALITY = 0.6;

const safeNumber = (value: number | undefined, fallback: number): number => {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const estimateTotalPricePerMillion = (provider: ModelProviderConfig): number => {
    const input = safeNumber(provider.config.input_cost_per_1m_tokens_usd, DEFAULT_PRICE);
    const output = safeNumber(provider.config.output_cost_per_1m_tokens_usd, DEFAULT_PRICE);
    return input + output;
};

const scoreProvider = (provider: ModelProviderConfig, settings: RoutingSettings): number => {
    const totalPrice = estimateTotalPricePerMillion(provider);
    const latency = safeNumber(provider.config.avg_latency_ms, DEFAULT_LATENCY);
    const quality = safeNumber(provider.config.quality_score, DEFAULT_QUALITY);

    switch (settings.policy) {
        case 'CHEAPEST_FIRST':
            return -totalPrice;
        case 'LATENCY_FIRST':
            return -latency;
        case 'QUALITY_FIRST':
            return quality;
        case 'HYBRID': {
            const weights = settings.hybridWeights ?? { cost: 0.4, latency: 0.3, quality: 0.3 };
            const normalizedCost = 1 / Math.max(totalPrice, 0.0001);
            const normalizedLatency = 1 / Math.max(latency, 1);
            return (normalizedCost * weights.cost) + (normalizedLatency * weights.latency) + (quality * weights.quality);
        }
        default:
            return quality;
    }
};

export const selectProviderWithPolicy = (
    providers: ModelProviderConfig[],
    settings: RoutingSettings,
    preferredModelName?: string
): ModelSelectionResult | null => {
    const enabled = providers.filter(p => p.enabled);
    if (enabled.length === 0) return null;

    const preferred = preferredModelName
        ? enabled.filter(p => p.config.model_name === preferredModelName)
        : enabled;

    const ranked = [...(preferred.length > 0 ? preferred : enabled)]
        .sort((a, b) => scoreProvider(b, settings) - scoreProvider(a, settings));

    return {
        primary: ranked[0],
        fallbackChain: ranked.slice(1),
    };
};

export const classifyProviderFailure = (error: unknown): FallbackFailureReason => {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (message.includes('timeout') || message.includes('timed out')) return 'timeout';
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('forbidden') || message.includes('api key')) return 'auth';
    if (message.includes('quota') || message.includes('rate limit') || message.includes('exceeded')) return 'quota';
    if (message.includes('json') || message.includes('malformed') || message.includes('schema')) return 'malformed_output';
    return 'unknown';
};

export const estimateCostUsd = (provider: ModelProviderConfig, inputTokens: number, outputTokens: number): number => {
    const inputPrice = safeNumber(provider.config.input_cost_per_1m_tokens_usd, 0);
    const outputPrice = safeNumber(provider.config.output_cost_per_1m_tokens_usd, 0);

    return ((inputTokens / 1_000_000) * inputPrice) + ((outputTokens / 1_000_000) * outputPrice);
};
