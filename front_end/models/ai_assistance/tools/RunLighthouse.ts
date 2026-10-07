// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import {LighthouseContext} from '../contexts/LighthouseContext.js';
import type {LighthouseCategoryArg} from '../data_formatters/LighthouseFormatter.js';

import {
  type BaseToolCapability,
  type ContextHandlerResult,
  type ContextTool,
  type LighthouseRecordingCapability,
  PermissionPrompt,
  type ToolArgs,
  ToolName,
} from './Tool.js';

export interface RunLighthouseArgs extends ToolArgs {
  explanation: string;
  categoryId: LighthouseCategoryArg;
  mode?: LHModel.RunTypes.RunMode;
}

/**
 * Runs Lighthouse audits on the inspected page and sets the resulting report as the active conversation context.
 */
export class RunLighthouseTool implements
    ContextTool<RunLighthouseArgs, LHModel.ReporterTypes.ReportJSON, BaseToolCapability&LighthouseRecordingCapability> {
  readonly name: ToolName = ToolName.RUN_LIGHTHOUSE;
  readonly permissionPrompt: PermissionPrompt = PermissionPrompt.NEVER;
  readonly description: string =
      'Runs Lighthouse audits on the active page. Supports "navigation" (for full initial page load audits), "snapshot" (for inspecting live in-page modifications without reload), and "timespan" (for interactions). Use only when the user asks for Lighthouse, a Lighthouse score, or a multi-category audit. For measuring page performance, record a performance trace instead.';

  readonly parameters: Host.AidaClient.FunctionObjectParam<keyof RunLighthouseArgs> = {
    type: Host.AidaClient.ParametersTypes.OBJECT,
    description: 'Parameters for running Lighthouse audits.',
    nullable: false,
    properties: {
      explanation: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description: 'Reason for running new audits.',
        nullable: false,
      },
      categoryId: {
        type: Host.AidaClient.ParametersTypes.STRING,
        // The experimental 'agentic-browsing' category is intentionally omitted from the prompt description so the agent does not invoke it unprompted. It is also excluded when 'all' is provided.
        description:
            'Lighthouse category. Use "all" to run all categories, or specify a category: "accessibility", "performance", "best-practices", "seo".',
        nullable: false,
      },
      mode: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description:
            'Lighthouse execution mode: "navigation", "snapshot", "timespan". Use "navigation" for initial full audits unless the user requested otherwise or in-page changes are being evaluated. Defaults to "snapshot".',
        nullable: true,
      },
    },
    required: ['explanation', 'categoryId'],
  };

  displayInfoFromArgs(params: RunLighthouseArgs): {title: string, thought: string, action: string} {
    return {
      title: `Running Lighthouse audits: ${params.categoryId} (${params.mode ?? 'snapshot'})`,
      thought: params.explanation,
      action: `runLighthouse('${params.categoryId}', '${params.mode ?? 'snapshot'}')`,
    };
  }

  async handler(params: RunLighthouseArgs, context: BaseToolCapability&LighthouseRecordingCapability):
      Promise<ContextHandlerResult<LHModel.ReporterTypes.ReportJSON>> {
    const mode = params.mode ?? 'snapshot';
    try {
      // Passing undefined for categoryIds instructs the Lighthouse runner to audit all categories supported by the mode when isAIControlled is true.
      const report = await context.runLighthouse({
        mode,
        categoryIds: params.categoryId === 'all' ? undefined : [params.categoryId],
        isAIControlled: true,
      });
      if (!report) {
        return {error: 'Error: Failed to record new audits.'};
      }

      return {
        // No widgets are returned here; LighthouseContext.getWidgets() provides the report widget.
        context: new LighthouseContext(report),
        description: 'Lighthouse audit completed',
      };
    } catch (err) {
      return {error: `Error: Failed to record new audits: ${err instanceof Error ? err.message : String(err)}`};
    }
  }
}
