// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, describe, it} from 'mocha';

import * as Platform from '../../core/platform/platform.js';
import * as Trace from '../../models/trace/trace.js';
import * as SourceMapsResolver from '../../models/trace_source_maps_resolver/trace_source_maps_resolver.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {getMainThread} from '../../testing/TraceHelpersCore.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import {createContentProviderUISourceCode} from '../../testing/UISourceCodeHelpers.js';

import * as Timeline from './timeline.js';

/**
 * Returns the first profile call on the main thread that has a code location
 * and at least one ancestor.
 */
function findNestedProfileCall(parsedTrace: Trace.TraceModel.ParsedTrace): Trace.Types.Events.SyntheticProfileCall {
  const profileCall = getMainThread(parsedTrace.data.Renderer)
                          .entries.find((entry): entry is Trace.Types.Events.SyntheticProfileCall => {
                            return Trace.Types.Events.isProfileCall(entry) && Boolean(entry.callFrame.url) &&
                                entry.callFrame.lineNumber >= 0 &&
                                Boolean(parsedTrace.data.Renderer.entryToNode.get(entry)?.parent);
                          });
  assert.isOk(profileCall);
  return profileCall;
}

/**
 * Returns the main thread entry with the most ancestors.
 */
function findDeepestEntry(parsedTrace: Trace.TraceModel.ParsedTrace): Trace.Types.Events.Event {
  let deepestEntry: Trace.Types.Events.Event|null = null;
  let maxDepth = -1;
  for (const entry of getMainThread(parsedTrace.data.Renderer).entries) {
    const depth = parsedTrace.data.Renderer.entryToNode.get(entry)?.depth ?? -1;
    if (depth > maxDepth) {
      maxDepth = depth;
      deepestEntry = entry;
    }
  }
  assert.isOk(deepestEntry);
  return deepestEntry;
}

describe('TimelineCommentContext', function() {
  setupLocaleHooks();

  afterEach(() => {
    SourceMapsResolver.SourceMapsResolver.clearResolvedNodeNames();
  });

  describe('agentContextForEntry', () => {
    it('describes the event name, timing, track, warnings and traced page of an entry', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'slow-interaction-keydown.json.gz');
      const longTask = parsedTrace.data.Warnings.perWarning.get('LONG_TASK')?.at(0);
      assert.isOk(longTask);

      const lines = Timeline.TimelineCommentContext.agentContextForEntry(longTask, 'Main', parsedTrace);

      assert.deepEqual(lines, [
        'Trace event: RunTask',
        'Timing: starts at 4,264\xA0ms, duration 143\xA0ms, self time 53\xA0μs',
        'Track: Main',
        'Warnings: Long task',
        'Traced page: https://b2607f8b04800100000289cb1c0a82ba72253000000000000000001.proxy.googlers.com/long-interaction/index.html?x=35',
      ]);
    });

    it('omits the lines that have no value', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      // Network requests have no tree node, so no self time, and no warnings.
      const request = parsedTrace.data.NetworkRequests.byTime.at(0);
      assert.isOk(request);

      const lines = Timeline.TimelineCommentContext.agentContextForEntry(request, null, parsedTrace);

      assert.deepEqual(lines, [
        'Trace event: SyntheticNetworkRequest',
        'Timing: starts at 4\xA0ms, duration 45\xA0ms',
        'Traced page: https://web.dev/',
      ]);
    });

    it('describes the source location and call path of a JS function', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'slow-interaction-button-click.json.gz');
      const profileCall = findNestedProfileCall(parsedTrace);

      const lines = Timeline.TimelineCommentContext.agentContextForEntry(profileCall, null, parsedTrace);

      // The call frame is at 0-based line 10, column 42.
      assert.deepEqual(lines, [
        'Trace event: ProfileCall',
        'Timing: starts at 1,195\xA0ms, duration 28\xA0μs, self time 0\xA0μs',
        'Source: chrome-extension://blijaeebfebmkmekmdnehcmmcjnblkeo/lib/utils.js:11:43',
        'Call path: Task > v8.callFunction > Function call > (anonymous)',
        'Traced page: https://b2607f8b04800100000289cb1c0a82ba72253000000000000000001.proxy.googlers.com/long-interaction/index.html?x=35',
      ]);
    });

    it('uses the authored source location when a source map resolved the entry', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'slow-interaction-button-click.json.gz');
      const profileCall = findNestedProfileCall(parsedTrace);
      const {uiSourceCode} = createContentProviderUISourceCode({
        url: Platform.DevToolsPath.urlString`webpack:///src/app.ts`,
        mimeType: 'text/typescript',
        universe: new TestUniverse(),
      });
      SourceMapsResolver.SourceMapsResolver.storeResolvedCodeDataForCallFrame(profileCall.callFrame, {
        name: null,
        devtoolsLocation: new Workspace.UISourceCode.UILocation(uiSourceCode, 40, 3),
        script: null,
      });

      const lines = Timeline.TimelineCommentContext.agentContextForEntry(profileCall, null, parsedTrace);

      assert.include(lines, 'Source: webpack:///src/app.ts:41:4');
    });

    it('includes every ancestor in the call path', async function() {
      const parsedTrace = await TraceLoader.traceEngine(this, 'slow-interaction-button-click.json.gz');
      const deepestEntry = findDeepestEntry(parsedTrace);

      const lines = Timeline.TimelineCommentContext.agentContextForEntry(deepestEntry, null, parsedTrace);

      const expectedNames = [
        'Task',
        'Event: click',
        'v8.callFunction',
        'Function call',
        'Optimize code',
        '(anonymous)',
        // The page computes fibonacci recursively.
        ...Array<string>(29).fill('fibonacci'),
        'V8.OptimizeConcurrentPrepare',
      ];
      assert.include(lines, `Call path: ${expectedNames.join(' > ')}`);
    });
  });
});
