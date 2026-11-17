// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {PerformanceTraceContext} from '../contexts/PerformanceTraceContext.js';
import type {AgentFocus} from '../performance/AIContext.js';

import {
  type BaseToolCapability,
  type ContextHandlerResult,
  type ContextTool,
  type PerformanceRecordingCapability,
  PermissionPrompt,
  type TargetCapability,
  ToolName,
} from './Tool.js';

const UIStringsNotTranslate = {
  recordingPerformanceTrace: 'Recording a performance trace',
} as const;

const lockedString = i18n.i18n.lockedString;

export class RecordPerformanceTraceTool implements
    ContextTool<Record<string, never>, AgentFocus, BaseToolCapability&PerformanceRecordingCapability&TargetCapability> {
  readonly name: ToolName = ToolName.RECORD_PERFORMANCE_TRACE;
  readonly permissionPrompt: PermissionPrompt = PermissionPrompt.NEVER;
  readonly description: string =
      'Reloads the page and records a new performance trace to measure, analyze, and debug page performance. Preferred tool for measuring page load performance and Core Web Vitals.';

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

  async handler(_params: Record<string, never>,
                capabilities: BaseToolCapability&PerformanceRecordingCapability&
                TargetCapability): Promise<ContextHandlerResult<AgentFocus>> {
    if (!capabilities.performanceRecordAndReload) {
      return {error: 'Performance recording is not available.'};
    }
    if (capabilities.getTarget()?.model(SDK.DebuggerModel.DebuggerModel)?.isPaused()) {
      return {
        error:
            'Error: Cannot record a performance trace because JavaScript execution is paused on a breakpoint. Do not retry; ask the user to resume execution in the Sources panel first.',
      };
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
