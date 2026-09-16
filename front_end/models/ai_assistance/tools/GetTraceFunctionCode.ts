// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';

import {
  type BaseToolCapability,
  type DataHandlerResult,
  type DataTool,
  type PerformanceTraceCapability,
  type ToolArgs,
  ToolName,
} from './Tool.js';

const UIStringsNotTranslate = {
  lookingUpFunctionCode: 'Looking up function code',
} as const;

const lockedString = i18n.i18n.lockedString;

/**
 * Arguments for {@link GetTraceFunctionCodeTool}.
 */
export interface GetTraceFunctionCodeArgs extends ToolArgs {
  /** The URL of the script containing the function recorded in the performance trace. */
  scriptUrl: string;
  /** The line number where the function is defined (0-based, as reported in the call tree). */
  line: number;
  /** The column number where the function is defined (0-based, as reported in the call tree). */
  column: number;
}

/**
 * Retrieves function code and line-by-line CPU profile execution costs from the performance trace.
 *
 * Preconditions:
 * - Requires an active, freshly recorded trace session (fails on imported traces).
 * - Requires resource access via the performance trace context.
 */
export class GetTraceFunctionCodeTool implements
    DataTool<GetTraceFunctionCodeArgs, string, BaseToolCapability&PerformanceTraceCapability> {
  readonly name: ToolName = ToolName.GET_TRACE_FUNCTION_CODE;
  readonly description: string =
      'Retrieves the code for a function recorded in the performance trace at the specified location, annotated with line-by-line CPU runtime profiling execution costs. Do not call this tool unless a performance trace recording is actively loaded.';

  readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetTraceFunctionCodeArgs> = {
    type: Host.AidaClient.ParametersTypes.OBJECT,
    description: 'Arguments for looking up function code from the performance trace profile.',
    nullable: false,
    properties: {
      scriptUrl: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description: 'The URL of the script containing the function recorded in the performance trace.',
        nullable: false,
      },
      line: {
        type: Host.AidaClient.ParametersTypes.INTEGER,
        description: 'The line number where the function is defined (0-based, as reported in the call tree).',
        nullable: false,
      },
      column: {
        type: Host.AidaClient.ParametersTypes.INTEGER,
        description: 'The column number where the function is defined (0-based, as reported in the call tree).',
        nullable: false,
      },
    },
    required: ['scriptUrl', 'line', 'column'],
  };

  displayInfoFromArgs(params: GetTraceFunctionCodeArgs): {
    title: string,
    action: string,
  } {
    return {
      title: lockedString(UIStringsNotTranslate.lookingUpFunctionCode),
      action: `getTraceFunctionCode('${params.scriptUrl}', ${params.line}, ${params.column})`,
    };
  }

  async handler(
      params: GetTraceFunctionCodeArgs,
      capabilities: BaseToolCapability&PerformanceTraceCapability,
      ): Promise<DataHandlerResult<string>> {
    const performanceTraceContext = capabilities.getPerformanceTraceContext();
    if (!performanceTraceContext) {
      return {error: 'Performance trace context is not available.'};
    }

    if (performanceTraceContext.isImported()) {
      return {error: 'Cannot use this tool on an imported file.'};
    }

    if (!params.scriptUrl) {
      return {error: 'Missing arg: scriptUrl'};
    }

    if (!performanceTraceContext.canAccessResource(params.scriptUrl)) {
      return {error: 'Resource not found'};
    }

    if (params.line === undefined) {
      return {error: 'Missing arg: line'};
    }

    if (params.column === undefined) {
      return {error: 'Missing arg: column'};
    }

    const formatter = performanceTraceContext.createFormatter();
    const url = params.scriptUrl as Platform.DevToolsPath.UrlString;
    const code = await formatter.resolveFunctionCodeAtLocation(url, params.line, params.column);
    if (!code) {
      return {error: 'Could not find code'};
    }

    const result = formatter.formatFunctionCode(code);

    return {
      result,
      widgets: [{
        name: 'SOURCE_CODE',
        data: {
          url,
          line: params.line,
          column: params.column,
          code: code.code,
        },
      }],
    };
  }
}
