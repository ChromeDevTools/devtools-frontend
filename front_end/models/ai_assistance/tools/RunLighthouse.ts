// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import {LighthouseFormatter} from '../data_formatters/LighthouseFormatter.js';

import {
  type BaseToolCapability,
  type DataHandlerResult,
  type DataTool,
  type LighthouseCapability,
  type ToolArgs,
  ToolName,
} from './Tool.js';

export interface RunLighthouseArgs extends ToolArgs {
  explanation: string;
  category: LHModel.RunTypes.CategoryId;
  mode?: LHModel.RunTypes.RunMode;
}

export class RunLighthouseTool implements
    DataTool<RunLighthouseArgs, {audits: string}, BaseToolCapability&LighthouseCapability> {
  readonly name = ToolName.RUN_LIGHTHOUSE;
  readonly description =
      'Runs Lighthouse audits on the active page. Supports "navigation" (for full initial page load audits), "snapshot" (for inspecting live in-page modifications without reload), and "timespan" (for interactions).';

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
      category: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description: 'Lighthouse category. E.g. "accessibility", "performance".',
        nullable: false,
      },
      mode: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description:
            'Lighthouse execution mode: "navigation", "snapshot", "timespan". Use "navigation" for initial full audits unless the user requested otherwise or in-page changes are being evaluated. Defaults to "snapshot".',
        nullable: true,
      },
    },
    required: ['explanation', 'category'],
  };

  displayInfoFromArgs(params: RunLighthouseArgs): {title: string, thought: string, action: string} {
    return {
      title: `Running Lighthouse audits: ${params.category} (${params.mode ?? 'snapshot'})`,
      thought: params.explanation,
      action: `runLighthouse('${params.category}', '${params.mode ?? 'snapshot'}')`,
    };
  }

  async handler(params: RunLighthouseArgs,
                context: BaseToolCapability&LighthouseCapability): Promise<DataHandlerResult<{audits: string}>> {
    if (!context.lighthouseRecording) {
      return {error: 'Error: Lighthouse recording capability is not available.'};
    }
    const mode = params.mode ?? 'snapshot';
    try {
      const report = await context.lighthouseRecording({
        mode,
        categoryIds: [params.category],
        isAIControlled: true,
      });
      if (!report) {
        return {error: 'Error: Failed to record new audits.'};
      }

      const audits = new LighthouseFormatter().audits(report, params.category);
      const isSnapshot = mode === 'snapshot';
      return {
        result: {audits},
        widgets: [{name: 'LIGHTHOUSE_REPORT', data: {report, snapshotReport: isSnapshot}}],
      };
    } catch (err) {
      return {error: `Error: Failed to record new audits: ${err instanceof Error ? err.message : String(err)}`};
    }
  }
}
