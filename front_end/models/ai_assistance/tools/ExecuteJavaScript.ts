// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as Formatter from '../../formatter/formatter.js';
import type {FunctionHandlerOptions} from '../agents/AiAgent.js';
import {JavascriptExecutor} from '../agents/ExecuteJavascript.js';

import {
  type BaseToolCapability,
  type DataHandlerResult,
  type DataTool,
  isOriginAllowedByLock,
  type OriginLockCapability,
  type PageExecutionCapability,
  PermissionPrompt,
  type StyleMutationCapability,
  type ToolArgs,
  ToolName,
} from './Tool.js';

const lockedString = i18n.i18n.lockedString;

const MAX_FORMATTED_LINES = 40;
const MAX_LINE_LENGTH = 120;
const MAX_TOTAL_CHARACTERS = 2500;
const MAX_LONG_LINES_REPORTED = 3;
const LONG_LINE_PREVIEW_LENGTH = 60;

/**
 * Matches the error observations for network requests that the isolated
 * world's CSP (`FREESTYLER_WORLD_CSP`) blocks. When code run by this tool calls
 * `fetch()`, Chrome rejects with exactly "Failed to fetch". A synchronous
 * `XMLHttpRequest.send()` throws "Failed to execute 'send' on 'XMLHttpRequest':
 * Failed to load '<url>'.".
 */
const BLOCKED_NETWORK_ERROR_PATTERN =
    /^Error: (?:Failed to fetch$|Failed to execute 'send' on 'XMLHttpRequest': Failed to load )/;
const BLOCKED_NETWORK_HINT =
    'Network access (e.g., fetch, XMLHttpRequest) is blocked for JavaScript run by this tool, so this error does not mean the page\'s own network requests are failing. Do not retry network requests with this tool.';
/**
 * Only the V2 agent can load the network tools, so V1 agents do not get this
 * part of the hint.
 */
const NETWORK_TOOLS_HINT =
    'To inspect the page\'s network requests, load the `network` skill with `learnSkills` if it is not loaded yet, then use `listNetworkRequests` and `getNetworkRequestDetails`.';

/**
 * Returns one message per size limit that the formatted code exceeds. Each
 * message states the actual value, the limit, and how to fix it, so the model
 * can correct every problem in a single retry.
 */
function describeSizeLimitViolations(formattedCode: string): string[] {
  const violations: string[] = [];
  const lines = formattedCode.split('\n');

  if (lines.length > MAX_FORMATTED_LINES) {
    violations.push(`- The code is ${lines.length} lines (max ${MAX_FORMATTED_LINES}). ` +
        'Split the logic into smaller calls and return intermediate results in `data`.');
  }

  const longLines =
      lines.map((line, index) => ({lineNumber: index + 1, line})).filter(({line}) => line.length > MAX_LINE_LENGTH);
  if (longLines.length > 0) {
    violations.push(`- Lines longer than ${MAX_LINE_LENGTH} characters. Break them into shorter lines, ` +
        'for example by splitting long strings or selectors with concatenation, ' +
        'or by putting arguments on separate lines:');
    for (const {lineNumber, line} of longLines.slice(0, MAX_LONG_LINES_REPORTED)) {
      const preview = Platform.StringUtilities.trimEndWithMaxLength(line.trimStart(), LONG_LINE_PREVIEW_LENGTH);
      violations.push(`  - Line ${lineNumber} is ${line.length} characters: \`${preview}\``);
    }
    const unreportedCount = longLines.length - MAX_LONG_LINES_REPORTED;
    if (unreportedCount > 0) {
      violations.push(`  - ${unreportedCount} more ${unreportedCount === 1 ? 'line' : 'lines'} not shown.`);
    }
  }

  if (formattedCode.length > MAX_TOTAL_CHARACTERS) {
    violations.push(`- The code is ${formattedCode.length} characters (max ${MAX_TOTAL_CHARACTERS}). ` +
        'Remove unneeded code or split the logic into smaller calls.');
  }

  return violations;
}

export interface ExecuteJavaScriptArgs extends ToolArgs {
  code: string;
  explanation: string;
  title: string;
}

export class ExecuteJavaScriptTool implements
    DataTool<ExecuteJavaScriptArgs, unknown,
             BaseToolCapability&PageExecutionCapability&StyleMutationCapability&OriginLockCapability> {
  readonly name: ToolName = ToolName.EXECUTE_JAVASCRIPT;
  readonly permissionPrompt: PermissionPrompt = PermissionPrompt.ALLOW_ONCE;
  readonly permissionTitle: string = lockedString('Allow running JavaScript on the page?');
  readonly displayName: string = lockedString('Run JavaScript on the page');

  readonly description: string =
      'This function allows you to run JavaScript code on the inspected page to access the element styles and page content.\nCall this function to gather additional information or modify the page state. Call this function enough times to investigate the user request. Note: You cannot make network requests using this function.';

  /**
   * Formats the code and checks it against the size limits. This method does
   * not check syntax: if formatting fails, the formatter returns the original
   * code, and running it on the page reports any SyntaxError to the model.
   */
  static async validateAndFormatCode(code: string): Promise<{formattedCode?: string, error?: string}> {
    const formatted = await Formatter.ScriptFormatter.formatScriptContent(
        'text/javascript',
        code,
        '  ',
    );
    const formattedCode = formatted.formattedContent;
    const violations = describeSizeLimitViolations(formattedCode);
    if (violations.length > 0) {
      return {
        error: [
          'Error: The code was not run because it exceeds size limits after formatting (indented with 2 spaces):',
          ...violations,
        ].join('\n'),
      };
    }
    return {formattedCode};
  }

  readonly parameters: Host.AidaClient.FunctionObjectParam<keyof ExecuteJavaScriptArgs> = {
    type: Host.AidaClient.ParametersTypes.OBJECT,
    description: '',
    nullable: false,
    properties: {
      code: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description:
            `JavaScript code snippet to run on the inspected page. Make sure the code is formatted for readability.

# Instructions

* To return data, define a top-level \`data\` variable and populate it with data you want to get. Only JSON-serializable objects can be assigned to \`data\`.
* $0 refers to the currently selected DOM node (or document body if none selected).
* **CRITICAL** Never assume a selector for the elements unless you verified your knowledge.
* **CRITICAL** Variables from previous function calls are not available in subsequent calls.
* **CRITICAL** Keep code concise (max 40 lines, 120 characters per line, and 2,500 characters). Split complex logic into multiple steps.
* **CRITICAL** Network requests (e.g., fetch, XMLHttpRequest) are disabled and cannot be made.

For example, to query DOM elements:

\`\`\`
const data = {
  title: document.title,
  elementText: $0?.textContent?.trim(),
  childCount: $0?.children.length,
};
\`\`\`
`,
      },
      explanation: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description: 'Explain why you want to run this code',
      },
      title: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description: 'Provide a summary of what the code does. For example, "Checking related element styles".',
      },
    },
    required: ['code', 'explanation', 'title'],
  };

  displayInfoFromArgs(params: ExecuteJavaScriptArgs): {
    title: string,
    thought: string,
    action: string,
    javascriptCode: string,
  } {
    return {
      title: params.title,
      thought: params.explanation,
      action: params.code,
      javascriptCode: params.code,
    };
  }

  async handler(
      params: ExecuteJavaScriptArgs,
      context: BaseToolCapability&PageExecutionCapability&StyleMutationCapability&OriginLockCapability,
      options?: FunctionHandlerOptions,
      ): Promise<DataHandlerResult<unknown>> {
    const executionNode = context.getExecutionContextNode();
    if (!executionNode) {
      return {error: 'Error: Could not find the context node for execution.'};
    }

    if (!isOriginAllowedByLock(context.getOriginLock(), executionNode.securityOrigin())) {
      return {error: 'Error: Cannot execute JavaScript on cross-origin target.'};
    }

    const isV2Architecture = Root.Runtime.hostConfig.devToolsAiV2Architecture?.enabled;
    if (isV2Architecture) {
      const validationResult = await ExecuteJavaScriptTool.validateAndFormatCode(params.code);
      if (validationResult.error) {
        return {error: validationResult.error};
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
    },
                                            context.execJs);

    const result = await executor.executeAction(params.code, options);
    if ('result' in result && typeof result.result === 'string' && BLOCKED_NETWORK_ERROR_PATTERN.test(result.result)) {
      const hint = isV2Architecture ? `${BLOCKED_NETWORK_HINT} ${NETWORK_TOOLS_HINT}` : BLOCKED_NETWORK_HINT;
      return {...result, result: `${result.result}\n${hint}`};
    }
    return result;
  }
}
