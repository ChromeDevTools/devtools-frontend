// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import { AccessibilityContext } from '../contexts/AccessibilityContext.js';
import { LighthouseFormatter } from '../data_formatters/LighthouseFormatter.js';
export class GetLighthouseAuditsTool {
    name = "getLighthouseAudits" /* ToolName.GET_LIGHTHOUSE_AUDITS */;
    description = 'Returns the audits for a specific Lighthouse category.';
    parameters = {
        type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
        description: 'Arguments for retrieving Lighthouse category audits.',
        nullable: false,
        properties: {
            categoryId: {
                type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                description: 'The category of audits to retrieve. E.g. "accessibility".',
                nullable: false,
            },
        },
        required: ['categoryId'],
    };
    displayInfoFromArgs(params) {
        return {
            title: `Getting Lighthouse audits for ${params.categoryId}`,
            action: `getLighthouseAudits('${params.categoryId}')`,
        };
    }
    async handler(params, context) {
        if (!(context.conversationContext instanceof AccessibilityContext)) {
            return { error: 'Error: Active context is not a Lighthouse report.' };
        }
        const report = context.conversationContext.getItem();
        const audits = new LighthouseFormatter().audits(report, params.categoryId);
        return {
            result: { audits },
            widgets: [{ name: 'LIGHTHOUSE_REPORT', data: { report } }],
        };
    }
}
//# sourceMappingURL=GetLighthouseAudits.js.map