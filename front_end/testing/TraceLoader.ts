// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../generated/protocol.js';
import * as TraceEngine from '../models/trace/trace.js';
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
const fileContentsCache = new Map<string, TraceEngine.Types.File.Contents>();

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
                                   traceData: TraceEngine.Handlers.Types.TraceParseData,
                                   insights: TraceEngine.Insights.Types.TraceInsightData | null,
                                   model: TraceEngine.TraceModel.Model,
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
   * The context might be null when we only render a component example.
   **/
  static setTestTimeout(context: Mocha.Context|Mocha.Suite|null): void {
    if (!context || context.timeout() >= 10_000) {
      return;
    }
    context?.timeout(10_000);
  }

  /**
   * Loads a trace file into memory and returns its contents after
   * JSON.parse-ing them
   *
   **/
  static async fixtureContents(context: Mocha.Context|Mocha.Suite|null, name: string):
      Promise<TraceEngine.Types.File.Contents> {
    TraceLoader.setTestTimeout(context);
    const cached = fileContentsCache.get(name);
    if (cached) {
      return cached;
    }
    // Required URLs differ across the component server and the unit tests, so try both.
    const urlForTest = new URL(`../front_end/panels/timeline/fixtures/traces/${name}`, window.location.origin);
    const urlForComponentExample =
        new URL(`../front_end/panels/timeline/fixtures/traces/${name}`, window.location.origin);

    if (window.location.pathname.includes('ui/components/docs') ||
        window.location.pathname.includes('ui\\components\\docs')) {
      const contents = await loadTraceFileFromURL(urlForComponentExample);
      fileContentsCache.set(name, contents);
      return contents;
    }
    const contents = await loadTraceFileFromURL(urlForTest);
    fileContentsCache.set(name, contents);
    return contents;
  }

  /**
   * Load an array of raw events from the trace file.
   * Will default to typing those events using the types from TraceEngine, but
   * can be overriden by passing the legacy EventPayload type as the generic.
   **/
  static async rawEvents(context: Mocha.Context|Mocha.Suite|null, name: string):
      Promise<readonly TraceEngine.Types.TraceEvents.TraceEventData[]> {
    const contents = await TraceLoader.fixtureContents(context, name);

    const events = 'traceEvents' in contents ? contents.traceEvents : contents;
    TraceEngine.Helpers.SyntheticEvents.SyntheticEventsManager.initAndActivate(events);
    return events;
  }

  /**
   * Load an array of raw events from the trace file.
   * Will default to typing those events using the types from TraceEngine, but
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
   * @param context The Mocha test context. |allModelsFromFile| function easily
   * takes up more than our default Mocha timeout, which is 2s. So we have to
   * increase this test's timeout. It might be null when we only render a
   * component example.
   *
   * @param file The name of the trace file to be loaded.
   * The trace file should be in ../panels/timeline/fixtures/traces folder.
   *
   * @param options Additional trace options.
   * @param options.initTraceBounds (defaults to `true`) after the trace is
   * loaded, the TraceBounds manager will automatically be initialised using
   * the bounds from the trace.
   *
   * @param config The config the new trace engine should run with. Optional,
   * will fall back to the Default config if not provided.
   */
  static async traceEngine(
      context: Mocha.Context|Mocha.Suite|null, name: string,
      config: TraceEngine.Types.Configuration.Configuration = TraceEngine.Types.Configuration.defaults()): Promise<{
    traceData: TraceEngine.Handlers.Types.TraceParseData,
    insights: TraceEngine.Insights.Types.TraceInsightData|null,
  }> {
    // Force the TraceBounds to be reset to empty. This ensures that in
    // tests where we are using the new engine data we don't accidentally
    // rely on the fact that a previous test has set the BoundsManager.
    TraceBounds.TraceBounds.BoundsManager.instance({forceNew: true});

    const configCacheKey = TraceEngine.Types.Configuration.configToCacheKey(config);

    const fromCache = traceEngineCache.get(name)?.get(configCacheKey);
    if (fromCache) {
      TraceLoader.initTraceBoundsManager(fromCache.traceData);
      Timeline.ModificationsManager.ModificationsManager.initAndActivateModificationsManager(fromCache.model, 0);

      // This init step is usually done in model.parse(), but as we loaded from
      // the cache here, we manually run it.
      // The SyntheticEventsManager caches instances based on the rawEvents()
      // array, so we can safely do this even if we have already created an
      // instance for this trace before - the old one will be re-used, rather
      // than creating a new one.
      const rawEvents = fromCache.model.rawTraceEvents();
      if (rawEvents) {
        TraceEngine.Helpers.SyntheticEvents.SyntheticEventsManager.initAndActivate(
            rawEvents,
        );
      }
      return {traceData: fromCache.traceData, insights: fromCache.insights};
    }
    const fileContents = await TraceLoader.fixtureContents(context, name);
    const traceEngineData =
        await TraceLoader.executeTraceEngineOnFileContents(fileContents, /* emulate fresh recording */ false, config);

    const cacheByName = traceEngineCache.get(name) || new Map<string, {
                          traceData: TraceEngine.Handlers.Types.TraceParseData,
                          insights: TraceEngine.Insights.Types.TraceInsightData | null,
                          model: TraceEngine.TraceModel.Model,
                        }>();
    cacheByName.set(configCacheKey, traceEngineData);
    traceEngineCache.set(name, cacheByName);

    TraceLoader.initTraceBoundsManager(traceEngineData.traceData);
    Timeline.ModificationsManager.ModificationsManager.initAndActivateModificationsManager(traceEngineData.model, 0);
    return {
      traceData: traceEngineData.traceData,
      insights: traceEngineData.insights,
    };
  }

  /**
   * Initialise the BoundsManager with the bounds from a trace.
   * This isn't always required, but some of our code - particularly at the UI
   * level - rely on this being set. This is always set in the actual panel, but
   * parsing a trace in a test does not automatically set it.
   **/
  static initTraceBoundsManager(data: TraceEngine.Handlers.Types.TraceParseData): void {
    TraceBounds.TraceBounds.BoundsManager
        .instance({
          forceNew: true,
        })
        .resetWithNewBounds(data.Meta.traceBounds);
  }

  static async executeTraceEngineOnFileContents(
      contents: TraceEngine.Types.File.Contents, emulateFreshRecording = false,
      traceEngineConfig?: TraceEngine.Types.Configuration.Configuration): Promise<{
    model: TraceEngine.TraceModel.Model,
    metadata: TraceEngine.Types.File.MetaData,
    traceData: TraceEngine.Handlers.Types.TraceParseData,
    insights: TraceEngine.Insights.Types.TraceInsightData|null,
  }> {
    const events = 'traceEvents' in contents ? contents.traceEvents : contents;
    const metadata = 'metadata' in contents ? contents.metadata : {};
    return new Promise((resolve, reject) => {
      const model = TraceEngine.TraceModel.Model.createWithAllHandlers(traceEngineConfig);
      model.addEventListener(TraceEngine.TraceModel.ModelUpdateEvent.eventName, (event: Event) => {
        const {data} = event as TraceEngine.TraceModel.ModelUpdateEvent;

        // When we receive the final update from the model, update the recording
        // state back to waiting.
        if (TraceEngine.TraceModel.isModelUpdateDataComplete(data)) {
          const metadata = model.metadata(0);
          const traceData = model.traceParsedData(0);
          const insights = model.traceInsights(0);
          if (metadata && traceData) {
            resolve({
              model,
              metadata,
              traceData,
              insights,
            });
          } else {
            reject(new Error('Unable to load trace'));
          }
        }
      });

      void model.parse(events, {metadata, isFreshRecording: emulateFreshRecording}).catch(e => console.error(e));
    });
  }
}

// Below this point are private methods used in the TraceLoader class. These
// are purposefully not exported, you should use one of the static methods
// defined above.

async function loadTraceFileFromURL(url: URL): Promise<TraceEngine.Types.File.Contents> {
  const response = await fetch(url);
  if (response.status !== 200) {
    throw new Error(`Unable to load ${url}`);
  }

  const contentType = response.headers.get('content-type');
  const isGzipEncoded = contentType !== null && contentType.includes('gzip');
  let buffer = await response.arrayBuffer();
  if (isGzipEncoded) {
    buffer = await decodeGzipBuffer(buffer);
  }
  const decoder = new TextDecoder('utf-8');
  const contents = JSON.parse(decoder.decode(buffer)) as TraceEngine.Types.File.Contents;
  return contents;
}

interface CompressionStream extends ReadableWritablePair<Uint8Array, Uint8Array> {}
interface DecompressionStream extends ReadableWritablePair<Uint8Array, Uint8Array> {}
declare const CompressionStream: {
  prototype: CompressionStream,
  new (type: string): CompressionStream,
};

declare const DecompressionStream: {
  prototype: DecompressionStream,
  new (type: string): DecompressionStream,
};

function codec(buffer: ArrayBuffer, codecStream: CompressionStream|DecompressionStream): Promise<ArrayBuffer> {
  const {readable, writable} = new TransformStream();
  const codecReadable = readable.pipeThrough(codecStream);

  const writer = writable.getWriter();
  void writer.write(buffer);
  void writer.close();

  // Wrap in a response for convenience.
  const response = new Response(codecReadable);
  return response.arrayBuffer();
}

function decodeGzipBuffer(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  return codec(buffer, new DecompressionStream('gzip'));
}
