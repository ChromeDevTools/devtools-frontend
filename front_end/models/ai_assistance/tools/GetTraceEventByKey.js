// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import { PerformanceTraceContext } from '../contexts/PerformanceTraceContext.js';
import { formatEventForAI } from '../data_formatters/PerformanceTraceFormatter.js';
const UIStringsNotTranslate = {
    lookingAtTraceEvent: 'Looking at trace event',
};
const lockedString = i18n.i18n.lockedString;
export class GetTraceEventByKeyTool {
    name = "getTraceEventByKey" /* ToolName.GET_TRACE_EVENT_BY_KEY */;
    description = 'Get details for a specific trace event by its event key.';
    parameters = {
        type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
        description: 'Arguments for looking up a trace event.',
        nullable: false,
        properties: {
            eventKey: {
                type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                description: 'The key of the event to look up.',
                nullable: false,
            },
        },
        required: ['eventKey'],
    };
    displayInfoFromArgs(params) {
        return {
            title: lockedString(UIStringsNotTranslate.lookingAtTraceEvent),
            action: `getTraceEventByKey('${params.eventKey}')`,
        };
    }
    async handler(params, capabilities) {
        const conversationContext = capabilities.conversationContext;
        if (!conversationContext || !(conversationContext instanceof PerformanceTraceContext)) {
            return { error: 'Performance trace context is not available.' };
        }
        const focus = conversationContext.getItem();
        const event = focus.lookupEvent(params.eventKey);
        if (!event) {
            return { error: `Could not find event with key "${params.eventKey}".` };
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
//# sourceMappingURL=GetTraceEventByKey.js.map