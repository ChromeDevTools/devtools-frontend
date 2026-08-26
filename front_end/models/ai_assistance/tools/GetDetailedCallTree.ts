// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Trace from '../../trace/trace.js';
import {AICallTree} from '../performance/AICallTree.js';

import {
  type BaseToolCapability,
  type DataHandlerResult,
  type DataTool,
  type PerformanceTraceCapability,
  type ToolArgs,
  ToolName,
} from './Tool.js';

const UIStringsNotTranslate = {
  lookingAtCallTree: 'Looking at call tree',
} as const;

const lockedString = i18n.i18n.lockedString;

export interface GetDetailedCallTreeArgs extends ToolArgs {
  eventKey: string;
}

export class GetDetailedCallTreeTool implements
    DataTool<GetDetailedCallTreeArgs, string, BaseToolCapability&PerformanceTraceCapability> {
  readonly name = ToolName.GET_DETAILED_CALL_TREE;
  readonly description = 'Returns a detailed call tree for the given main thread event.';

  readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetDetailedCallTreeArgs> = {
    type: Host.AidaClient.ParametersTypes.OBJECT,
    description: 'Arguments for looking up a call tree.',
    nullable: false,
    properties: {
      eventKey: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description: 'The key for the event.',
        nullable: false,
      },
    },
    required: ['eventKey'],
  };

  displayInfoFromArgs(params: GetDetailedCallTreeArgs): {
    title: string,
    action: string,
  } {
    return {
      title: lockedString(UIStringsNotTranslate.lookingAtCallTree),
      action: `getDetailedCallTree('${params.eventKey}')`,
    };
  }

  async handler(
      params: GetDetailedCallTreeArgs,
      capabilities: BaseToolCapability&PerformanceTraceCapability,
      ): Promise<DataHandlerResult<string>> {
    const performanceTraceContext = capabilities.getPerformanceTraceContext();
    if (!performanceTraceContext) {
      return {error: 'Performance trace context is not available.'};
    }

    if (!params.eventKey) {
      return {error: 'Missing arg: eventKey'};
    }

    const focus = performanceTraceContext.getItem();
    const event = focus.lookupEvent(params.eventKey);
    if (!event) {
      return {error: 'Invalid eventKey'};
    }

    const tree = AICallTree.fromEvent(event, focus.parsedTrace);
    if (!tree) {
      return {error: 'No call tree found'};
    }

    const formatter = performanceTraceContext.createFormatter();
    const callTree = await formatter.formatCallTree(tree);

    const bounds = Trace.Helpers.Timing.traceWindowFromEvent(event);

    return {
      result: callTree,
      widgets: [
        {
          name: 'BOTTOM_UP_TREE',
          data: {
            bounds,
            parsedTrace: focus.parsedTrace,
          },
        },
        {
          name: 'TIMELINE_RANGE_SUMMARY',
          data: {
            bounds,
            parsedTrace: focus.parsedTrace,
            track: 'main',
          },
        },
      ],
    };
  }
}
