// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as Common from '../common/common.js';

import {Events as RuntimeModelEvents, type ExecutionContext, RuntimeModel} from './RuntimeModel.js';
import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';

export const enum Events {
  TOOLS_ADDED = 'ToolsAdded',
  TOOLS_REMOVED = 'ToolsRemoved',
  TOOL_INVOKED = 'ToolInvoked',
  TOOL_RESPONDED = 'ToolResponded',
}

export interface Call {
  invocationId: string;
  input: string;
  tool: Protocol.WebMCP.Tool;
  result?: {
    status: Protocol.WebMCP.InvocationStatus,
    output?: unknown,
    errorText?: string,
    exception?: Protocol.Runtime.RemoteObject,
  };
}

export interface EventTypes {
  [Events.TOOLS_ADDED]: ReadonlyArray<Readonly<Protocol.WebMCP.Tool>>;
  [Events.TOOLS_REMOVED]: ReadonlyArray<Readonly<Protocol.WebMCP.Tool>>;
  [Events.TOOL_INVOKED]: Call;
  [Events.TOOL_RESPONDED]: Call;
}

export class WebMCPModel extends SDKModel<EventTypes> {
  readonly #tools = new Map<Protocol.Page.FrameId, Map<string, Protocol.WebMCP.Tool>>();
  readonly #calls = new Map<string, Call>();
  readonly agent: ProtocolProxyApi.WebMCPApi;
  #enabled = false;

  constructor(target: Target) {
    super(target);
    this.agent = target.webMCPAgent();
    target.registerWebMCPDispatcher(new WebMCPDispatcher(this));

    const runtimeModel = target.model(RuntimeModel);
    if (runtimeModel) {
      runtimeModel.addEventListener(
          RuntimeModelEvents.ExecutionContextDestroyed, this.#executionContextDestroyed, this);
    }

    void this.enable();
  }

  get tools(): IteratorObject<Protocol.WebMCP.Tool> {
    return this.#tools.values().flatMap(toolMap => toolMap.values());
  }

  get toolCalls(): Call[] {
    return [...this.#calls.values()];
  }

  clearCalls(): void {
    this.#calls.clear();
  }

  async enable(): Promise<void> {
    if (this.#enabled) {
      return;
    }
    await this.agent.invoke_enable();
    this.#enabled = true;
  }

  #executionContextDestroyed(event: Common.EventTarget.EventTargetEvent<ExecutionContext>): void {
    const executionContext = event.data;
    if (executionContext.isDefault && executionContext.frameId) {
      const frameTools = this.#tools.get(executionContext.frameId);
      if (frameTools) {
        const toolsToRemove = [...frameTools.values()];
        this.#tools.delete(executionContext.frameId);
        this.dispatchEventToListeners(Events.TOOLS_REMOVED, toolsToRemove);
      }
    }
  }

  onToolsRemoved(tools: Protocol.WebMCP.Tool[]): void {
    const deletedTools = tools.filter(tool => this.#tools.get(tool.frameId)?.delete(tool.name));
    this.dispatchEventToListeners(Events.TOOLS_REMOVED, deletedTools);
  }

  onToolsAdded(tools: Protocol.WebMCP.Tool[]): void {
    for (const tool of tools) {
      const frameTools = this.#tools.get(tool.frameId) ?? new Map();
      if (!this.#tools.has(tool.frameId)) {
        this.#tools.set(tool.frameId, frameTools);
      }
      frameTools.set(tool.name, tool);
    }
    this.dispatchEventToListeners(Events.TOOLS_ADDED, tools);
  }

  toolInvoked(params: Protocol.WebMCP.ToolInvokedEvent): void {
    const tool = this.#tools.get(params.frameId)?.get(params.toolName);
    if (!tool) {
      return;
    }
    const call: Call = {
      invocationId: params.invocationId,
      input: params.input,
      tool,
    };
    this.#calls.set(params.invocationId, call);
    this.dispatchEventToListeners(Events.TOOL_INVOKED, call);
  }

  toolResponded(params: Protocol.WebMCP.ToolRespondedEvent): void {
    const call = this.#calls.get(params.invocationId);
    if (!call) {
      return;
    }
    call.result = {
      status: params.status,
      output: params.output,
      errorText: params.errorText,
      exception: params.exception,
    };
    this.dispatchEventToListeners(Events.TOOL_RESPONDED, call);
  }
}

class WebMCPDispatcher implements ProtocolProxyApi.WebMCPDispatcher {
  readonly #model: WebMCPModel;
  constructor(model: WebMCPModel) {
    this.#model = model;
  }

  toolsAdded(params: Protocol.WebMCP.ToolsAddedEvent): void {
    this.#model.onToolsAdded(params.tools);
  }

  toolsRemoved(params: Protocol.WebMCP.ToolsRemovedEvent): void {
    this.#model.onToolsRemoved(params.tools);
  }

  toolInvoked(params: Protocol.WebMCP.ToolInvokedEvent): void {
    this.#model.toolInvoked(params);
  }

  toolResponded(params: Protocol.WebMCP.ToolRespondedEvent): void {
    this.#model.toolResponded(params);
  }
}

SDKModel.register(WebMCPModel, {capabilities: Capability.WEB_MCP, autostart: true});
