// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Formatter from '../../models/formatter/formatter.js';
import * as Logs from '../../models/logs/logs.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import type * as Console from '../console/console.js';

const MAX_MESSAGE_SIZE = 1000;
const MAX_STACK_TRACE_SIZE = 1000;
const MAX_CODE_SIZE = 1000;
const MAX_HEADERS_SIZE = 1000;

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
    const firstNewline = text.indexOf('\n');
    if (text.length > MAX_CODE_SIZE && (firstNewline < 0 || firstNewline > MAX_CODE_SIZE)) {
      // Use formatter
      const {formattedContent, formattedMapping} = await Formatter.ScriptFormatter.formatScriptContent(
          mappedLocation?.uiSourceCode.mimeType() ?? 'text/javascript', text);
      const [lineNumber, columnNumber] =
          formattedMapping.originalToFormatted(mappedLocation?.lineNumber ?? 0, mappedLocation?.columnNumber ?? 0);
      return {text: formattedContent, columnNumber, lineNumber};
    }
    return {text, columnNumber: mappedLocation?.columnNumber ?? 0, lineNumber: mappedLocation?.lineNumber ?? 0};
  }

  async buildPrompt(sourcesTypes: SourceType[] = Object.values(SourceType)):
      Promise<{prompt: string, sources: Source[], isPageReloadRecommended: boolean}> {
    const [sourceCode, request] = await Promise.all([
      sourcesTypes.includes(SourceType.RELATED_CODE) ? this.getMessageSourceCode() : undefined,
      sourcesTypes.includes(SourceType.NETWORK_REQUEST) ? this.getNetworkRequest() : undefined,
    ]);

    const relatedCode = sourceCode?.text ? formatRelatedCode(sourceCode) : '';
    const relatedRequest = request ? formatNetworkRequest(request) : '';
    const stacktrace = sourcesTypes.includes(SourceType.STACKTRACE) ? formatStackTrace(this.#consoleMessage) : '';

    const message = formatConsoleMessage(this.#consoleMessage);

    const prompt = this.formatPrompt({
      message: [message, stacktrace].join('\n').trim(),
      relatedCode,
      relatedRequest,
    });

    const sources = [
      {
        type: SourceType.MESSAGE,
        value: message,
      },
    ];

    if (stacktrace) {
      sources.push({
        type: SourceType.STACKTRACE,
        value: stacktrace,
      });
    }

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
      isPageReloadRecommended: sourcesTypes.includes(SourceType.NETWORK_REQUEST) &&
          Boolean(this.#consoleMessage.consoleMessage().getAffectedResources()?.requestId) && !relatedRequest,
    };
  }

  formatPrompt({message, relatedCode, relatedRequest}: {message: string, relatedCode: string, relatedRequest: string}):
      string {
    let prompt = `Why does browser show an error
${message}`;

    if (relatedCode) {
      prompt += `
For the following code in my web app

\`\`\`
${relatedCode}
\`\`\``;
    }

    if (relatedRequest) {
      prompt += `
For the following network request in my web app

\`\`\`
${relatedRequest}
\`\`\``;
    }
    return prompt;
  }

  getSearchQuery(): string {
    let message = this.#consoleMessage.toMessageTextString();
    if (message) {
      // If there are multiple lines, it is likely the rest of the message
      // is a stack trace, which we don't want.
      message = message.split('\n')[0];
    }
    return message;
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

export function lineWhitespace(line: string): string|null {
  const matches = /^\s*/.exec(line);
  if (!matches || !matches.length) {
    // This should not happen
    return null;
  }
  const whitespace = matches[0];
  if (whitespace === line) {
    return null;
  }
  return whitespace;
}

export function formatRelatedCode(
    {text, columnNumber, lineNumber}: {text: string, columnNumber: number, lineNumber: number},
    maxCodeSize = MAX_CODE_SIZE): string {
  const lines = text.split('\n');
  if (lines[lineNumber].length >= maxCodeSize / 2) {
    const start = Math.max(columnNumber - maxCodeSize / 2, 0);
    const end = Math.min(columnNumber + maxCodeSize / 2, lines[lineNumber].length);
    return lines[lineNumber].substring(start, end);
  }
  let relatedCodeSize = 0;
  let currentLineNumber = lineNumber;
  let currentWhitespace = lineWhitespace(lines[lineNumber]);
  const startByPrefix: Map<string, number> = new Map();
  while (lines[currentLineNumber] !== undefined &&
         (relatedCodeSize + lines[currentLineNumber].length <= maxCodeSize / 2)) {
    const whitespace = lineWhitespace(lines[currentLineNumber]);
    if (whitespace !== null && currentWhitespace !== null &&
        (whitespace === currentWhitespace || !whitespace.startsWith(currentWhitespace))) {
      // Don't start on a line that begins with a closing character
      if (!/^\s*[\}\)\]]/.exec(lines[currentLineNumber])) {
        // Update map of where code should start based on its indentation
        startByPrefix.set(whitespace, currentLineNumber);
      }
      currentWhitespace = whitespace;
    }
    relatedCodeSize += lines[currentLineNumber].length + 1;
    currentLineNumber--;
  }
  currentLineNumber = lineNumber + 1;
  let startLine = lineNumber;
  let endLine = lineNumber;
  currentWhitespace = lineWhitespace(lines[lineNumber]);
  while (lines[currentLineNumber] !== undefined && (relatedCodeSize + lines[currentLineNumber].length <= maxCodeSize)) {
    relatedCodeSize += lines[currentLineNumber].length;
    const whitespace = lineWhitespace(lines[currentLineNumber]);
    if (whitespace !== null && currentWhitespace !== null &&
        (whitespace === currentWhitespace || !whitespace.startsWith(currentWhitespace))) {
      // We shouldn't end on a line if it is followed by an indented line
      const nextLine = lines[currentLineNumber + 1];
      const nextWhitespace = nextLine ? lineWhitespace(nextLine) : null;
      if (!nextWhitespace || nextWhitespace === whitespace || !nextWhitespace.startsWith(whitespace)) {
        // Look up where code should start based on its indentation
        if (startByPrefix.has(whitespace)) {
          startLine = startByPrefix.get(whitespace) ?? 0;
          endLine = currentLineNumber;
        }
      }
      currentWhitespace = whitespace;
    }
    currentLineNumber++;
  }
  return lines.slice(startLine, endLine + 1).join('\n');
}

function formatLines(title: string, lines: string[], maxLength: number): string {
  let result = '';
  for (const line of lines) {
    if (result.length + line.length > maxLength) {
      break;
    }
    result += line;
  }
  result = result.trim();
  return result && title ? title + '\n' + result : result;
}

export function formatNetworkRequest(
    request:
        Pick<SDK.NetworkRequest.NetworkRequest, 'url'|'requestHeaders'|'responseHeaders'|'statusCode'|'statusText'>):
    string {
  const formatHeaders = (title: string, headers: SDK.NetworkRequest.NameValue[]): string => formatLines(
      title, headers.filter(allowHeader).map(header => header.name + ': ' + header.value + '\n'), MAX_HEADERS_SIZE);
  // TODO: anything else that might be relavant?
  // TODO: handle missing headers
  return `Request: ${request.url()}

${formatHeaders('Request headers:', request.requestHeaders())}

${formatHeaders('Response headers:', request.responseHeaders)}

Response status: ${request.statusCode} ${request.statusText}`;
}

export function formatConsoleMessage(message: Console.ConsoleViewMessage.ConsoleViewMessage): string {
  return message.toMessageTextString().substr(0, MAX_MESSAGE_SIZE);
}

/**
 * This formats the stacktrace from the console message which might or might not
 * match the content of stacktrace(s) in the console message arguments.
 */
export function formatStackTrace(message: Console.ConsoleViewMessage.ConsoleViewMessage): string {
  const previewContainer = message.contentElement().querySelector('.stack-preview-container');

  if (!previewContainer) {
    return '';
  }

  const preview = previewContainer.shadowRoot?.querySelector('.stack-preview-container') as HTMLElement;

  const nodes = preview.childTextNodes();
  // Gets application-level source mapped stack trace taking the ignore list
  // into account.
  const messageContent = nodes
                             .filter(n => {
                               return !n.parentElement?.closest('.show-all-link,.show-less-link,.hidden-row');
                             })
                             .map(Components.Linkifier.Linkifier.untruncatedNodeText);
  return formatLines('', messageContent, MAX_STACK_TRACE_SIZE);
}
