import * as Host from '../../../core/host/host.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type OriginLockCapability, type ToolArgs, ToolName } from './Tool.js';
export interface GetSourceContentArgs extends ToolArgs {
    id: number;
}
/**
 * A tool that retrieves the contents of a source file by its unique ID.
 * Filters access by origin lock to prevent cross-origin leakage.
 */
export declare class GetSourceContentTool implements DataTool<GetSourceContentArgs, {
    content: string;
}, BaseToolCapability & OriginLockCapability> {
    readonly name: ToolName;
    readonly description: string;
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetSourceContentArgs>;
    displayInfoFromArgs(args: GetSourceContentArgs): {
        title: string;
        action: string;
    };
    handler(args: GetSourceContentArgs, context: BaseToolCapability & OriginLockCapability): Promise<DataHandlerResult<{
        content: string;
    }>>;
}
