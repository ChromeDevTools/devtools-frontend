// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ExecuteJavaScriptTool} from './ExecuteJavaScript.js';
import {GetDetailedCallTreeTool} from './GetDetailedCallTree.js';
import {GetElementAccessibilityDetailsTool} from './GetElementAccessibilityDetails.js';
import {GetFunctionCodeTool} from './GetFunctionCode.js';
import {GetInsightDetailsTool} from './GetInsightDetails.js';
import {GetLighthouseAuditsTool} from './GetLighthouseAudits.js';
import {GetNetworkRequestDetailsTool} from './GetNetworkRequestDetails.js';
import {GetResourceContentTool} from './GetResourceContent.js';
import {GetSourceContentTool} from './GetSourceContent.js';
import {GetStylesTool} from './GetStyles.js';
import {GetTraceEventByKeyTool} from './GetTraceEventByKey.js';
import {GetTraceMainThreadSummaryTool} from './GetTraceMainThreadSummary.js';
import {GetTraceNetworkSummaryTool} from './GetTraceNetworkSummary.js';
import {ListNetworkRequestsTool} from './ListNetworkRequests.js';
import {ListPageOriginsTool} from './ListPageOrigins.js';
import {ListSourcesTool} from './ListSources.js';
import {RecordPerformanceTraceTool} from './RecordPerformanceTrace.js';
import {ResolveDevtoolsNodePathTool} from './ResolveDevtoolsNodePath.js';
import {RunLighthouseTool} from './RunLighthouse.js';
import {SelectTraceEventByKeyTool} from './SelectTraceEventByKey.js';
import {type AllToolsCapabilities, type Tool, type ToolArgs, ToolName} from './Tool.js';

/**
 * Plain object registry containing concrete instantiated tools.
 *
 * This object is deliberately declared as a plain object without an explicit type annotation
 * (like `Record<ToolName, Tool>`) to preserve the exact concrete type of each registered tool.
 * This is required to support compile-time type safety and inference in the overloaded
 * `ToolRegistry.get()` method, which maps a literal `ToolName` key to its specific class type.
 */
export const TOOLS = {
  [ToolName.EXECUTE_JAVASCRIPT]: new ExecuteJavaScriptTool(),
  [ToolName.GET_STYLES]: new GetStylesTool(),
  [ToolName.LIST_NETWORK_REQUESTS]: new ListNetworkRequestsTool(),
  [ToolName.GET_NETWORK_REQUEST_DETAILS]: new GetNetworkRequestDetailsTool(),
  [ToolName.GET_LIGHTHOUSE_AUDITS]: new GetLighthouseAuditsTool(),
  [ToolName.RESOLVE_DEVTOOLS_NODE_PATH]: new ResolveDevtoolsNodePathTool(),
  [ToolName.GET_ELEMENT_ACCESSIBILITY_DETAILS]: new GetElementAccessibilityDetailsTool(),
  [ToolName.RECORD_PERFORMANCE_TRACE]: new RecordPerformanceTraceTool(),
  [ToolName.LIST_PAGE_ORIGINS]: new ListPageOriginsTool(),
  [ToolName.GET_TRACE_EVENT_BY_KEY]: new GetTraceEventByKeyTool(),
  [ToolName.SELECT_TRACE_EVENT_BY_KEY]: new SelectTraceEventByKeyTool(),
  [ToolName.LIST_SOURCES]: new ListSourcesTool(),
  [ToolName.GET_SOURCE_CONTENT]: new GetSourceContentTool(),
  [ToolName.GET_TRACE_MAIN_THREAD_SUMMARY]: new GetTraceMainThreadSummaryTool(),
  [ToolName.GET_TRACE_NETWORK_SUMMARY]: new GetTraceNetworkSummaryTool(),
  [ToolName.RUN_LIGHTHOUSE]: new RunLighthouseTool(),
  [ToolName.GET_DETAILED_CALL_TREE]: new GetDetailedCallTreeTool(),
  [ToolName.GET_FUNCTION_CODE]: new GetFunctionCodeTool(),
  [ToolName.GET_RESOURCE_CONTENT]: new GetResourceContentTool(),
  [ToolName.GET_INSIGHT_DETAILS]: new GetInsightDetailsTool(),
};

/**
 * Registry class for registering and querying AI Assistance Tools.
 */
export class ToolRegistry {
  /**
   * Retrieves a tool by its literal name with 100% type safety.
   *
   * @template K - A key from the `TOOLS` registry.
   * @param name The literal name of the tool to retrieve.
   * @returns The concrete class type of the requested tool.
   */
  static get<K extends keyof typeof TOOLS>(name: K): typeof TOOLS[K];
  /**
   * Fallback retrieval signature for general or runtime string lookups.
   *
   * @param name The string name of the tool to retrieve, used when the tool name is only known at runtime.
   * @returns The generic Tool interface, or undefined if not found.
   */
  static get(name: string): Tool<ToolArgs, unknown, AllToolsCapabilities>|undefined;
  static get(name: string): Tool<ToolArgs, unknown, AllToolsCapabilities>|undefined {
    // We use a double assertion (`as unknown as Tool<...>`) here. TypeScript's variance
    // rules prevent direct casting from specific concrete tools (which have narrowed,
    // capability-specific contexts) to the generic `Tool` signature that uses `AllToolsCapabilities`.
    // This cast is runtime-safe because any capability requested by a specific tool is
    // guaranteed to be satisfied by `AllToolsCapabilities`, and the handler will only access
    // the capabilities it expects.
    return Object.prototype.hasOwnProperty.call(TOOLS, name) ?
        TOOLS[name as keyof typeof TOOLS] as unknown as Tool<ToolArgs, unknown, AllToolsCapabilities>:
        undefined;
  }
}
