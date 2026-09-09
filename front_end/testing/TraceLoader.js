// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../core/common/common.js';
import * as SDK from '../core/sdk/sdk.js';
import * as Trace from '../models/trace/trace.js';
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
const fileContentsCache = new Map();
// The new engine cache is a map of maps of:
// trace file name => trace engine configuration => trace data
//
// The first map is a Map of string (which is the name of the trace file) to a
// new map, where the key is the trace engine configuration stringified.
// This ensures that we cache as much as we can, but if you load the same trace
// file with different trace engine configurations, we will not use the cache
// and will reparse. This is required as some of the settings and experiments
// change if events are kept and dropped.
const traceEngineCache = new Map();
/**
 * Loads trace files defined as fixtures in front_end/panels/timeline/fixtures/traces.
 *
 * Will automatically cache the results to save time processing the same trace
 * multiple times in a run of the test suite.
 **/
export class TraceLoader {
    /**
     * Loads a trace file into memory and returns its contents after
     * JSON.parse-ing them
     *
     **/
    static async fixtureContents(context, name) {
        const cached = fileContentsCache.get(name);
        if (cached) {
            return cached;
        }
        const urlForTest = new URL(`../panels/timeline/fixtures/traces/${name}`, import.meta.url);
        const contents = await TraceLoader.loadTraceFileFromURL(urlForTest);
        fileContentsCache.set(name, contents);
        return contents;
    }
    static async traceFile(context, name) {
        const contents = await TraceLoader.fixtureContents(context, name);
        const traceEvents = 'traceEvents' in contents ? contents.traceEvents : contents;
        const metadata = 'metadata' in contents ? contents.metadata : {};
        return { traceEvents, metadata };
    }
    /**
     * Load an array of raw events from the trace file.
     **/
    static async rawEvents(context, name) {
        const contents = await TraceLoader.fixtureContents(context, name);
        const events = 'traceEvents' in contents ? contents.traceEvents : contents;
        return events;
    }
    /**
     * Load the metadata from a trace file (throws if not present).
     **/
    static async metadata(context, name) {
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
    static async rawCPUProfile(context, name) {
        const contents = await TraceLoader.fixtureContents(context, name);
        return contents;
    }
    /**
     * Executes the trace engine on a fixture file and returns the parsed trace.
     *
     * TraceLoader caches parsed trace results in memory across tests.
     * When loading a trace, TraceLoader executes the following steps:
     * 1. Resets TraceBounds.BoundsManager to empty to avoid leaking state between tests.
     * 2. Checks the cache for an existing parsed trace matching the fixture name and configuration.
     * 3. If missing from the cache, reads the fixture and parses the events.
     *    Parsing runs with `yieldToMain: false` to avoid simulated main thread delays in tests.
     * 4. Initializes TraceBounds.BoundsManager with the trace bounds and activates SyntheticEventsManager.
     * 5. If `options.withModificationsManager` is `true`, dynamically imports the Timeline panel
     *    entrypoint, resets ModificationsManager, and activates a new manager instance.
     *
     * Usage examples:
     * ```ts
     * // Standard trace parse (model, handler, lantern, or AI assistance tests)
     * const parsedTrace = await TraceLoader.traceEngine(this, 'basic-trace.json.gz');
     *
     * // Custom engine configuration
     * const parsedTrace = await TraceLoader.traceEngine(this, 'basic-trace.json.gz', {config});
     *
     * // Timeline panel test that tests modifications, breadcrumbs, or annotations
     * const parsedTrace = await TraceLoader.traceEngine(this, 'basic-trace.json.gz', {withModificationsManager: true});
     * ```
     *
     * @param context The Mocha test context.
     * @param name The name of the trace file in `front_end/panels/timeline/fixtures/traces`.
     * @param options Trace engine loader options.
     */
    static async traceEngine(context, name, options = {}) {
        const { config = Trace.Types.Configuration.defaults(), withModificationsManager = false, } = options;
        let timelineModule;
        if (withModificationsManager) {
            timelineModule = await import('../panels/timeline/timeline.js');
        }
        // Force the TraceBounds to be reset to empty. This ensures that in
        // tests where we are using the new engine data we don't accidentally
        // rely on the fact that a previous test has set the BoundsManager.
        TraceBounds.TraceBounds.BoundsManager.instance({ forceNew: true });
        const configCacheKey = Trace.Types.Configuration.configToCacheKey(config);
        const fromCache = traceEngineCache.get(name)?.get(configCacheKey);
        // If we have results from the cache, we use those to ensure we keep the
        // tests speedy and don't re-parse trace files over and over again.
        if (fromCache) {
            const parsedTrace = fromCache.parsedTrace;
            await wrapInTimeout(context, () => {
                const syntheticEventsManager = fromCache.model.syntheticTraceEventsManager(0);
                if (!syntheticEventsManager) {
                    throw new Error('Cached trace engine result did not have a synthetic events manager instance');
                }
                Trace.Helpers.SyntheticEvents.SyntheticEventsManager.activate(syntheticEventsManager);
                TraceLoader.initTraceBoundsManager(parsedTrace);
                if (timelineModule) {
                    timelineModule.ModificationsManager.ModificationsManager.reset();
                    timelineModule.ModificationsManager.ModificationsManager.initAndActivateModificationsManager(fromCache.model, 0);
                }
            }, 4_000, 'Initializing state for cached trace');
            return parsedTrace;
        }
        const fileContents = await wrapInTimeout(context, async () => {
            return await TraceLoader.fixtureContents(context, name);
        }, 30_000, `Loading fixtureContents for ${name}`);
        const parsedTraceFileAndModel = await wrapInTimeout(context, async () => {
            return await TraceLoader.executeTraceEngineOnFileContents(fileContents, /* emulate fresh recording */ false, config);
        }, 30_000, `Executing traceEngine for ${name}`);
        const cacheByName = traceEngineCache.get(name) ?? new Map();
        cacheByName.set(configCacheKey, parsedTraceFileAndModel);
        traceEngineCache.set(name, cacheByName);
        TraceLoader.initTraceBoundsManager(parsedTraceFileAndModel.parsedTrace);
        if (timelineModule) {
            await wrapInTimeout(context, () => {
                timelineModule.ModificationsManager.ModificationsManager.reset();
                timelineModule.ModificationsManager.ModificationsManager.initAndActivateModificationsManager(parsedTraceFileAndModel.model, 0);
            }, 5_000, `Creating modification manager for ${name}`);
        }
        return parsedTraceFileAndModel.parsedTrace;
    }
    /**
     * Initialise the BoundsManager with the bounds from a trace.
     * This isn't always required, but some of our code - particularly at the UI
     * level - rely on this being set. This is always set in the actual panel, but
     * parsing a trace in a test does not automatically set it.
     **/
    static initTraceBoundsManager(parsedTrace) {
        TraceBounds.TraceBounds.BoundsManager
            .instance({
            forceNew: true,
        })
            .resetWithNewBounds(parsedTrace.data.Meta.traceBounds);
    }
    static async executeTraceEngineOnFileContents(contents, emulateFreshRecording = false, traceEngineConfig) {
        const events = 'traceEvents' in contents ? contents.traceEvents : contents;
        const metadata = 'metadata' in contents ? contents.metadata : {};
        return await new Promise((resolve, reject) => {
            const model = Trace.TraceModel.Model.createWithAllHandlers(traceEngineConfig);
            model.addEventListener(Trace.TraceModel.ModelUpdateEvent.eventName, (event) => {
                const { data } = event;
                // When we receive the final update from the model, update the recording
                // state back to waiting.
                if (Trace.TraceModel.isModelUpdateDataComplete(data)) {
                    const parsedTrace = model.parsedTrace(0);
                    if (!parsedTrace) {
                        reject(new Error('Unable to load trace'));
                        return;
                    }
                    resolve({
                        model,
                        parsedTrace,
                    });
                }
            });
            void model
                .parse(events, {
                metadata,
                isFreshRecording: emulateFreshRecording,
                yieldToMain: false,
                async resolveSourceMap(params) {
                    const { sourceUrl, sourceMapUrl, cachedRawSourceMap } = params;
                    if (cachedRawSourceMap) {
                        return new SDK.SourceMap.SourceMap(sourceUrl, sourceMapUrl, cachedRawSourceMap, Common.Console.Console.instance());
                    }
                    if (sourceMapUrl.startsWith('data:')) {
                        const rawSourceMap = await (await fetch(sourceMapUrl)).json();
                        return new SDK.SourceMap.SourceMap(sourceUrl, sourceMapUrl, rawSourceMap, Common.Console.Console.instance());
                    }
                    return null;
                },
            })
                .catch(e => console.error(e));
        });
    }
    static async loadTraceFileFromURL(url) {
        const contents = await fetchFileAsText(url);
        const traceContents = JSON.parse(contents);
        return traceContents;
    }
    /**
     * Karma test run in a single context if we load all the traces
     * we risk getting out of memory
     */
    static resetCache() {
        fileContentsCache.clear();
        traceEngineCache.clear();
    }
}
export async function fetchFileAsText(url) {
    if (typeof window === 'undefined') {
        // @ts-expect-error no node types here.
        const fs = await import('node:fs/promises');
        // @ts-expect-error no node types here.
        const { fileURLToPath } = await import('node:url');
        const path = fileURLToPath(url);
        const buffer = await fs.readFile(path);
        const contents = await Common.Gzip.arrayBufferToString(buffer);
        return contents;
    }
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
async function wrapInTimeout(mochaContext, callback, timeoutMs, stepName) {
    const timeout = Promise.withResolvers();
    const timeoutId = setTimeout(() => {
        let testTitle = '(unknown test)';
        if (mochaContext) {
            try {
                if (isMochaContext(mochaContext)) {
                    testTitle = mochaContext.currentTest?.fullTitle() ?? testTitle;
                }
                else {
                    // For unknown reasons, we cannot trust the Mocha.Suite types in TS.
                    // They may be out of sync with the karma-mocha plugin.
                    // But, `suite.test.title` is present.
                    testTitle = mochaContext.test.title;
                }
            }
            catch (e) {
                console.error('Determining Mocha test context for trace timeout failed', e);
            }
        }
        console.error(`TraceLoader: [${stepName}]: took longer than ${timeoutMs}ms in test "${testTitle}"`);
        timeout.reject(new Error(`Timeout for TraceLoader: '${stepName}' after ${timeoutMs}ms.`));
    }, timeoutMs);
    // Race the original promise against the timeout promise
    try {
        const cbResult = await Promise.race([callback(), timeout.promise]);
        timeout.resolve();
        return cbResult;
    }
    finally {
        // Clear the timeout if the original promise resolves/rejects,
        // or if the timeout promise wins the race.
        clearTimeout(timeoutId);
    }
}
function isMochaContext(arg) {
    return typeof arg === 'object' && arg !== null && 'currentTest' in arg;
}
//# sourceMappingURL=TraceLoader.js.map