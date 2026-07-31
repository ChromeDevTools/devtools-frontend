// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type {FunctionCallHandlerResult} from '../agents/AiAgent.js';
import {PerformanceTraceContext} from '../contexts/PerformanceTraceContext.js';

import {type BaseToolCapability, type PerformanceRecordingCapability, type Tool, ToolName} from './Tool.js';

const UIStringsNotTranslate = {
  recordingPerformanceTrace: 'Recording a performance trace',
} as const;

const lockedString = i18n.i18n.lockedString;

export class RecordPerformanceTraceTool implements
    Tool<Record<string, never>, unknown, BaseToolCapability&PerformanceRecordingCapability> {
  readonly name = ToolName.RECORD_PERFORMANCE_TRACE;
  readonly description = 'Records a new performance trace to measure, analyze, and debug page performance.';

  readonly parameters: Host.AidaClient.FunctionObjectParam<never> = {
    type: Host.AidaClient.ParametersTypes.OBJECT,
    description: 'Parameters for recording a performance trace.',
    nullable: false,
    properties: {},
    required: [],
  };

  displayInfoFromArgs(): {
    title: string,
    action: string,
  } {
    return {
      title: lockedString(UIStringsNotTranslate.recordingPerformanceTrace),
      action: 'recordPerformanceTrace()',
    };
  }

  async handler(_params: Record<string, never>, capabilities: BaseToolCapability&PerformanceRecordingCapability):
      Promise<FunctionCallHandlerResult<unknown>> {
    if (!capabilities.performanceRecordAndReload) {
      return {error: 'Performance recording is not available.'};
    }
    try {
      const result = await capabilities.performanceRecordAndReload();
      return {
        context: PerformanceTraceContext.fromParsedTrace(result),
        description: 'User recorded a performance trace',
        widgets: [{name: 'PERFORMANCE_TRACE', data: {parsedTrace: result}}],
      };
    } catch (err) {
      return {error: `Failed to record performance trace: ${err instanceof Error ? err.message : String(err)}`};
    }
  }
}
