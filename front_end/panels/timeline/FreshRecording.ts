// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as Trace from '../../models/trace/trace.js';

let instance: Tracker|null = null;

/**
 * In multiple places we need to know if the trace we are working on is fresh
 * or not. We cannot store that data in the trace file's metadata (otherwise a
 * loaded trace file could claim to be fresh), so we store it here. When a new trace
 * is loaded, we set this flag accordingly.
 **/
export class Tracker {
  #freshRecordings: WeakSet<Trace.Handlers.Types.ParsedTrace> = new WeakSet();

  static instance(opts: {forceNew: boolean} = {forceNew: false}): Tracker {
    if (!instance || opts.forceNew) {
      instance = new Tracker();
    }
    return instance;
  }

  registerFreshRecording(data: Trace.Handlers.Types.ParsedTrace): void {
    this.#freshRecordings.add(data);
  }

  recordingIsFresh(data: Trace.Handlers.Types.ParsedTrace): boolean {
    return this.#freshRecordings.has(data);
  }
}
