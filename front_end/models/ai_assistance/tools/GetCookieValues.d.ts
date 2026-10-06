import * as Host from '../../../core/host/host.js';
import type { FunctionHandlerOptions } from '../agents/AiAgent.js';
import { type CookieDetails } from './CookieUtils.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type OriginLockCapability, PermissionPrompt, type ServerLoggingCapability, ToolAnnotation, type ToolArgs, ToolName } from './Tool.js';
export declare const MAX_NUM_CHAR_LENGTH = 10000;
export interface GetCookieValuesArgs extends ToolArgs {
    cookieNames: string[];
    origins?: string[];
}
export interface GetCookieValuesResult {
    cookiesByOrigin: Record<string, {
        cookies?: CookieDetails[];
        error?: string;
    }>;
}
export declare class GetCookieValuesTool implements DataTool<GetCookieValuesArgs, GetCookieValuesResult, BaseToolCapability & OriginLockCapability & ServerLoggingCapability> {
    readonly name: ToolName;
    readonly permissionPrompt: PermissionPrompt;
    readonly permissionTitle: string;
    readonly description: string;
    readonly annotations: ToolAnnotation[];
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetCookieValuesArgs>;
    displayInfoFromArgs(args: GetCookieValuesArgs): {
        title: string;
        action: string;
    };
    handler(args: GetCookieValuesArgs, context: BaseToolCapability & OriginLockCapability & ServerLoggingCapability, options?: FunctionHandlerOptions): Promise<DataHandlerResult<GetCookieValuesResult>>;
}
