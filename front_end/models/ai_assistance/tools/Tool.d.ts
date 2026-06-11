import type * as Host from '../../../core/host/host.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import type { ConversationContext, FunctionCallHandlerResult, FunctionHandlerOptions } from '../agents/AiAgent.js';
import type { executeJsCode } from '../agents/ExecuteJavascript.js';
import type { ChangeManager } from '../ChangeManager.js';
/**
 * Context provided to the tool's handler execution.
 */
export interface ToolContext {
    conversationContext: ConversationContext<unknown> | null;
    changeManager?: ChangeManager;
    createExtensionScope?: (changes: ChangeManager) => {
        install(): Promise<void>;
        uninstall(): Promise<void>;
    };
    execJs?: typeof executeJsCode;
    /**
     * Returns the DOM node that acts as the execution context (i.e. `$0` inside the execution context)
     * for running JavaScript.
     */
    getExecutionContextNode?: () => SDK.DOMModel.DOMNode | null;
}
/**
 * Base argument type for AI Tools.
 */
export type ToolArgs = Record<string, unknown>;
export declare const enum ToolName {
    EXECUTE_JAVASCRIPT = "executeJavaScript",
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
    handler(args: Args, context: ToolContext, options?: FunctionHandlerOptions): Promise<FunctionCallHandlerResult<ReturnType>>;
}
