// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import {formatEventForAI} from '../data_formatters/PerformanceTraceFormatter.js';

import {
  type BaseToolCapability,
  type DataHandlerResult,
  type DataTool,
  type PerformanceTraceCapability,
  type ToolArgs,
  ToolName,
} from './Tool.js';

const UIStringsNotTranslate = {
  lookingAtTraceEvent: 'Looking at trace event',
} as const;

const lockedString = i18n.i18n.lockedString;

export interface GetTraceEventByKeyArgs extends ToolArgs {
  eventKey: string;
}

export class GetTraceEventByKeyTool implements
    DataTool<GetTraceEventByKeyArgs, string, BaseToolCapability&PerformanceTraceCapability> {
  readonly name = ToolName.GET_TRACE_EVENT_BY_KEY;
  readonly description = 'Get details for a specific trace event by its event key.';

  readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetTraceEventByKeyArgs> = {
    type: Host.AidaClient.ParametersTypes.OBJECT,
    description: 'Arguments for looking up a trace event.',
    nullable: false,
    properties: {
      eventKey: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description: 'The key of the event to look up.',
        nullable: false,
      },
    },
    required: ['eventKey'],
  };

  displayInfoFromArgs(params: GetTraceEventByKeyArgs): {
    title: string,
    action: string,
  } {
    return {
      title: lockedString(UIStringsNotTranslate.lookingAtTraceEvent),
      action: `getTraceEventByKey('${params.eventKey}')`,
    };
  }

  async handler(
      params: GetTraceEventByKeyArgs,
      capabilities: BaseToolCapability&PerformanceTraceCapability,
      ): Promise<DataHandlerResult<string>> {
    const performanceTraceContext = capabilities.getPerformanceTraceContext();
    if (!performanceTraceContext) {
      return {error: 'Performance trace context is not available.'};
    }

    const focus = performanceTraceContext.getItem();
    const event = focus.lookupEvent(params.eventKey);
    if (!event) {
      return {error: `Could not find event with key "${params.eventKey}".`};
    }

    const details = formatEventForAI(event);
    return {
      result: details,
      widgets: [{
        name: 'TIMELINE_EVENT_SUMMARY',
        data: {
          event,
          parsedTrace: focus.parsedTrace,
        },
      }],
    };
  }
}
