import type * as Host from '../../../core/host/host.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import type { ConversationContext, FunctionCallHandlerResult, FunctionHandlerOptions } from '../agents/AiAgent.js';
import type { executeJsCode } from '../agents/ExecuteJavascript.js';
import type { ChangeManager } from '../ChangeManager.js';
/**
 * Base capability for all tool contexts, providing access to the conversation context.
 */
export interface BaseToolCapability {
    /**
     * The active context for the current conversation step, if any.
     */
    conversationContext: ConversationContext<unknown> | null;
}
/**
 * Capability for tools that need to execute JavaScript code on the inspected page.
 */
export interface PageExecutionCapability {
    /**
     * Function to execute JavaScript code in the page context.
     */
    execJs: typeof executeJsCode;
    /**
     * Returns the DOM node that acts as the execution context (i.e. `$0` inside the execution context)
     * for running JavaScript.
     */
    getExecutionContextNode(): SDK.DOMModel.DOMNode | null;
}
/**
 * Capability for tools that need to manage and apply style mutations to the page.
 */
export interface StyleMutationCapability {
    /**
     * The change manager for tracking and applying style changes.
     */
    changeManager: ChangeManager;
    /**
     * Creates an extension scope for applying changes, ensuring they can be uninstalled when done.
     */
    createExtensionScope(changes: ChangeManager): {
        install(): Promise<void>;
        uninstall(): Promise<void>;
    };
}
/**
 * Capability for tools that need access to the current SDK Target of the inspected page.
 */
export interface TargetCapability {
    /**
     * Returns the current SDK Target for the inspected page.
     */
    getTarget(): SDK.Target.Target | null;
}
/**
 * Capability for tools that need to enforce origin locking for security.
 */
export interface OriginLockCapability {
    /**
     * Returns the origin that the current conversation is locked to, if any.
     */
    getEstablishedOrigin(): string | undefined;
}
/**
 * Capability for tools that need to run or query Lighthouse audits.
 */
export interface LighthouseCapability {
    lighthouseRecording?: (overrides?: LHModel.RunTypes.RunOverrides) => Promise<LHModel.ReporterTypes.ReportJSON | null>;
}
/**
 * Unified context interface providing all capabilities available in the project.
 * Used by the agent to pass a complete context to any tool type-safely.
 */
export type AllToolsContext = BaseToolCapability & PageExecutionCapability & StyleMutationCapability & TargetCapability & OriginLockCapability & LighthouseCapability;
/**
 * Base argument type for AI Tools.
 */
export type ToolArgs = Record<string, unknown>;
export declare const enum ToolName {
    EXECUTE_JAVASCRIPT = "executeJavaScript",
    GET_STYLES = "getStyles",
    LIST_NETWORK_REQUESTS = "listNetworkRequests",
    GET_NETWORK_REQUEST_DETAILS = "getNetworkRequestDetails",
    GET_LIGHTHOUSE_AUDITS = "getLighthouseAudits",
    RESOLVE_LIGHTHOUSE_PATH = "resolveLighthousePath"
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
 * Binds the parameter schema properties and the handler implementation to a strict `Args` and `ContextType` contract.
 *
 * @template Args - The expected object type for tool arguments. Must be an object type.
 * @template ReturnType - The type of data returned by the handler function.
 * @template ContextType - The interface defining the capabilities this tool requires. Defaults to `BaseToolCapability`.
 */
export interface Tool<Args extends ToolArgs = ToolArgs, ReturnType = unknown, ContextType extends BaseToolCapability = BaseToolCapability> extends BaseTool {
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof Args>;
    readonly displayInfoFromArgs?: (args: Args) => {
        title?: string;
        thought?: string;
        action?: string;
        suggestions?: [string, ...string[]];
    };
    /**
     * The implementation function called when the AI invokes this tool.
     *
     * @param args The arguments provided by the AI model matching the tool's parameter schema.
     * @param context The context object providing the capabilities requested by `ContextType`.
     * @param options Additional runtime options for the handler execution.
     */
    handler(args: Args, context: ContextType, options?: FunctionHandlerOptions): Promise<FunctionCallHandlerResult<ReturnType>>;
}
