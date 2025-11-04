// gen/front_end/models/trace_source_maps_resolver/SourceMapsResolver.js
import * as SDK from "./../../core/sdk/sdk.js";
import * as Bindings from "./../bindings/bindings.js";
import * as SourceMapScopes from "./../source_map_scopes/source_map_scopes.js";
import * as Trace from "./../trace/trace.js";
import * as Workspace from "./../workspace/workspace.js";
var _a;
var SourceMappingsUpdated = class _SourceMappingsUpdated extends Event {
  static eventName = "sourcemappingsupdated";
  constructor() {
    super(_SourceMappingsUpdated.eventName, { composed: true, bubbles: true });
  }
};
var resolvedCodeLocationDataNames = /* @__PURE__ */ new Map();
var SourceMapsResolver = class extends EventTarget {
  executionContextNamesByOrigin = /* @__PURE__ */ new Map();
  #parsedTrace;
  #entityMapper = null;
  #isResolving = false;
  // We need to gather up a list of all the DebuggerModels that we should
  // listen to for source map attached events. For most pages this will be
  // the debugger model for the primary page target, but if a trace has
  // workers, we would also need to gather up the DebuggerModel instances for
  // those workers too.
  #debuggerModelsToListen = /* @__PURE__ */ new Set();
  constructor(parsedTrace, entityMapper) {
    super();
    this.#parsedTrace = parsedTrace;
    this.#entityMapper = entityMapper ?? null;
  }
  static clearResolvedNodeNames() {
    resolvedCodeLocationDataNames.clear();
  }
  static keyForCodeLocation(callFrame) {
    return `${callFrame.url}$$$${callFrame.scriptId}$$$${callFrame.functionName}$$$${callFrame.lineNumber}$$$${callFrame.columnNumber}`;
  }
  /**
   * For trace events containing a call frame / source location
   * (f.e. a stack trace), attempts to obtain the resolved source
   * location based on the those that have been resolved so far from
   * listened source maps.
   *
   * Note that a single deployed URL can map to multiple authored URLs
   * (f.e. if an app is bundled). Thus, beyond a URL we can use code
   * location data like line and column numbers to obtain the specific
   * authored code according to the source mappings.
   *
   * TODO(andoli): This can return incorrect scripts if the target page has been reloaded since the trace.
   */
  static resolvedCodeLocationForCallFrame(callFrame) {
    const codeLocationKey = this.keyForCodeLocation(callFrame);
    return resolvedCodeLocationDataNames.get(codeLocationKey) ?? null;
  }
  static resolvedCodeLocationForEntry(entry) {
    let callFrame = null;
    if (Trace.Types.Events.isProfileCall(entry)) {
      callFrame = entry.callFrame;
    } else {
      const topCallFrame = Trace.Helpers.Trace.getStackTraceTopCallFrameInEventPayload(entry);
      if (!topCallFrame) {
        return null;
      }
      callFrame = topCallFrame;
    }
    return _a.resolvedCodeLocationForCallFrame(callFrame);
  }
  static resolvedURLForEntry(parsedTrace, entry) {
    const resolvedCallFrameURL = _a.resolvedCodeLocationForEntry(entry)?.devtoolsLocation?.uiSourceCode.url();
    if (resolvedCallFrameURL) {
      return resolvedCallFrameURL;
    }
    const url = Trace.Handlers.Helpers.getNonResolvedURL(entry, parsedTrace.data);
    if (url) {
      return Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(url)?.url() ?? url;
    }
    return null;
  }
  static storeResolvedCodeDataForCallFrame(callFrame, resolvedCodeLocationData) {
    const keyForCallFrame = this.keyForCodeLocation(callFrame);
    resolvedCodeLocationDataNames.set(keyForCallFrame, resolvedCodeLocationData);
  }
  async install() {
    for (const threadToProfileMap of this.#parsedTrace.data.Samples.profilesInProcess.values()) {
      for (const [tid, profile] of threadToProfileMap) {
        const nodes = profile.parsedProfile.nodes();
        if (!nodes || nodes.length === 0) {
          continue;
        }
        const target = this.#targetForThread(tid);
        const debuggerModel = target?.model(SDK.DebuggerModel.DebuggerModel);
        if (!debuggerModel) {
          continue;
        }
        for (const node of nodes) {
          const script = debuggerModel.scriptForId(String(node.callFrame.scriptId));
          const shouldListenToSourceMap = !script || script.sourceMapURL;
          if (!shouldListenToSourceMap) {
            continue;
          }
          this.#debuggerModelsToListen.add(debuggerModel);
        }
      }
    }
    for (const debuggerModel of this.#debuggerModelsToListen) {
      debuggerModel.sourceMapManager().addEventListener(SDK.SourceMapManager.Events.SourceMapAttached, this.#onAttachedSourceMap, this);
    }
    this.#updateExtensionNames();
    await this.#resolveMappingsForProfileNodes();
  }
  /**
   * Removes the event listeners and stops tracking newly added sourcemaps.
   * Should be called before destroying an instance of this class to avoid leaks
   * with listeners.
   */
  uninstall() {
    for (const debuggerModel of this.#debuggerModelsToListen) {
      debuggerModel.sourceMapManager().removeEventListener(SDK.SourceMapManager.Events.SourceMapAttached, this.#onAttachedSourceMap, this);
    }
    this.#debuggerModelsToListen.clear();
  }
  async #resolveMappingsForProfileNodes() {
    let updatedMappings = false;
    for (const [, threadsInProcess] of this.#parsedTrace.data.Samples.profilesInProcess) {
      for (const [tid, threadProfile] of threadsInProcess) {
        const nodes = threadProfile.parsedProfile.nodes() ?? [];
        const target = this.#targetForThread(tid);
        if (!target) {
          continue;
        }
        for (const node of nodes) {
          const resolvedFunctionName = await SourceMapScopes.NamesResolver.resolveProfileFrameFunctionName(node.callFrame, target);
          updatedMappings ||= Boolean(resolvedFunctionName);
          node.setOriginalFunctionName(resolvedFunctionName);
          const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
          const script = debuggerModel?.scriptForId(node.scriptId) || null;
          const location = debuggerModel && new SDK.DebuggerModel.Location(debuggerModel, node.callFrame.scriptId, node.callFrame.lineNumber, node.callFrame.columnNumber);
          const uiLocation = location && await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(location);
          updatedMappings ||= Boolean(uiLocation);
          if (uiLocation?.uiSourceCode.url() && this.#entityMapper) {
            this.#entityMapper.updateSourceMapEntities(node.callFrame, uiLocation.uiSourceCode.url());
          }
          _a.storeResolvedCodeDataForCallFrame(node.callFrame, { name: resolvedFunctionName, devtoolsLocation: uiLocation, script });
        }
      }
    }
    if (!updatedMappings) {
      return;
    }
    this.dispatchEvent(new SourceMappingsUpdated());
  }
  #onAttachedSourceMap() {
    if (this.#isResolving) {
      return;
    }
    this.#isResolving = true;
    setTimeout(async () => {
      this.#isResolving = false;
      await this.#resolveMappingsForProfileNodes();
    }, 500);
  }
  // Figure out the target for the node. If it is in a worker thread,
  // that is the target, otherwise we use the primary page target.
  #targetForThread(tid) {
    const maybeWorkerId = this.#parsedTrace.data.Workers.workerIdByThread.get(tid);
    if (maybeWorkerId) {
      return SDK.TargetManager.TargetManager.instance().targetById(maybeWorkerId);
    }
    return SDK.TargetManager.TargetManager.instance().primaryPageTarget();
  }
  #updateExtensionNames() {
    for (const runtimeModel of SDK.TargetManager.TargetManager.instance().models(SDK.RuntimeModel.RuntimeModel)) {
      for (const context of runtimeModel.executionContexts()) {
        this.executionContextNamesByOrigin.set(context.origin, context.name);
      }
    }
    this.#entityMapper?.updateExtensionEntitiesWithName(this.executionContextNamesByOrigin);
  }
};
_a = SourceMapsResolver;
export {
  SourceMappingsUpdated,
  SourceMapsResolver,
  resolvedCodeLocationDataNames
};
//# sourceMappingURL=trace_source_maps_resolver.js.map
