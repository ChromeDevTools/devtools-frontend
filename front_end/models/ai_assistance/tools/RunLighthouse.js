// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as LHModel from '../../lighthouse/lighthouse.js';
import { LighthouseContext } from '../contexts/LighthouseContext.js';
// Runtime fallback in case an LLM call omits the required `mode` argument.
// "agentic-browsing" defaults to "navigation" because its WebMCP gatherers only run during navigation.
function resolveMode(params) {
    return params.mode ?? (params.categoryId === 'agentic-browsing' ? 'navigation' : 'snapshot');
}
/**
 * Runs Lighthouse audits on the inspected page and sets the resulting report as the active conversation context.
 */
export class RunLighthouseTool {
    name = "runLighthouse" /* ToolName.RUN_LIGHTHOUSE */;
    permissionPrompt = "never" /* PermissionPrompt.NEVER */;
    description = 'Runs Lighthouse audits on the active page. Supports "navigation" (for full initial page load audits), "snapshot" (for inspecting live in-page modifications without reload), and "timespan" (for interactions). Use only when the user asks for Lighthouse, a Lighthouse score, or a multi-category audit. For measuring page performance, record a performance trace instead.';
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
                // The experimental 'agentic-browsing' category is listed separately from the standard categories and restricted to explicit user requests so the agent does not invoke it unprompted. It is also excluded when 'all' is provided (see `LighthouseController.getCategoryIDs`).
                description: 'Lighthouse category. Use "all" to run all categories, or specify a category: "accessibility", "performance", "best-practices", "seo". Use "agentic-browsing" only when the user explicitly asks for an agentic browsing audit (how well AI agents can navigate and use the page, including WebMCP). "all" does not include "agentic-browsing". Run "agentic-browsing" in "navigation" mode, because its WebMCP audits only run in "navigation" mode.',
                nullable: false,
            },
            mode: {
                type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                description: 'Lighthouse execution mode: "navigation", "snapshot", or "timespan". Use "navigation" to reload the page and run all audits (including page-load metrics and WebMCP gatherers); note that reloading resets unsaved in-page DOM or CSS modifications. Use "snapshot" to audit the current DOM state without reloading (preserving live edits, though navigation-only audits such as WebMCP are skipped). Use "timespan" to audit user interactions (supported only by "performance" and "best-practices").',
                nullable: false,
            },
        },
        required: ['explanation', 'categoryId', 'mode'],
    };
    displayInfoFromArgs(params) {
        const mode = resolveMode(params);
        return {
            title: `Running Lighthouse audits: ${params.categoryId} (${mode})`,
            thought: params.explanation,
            action: `runLighthouse('${params.categoryId}', '${mode}')`,
        };
    }
    async handler(params, context) {
        const mode = resolveMode(params);
        if (params.categoryId !== 'all') {
            const supportedModes = LHModel.RunTypes.CATEGORY_SUPPORTED_MODES[params.categoryId];
            if (!supportedModes?.includes(mode)) {
                return {
                    error: `Error: Category "${params.categoryId}" does not support "${mode}" mode. Supported modes: ${supportedModes ? supportedModes.join(', ') : 'none'}.`,
                };
            }
        }
        try {
            // Passing undefined for categoryIds instructs the Lighthouse runner to audit all categories supported by the mode when isAIControlled is true.
            const result = await context.runLighthouse({
                mode,
                categoryIds: params.categoryId === 'all' ? undefined : [params.categoryId],
                isAIControlled: true,
            });
            if (result.status === 'cancelled') {
                return { error: 'The user cancelled the Lighthouse audit. Do not run it again unless the user asks you to.' };
            }
            if (result.status === 'failed') {
                return { error: 'Error: Failed to record new audits.' };
            }
            return {
                // No widgets are returned here; LighthouseContext.getWidgets() provides the report widget.
                context: new LighthouseContext(result.report),
                description: 'Lighthouse audit completed',
            };
        }
        catch (err) {
            return { error: `Error: Failed to record new audits: ${err instanceof Error ? err.message : String(err)}` };
        }
    }
}
//# sourceMappingURL=RunLighthouse.js.map