// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import { JavascriptExecutor } from '../agents/ExecuteJavascript.js';
export class ExecuteJavaScriptTool {
    name = "executeJavaScript" /* ToolName.EXECUTE_JAVASCRIPT */;
    description = 'This function allows you to run JavaScript code on the inspected page to access the element styles and page content.\nCall this function to gather additional information or modify the page state. Call this function enough times to investigate the user request.';
    parameters = {
        type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
        description: '',
        nullable: false,
        properties: {
            code: {
                type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                description: `JavaScript code snippet to run on the inspected page. Make sure the code is formatted for readability.

# Instructions

* To return data, define a top-level \`data\` variable and populate it with data you want to get. Only JSON-serializable objects can be assigned to \`data\`.
* If you modify styles on an element, ALWAYS call the pre-defined global \`async setElementStyles(el: Element, styles: object)\` function. This function is an internal mechanism for you and should never be presented as a command/advice to the user.
* **CRITICAL** Only get styles that might be relevant to the user request.
* **CRITICAL** Never assume a selector for the elements unless you verified your knowledge.
* **CRITICAL** Consider that \`data\` variable from the previous function calls are not available in a new function call.

For example, the code to change element styles:

\`\`\`
await setElementStyles($0, {
  color: 'blue',
});
\`\`\`

For example, the code to get overlapping elements:

\`\`\`
const data = {
  overlappingElements: Array.from(document.querySelectorAll('*'))
    .filter(el => {
      const rect = el.getBoundingClientRect();
      const popupRect = $0.getBoundingClientRect();
      return (
        el !== $0 &&
        rect.left < popupRect.right &&
        rect.right > popupRect.left &&
        rect.top < popupRect.bottom &&
        rect.bottom > popupRect.top
      );
    })
    .map(el => ({
      tagName: el.tagName,
      id: el.id,
      className: el.className,
      zIndex: window.getComputedStyle(el)['z-index']
    }))
};
\`\`\`
`,
            },
            explanation: {
                type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                description: 'Explain why you want to run this code',
            },
            title: {
                type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                description: 'Provide a summary of what the code does. For example, "Checking related element styles".',
            },
        },
        required: ['code', 'explanation', 'title'],
    };
    displayInfoFromArgs(params) {
        return {
            title: params.title,
            thought: params.explanation,
            action: params.code,
        };
    }
    async handler(params, context, options) {
        const executionNode = context.getExecutionContextNode?.() ?? null;
        if (!executionNode) {
            return { error: 'Error: Could not find the context node for execution.' };
        }
        const executionMode = Root.Runtime.hostConfig.devToolsFreestyler?.executionMode ??
            Root.Runtime.HostConfigFreestylerExecutionMode.ALL_SCRIPTS;
        const changes = context.changeManager;
        const createExtensionScope = context.createExtensionScope;
        if (!changes || !createExtensionScope) {
            return { error: 'Internal Error: Required change manager or extension scope creator is missing.' };
        }
        const executor = new JavascriptExecutor({
            executionMode,
            getContextNode: () => executionNode,
            createExtensionScope,
            changes,
        }, context.execJs);
        return await executor.executeAction(params.code, options);
    }
}
//# sourceMappingURL=ExecuteJavaScript.js.map