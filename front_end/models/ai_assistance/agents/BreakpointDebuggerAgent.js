// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Bindings from '../../bindings/bindings.js';
import * as Breakpoints from '../../breakpoints/breakpoints.js';
import { formatterWorkerPool } from '../../formatter/FormatterWorkerPool.js';
import * as SourceMapScopes from '../../source_map_scopes/source_map_scopes.js';
import * as TextUtils from '../../text_utils/text_utils.js';
import * as Workspace from '../../workspace/workspace.js';
import { debugLog } from '../debug.js';
import { AiAgent, ConversationContext, } from './AiAgent.js';
import { injectOverlay, removeOverlay, } from './BreakpointDebuggerAgentOverlay.js';
const lockedString = i18n.i18n.lockedString;
// This is a temporary agent for a GreenDev prototype.
// The preamble is not on the server and you should not build on top of this.
const preamble = `You are an expert Root Cause Analysis (RCA) specialist.
Your sole objective is to find the **root cause** of why an error was thrown or why a bug occurred.
You must not stop at the surface level. You must dig deep to understand the exact sequence of events and state changes that led to the failure.

**Excessively use all available tools** to gather as much information as possible. Do not make assumptions.

You have two modes of operation that you can switch between and control:
1. **STATIC MODE** (Default): You can read code but cannot see variables. You must analyze the logic to determine where to place breakpoints.
2. **RUNTIME MODE**: You are paused at a breakpoint. You can inspect variables and the call stack.

**Workflow**:
1. **Hypothesize**: Read the code ('getFunctionSource', 'getPreviousLines', 'getNextLines') to understand the logic.
2. **Set Trap**: Identify the critical line where state corruption likely occurred or lines that can lead you to that place. Use 'setBreakpoint' on that line.
3. **Wait**: Call 'waitForUserActionToTriggerBreakpoint'. This will suspend your execution until the user triggers the breakpoint. You CANNOT proceed until this tool returns.
4. **Inspect**: Using 'getExecutionLocation' check exactly where you are paused.
5. **Analyze**: When paused (Runtime Mode), use 'getScopeVariables' and 'getCallStack' to verify your hypothesis. Check variables in multiple scopes and look up the call stack to see where bad data came from.
6. **Step**: Use 'stepInto' to investigate function calls on the current line. Use 'stepOut' to return to the caller. Use 'stepOver' to move to the next line.
7. **Trace Back**: If the current function isn't the root cause, use 'getCallStack' to find the caller, and repeat the analysis there.
8. **Root Cause**: Explain exactly how the runtime state contradicts the expected logic and point to the specific line of code that is the root cause.
9. **Apply Fix**: Use the 'testFixInConsole' tool to overwrite the problematic code in the current session.
10. **Verify**: The fix is applied but NOT verified. You MUST run the code again to verify the fix worked.
11. **Finish**: If the fix worked, you may output the solution and finish the execution.

**Rules**:
- **NEVER FINISH** execution until you have found the root cause and verified the fix.
- **ACTION OVER TALK**: If you need the user to trigger a breakpoint, do NOT just ask them in text. You **MUST** call 'waitForUserActionToTriggerBreakpoint'. This tool will block and wait for the user to act.
- **STATIC MODE**: If you are in STATIC MODE and need to see variables: 1. 'setBreakpoint', 2. 'waitForUserActionToTriggerBreakpoint'. **DO NOT STOP** to ask the user. Investigate code and set breakpoints to find the root cause.
- **ALREADY PAUSED?**: If 'setBreakpoint' warns you that you are already paused, **DO NOT** call 'waitForUserActionToTriggerBreakpoint'. Start inspecting immediately. You can set more breakpoints while paused, but to call 'waitForUserActionToTriggerBreakpoint' again you MUST be in static state.
- **USE TOOLS EXCESSIVELY**: checking one thing is often not enough. Check everything you can thinks of.
- **CHECK LOCATION**: If you are not sure where you are, call 'getExecutionLocation' after 'waitForUserActionToTriggerBreakpoint' or any step command to confirm where you are.
- **INITIAL CONTEXT**: The breakpoint provided in the context is ALREADY SET. Do NOT set it again. Start by setting additional breakpoints if needed, or, if no additional breakpoints within the code you see make sense, call 'waitForUserActionToTriggerBreakpoint'.

**Execution Control when you are currently on a breakpoint**:
- **stepInto**: ESSENTIAL for entering function calls on the current line. Use this heavily when you suspect the issue is inside a called function.
- **stepOver**: Use to proceed line-by-line. If you are currently on a breakpoint, 'stepOver' will move you to the next line and pause again.
- **stepOut**: Return to the caller. If you are currently on a breakpoint, 'stepOut' will move you to the caller and pause again. **It often makes sense to 'stepOut' after you have investigated a function with 'stepInto' and verified it is correct.**
- **stepInto, stepOver, stepOut**: After any step command, always call 'getScopeVariables' to see how the state evolved.
- **listBreakpoints**: Use this to see all active breakpoints. Do not try to set a breakpoint that is already active.
- **removeBreakpoint / removeAllBreakpoints**: Use this to remove breakpoints. This is especially useful when you want to speed up verifying a fix.
- **CLEANUP AFTER FIX**: After a fix is suggested and worked, you MUST remove all breakpoints and call 'resume' to resume the execution of the page.
`;
export class BreakpointContext extends ConversationContext {
    #focus;
    constructor(focus) {
        super();
        this.#focus = focus;
    }
    getOrigin() {
        return new URL(this.#focus.uiSourceCode.url()).origin;
    }
    getItem() {
        return this.#focus;
    }
    getTitle() {
        return `Breakpoint at ${this.#focus.uiSourceCode.displayName()}:${this.#focus.lineNumber + 1}`;
    }
}
export class BreakpointDebuggerAgent extends AiAgent {
    preamble = preamble;
    // Using file agent as a base for now since it is the closest one logic wise.
    // Since the user tier is forced to TESTERS, it should not mess up the stats.
    // If this code is taken to production, we should create a new client feature.
    clientFeature = Host.AidaClient.ClientFeature.CHROME_FILE_AGENT;
    constructor(opts) {
        super(opts);
        this.declareFunction('getFunctionSource', {
            description: 'Retrieve the source code of a function given a code line within it.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: 'The location to find the function source for',
                properties: {
                    url: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'The URL of the file',
                    },
                    lineNumber: {
                        type: 3 /* Host.AidaClient.ParametersTypes.INTEGER */,
                        description: 'The 1-based line number of the code to look for',
                    },
                },
                required: ['url', 'lineNumber'],
            },
            displayInfoFromArgs: (args) => {
                const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(args.url);
                return {
                    title: `Reading function source for ${uiSourceCode?.displayName()}:${args.lineNumber}`,
                };
            },
            handler: async (args) => {
                const result = await this.#getFunctionSource(args);
                debugLog('getFunctionSource for ', JSON.stringify(args), '->', JSON.stringify(result));
                return result;
            },
        });
        // In case the function source returns error or it is not enough to understand the code, the
        // agent can use this function to get the code lines before or after a specific line.
        this.declareFunction('getCodeLines', {
            description: 'Retrieve the 10 lines of code before or after a specific line.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: 'The location and direction to look for code',
                properties: {
                    url: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'The URL of the file',
                    },
                    lineNumber: {
                        type: 3 /* Host.AidaClient.ParametersTypes.INTEGER */,
                        description: 'The 1-based line number of the code to look for',
                    },
                    direction: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'The direction to look for code (before or after)',
                    },
                },
                required: ['url', 'lineNumber', 'direction'],
            },
            displayInfoFromArgs: (args) => {
                const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(args.url);
                return {
                    title: `Reading code ${args.direction} ${uiSourceCode?.displayName()}:${args.lineNumber}`,
                };
            },
            handler: async (args) => {
                const result = await this.#getCodeLines(args);
                debugLog('getCodeLines result', JSON.stringify(result));
                return result;
            },
        });
        this.declareFunction('getCallStack', {
            description: 'Retrieve the current call stack frames. Only call while debugger is paused.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: 'No parameters required',
                properties: {},
                required: [],
            },
            displayInfoFromArgs: () => {
                return {
                    title: 'Reading call stack',
                };
            },
            handler: async () => {
                const result = await this.#getCallStack();
                debugLog('getCallStack result', JSON.stringify(result));
                return result;
            },
        });
        this.declareFunction('getScopeVariables', {
            description: 'Retrieve variables from all frames in the current call stack. Only call while debugger is paused.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: 'No parameters required',
                properties: {},
                required: [],
            },
            displayInfoFromArgs: () => {
                return {
                    title: 'Reading scope variables',
                };
            },
            handler: async () => {
                const result = await this.#getScopeVariables();
                debugLog('getScopeVariables result', JSON.stringify(result));
                return result;
            },
        });
        this.declareFunction('listBreakpoints', {
            description: 'List all active breakpoints.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: 'No parameters required',
                properties: {},
                required: [],
            },
            displayInfoFromArgs: () => {
                return {
                    title: 'Listing breakpoints',
                };
            },
            handler: async () => {
                const result = await this.#listBreakpoints();
                debugLog('listBreakpoints result', JSON.stringify(result));
                return result;
            },
        });
        this.declareFunction('setBreakpoint', {
            description: 'Set a breakpoint at a specific location.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: 'Location to set the breakpoint',
                properties: {
                    url: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'The URL of the file',
                    },
                    lineNumber: {
                        type: 3 /* Host.AidaClient.ParametersTypes.INTEGER */,
                        description: 'The 1-based line number to set the breakpoint on',
                    },
                },
                required: ['url', 'lineNumber'],
            },
            displayInfoFromArgs: (args) => {
                const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(args.url);
                return {
                    title: `Setting breakpoint at ${uiSourceCode?.displayName() ?? args.url}:${args.lineNumber}`,
                };
            },
            handler: async (args) => {
                debugLog('setBreakpoint requested', args);
                const result = await this.#setBreakpoint(args);
                debugLog('setBreakpoint result', JSON.stringify(result));
                return result;
            },
        });
        this.declareFunction('removeBreakpoint', {
            description: 'Remove a breakpoint at a specific location.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: 'Location to remove the breakpoint from',
                properties: {
                    url: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'The URL of the file',
                    },
                    lineNumber: {
                        type: 3 /* Host.AidaClient.ParametersTypes.INTEGER */,
                        description: 'The 1-based line number to remove the breakpoint from',
                    },
                },
                required: ['url', 'lineNumber'],
            },
            displayInfoFromArgs: (args) => {
                const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(args.url);
                return {
                    title: `Removing breakpoint at ${uiSourceCode?.displayName() ?? args.url}:${args.lineNumber}`,
                };
            },
            handler: async (args) => {
                debugLog('removeBreakpoint requested', args);
                const result = await this.#removeBreakpoint(args);
                debugLog('removeBreakpoint result', JSON.stringify(result));
                return result;
            },
        });
        this.declareFunction('removeAllBreakpoints', {
            description: 'Remove all active breakpoints.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: 'No parameters required',
                properties: {},
                required: [],
            },
            displayInfoFromArgs: () => {
                return {
                    title: 'Removing all breakpoints',
                };
            },
            handler: async () => {
                debugLog('removeAllBreakpoints requested');
                const breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance();
                const allBreakpoints = breakpointManager.allBreakpointLocations();
                for (const bp of allBreakpoints) {
                    await bp.breakpoint.remove(false);
                }
                return { result: { status: 'All breakpoints removed.' } };
            },
        });
        this.declareFunction('resume', {
            description: 'Resume execution. Always use this after applying a fix to resume the page execution.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: 'No parameters required',
                properties: {},
                required: [],
            },
            displayInfoFromArgs: () => {
                return {
                    title: 'Resuming execution',
                };
            },
            handler: async () => {
                const targetManager = SDK.TargetManager.TargetManager.instance();
                const debuggerModel = targetManager.models(SDK.DebuggerModel.DebuggerModel).find(m => m.isPaused());
                if (debuggerModel) {
                    debuggerModel.resume();
                }
                return { result: { status: 'Execution resumed.' } };
            },
        });
        this.declareFunction('stepOver', {
            description: 'Execute the current line and pause at the next line in the same function.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: 'No parameters required',
                properties: {},
                required: [],
            },
            displayInfoFromArgs: () => {
                return {
                    title: 'Stepping over',
                };
            },
            handler: async () => {
                const result = await this.#debuggerAction(model => model.stepOver());
                debugLog('stepOver result', JSON.stringify(result));
                return result;
            },
        });
        this.declareFunction('stepInto', {
            description: 'Step into the function call on the current line. REQUIRED when you want to investigate the code inside a function call.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: 'No parameters required',
                properties: {},
                required: [],
            },
            displayInfoFromArgs: () => {
                return {
                    title: 'Stepping into',
                };
            },
            handler: async () => {
                const result = await this.#debuggerAction(model => model.stepInto());
                debugLog('stepInto result', JSON.stringify(result));
                return result;
            },
        });
        this.declareFunction('stepOut', {
            description: 'Finish the current function and pause at the caller.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: 'No parameters required',
                properties: {},
                required: [],
            },
            displayInfoFromArgs: () => {
                return {
                    title: 'Stepping out',
                };
            },
            handler: async () => {
                const result = await this.#debuggerAction(model => model.stepOut());
                debugLog('stepOut result', JSON.stringify(result));
                return result;
            },
        });
        this.declareFunction('waitForUserActionToTriggerBreakpoint', {
            description: 'Resume execution and wait for the user to trigger a breakpoint.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: 'No parameters required',
                properties: {},
                required: [],
            },
            displayInfoFromArgs: () => {
                return {
                    title: 'Waiting for user action...',
                    thought: 'I am waiting for you to trigger a breakpoint in the application.',
                };
            },
            handler: async () => {
                debugLog('waitForUserActionToTriggerBreakpoint requested');
                const result = await this.#waitForUserActionToTriggerBreakpoint();
                debugLog('waitForUserActionToTriggerBreakpoint result', JSON.stringify(result));
                return result;
            },
        });
        this.declareFunction('getExecutionLocation', {
            description: 'Get the current location (line number, source code line and url) where the debugger is paused.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: 'No parameters required',
                properties: {},
                required: [],
            },
            displayInfoFromArgs: () => {
                return {
                    title: 'Getting execution location',
                };
            },
            handler: async () => {
                const result = await this.#getExecutionLocation();
                debugLog('getExecutionLocation ', JSON.stringify(result));
                return result;
            },
        });
        this.declareFunction('testFixInConsole', {
            description: 'Tests a JavaScript code snippet in the current execution context to overwrite the problematic code or state. After running this, verify the fix worked.',
            parameters: {
                type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                description: 'Provide the code to evaluate to test the fix',
                properties: {
                    code: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'The JavaScript code to evaluate in the console to test the fix.',
                    },
                    explanation: {
                        type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                        description: 'Explanation for why this code fixes the issue.',
                    },
                },
                required: ['code', 'explanation'],
            },
            displayInfoFromArgs: (args) => {
                return {
                    title: 'Testing a fix in console',
                    thought: args.explanation,
                    action: args.code,
                };
            },
            handler: async (args, options) => {
                debugLog('testFixInConsole requested', args);
                if (options?.approved === false) {
                    return { error: 'Fix rejected by the user.' };
                }
                if (!options?.approved) {
                    return {
                        requiresApproval: true,
                        description: lockedString('This code may modify page content. Continue?'),
                    };
                }
                const targetManager = SDK.TargetManager.TargetManager.instance();
                const debuggerModel = targetManager.models(SDK.DebuggerModel.DebuggerModel).find(m => m.isPaused());
                if (!debuggerModel) {
                    return { error: 'Execution is not paused.' };
                }
                const details = debuggerModel.debuggerPausedDetails();
                const callFrame = details?.callFrames[0];
                if (!callFrame) {
                    return { error: 'No call frame available.' };
                }
                const result = await callFrame.evaluate({
                    expression: args.code,
                    objectGroup: 'console',
                    includeCommandLineAPI: true,
                    silent: false,
                    returnByValue: false,
                    generatePreview: true
                });
                if (!result) {
                    return { error: 'Failed to evaluate the fix.' };
                }
                if ('error' in result) {
                    return { error: 'Error applying fix: ' + result.error };
                }
                if (result.exceptionDetails) {
                    return { error: 'Fix threw an exception: ' + result.exceptionDetails.text };
                }
                return {
                    result: {
                        status: 'Code evaluated successfully. Fix applied. PROCEED TO VERIFICATION: Call "resume" and ask the user to "run the code again" to verify.'
                    }
                };
            },
        });
    }
    async #getFunctionSource(args) {
        const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(args.url);
        if (!uiSourceCode) {
            return { error: `File not found: ${args.url}` };
        }
        const contentData = await uiSourceCode.requestContentData();
        if ('error' in contentData) {
            return { error: `Could not read content for file: ${args.url}` };
        }
        const textContent = contentData.text;
        const scopeTree = await formatterWorkerPool().javaScriptScopeTree(textContent);
        if (!scopeTree) {
            return { error: `Could not parse scope tree for file: ${args.url}` };
        }
        const text = new TextUtils.Text.Text(textContent);
        const selectedLineIndex = args.lineNumber - 1;
        if (selectedLineIndex < 0 || selectedLineIndex >= text.lineCount()) {
            return { error: `Line number ${args.lineNumber} is out of range` };
        }
        const selectedOffset = text.offsetFromPosition(selectedLineIndex, 0);
        let currentNode = scopeTree;
        let functionNode = scopeTree;
        // loop through the scope tree children to find the function node that contains the selected line
        while (currentNode) {
            if (currentNode.kind === 2 /* ScopeKind.FUNCTION */ || currentNode.kind === 4 /* ScopeKind.ARROW_FUNCTION */) {
                functionNode = currentNode;
            }
            const child = currentNode.children.find(c => c.start <= selectedOffset && c.end > selectedOffset);
            currentNode = child;
        }
        const startLocation = text.positionFromOffset(functionNode.start);
        const endLocation = text.positionFromOffset(functionNode.end);
        return { result: { functionSource: this.#formatLines(text, startLocation.lineNumber, endLocation.lineNumber + 1) } };
    }
    // Gets 10 lines of code before or after a specific line.
    async #getCodeLines(args) {
        const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(args.url);
        if (!uiSourceCode) {
            return { error: `File not found: ${args.url}` };
        }
        const contentData = await uiSourceCode.requestContentData();
        if ('error' in contentData) {
            return { error: `Could not read content for file: ${args.url}` };
        }
        const text = new TextUtils.Text.Text(contentData.text);
        const lineNumber = args.lineNumber - 1;
        const count = 10;
        if (args.direction === 'before') {
            const startLine = Math.max(0, lineNumber - count);
            const endLine = Math.max(0, lineNumber);
            return { result: { codeLines: this.#formatLines(text, startLine, endLine) } };
        }
        const startLine = Math.min(text.lineCount(), lineNumber + 1);
        const endLine = Math.min(text.lineCount(), lineNumber + 1 + count);
        return { result: { codeLines: this.#formatLines(text, startLine, endLine) } };
    }
    #formatLines(text, startLine, endLine) {
        let lines = '';
        for (let i = startLine; i < endLine; i++) {
            // Maybe there is a better format to send to the llm in
            lines += `${i + 1}: ${text.lineAt(i)}\n`;
        }
        return lines;
    }
    async *handleContextDetails(selectedBreakpoint) {
        if (!selectedBreakpoint) {
            return;
        }
        yield {
            type: "context" /* ResponseType.CONTEXT */,
            title: 'Analyzing breakpoint location',
            details: [{ title: 'Location', text: selectedBreakpoint.getTitle() }]
        };
    }
    async #getCallStack() {
        const targetManager = SDK.TargetManager.TargetManager.instance();
        const debuggerModel = targetManager.models(SDK.DebuggerModel.DebuggerModel).find(m => m.isPaused());
        if (!debuggerModel) {
            return {
                error: 'Execution is not paused. I cannot access runtime variables or the call stack. I am currently in STATIC MODE. I must set a breakpoint and use waitForUserActionToTriggerBreakpoint to enter RUNTIME MODE.'
            };
        }
        const details = debuggerModel.debuggerPausedDetails();
        if (!details) {
            return { error: 'Internal error: debugger is paused but no details available.' };
        }
        const stackTrace = await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createStackTraceFromDebuggerPaused(details, debuggerModel.target());
        const callFrames = stackTrace.syncFragment.frames.map(frame => {
            return {
                functionName: frame.name || frame.sdkFrame.functionName,
                url: frame.uiSourceCode ? frame.uiSourceCode.url() : (frame.url || frame.sdkFrame.script.contentURL()),
                lineNumber: frame.line + 1,
                id: frame.sdkFrame.id,
            };
        });
        return { result: { callFrames } };
    }
    async #getScopeVariables() {
        const targetManager = SDK.TargetManager.TargetManager.instance();
        const debuggerModel = targetManager.models(SDK.DebuggerModel.DebuggerModel).find(m => m.isPaused());
        if (!debuggerModel) {
            return {
                error: 'Execution is not paused. I cannot access runtime variables or the call stack. I am currently in STATIC MODE. I must set a breakpoint and use waitForUserActionToTriggerBreakpoint to enter RUNTIME MODE.'
            };
        }
        const details = debuggerModel.debuggerPausedDetails();
        if (!details) {
            return { error: 'Internal error: debugger is paused but no details available.' };
        }
        const stackTrace = await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createStackTraceFromDebuggerPaused(details, debuggerModel.target());
        const helperFrames = stackTrace.syncFragment.frames;
        const frames = [];
        for (const frame of helperFrames) {
            const callFrame = frame.sdkFrame;
            const scopeChain = await SourceMapScopes.NamesResolver.resolveScopeChain(callFrame);
            const resultScopeChain = [];
            for (const scope of scopeChain) {
                const type = scope.type();
                // Filter interesting scopes
                if (type !== 'local' && type !== 'closure' && type !== 'module' && type !== 'block' && type !== 'catch') {
                    continue;
                }
                const remoteObject = scope.object();
                const { properties } = await remoteObject.getAllProperties(false /* accessorPropertiesOnly */, true /* generatePreview */);
                const variables = {};
                if (properties) {
                    for (const prop of properties) {
                        if (!prop.name) {
                            continue;
                        }
                        let value = 'undefined';
                        if (prop.value) {
                            if (prop.value.type === 'string') {
                                value = `"${prop.value.value}"`;
                            }
                            else if (prop.value.value !== undefined) {
                                value = String(prop.value.value);
                            }
                            else if (prop.value.preview) {
                                const props = prop.value.preview.properties.map(p => `${p.name}: ${p.value}`).join(', ');
                                value = prop.value.subtype === 'array' ? `[${props}]` : `{${props}}`;
                            }
                            else {
                                value = prop.value.description ?? prop.value.type;
                            }
                        }
                        variables[prop.name] = value;
                    }
                }
                resultScopeChain.push({
                    type,
                    object: variables,
                });
            }
            frames.push({
                functionName: frame.name || frame.sdkFrame.functionName,
                scopes: resultScopeChain,
            });
        }
        return { result: { frames } };
    }
    async #listBreakpoints() {
        const breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance();
        const allBreakpoints = breakpointManager.allBreakpointLocations();
        const breakpoints = allBreakpoints.map(bp => {
            return { url: bp.uiLocation.uiSourceCode.url(), lineNumber: bp.uiLocation.lineNumber + 1 };
        });
        return { result: { breakpoints } };
    }
    async #setBreakpoint(args) {
        const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(args.url);
        if (!uiSourceCode) {
            return { error: `File not found: ${args.url}` };
        }
        // Check if breakpoint already exists
        const breakpointLocations = Breakpoints.BreakpointManager.BreakpointManager.instance().breakpointLocationsForUISourceCode(uiSourceCode);
        const alreadyExists = breakpointLocations.some(bp => bp.uiLocation.lineNumber === args.lineNumber - 1);
        if (alreadyExists) {
            return { result: { status: `Breakpoint already exists at ${args.url}:${args.lineNumber}.` } };
        }
        const breakpoint = await Breakpoints.BreakpointManager.BreakpointManager.instance().setBreakpoint(uiSourceCode, args.lineNumber - 1, 0, Breakpoints.BreakpointManager.EMPTY_BREAKPOINT_CONDITION, true, false, "USER_ACTION" /* Breakpoints.BreakpointManager.BreakpointOrigin.USER_ACTION */);
        // If the agent asks to set a breakpoint on a line that is not executable,
        // the breakpoint will be set on the next executable line.
        // Calculate the actual line number and inform the agent about this.
        let actualLineNumber = args.lineNumber;
        if (breakpoint) {
            const resolvedState = breakpoint.getLastResolvedState();
            if (resolvedState && resolvedState.length > 0) {
                // resolvedState locations are 0-indexed
                actualLineNumber = resolvedState[0].lineNumber + 1;
            }
        }
        const targetManager = SDK.TargetManager.TargetManager.instance();
        const debuggerModel = targetManager.models(SDK.DebuggerModel.DebuggerModel).find(m => m.isPaused());
        let warning = '';
        // Sometimes it gets confusing for the agent if it is already paused at a breakpoint.
        // We should inform the agent that it is paused at the moment.
        if (debuggerModel) {
            const details = debuggerModel.debuggerPausedDetails();
            const callFrame = details?.callFrames[0];
            if (callFrame) {
                const pausedLoc = `${callFrame.script.contentURL()}:${callFrame.location().lineNumber + 1}`;
                warning = ` WARNING: You are already PAUSED at ${pausedLoc}. \n1. If this is where you want to be, call 'getExecutionLocation' and inspect variables. \n2. If you want to wait for the NEW breakpoint, you MUST call 'waitForUserActionToTriggerBreakpoint' (which will resume execution).`;
            }
        }
        if (actualLineNumber !== args.lineNumber) {
            return {
                result: {
                    status: `Breakpoint requested at ${args.url}:${args.lineNumber}, but ACTUALLY resolved to line ${actualLineNumber}.${warning ?
                        '\n' + warning :
                        ' You must now call waitForUserActionToTriggerBreakpoint and ask the user to trigger the action.'}`
                }
            };
        }
        return {
            result: {
                status: `Breakpoint set at ${args.url}:${args.lineNumber}.${warning ?
                    '\n' + warning :
                    ' You must now call waitForUserActionToTriggerBreakpoint and ask the user to trigger the action.'}`
            }
        };
    }
    async #removeBreakpoint(args) {
        const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(args.url);
        if (!uiSourceCode) {
            return { error: `File not found: ${args.url}` };
        }
        const breakpointLocations = Breakpoints.BreakpointManager.BreakpointManager.instance().breakpointLocationsForUISourceCode(uiSourceCode);
        const breakpointLocation = breakpointLocations.find(bp => bp.uiLocation.lineNumber === args.lineNumber - 1);
        if (!breakpointLocation) {
            return { result: { status: `Breakpoint not found at ${args.url}:${args.lineNumber}.` } };
        }
        await breakpointLocation.breakpoint.remove(false);
        return { result: { status: `Breakpoint removed at ${args.url}:${args.lineNumber}.` } };
    }
    async #debuggerAction(action) {
        const targetManager = SDK.TargetManager.TargetManager.instance();
        const debuggerModel = targetManager.models(SDK.DebuggerModel.DebuggerModel).find(m => m.isPaused());
        if (!debuggerModel) {
            return { error: 'Execution is not paused. I cannot step or resume in STATIC MODE.' };
        }
        // Only resolve when next pause event is triggered (with a 3 second timeout so the agent doesn't hang)
        return await this.#waitForNextPause(() => action(debuggerModel), 3000);
    }
    async #waitForUserActionToTriggerBreakpoint() {
        const targetManager = SDK.TargetManager.TargetManager.instance();
        const debuggerModels = targetManager.models(SDK.DebuggerModel.DebuggerModel);
        if (debuggerModels.length === 0) {
            return { error: 'No debugger attached' };
        }
        // While waiting for the user to trigger the breakpoint, show an overlay on top of the page.
        // This is to make it clear to the user that they need to trigger the
        // breakpoint for the agent to continue the debugging process.
        void injectOverlay();
        try {
            return await this.#waitForNextPause(() => {
                // Resume all paused models before waiting for the next breakpoint
                for (const model of debuggerModels) {
                    if (model.isPaused()) {
                        model.resume();
                    }
                }
            });
        }
        finally {
            void removeOverlay();
        }
    }
    /**
     * Helper that waits for the next debugger pause event.
     * It sets up the listener *before* executing the trigger action to avoid race conditions.
     *
     * @param triggerAction Optional action to execute (e.g. resume, step) that is expected to lead to a pause.
     */
    async #waitForNextPause(triggerAction = () => { }, timeoutMs) {
        const targetManager = SDK.TargetManager.TargetManager.instance();
        return await new Promise(resolve => {
            let timeoutId;
            const listener = async (event) => {
                targetManager.removeModelListener(SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, listener);
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                const model = event.data;
                const details = model.debuggerPausedDetails();
                const callFrame = details?.callFrames[0];
                let location = 'unknown location';
                if (callFrame) {
                    const rawLocation = callFrame.location();
                    const uiLocation = await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(rawLocation);
                    if (uiLocation) {
                        location = `${uiLocation.uiSourceCode.url()}:${uiLocation.lineNumber + 1}`;
                    }
                    else {
                        location = `${callFrame.script.contentURL()}:${rawLocation.lineNumber + 1}`;
                    }
                }
                resolve({ result: { status: `Paused at ${location}` } });
            };
            targetManager.addModelListener(SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, listener);
            if (timeoutMs !== undefined) {
                timeoutId = setTimeout(() => {
                    targetManager.removeModelListener(SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, listener);
                    resolve({
                        result: {
                            status: 'Execution resumed but did not pause again. There is nothing to step into or the execution finished.'
                        }
                    });
                }, timeoutMs);
            }
            // Execute the action that will eventually trigger the pause
            triggerAction();
        });
    }
    async #getExecutionLocation() {
        const targetManager = SDK.TargetManager.TargetManager.instance();
        const debuggerModel = targetManager.models(SDK.DebuggerModel.DebuggerModel).find(m => m.isPaused());
        if (!debuggerModel) {
            return { error: 'Execution is not paused. I cannot determine execution location in STATIC MODE.' };
        }
        const details = debuggerModel.debuggerPausedDetails();
        if (!details) {
            return { error: 'Internal error: debugger is paused but no details available.' };
        }
        const stackTrace = await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createStackTraceFromDebuggerPaused(details, debuggerModel.target());
        const currentFrame = stackTrace.syncFragment.frames[0];
        if (!currentFrame) {
            return { error: 'Internal error: no frames available.' };
        }
        const url = currentFrame.uiSourceCode ? currentFrame.uiSourceCode.url() :
            (currentFrame.url || currentFrame.sdkFrame.script.contentURL());
        const lineNumber = currentFrame.line + 1;
        let lineContent = '';
        if (currentFrame.uiSourceCode) {
            const contentData = await currentFrame.uiSourceCode.requestContentData();
            if (!('error' in contentData)) {
                const text = new TextUtils.Text.Text(contentData.text);
                // Get current paused line content from the file
                lineContent = text.lineAt(lineNumber - 1);
            }
        }
        return { result: { url, lineNumber, lineContent } };
    }
    async enhanceQuery(query, selectedBreakpoint) {
        const item = selectedBreakpoint?.getItem();
        if (!item) {
            return query;
        }
        const locationPart = `I am investigating a breakpoint that is already set at ${item.uiSourceCode.url()}:${item.lineNumber + 1}${item.columnNumber !== undefined ? ':' + (item.columnNumber + 1) :
            ''}. The execution is currently in STATIC MODE.`;
        return `${locationPart}\n\n${query}`;
    }
    get userTier() {
        return 'TESTERS';
    }
    get options() {
        return { temperature: 0, modelId: undefined };
    }
    async *run(initialQuery, options, multimodalInput) {
        try {
            yield* super.run(initialQuery, options, multimodalInput);
        }
        finally {
            // When the agent is done, remove all breakpoints and exit paused state.
            const breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance();
            const allBreakpoints = breakpointManager.allBreakpointLocations();
            for (const bp of allBreakpoints) {
                await bp.breakpoint.remove(false);
            }
            const targetManager = SDK.TargetManager.TargetManager.instance();
            const debuggerModels = targetManager.models(SDK.DebuggerModel.DebuggerModel);
            for (const model of debuggerModels) {
                if (model.isPaused()) {
                    model.resume();
                }
            }
        }
    }
}
//# sourceMappingURL=BreakpointDebuggerAgent.js.map