// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import * as Formatter from '../../formatter/formatter.js';
import { JavascriptExecutor } from '../agents/ExecuteJavascript.js';
const MAX_FORMATTED_LINES = 40;
const MAX_LINE_LENGTH = 120;
const MAX_TOTAL_CHARACTERS = 2500;
export class ExecuteJavaScriptTool {
    name = "executeJavaScript" /* ToolName.EXECUTE_JAVASCRIPT */;
    description = 'This function allows you to run JavaScript code on the inspected page to access the element styles and page content.\nCall this function to gather additional information or modify the page state. Call this function enough times to investigate the user request. Note: You cannot make network requests using this function.';
    static async validateAndFormatCode(code) {
        try {
            const formatted = await Formatter.ScriptFormatter.formatScriptContent(
            // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
            Common.Settings.Settings.instance(), 'text/javascript', code, '  ');
            const formattedCode = formatted.formattedContent;
            const lines = formattedCode.split('\n');
            const maxLineLen = Math.max(...lines.map(line => line.length));
            if (lines.length > MAX_FORMATTED_LINES || maxLineLen > MAX_LINE_LENGTH ||
                formattedCode.length > MAX_TOTAL_CHARACTERS) {
                return {
                    error: `Error: JavaScript code exceeds maximum allowed size ` +
                        `(max ${MAX_FORMATTED_LINES} formatted lines, ${MAX_LINE_LENGTH} chars/line, ${MAX_TOTAL_CHARACTERS} total chars). ` +
                        `Please split your logic into smaller function calls.`,
                };
            }
            return { formattedCode };
        }
        catch {
            return { error: 'Error: JavaScript code snippet contains invalid syntax.' };
        }
    }
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
* **CRITICAL** Keep code concise (max 40 lines and 2,500 characters). Split complex logic into multiple steps.
* **CRITICAL** Network requests (e.g., fetch, XMLHttpRequest) are disabled and cannot be made.

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
        const executionNode = context.getExecutionContextNode();
        if (!executionNode) {
            return { error: 'Error: Could not find the context node for execution.' };
        }
        if (Root.Runtime.hostConfig.devToolsAiV2Architecture?.enabled) {
            const validationResult = await ExecuteJavaScriptTool.validateAndFormatCode(params.code);
            if (validationResult.error) {
                return { error: validationResult.error };
            }
            if (validationResult.formattedCode) {
                params.code = validationResult.formattedCode;
            }
        }
        const executionMode = Root.Runtime.hostConfig.devToolsFreestyler?.executionMode ??
            Root.Runtime.HostConfigFreestylerExecutionMode.ALL_SCRIPTS;
        const executor = new JavascriptExecutor({
            executionMode,
            getContextNode: () => executionNode,
            createExtensionScope: context.createExtensionScope,
            changes: context.changeManager,
        }, context.execJs);
        return await executor.executeAction(params.code, options);
    }
}
//# sourceMappingURL=ExecuteJavaScript.js.map