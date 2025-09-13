// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { ToolSurfaceProvider } from './ToolSurfaceProvider.js';
import type { AgentState } from './State.js';
import type { Tool } from '../tools/Tools.js';
import { ToolRegistry } from '../agent_framework/ConfigurableAgentTool.js';
import { MCPRegistry } from '../mcp/MCPRegistry.js';
import { registerMCPMetaTools } from '../mcp/MCPMetaTools.js';

/* eslint-env mocha */

class DummyTool implements Tool<Record<string, unknown>, unknown> {
  constructor(public name: string, public description: string) {}
  schema = { type: 'object', properties: {} };
  async execute(): Promise<unknown> { return { ok: true, name: this.name }; }
}

describe('ToolSurfaceProvider selection', () => {
  let mockLocalStorage: Map<string, string>;
  let originalGetStatus: typeof MCPRegistry.getStatus;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = new Map();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => mockLocalStorage.get(key) || null,
        setItem: (key: string, value: string) => mockLocalStorage.set(key, value),
        removeItem: (key: string) => mockLocalStorage.delete(key),
        clear: () => mockLocalStorage.clear(),
      },
      writable: true,
    });

    // Enable MCP in config
    localStorage.setItem('ai_chat_mcp_enabled', 'true');

    // Save original MCPRegistry.getStatus
    originalGetStatus = MCPRegistry.getStatus.bind(MCPRegistry);

    // Clear registry state for deterministic tests
    // No explicit clear API; test registers use unique names
  });

  afterEach(() => {
    // Restore MCPRegistry.getStatus
    (MCPRegistry as any).getStatus = originalGetStatus;
    mockLocalStorage.clear();
  });

  it('router mode selects top-K MCP tools by simple relevance and enforces caps', async () => {
    // Arrange router config and caps
    localStorage.setItem('ai_chat_mcp_tool_mode', 'router');
    const maxMcpPerTurn = '2';
    const maxToolsPerTurn = '4';
    localStorage.setItem('ai_chat_mcp_max_mcp_per_turn', maxMcpPerTurn);
    localStorage.setItem('ai_chat_mcp_max_tools_per_turn', maxToolsPerTurn);

    // Register dummy MCP tools in ToolRegistry
    const mcpToolNames = [
      'mcp:default:alpha',
      'mcp:default:beta',
      'mcp:default:gamma'
    ];
    ToolRegistry.registerToolFactory(mcpToolNames[0], () => new DummyTool(mcpToolNames[0], 'Alpha compute util'));
    ToolRegistry.registerToolFactory(mcpToolNames[1], () => new DummyTool(mcpToolNames[1], 'Beta helper'));
    ToolRegistry.registerToolFactory(mcpToolNames[2], () => new DummyTool(mcpToolNames[2], 'Gamma helper'));

    // Stub MCP registry status to advertise these tools
    (MCPRegistry as any).getStatus = () => ({
      enabled: true,
      servers: [],
      registeredToolNames: mcpToolNames,
      lastError: undefined,
      lastErrorType: undefined,
    });

    // Base tools for the agent
    const baseTools: Tool[] = [new DummyTool('core_tool_A', 'Core A'), new DummyTool('core_tool_B', 'Core B')];

    // Query mentions alpha to bias selection toward alpha
    const state: AgentState = {
      messages: [{ entity: 0 as any, text: 'please run alpha operation' }],
      context: {},
      selectedAgentType: 'deep-research' as any
    } as any;

    // Act
    const selection = await ToolSurfaceProvider.select(state, baseTools, { maxMcpPerTurn: 2, maxToolsPerTurn: 4 });

    const names = selection.tools.map(t => t.name);

    // Assert caps
    assert.ok(names.includes('core_tool_A'));
    assert.ok(names.includes('core_tool_B'));
    const selectedMcp = names.filter(n => n.startsWith('mcp:default:'));
    assert.strictEqual(selectedMcp.length, 2);
    // Alpha should be preferred due to query match
    assert.ok(selectedMcp.includes('mcp:default:alpha'));
  });

  it('meta mode surfaces only meta-tools plus base tools', async () => {
    // Arrange meta config
    localStorage.setItem('ai_chat_mcp_tool_mode', 'meta');
    localStorage.setItem('ai_chat_mcp_max_mcp_per_turn', '8');
    localStorage.setItem('ai_chat_mcp_max_tools_per_turn', '6');

    // Register meta tools
    registerMCPMetaTools();

    // Also register some MCP tools
    const mcpToolNames = ['mcp:default:delta'];
    ToolRegistry.registerToolFactory(mcpToolNames[0], () => new DummyTool(mcpToolNames[0], 'Delta'));
    (MCPRegistry as any).getStatus = () => ({
      enabled: true,
      servers: [],
      registeredToolNames: mcpToolNames,
      lastError: undefined,
      lastErrorType: undefined,
    });

    const baseTools: Tool[] = [new DummyTool('core_tool_A', 'Core A')];
    const state: AgentState = { messages: [], context: {}, selectedAgentType: 'deep-research' as any } as any;

    const selection = await ToolSurfaceProvider.select(state, baseTools, { maxMcpPerTurn: 8, maxToolsPerTurn: 6 });

    const names = selection.tools.map(t => t.name);
    assert.ok(names.includes('core_tool_A'));
    assert.ok(names.includes('mcp.search'));
    assert.ok(names.includes('mcp.invoke'));
    // Should NOT include raw MCP tool(s) in meta mode
    assert.isFalse(names.includes('mcp:default:delta'));
  });
});
