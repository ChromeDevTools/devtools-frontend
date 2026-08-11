// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import {PerformanceTraceContext} from '../contexts/PerformanceTraceContext.js';

import {
  type BaseToolCapability,
  type DataHandlerResult,
  type DataTool,
  MAX_FUNCTION_RESULT_BYTE_LENGTH,
  type ToolArgs,
  ToolName,
} from './Tool.js';

const UIStringsNotTranslate = {
  networkActivitySummary: 'Network activity summary',
} as const;

const lockedString = i18n.i18n.lockedString;

export interface GetTraceNetworkSummaryArgs extends ToolArgs {
  min?: number;
  max?: number;
}

export class GetTraceNetworkSummaryTool implements DataTool<GetTraceNetworkSummaryArgs, string, BaseToolCapability> {
  readonly name = ToolName.GET_TRACE_NETWORK_SUMMARY;
  readonly description = 'Returns a summary of the network requests for the given bounds.';

  readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetTraceNetworkSummaryArgs> = {
    type: Host.AidaClient.ParametersTypes.OBJECT,
    description: 'Arguments for looking up a network track summary.',
    nullable: false,
    properties: {
      min: {
        type: Host.AidaClient.ParametersTypes.INTEGER,
        description: 'The minimum time of the bounds, in microseconds.',
        nullable: true,
      },
      max: {
        type: Host.AidaClient.ParametersTypes.INTEGER,
        description: 'The maximum time of the bounds, in microseconds.',
        nullable: true,
      },
    },
    required: [],
  };

  displayInfoFromArgs(params: GetTraceNetworkSummaryArgs): {
    title: string,
    action: string,
  } {
    const parts = [];
    if (params.min !== undefined) {
      parts.push(`min: ${params.min}`);
    }
    if (params.max !== undefined) {
      parts.push(`max: ${params.max}`);
    }
    return {
      title: lockedString(UIStringsNotTranslate.networkActivitySummary),
      action: `getTraceNetworkSummary({${parts.join(', ')}})`,
    };
  }

  async handler(
      params: GetTraceNetworkSummaryArgs,
      capabilities: BaseToolCapability,
      ): Promise<DataHandlerResult<string>> {
    const conversationContext = capabilities.conversationContext;
    if (!conversationContext || !(conversationContext instanceof PerformanceTraceContext)) {
      return {error: 'Performance trace context is not available.'};
    }

    const focus = conversationContext.getItem();
    const bounds = conversationContext.createBounds(params.min, params.max);
    if (!bounds) {
      return {error: 'Invalid bounds.'};
    }

    const formatter = conversationContext.createFormatter();
    const summary = formatter.formatNetworkTrackSummary(bounds);
    if (summary.length > MAX_FUNCTION_RESULT_BYTE_LENGTH) {
      return {
        error:
            'getTraceNetworkSummary response is too large. Try investigating using other functions, or a more narrow bounds',
      };
    }

    return {
      result: summary,
      widgets: [{
        name: 'NETWORK_TRACK',
        data: {
          parsedTrace: focus.parsedTrace,
          bounds,
        },
      }],
    };
  }
}
