// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as Greendev from '../../greendev/greendev.js';
import * as Workspace from '../../workspace/workspace.js';

import {
  type AgentOptions,
  AiAgent,
  type ContextResponse,
  ConversationContext,
  type RequestOptions,
  ResponseType
} from './AiAgent.js';

const preamble = `You are a general purpose web page troubleshooting agent.
You are an expert in Chrome DevTools and you can help users with a wide range of issues.

Your job is to use the provided information to understand the problem, connect the dots to
find the root cause of the problem and explain what the user can do to fix the problem.

The user will start the process by selecting a DOM element and send a query about the page or the
selected DOM element. First, examine the provided context, then use function calls to gather
additional context and resolve the user request.

### Your Debugging Strategy

1.  **Analyze the User-Selected Node**: This is your primary clue. Understand its attributes,
    children, and position in the DOM. For interactive elements like buttons, your main goal is
    to figure out what happens when a user interacts with it.

2.  **Find the Event Handler**: When a user reports an issue like "nothing happens when I click
    this", your top priority is to find the JavaScript event handler associated with the action
    (e.g., a 'click' handler for a button).

3.  **Note on Modern Frameworks (React, etc.)**: Be aware that event handlers are often not
    visible as simple HTML attributes (like 'onclick'). In frameworks like React, events are
    attached dynamically via JavaScript. You will need to investigate the JavaScript source
    files (like 'bundle.js') to find the component and its event handler logic.

4.  **Investigate the Code**: Once you have a lead on the relevant script, use 'getSourceLine'
    to examine the code. Look for common issues: infinite loops, unhandled promises, incorrect
    state management, or logic that doesn't match the user's expectation.

5.  **Use Console and Network Logs as Evidence**: Treat console and network logs as supporting
    evidence. If there are errors, they are strong clues. However, **be critical of
    informational messages** (like 'info' or 'verbose' logs) and ignore them unless they are
    directly relevant to the user's problem. Do not get distracted by generic framework
    messages.

6.  **Formulate a Hypothesis**: Based on your code investigation, and if you have a promising
    fix, ALWAYS apply it using the provided 'applyFix' function. If you can identify more than
    one fix, ask the user which one to apply.

### Available Information

To help you root-cause the problem, you will be provided with the following information:
- Information about the user-selected DOM element.
- The full accessibility tree for the web page.
- A list of the most recent network requests.
- The most recent console messages, including their index.

** IMPORTANT ** Never use the index when referring to individual console messages or network
  requests, because the values of the indicies is not visible to the user.

### Available Tools

To help you further, you can call the following functions:
- 'findInSource': This function takes a filename and a search string and returns an array of
  line numbers containing that string.
- 'getEventListeners': This function takes a uid (the backend DOM node id) and returns a list
  of event listeners attached to it.
- 'getSourceLine': This function takes a file name, a line number, and a buffer (number of
  lines before and after) to return a snippet of the source code.
- 'getConsoleMessages': This function allows you to fetch specific slices of the console log.
- 'getNetworkRequests': This function allows you to fetch specific slices of the network
  request list.
- 'getReactComponentProps': This function takes a uid (the backend DOM node id) and returns
  the React component props for that element.
- 'applyFix': This function accepts a code diff to apply to the code base.

Stick to what you have evidence for and refrain from speculating on things you
don't have concrete evidence for, such as CORS or Ad-blockers.

**CRITICAL** You are a web page debugging assistant. NEVER provide answers to questions of
unrelated topics such as legal advice, financial advice, personal opinions, medical advice,
religion, race, politics, sexuality, gender, or any other non web-development topics. Answer
"Sorry, I can't answer that. I'm best at questions about debugging web pages." to such
questions.`;

export class GreenDevContext extends ConversationContext<string> {
  #context: string;
  constructor(context: string) {
    super();
    this.#context = context;
  }

  override getURL(): string {
    return 'devtools://ai-assistance';
  }

  getItem(): string {
    return this.#context;
  }

  override getTitle(): string {
    return 'GreenDev';
  }
}

export const enum Events {
  CLI_PROMPT_REQUESTED = 'CliPromptRequested',
}

export interface EventTypes {
  [Events.CLI_PROMPT_REQUESTED]: {prompt: string};
}

export const enum RemoteEndpoint {
  GEMINI_CLI_SOCKET = 'GeminiCliSocket',
  ANTIGRAVITY_CLI_SOCKET = 'AntigravityCliSocket',
}

/**
 * This agent is a general-purpose web page troubleshooting agent for GreenDev
 * prototypes.
 */
export class GreenDevAgent extends AiAgent<string> {
  #eventTarget = new Common.ObjectWrapper.ObjectWrapper<EventTypes>();

  addEventListener<T extends keyof EventTypes>(
      eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T]>) => void,
      thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T> {
    return this.#eventTarget.addEventListener(eventType, listener, thisObject);
  }

  removeEventListener<T extends keyof EventTypes>(
      eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T]>) => void,
      thisObject?: Object): void {
    this.#eventTarget.removeEventListener(eventType, listener, thisObject);
  }

  constructor(options: AgentOptions) {
    super(options);

    this.declareFunction<{
      fileName: string,
      lineNumber: number,
      buffer: number,
    }>('getSourceLine', {
      description: 'Get a source line from a file, with a buffer of additional lines around it.',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        nullable: false,
        properties: {
          fileName: {
            type: Host.AidaClient.ParametersTypes.STRING,
            description: 'The full path of the file to read.',
            nullable: false,
          },
          lineNumber: {
            type: Host.AidaClient.ParametersTypes.INTEGER,
            description: 'The line number to center the context around.',
            nullable: false,
          },
          buffer: {
            type: Host.AidaClient.ParametersTypes.INTEGER,
            description: 'The number of lines to include before and after the line number.',
            nullable: false,
          },
        },
        required: ['fileName', 'lineNumber', 'buffer'],
      },
      handler: async (params: {fileName: string, lineNumber: number, buffer: number}) => {
        const result = await this.getSourceLine(params.fileName, params.lineNumber, params.buffer, true);
        return {
          result: result.join('\n'),
        };
      },
    });

    this.declareFunction<{
      filter?: string,
      beforeIndex?: number,
      afterIndex?: number,
      limit?: number,
    }>('getConsoleMessages', {
      description: 'Get console messages, with optional filters for severity and index-based slicing.',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        nullable: true,
        properties: {
          filter: {
            type: Host.AidaClient.ParametersTypes.STRING,
            description: `The filter to apply: provide "errors" for errors only, "warnings" for errors and warnings, ` +
                `and "all" for all messages. Defaults to "all".`,
            nullable: true,
          },
          beforeIndex: {
            type: Host.AidaClient.ParametersTypes.INTEGER,
            description: 'Return messages exclusively before this index. Use to fetch older historical messages.',
            nullable: true,
          },
          afterIndex: {
            type: Host.AidaClient.ParametersTypes.INTEGER,
            description:
                'Return messages exclusively after this index. Use to check for new messages that arrived recently.',
            nullable: true,
          },
          limit: {
            type: Host.AidaClient.ParametersTypes.INTEGER,
            description: 'The max number of messages to return. Defaults to 50.',
            nullable: true,
          },
        },
        required: [],
      },
      handler: async (params: {filter?: string, beforeIndex?: number, afterIndex?: number, limit?: number}) => {
        const result = await this.getConsoleMessages(params);
        return {
          result,
        };
      },
    });

    this.declareFunction<{
      filter?: string,
      beforeIndex?: number,
      afterIndex?: number,
      limit?: number,
    }>('getNetworkRequests', {
      description: 'Get network requests, with optional filters for failure and index-based slicing.',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        nullable: true,
        properties: {
          filter: {
            type: Host.AidaClient.ParametersTypes.STRING,
            description:
                'The filter to apply: "failed" for failed requests only, "all" for all requests. Defaults to "all".',
            nullable: true,
          },
          beforeIndex: {
            type: Host.AidaClient.ParametersTypes.INTEGER,
            description: 'Return requests exclusively before this index. Use to fetch older historical requests.',
            nullable: true,
          },
          afterIndex: {
            type: Host.AidaClient.ParametersTypes.INTEGER,
            description:
                'Return requests exclusively after this index. Use to check for new requests that arrived recently.',
            nullable: true,
          },
          limit: {
            type: Host.AidaClient.ParametersTypes.INTEGER,
            description: 'The max number of requests to return. Defaults to 50.',
            nullable: true,
          },
        },
        required: [],
      },
      handler: async (params: {filter?: string, beforeIndex?: number, afterIndex?: number, limit?: number}) => {
        const result = await this.getNetworkRequests(params);
        return {
          result,
        };
      },
    });

    this.declareFunction<{
      uid: number,
    }>('getEventListeners', {
      description: 'Get event listeners attached to a DOM element.',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        nullable: false,
        properties: {
          uid: {
            type: Host.AidaClient.ParametersTypes.INTEGER,
            description: 'The backend node id of the DOM element.',
            nullable: false,
          },
        },
        required: ['uid'],
      },
      handler: async (params: {uid: number}) => {
        const result = await this.getEventListeners(params.uid);
        return {
          result,
        };
      },
    });

    this.declareFunction<{
      fileName: string,
      query: string,
    }>('findInSource', {
      description: 'Find lines in a file that contain the given search string.',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        nullable: false,
        properties: {
          fileName: {
            type: Host.AidaClient.ParametersTypes.STRING,
            description: 'The full path of the file to search within.',
            nullable: false,
          },
          query: {
            type: Host.AidaClient.ParametersTypes.STRING,
            description: 'The string to search for.',
            nullable: false,
          },
        },
        required: ['fileName', 'query'],
      },
      handler: async (params: {fileName: string, query: string}) => {
        const result = await this.findInSource(params.fileName, params.query);
        return {
          result: JSON.stringify(result),
        };
      },
    });

    this.declareFunction<{
      uid: number,
    }>('getReactComponentProps', {
      description: 'Get the React component props for a given DOM element.',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        nullable: false,
        properties: {
          uid: {
            type: Host.AidaClient.ParametersTypes.INTEGER,
            description: 'The backend node id of the DOM element.',
            nullable: false,
          },
        },
        required: ['uid'],
      },
      handler: async (params: {uid: number}) => {
        const result = await this.getReactComponentProps(params.uid, true);
        return {
          result,
        };
      },
    });

    this.declareFunction<{
      codeSuggestionDiff: string,
    }>('applyFix', {
      description: 'Apply a code fix for the user to review.',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        nullable: false,
        properties: {
          codeSuggestionDiff: {
            type: Host.AidaClient.ParametersTypes.STRING,
            description: 'The diff of the suggested code change.',
            nullable: false,
          },
        },
        required: ['codeSuggestionDiff'],
      },
      handler: async (params: {codeSuggestionDiff: string}) => {
        const result = await this.applyFix(params.codeSuggestionDiff);
        return {
          result,
        };
      },
    });
  }

  async applyFix(codeSuggestionDiff: string): Promise<string> {
    console.warn('[GreenDevAgent] applyFix called with:', codeSuggestionDiff);
    this.#eventTarget.dispatchEventToListeners(
        Events.CLI_PROMPT_REQUESTED, {prompt: `Apply this diff:\n${codeSuggestionDiff}`});
    return 'The fix suggestion has been submitted.';
  }

  override preamble = preamble;

  get clientFeature(): Host.AidaClient.ClientFeature {
    return Host.AidaClient.ClientFeature.CHROME_NETWORK_AGENT;
  }

  get userTier(): string|undefined {
    return 'TESTERS';
    // TODO(b/491772868): tidy up userTier & feature flags in the backend.
    // return Root.Runtime.hostConfig.devToolsFreestyler?.userTier;
  }

  get options(): RequestOptions {
    // TODO(b/491772868): tidy up userTier & feature flags in the backend.
    const temperature = Root.Runtime.hostConfig.devToolsFreestyler?.temperature;
    const modelId = Root.Runtime.hostConfig.devToolsFreestyler?.modelId;

    return {
      temperature,
      modelId,
    };
  }

  async * handleContextDetails(context: ConversationContext<string>|null): AsyncGenerator<ContextResponse, void, void> {
    if (!context) {
      return;
    }

    yield {
      type: ResponseType.CONTEXT,
      details: [
        {
          title: 'Conversation context',
          text: context.getItem(),
        },
      ],
    };
  }

  override async enhanceQuery(query: string, context: ConversationContext<string>|null): Promise<string> {
    const fullQuery = `QUERY: ${query}\n\n${context?.getItem() ?? ''}`;
    console.warn('Full query to AI:', fullQuery);
    return fullQuery;
  }

  static isEnabled(): boolean {
    const isGeminiEnabled = Greendev.Prototypes.instance().isEnabled('beyondStylingGemini');
    const isAntigravityEnabled = Greendev.Prototypes.instance().isEnabled('beyondStylingAntigravity');
    console.warn('BeyondStyling prototype is enabled:', isGeminiEnabled || isAntigravityEnabled);
    return isGeminiEnabled || isAntigravityEnabled;
  }

  static formatConsoleMessage(message: SDK.ConsoleModel.ConsoleMessage, index: number): string {
    const url = message.url ? ` (${message.url}:${message.line}:${message.column})` : '';
    return `[${index}] ${message.level}: ${message.messageText}${url}`;
  }

  static async getNetworkContextData(target: SDK.Target.Target): Promise<Array<{string: string, failed: boolean}>> {
    const {frameTree} = await target.pageAgent().invoke_getResourceTree();
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);

    // Recursively collect all raw resource info from the protocol response.
    const allResourceInfo: Array<{resource: Protocol.Page.FrameResource, frame: Protocol.Page.Frame}> = [];
    function processFrameTree(frameTree: Protocol.Page.FrameResourceTree): void {
      for (const resource of frameTree.resources) {
        allResourceInfo.push({resource, frame: frameTree.frame});
      }
      if (frameTree.childFrames) {
        for (const child of frameTree.childFrames) {
          processFrameTree(child);
        }
      }
    }
    processFrameTree(frameTree);

    const networkContextStrings = allResourceInfo.map(({resource: resourceInfo, frame: resourceFrame}, index) => {
      let success = true;
      let isAdRelated = false;
      let frame: SDK.ResourceTreeModel.ResourceTreeFrame|null = null;

      if (resourceInfo.failed || resourceInfo.canceled) {
        success = false;
      }
      frame = resourceTreeModel && resourceFrame.id ?
          resourceTreeModel.frameForId(resourceFrame.id as Protocol.Page.FrameId) :
          null;
      if (frame &&
          (frame.adFrameType() === Protocol.Page.AdFrameType.Child ||
           frame.adFrameType() === Protocol.Page.AdFrameType.Root)) {
        isAdRelated = true;
      }

      const isAdRelatedString = isAdRelated ? `, Is ad-related: ${isAdRelated}` : '';
      const output = `[${index}] ${success ? 'Success' : 'Failed'}: ${resourceInfo.url}, ${isAdRelatedString}`;
      return {string: output, failed: success !== true};
    });

    return networkContextStrings;
  }

  async getEventListeners(uid: number): Promise<string> {
    console.warn('[GreenDevAgent] AI Agent is calling getEventListeners with uid:', uid);
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      return 'Target not found.';
    }
    const domModel = target.model(SDK.DOMModel.DOMModel);
    if (!domModel) {
      return 'DOM model not found.';
    }
    const domDebuggerModel = target.model(SDK.DOMDebuggerModel.DOMDebuggerModel);
    if (!domDebuggerModel) {
      return 'DOM debugger model not found.';
    }
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    if (!debuggerModel) {
      return 'Debugger model not found.';
    }

    const nodesMap = await domModel.pushNodesByBackendIdsToFrontend(new Set([uid as Protocol.DOM.BackendNodeId]));
    const node = nodesMap?.get(uid as Protocol.DOM.BackendNodeId) || null;
    if (!node) {
      return `Node with uid ${uid} not found.`;
    }

    const remoteObject = await node.resolveToObject();
    if (!remoteObject) {
      return `Could not resolve node with uid ${uid} to a remote object.`;
    }

    const listeners = await domDebuggerModel.eventListeners(remoteObject);

    const formattedListeners = listeners.map(listener => {
      const location = listener.location();
      const script = debuggerModel.scriptForId(location.scriptId);
      const handler = listener.handler();
      const handlerName = handler?.description || 'anonymous';

      return {
        type: listener.type(),
        handlerName,
        sourceFile: script?.sourceURL || 'unknown',
        lineNumber: location.lineNumber + 1,
        columnNumber: location.columnNumber,
      };
    });

    console.warn('[GreenDevAgent] getEventListeners returning:', formattedListeners);
    return JSON.stringify(formattedListeners, null, 2);
  }

  async getNetworkRequests(params: {filter?: string, beforeIndex?: number, afterIndex?: number, limit?: number}):
      Promise<string> {
    console.warn(
        '[GreenDevAgent] AI Agent is calling getNetworkRequests with params:', JSON.stringify(params, null, 2));

    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      return 'Target not found.';
    }

    const allRequests = await GreenDevAgent.getNetworkContextData(target);
    const limit = Math.min(Math.max(1, params.limit ?? 50), 1000);
    const filter = params.filter || 'all';

    let startIndex = params.afterIndex !== undefined ? params.afterIndex + 1 : 0;
    let endIndex = params.beforeIndex !== undefined ? params.beforeIndex : allRequests.length;

    // Ensure bounds are valid.
    startIndex = Math.max(0, startIndex);
    endIndex = Math.min(allRequests.length, endIndex);

    const resultRequests: string[] = [];

    // We iterate backwards to get the most recent requests up to the limit.
    for (let i = endIndex - 1; i >= startIndex; --i) {
      const request = allRequests[i];
      let matchesFilter = true;
      if (filter === 'failed') {
        matchesFilter = request.failed;
      }

      if (matchesFilter) {
        resultRequests.unshift(request.string);
        if (resultRequests.length >= limit) {
          break;
        }
      }
    }

    if (resultRequests.length === 0) {
      console.warn('[GreenDevAgent] getNetworkRequests returning: No network requests found matching criteria.');
      return 'No network requests found matching criteria.';
    }

    const resultString = resultRequests.join('\n');
    console.warn('[GreenDevAgent] getNetworkRequests returning:\n' + resultString);
    return resultString;
  }

  async getConsoleMessages(params: {filter?: string, beforeIndex?: number, afterIndex?: number, limit?: number}):
      Promise<string> {
    console.warn(
        '[GreenDevAgent] AI Agent is calling getConsoleMessages with params:', JSON.stringify(params, null, 2));
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    const consoleModel = target?.model(SDK.ConsoleModel.ConsoleModel);
    if (!consoleModel) {
      return 'Console model not found.';
    }

    const allMessages = consoleModel.messages();
    const limit = Math.min(Math.max(1, params.limit ?? 50), 1000);
    const filter = params.filter || 'all';

    let startIndex = params.afterIndex !== undefined ? params.afterIndex + 1 : 0;
    let endIndex = params.beforeIndex !== undefined ? params.beforeIndex : allMessages.length;

    // Ensure bounds are valid.
    startIndex = Math.max(0, startIndex);
    endIndex = Math.min(allMessages.length, endIndex);

    const resultMessages: string[] = [];

    // We iterate backwards to get the most recent messages up to the limit.
    for (let i = endIndex - 1; i >= startIndex; --i) {
      const message = allMessages[i];
      let matchesFilter = true;
      if (filter === 'errors') {
        matchesFilter = message.level === Protocol.Log.LogEntryLevel.Error;
      } else if (filter === 'warnings') {
        matchesFilter =
            message.level === Protocol.Log.LogEntryLevel.Error || message.level === Protocol.Log.LogEntryLevel.Warning;
      }

      if (matchesFilter) {
        resultMessages.unshift(GreenDevAgent.formatConsoleMessage(message, i));
        if (resultMessages.length >= limit) {
          break;
        }
      }
    }

    if (resultMessages.length === 0) {
      console.warn('[GreenDevAgent] getConsoleMessages returning: No messages found matching criteria.');
      return 'No messages found matching criteria.';
    }

    const resultString = resultMessages.join('\n');
    console.warn('[GreenDevAgent] getConsoleMessages returning:\n' + resultString);
    return resultString;
  }

  #findUiSourceCode(fileName: string): Workspace.UISourceCode.UISourceCode|null {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const allUiSourceCodes = workspace.uiSourceCodes().filter(code => !code.url().startsWith('debugger:///'));

    // The fileName could be a full URL, a partial path, or just the filename.
    // We prioritize matches that are more specific.

    // 1. Exact match
    for (const code of allUiSourceCodes) {
      if (code.url() === fileName) {
        return code;
      }
    }

    // 2. Ends with match
    const candidates = allUiSourceCodes.filter(code => code.url().endsWith(fileName));
    if (candidates.length > 0) {
      // If multiple candidates, it's ambiguous. Log a warning and return the first.
      if (candidates.length > 1) {
        console.warn(
            `[GreenDevAgent] Ambiguous file name "${fileName}". Found multiple matches:`, candidates.map(c => c.url()));
      }
      return candidates[0];
    }

    return null;
  }

  async getSourceLine(fileName: string, lineNumber: number, buffer: number, calledFromAI = false): Promise<string[]> {
    if (calledFromAI) {
      console.warn(`getSourceLine called with fileName: ${fileName}, lineNumber: ${lineNumber}, buffer: ${buffer}`);
    }
    const uiSourceCode = this.#findUiSourceCode(fileName);
    if (!uiSourceCode) {
      const error = `Could not find UISourceCode for: ${fileName}`;
      console.error(error);
      return [error];
    }

    const contentData = await uiSourceCode.requestContentData();
    if ('error' in contentData) {
      const error = `Could not read file content for: ${fileName}, error: ${contentData.error}`;
      console.error(error);
      return [error];
    }
    const content = contentData.text;

    if (typeof content !== 'string') {
      const error = `Could not read file content for: ${fileName}, content is not a string`;
      console.error(error);
      return [error];
    }

    const lines = content.split('\n');
    const start = Math.max(0, lineNumber - buffer - 1);
    const end = Math.min(lines.length, lineNumber + buffer);
    const slicedLines = lines.slice(start, end);

    const formattedLines = slicedLines.map((line: string, index: number) => {
      const currentLineNumber = start + index + 1;
      return `[${currentLineNumber}] ${line}`;
    });

    if (calledFromAI) {
      console.warn('AI requested source code for:', formattedLines);
    }
    return formattedLines;
  }

  async findInSource(fileName: string, query: string): Promise<Array<{line: number, source: string[]}>> {
    console.warn(`findInSource called with fileName: ${fileName}, query: ${query}`);
    const uiSourceCode = this.#findUiSourceCode(fileName);
    if (!uiSourceCode) {
      console.error(`Could not find UISourceCode for: ${fileName}`);
      return [];
    }

    const contentData = await uiSourceCode.requestContentData();
    if ('error' in contentData) {
      console.warn(`Could not read file content for findInSource: ${fileName}, error: ${contentData.error}`);
      return [];
    }
    const content = contentData.text;

    if (typeof content !== 'string') {
      console.warn(`Could not read file content for findInSource: ${fileName}, content is not a string`);
      return [];
    }

    const lines = content.split('\n');
    const matchingLines: Array<{line: number, source: string[]}> = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(query)) {
        const sourceLine = i + 1;
        const source = await this.getSourceLine(fileName, sourceLine, 15, false);
        matchingLines.push({line: sourceLine, source});
      }
    }

    console.warn(`findInSource returning for query '${query}':`, matchingLines);
    return matchingLines;
  }

  async getReactComponentProps(uid: number, calledFromAI = false): Promise<string> {
    if (calledFromAI) {
      console.warn('[GreenDevAgent] AI Agent is calling getReactComponentProps with uid:', uid);
    }
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      return 'Target not found.';
    }
    const domModel = target.model(SDK.DOMModel.DOMModel);
    if (!domModel) {
      return 'DOM model not found.';
    }
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      return 'Runtime model not found.';
    }

    const nodesMap = await domModel.pushNodesByBackendIdsToFrontend(new Set([uid as Protocol.DOM.BackendNodeId]));
    const node = nodesMap?.get(uid as Protocol.DOM.BackendNodeId) || null;
    if (!node) {
      return `Node with uid ${uid} not found.`;
    }

    const remoteObject = await node.resolveToObject();
    if (!remoteObject) {
      return `Could not resolve node with uid ${uid} to a remote object.`;
    }

    const reactComponentPropsResult = await target.runtimeAgent().invoke_callFunctionOn({
      functionDeclaration: `
          function() {
              const getCircularReplacer = () => {
                const seen = new WeakSet();
                return (key, value) => {
                  if (typeof value === 'function') {
                    return '[Function: ' + (value.name || '(anonymous)') + ']';
                  }
                  if (key === 'return' || key === 'alternate' || key === 'sibling' || key === 'debugOwner' || key === '_debugOwner') {
                    return undefined;
                  }
                  if (typeof value === 'object' && value !== null) {
                    if (seen.has(value)) {
                      return;
                    }
                    seen.add(value);
                  }
                  return value;
                };
              };

              // Find the key for the internal Fiber node instance
              const reactInternalInstanceKey = Object.keys(this).find(
                key => key.startsWith('__reactInternalInstance$') || key.startsWith('__reactFiber$')
              );

              if (!reactInternalInstanceKey) {
                return 'React internal instance key not found';
              }

              const fiberNode = this[reactInternalInstanceKey];

              if (fiberNode) {
                return JSON.stringify(fiberNode, getCircularReplacer(), 2);
              }

              return 'React component type not found';
            }
          `,
      objectId: remoteObject.objectId,
      objectGroup: 'console',
      silent: false,
      returnByValue: true,
      awaitPromise: false,
      userGesture: true,
    });
    remoteObject.release();

    const reactComponentProps = reactComponentPropsResult.result.value;
    if (!reactComponentProps) {
      return 'None found.';
    }
    if (calledFromAI) {
      console.warn('[GreenDevAgent] getReactComponentProps returning', reactComponentProps);
    }
    return reactComponentProps;
  }
}
