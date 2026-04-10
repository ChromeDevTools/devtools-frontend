// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../bindings/bindings.js';
import * as StackTrace from '../stack_trace/stack_trace.js';
export class Result {
    status;
    output;
    errorText;
    // TODO(crbug.com/494516094) Clean this up if the target disappears?
    #exception;
    #exceptionDetails;
    constructor(status, output, errorText, exception) {
        this.status = status;
        this.errorText = errorText;
        this.#exception = exception;
        this.output = output;
    }
    get exceptionDetails() {
        if (!this.#exceptionDetails) {
            this.#exceptionDetails = this.#resolveExceptionDetails(this.#exception);
        }
        return this.#exceptionDetails;
    }
    async #resolveExceptionDetails(errorObj) {
        if (!errorObj) {
            return undefined;
        }
        const error = SDK.RemoteObject.RemoteError.objectAsError(errorObj);
        const [details, cause] = await Promise.all([error.exceptionDetails(), error.cause()]);
        const description = error.errorStack;
        const frames = StackTrace.ErrorStackParser.parseSourcePositionsFromErrorStack(errorObj.runtimeModel(), error.errorStack) || [];
        if (details?.stackTrace) {
            StackTrace.ErrorStackParser.augmentErrorStackWithScriptIds(frames, details.stackTrace);
        }
        if (cause?.subtype === 'error') {
            return { error: errorObj, description, frames, cause: await this.#resolveExceptionDetails(cause) };
        }
        if (cause?.type === 'string') {
            return {
                error: errorObj,
                description,
                frames,
                cause: {
                    error: cause,
                    description: cause.value,
                    frames: [],
                }
            };
        }
        return { error: errorObj, description, frames };
    }
}
export class Tool {
    #protocolTool;
    #stackTrace;
    #target;
    constructor(tool, target) {
        this.#target = new WeakRef(target);
        this.#protocolTool = tool;
        this.#stackTrace = tool.stackTrace &&
            Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createStackTraceFromProtocolRuntime(tool.stackTrace, target);
    }
    get stackTrace() {
        return this.#stackTrace;
    }
    get name() {
        return this.#protocolTool.name;
    }
    get description() {
        return this.#protocolTool.description;
    }
    get frame() {
        return this.#target.deref()
            ?.model(SDK.ResourceTreeModel.ResourceTreeModel)
            ?.frameForId(this.#protocolTool.frameId) ??
            undefined;
    }
    get isDeclarative() {
        return Boolean(this.#protocolTool.backendNodeId);
    }
    get node() {
        const target = this.#target.deref();
        return this.#protocolTool.backendNodeId && target &&
            new SDK.DOMModel.DeferredDOMNode(target, this.#protocolTool.backendNodeId);
    }
}
export class WebMCPModel extends SDK.SDKModel.SDKModel {
    #tools = new Map();
    #calls = new Map();
    agent;
    #enabled = false;
    constructor(target) {
        super(target);
        this.agent = target.webMCPAgent();
        target.registerWebMCPDispatcher(this);
        const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
        if (runtimeModel) {
            runtimeModel.addEventListener(SDK.RuntimeModel.Events.ExecutionContextDestroyed, this.#executionContextDestroyed, this);
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
    toolsRemoved(params) {
        const deletedTools = [];
        for (const protocolTool of params.tools) {
            const tool = this.#tools.get(protocolTool.frameId)?.get(protocolTool.name);
            if (tool) {
                this.#tools.get(protocolTool.frameId)?.delete(protocolTool.name);
                deletedTools.push(tool);
            }
        }
        this.dispatchEventToListeners("ToolsRemoved" /* Events.TOOLS_REMOVED */, deletedTools);
    }
    toolsAdded(params) {
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
        this.dispatchEventToListeners("ToolsAdded" /* Events.TOOLS_ADDED */, addedTools);
    }
    toolInvoked(params) {
        const tool = this.#tools.get(params.frameId)?.get(params.toolName);
        if (!tool) {
            return;
        }
        const call = { tool, input: params.input, invocationId: params.invocationId };
        this.#calls.set(params.invocationId, call);
        this.dispatchEventToListeners("ToolInvoked" /* Events.TOOL_INVOKED */, call);
    }
    toolResponded(params) {
        const call = this.#calls.get(params.invocationId);
        if (!call) {
            return;
        }
        const exception = params.exception && this.target().model(SDK.RuntimeModel.RuntimeModel)?.createRemoteObject(params.exception);
        call.result = new Result(params.status, params.output, params.errorText, exception);
        this.dispatchEventToListeners("ToolResponded" /* Events.TOOL_RESPONDED */, call);
    }
}
SDK.SDKModel.SDKModel.register(WebMCPModel, { capabilities: 2097152 /* SDK.Target.Capability.WEB_MCP */, autostart: true });
//# sourceMappingURL=WebMCPModel.js.map