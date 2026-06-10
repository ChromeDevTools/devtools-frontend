// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { ExecuteJavaScriptTool } from './ExecuteJavaScript.js';
import { GetStylesTool } from './GetStyles.js';
/**
 * Plain object registry containing concrete instantiated tools.
 * Keep this type concrete (no type-erasure) to preserve exact tool types.
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
        return Object.prototype.hasOwnProperty.call(TOOLS, name) ? TOOLS[name] : undefined;
    }
}
//# sourceMappingURL=ToolRegistry.js.map