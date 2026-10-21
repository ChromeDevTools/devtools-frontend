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
     * Formats the code and checks it against the size limits. This method does
     * not check syntax: if formatting fails, the formatter returns the original
     * code, and running it on the page reports any SyntaxError to the model.
     */
    static validateAndFormatCode(code: string): Promise<{
        formattedCode?: string;
        error?: string;
    }>;
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof ExecuteJavaScriptArgs>;
    displayInfoFromArgs(params: ExecuteJavaScriptArgs): {
        title: string;
        thought: string;
        action: string;
    };
    handler(params: ExecuteJavaScriptArgs, context: BaseToolCapability & PageExecutionCapability & StyleMutationCapability & OriginLockCapability, options?: FunctionHandlerOptions): Promise<DataHandlerResult<unknown>>;
}
