import * as Host from '../../../core/host/host.js';
import type { FunctionCallHandlerResult, FunctionHandlerOptions } from '../agents/AiAgent.js';
import { type BaseToolCapability, type PageExecutionCapability, type StyleMutationCapability, type Tool, type ToolArgs, ToolName } from './Tool.js';
export interface ExecuteJavaScriptArgs extends ToolArgs {
    code: string;
    explanation: string;
    title: string;
}
export declare class ExecuteJavaScriptTool implements Tool<ExecuteJavaScriptArgs, unknown, BaseToolCapability & PageExecutionCapability & StyleMutationCapability> {
    readonly name = ToolName.EXECUTE_JAVASCRIPT;
    readonly description = "This function allows you to run JavaScript code on the inspected page to access the element styles and page content.\nCall this function to gather additional information or modify the page state. Call this function enough times to investigate the user request.";
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof ExecuteJavaScriptArgs>;
    displayInfoFromArgs(params: ExecuteJavaScriptArgs): {
        title: string;
        thought: string;
        action: string;
    };
    handler(params: ExecuteJavaScriptArgs, context: BaseToolCapability & PageExecutionCapability & StyleMutationCapability, options?: FunctionHandlerOptions): Promise<FunctionCallHandlerResult<unknown>>;
}
