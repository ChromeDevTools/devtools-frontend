// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { Client as MCPSDKClient } from './package/dist/client/index.js';
import { SSEClientTransport } from './package/dist/client/sse.js';
import type { Transport } from './package/dist/shared/transport.js';
import type { Request, RequestId } from './package/dist/types.js';

// Simple logger for this module - we can't use the DevTools logger from third_party
const logger = {
  info: (...args: any[]) => console.log('[MCPClientSDK]', ...args),
  warn: (...args: any[]) => console.warn('[MCPClientSDK]', ...args),
  error: (...args: any[]) => console.error('[MCPClientSDK]', ...args),
  debug: (...args: any[]) => console.debug('[MCPClientSDK]', ...args),
};

export interface MCPServer {
  id: string;
  endpoint: string;
  token?: string;
}

export interface MCPToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

interface Connection {
  server: MCPServer;
  connected: boolean;
  client: MCPSDKClient;
  transport: Transport;
}

// Custom transport for DevTools that uses fetch with eventsource-parser for SSE handling
class DevToolsStreamableTransport implements Transport {
  private url: URL;
  private token?: string;
  private abortController: AbortController | null = null;
  
  // Transport interface callbacks
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: Request, extra?: any) => void;
  sessionId?: string;

  constructor(endpoint: string, token?: string) {
    this.url = new URL(endpoint);
    this.token = token;
    
    // Convert SSE endpoints to streamable HTTP endpoints
    if (this.url.pathname.endsWith('/sse')) {
      this.url.pathname = this.url.pathname.replace('/sse', '/mcp');
    }
  }

  async start(): Promise<void> {
    logger.info('Starting DevTools transport', { endpoint: this.url.toString() });
    // Transport initialization handled by SDK
  }

  async send(message: Request, options?: any): Promise<void> {
    logger.debug('Sending message via DevTools transport', { message });
    // In practice, this would send the message via fetch POST
    // For now, throw to indicate this fallback transport is not fully implemented
    throw new Error('DevToolsStreamableTransport.send() not implemented - use SDK transport instead');
  }

  async close(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    
    if (this.onclose) {
      this.onclose();
    }
  }
}

export class MCPClientSDK {
  private connections = new Map<string, Connection>();

  async connect(server: MCPServer): Promise<void> {
    logger.info('Connecting to MCP server using SDK', { endpoint: server.endpoint });

    // Create transport - prefer streamable HTTP for better browser compatibility
    let transport: Transport;
    
    try {
      // Use SSE transport for connecting to MCP servers
      transport = new SSEClientTransport(new URL(server.endpoint));
    } catch (error) {
      // Fallback to our custom transport if SDK transport fails
      logger.warn('SDK transport failed, using custom transport', { error });
      transport = new DevToolsStreamableTransport(server.endpoint, server.token);
    }

    // Create SDK client
    const client = new MCPSDKClient(
      {
        name: 'chrome-devtools',
        version: '1.0.0',
      },
      {
        capabilities: {}
      }
    );

    try {
      await client.connect(transport);
      
      const connection: Connection = {
        server,
        connected: true,
        client,
        transport,
      };
      
      this.connections.set(server.id, connection);
      logger.info('Connected to MCP server via SDK', { serverId: server.id });
      
    } catch (error) {
      logger.error('Failed to connect via SDK', { error, endpoint: server.endpoint });
      throw error;
    }
  }

  disconnect(serverId: string): void {
    const connection = this.connections.get(serverId);
    if (!connection) {
      return;
    }

    logger.info('Disconnecting MCP server', { serverId });
    
    try {
      connection.transport.close();
    } catch (error) {
      logger.warn('Error closing transport', { error });
    }
    
    this.connections.delete(serverId);
  }

  isConnected(serverId: string): boolean {
    return this.connections.get(serverId)?.connected === true;
  }

  async listTools(serverId: string): Promise<MCPToolDef[]> {
    const connection = this.connections.get(serverId);
    if (!connection) {
      throw new Error(`No connection for server ${serverId}`);
    }

    try {
      logger.debug('Listing tools via SDK', { serverId });
      const result = await connection.client.listTools();
      
      // Convert SDK response to our format
      const tools: MCPToolDef[] = (result.tools || []).map((tool: any) => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema || {},
      }));

      logger.info('Listed tools via SDK', { serverId, toolCount: tools.length });
      return tools;
      
    } catch (error) {
      logger.error('Failed to list tools via SDK', { serverId, error });
      throw new Error(`Failed to list tools: ${error instanceof Error ? error.message : error}`);
    }
  }

  setCachedTools(serverId: string, tools: MCPToolDef[]): void {
    // SDK handles tool caching internally
    logger.debug('setCachedTools called (SDK handles caching)', { serverId, toolCount: tools.length });
  }

  async callTool<T = unknown>(
    serverId: string, 
    name: string, 
    args: any, 
    _opts?: { timeoutMs?: number }
  ): Promise<T> {
    const connection = this.connections.get(serverId);
    if (!connection) {
      throw new Error(`No connection for server ${serverId}`);
    }

    try {
      logger.debug('Calling tool via SDK', { serverId, toolName: name, args });
      
      const result = await connection.client.callTool({
        name,
        arguments: args ?? {},
      });
      
      logger.info('Tool call successful via SDK', { serverId, toolName: name });
      return result as T;
      
    } catch (error) {
      logger.error('Tool call failed via SDK', { serverId, toolName: name, error });
      throw error;
    }
  }
}

// Export the SDK client as default to replace the current MCPClient
export { MCPClientSDK as MCPClient };