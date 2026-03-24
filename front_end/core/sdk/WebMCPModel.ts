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
}

export interface EventTypes {
  [Events.TOOLS_ADDED]: ReadonlyArray<Readonly<Protocol.WebMCP.Tool>>;
  [Events.TOOLS_REMOVED]: ReadonlyArray<Readonly<Protocol.WebMCP.Tool>>;
}

export class WebMCPModel extends SDKModel<EventTypes> {
  readonly #tools = new Map<Protocol.Page.FrameId, Map<string, Protocol.WebMCP.Tool>>();
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

  toolInvoked(): void {
  }

  toolResponded(): void {
  }
}

SDKModel.register(WebMCPModel, {capabilities: Capability.WEB_MCP, autostart: true});
