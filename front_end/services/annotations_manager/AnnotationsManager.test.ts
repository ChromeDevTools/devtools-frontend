// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as TraceEngine from '../../models/trace/trace.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import * as AnnotationsManager from './annotations_manager.js';

function getMainThread(data: TraceEngine.Handlers.ModelHandlers.Renderer.RendererHandlerData):
    TraceEngine.Handlers.ModelHandlers.Renderer.RendererThread {
  let mainThread: TraceEngine.Handlers.ModelHandlers.Renderer.RendererThread|null = null;
  for (const [, process] of data.processes) {
    for (const [, thread] of process.threads) {
      if (thread.name === 'CrRendererMain') {
        mainThread = thread;
        break;
      }
    }
  }
  if (!mainThread) {
    throw new Error('Could not find main thread.');
  }
  return mainThread;
}

function findFirstEntry(
    allEntries: readonly TraceEngine.Types.TraceEvents.SyntheticTraceEntry[],
    predicate: (entry: TraceEngine.Types.TraceEvents.SyntheticTraceEntry) =>
        boolean): TraceEngine.Types.TraceEvents.SyntheticTraceEntry {
  const entry = allEntries.find(entry => predicate(entry));
  if (!entry) {
    throw new Error('Could not find expected entry.');
  }
  return entry;
}

describe('AnnotationsManager', () => {
  it('correctly generates an entry hash', async function() {
    const manager = AnnotationsManager.AnnotationsManager.AnnotationsManager.instance();
    const data = await TraceLoader.traceEngine(null, 'basic-stack.json.gz');
    const mainThread = getMainThread(data.Renderer);
    assert.exists(manager);
    // Find first 'Timer Fired' entry in the trace
    const timerFireEntry = findFirstEntry(mainThread.entries, entry => {
      return entry.name === 'TimerFire';
    });

    const entryHash = manager.generateTraceEntryHash(timerFireEntry);
    assert.strictEqual('devtools.timeline,TimerFire,X,55385,259,164398376028,452669', entryHash);
  });
});
