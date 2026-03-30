// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget, describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';

import * as WebMCP from './web_mcp.js';

function createTool(name: string, frameId: Protocol.Page.FrameId): Protocol.WebMCP.Tool {
  return {
    name,
    description: `Description for ${name}`,
    inputSchema: {type: 'object'},
    frameId,
  };
}

describeWithEnvironment('WebMCPModel', () => {
  let target: SDK.Target.Target;
  let webMCPModel: WebMCP.WebMCPModel.WebMCPModel;

  beforeEach(() => {
    updateHostConfig({devToolsWebMCPSupport: {enabled: true}});
    target = createTarget();
    const model = target.model(WebMCP.WebMCPModel.WebMCPModel);
    assert.isNotNull(model);
    webMCPModel = model;
  });

  it('initially has no tools', () => {
    assert.isEmpty([...webMCPModel.tools]);
  });

  it('updates tools and dispatches event on toolsAdded', async () => {
    const toolsAddedPromise = webMCPModel.once(WebMCP.WebMCPModel.Events.TOOLS_ADDED);

    const tool = createTool('test-tool', 'frame-1' as Protocol.Page.FrameId);

    webMCPModel.toolsAdded({tools: [tool]});

    // Check state
    const tools = [...webMCPModel.tools];
    assert.lengthOf(tools, 1);
    assert.strictEqual(tools[0].name, tool.name);

    // Check event
    const eventTools = await toolsAddedPromise;
    assert.strictEqual(eventTools[0].name, tool.name);
  });

  it('updates tools and dispatches event on toolsRemoved', async () => {
    const tool1 = createTool('test-tool-1', 'frame-1' as Protocol.Page.FrameId);
    const tool2 = createTool('test-tool-2', 'frame-1' as Protocol.Page.FrameId);

    webMCPModel.toolsAdded({tools: [tool1, tool2]});
    assert.lengthOf([...webMCPModel.tools], 2);

    const toolsRemovedPromise = webMCPModel.once(WebMCP.WebMCPModel.Events.TOOLS_REMOVED);

    webMCPModel.toolsRemoved({tools: [tool1]});

    // Check state
    const tools = [...webMCPModel.tools];
    assert.lengthOf(tools, 1);
    assert.strictEqual(tools[0].name, tool2.name);

    // Check event
    const eventTools = await toolsRemovedPromise;
    assert.strictEqual(eventTools[0].name, tool1.name);
  });

  it('cleans up tools when the corresponding execution context is destroyed', async () => {
    const tool1 = createTool('test-tool', 'frame-1' as Protocol.Page.FrameId);
    const tool2 = createTool('test-tool', 'frame-2' as Protocol.Page.FrameId);

    webMCPModel.toolsAdded({tools: [tool1, tool2]});
    assert.lengthOf([...webMCPModel.tools], 2);

    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.isNotNull(runtimeModel);

    const toolsRemovedPromise = webMCPModel.once(WebMCP.WebMCPModel.Events.TOOLS_REMOVED);

    const executionContext = {
      isDefault: true,
      frameId: 'frame-1' as Protocol.Page.FrameId,
    } as SDK.RuntimeModel.ExecutionContext;

    runtimeModel.dispatchEventToListeners(SDK.RuntimeModel.Events.ExecutionContextDestroyed, executionContext);

    // Check state - should only have tool2
    const tools = [...webMCPModel.tools];
    assert.lengthOf(tools, 1);
    assert.strictEqual(tools[0].name, tool2.name);

    // Check event
    const eventTools = await toolsRemovedPromise;
    assert.strictEqual(eventTools[0].name, tool1.name);
  });

  it('clears the call log when clearCalls is called', async () => {
    const tool = createTool('test-tool', 'frame-1' as Protocol.Page.FrameId);
    webMCPModel.toolsAdded({tools: [tool]});

    const toolInvokedPromise = webMCPModel.once(WebMCP.WebMCPModel.Events.TOOL_INVOKED);
    const invokedEvent: Protocol.WebMCP.ToolInvokedEvent = {
      toolName: 'test-tool',
      frameId: 'frame-1' as Protocol.Page.FrameId,
      invocationId: '1',
      input: 'test input',
    };
    webMCPModel.toolInvoked(invokedEvent);
    await toolInvokedPromise;

    assert.lengthOf(webMCPModel.toolCalls, 1);

    webMCPModel.clearCalls();

    assert.isEmpty(webMCPModel.toolCalls);
  });
});
