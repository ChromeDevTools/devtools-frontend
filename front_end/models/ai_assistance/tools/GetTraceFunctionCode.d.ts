import * as Host from '../../../core/host/host.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type PerformanceTraceCapability, type ToolArgs, ToolName } from './Tool.js';
/**
 * Arguments for {@link GetTraceFunctionCodeTool}.
 */
export interface GetTraceFunctionCodeArgs extends ToolArgs {
    /** The URL of the script containing the function recorded in the performance trace. */
    scriptUrl: string;
    /** The line number where the function is defined (0-based, as reported in the call tree). */
    line: number;
    /** The column number where the function is defined (0-based, as reported in the call tree). */
    column: number;
}
/**
 * Retrieves function code and line-by-line CPU profile execution costs from the performance trace.
 *
 * Preconditions:
 * - Requires an active, freshly recorded trace session (fails on imported traces).
 * - Requires resource access via the performance trace context.
 */
export declare class GetTraceFunctionCodeTool implements DataTool<GetTraceFunctionCodeArgs, string, BaseToolCapability & PerformanceTraceCapability> {
    readonly name: ToolName;
    readonly description: string;
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetTraceFunctionCodeArgs>;
    displayInfoFromArgs(params: GetTraceFunctionCodeArgs): {
        title: string;
        action: string;
    };
    handler(params: GetTraceFunctionCodeArgs, capabilities: BaseToolCapability & PerformanceTraceCapability): Promise<DataHandlerResult<string>>;
}
