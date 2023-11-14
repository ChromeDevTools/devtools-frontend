// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Logs from '../../models/logs/logs.js';
import type * as Console from '../console/console.js';

const MAX_CODE_SIZE = 1000;

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum SourceType {
  MESSAGE = 'message',
  STACKTRACE = 'stacktrace',
  NETWORK_REQUEST = 'networkRequest',
  RELATED_CODE = 'relatedCode',
}

export interface Source {
  type: SourceType;
  value: string;
}

export class PromptBuilder {
  #consoleMessage: Console.ConsoleViewMessage.ConsoleViewMessage;

  constructor(consoleMessage: Console.ConsoleViewMessage.ConsoleViewMessage) {
    this.#consoleMessage = consoleMessage;
  }

  async getNetworkRequest(): Promise<SDK.NetworkRequest.NetworkRequest|undefined> {
    const requestId = this.#consoleMessage.consoleMessage().getAffectedResources()?.requestId;
    if (!requestId) {
      return;
    }
    const log = Logs.NetworkLog.NetworkLog.instance();
    // TODO: we might try handling redirect requests too later.
    return log.requestsForId(requestId)[0];
  }

  /**
   * Gets the source file associated with the top of the message's stacktrace.
   * Returns an empty string if the source is not available for any reasons.
   */
  async getMessageSourceCode(): Promise<{text: string, columnNumber: number, lineNumber: number}> {
    const callframe = this.#consoleMessage.consoleMessage().stackTrace?.callFrames[0];
    const runtimeModel = this.#consoleMessage.consoleMessage().runtimeModel();
    const debuggerModel = runtimeModel?.debuggerModel();
    if (!debuggerModel || !runtimeModel || !callframe) {
      return {text: '', columnNumber: 0, lineNumber: 0};
    }
    const rawLocation =
        new SDK.DebuggerModel.Location(debuggerModel, callframe.scriptId, callframe.lineNumber, callframe.columnNumber);
    const mappedLocation =
        await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(
            rawLocation);
    const content = await mappedLocation?.uiSourceCode.requestContent();
    const text = !content?.isEncoded && content?.content ? content.content : '';
    return {text, columnNumber: mappedLocation?.columnNumber ?? 0, lineNumber: mappedLocation?.lineNumber ?? 0};
  }

  async buildPrompt(): Promise<{prompt: string, sources: Source[]}> {
    const [sourceCode, request] = await Promise.all([
      this.getMessageSourceCode(),
      this.getNetworkRequest(),
    ]);

    const relatedCode = sourceCode.text ? formatRelatedCode(sourceCode) : '';
    const relatedRequest = request ? formatNetworkRequest(request) : '';
    const message = this.#consoleMessage.toExportString();

    const prompt = this.formatPrompt({
      message,
      relatedCode,
      relatedRequest,
    });

    // TODO: separate the stack trace from message.
    const sources = [
      {
        type: SourceType.MESSAGE,
        value: message,
      },
    ];

    if (relatedCode) {
      sources.push({
        type: SourceType.RELATED_CODE,
        value: relatedCode,
      });
    }

    if (relatedRequest) {
      sources.push({
        type: SourceType.NETWORK_REQUEST,
        value: relatedRequest,
      });
    }

    return {
      prompt,
      sources,
    };
  }

  formatPrompt({message, relatedCode, relatedRequest}: {message: string, relatedCode: string, relatedRequest: string}):
      string {
    const messageHeader = '### Console message:';
    const relatedCodeHeader = '### Code that generated the error:';
    const relatedRequestHeader = '### Related network request:';
    const explanationHeader = '### Summary:';

    const preamble = `
You are an expert software engineer looking at a console message in DevTools.

You will follow these rules strictly:
- Answer the question as truthfully as possible using the provided context
- if you don't have the answer, say "I don't know" and suggest looking for this information
  elsewhere
- Start with the explanation immediately without repeating the given console message.
- Always wrap code with three backticks (\`\`\`)`;

    const fewShotExamples = [
      {
        message: `Uncaught TypeError: Cannot read properties of undefined (reading 'setState') at home.jsx:15
    at delta (home.jsx:15:14)
    at Object.Dc (react-dom.production.min.js:54:317)
    at Fc (react-dom.production.min.js:54:471)
    at jc (react-dom.production.min.js:55:35)
    at ai (react-dom.production.min.js:105:68)
    at Ks (react-dom.production.min.js:106:380)
    at react-dom.production.min.js:117:104
    at Pu (react-dom.production.min.js:274:42)
    at vs (react-dom.production.min.js:52:375)
    at Dl (react-dom.production.min.js:109:469)
delta @ home.jsx:15


Dc @ react-dom.production.min.js:54
Fc @ react-dom.production.min.js:54
jc @ react-dom.production.min.js:55
ai @ react-dom.production.min.js:105
Ks @ react-dom.production.min.js:106
(anonymous) @ react-dom.production.min.js:117
Pu @ react-dom.production.min.js:274
vs @ react-dom.production.min.js:52
Dl @ react-dom.production.min.js:109
eu @ react-dom.production.min.js:74
bc @ react-dom.production.min.js:73`,

        relatedCode: `class Counter extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            count : 1
        };

        this.delta.bind(this);
    }

    delta() {
        this.setState({
            count : this.state.count++
        });
    }

    render() {
        return (
            <div>
                <h1>{this.state.count}</h1>
                <button onClick={this.delta}>+</button>
            </div>
        );
    }
}`,
        explanation:
            'The error occurs because this.delta is not bound to the instance of the Counter component. The fix is it to change the code to be ` this.delta = this.delta.bind(this);`',

      },
      {
        message: `Uncaught TypeError: Cannot set properties of null(setting 'innerHTML')
        at(index): 57: 49(anonymous) @(index): 57 `,

        relatedCode: `<script>
      document.getElementById("test").innerHTML = "Element does not exist";
    </script>
    <div id="test"></div>`,

        explanation:
            'The error means that getElementById returns null instead of the div element. This happens because the script runs before the element is added to the DOM.',
      },
      {
        message: 'Uncaught SyntaxError: Unexpected token \')\' (at script.js:39:14)',

        relatedCode: `if (10 < 120)) {
  console.log('test')
}`,

        explanation: 'There is an extra closing `)`. Remove it to fix the issue.',
      },
    ];

    const formatExample = (example: {
      message: string,
      relatedCode?: string,
      relatedRequest?: string,
      searchAnswers?: string, explanation: string,
    }): string => {
      const result = [];
      result.push(messageHeader, example.message);
      if (relatedCode) {
        result.push(relatedCodeHeader, '```', example.relatedCode, '```');
      }
      if (relatedRequest && example.relatedRequest) {
        result.push(relatedRequestHeader, example.relatedRequest);
      }
      result.push(explanationHeader, example.explanation);
      return result.join('\n');
    };

    return `${preamble}

${fewShotExamples.map(formatExample).join('\n\n')}

${formatExample({message, relatedCode, relatedRequest, explanation: ''})}`;
  }
}

export function allowHeader(header: SDK.NetworkRequest.NameValue): boolean {
  const normalizedName = header.name.toLowerCase().trim();
  // Skip custom headers.
  if (normalizedName.startsWith('x-')) {
    return false;
  }
  // Skip cookies as they might contain auth.
  if (normalizedName === 'cookie' || normalizedName === 'set-cookie') {
    return false;
  }
  if (normalizedName === 'authorization') {
    return false;
  }
  return true;
}

export function formatRelatedCode(
    {text, columnNumber, lineNumber}: {text: string, columnNumber: number, lineNumber: number},
    maxCodeSize = MAX_CODE_SIZE): string {
  const relatedCode: string[] = [];
  let relatedCodeSize = 0;
  const lines = text.split('\n');
  let currentLineNumber = lineNumber;
  if (lines[currentLineNumber].length >= maxCodeSize / 2) {
    const start = Math.max(columnNumber - maxCodeSize / 2, 0);
    const end = Math.min(columnNumber + maxCodeSize / 2, lines[currentLineNumber].length);
    relatedCode.push(lines[currentLineNumber].substring(start, end));
    relatedCodeSize += end - start;
  } else {
    while (lines[currentLineNumber] !== undefined &&
           (relatedCodeSize + lines[currentLineNumber].length <= maxCodeSize / 2)) {
      relatedCode.push(lines[currentLineNumber]);
      relatedCodeSize += lines[currentLineNumber].length;
      currentLineNumber--;
    }
  }
  relatedCode.reverse();
  currentLineNumber = lineNumber + 1;
  while (lines[currentLineNumber] !== undefined && (relatedCodeSize + lines[currentLineNumber].length <= maxCodeSize)) {
    relatedCode.push(lines[currentLineNumber]);
    relatedCodeSize += lines[currentLineNumber].length;
    currentLineNumber++;
  }
  return relatedCode.join('\n');
}

export function formatNetworkRequest(
    request:
        Pick<SDK.NetworkRequest.NetworkRequest, 'url'|'requestHeaders'|'responseHeaders'|'statusCode'|'statusText'>):
    string {
  // TODO: anything else that might be relavant?
  // TODO: handle missing headers
  return `Request: ${request.url()}

Request headers:
${request.requestHeaders().filter(allowHeader).map(header => `${header.name}: ${header.value}`).join('\n')}

Response headers:
${request.responseHeaders.filter(allowHeader).map(header => `${header.name}: ${header.value}`).join('\n')}

Response status: ${request.statusCode} ${request.statusText}`;
}
