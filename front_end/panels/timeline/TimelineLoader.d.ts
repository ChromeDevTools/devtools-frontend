import type * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Trace from '../../models/trace/trace.js';
import type { Client } from './TimelineController.js';
/**
 * This class handles loading traces from URL, and from the Lighthouse panel
 * It also handles loading cpuprofiles from url and console.profileEnd()
 */
export declare class TimelineLoader {
    #private;
    private client;
    private canceledCallback;
    private filter;
    constructor(client: Client);
    static loadFromParsedJsonFile(contents: ParsedJSONFile, client: Client): TimelineLoader;
    static loadFromEvents(events: Trace.Types.Events.Event[], client: Client): TimelineLoader;
    static loadFromTraceFile(traceFile: Trace.Types.File.TraceFile, client: Client): TimelineLoader;
    static loadFromCpuProfile(profile: Protocol.Profiler.Profile, client: Client): TimelineLoader;
    static loadFromURL(url: Platform.DevToolsPath.UrlString, client: Client): Promise<TimelineLoader>;
    addEvents(events: readonly Trace.Types.Events.Event[], metadata: Trace.Types.File.MetaData | null): Promise<void>;
    cancel(): Promise<void>;
    private reportErrorAndCancelLoading;
    close(): Promise<void>;
    private finalizeTrace;
    traceFinalizedForTest(): Promise<void>;
}
/**
 * Used when we parse the input, but do not yet know if it is a raw CPU Profile or a Trace
 **/
type ParsedJSONFile = Trace.Types.File.Contents | Protocol.Profiler.Profile;
export {};
