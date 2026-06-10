import * as Host from '../../../core/host/host.js';
import type { FunctionCallHandlerResult, FunctionHandlerOptions } from '../agents/AiAgent.js';
import { type Tool, type ToolArgs, type ToolContext, ToolName } from './Tool.js';
export interface GetStylesArgs extends ToolArgs {
    elements: number[];
    styleProperties: string[];
    explanation: string;
}
export declare class GetStylesTool implements Tool<GetStylesArgs, unknown> {
    readonly name = ToolName.GET_STYLES;
    readonly description = "Get computed and source styles for one or multiple elements on the inspected page for multiple elements at once by uid.\n\n**CRITICAL** An element uid is a number, not a selector.\n**CRITICAL** Use selectors to refer to elements in the text output. Do not use uids.\n**CRITICAL** Always provide the explanation argument to explain what and why you query.\n**CRITICAL** You MUST provide a specific list of CSS property names. Do not use generic values like \"all\" or \"*\".";
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetStylesArgs>;
    displayInfoFromArgs(params: GetStylesArgs): {
        title: string;
        thought: string;
        action: string;
    };
    handler(params: GetStylesArgs, context: ToolContext, _options?: FunctionHandlerOptions): Promise<FunctionCallHandlerResult<unknown>>;
}
