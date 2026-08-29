import { ExecuteJavaScriptTool } from './ExecuteJavaScript.js';
import { GetCookieValuesTool } from './GetCookieValues.js';
import { GetDetailedCallTreeTool } from './GetDetailedCallTree.js';
import { GetElementAccessibilityDetailsTool } from './GetElementAccessibilityDetails.js';
import { GetFunctionCodeTool } from './GetFunctionCode.js';
import { GetInsightDetailsTool } from './GetInsightDetails.js';
import { GetLighthouseAuditsTool } from './GetLighthouseAudits.js';
import { GetNetworkRequestDetailsTool } from './GetNetworkRequestDetails.js';
import { GetResourceContentTool } from './GetResourceContent.js';
import { GetSourceContentTool } from './GetSourceContent.js';
import { GetStorageBreakdownTool } from './GetStorageBreakdown.js';
import { GetStorageValuesTool } from './GetStorageValues.js';
import { GetStylesTool } from './GetStyles.js';
import { GetTraceEventByKeyTool } from './GetTraceEventByKey.js';
import { GetTraceMainThreadSummaryTool } from './GetTraceMainThreadSummary.js';
import { GetTraceNetworkSummaryTool } from './GetTraceNetworkSummary.js';
import { ListCookiesTool } from './ListCookies.js';
import { ListNetworkRequestsTool } from './ListNetworkRequests.js';
import { ListPageOriginsTool } from './ListPageOrigins.js';
import { ListSourcesTool } from './ListSources.js';
import { ListStorageKeysTool } from './ListStorageKeys.js';
import { RecordPerformanceTraceTool } from './RecordPerformanceTrace.js';
import { ResolveDevtoolsNodePathTool } from './ResolveDevtoolsNodePath.js';
import { RunLighthouseTool } from './RunLighthouse.js';
import { SelectTraceEventByKeyTool } from './SelectTraceEventByKey.js';
import { type AllToolsCapabilities, type Tool, type ToolArgs, ToolName } from './Tool.js';
export interface BaseToolsRegistryMap {
    [ToolName.EXECUTE_JAVASCRIPT]: ExecuteJavaScriptTool;
    [ToolName.GET_STYLES]: GetStylesTool;
    [ToolName.LIST_NETWORK_REQUESTS]: ListNetworkRequestsTool;
    [ToolName.GET_NETWORK_REQUEST_DETAILS]: GetNetworkRequestDetailsTool;
    [ToolName.GET_LIGHTHOUSE_AUDITS]: GetLighthouseAuditsTool;
    [ToolName.RESOLVE_DEVTOOLS_NODE_PATH]: ResolveDevtoolsNodePathTool;
    [ToolName.GET_ELEMENT_ACCESSIBILITY_DETAILS]: GetElementAccessibilityDetailsTool;
    [ToolName.RECORD_PERFORMANCE_TRACE]: RecordPerformanceTraceTool;
    [ToolName.LIST_PAGE_ORIGINS]: ListPageOriginsTool;
    [ToolName.LIST_STORAGE_KEYS]: ListStorageKeysTool;
    [ToolName.GET_STORAGE_VALUES]: GetStorageValuesTool;
    [ToolName.LIST_COOKIES]: ListCookiesTool;
    [ToolName.GET_COOKIE_VALUES]: GetCookieValuesTool;
    [ToolName.GET_TRACE_EVENT_BY_KEY]: GetTraceEventByKeyTool;
    [ToolName.SELECT_TRACE_EVENT_BY_KEY]: SelectTraceEventByKeyTool;
    [ToolName.LIST_SOURCES]: ListSourcesTool;
    [ToolName.GET_SOURCE_CONTENT]: GetSourceContentTool;
    [ToolName.GET_TRACE_MAIN_THREAD_SUMMARY]: GetTraceMainThreadSummaryTool;
    [ToolName.GET_TRACE_NETWORK_SUMMARY]: GetTraceNetworkSummaryTool;
    [ToolName.RUN_LIGHTHOUSE]: RunLighthouseTool;
    [ToolName.GET_DETAILED_CALL_TREE]: GetDetailedCallTreeTool;
    [ToolName.GET_FUNCTION_CODE]: GetFunctionCodeTool;
    [ToolName.GET_RESOURCE_CONTENT]: GetResourceContentTool;
    [ToolName.GET_INSIGHT_DETAILS]: GetInsightDetailsTool;
    [ToolName.GET_STORAGE_BREAKDOWN]: GetStorageBreakdownTool;
}
export type ToolsRegistryMap = BaseToolsRegistryMap & {
    [K in ToolName as `${K}`]: BaseToolsRegistryMap[K];
};
/**
 * Plain object registry containing concrete instantiated tools.
 */
export declare const TOOLS: BaseToolsRegistryMap;
/**
 * Registry class for registering and querying AI Assistance Tools.
 */
export declare class ToolRegistry {
    /**
     * Retrieves a tool by its literal name with 100% type safety.
     *
     * @template K - A key from the `ToolsRegistryMap` registry.
     * @param name The literal name of the tool to retrieve.
     * @returns The concrete class type of the requested tool.
     */
    static get<K extends keyof ToolsRegistryMap>(name: K): ToolsRegistryMap[K];
    /**
     * Fallback retrieval signature for general or runtime string lookups.
     *
     * @param name The string name of the tool to retrieve, used when the tool name is only known at runtime.
     * @returns The generic Tool interface, or undefined if not found.
     */
    static get(name: string): Tool<ToolArgs, unknown, AllToolsCapabilities> | undefined;
}
