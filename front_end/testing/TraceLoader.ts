// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../core/common/common.js';
import * as SDK from '../core/sdk/sdk.js';
import type * as Protocol from '../generated/protocol.js';
import * as Trace from '../models/trace/trace.js';
import * as Timeline from '../panels/timeline/timeline.js';
import * as TraceBounds from '../services/trace_bounds/trace_bounds.js';

// We maintain two caches:
// 1. The file contents JSON.parsed for a given trace file.
// 2. The trace engine models for a given file (used by the traceEngine function)
// Both the file contents and the model data are not expected to change during
// the lifetime of an instance of DevTools, so they are safe to cache and
// re-use across tests to avoid extra time spent loading and parsing the same
// inputs.
// In the future once the data layer migration is complete, we can hopefully
// simplify this into one method that loads the new engine and none of the old
// ones.
const fileContentsCache = new Map<string, Trace.Types.File.Contents>();

// The new engine cache is a map of maps of:
// trace file name => trace engine configuration => trace data
//
// The first map is a Map of string (which is the name of the trace file) to a
// new map, where the key is the trace engine configuration stringified.
// This ensures that we cache as much as we can, but if you load the same trace
// file with different trace engine configurations, we will not use the cache
// and will reparse. This is required as some of the settings and experiments
// change if events are kept and dropped.
const traceEngineCache = new Map<string, Map<string, {
                                   parsedTrace: Trace.Handlers.Types.ParsedTrace,
                                   insights: Trace.Insights.Types.TraceInsightSets | null,
                                   metadata: Trace.Types.File.MetaData,
                                   model: Trace.TraceModel.Model,
                                 }>>();

export interface TraceEngineLoaderOptions {
  initTraceBounds: boolean;
}

/**
 * Loads trace files defined as fixtures in front_end/panels/timeline/fixtures/traces.
 *
 * Will automatically cache the results to save time processing the same trace
 * multiple times in a run of the test suite.
 **/
export class TraceLoader {
  /**
   * Parsing some trace files easily takes up more than our default Mocha timeout
   * which is 2seconds. So for most tests that include parsing a trace, we have to
   * increase the timeout. We use this function to ensure we set a consistent
   * timeout across all trace model tests.
   **/
  static setTestTimeout(context: Mocha.Context|Mocha.Suite): void {
    // Some traces take a long time to process, especially on our CQ machines.
    // The trace that takes the longest on my Mac M1 Pro is ~3s (yahoo-news.json.gz).
    // In CQ, that same trace takes ~10s (linux), ~7.5s (mac), ~11.5s (windows).
    if (context.timeout() > 0) {
      context.timeout(Math.max(context.timeout(), 30000));
    }
  }

  /**
   * Loads a trace file into memory and returns its contents after
   * JSON.parse-ing them
   *
   **/
  static async fixtureContents(context: Mocha.Context|Mocha.Suite|null, name: string):
      Promise<Trace.Types.File.Contents> {
    if (context) {
      TraceLoader.setTestTimeout(context);
    }
    const cached = fileContentsCache.get(name);
    if (cached) {
      return cached;
    }
    const urlForTest = new URL(`../panels/timeline/fixtures/traces/${name}`, import.meta.url);

    const contents = await TraceLoader.loadTraceFileFromURL(urlForTest);
    fileContentsCache.set(name, contents);
    return contents;
  }

  static async traceFile(context: Mocha.Context|Mocha.Suite|null, name: string): Promise<Trace.Types.File.TraceFile> {
    const contents = await TraceLoader.fixtureContents(context, name);
    const traceEvents = 'traceEvents' in contents ? contents.traceEvents : contents;
    const metadata = 'metadata' in contents ? contents.metadata : {};
    return {traceEvents, metadata} as Trace.Types.File.TraceFile;
  }

  /**
   * Load an array of raw events from the trace file.
   **/
  static async rawEvents(context: Mocha.Context|Mocha.Suite|null, name: string):
      Promise<readonly Trace.Types.Events.Event[]> {
    const contents = await TraceLoader.fixtureContents(context, name);

    const events = 'traceEvents' in contents ? contents.traceEvents : contents;
    return events;
  }

  /**
   * Load the metadata from a trace file (throws if not present).
   **/
  static async metadata(context: Mocha.Context|Mocha.Suite|null, name: string): Promise<Trace.Types.File.MetaData> {
    const contents = await TraceLoader.fixtureContents(context, name);

    const metadata = 'metadata' in contents ? contents.metadata : null;
    if (!metadata) {
      throw new Error('expected metadata but found none');
    }

    return metadata;
  }

  /**
   * Load an array of raw events from the trace file.
   * Will default to typing those events using the types from Trace Engine, but
   * can be overriden by passing the legacy EventPayload type as the generic.
   **/
  static async rawCPUProfile(context: Mocha.Context|Mocha.Suite|null, name: string):
      Promise<Protocol.Profiler.Profile> {
    const contents = await TraceLoader.fixtureContents(context, name) as unknown as Protocol.Profiler.Profile;
    return contents;
  }

  /**
   * Executes only the new trace engine on the fixture and returns the resulting parsed data.
   *
   * @param context The Mocha test context. Processing a trace can easily
   * takes up longer than the default Mocha timeout, which is 2s. So we have to
   * increase this test's timeout. It might be null when we only render a
   * component example. See TraceLoader.setTestTimeout.
   * @param file The name of the trace file to be loaded.
   * The trace file should be in ../panels/timeline/fixtures/traces folder.
   * @param options Additional trace options.
   * @param options.initTraceBounds (defaults to `true`) after the trace is
   * loaded, the TraceBounds manager will automatically be initialised using
   * the bounds from the trace.
   * @param config The config the new trace engine should run with. Optional,
   * will fall back to the Default config if not provided.
   */
  static async traceEngine(
      context: Mocha.Context|Mocha.Suite|null, name: string,
      config: Trace.Types.Configuration.Configuration = Trace.Types.Configuration.defaults()): Promise<{
    parsedTrace: Trace.Handlers.Types.ParsedTrace,
    insights: Trace.Insights.Types.TraceInsightSets|null,
    metadata: Trace.Types.File.MetaData,
  }> {
    if (context) {
      TraceLoader.setTestTimeout(context);
    }
    // Force the TraceBounds to be reset to empty. This ensures that in
    // tests where we are using the new engine data we don't accidentally
    // rely on the fact that a previous test has set the BoundsManager.
    TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true});

    const configCacheKey = Trace.Types.Configuration.configToCacheKey(config);

    const fromCache = traceEngineCache.get(name)?.get(configCacheKey);

    // If we have results from the cache, we use those to ensure we keep the
    // tests speedy and don't re-parse trace files over and over again.
    if (fromCache) {
      await wrapInTimeout(context, () => {
        const syntheticEventsManager = fromCache.model.syntheticTraceEventsManager(0);
        if (!syntheticEventsManager) {
          throw new Error('Cached trace engine result did not have a synthetic events manager instance');
        }
        Trace.Helpers.SyntheticEvents.SyntheticEventsManager.activate(syntheticEventsManager);
        TraceLoader.initTraceBoundsManager(fromCache.parsedTrace);
        Timeline.ModificationsManager.ModificationsManager.reset();
        Timeline.ModificationsManager.ModificationsManager.initAndActivateModificationsManager(fromCache.model, 0);
      }, 4_000, 'Initializing state for cached trace');
      return {parsedTrace: fromCache.parsedTrace, insights: fromCache.insights, metadata: fromCache.metadata};
    }

    const fileContents = await wrapInTimeout(context, async () => {
      return await TraceLoader.fixtureContents(context, name);
    }, 15_000, `Loading fixtureContents for ${name}`);

    const parsedTraceData = await wrapInTimeout(context, async () => {
      return await TraceLoader.executeTraceEngineOnFileContents(
          fileContents, /* emulate fresh recording */ false, config);
    }, 15_000, `Executing traceEngine for ${name}`);

    const cacheByName = traceEngineCache.get(name) ?? new Map<string, {
                          parsedTrace: Trace.Handlers.Types.ParsedTrace,
                          insights: Trace.Insights.Types.TraceInsightSets | null,
                          metadata: Trace.Types.File.MetaData,
                          model: Trace.TraceModel.Model,
                        }>();
    cacheByName.set(configCacheKey, parsedTraceData);
    traceEngineCache.set(name, cacheByName);

    TraceLoader.initTraceBoundsManager(parsedTraceData.parsedTrace);
    await wrapInTimeout(context, () => {
      Timeline.ModificationsManager.ModificationsManager.reset();
      Timeline.ModificationsManager.ModificationsManager.initAndActivateModificationsManager(parsedTraceData.model, 0);
    }, 5_000, `Creating modification manager for ${name}`);
    return {
      parsedTrace: parsedTraceData.parsedTrace,
      insights: parsedTraceData.insights,
      metadata: parsedTraceData.metadata,
    };
  }

  /**
   * Initialise the BoundsManager with the bounds from a trace.
   * This isn't always required, but some of our code - particularly at the UI
   * level - rely on this being set. This is always set in the actual panel, but
   * parsing a trace in a test does not automatically set it.
   **/
  static initTraceBoundsManager(data: Trace.Handlers.Types.ParsedTrace): void {
    TraceBounds.TraceBounds.BoundsManager
        .instance({
          forceNew: true,
        })
        .resetWithNewBounds(data.Meta.traceBounds);
  }

  static async executeTraceEngineOnFileContents(
      contents: Trace.Types.File.Contents, emulateFreshRecording = false,
      traceEngineConfig?: Trace.Types.Configuration.Configuration): Promise<{
    model: Trace.TraceModel.Model,
    metadata: Trace.Types.File.MetaData,
    parsedTrace: Trace.Handlers.Types.ParsedTrace,
    insights: Trace.Insights.Types.TraceInsightSets|null,
  }> {
    const events = 'traceEvents' in contents ? contents.traceEvents : contents;
    const metadata = 'metadata' in contents ? contents.metadata : {};
    return await new Promise((resolve, reject) => {
      const model = Trace.TraceModel.Model.createWithAllHandlers(traceEngineConfig);
      model.addEventListener(Trace.TraceModel.ModelUpdateEvent.eventName, (event: Event) => {
        const {data} = event as Trace.TraceModel.ModelUpdateEvent;

        // When we receive the final update from the model, update the recording
        // state back to waiting.
        if (Trace.TraceModel.isModelUpdateDataComplete(data)) {
          const metadata = model.metadata(0);
          const parsedTrace = model.parsedTrace(0);
          const insights = model.traceInsights(0);
          if (metadata && parsedTrace) {
            resolve({
              model,
              metadata,
              parsedTrace,
              insights,
            });
          } else {
            reject(new Error('Unable to load trace'));
          }
        }
      });

      void model
          .parse(events, {
            metadata,
            isFreshRecording: emulateFreshRecording,
            async resolveSourceMap(params) {
              const {sourceUrl, sourceMapUrl, cachedRawSourceMap} = params;

              if (cachedRawSourceMap) {
                return new SDK.SourceMap.SourceMap(sourceUrl, sourceMapUrl, cachedRawSourceMap);
              }

              if (sourceMapUrl.startsWith('data:')) {
                const rawSourceMap = await (await fetch(sourceMapUrl)).json();
                return new SDK.SourceMap.SourceMap(sourceUrl, sourceMapUrl, rawSourceMap);
              }

              return null;
            },
          })
          .catch(e => console.error(e));
    });
  }

  static async loadTraceFileFromURL(url: URL): Promise<Trace.Types.File.TraceFile> {
    const contents = await fetchFileAsText(url);
    const traceContents = JSON.parse(contents) as Trace.Types.File.TraceFile;
    return traceContents;
  }
}

export async function fetchFileAsText(url: URL): Promise<string> {
  const response = await fetch(url);
  if (response.status !== 200) {
    throw new Error(`Unable to load ${url}`);
  }

  const buffer = await response.arrayBuffer();
  const contents = await Common.Gzip.arrayBufferToString(buffer);
  return contents;
}

// Below this point are private methods used in the TraceLoader class. These
// are purposefully not exported, you should use one of the static methods
// defined above.

/**
 * Wraps an async Promise with a timeout. We use this to break down and
 * instrument `TraceLoader` to understand on CQ where timeouts occur.
 *
 * @param asyncPromise The Promise representing the async operation to be timed.
 * @param timeoutMs The timeout in milliseconds.
 * @param stepName An identifier for the step (for logging).
 * @returns A promise that resolves with the operation's result, or rejects if it times out.
 */
async function wrapInTimeout<T>(
    mochaContext: Mocha.Context|Mocha.Suite|null, callback: () => Promise<T>| T, timeoutMs: number,
    stepName: string): Promise<T> {
  const timeout = Promise.withResolvers<void>();
  const timeoutId = setTimeout(() => {
    let testTitle = '(unknown test)';
    if (mochaContext) {
      if (isMochaContext(mochaContext)) {
        testTitle = mochaContext.currentTest?.fullTitle() ?? testTitle;
      } else {
        testTitle = mochaContext.fullTitle();
      }
    }
    console.error(`TraceLoader: [${stepName}]: took longer than ${timeoutMs}ms in test "${testTitle}"`);
    timeout.reject(new Error(`Timeout for TraceLoader: '${stepName}' after ${timeoutMs}ms.`));
  }, timeoutMs);

  // Race the original promise against the timeout promise
  try {
    const cbResult = await Promise.race([callback(), timeout.promise]);
    timeout.resolve();
    return cbResult as T;
  } finally {
    // Clear the timeout if the original promise resolves/rejects,
    // or if the timeout promise wins the race.
    clearTimeout(timeoutId);
  }
}

function isMochaContext(arg: unknown): arg is Mocha.Context {
  return typeof arg === 'object' && arg !== null && 'currentTest' in arg;
}
