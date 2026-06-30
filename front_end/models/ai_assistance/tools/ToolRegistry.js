// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { ExecuteJavaScriptTool } from './ExecuteJavaScript.js';
import { GetElementAccessibilityDetailsTool } from './GetElementAccessibilityDetails.js';
import { GetLighthouseAuditsTool } from './GetLighthouseAudits.js';
import { GetNetworkRequestDetailsTool } from './GetNetworkRequestDetails.js';
import { GetStylesTool } from './GetStyles.js';
import { ListNetworkRequestsTool } from './ListNetworkRequests.js';
import { ResolveDevtoolsNodePathTool } from './ResolveDevtoolsNodePath.js';
/**
 * Plain object registry containing concrete instantiated tools.
 *
 * This object is deliberately declared as a plain object without an explicit type annotation
 * (like `Record<ToolName, Tool>`) to preserve the exact concrete type of each registered tool.
 * This is required to support compile-time type safety and inference in the overloaded
 * `ToolRegistry.get()` method, which maps a literal `ToolName` key to its specific class type.
 */
export const TOOLS = {
    ["executeJavaScript" /* ToolName.EXECUTE_JAVASCRIPT */]: new ExecuteJavaScriptTool(),
    ["getStyles" /* ToolName.GET_STYLES */]: new GetStylesTool(),
    ["listNetworkRequests" /* ToolName.LIST_NETWORK_REQUESTS */]: new ListNetworkRequestsTool(),
    ["getNetworkRequestDetails" /* ToolName.GET_NETWORK_REQUEST_DETAILS */]: new GetNetworkRequestDetailsTool(),
    ["getLighthouseAudits" /* ToolName.GET_LIGHTHOUSE_AUDITS */]: new GetLighthouseAuditsTool(),
    ["resolveDevtoolsNodePath" /* ToolName.RESOLVE_DEVTOOLS_NODE_PATH */]: new ResolveDevtoolsNodePathTool(),
    ["getElementAccessibilityDetails" /* ToolName.GET_ELEMENT_ACCESSIBILITY_DETAILS */]: new GetElementAccessibilityDetailsTool(),
};
/**
 * Registry class for registering and querying AI Assistance Tools.
 */
export class ToolRegistry {
    static get(name) {
        // We use a double assertion (`as unknown as Tool<...>`) here. TypeScript's variance
        // rules prevent direct casting from specific concrete tools (which have narrowed,
        // capability-specific contexts) to the generic `Tool` signature that uses `AllToolsCapabilities`.
        // This cast is runtime-safe because any capability requested by a specific tool is
        // guaranteed to be satisfied by `AllToolsCapabilities`, and the handler will only access
        // the capabilities it expects.
        return Object.prototype.hasOwnProperty.call(TOOLS, name) ?
            TOOLS[name] :
            undefined;
    }
}
//# sourceMappingURL=ToolRegistry.js.map