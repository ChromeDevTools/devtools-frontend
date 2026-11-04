import * as Host from '../../../core/host/host.js';
import type { FunctionHandlerOptions } from '../agents/AiAgent.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type OriginLockCapability, type PageExecutionCapability, PermissionPrompt, type StyleMutationCapability, type ToolArgs, ToolName } from './Tool.js';
export interface ExecuteJavaScriptArgs extends ToolArgs {
    code: string;
    explanation: string;
    title: string;
}
export declare class ExecuteJavaScriptTool implements DataTool<ExecuteJavaScriptArgs, unknown, BaseToolCapability & PageExecutionCapability & StyleMutationCapability & OriginLockCapability> {
    readonly name: ToolName;
    readonly permissionPrompt: PermissionPrompt;
    readonly permissionTitle: string;
    readonly displayName: string;
    readonly description: string;
    /**
     * Checks the raw AI-generated code against the size limits and returns an
     * error message if any limit is exceeded.
     *
     * Validation runs directly on the unformatted input string so that line-length
     * checks match what `PermissionPrompt` displays and avoid false rejections
     * from formatter line collapsing.
     */
    static validateCode(code: string): string | undefined;
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof ExecuteJavaScriptArgs>;
    displayInfoFromArgs(params: ExecuteJavaScriptArgs): {
        title: string;
        thought: string;
        action: string;
        javascriptCode: string;
    };
    handler(params: ExecuteJavaScriptArgs, context: BaseToolCapability & PageExecutionCapability & StyleMutationCapability & OriginLockCapability, options?: FunctionHandlerOptions): Promise<DataHandlerResult<unknown>>;
}
