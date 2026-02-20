import { FunctionDeclaration, Type } from '@google/genai';
import { McpServer, McpToolDefinition } from '../types';

const MCP_SERVERS_KEY = 'echo-mcp-servers';

interface JsonRpcResponse<T> {
    result?: T;
    error?: { code: number; message: string; data?: unknown };
}

interface ToolsListResult {
    tools?: Array<{
        name: string;
        description?: string;
        inputSchema?: Record<string, any>;
    }>;
}

interface McpInitializeResult {
    capabilities?: Record<string, unknown>;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getAuthHeaders = (server: McpServer): Record<string, string> => {
    if (server.auth.type === 'bearer' && server.auth.token) {
        return { Authorization: `Bearer ${server.auth.token}` };
    }
    if (server.auth.type === 'header' && server.auth.headerName && server.auth.token) {
        return { [server.auth.headerName]: server.auth.token };
    }
    return {};
};

const normalizeMcpSchemaType = (schemaType?: string): Type => {
    switch (schemaType) {
        case 'boolean': return Type.BOOLEAN;
        case 'number':
        case 'integer': return Type.NUMBER;
        case 'array': return Type.ARRAY;
        case 'object': return Type.OBJECT;
        case 'string':
        default:
            return Type.STRING;
    }
};

const convertJsonSchemaToGenAiSchema = (schema?: Record<string, any>): any => {
    if (!schema || typeof schema !== 'object') {
        return { type: Type.OBJECT, properties: {} };
    }

    const schemaType = normalizeMcpSchemaType(schema.type);

    if (schemaType === Type.OBJECT) {
        const properties = Object.entries(schema.properties || {}).reduce<Record<string, any>>((acc, [key, value]) => {
            const typedValue = value as Record<string, any>;
            acc[key] = {
                type: normalizeMcpSchemaType(typedValue.type),
                description: typedValue.description,
                enum: typedValue.enum,
                items: typedValue.items ? convertJsonSchemaToGenAiSchema(typedValue.items) : undefined,
            };
            return acc;
        }, {});

        return {
            type: Type.OBJECT,
            properties,
            required: Array.isArray(schema.required) ? schema.required : [],
        };
    }

    if (schemaType === Type.ARRAY) {
        return {
            type: Type.ARRAY,
            items: convertJsonSchemaToGenAiSchema(schema.items),
        };
    }

    return {
        type: schemaType,
        description: schema.description,
        enum: schema.enum,
    };
};

const jsonRpcCall = async <T>(server: McpServer, method: string, params: Record<string, any> = {}): Promise<T> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= server.retryCount; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), server.timeoutMs);

        try {
            const response = await fetch(server.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(server),
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: `${server.id}-${Date.now()}-${attempt}`,
                    method,
                    params,
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json() as JsonRpcResponse<T>;
            if (data.error) {
                throw new Error(data.error.message || `MCP call failed with code ${data.error.code}`);
            }

            if (!data.result) {
                throw new Error(`MCP method '${method}' returned no result`);
            }

            return data.result;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < server.retryCount) {
                await sleep(250 * (attempt + 1));
            }
        } finally {
            clearTimeout(timeout);
        }
    }

    throw new Error(`MCP request '${method}' failed for ${server.name}: ${lastError?.message || 'unknown error'}`);
};

export const getMcpServers = (): McpServer[] => {
    try {
        const raw = localStorage.getItem(MCP_SERVERS_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (error) {
        console.error('Failed to parse MCP servers from storage', error);
        return [];
    }
};

export const saveMcpServers = (servers: McpServer[]) => {
    localStorage.setItem(MCP_SERVERS_KEY, JSON.stringify(servers));
};

export const discoverServer = async (server: McpServer): Promise<McpServer> => {
    try {
        const initResult = await jsonRpcCall<McpInitializeResult>(server, 'initialize', {
            protocolVersion: '2024-11-05',
            clientInfo: { name: 'ECHOMEN', version: '1.0.0' },
        });

        const listResult = await jsonRpcCall<ToolsListResult>(server, 'tools/list');
        const capabilities = [
            ...Object.keys(initResult.capabilities || {}),
            listResult.tools?.length ? `tools:${listResult.tools.length}` : 'tools:0',
        ];

        return {
            ...server,
            status: 'connected',
            capabilities,
            lastCheckedAt: new Date().toISOString(),
        };
    } catch (error) {
        return {
            ...server,
            status: 'degraded',
            capabilities: [],
            lastCheckedAt: new Date().toISOString(),
        };
    }
};

export const listToolsForServer = async (server: McpServer): Promise<McpToolDefinition[]> => {
    const result = await jsonRpcCall<ToolsListResult>(server, 'tools/list');
    return (result.tools || []).map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
    }));
};

export const executeMcpTool = async (server: McpServer, toolName: string, args: Record<string, unknown>): Promise<unknown> => {
    const result = await jsonRpcCall<{ content?: unknown; structuredContent?: unknown }>(server, 'tools/call', {
        name: toolName,
        arguments: args,
    });

    return result.structuredContent ?? result.content ?? result;
};

export const createMcpFunctionDeclaration = (server: McpServer, tool: McpToolDefinition): FunctionDeclaration => ({
    name: `mcp__${server.id}__${tool.name}`,
    description: `[MCP:${server.name}] ${tool.description || 'Remote MCP tool.'}`,
    parameters: convertJsonSchemaToGenAiSchema(tool.inputSchema),
});

export const runMcpHealthChecks = async (servers: McpServer[]): Promise<McpServer[]> => {
    const updated = await Promise.all(servers.map(server => discoverServer(server)));
    saveMcpServers(updated);
    return updated;
};
