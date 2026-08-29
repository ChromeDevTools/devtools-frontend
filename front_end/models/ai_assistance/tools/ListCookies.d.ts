import * as Host from '../../../core/host/host.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type OriginLockCapability, type ServerLoggingCapability, ToolAnnotation, type ToolArgs, ToolName } from './Tool.js';
export interface ListCookiesArgs extends ToolArgs {
    origins?: string[];
}
export interface ListCookiesResult {
    cookieNamesByOrigin: Record<string, {
        cookies: string[];
    } | {
        error: string;
    }>;
}
export declare class ListCookiesTool implements DataTool<ListCookiesArgs, ListCookiesResult, BaseToolCapability & OriginLockCapability & ServerLoggingCapability> {
    readonly name: ToolName;
    readonly description: string;
    readonly annotations: ToolAnnotation[];
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof ListCookiesArgs>;
    displayInfoFromArgs(args: ListCookiesArgs): {
        title: string;
        action: string;
    };
    handler(args: ListCookiesArgs, context: BaseToolCapability & OriginLockCapability & ServerLoggingCapability): Promise<DataHandlerResult<ListCookiesResult>>;
}
