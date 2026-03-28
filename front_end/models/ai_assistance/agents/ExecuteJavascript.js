// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import { debugLog } from '../debug.js';
import { EvaluateAction, formatError, SideEffectError } from '../EvaluateAction.js';
import { FREESTYLER_WORLD_NAME } from '../injected.js';
const lockedString = i18n.i18n.lockedString;
export function executeJavaScriptFunction(executor) {
    return {
        description: 'This function allows you to run JavaScript code on the inspected page to access the element styles and page content.\nCall this function to gather additional information or modify the page state. Call this function enough times to investigate the user request.',
        parameters: {
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
            required: ['code', 'explanation', 'title']
        },
        displayInfoFromArgs: params => {
            return {
                title: params.title,
                thought: params.explanation,
                action: params.code,
            };
        },
        handler: async (params, options) => {
            return await executor.executeAction(params.code, options);
        },
    };
}
export async function executeJsCode(functionDeclaration, { throwOnSideEffect, contextNode }) {
    if (!contextNode) {
        throw new Error('Cannot execute JavaScript because of missing context node');
    }
    const target = contextNode.domModel().target();
    if (!target) {
        throw new Error('Target is not found for executing code');
    }
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    const frameId = contextNode.frameId() ?? resourceTreeModel?.mainFrame?.id;
    if (!frameId) {
        throw new Error('Main frame is not found for executing code');
    }
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    const pageAgent = target.pageAgent();
    // This returns previously created world if it exists for the frame.
    const { executionContextId } = await pageAgent.invoke_createIsolatedWorld({ frameId, worldName: FREESTYLER_WORLD_NAME });
    const executionContext = runtimeModel?.executionContext(executionContextId);
    if (!executionContext) {
        throw new Error('Execution context is not found for executing code');
    }
    if (executionContext.debuggerModel.selectedCallFrame()) {
        return formatError('Cannot evaluate JavaScript because the execution is paused on a breakpoint.');
    }
    const remoteObject = await contextNode.resolveToObject(undefined, executionContextId);
    if (!remoteObject) {
        throw new Error('Cannot execute JavaScript because remote object cannot be resolved');
    }
    return await EvaluateAction.execute(functionDeclaration, [remoteObject], executionContext, { throwOnSideEffect });
}
const MAX_OBSERVATION_BYTE_LENGTH = 25_000;
const OBSERVATION_TIMEOUT = 5_000;
export class JavascriptExecutor {
    #options;
    #execJs;
    constructor(options, execJs = executeJsCode) {
        this.#options = options;
        this.#execJs = execJs;
    }
    async executeAction(action, options) {
        debugLog(`Action to execute: ${action}`);
        if (options?.approved === false) {
            return {
                error: 'Error: User denied code execution with side effects.',
            };
        }
        if (this.#options.executionMode === Root.Runtime.HostConfigFreestylerExecutionMode.NO_SCRIPTS) {
            return {
                error: 'Error: JavaScript execution is currently disabled.',
            };
        }
        const selectedNode = this.#options.getContextNode();
        if (!selectedNode) {
            return { error: 'Error: no selected node found.' };
        }
        const target = selectedNode.domModel().target();
        if (target.model(SDK.DebuggerModel.DebuggerModel)?.selectedCallFrame()) {
            return {
                error: 'Error: Cannot evaluate JavaScript because the execution is paused on a breakpoint.',
            };
        }
        const scope = this.#options.createExtensionScope(this.#options.changes);
        await scope.install();
        try {
            let throwOnSideEffect = true;
            if (options?.approved) {
                throwOnSideEffect = false;
            }
            const result = await this.generateObservation(action, { throwOnSideEffect });
            debugLog(`Action result: ${JSON.stringify(result)}`);
            if (result.sideEffect) {
                if (this.#options.executionMode ===
                    Root.Runtime.HostConfigFreestylerExecutionMode.SIDE_EFFECT_FREE_SCRIPTS_ONLY) {
                    return {
                        error: 'Error: JavaScript execution that modifies the page is currently disabled.',
                    };
                }
                if (options?.signal?.aborted) {
                    return {
                        error: 'Error: evaluation has been cancelled',
                    };
                }
                return {
                    requiresApproval: true,
                    description: lockedString('This code may modify page content. Continue?'),
                };
            }
            if (result.canceled) {
                return {
                    error: result.observation,
                };
            }
            return {
                result: result.observation,
            };
        }
        finally {
            await scope.uninstall();
        }
    }
    async generateObservation(action, { throwOnSideEffect, }) {
        const functionDeclaration = `async function ($0) {
  try {
    ${action}
    ;
    return ((typeof data !== "undefined") ? data : undefined);
  } catch (error) {
    return error;
  }
}`;
        try {
            const result = await Promise.race([
                this.#execJs(functionDeclaration, {
                    throwOnSideEffect,
                    contextNode: this.#options.getContextNode(),
                }),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Script execution exceeded the maximum allowed time.')), OBSERVATION_TIMEOUT);
                }),
            ]);
            const byteCount = Platform.StringUtilities.countWtf8Bytes(result);
            Host.userMetrics.freestylerEvalResponseSize(byteCount);
            if (byteCount > MAX_OBSERVATION_BYTE_LENGTH) {
                throw new Error('Output exceeded the maximum allowed length.');
            }
            return {
                observation: result,
                sideEffect: false,
                canceled: false,
            };
        }
        catch (error) {
            if (error instanceof SideEffectError) {
                return {
                    observation: error.message,
                    sideEffect: true,
                    canceled: false,
                };
            }
            return {
                observation: `Error: ${error.message}`,
                sideEffect: false,
                canceled: false,
            };
        }
    }
}
//# sourceMappingURL=ExecuteJavascript.js.map