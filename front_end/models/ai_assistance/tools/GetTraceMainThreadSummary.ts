// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type {MainThreadSectionLabel} from '../contexts/PerformanceTraceContext.js';

import {
  type BaseToolCapability,
  type DataHandlerResult,
  type DataTool,
  MAX_FUNCTION_RESULT_BYTE_LENGTH,
  type PerformanceTraceCapability,
  type ToolArgs,
  ToolName,
} from './Tool.js';

const UIStringsNotTranslate = {
  mainThreadActivity: 'Main thread activity',
} as const;

const lockedString = i18n.i18n.lockedString;

export interface GetTraceMainThreadSummaryArgs extends ToolArgs {
  label: MainThreadSectionLabel;
}

export class GetTraceMainThreadSummaryTool implements
    DataTool<GetTraceMainThreadSummaryArgs, string, BaseToolCapability&PerformanceTraceCapability> {
  readonly name = ToolName.GET_TRACE_MAIN_THREAD_SUMMARY;
  readonly description = 'Returns a focused, detailed summary of the main thread for a predefined labeled period.';

  readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetTraceMainThreadSummaryArgs> = {
    type: Host.AidaClient.ParametersTypes.OBJECT,
    description: 'Arguments for looking up a main thread summary.',
    nullable: false,
    properties: {
      label: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description:
            'The label of the period to investigate (e.g., \'LCPBreakdown\', \'CLSCulprits\', \'nav-to-lcp\').',
        nullable: false,
      },
    },
    required: ['label'],
  };

  displayInfoFromArgs(params: GetTraceMainThreadSummaryArgs): {
    title: string,
    action: string,
  } {
    return {
      title: `${lockedString(UIStringsNotTranslate.mainThreadActivity)}: ${params.label}`,
      action: `getTraceMainThreadSummary('${params.label}')`,
    };
  }

  async handler(
      params: GetTraceMainThreadSummaryArgs,
      capabilities: BaseToolCapability&PerformanceTraceCapability,
      ): Promise<DataHandlerResult<string>> {
    const performanceTraceContext = capabilities.getPerformanceTraceContext();
    if (!performanceTraceContext) {
      return {error: 'Performance trace context is not available.'};
    }

    const focus = performanceTraceContext.getItem();
    const bounds = performanceTraceContext.getBoundsForLabel(params.label);
    if (!bounds) {
      return {error: `Invalid label: ${params.label}`};
    }

    const formatter = performanceTraceContext.createFormatter();
    const summary = await formatter.formatMainThreadTrackSummary(bounds);
    if (summary.length > MAX_FUNCTION_RESULT_BYTE_LENGTH) {
      return {
        error:
            'getTraceMainThreadSummary response is too large. Try investigating using other functions, or a more narrow bounds',
      };
    }

    return {
      result: summary,
      widgets: [
        {
          name: 'TIMELINE_RANGE_SUMMARY',
          data: {
            parsedTrace: focus.parsedTrace,
            bounds,
            track: 'main',
          },
        },
        {
          name: 'BOTTOM_UP_TREE',
          data: {
            bounds,
            parsedTrace: focus.parsedTrace,
          },
        },
      ],
    };
  }
}
