// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
import type * as Helpers from '../helpers/helpers.js';
import type * as Types from '../types/types.js';

import type {AuctionWorkletsData} from './AuctionWorkletsHandler.js';
import type * as Renderer from './RendererHandler.js';
import type {ParsedTrace} from './types.js';

export interface ThreadData {
  pid: Types.Events.ProcessID;
  tid: Types.Events.ThreadID;
  entries: readonly Types.Events.Event[];
  processIsOnMainFrame: boolean;
  tree: Helpers.TreeHelpers.TraceEntryTree;
  type: ThreadType;
  name: string|null;
  entryToNode: Map<Types.Events.Event, Helpers.TreeHelpers.TraceEntryNode>;
}

export const enum ThreadType {
  MAIN_THREAD = 'MAIN_THREAD',
  WORKER = 'WORKER',
  RASTERIZER = 'RASTERIZER',
  AUCTION_WORKLET = 'AUCTION_WORKLET',
  OTHER = 'OTHER',
  CPU_PROFILE = 'CPU_PROFILE',
  THREAD_POOL = 'THREAD_POOL',
}

function getThreadTypeForRendererThread(
    pid: Types.Events.ProcessID, thread: Renderer.RendererThread,
    auctionWorkletsData: AuctionWorkletsData): ThreadType {
  let threadType = ThreadType.OTHER;
  if (thread.name === 'CrRendererMain') {
    threadType = ThreadType.MAIN_THREAD;
  } else if (thread.name === 'DedicatedWorker thread') {
    threadType = ThreadType.WORKER;
  } else if (thread.name?.startsWith('CompositorTileWorker')) {
    threadType = ThreadType.RASTERIZER;
  } else if (auctionWorkletsData.worklets.has(pid)) {
    threadType = ThreadType.AUCTION_WORKLET;
  } else if (thread.name?.startsWith('ThreadPool')) {
    // TODO(paulirish): perhaps exclude ThreadPoolServiceThread entirely
    threadType = ThreadType.THREAD_POOL;
  }
  return threadType;
}

export function threadsInRenderer(
    rendererData: Renderer.RendererHandlerData, auctionWorkletsData: AuctionWorkletsData): readonly ThreadData[] {
  const foundThreads: ThreadData[] = [];
  // If we have Renderer threads, we prefer to use those. In the event that a
  // trace is a CPU Profile trace, we will never have Renderer threads, so we
  // know if there are no Renderer threads that we can fallback to using the
  // data from the SamplesHandler.
  if (rendererData.processes.size) {
    for (const [pid, process] of rendererData.processes) {
      for (const [tid, thread] of process.threads) {
        if (!thread.tree) {
          // Drop threads where we could not create the tree; this indicates
          // unexpected data and we won't be able to support all the UI
          // filtering we need.
          continue;
        }
        const threadType = getThreadTypeForRendererThread(pid, thread, auctionWorkletsData);
        foundThreads.push({
          name: thread.name,
          pid,
          tid,
          processIsOnMainFrame: process.isOnMainFrame,
          entries: thread.entries,
          tree: thread.tree,
          type: threadType,
          entryToNode: rendererData.entryToNode,
        });
      }
    }
  }
  return foundThreads;
}

/**
 * Given trace parsed data, this helper will return a high level array of
 * ThreadData. This is useful because it allows you to get a list of threads
 * regardless of if the trace is a CPU Profile or a Tracing profile. Thus you
 * can use this helper to iterate over threads in confidence that it will work
 * for both trace types.
 */
export function threadsInTrace(parsedTrace: ParsedTrace): readonly ThreadData[] {
  // If we have Renderer threads, we prefer to use those. In the event that a
  // trace is a CPU Profile trace, we will never have Renderer threads, so we
  // know if there are no Renderer threads that we can fallback to using the
  // data from the SamplesHandler.
  const threadsFromRenderer = threadsInRenderer(parsedTrace.Renderer, parsedTrace.AuctionWorklets);
  if (threadsFromRenderer.length) {
    return threadsFromRenderer;
  }

  const foundThreads: ThreadData[] = [];
  if (parsedTrace.Samples.profilesInProcess.size) {
    for (const [pid, process] of parsedTrace.Samples.profilesInProcess) {
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
          // There is no concept of a "Main Frame" in a CPU profile.
          processIsOnMainFrame: false,
          tree: thread.profileTree,
          type: ThreadType.CPU_PROFILE,
          entryToNode: parsedTrace.Samples.entryToNode,
        });
      }
    }
  }

  return foundThreads;
}
