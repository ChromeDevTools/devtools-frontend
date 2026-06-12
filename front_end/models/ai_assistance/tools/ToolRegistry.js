// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { ExecuteJavaScriptTool } from './ExecuteJavaScript.js';
import { GetStylesTool } from './GetStyles.js';
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
};
/**
 * Registry class for registering and querying AI Assistance Tools.
 */
export class ToolRegistry {
    static get(name) {
        // We use a double assertion (`as unknown as Tool<...>`) here. TypeScript's variance
        // rules prevent direct casting from specific concrete tools (which have narrowed,
        // capability-specific contexts) to the generic `Tool` signature that uses `AllToolsContext`.
        // This cast is runtime-safe because any capability requested by a specific tool is
        // guaranteed to be satisfied by `AllToolsContext`, and the handler will only access
        // the capabilities it expects.
        return Object.prototype.hasOwnProperty.call(TOOLS, name) ?
            TOOLS[name] :
            undefined;
    }
}
//# sourceMappingURL=ToolRegistry.js.map