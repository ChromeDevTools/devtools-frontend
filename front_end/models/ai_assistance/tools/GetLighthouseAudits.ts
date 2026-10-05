// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import {type LighthouseCategoryArg, LighthouseFormatter} from '../data_formatters/LighthouseFormatter.js';

import {
  type BaseToolCapability,
  type DataHandlerResult,
  type DataTool,
  type LighthouseReportCapability,
  PermissionPrompt,
  type ToolArgs,
  ToolName,
} from './Tool.js';

export interface GetLighthouseAuditsArgs extends ToolArgs {
  categoryId: LighthouseCategoryArg;
}

export class GetLighthouseAuditsTool implements
    DataTool<GetLighthouseAuditsArgs, {audits: string}, BaseToolCapability&LighthouseReportCapability> {
  readonly name: ToolName = ToolName.GET_LIGHTHOUSE_AUDITS;
  readonly permissionPrompt: PermissionPrompt = PermissionPrompt.NEVER;
  readonly description: string =
      'Retrieves audit results and diagnostic details from the active Lighthouse report for all categories (using categoryId: "all") or a specific category (e.g., \'accessibility\').';

  readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetLighthouseAuditsArgs> = {
    type: Host.AidaClient.ParametersTypes.OBJECT,
    description: 'Arguments for retrieving Lighthouse category audits.',
    nullable: false,
    properties: {
      categoryId: {
        type: Host.AidaClient.ParametersTypes.STRING,
        description:
            'The category of audits to retrieve. Use "all" to retrieve the full report and all categories, or specify a category: "accessibility", "performance", "best-practices", "seo".',
        nullable: false,
      },
    },
    required: ['categoryId'],
  };

  displayInfoFromArgs(params: GetLighthouseAuditsArgs): {title: string, action: string} {
    return {
      title: `Getting Lighthouse audits for ${params.categoryId}`,
      action: `getLighthouseAudits('${params.categoryId}')`,
    };
  }

  async handler(params: GetLighthouseAuditsArgs,
                context: BaseToolCapability&LighthouseReportCapability): Promise<DataHandlerResult<{audits: string}>> {
    const report = context.getLighthouseReport();
    if (!report) {
      return {error: 'Error: Active context is not a Lighthouse report.'};
    }
    const audits = new LighthouseFormatter().formatReport(report, params.categoryId);
    return {
      result: {audits},
    };
  }
}
