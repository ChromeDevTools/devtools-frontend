// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
import type * as Helpers from '../helpers/helpers.js';
import type * as Types from '../types/types.js';

import {type PartialTraceData} from './Migration.js';
import type * as Renderer from './RendererHandler.js';

export interface ThreadData {
  pid: Types.TraceEvents.ProcessID;
  tid: Types.TraceEvents.ThreadID;
  entries: readonly Types.TraceEvents.TraceEntry[];
  tree: Helpers.TreeHelpers.TraceEntryTree;
  type: ThreadType;
  name: string|null;
  entryToNode: Map<Types.TraceEvents.TraceEntry, Helpers.TreeHelpers.TraceEntryNode>;
}

export const enum ThreadType {
  MAIN_THREAD = 'MAIN_THREAD',
  WORKER = 'WORKER',
  RASTERIZER = 'RASTERIZER',
  AUCTION_WORKLET = 'AUCTION_WORKLET',
  OTHER = 'OTHER',
  CPU_PROFILE = 'CPU_PROFILE',
}

function getThreadTypeForRendererThread(
    traceParseData: PartialTraceData, pid: Types.TraceEvents.ProcessID, thread: Renderer.RendererThread): ThreadType {
  let threadType = ThreadType.OTHER;
  if (thread.name === 'CrRendererMain') {
    threadType = ThreadType.MAIN_THREAD;
  } else if (thread.name === 'DedicatedWorker thread') {
    threadType = ThreadType.WORKER;
  } else if (thread.name?.startsWith('CompositorTileWorker')) {
    threadType = ThreadType.RASTERIZER;
  } else if (traceParseData.AuctionWorklets.worklets.has(pid)) {
    threadType = ThreadType.AUCTION_WORKLET;
  }
  return threadType;
}

/**
 * Given trace parsed data, this helper will return a high level array of
 * ThreadData. This is useful because it allows you to get a list of threads
 * regardless of if the trace is a CPU Profile or a Tracing profile. Thus you
 * can use this helper to iterate over threads in confidence that it will work
 * for both trace types.
 */
export function threadsInTrace(traceParseData: PartialTraceData): readonly ThreadData[] {
  const foundThreads: ThreadData[] = [];
  // If we have Renderer threads, we prefer to use those. In the event that a
  // trace is a CPU Profile trace, we will never have Renderer threads, so we
  // know if there are no Renderer threads that we can fallback to using the
  // data from the SamplesHandler.
  if (traceParseData.Renderer && traceParseData.Renderer.processes.size) {
    for (const [pid, process] of traceParseData.Renderer.processes) {
      for (const [tid, thread] of process.threads) {
        const threadType = getThreadTypeForRendererThread(traceParseData, pid, thread);
        if (!thread.tree) {
          // Drop threads where we could not create the tree; this indicates
          // unexpected data and we won't be able to support all the UI
          // filtering we need.
          continue;
        }
        foundThreads.push({
          name: thread.name,
          pid,
          tid,
          entries: thread.entries,
          tree: thread.tree,
          type: threadType,
          entryToNode: traceParseData.Renderer.entryToNode,
        });
      }
    }
  } else if (traceParseData.Samples && traceParseData.Samples.profilesInProcess.size) {
    for (const [pid, process] of traceParseData.Samples.profilesInProcess) {
      for (const [tid, thread] of process) {
        if (!thread.profileTree) {
          // Drop threads where we could not create the tree; this indicates
          // unexpected data and we won't be able to support all the UI
          // filtering we need.
          continue;
        }

        foundThreads.push({
          pid,
          tid,
          // CPU Profile threads do not have a name.
          name: null,
          entries: thread.profileCalls,
          tree: thread.profileTree,
          type: ThreadType.CPU_PROFILE,
          entryToNode: traceParseData.Samples.entryToNode,
        });
      }
    }
  }

  return foundThreads;
}
