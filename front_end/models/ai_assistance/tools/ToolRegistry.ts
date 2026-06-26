// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ExecuteJavaScriptTool} from './ExecuteJavaScript.js';
import {GetLighthouseAuditsTool} from './GetLighthouseAudits.js';
import {GetNetworkRequestDetailsTool} from './GetNetworkRequestDetails.js';
import {GetStylesTool} from './GetStyles.js';
import {ListNetworkRequestsTool} from './ListNetworkRequests.js';
import {ResolveLighthousePathTool} from './ResolveLighthousePath.js';
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
  [ToolName.RESOLVE_LIGHTHOUSE_PATH]: new ResolveLighthousePathTool(),
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
