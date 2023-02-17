// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../front_end/core/sdk/sdk.js';

export class FakeStorage extends SDK.TracingModel.BackingStorage {
  appendString() {
  }

  appendAccessibleString(x: string): () => Promise<string|null> {
    return () => Promise.resolve(x);
  }

  finishWriting() {
  }

  reset() {
  }
}

// The same set of arguments given to the constructor of
// SDK.TracingModel.Event, without the Thread, as we stub that out.
export interface EventWithStubbedThreadOptions {
  categories: string|undefined;
  name: string;
  phase: SDK.TracingModel.Phase;
  startTime: number;
  threadId: number;
  args?: Record<string, unknown>;
}

/**
 * Provides a stubbed SDK.TracingModel.Thread instance.
 * IMPORTANT: this is not designed to be a fully stubbed Thread, but one that is
 * stubbed enough to be able to use it to instantiate an SDK.TracingModel.Event.
 * If you pass this fake thread around into places that expect actual threads,
 * you will get errors. Use this only for simple cases where you need a one off
 * event to test something. For anything more, you should use the helpers in
 * TraceHelpers.ts to load and parse a real trace to get real data.
 **/
class StubbedThread {
  static makeStubEvent(id: number): SDK.TracingModel.Thread {
    const instance = new StubbedThread(id);
    return instance as unknown as SDK.TracingModel.Thread;
  }

  constructor(public id: number) {
  }

  getModel(): SDK.TracingModel.TracingModel {
    return {
      parsedCategoriesForString(input: string): Set<string> {
        return new Set(input.split(','));
      },

    } as unknown as SDK.TracingModel.TracingModel;
  }
}

export function makeEventWithStubbedThread(options: EventWithStubbedThreadOptions): SDK.TracingModel.Event {
  const thread = StubbedThread.makeStubEvent(options.threadId);
  // TODO(jacktfranklin): provide a helper that can construct a fake payload
  // and instantiate an Event with that. Ultimately in tests we need to be able
  // to generate constructed events and payload events.
  const event =
      new SDK.TracingModel.ConstructedEvent(options.categories, options.name, options.phase, options.startTime, thread);
  if (options.args) {
    event.args = options.args;
  }
  return event;
}
export const DevToolsTimelineCategory = 'disabled-by-default-devtools.timeline';
