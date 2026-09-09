import type * as Protocol from '../generated/protocol.js';
import * as Trace from '../models/trace/trace.js';
interface ParsedTraceAndModel {
    parsedTrace: Trace.TraceModel.ParsedTrace;
    model: Trace.TraceModel.Model;
}
export interface TraceEngineLoaderOptions {
    /**
     * The configuration the trace engine runs with.
     *
     * TraceLoader caches parsed traces by file name and stringified configuration key.
     * If a test supplies a custom configuration, TraceLoader parses the trace again
     * and caches the result under that configuration key.
     *
     * Optional. Falls back to default configuration if not provided.
     */
    config?: Trace.Types.Configuration.Configuration;
    /**
     * Whether to initialize and activate the Timeline ModificationsManager.
     *
     * ModificationsManager tracks user modifications in the Timeline panel.
     * These include breadcrumbs, entry annotations, entry labels, and hidden entries.
     *
     * Setting this to `true` dynamically imports the `panels/timeline` entrypoint.
     * This import pulls in UI widgets and settings that depend on the browser DOM.
     * Do not enable this in headless or Node unit tests that run without DOM support.
     *
     * Enable this only in Timeline panel unit tests that test modifications,
     * breadcrumbs, or annotation overlays.
     *
     * Defaults to `false`.
     */
    withModificationsManager?: boolean;
}
/**
 * Loads trace files defined as fixtures in front_end/panels/timeline/fixtures/traces.
 *
 * Will automatically cache the results to save time processing the same trace
 * multiple times in a run of the test suite.
 **/
export declare class TraceLoader {
    /**
     * Loads a trace file into memory and returns its contents after
     * JSON.parse-ing them
     *
     **/
    static fixtureContents(context: Mocha.Context | Mocha.Suite | null, name: string): Promise<Trace.Types.File.Contents>;
    static traceFile(context: Mocha.Context | Mocha.Suite | null, name: string): Promise<Trace.Types.File.TraceFile>;
    /**
     * Load an array of raw events from the trace file.
     **/
    static rawEvents(context: Mocha.Context | Mocha.Suite | null, name: string): Promise<readonly Trace.Types.Events.Event[]>;
    /**
     * Load the metadata from a trace file (throws if not present).
     **/
    static metadata(context: Mocha.Context | Mocha.Suite | null, name: string): Promise<Trace.Types.File.MetaData>;
    /**
     * Load an array of raw events from the trace file.
     * Will default to typing those events using the types from Trace Engine, but
     * can be overriden by passing the legacy EventPayload type as the generic.
     **/
    static rawCPUProfile(context: Mocha.Context | Mocha.Suite | null, name: string): Promise<Protocol.Profiler.Profile>;
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
    static traceEngine(context: Mocha.Context | Mocha.Suite | null, name: string, options?: TraceEngineLoaderOptions): Promise<Trace.TraceModel.ParsedTrace>;
    /**
     * Initialise the BoundsManager with the bounds from a trace.
     * This isn't always required, but some of our code - particularly at the UI
     * level - rely on this being set. This is always set in the actual panel, but
     * parsing a trace in a test does not automatically set it.
     **/
    static initTraceBoundsManager(parsedTrace: Trace.TraceModel.ParsedTrace): void;
    static executeTraceEngineOnFileContents(contents: Trace.Types.File.Contents, emulateFreshRecording?: boolean, traceEngineConfig?: Trace.Types.Configuration.Configuration): Promise<ParsedTraceAndModel>;
    static loadTraceFileFromURL(url: URL): Promise<Trace.Types.File.TraceFile>;
    /**
     * Karma test run in a single context if we load all the traces
     * we risk getting out of memory
     */
    static resetCache(): void;
}
export declare function fetchFileAsText(url: URL): Promise<string>;
export {};
