// Copyright 2023 The Chromium Authors.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
import type * as Helpers from '../helpers/helpers.js';
import type * as Types from '../types/types.js';

import type {AuctionWorkletsData} from './AuctionWorkletsHandler.js';
import type * as Renderer from './RendererHandler.js';
import type {HandlerData} from './types.js';

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

const threadsInHandlerDataCache = new WeakMap<HandlerData, readonly ThreadData[]>();

/**
 * Given trace parsed data, this helper will return a high level array of
 * ThreadData. This is useful because it allows you to get a list of threads
 * regardless of if the trace is a CPU Profile or a Tracing profile. Thus you
 * can use this helper to iterate over threads in confidence that it will work
 * for both trace types.
 * The resulting data is cached per-trace, so you can safely call this multiple times.
 */
export function threadsInTrace(handlerData: HandlerData): readonly ThreadData[] {
  const cached = threadsInHandlerDataCache.get(handlerData);
  if (cached) {
    return cached;
  }

  // If we have Renderer threads, we prefer to use those.
  const threadsFromRenderer = threadsInRenderer(handlerData.Renderer, handlerData.AuctionWorklets);
  if (threadsFromRenderer.length) {
    threadsInHandlerDataCache.set(handlerData, threadsFromRenderer);
    return threadsFromRenderer;
  }

  // If it's a CPU Profile trace, there will be no Renderer threads.
  // We can fallback to using the data from the SamplesHandler.
  const foundThreads: ThreadData[] = [];
  if (handlerData.Samples.profilesInProcess.size) {
    for (const [pid, process] of handlerData.Samples.profilesInProcess) {
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
          entryToNode: handlerData.Samples.entryToNode,
        });
      }
    }
  }

  threadsInHandlerDataCache.set(handlerData, foundThreads);
  return foundThreads;
}
