// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import * as Formatter from '../../formatter/formatter.js';
import type {FunctionHandlerOptions} from '../agents/AiAgent.js';
import {JavascriptExecutor} from '../agents/ExecuteJavascript.js';

import {
  type BaseToolCapability,
  type DataHandlerResult,
  type DataTool,
  type PageExecutionCapability,
  type StyleMutationCapability,
  type ToolArgs,
  ToolName,
} from './Tool.js';

const MAX_FORMATTED_LINES = 40;
const MAX_LINE_LENGTH = 120;
const MAX_TOTAL_CHARACTERS = 2500;

export interface ExecuteJavaScriptArgs extends ToolArgs {
  code: string;
  explanation: string;
  title: string;
}

export class ExecuteJavaScriptTool implements
    DataTool<ExecuteJavaScriptArgs, unknown, BaseToolCapability&PageExecutionCapability&StyleMutationCapability> {
  readonly name: ToolName = ToolName.EXECUTE_JAVASCRIPT;

  readonly description: string =
      'This function allows you to run JavaScript code on the inspected page to access the element styles and page content.\nCall this function to gather additional information or modify the page state. Call this function enough times to investigate the user request. Note: You cannot make network requests using this function.';

  static async validateAndFormatCode(code: string): Promise<{formattedCode?: string, error?: string}> {
    try {
      const formatted = await Formatter.ScriptFormatter.formatScriptContent(
          // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
          Common.Settings.Settings.instance(),
          'text/javascript',
          code,
          '  ',
      );
      const formattedCode = formatted.formattedContent;
      const lines = formattedCode.split('\n');
      const maxLineLen = Math.max(...lines.map(line => line.length));

      if (lines.length > MAX_FORMATTED_LINES || maxLineLen > MAX_LINE_LENGTH ||
          formattedCode.length > MAX_TOTAL_CHARACTERS) {
        return {
          error: `Error: JavaScript code exceeds maximum allowed size ` +
              `(max ${MAX_FORMATTED_LINES} formatted lines, ${MAX_LINE_LENGTH} chars/line, ${
                     MAX_TOTAL_CHARACTERS} total chars). ` +
              `Please split your logic into smaller function calls.`,
        };
      }
      return {formattedCode};
    } catch {
      return {error: 'Error: JavaScript code snippet contains invalid syntax.'};
    }
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
* **CRITICAL** Keep code concise (max 40 lines and 2,500 characters). Split complex logic into multiple steps.
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
  } {
    return {
      title: params.title,
      thought: params.explanation,
      action: params.code,
    };
  }

  async handler(
      params: ExecuteJavaScriptArgs,
      context: BaseToolCapability&PageExecutionCapability&StyleMutationCapability,
      options?: FunctionHandlerOptions,
      ): Promise<DataHandlerResult<unknown>> {
    const executionNode = context.getExecutionContextNode();
    if (!executionNode) {
      return {error: 'Error: Could not find the context node for execution.'};
    }

    if (Root.Runtime.hostConfig.devToolsAiV2Architecture?.enabled) {
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

    return await executor.executeAction(params.code, options);
  }
}
