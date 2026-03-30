// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../bindings/bindings.js';
import type * as StackTrace from '../stack_trace/stack_trace.js';

export const enum Events {
  TOOLS_ADDED = 'ToolsAdded',
  TOOLS_REMOVED = 'ToolsRemoved',
  TOOL_INVOKED = 'ToolInvoked',
  TOOL_RESPONDED = 'ToolResponded',
}

export interface Call {
  invocationId: string;
  tool: Tool;
  input: string;
  result?: {
    status: Protocol.WebMCP.InvocationStatus,
    output?: unknown,
    errorText?: string,
    exception?: Protocol.Runtime.RemoteObject,
  };
}

export class Tool {
  #protocolTool: Readonly<Protocol.WebMCP.Tool>;
  #stackTrace?: Promise<StackTrace.StackTrace.StackTrace>;
  #target: WeakRef<SDK.Target.Target>;

  constructor(tool: Protocol.WebMCP.Tool, target: SDK.Target.Target) {
    this.#target = new WeakRef(target);
    this.#protocolTool = tool;
    this.#stackTrace = tool.stackTrace &&
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createStackTraceFromProtocolRuntime(
            tool.stackTrace, target);
  }

  get stackTrace(): Promise<StackTrace.StackTrace.StackTrace>|undefined {
    return this.#stackTrace;
  }

  get name(): string {
    return this.#protocolTool.name;
  }

  get description(): string {
    return this.#protocolTool.description;
  }

  get frame(): SDK.ResourceTreeModel.ResourceTreeFrame|undefined {
    return this.#target.deref()
               ?.model(SDK.ResourceTreeModel.ResourceTreeModel)
               ?.frameForId(this.#protocolTool.frameId) ??
        undefined;
  }

  get isDeclarative(): boolean {
    return Boolean(this.#protocolTool.backendNodeId);
  }

  get node(): SDK.DOMModel.DeferredDOMNode|undefined {
    const target = this.#target.deref();
    return this.#protocolTool.backendNodeId && target &&
        new SDK.DOMModel.DeferredDOMNode(target, this.#protocolTool.backendNodeId);
  }
}
export interface EventTypes {
  [Events.TOOLS_ADDED]: readonly Tool[];
  [Events.TOOLS_REMOVED]: readonly Tool[];
  [Events.TOOL_INVOKED]: Call;
  [Events.TOOL_RESPONDED]: Call;
}

export class WebMCPModel extends SDK.SDKModel.SDKModel<EventTypes> implements ProtocolProxyApi.WebMCPDispatcher {
  readonly #tools = new Map<Protocol.Page.FrameId, Map<string, Tool>>();
  readonly #calls = new Map<string, Call>();
  readonly agent: ProtocolProxyApi.WebMCPApi;
  #enabled = false;

  constructor(target: SDK.Target.Target) {
    super(target);
    this.agent = target.webMCPAgent();
    target.registerWebMCPDispatcher(this);

    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    if (runtimeModel) {
      runtimeModel.addEventListener(
          SDK.RuntimeModel.Events.ExecutionContextDestroyed, this.#executionContextDestroyed, this);
    }

    void this.enable();
  }

  get tools(): IteratorObject<Tool> {
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

  #executionContextDestroyed(event: Common.EventTarget.EventTargetEvent<SDK.RuntimeModel.ExecutionContext>): void {
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

  toolsRemoved(params: Protocol.WebMCP.ToolsRemovedEvent): void {
    const deletedTools = [];
    for (const protocolTool of params.tools) {
      const tool = this.#tools.get(protocolTool.frameId)?.get(protocolTool.name);
      if (tool) {
        this.#tools.get(protocolTool.frameId)?.delete(protocolTool.name);
        deletedTools.push(tool);
      }
    }
    this.dispatchEventToListeners(Events.TOOLS_REMOVED, deletedTools);
  }

  toolsAdded(params: Protocol.WebMCP.ToolsAddedEvent): void {
    const addedTools = [];
    for (const protocolTool of params.tools) {
      const tool = new Tool(protocolTool, this.target());
      const frameTools = this.#tools.get(protocolTool.frameId) ?? new Map();
      if (!this.#tools.has(protocolTool.frameId)) {
        this.#tools.set(protocolTool.frameId, frameTools);
      }
      frameTools.set(tool.name, tool);
      addedTools.push(tool);
    }
    this.dispatchEventToListeners(Events.TOOLS_ADDED, addedTools);
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

SDK.SDKModel.SDKModel.register(WebMCPModel, {capabilities: SDK.Target.Capability.WEB_MCP, autostart: true});
