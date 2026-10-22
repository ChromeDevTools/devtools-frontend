// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as AIAssistance from '../../models/ai_assistance/ai_assistance.js';
import * as Trace from '../../models/trace/trace.js';
import * as SourceMapsResolver from '../../models/trace_source_maps_resolver/trace_source_maps_resolver.js';

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
 * Returns the location of the entry's code as `url:line:column`, with
 * 1-based line and column numbers as editors show them, or null if the entry
 * has no code location. The location is in the authored source if a source
 * map resolved it.
 *
 * This follows SourceMapsResolver.codeLocationForEntry() but skips its
 * Workspace lookup, which only maps a bare URL to a workspace URL, so that
 * the controller does not need a Workspace.
 *
 * Network requests are skipped: their URL is the request, not code, and a
 * cross-origin request's final URL must be redacted.
 */
function sourceLocationForEntry(event: Trace.Types.Events.Event, parsedTrace: Trace.TraceModel.ParsedTrace): string|
    null {
  if (Trace.Types.Events.isSyntheticNetworkRequest(event)) {
    return null;
  }
  let url: string|null = null;
  let line: number|undefined;
  let column: number|undefined;
  const uiLocation = SourceMapsResolver.SourceMapsResolver.resolvedCodeLocationForEntry(event)?.devtoolsLocation;
  const rawCallFrame = uiLocation ? null : Trace.Helpers.Trace.rawCallFrameForEntry(event);
  if (uiLocation) {
    url = uiLocation.uiSourceCode.url();
    line = uiLocation.lineNumber;
    column = uiLocation.columnNumber;
  } else if (rawCallFrame) {
    url = rawCallFrame.url;
    line = rawCallFrame.lineNumber >= 0 ? rawCallFrame.lineNumber : undefined;
    column = rawCallFrame.columnNumber >= 0 ? rawCallFrame.columnNumber : undefined;
  } else {
    url = Trace.Handlers.Helpers.getNonResolvedURL(event, parsedTrace.data);
  }
  if (!url) {
    return null;
  }
  if (line === undefined) {
    return url;
  }
  return column === undefined ? `${url}:${line + 1}` : `${url}:${line + 1}:${column + 1}`;
}

/**
 * Returns the names of the entry's ancestors and the entry itself, outermost
 * first, for example `Task > Timer fired > Function call > handleClick`, or
 * null if the entry has no ancestors.
 */
function callPathForEntry(event: Trace.Types.Events.Event, parsedTrace: Trace.TraceModel.ParsedTrace): string|null {
  const node = parsedTrace.data.Renderer.entryToNode.get(event) ?? parsedTrace.data.Samples.entryToNode.get(event);
  if (!node?.parent) {
    return null;
  }
  const names: string[] = [];
  for (let current: Trace.Helpers.TreeHelpers.TraceEntryNode|null = node; current; current = current.parent) {
    names.push(Trace.Name.forEntry(current.entry, parsedTrace));
  }
  // The walk goes from the entry up to the root, so reverse it to put the
  // outermost entry first.
  names.reverse();
  return names.join(' > ');
}

/**
 * Describes a flame chart entry for the AI agent that receives comments on
 * it. The entry title is already sent as the anchor's text signature, so the
 * lines add what identifies the entry in the trace and where its code is: the
 * trace event name, the entry's timing, its track, its source location, its
 * call path, its warnings and the page that was traced.
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

  const sourceLocation = sourceLocationForEntry(event, parsedTrace);
  if (sourceLocation) {
    lines.push(`Source: ${sourceLocation}`);
  }

  const callPath = callPathForEntry(event, parsedTrace);
  if (callPath) {
    lines.push(`Call path: ${callPath}`);
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
