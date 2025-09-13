// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { Tool } from '../tools/Tools.js';
import { createLogger } from '../core/Logger.js';
import { MCPRegistry } from './MCPRegistry.js';
import { MCPToolAdapter } from './MCPToolAdapter.js';
import { LLMClient } from '../LLM/LLMClient.js';
import { AIChatPanel } from '../ui/AIChatPanel.js';

const logger = createLogger('MCPMetaTools');

export class MCPMetaSearchTool implements Tool<{ query: string; k?: number; strategy?: 'heuristic' | 'llm' | 'hybrid'; serverId?: string | string[]; tags?: string[] }, { tools: Array<{ key: string; name: string; description: string; serverId: string }> }> {
  name = 'mcp.search';
  description = 'Search discovered MCP tools by relevance to a query and return top candidates.';
  schema = {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'User intent or query describing desired capability' },
      k: { type: 'number', description: 'Max results to return (default 8)' },
      strategy: { type: 'string', description: 'heuristic | llm | hybrid (heuristic default)' },
      serverId: { type: 'string', description: 'Filter by serverId (or array of ids)' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags for filtering (unused in MVP)' },
    },
    required: ['query'],
  };

  private async rankWithLLM(candidates: Array<{ key: string; name: string; description: string; serverId: string }>, query: string, k: number): Promise<Array<{ key: string; name: string; description: string; serverId: string }>> {
    try {
      const { model, provider } = AIChatPanel.getNanoModelWithProvider();
      const llm = LLMClient.getInstance();

      const systemPrompt = `You are ranking MCP tools for a separate assistant. Given a user query and candidate tools, return the most relevant tool keys (max ${k}). Prefer exact/near-match names and descriptions; penalize off-domain tools.`;
      
      const candidateList = candidates.map(c => ({
        key: c.key,
        name: c.name,
        description: c.description
      }));

      const userMessage = JSON.stringify({
        query,
        k,
        candidates: candidateList
      });

      const response = await llm.call({
        provider,
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        systemPrompt: systemPrompt,
        // Use standard function-calling tool shape expected by providers
        tools: [{
          type: 'function',
          function: {
            name: 'select_tools',
            description: 'Select the most relevant tools',
            parameters: {
              type: 'object',
              properties: {
                selected: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of selected tool keys',
                  maxItems: k
                },
                rationale: {
                  type: 'string',
                  description: 'Brief explanation for selections'
                }
              },
              required: ['selected']
            }
          }
        }]
      });

      if (!response.functionCall) {
        throw new Error('No function call in LLM response');
      }

      const functionCall = response.functionCall;
      const selectedKeys = (functionCall.arguments as any)?.selected || [];
      
      // Return candidates in the order selected by LLM, filtering to only selected keys
      const selectedSet = new Set(selectedKeys);
      return candidates.filter(c => selectedSet.has(c.key));
      
    } catch (err) {
      logger.warn('LLM ranking failed, falling back to heuristic', err);
      // Fallback to heuristic ranking
      return this.rankHeuristic(candidates, query, k);
    }
  }

  private rankHeuristic(candidates: Array<{ key: string; name: string; description: string; serverId: string }>, query: string, k: number): Array<{ key: string; name: string; description: string; serverId: string }> {
    const q = query.toLowerCase();
    return candidates
      .map(c => {
        const n = c.name.toLowerCase();
        const d = (c.description || '').toLowerCase();
        let s = 0;
        if (q && n.includes(q)) s += 10;
        if (q && d.includes(q)) s += 3;
        return { c, s };
      })
      .sort((a, b) => b.s - a.s)
      .slice(0, k)
      .map(({ c }) => c);
  }

  async execute(args: { query: string; k?: number; strategy?: 'heuristic' | 'llm' | 'hybrid'; serverId?: string | string[]; tags?: string[] }): Promise<{ tools: Array<{ key: string; name: string; description: string; serverId: string }> }> {
    const status = MCPRegistry.getStatus();
    const allow = new Set(status.registeredToolNames || []);
    const k = Math.max(1, Math.min(64, Math.floor(args.k ?? 8)));
    const serverFilter = Array.isArray(args.serverId) ? new Set(args.serverId) : args.serverId ? new Set([args.serverId]) : null;
    const q = (args.query || '').toLowerCase();

    // Build candidates from registered MCP tools
    const candidates: Array<{ key: string; name: string; description: string; serverId: string }> = [];
    const { ToolRegistry } = await import('../agent_framework/ConfigurableAgentTool.js');
    for (const key of allow) {
      if (!key.startsWith('mcp:')) continue;
      if (serverFilter) {
        const serverId = key.split(':')[1] || '';
        if (!serverFilter.has(serverId)) continue;
      }
      const tool = ToolRegistry.getRegisteredTool(key);
      if (!tool) continue;
      if (tool instanceof MCPToolAdapter) {
        const serverId = tool.getServerId();
        const name = tool.getOriginalToolName();
        const description = tool.description || '';
        candidates.push({ key, name, description, serverId });
      }
    }

    // Choose ranking strategy
    const strategy = args.strategy || 'heuristic';
    let rankedTools: Array<{ key: string; name: string; description: string; serverId: string }>;

    switch (strategy) {
      case 'llm':
        rankedTools = await this.rankWithLLM(candidates, args.query, k);
        break;
      case 'hybrid':
        // For hybrid: use heuristic pre-filtering then LLM ranking on top candidates
        const prefilterLimit = Math.min(candidates.length, k * 5); // 5x expansion for LLM to choose from
        const prefiltered = this.rankHeuristic(candidates, args.query, prefilterLimit);
        rankedTools = prefiltered.length <= k ? prefiltered : await this.rankWithLLM(prefiltered, args.query, k);
        break;
      default: // 'heuristic'
        rankedTools = this.rankHeuristic(candidates, args.query, k);
        break;
    }

    return { tools: rankedTools };
  }
}

export class MCPMetaInvokeTool implements Tool<{ serverId: string; toolName: string; args?: Record<string, unknown> }, unknown> {
  name = 'mcp.invoke';
  description = 'Invoke a specific MCP tool by serverId and toolName with provided arguments.';
  schema = {
    type: 'object',
    properties: {
      serverId: { type: 'string', description: 'Server identifier (namespace)' },
      toolName: { type: 'string', description: 'Original MCP tool name (not namespaced)' },
      args: { type: 'object', description: 'Arguments for the tool', additionalProperties: true },
    },
    required: ['serverId', 'toolName'],
  };

  async execute(args: { serverId: string; toolName: string; args?: Record<string, unknown> }): Promise<unknown> {
    const key = `mcp:${args.serverId}:${args.toolName}`;
    const status = MCPRegistry.getStatus();
    if (!status.registeredToolNames.includes(key)) {
      throw new Error(`MCP tool not available or not allowlisted: ${key}`);
    }
    const { ToolRegistry } = await import('../agent_framework/ConfigurableAgentTool.js');
    const tool = ToolRegistry.getRegisteredTool(key);
    if (!tool) {
      throw new Error(`MCP tool not registered: ${key}`);
    }
    return tool.execute(args.args || {});
  }
}

export function registerMCPMetaTools(): void {
  // Defer import of ToolRegistry to avoid circular init during module load
  (async () => {
    try {
      const { ToolRegistry } = await import('../agent_framework/ConfigurableAgentTool.js');
      ToolRegistry.registerToolFactory('mcp.search', () => new MCPMetaSearchTool());
      ToolRegistry.registerToolFactory('mcp.invoke', () => new MCPMetaInvokeTool());
    } catch (e) {
      logger.warn('Failed to register MCP meta-tools', e);
    }
  })();
}
