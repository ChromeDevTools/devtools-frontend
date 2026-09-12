import type * as Host from '../../../core/host/host.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import type * as Trace from '../../trace/trace.js';
import type { AiWidget, ConversationContext, FunctionHandlerOptions } from '../agents/AiAgent.js';
import type { executeJsCode } from '../agents/ExecuteJavascript.js';
import type { ChangeManager } from '../ChangeManager.js';
import type { PerformanceTraceContext } from '../contexts/PerformanceTraceContext.js';
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
 * Base capability interface for all tool contexts.
 * This interface is intentionally empty: tools must explicitly declare any
 * capabilities they require (e.g. `TargetCapability`, `PerformanceTraceCapability`)
 * rather than relying on implicitly provided context.
 */
export interface BaseToolCapability {
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
     * Returns the primary SDK Target for the inspected page.
     *
     * WARNING: This method does not perform a security origin check. When a conversation
     * is locked to an iframe or subframe origin, this still returns the primary page target
     * so tools can resolve DOM nodes and frame hierarchies across frames.
     *
     * Tools that consume this target must independently validate the security origin of
     * any resolved entities (e.g. via `node.securityOrigin()`) against `getEstablishedOrigin()`.
     */
    getTarget(): SDK.Target.Target | null;
}
/**
 * Capability for tools that enforce conversation origin boundaries.
 */
export interface OriginLockCapability {
    /**
     * Returns the security origin locked for the current conversation.
     *
     * TODO: When V1 agents (StylingAgent, AccessibilityAgent) are removed,
     * simplify getEstablishedOrigin() to return SDK.SecurityOrigin.SecurityOrigin
     * non-optionally.
     *
     * @returns The established {@link SDK.SecurityOrigin.SecurityOrigin}, or `undefined`
     * if the conversation is not yet locked to an origin (e.g. before the first query).
     */
    getEstablishedOrigin(): SDK.SecurityOrigin.SecurityOrigin | undefined;
}
/**
 * Checks whether a target origin matches the established conversation origin lock.
 * Fails closed (returns false) if established origin is missing/opaque or target is cross-origin.
 */
export declare function isOriginAllowedByLock(establishedOrigin: SDK.SecurityOrigin.SecurityOrigin | undefined, targetOrigin: SDK.SecurityOrigin.SecurityOrigin | null | undefined): boolean;
/**
 * Capability for tools that need to inspect an active Lighthouse report from context.
 */
export interface LighthouseReportCapability {
    getLighthouseReport(): LHModel.ReporterTypes.ReportJSON | null;
}
/**
 * Capability for tools that trigger new Lighthouse audit runs.
 */
export interface LighthouseRecordingCapability {
    runLighthouse(overrides?: LHModel.RunTypes.RunOverrides): Promise<LHModel.ReporterTypes.ReportJSON | null>;
}
/**
 * Capability for tools that need access to the active performance trace context.
 */
export interface PerformanceTraceCapability {
    getPerformanceTraceContext(): PerformanceTraceContext | null;
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
export type AllToolsCapabilities = BaseToolCapability & PageExecutionCapability & StyleMutationCapability & TargetCapability & OriginLockCapability & LighthouseReportCapability & LighthouseRecordingCapability & PerformanceRecordingCapability & PerformanceTraceCapability & ServerLoggingCapability;
/**
 * Base argument type for AI Tools.
 */
export type ToolArgs = Record<string, unknown>;
export declare const MAX_FUNCTION_RESULT_BYTE_LENGTH: number;
export declare const enum ToolName {
    EXECUTE_JAVASCRIPT = "executeJavaScript",
    GET_STYLES = "getStyles",
    LIST_NETWORK_REQUESTS = "listNetworkRequests",
    GET_NETWORK_REQUEST_DETAILS = "getNetworkRequestDetails",
    GET_LIGHTHOUSE_AUDITS = "getLighthouseAudits",
    RESOLVE_DEVTOOLS_NODE_PATH = "resolveDevtoolsNodePath",
    GET_ELEMENT_ACCESSIBILITY_DETAILS = "getElementAccessibilityDetails",
    RECORD_PERFORMANCE_TRACE = "recordPerformanceTrace",
    LIST_PAGE_ORIGINS = "listPageOrigins",
    LIST_STORAGE_KEYS = "listStorageKeys",
    GET_STORAGE_VALUES = "getStorageValues",
    LIST_COOKIES = "listCookies",
    GET_COOKIE_VALUES = "getCookieValues",
    GET_TRACE_EVENT_BY_KEY = "getTraceEventByKey",
    SELECT_TRACE_EVENT_BY_KEY = "selectTraceEventByKey",
    LIST_SOURCES = "listSources",
    GET_SOURCE_CONTENT = "getSourceContent",
    GET_TRACE_MAIN_THREAD_SUMMARY = "getTraceMainThreadSummary",
    GET_TRACE_NETWORK_SUMMARY = "getTraceNetworkSummary",
    RUN_LIGHTHOUSE = "runLighthouse",
    GET_DETAILED_CALL_TREE = "getDetailedCallTree",
    GET_FUNCTION_CODE = "getFunctionCode",
    GET_RESOURCE_CONTENT = "getResourceContent",
    GET_INSIGHT_DETAILS = "getInsightDetails",
    GET_STORAGE_BREAKDOWN = "getStorageBreakdown"
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
    readonly annotations?: ToolAnnotation[];
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
/**
 * Capability provided to tools that handle sensitive user data (e.g. cookies or storage values).
 * Calling `disableLogging()` irreversibly disables server-side logging for the remainder of
 * the conversation session to prevent sensitive data from being logged on future turns.
 */
export interface ServerLoggingCapability {
    disableLogging(): void;
}
export declare const enum ToolAnnotation {
    REDACT_FROM_HISTORY = "redact-from-history"
}
