// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Bindings from '../../../models/bindings/bindings.js';
import * as SourceMapScopes from '../../../models/source_map_scopes/source_map_scopes.js';
import * as Trace from '../../../models/trace/trace.js';
import * as Workspace from '../../../models/workspace/workspace.js';

type ResolvedCodeLocationData = {
  name: string|null,
  devtoolsLocation: Workspace.UISourceCode.UILocation|null,
};
export class SourceMappingsUpdated extends Event {
  static readonly eventName = 'sourcemappingsupdated';

  constructor() {
    super(SourceMappingsUpdated.eventName, {
      composed: true,
      bubbles: true,
    });
  }
}

// Resolved code location data is keyed based on
// ProcessID=>ThreadID=> Call frame key.
// The code location key is created as a concatenation of its fields.
export const resolvedCodeLocationDataNames:
    Map<Trace.Types.Events.ProcessID, Map<Trace.Types.Events.ThreadID, Map<string, ResolvedCodeLocationData|null>>> =
        new Map();

export class SourceMapsResolver extends EventTarget {
  #parsedTrace: Trace.Handlers.Types.ParsedTrace;

  #isResolving = false;

  // We need to gather up a list of all the DebuggerModels that we should
  // listen to for source map attached events. For most pages this will be
  // the debugger model for the primary page target, but if a trace has
  // workers, we would also need to gather up the DebuggerModel instances for
  // those workers too.
  #debuggerModelsToListen = new Set<SDK.DebuggerModel.DebuggerModel>();

  constructor(parsedTrace: Trace.Handlers.Types.ParsedTrace) {
    super();
    this.#parsedTrace = parsedTrace;
  }

  static clearResolvedNodeNames(): void {
    resolvedCodeLocationDataNames.clear();
  }
  static keyForCodeLocation(callFrame: Protocol.Runtime.CallFrame): string {
    return `${callFrame.url}$$$${callFrame.scriptId}$$$${callFrame.functionName}$$$${callFrame.lineNumber}$$$${
        callFrame.columnNumber}`;
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
   */
  static resolvedCodeLocationForEntry(entry: Trace.Types.Events.Event): ResolvedCodeLocationData|null {
    let callFrame = null;
    if (Trace.Types.Events.isProfileCall(entry)) {
      callFrame = entry.callFrame;
    } else {
      const stackTrace = Trace.Helpers.Trace.getZeroIndexedStackTraceForEvent(entry);
      if (stackTrace === null || stackTrace.length < 1) {
        return null;
      }
      callFrame = stackTrace[0];
    }
    const codeLocationKey = this.keyForCodeLocation(callFrame as Protocol.Runtime.CallFrame);
    return resolvedCodeLocationDataNames.get(entry.pid)?.get(entry.tid)?.get(codeLocationKey) ?? null;
  }

  static resolvedURLForEntry(parsedTrace: Trace.Handlers.Types.ParsedTrace, entry: Trace.Types.Events.Event):
      Platform.DevToolsPath.UrlString|null {
    const resolvedCallFrameURL =
        SourceMapsResolver.resolvedCodeLocationForEntry(entry)?.devtoolsLocation?.uiSourceCode.url();
    if (resolvedCallFrameURL) {
      return resolvedCallFrameURL;
    }
    // If no source mapping was found for an entry's URL, then default
    // to the URL value contained in the event itself, if any.
    const url = Trace.Extras.URLForEntry.getNonResolved(parsedTrace, entry);
    if (url) {
      return Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(url)?.url() ?? url;
    }
    return null;
  }

  static storeResolvedNodeDataForEntry(
      pid: Trace.Types.Events.ProcessID, tid: Trace.Types.Events.ThreadID, callFrame: Protocol.Runtime.CallFrame,
      resolvedCodeLocationData: ResolvedCodeLocationData): void {
    const resolvedForPid = resolvedCodeLocationDataNames.get(pid) ||
        new Map<Trace.Types.Events.ThreadID, Map<string, ResolvedCodeLocationData|null>>();
    const resolvedForTid = resolvedForPid.get(tid) || new Map<string, ResolvedCodeLocationData|null>();
    const keyForCallFrame = this.keyForCodeLocation(callFrame);
    resolvedForTid.set(keyForCallFrame, resolvedCodeLocationData);
    resolvedForPid.set(tid, resolvedForTid);
    resolvedCodeLocationDataNames.set(pid, resolvedForPid);
  }

  async install(): Promise<void> {
    for (const threadToProfileMap of this.#parsedTrace.Samples.profilesInProcess.values()) {
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
      debuggerModel.sourceMapManager().addEventListener(
          SDK.SourceMapManager.Events.SourceMapAttached, () => this.#onAttachedSourceMap(), this);
    }

    // Although we have added listeners for SourceMapAttached events, we also
    // immediately try to resolve function names. This ensures we use any
    // sourcemaps that were attached before we bound our event listener.
    await this.#resolveMappingsForProfileNodes();
  }

  /**
   * Removes the event listeners and stops tracking newly added sourcemaps.
   * Should be called before destroying an instance of this class to avoid leaks
   * with listeners.
   */
  uninstall(): void {
    for (const debuggerModel of this.#debuggerModelsToListen) {
      debuggerModel.sourceMapManager().removeEventListener(
          SDK.SourceMapManager.Events.SourceMapAttached, () => this.#onAttachedSourceMap(), this);
    }
    this.#debuggerModelsToListen.clear();
  }

  async #resolveMappingsForProfileNodes(): Promise<void> {
    for (const [pid, threadsInProcess] of this.#parsedTrace.Samples.profilesInProcess) {
      for (const [tid, threadProfile] of threadsInProcess) {
        const nodes = threadProfile.parsedProfile.nodes() ?? [];
        const target = this.#targetForThread(tid);
        if (!target) {
          continue;
        }
        for (const node of nodes) {
          const resolvedFunctionName =
              await SourceMapScopes.NamesResolver.resolveProfileFrameFunctionName(node.callFrame, target);
          node.setFunctionName(resolvedFunctionName);

          const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
          const location = debuggerModel &&
              new SDK.DebuggerModel.Location(
                  debuggerModel, node.callFrame.scriptId, node.callFrame.lineNumber, node.callFrame.columnNumber);
          const uiLocation = location &&
              await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(
                  location);

          SourceMapsResolver.storeResolvedNodeDataForEntry(
              pid, tid, node.callFrame, {name: resolvedFunctionName, devtoolsLocation: uiLocation});
        }
      }
    }
    this.dispatchEvent(new SourceMappingsUpdated());
  }

  #onAttachedSourceMap(): void {
    // Exit if we are already resolving so that we batch requests; if pages
    // have a lot of sourcemaps we can get a lot of events at once.
    if (this.#isResolving) {
      return;
    }

    this.#isResolving = true;
    // Resolving names triggers a repaint of the flame chart. Instead of attempting to resolve
    // names every time a source map is attached, wait for some time once the first source map is
    // attached. This way we allow for other source maps to be parsed before attempting a name
    // resolving using the available source maps. Otherwise the UI is blocked when the number
    // of source maps is particularly large.
    setTimeout(async () => {
      this.#isResolving = false;
      await this.#resolveMappingsForProfileNodes();
    }, 500);
  }

  // Figure out the target for the node. If it is in a worker thread,
  // that is the target, otherwise we use the primary page target.
  #targetForThread(tid: Trace.Types.Events.ThreadID): SDK.Target.Target|null {
    const maybeWorkerId = this.#parsedTrace.Workers.workerIdByThread.get(tid);
    if (maybeWorkerId) {
      return SDK.TargetManager.TargetManager.instance().targetById(maybeWorkerId);
    }
    return SDK.TargetManager.TargetManager.instance().primaryPageTarget();
  }
}
