// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {PerformanceTraceContext} from '../contexts/PerformanceTraceContext.js';

import {
  type BaseToolCapability,
  type DataHandlerResult,
  type DataTool,
  type ToolArgs,
  ToolName,
} from './Tool.js';

const UIStringsNotTranslate = {
  selectingTraceEvent: 'Selecting trace event',
} as const;

const lockedString = i18n.i18n.lockedString;

export interface SelectTraceEventByKeyArgs extends ToolArgs {
  eventKey: string;
}

export class SelectTraceEventByKeyTool implements DataTool<SelectTraceEventByKeyArgs, string, BaseToolCapability> {
  readonly name = ToolName.SELECT_TRACE_EVENT_BY_KEY;
  readonly description = 'Selects and reveals a specific event by its key in the Performance panel Flamechart.';

  readonly parameters: Host.AidaClient.FunctionObjectParam<keyof SelectTraceEventByKeyArgs> = {
    type: Host.AidaClient.ParametersTypes.OBJECT,
    description: 'Arguments for selecting a trace event.',
    nullable: false,
    properties: {
      eventKey: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description: 'The key of the event to select.',
        nullable: false,
      },
    },
    required: ['eventKey'],
  };

  displayInfoFromArgs(params: SelectTraceEventByKeyArgs): {
    title: string,
    action: string,
  } {
    return {
      title: lockedString(UIStringsNotTranslate.selectingTraceEvent),
      action: `selectTraceEventByKey('${params.eventKey}')`,
    };
  }

  async handler(
      params: SelectTraceEventByKeyArgs,
      capabilities: BaseToolCapability,
      ): Promise<DataHandlerResult<string>> {
    const conversationContext = capabilities.conversationContext;
    if (!conversationContext || !(conversationContext instanceof PerformanceTraceContext)) {
      return {error: 'Performance trace context is not available.'};
    }

    const focus = conversationContext.getItem();
    const event = focus.lookupEvent(params.eventKey);
    if (!event) {
      return {error: `Could not find event with key "${params.eventKey}".`};
    }

    const revealable = new SDK.TraceObject.RevealableEvent(event);
    try {
      await Common.Revealer.reveal(revealable);
    } catch {
      // A failed reveal should not block returning the selected event context.
    }

    return {
      result: 'Event selected',
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
