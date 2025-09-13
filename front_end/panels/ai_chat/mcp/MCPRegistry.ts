import { createLogger } from '../core/Logger.js';
import { ToolRegistry } from '../agent_framework/ConfigurableAgentTool.js';
import * as ToolNameMap from '../core/ToolNameMap.js';
import type { MCPToolDef, MCPServer } from '../../../third_party/mcp-sdk/mcp-sdk.js';
import { MCPClient } from '../../../third_party/mcp-sdk/mcp-sdk.js';
import { getMCPConfig } from './MCPConfig.js';
import { MCPToolAdapter } from './MCPToolAdapter.js';

const logger = createLogger('MCPRegistry');

export interface MCPRegistryStatus {
  enabled: boolean;
  servers: Array<{ id: string; endpoint: string; connected: boolean; toolCount: number }>;
  registeredToolNames: string[];
  lastError?: string;
  lastErrorType?: 'connection' | 'authentication' | 'configuration' | 'network' | 'server_error' | 'unknown';
  lastConnected?: Date;
  lastDisconnected?: Date;
}

class RegistryImpl {
  private client = new MCPClient();
  private servers: MCPServer[] = [];
  private registeredTools: string[] = [];
  private lastError?: string;
  private lastErrorType?: 'connection' | 'authentication' | 'configuration' | 'network' | 'server_error' | 'unknown';
  private lastConnected?: Date;
  private lastDisconnected?: Date;

  private categorizeError(error: unknown): 'connection' | 'authentication' | 'configuration' | 'network' | 'server_error' | 'unknown' {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    if (message.includes('unauthorized') || message.includes('authentication') || message.includes('auth') || message.includes('token')) {
      return 'authentication';
    }
    if (message.includes('network') || message.includes('timeout') || message.includes('connection reset') || message.includes('econnreset')) {
      return 'network';  
    }
    if (message.includes('connection') || message.includes('connect') || message.includes('econnrefused') || message.includes('websocket')) {
      return 'connection';
    }
    if (message.includes('invalid') || message.includes('malformed') || message.includes('endpoint') || message.includes('url')) {
      return 'configuration';
    }
    if (message.includes('server error') || message.includes('internal error') || message.includes('500') || message.includes('503')) {
      return 'server_error';
    }
    return 'unknown';
  }

  private setError(error: unknown): void {
    this.lastError = error instanceof Error ? error.message : String(error);
    this.lastErrorType = this.categorizeError(error);
  }

  async init(): Promise<void> {
    const cfg = getMCPConfig();
    this.registeredTools = [];
    this.lastError = undefined;
    this.lastErrorType = undefined;
    // Reset mappings on reconnect
    ToolNameMap.clear();

    if (!cfg.enabled) {
      logger.info('MCP disabled');
      return;
    }
    if (!cfg.endpoint) {
      logger.warn('MCP endpoint not configured');
      return;
    }

    const server: MCPServer = {
      id: 'default',
      endpoint: cfg.endpoint,
      token: cfg.token,
    };
    this.servers = [server];

    try {
      await this.client.connect(server);
      this.lastConnected = new Date();
      logger.info('MCP connected', { endpoint: server.endpoint });
    } catch (err) {
      this.setError(err);
      logger.error('MCP connect failed', err);
    }
  }

  async refresh(): Promise<void> {
    const cfg = getMCPConfig();
    if (!cfg.enabled || this.servers.length === 0) {
      return;
    }
    
    // Clear previously registered tools (ToolRegistry will overwrite on re-registration)
    this.registeredTools = [];
    
    const allow = new Set(cfg.toolAllowlist || []);

    for (const srv of this.servers) {
      if (!this.client.isConnected(srv.id)) {
        continue;
      }
      let tools: MCPToolDef[] = [];
      try {
        tools = await this.client.listTools(srv.id);
      } catch (err) {
        this.setError(err);
        logger.error('listTools failed', err);
        continue;
      }

      for (const def of tools) {
        const namespaced = `mcp:${srv.id}:${def.name}`;
        // Create or reuse a stable sanitized mapping for LLM function names
        ToolNameMap.addMapping(namespaced);
        if (allow.size > 0 && !allow.has(namespaced) && !allow.has(def.name)) {
          continue;
        }
        try {
          const factoryName = namespaced;
          ToolRegistry.registerToolFactory(factoryName, () => new MCPToolAdapter(srv.id, this.client, def, namespaced));
          this.registeredTools.push(factoryName);
        } catch (err) {
          logger.error('Failed to register MCP tool', { tool: def.name, err });
        }
      }
    }
  }

  dispose(): void {
    for (const srv of this.servers) {
      try { this.client.disconnect(srv.id); } catch {}
    }
    this.lastDisconnected = new Date();
    this.servers = [];
  }

  getStatus(): MCPRegistryStatus {
    return {
      enabled: getMCPConfig().enabled,
      servers: this.servers.map(s => ({
        id: s.id,
        endpoint: s.endpoint,
        connected: this.client.isConnected(s.id),
        toolCount: 0,
      })),
      registeredToolNames: [...this.registeredTools],
      lastError: this.lastError,
      lastErrorType: this.lastErrorType,
      lastConnected: this.lastConnected,
      lastDisconnected: this.lastDisconnected,
    };
  }

  getSanitizedFunctionName(original: string): string { return ToolNameMap.getSanitized(original); }

  resolveOriginalFunctionName(sanitized: string): string | undefined { return ToolNameMap.resolveOriginal(sanitized); }
}

export const MCPRegistry = new RegistryImpl();
