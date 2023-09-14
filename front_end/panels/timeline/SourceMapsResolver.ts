// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as SourceMapScopes from '../../models/source_map_scopes/source_map_scopes.js';
import type * as TraceEngine from '../../models/trace/trace.js';

export class NodeNamesUpdated extends Event {
  static readonly eventName = 'nodenamesupdated';

  constructor() {
    super(NodeNamesUpdated.eventName, {
      composed: true,
      bubbles: true,
    });
  }
}

export class SourceMapsResolver extends EventTarget {
  #traceData: TraceEngine.Handlers.Migration.PartialTraceData;

  #isResolvingNames = false;

  constructor(traceData: TraceEngine.Handlers.Migration.PartialTraceData) {
    super();
    this.#traceData = traceData;
  }

  async install(): Promise<void> {
    // Required as during the migration we might not always run the Renderer/Samples
    // handlers. Once we are fully migrated, this check can go as that data will
    // always be present.
    if (!this.#traceData.Samples) {
      return;
    }

    // We need to gather up a list of all the DebuggerModels that we should
    // listen to for source map attached events. For most pages this will be
    // the debugger model for the primary page target, but if a trace has
    // workers, we would also need to gather up the DebuggerModel instances for
    // those workers too.
    const debuggerModelsToListen = new Set<SDK.DebuggerModel.DebuggerModel>();

    for (const threadToProfileMap of this.#traceData.Samples.profilesInProcess.values()) {
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
          debuggerModelsToListen.add(debuggerModel);
        }
      }
    }

    for (const debuggerModel of debuggerModelsToListen) {
      debuggerModel.sourceMapManager().addEventListener(
          SDK.SourceMapManager.Events.SourceMapAttached, this.#onAttachedSourceMap, this);
    }

    // Although we have added listeners for SourceMapAttached events, we also
    // immediately try to resolve function names. This ensures we use any
    // sourcemaps that were attached before we bound our event listener.
    await this.#resolveNamesForNodes();
  }

  async #resolveNamesForNodes(): Promise<void> {
    if (!this.#traceData.Samples) {
      return;
    }

    for (const threadToProfile of this.#traceData.Samples.profilesInProcess.values()) {
      for (const [tid, profile] of threadToProfile) {
        const nodes = profile.parsedProfile.nodes() ?? [];
        const target = this.#targetForThread(tid);
        if (!target) {
          continue;
        }
        for (const node of nodes) {
          const resolvedFunctionName =
              await SourceMapScopes.NamesResolver.resolveProfileFrameFunctionName(node.callFrame, target);
          node.setFunctionName(resolvedFunctionName);
        }
      }
    }
  }

  #onAttachedSourceMap(): void {
    // Exit if we are already resolving so that we batch requests; if pages
    // have a lot of sourcemaps we can get a lot of events at once.
    if (this.#isResolvingNames) {
      return;
    }

    this.#isResolvingNames = true;
    // Resolving names triggers a repaint of the flame chart. Instead of attempting to resolve
    // names every time a source map is attached, wait for some time once the first source map is
    // attached. This way we allow for other source maps to be parsed before attempting a name
    // resolving using the available source maps. Otherwise the UI is blocked when the number
    // of source maps is particularly large.
    setTimeout(async () => {
      this.#isResolvingNames = false;
      await this.#resolveNamesForNodes();
      this.dispatchEvent(new NodeNamesUpdated());
    }, 500);
  }

  // Figure out the target for the node. If it is in a worker thread,
  // that is the target, otherwise we use the primary page target.
  #targetForThread(tid: TraceEngine.Types.TraceEvents.ThreadID): SDK.Target.Target|null {
    const maybeWorkerId = this.#traceData.Workers.workerIdByThread.get(tid);
    if (maybeWorkerId) {
      return SDK.TargetManager.TargetManager.instance().targetById(maybeWorkerId);
    }
    return SDK.TargetManager.TargetManager.instance().primaryPageTarget();
  }
}
