// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import { LighthouseFormatter } from '../data_formatters/LighthouseFormatter.js';
export class RunLighthouseTool {
    name = "runLighthouse" /* ToolName.RUN_LIGHTHOUSE */;
    description = 'Runs Lighthouse audits on the active page. Supports "navigation" (for full initial page load audits), "snapshot" (for inspecting live in-page modifications without reload), and "timespan" (for interactions).';
    parameters = {
        type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
        description: 'Parameters for running Lighthouse audits.',
        nullable: false,
        properties: {
            explanation: {
                type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                description: 'Reason for running new audits.',
                nullable: false,
            },
            categoryId: {
                type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                // The experimental 'agentic-browsing' category is intentionally omitted from the prompt description so the agent does not invoke it unprompted. It is also excluded when 'all' is provided.
                description: 'Lighthouse category. Use "all" to run all categories, or specify a category: "accessibility", "performance", "best-practices", "seo".',
                nullable: false,
            },
            mode: {
                type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                description: 'Lighthouse execution mode: "navigation", "snapshot", "timespan". Use "navigation" for initial full audits unless the user requested otherwise or in-page changes are being evaluated. Defaults to "snapshot".',
                nullable: true,
            },
        },
        required: ['explanation', 'categoryId'],
    };
    displayInfoFromArgs(params) {
        return {
            title: `Running Lighthouse audits: ${params.categoryId} (${params.mode ?? 'snapshot'})`,
            thought: params.explanation,
            action: `runLighthouse('${params.categoryId}', '${params.mode ?? 'snapshot'}')`,
        };
    }
    async handler(params, context) {
        const mode = params.mode ?? 'snapshot';
        try {
            // Passing undefined for categoryIds instructs the Lighthouse runner to audit all categories supported by the mode when isAIControlled is true.
            const report = await context.runLighthouse({
                mode,
                categoryIds: params.categoryId === 'all' ? undefined : [params.categoryId],
                isAIControlled: true,
            });
            if (!report) {
                return { error: 'Error: Failed to record new audits.' };
            }
            const audits = new LighthouseFormatter().formatReport(report, params.categoryId);
            const isSnapshot = mode === 'snapshot';
            return {
                result: { audits },
                widgets: [{ name: 'LIGHTHOUSE_REPORT', data: { report, snapshotReport: isSnapshot } }],
            };
        }
        catch (err) {
            return { error: `Error: Failed to record new audits: ${err instanceof Error ? err.message : String(err)}` };
        }
    }
}
//# sourceMappingURL=RunLighthouse.js.map