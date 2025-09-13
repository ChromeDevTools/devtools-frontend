import type { Tool } from '../tools/Tools.js';
import { createLogger } from '../core/Logger.js';
import type { MCPClient, MCPToolDef } from '../../../third_party/mcp-sdk/mcp-sdk.js';

const logger = createLogger('MCPToolAdapter');

export class MCPToolAdapter implements Tool<Record<string, unknown>, unknown> {
  name: string;
  description: string;
  schema: any;

  constructor(
    private serverId: string,
    private client: MCPClient,
    private def: MCPToolDef,
    private displayName?: string,
  ) {
    this.name = this.displayName || def.name;
    this.description = def.description;
    // Pass through the MCP tool's input schema as-is. MCP servers provide a valid JSON Schema
    // for the tool arguments (type: 'object', properties: { ... }, required: [...] ).
    // The LLM providers expect a proper JSON Schema at the `parameters` field, not nested under `properties`.
    // If the schema is missing or malformed, fall back to a minimal object schema.
    const schema = def.inputSchema as any;
    if (schema && typeof schema === 'object') {
      this.schema = schema;
    } else {
      this.schema = { type: 'object', properties: {} };
    }
  }

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const sanitized = this.sanitize(args);
    logger.info('Executing MCP tool', { name: this.name, serverId: this.serverId, args: sanitized });
    return this.client.callTool(this.serverId, this.def.name, args, { timeoutMs: 30000 });
  }

  // Expose metadata for discovery/search
  getServerId(): string { return this.serverId; }
  getOriginalToolName(): string { return this.def.name; }

  private sanitize(input: Record<string, unknown>): Record<string, unknown> {
    const sensitive = ['token', 'api_key', 'password', 'secret', 'authorization'];
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input || {})) {
      if (typeof v === 'string' && sensitive.some(s => k.toLowerCase().includes(s))) {
        out[k] = '[redacted]';
      } else {
        out[k] = v;
      }
    }
    return out;
  }
}
