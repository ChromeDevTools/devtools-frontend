// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as AIAssistance from '../../models/ai_assistance/ai_assistance.js';
import type * as Trace from '../../models/trace/trace.js';

/**
 * Returns the English label of a trace warning. These lines are read by the
 * AI agent, not shown in the UI, so they are not localized.
 */
function labelForWarning(warning: Trace.Handlers.ModelHandlers.Warnings.Warning): string {
  switch (warning) {
    case 'LONG_TASK':
      return 'Long task';
    case 'IDLE_CALLBACK_OVER_TIME':
      return 'Idle callback over time';
    case 'FORCED_REFLOW':
      return 'Forced reflow';
    case 'LONG_INTERACTION':
      return 'Long interaction';
    default:
      Platform.assertNever(warning, `Unknown warning: ${warning}`);
  }
}

/**
 * Describes a flame chart entry for the AI agent that receives comments on
 * it. The entry title is already sent as the anchor's text signature, so the
 * lines add what identifies the entry in the trace: the trace event name, the
 * entry's timing, its track, its warnings and the page that was traced.
 *
 * Times are relative to the start of the trace, which is where the
 * Performance panel's time ruler starts.
 *
 * Lines without a value are omitted.
 */
export function agentContextForEntry(
    event: Trace.Types.Events.Event,
    trackName: string|null,
    parsedTrace: Trace.TraceModel.ParsedTrace,
    ): string[] {
  const {micros} = AIAssistance.UnitFormatters;
  const lines: string[] = [];

  lines.push(`Trace event: ${event.name}`);

  const timing = [`starts at ${micros(event.ts - parsedTrace.data.Meta.traceBounds.min)}`];
  if (event.dur) {
    timing.push(`duration ${micros(event.dur)}`);
  }
  const selfTime = parsedTrace.data.Renderer.entryToNode.get(event)?.selfTime;
  if (selfTime !== undefined) {
    timing.push(`self time ${micros(selfTime)}`);
  }
  lines.push(`Timing: ${timing.join(', ')}`);

  if (trackName) {
    lines.push(`Track: ${trackName}`);
  }

  const warnings = parsedTrace.data.Warnings.perEvent.get(event);
  if (warnings?.length) {
    lines.push(`Warnings: ${warnings.map(labelForWarning).join(', ')}`);
  }

  // The main frame URL is same-origin with the trace by definition, so it
  // does not need redaction.
  const mainFrameURL = parsedTrace.data.Meta.mainFrameURL;
  if (mainFrameURL) {
    lines.push(`Traced page: ${mainFrameURL}`);
  }

  return lines;
}
