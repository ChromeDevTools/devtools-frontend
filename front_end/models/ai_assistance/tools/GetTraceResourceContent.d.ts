import * as Host from '../../../core/host/host.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type PerformanceTraceCapability, type TargetCapability, type ToolArgs, ToolName } from './Tool.js';
/**
 * Arguments for {@link GetTraceResourceContentTool}.
 */
export interface GetTraceResourceContentArgs extends ToolArgs {
    /** The URL of the resource captured in the performance trace to retrieve. */
    url: string;
}
/**
 * Retrieves text content for a resource or script captured in the performance trace.
 *
 * Precedence:
 * 1. Checks trace metadata (`parsedTrace.data.Scripts`) for scripts captured during recording.
 * 2. Falls back to querying the live page target's `ResourceTreeModel`.
 *
 * Preconditions:
 * - Requires an active, freshly recorded trace session (fails on imported traces).
 * - Fails if resource is binary/non-text, cross-origin, or a `file://` URL.
 */
export declare class GetTraceResourceContentTool implements DataTool<GetTraceResourceContentArgs, {
    content: string;
}, BaseToolCapability & TargetCapability & PerformanceTraceCapability> {
    readonly name: ToolName;
    readonly description: string;
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetTraceResourceContentArgs>;
    displayInfoFromArgs(params: GetTraceResourceContentArgs): {
        title: string;
        action: string;
    };
    handler(params: GetTraceResourceContentArgs, capabilities: BaseToolCapability & TargetCapability & PerformanceTraceCapability): Promise<DataHandlerResult<{
        content: string;
    }>>;
}
