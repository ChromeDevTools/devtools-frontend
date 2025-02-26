// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import type {HandlerName} from './types.js';

// Each thread contains events. Events indicate the thread and process IDs, which are
// used to store the event in the correct process thread entry below.
const unpairedAsyncEvents: Types.Events.PipelineReporter[] = [];

const legacyScreenshotEvents: Types.Events.LegacyScreenshot[] = [];
const modernScreenshotEvents: Types.Events.Screenshot[] = [];
const syntheticScreenshots: Types.Events.LegacySyntheticScreenshot[] = [];
let frameSequenceToTs: Record<string, Types.Timing.Micro> = {};

export function reset(): void {
  unpairedAsyncEvents.length = 0;
  legacyScreenshotEvents.length = 0;
  syntheticScreenshots.length = 0;
  modernScreenshotEvents.length = 0;
  frameSequenceToTs = {};
}

export function handleEvent(event: Types.Events.Event): void {
  if (Types.Events.isLegacyScreenshot(event)) {
    legacyScreenshotEvents.push(event);
  } else if (Types.Events.isScreenshot(event)) {
    modernScreenshotEvents.push(event);
  } else if (Types.Events.isPipelineReporter(event)) {
    unpairedAsyncEvents.push(event);
  }
}

export async function finalize(): Promise<void> {
  const pipelineReporterEvents = Helpers.Trace.createMatchedSortedSyntheticEvents(unpairedAsyncEvents);

  frameSequenceToTs = Object.fromEntries(pipelineReporterEvents.map(evt => {
    const frameSequenceId = evt.args.data.beginEvent.args.chrome_frame_reporter.frame_sequence;
    const presentationTs = Types.Timing.Micro(evt.ts + evt.dur);
    return [frameSequenceId, presentationTs];
  }));

  for (const snapshotEvent of legacyScreenshotEvents) {
    const {cat, name, ph, pid, tid} = snapshotEvent;
    const syntheticEvent = Helpers.SyntheticEvents.SyntheticEventsManager.registerSyntheticEvent<
        Types.Events.LegacySyntheticScreenshot>({
      rawSourceEvent: snapshotEvent,
      cat,
      name,
      ph,
      pid,
      tid,
      // TODO(paulirish, crbug.com/41363012): investigate why getPresentationTimestamp(snapshotEvent) seems less accurate. Resolve screenshot timing inaccuracy.
      // `getPresentationTimestamp(snapshotEvent) - snapshotEvent.ts` is how many microsec the screenshot should be adjusted to the right/later
      ts: snapshotEvent.ts,
      args: {
        dataUri: `data:image/jpg;base64,${snapshotEvent.args.snapshot}`,
      },
    });
    syntheticScreenshots.push(syntheticEvent);
  }
}

export function screenshotImageDataUri(event: Types.Events.LegacySyntheticScreenshot|Types.Events.Screenshot): string {
  if (Types.Events.isLegacySyntheticScreenshot(event)) {
    return event.args.dataUri;
  }
  return `data:image/jpg;base64,${event.args.snapshot}`;
}

/**
 * Correct the screenshot timestamps
 * The screenshot 'snapshot object' trace event has the "frame sequence number" attached as an ID.
 * We match that up with the "PipelineReporter" trace events as they terminate at presentation.
 * Presentation == when the pixels hit the screen. AKA Swap on the GPU
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getPresentationTimestamp(screenshotEvent: Types.Events.LegacyScreenshot): Types.Timing.Micro {
  const frameSequence = parseInt(screenshotEvent.id, 16);
  // If it's 1, then it's an old trace (before https://crrev.com/c/4957973) and cannot be corrected.
  if (frameSequence === 1) {
    return screenshotEvent.ts;
  }
  // The screenshot trace event's `ts` reflects the "expected display time" which is ESTIMATE.
  // It is set by the compositor frame sink from the `expected_display_time`, which is based on a previously known
  // frame start PLUS the vsync interval (eg 16.6ms)
  const updatedTs = frameSequenceToTs[frameSequence];
  // Do we always find a match? No...
  // We generally don't match the very first screenshot and, sometimes, the last
  // The very first screenshot is requested immediately (even if nothing is painting). As a result there's no compositor
  // instrumentation running alongside.
  // The last one is sometimes missing as because the trace terminates right before the associated PipelineReporter is emitted.
  return updatedTs ?? screenshotEvent.ts;
}

export interface Data {
  // These are nullable because in January 2025 a CL in Chromium
  // crrev.com/c/6197645 landed which changed the format of screenshots. For a
  // given trace, it can have either "legacy" screenshot events, or "modern"
  // screenshot events, but no trace can ever contain both.
  // So, if either of these arrays are empty, we instead return `null`. This forces consumers to check the presence of the array.
  // Traces can have no screenshots if the trace category is not enabled, so it
  // is possible for a trace to return null for both of these arrays.
  legacySyntheticScreenshots: Types.Events.LegacySyntheticScreenshot[]|null;
  screenshots: Types.Events.Screenshot[]|null;
}
// TODO(crbug/41484172): should be readonly
export function data(): Data {
  return {
    legacySyntheticScreenshots: syntheticScreenshots.length ? syntheticScreenshots : null,
    screenshots: modernScreenshotEvents.length ? modernScreenshotEvents : null,
  };
}

export function deps(): HandlerName[] {
  return ['Meta'];
}
