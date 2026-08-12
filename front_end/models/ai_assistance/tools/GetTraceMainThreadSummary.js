// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import { PerformanceTraceContext, } from '../contexts/PerformanceTraceContext.js';
import { MAX_FUNCTION_RESULT_BYTE_LENGTH, } from './Tool.js';
const UIStringsNotTranslate = {
    mainThreadActivity: 'Main thread activity',
};
const lockedString = i18n.i18n.lockedString;
export class GetTraceMainThreadSummaryTool {
    name = "getTraceMainThreadSummary" /* ToolName.GET_TRACE_MAIN_THREAD_SUMMARY */;
    description = 'Returns a focused, detailed summary of the main thread for a predefined labeled period.';
    parameters = {
        type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
        description: 'Arguments for looking up a main thread summary.',
        nullable: false,
        properties: {
            label: {
                type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                description: 'The label of the period to investigate (e.g., \'LCPBreakdown\', \'CLSCulprits\', \'nav-to-lcp\').',
                nullable: false,
            },
        },
        required: ['label'],
    };
    displayInfoFromArgs(params) {
        return {
            title: `${lockedString(UIStringsNotTranslate.mainThreadActivity)}: ${params.label}`,
            action: `getTraceMainThreadSummary('${params.label}')`,
        };
    }
    async handler(params, capabilities) {
        const conversationContext = capabilities.conversationContext;
        if (!conversationContext || !(conversationContext instanceof PerformanceTraceContext)) {
            return { error: 'Performance trace context is not available.' };
        }
        const focus = conversationContext.getItem();
        const bounds = conversationContext.getBoundsForLabel(params.label);
        if (!bounds) {
            return { error: `Invalid label: ${params.label}` };
        }
        const formatter = conversationContext.createFormatter();
        const summary = await formatter.formatMainThreadTrackSummary(bounds);
        if (summary.length > MAX_FUNCTION_RESULT_BYTE_LENGTH) {
            return {
                error: 'getTraceMainThreadSummary response is too large. Try investigating using other functions, or a more narrow bounds',
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
//# sourceMappingURL=GetTraceMainThreadSummary.js.map