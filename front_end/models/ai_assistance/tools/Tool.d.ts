import type * as Host from '../../../core/host/host.js';
import type { ConversationContext, FunctionCallHandlerResult } from '../agents/AiAgent.js';
/**
 * Context provided to the tool's handler execution.
 */
export interface ToolContext {
    conversationContext: ConversationContext<unknown> | null;
}
/**
 * Base argument type for AI Tools.
 */
export type ToolArgs = Record<string, unknown>;
export declare const enum ToolName {
    GET_STYLES = "getStyles"
}
/**
 * Non-generic metadata interface for a Tool.
 * Used for storing and retrieving tools generically without type-erasure concerns.
 */
export interface BaseTool {
    readonly name: ToolName;
    readonly description: string;
    /**
     * JSON schema representing the parameters this tool accepts.
     */
    readonly parameters: Host.AidaClient.FunctionObjectParam<string | number | symbol>;
}
/**
 * Main generic interface for defining a Tool.
 * Binds the parameter schema properties and the handler implementation to a strict `Args` contract.
 *
 * @template Args - The expected object type for tool arguments. Must be an object type.
 * @template ReturnType - The type of data returned by the handler function.
 */
export interface Tool<Args extends ToolArgs = ToolArgs, ReturnType = unknown> extends BaseTool {
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof Args>;
    readonly displayInfoFromArgs?: (args: Args) => {
        title?: string;
        thought?: string;
        action?: string;
        suggestions?: [string, ...string[]];
    };
    handler(args: Args, context: ToolContext): Promise<FunctionCallHandlerResult<ReturnType>>;
}
