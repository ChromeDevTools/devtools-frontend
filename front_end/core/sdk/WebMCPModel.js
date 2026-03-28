// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { Events as RuntimeModelEvents, RuntimeModel } from './RuntimeModel.js';
import { SDKModel } from './SDKModel.js';
export class WebMCPModel extends SDKModel {
    #tools = new Map();
    #calls = new Map();
    agent;
    #enabled = false;
    constructor(target) {
        super(target);
        this.agent = target.webMCPAgent();
        target.registerWebMCPDispatcher(new WebMCPDispatcher(this));
        const runtimeModel = target.model(RuntimeModel);
        if (runtimeModel) {
            runtimeModel.addEventListener(RuntimeModelEvents.ExecutionContextDestroyed, this.#executionContextDestroyed, this);
        }
        void this.enable();
    }
    get tools() {
        return this.#tools.values().flatMap(toolMap => toolMap.values());
    }
    get toolCalls() {
        return [...this.#calls.values()];
    }
    clearCalls() {
        this.#calls.clear();
    }
    async enable() {
        if (this.#enabled) {
            return;
        }
        await this.agent.invoke_enable();
        this.#enabled = true;
    }
    #executionContextDestroyed(event) {
        const executionContext = event.data;
        if (executionContext.isDefault && executionContext.frameId) {
            const frameTools = this.#tools.get(executionContext.frameId);
            if (frameTools) {
                const toolsToRemove = [...frameTools.values()];
                this.#tools.delete(executionContext.frameId);
                this.dispatchEventToListeners("ToolsRemoved" /* Events.TOOLS_REMOVED */, toolsToRemove);
            }
        }
    }
    onToolsRemoved(tools) {
        const deletedTools = tools.filter(tool => this.#tools.get(tool.frameId)?.delete(tool.name));
        this.dispatchEventToListeners("ToolsRemoved" /* Events.TOOLS_REMOVED */, deletedTools);
    }
    onToolsAdded(tools) {
        for (const tool of tools) {
            const frameTools = this.#tools.get(tool.frameId) ?? new Map();
            if (!this.#tools.has(tool.frameId)) {
                this.#tools.set(tool.frameId, frameTools);
            }
            frameTools.set(tool.name, tool);
        }
        this.dispatchEventToListeners("ToolsAdded" /* Events.TOOLS_ADDED */, tools);
    }
    toolInvoked(params) {
        const tool = this.#tools.get(params.frameId)?.get(params.toolName);
        if (!tool) {
            return;
        }
        const call = {
            invocationId: params.invocationId,
            input: params.input,
            tool,
        };
        this.#calls.set(params.invocationId, call);
        this.dispatchEventToListeners("ToolInvoked" /* Events.TOOL_INVOKED */, call);
    }
    toolResponded(params) {
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
        this.dispatchEventToListeners("ToolResponded" /* Events.TOOL_RESPONDED */, call);
    }
}
class WebMCPDispatcher {
    #model;
    constructor(model) {
        this.#model = model;
    }
    toolsAdded(params) {
        this.#model.onToolsAdded(params.tools);
    }
    toolsRemoved(params) {
        this.#model.onToolsRemoved(params.tools);
    }
    toolInvoked(params) {
        this.#model.toolInvoked(params);
    }
    toolResponded(params) {
        this.#model.toolResponded(params);
    }
}
SDKModel.register(WebMCPModel, { capabilities: 2097152 /* Capability.WEB_MCP */, autostart: true });
//# sourceMappingURL=WebMCPModel.js.map