// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Boots the DevTools unit-test environment in a headless page so scripts/trace/snapshots/capture.ts can load
 * traces via TraceLoader and serialize them with captureTraceSnapshot().
 */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Trace from '../../models/trace/trace.js';
import * as TraceSourceMapsResolver from '../../models/trace_source_maps_resolver/trace_source_maps_resolver.js';
/* eslint-disable @devtools/es-modules-import */
import {cleanTestDOM, setupTestDOM} from '../../testing/DOMHooks.js';
import {
  createFakeSetting,
  deinitializeGlobalVars,
  initializeGlobalVars,
  resetHostConfig,
} from '../../testing/EnvironmentHelpers.js';
import {setupIgnoreListManagerEnvironment} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import {stopTrackingAsyncActivity} from '../../testing/TrackAsyncOperations.js';
/* eslint-enable @devtools/es-modules-import */
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';

// eslint-disable-next-line @devtools/es-modules-import
import * as Timeline from './timeline.js';
import {captureTraceSnapshot} from './TraceSnapshotSerializer.js';

/** Result returned to `scripts/trace/snapshots/capture.ts` for each trace fixture or corpus file. */
export type CaptureOutcome = {
  kind: 'snapshot',
  json: string,
}|{kind: 'skipped', reason: string}|{kind: 'error', message: string};

export type CaptureTrace = (fixture: string, isCorpus: boolean, collectionLimit: number) => Promise<CaptureOutcome>;

const MAX_STACK_FRAMES = 6;

/**
 * Installs a reusable per-page `CaptureTrace` runner that initializes and tears down DevTools test globals around
 * each trace so state cannot leak across sequential captures on the same worker page.
 */
export async function installTraceSnapshotHarness(): Promise<CaptureTrace> {
  document.documentElement.classList.add('platform-screenshot-test');
  Host.Platform.setFontFamilyForTests('ahem');
  stopTrackingAsyncActivity();

  return async (fixture, isCorpus, collectionLimit) => {
    await initializeGlobalVars();
    try {
      resetHostConfig();
      await setupTestDOM();
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.events = new Common.ObjectWrapper.ObjectWrapper();
      ThemeSupport.ThemeSupport.instance({forceNew: true, setting: createFakeSetting('ui-theme', 'default')});
      setupIgnoreListManagerEnvironment();

      let parsedTrace: Trace.TraceModel.ParsedTrace;
      try {
        parsedTrace = await TraceLoader.traceEngine(null, fixture, {withModificationsManager: true});
      } catch (error) {
        if (isCorpus) {
          return {kind: 'skipped', reason: `does not parse: ${error instanceof Error ? error.message : String(error)}`};
        }
        throw error;
      }
      if (isCorpus) {
        const {Renderer, Samples} = parsedTrace.data;
        if (Renderer.processes.size === 0 && Samples.profilesInProcess.size === 0) {
          return {kind: 'skipped', reason: 'not a performance trace'};
        }
        if (parsedTrace.traceEvents.some(e => typeof e.cat !== 'string')) {
          return {kind: 'skipped', reason: 'has events without a category'};
        }
      }
      const snapshot = await captureTraceSnapshot(parsedTrace, {collectionLimit});
      return {kind: 'snapshot', json: JSON.stringify(snapshot, null, 2)};
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const frames = error instanceof Error ? (error.stack ?? '').split('\n').slice(1, 1 + MAX_STACK_FRAMES) : [];
      return {
        kind: 'error',
        message: [msg, ...frames.map(f => f.trim().replace(/https?:\/\/[^/]+|:\d+:\d+/g, ''))].join('\n'),
      };
    } finally {
      for (const handler of Object.values(Trace.Handlers.ModelHandlers)) {
        handler.reset();
      }
      Trace.Helpers.SyntheticEvents.SyntheticEventsManager.reset();
      TraceSourceMapsResolver.SourceMapsResolver.clearResolvedNodeNames();
      Timeline.ModificationsManager.ModificationsManager.reset();
      TraceLoader.resetCache();
      cleanTestDOM();
      await deinitializeGlobalVars();
    }
  };
}
