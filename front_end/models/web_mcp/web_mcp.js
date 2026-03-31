var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/web_mcp/WebMCPModel.js
var WebMCPModel_exports = {};
__export(WebMCPModel_exports, {
  Tool: () => Tool,
  WebMCPModel: () => WebMCPModel
});
import * as SDK from "./../../core/sdk/sdk.js";
import * as Bindings from "./../bindings/bindings.js";
var Tool = class {
  #protocolTool;
  #stackTrace;
  #target;
  constructor(tool, target) {
    this.#target = new WeakRef(target);
    this.#protocolTool = tool;
    this.#stackTrace = tool.stackTrace && Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createStackTraceFromProtocolRuntime(tool.stackTrace, target);
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
    return this.#target.deref()?.model(SDK.ResourceTreeModel.ResourceTreeModel)?.frameForId(this.#protocolTool.frameId) ?? void 0;
  }
  get isDeclarative() {
    return Boolean(this.#protocolTool.backendNodeId);
  }
  get node() {
    const target = this.#target.deref();
    return this.#protocolTool.backendNodeId && target && new SDK.DOMModel.DeferredDOMNode(target, this.#protocolTool.backendNodeId);
  }
};
var WebMCPModel = class extends SDK.SDKModel.SDKModel {
  #tools = /* @__PURE__ */ new Map();
  #calls = /* @__PURE__ */ new Map();
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
    return this.#tools.values().flatMap((toolMap) => toolMap.values());
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
        this.dispatchEventToListeners("ToolsRemoved", toolsToRemove);
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
    this.dispatchEventToListeners("ToolsRemoved", deletedTools);
  }
  toolsAdded(params) {
    const addedTools = [];
    for (const protocolTool of params.tools) {
      const tool = new Tool(protocolTool, this.target());
      const frameTools = this.#tools.get(protocolTool.frameId) ?? /* @__PURE__ */ new Map();
      if (!this.#tools.has(protocolTool.frameId)) {
        this.#tools.set(protocolTool.frameId, frameTools);
      }
      frameTools.set(tool.name, tool);
      addedTools.push(tool);
    }
    this.dispatchEventToListeners("ToolsAdded", addedTools);
  }
  toolInvoked(params) {
    const tool = this.#tools.get(params.frameId)?.get(params.toolName);
    if (!tool) {
      return;
    }
    const call = {
      invocationId: params.invocationId,
      input: params.input,
      tool
    };
    this.#calls.set(params.invocationId, call);
    this.dispatchEventToListeners("ToolInvoked", call);
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
      exception: params.exception
    };
    this.dispatchEventToListeners("ToolResponded", call);
  }
};
SDK.SDKModel.SDKModel.register(WebMCPModel, { capabilities: 2097152, autostart: true });
export {
  WebMCPModel_exports as WebMCPModel
};
//# sourceMappingURL=web_mcp.js.map
