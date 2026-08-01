import type * as Host from '../../../core/host/host.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import type * as Trace from '../../trace/trace.js';
import type { AiWidget, ConversationContext, FunctionHandlerOptions } from '../agents/AiAgent.js';
import type { executeJsCode } from '../agents/ExecuteJavascript.js';
import type { ChangeManager } from '../ChangeManager.js';
/**
 * Result indicating an error occurred during tool execution.
 */
export interface ToolErrorResult {
    error: string;
}
/**
 * Result indicating user approval is required before running the tool.
 */
export interface ToolApprovalResult {
    requiresApproval: true;
    description: string | null;
}
/**
 * Result produced by a DataTool (`DataTool`). Contains a structured data payload (`result`)
 * returned to answer the AI query without altering the conversation's active focus target.
 * May optionally include UI widgets to render in the panel.
 */
export interface ToolDataResult<DataType> {
    result: DataType;
    widgets?: AiWidget[];
}
/**
 * Result produced by a ContextTool (`ContextTool`). Switches or introduces a new active focal entity
 * (`context`) into the conversation session (e.g., attaching a performance trace or selecting a DOM node)
 * along with a human-readable `description` explaining the context switch and optional UI widgets.
 */
export interface ToolContextResult<ContextType = unknown> {
    context: ConversationContext<ContextType>;
    description: string;
    widgets?: AiWidget[];
}
/**
 * Union for tools that produce data output (`DataTool`).
 */
export type DataHandlerResult<DataType> = ToolDataResult<DataType> | ToolApprovalResult | ToolErrorResult;
/**
 * Union for tools that switch or return conversation context (`ContextTool`).
 */
export type ContextHandlerResult<ContextType = unknown> = ToolContextResult<ContextType> | ToolApprovalResult | ToolErrorResult;
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
 * Capability for tools that need to record performance traces.
 */
export interface PerformanceRecordingCapability {
    performanceRecordAndReload?: () => Promise<Trace.TraceModel.ParsedTrace>;
}
/**
 * Unified context interface providing all capabilities available in the project.
 * Used by the agent to pass a complete context to any tool type-safely.
 */
export type AllToolsCapabilities = BaseToolCapability & PageExecutionCapability & StyleMutationCapability & TargetCapability & OriginLockCapability & LighthouseCapability & PerformanceRecordingCapability;
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
    RESOLVE_DEVTOOLS_NODE_PATH = "resolveDevtoolsNodePath",
    GET_ELEMENT_ACCESSIBILITY_DETAILS = "getElementAccessibilityDetails",
    RECORD_PERFORMANCE_TRACE = "recordPerformanceTrace"
}
/**
 * Base metadata interface for a Tool.
 * Provides parameter schema and display info formatting for tool argument types.
 *
 * @template ArgsType The expected object schema for tool arguments. Defaults to `ToolArgs`.
 */
export interface BaseTool<ArgsType extends ToolArgs = ToolArgs> {
    readonly name: ToolName;
    readonly description: string;
    /**
     * JSON schema representing the parameters this tool accepts.
     */
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof ArgsType>;
    /**
     * Converts the tool arguments into user-friendly display information.
     * This is used by the UI to show what the agent is doing (e.g., in the history/steps log).
     */
    readonly displayInfoFromArgs?: (args: ArgsType) => {
        title?: string;
        thought?: string;
        action?: string;
        suggestions?: [string, ...string[]];
    };
}
/**
 * Generic tool interface for tools that process inputs and return structured data results.
 *
 * @template ArgsType The expected object schema for tool arguments.
 * @template ReturnType The concrete type of data payload returned in the result.
 * @template CapabilitiesType The capabilities interface required by this tool. Defaults to `BaseToolCapability`.
 */
export interface DataTool<ArgsType extends ToolArgs = ToolArgs, ReturnType = unknown, CapabilitiesType extends BaseToolCapability = BaseToolCapability> extends BaseTool<ArgsType> {
    /**
     * The implementation function called when the AI invokes this tool.
     *
     * @param args The arguments provided by the AI model matching the tool's parameter schema.
     * @param capabilities The context object providing the capabilities requested by `CapabilitiesType`.
     * @param options Additional runtime options for the handler execution.
     */
    handler(args: ArgsType, capabilities: CapabilitiesType, options?: FunctionHandlerOptions): Promise<DataHandlerResult<ReturnType>>;
}
/**
 * Generic tool interface for tools that yield a new `ConversationContext` rather than plain data.
 *
 * @template ArgsType The expected object schema for tool arguments.
 * @template ContextClass The concrete item type wrapped by the returned `ConversationContext`.
 * @template CapabilitiesType The capabilities interface required by this tool. Defaults to `BaseToolCapability`.
 */
export interface ContextTool<ArgsType extends ToolArgs = ToolArgs, ContextClass = unknown, CapabilitiesType extends BaseToolCapability = BaseToolCapability> extends BaseTool<ArgsType> {
    /**
     * The implementation function called when the AI invokes this tool.
     *
     * @param args The arguments provided by the AI model matching the tool's parameter schema.
     * @param capabilities The context object providing the capabilities requested by `CapabilitiesType`.
     * @param options Additional runtime options for the handler execution.
     */
    handler(args: ArgsType, capabilities: CapabilitiesType, options?: FunctionHandlerOptions): Promise<ContextHandlerResult<ContextClass>>;
}
/**
 * Represents any AI Assistance tool: either a `DataTool` (returns data/widgets) or a `ContextTool` (switches active context).
 */
export type Tool<ArgsType extends ToolArgs = ToolArgs, ReturnType = unknown, CapabilitiesType extends BaseToolCapability = BaseToolCapability> = DataTool<ArgsType, ReturnType, CapabilitiesType> | ContextTool<ArgsType, ReturnType, CapabilitiesType>;
