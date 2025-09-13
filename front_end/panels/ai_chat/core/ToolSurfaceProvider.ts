// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { AgentState } from './State.js';
import { createLogger } from './Logger.js';
import type { Tool } from '../tools/Tools.js';
import { ToolRegistry } from '../agent_framework/ConfigurableAgentTool.js';
import { MCPRegistry } from '../mcp/MCPRegistry.js';
import { getMCPConfig } from '../mcp/MCPConfig.js';
import { MCPToolAdapter } from '../mcp/MCPToolAdapter.js';

const logger = createLogger('ToolSurfaceProvider');

export interface ToolSelectionOptions {
  maxToolsPerTurn?: number;
  maxMcpPerTurn?: number;
}

function uniqByName(tools: Tool<any, any>[]): Tool<any, any>[] {
  const seen = new Set<string>();
  const out: Tool<any, any>[] = [];
  for (const t of tools) {
    if (!seen.has(t.name)) {
      seen.add(t.name);
      out.push(t);
    }
  }
  return out;
}

function getAllMcpTools(): Tool<any, any>[] {
  try {
    const status = MCPRegistry.getStatus();
    console.log('[TOOL_SELECTION_DEBUG] MCPRegistry status:', {
      enabled: status.enabled,
      serverCount: status.servers.length,
      servers: status.servers,
      registeredToolNames: status.registeredToolNames,
      lastError: status.lastError,
      lastErrorType: status.lastErrorType
    });
    
    const tools: Tool<any, any>[] = [];
    for (const name of status.registeredToolNames) {
      const tool = ToolRegistry.getRegisteredTool(name);
      if (tool) {
        tools.push(tool);
      } else {
        console.log('[TOOL_SELECTION_DEBUG] Tool registered but not found:', name);
      }
    }
    console.log('[TOOL_SELECTION_DEBUG] getAllMcpTools result:', {
      availableToolsCount: tools.length,
      availableToolNames: tools.map(t => t.name)
    });
    return tools;
  } catch (error) {
    console.error('[TOOL_SELECTION_DEBUG] Error in getAllMcpTools:', error);
    return [];
  }
}

function scoreTool(query: string, agentType: string | null | undefined, tool: Tool<any, any>): number {
  const q = (query || '').toLowerCase();
  const a = (agentType || '').toLowerCase();
  const name = (tool.name || '').toLowerCase();
  const desc = (tool.description || '').toLowerCase();
  let score = 0;
  if (q && name.includes(q)) score += 10;
  if (q && desc.includes(q)) score += 3;
  if (a && name.includes(a)) score += 2;
  if (a && desc.includes(a)) score += 1;
  // Prefer MCP tools only slightly lower than strong name matches
  if (tool instanceof MCPToolAdapter) score += 0.5;
  return score;
}

// DEBUG: Add a utility function to test MCP modes from console
(globalThis as any).debugToolSelection = {
  getCurrentMCPConfig: () => {
    const cfg = getMCPConfig();
    console.log('Current MCP Config:', cfg);
    return cfg;
  },
  testMode: async (mode: 'all' | 'router' | 'meta') => {
    const originalConfig = getMCPConfig();
    console.log(`Testing mode: ${mode}`);
    // Temporarily set the mode
    localStorage.setItem('ai_chat_mcp_tool_mode', mode);
    // Test with mock state
    const mockState = {
      selectedAgentType: 'deep-research',
      messages: [{ entity: 'user' as const, text: 'test query' }]
    } as any;
    const mockBaseTools: any[] = [];
    const result = await ToolSurfaceProvider.select(mockState, mockBaseTools);
    // Restore original mode
    if (originalConfig.toolMode) {
      localStorage.setItem('ai_chat_mcp_tool_mode', originalConfig.toolMode);
    }
    console.log(`Mode ${mode} result:`, result);
    return result;
  },
  getMCPRegistryStatus: () => {
    const status = MCPRegistry.getStatus();
    console.log('MCP Registry Status:', status);
    return status;
  }
};

export const ToolSurfaceProvider = {
  async select(state: AgentState, baseTools: Tool<any, any>[], opts?: ToolSelectionOptions): Promise<{ tools: Tool<any, any>[]; selectedNames: string[] }> {
    const { maxToolsPerTurn = 20, maxMcpPerTurn = 8 } = opts || {};
    const cfg = getMCPConfig();
    const mode = cfg.toolMode || 'router';

    // DEBUG: Log current MCP configuration and tool selection parameters
    console.log('[TOOL_SELECTION_DEBUG] ToolSurfaceProvider.select called with:', {
      maxToolsPerTurn,
      maxMcpPerTurn,
      mcpConfig: cfg,
      toolMode: mode,
      baseToolsCount: baseTools.length,
      baseToolNames: baseTools.map(t => t.name),
      selectedAgentType: state.selectedAgentType
    });

    // Start from provided baseTools (curated per-agent), not global registry
    let resultTools: Tool<any, any>[] = uniqByName([...baseTools]);
    const selectedNames: string[] = [];

    console.log('[TOOL_SELECTION_DEBUG] Base tools provided:', {
      agentType: state.selectedAgentType,
      baseToolsCount: baseTools.length,
      baseToolNames: baseTools.map(t => t.name)
    });

    if (!cfg.enabled) {
      console.log('[TOOL_SELECTION_DEBUG] MCP disabled, returning core tools only');
      const uniq = uniqByName(resultTools).slice(0, maxToolsPerTurn);
      console.log('[TOOL_SELECTION_DEBUG] Final result (MCP disabled):', {
        toolCount: uniq.length,
        toolNames: uniq.map(t => t.name)
      });
      return { tools: uniq, selectedNames: uniq.map(t => t.name) };
    }

    if (mode === 'all') {
      console.log('[TOOL_SELECTION_DEBUG] Using ALL mode');
      const mcpTools = getAllMcpTools();
      console.log('[TOOL_SELECTION_DEBUG] MCP tools found:', {
        mcpToolsCount: mcpTools.length,
        mcpToolNames: mcpTools.map(t => t.name)
      });
      resultTools = uniqByName([...resultTools, ...mcpTools]).slice(0, maxToolsPerTurn);
      console.log('[TOOL_SELECTION_DEBUG] Final result (ALL mode):', {
        toolCount: resultTools.length,
        toolNames: resultTools.map(t => t.name)
      });
      return { tools: resultTools, selectedNames: resultTools.map(t => t.name) };
    }

    if (mode === 'meta') {
      console.log('[TOOL_SELECTION_DEBUG] Using META mode');
      // Include only meta-tools for MCP alongside core tools
      const search = ToolRegistry.getRegisteredTool('mcp.search');
      const invoke = ToolRegistry.getRegisteredTool('mcp.invoke');
      const metaTools = [search, invoke].filter(Boolean) as Tool<any, any>[];
      console.log('[TOOL_SELECTION_DEBUG] Meta tools found:', {
        metaToolsCount: metaTools.length,
        metaToolNames: metaTools.map(t => t.name),
        searchTool: !!search,
        invokeTool: !!invoke
      });
      resultTools = uniqByName([...resultTools, ...metaTools]).slice(0, maxToolsPerTurn);
      console.log('[TOOL_SELECTION_DEBUG] Final result (META mode):', {
        toolCount: resultTools.length,
        toolNames: resultTools.map(t => t.name)
      });
      return { tools: resultTools, selectedNames: resultTools.map(t => t.name) };
    }

    // Router mode (heuristic pre-call selection)
    console.log('[TOOL_SELECTION_DEBUG] Using ROUTER mode');
    const mcpTools = getAllMcpTools();
    console.log('[TOOL_SELECTION_DEBUG] MCP tools available for scoring:', {
      mcpToolsCount: mcpTools.length,
      mcpToolNames: mcpTools.map(t => t.name)
    });
    
    const lastUserMsg = [...state.messages].reverse().find(m => m.entity === 'user' || (m as any).entity === 0) as any;
    const queryText = lastUserMsg?.text || '';
    console.log('[TOOL_SELECTION_DEBUG] Query text for scoring:', queryText);

    const scored = mcpTools
      .map(t => ({ t, s: scoreTool(queryText, state.selectedAgentType, t) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, maxMcpPerTurn)
      .map(({ t }) => t);

    console.log('[TOOL_SELECTION_DEBUG] Top scored MCP tools:', {
      scoredToolsCount: scored.length,
      scoredToolNames: scored.map(t => t.name),
      maxMcpPerTurn
    });

    resultTools = uniqByName([...resultTools, ...scored]).slice(0, maxToolsPerTurn);
    console.log('[TOOL_SELECTION_DEBUG] Final result (ROUTER mode):', {
      toolCount: resultTools.length,
      toolNames: resultTools.map(t => t.name),
      maxToolsPerTurn
    });
    return { tools: resultTools, selectedNames: resultTools.map(t => t.name) };
  }
};
