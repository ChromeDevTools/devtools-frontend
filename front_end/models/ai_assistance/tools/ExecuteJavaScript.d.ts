import * as Host from '../../../core/host/host.js';
import type { FunctionHandlerOptions } from '../agents/AiAgent.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type PageExecutionCapability, type StyleMutationCapability, type ToolArgs, ToolName } from './Tool.js';
export interface ExecuteJavaScriptArgs extends ToolArgs {
    code: string;
    explanation: string;
    title: string;
}
export declare class ExecuteJavaScriptTool implements DataTool<ExecuteJavaScriptArgs, unknown, BaseToolCapability & PageExecutionCapability & StyleMutationCapability> {
    readonly name: ToolName;
    readonly description: string;
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
    handler(params: ExecuteJavaScriptArgs, context: BaseToolCapability & PageExecutionCapability & StyleMutationCapability, options?: FunctionHandlerOptions): Promise<DataHandlerResult<unknown>>;
}
