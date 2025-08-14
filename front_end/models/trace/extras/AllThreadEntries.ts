// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import type * as Types from '../types/types.js';

const cache = new WeakMap<Handlers.Types.ParsedTrace, Types.Events.Event[]>();

/**
 * A function to get a list of all thread entries that exist. This used to
 * exist as RendererHandler.data["allTraceEntries"] but that was a very
 * expensive array to build for something that is primarily used for our unit
 * tests; we only use it in the real UI when rendering the pie chart for a
 * particular event. Therefore, we now lazily calculate that array via this
 * helper. The result is cached per trace to ensure we only pay the cost once.
 */
export function forTrace(parsedTrace: Handlers.Types.ParsedTrace): Types.Events.Event[] {
  const fromCache = cache.get(parsedTrace);
  if (fromCache) {
    return fromCache;
  }

  const allEvents: Types.Events.Event[] = [];

  for (const process of parsedTrace.Renderer.processes.values()) {
    for (const thread of process.threads.values()) {
      for (const entry of thread.entries) {
        allEvents.push(entry);
      }
    }
  }

  Helpers.Trace.sortTraceEventsInPlace(allEvents);
  cache.set(parsedTrace, allEvents);
  return allEvents;
}
