// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as crypto from 'node:crypto';

import type {PhaseStatus, RunMetrics} from './gcs-upload.js';
import type {ToolCallStats, TurnTokens} from './trajectory-builder.js';

/**
 * Generates a run ID formatted as YYYY-MM-DD-HHmmss-xxxx-xxxxxxx
 * (e.g., 2026-08-25-134619-c0c1-8f25f69) for a suite execution.
 */
export function generateRunId(): string {
  const now = new Date();
  const dateStr = now.toISOString().replace(/T/, '-').replace(/:/g, '').slice(0, 17);
  const hex = crypto.randomBytes(6).toString('hex');
  return `${dateStr}-${hex.slice(0, 4)}-${hex.slice(4, 11)}`;
}

/**
 * Resolves the appropriate Content-Type header with UTF-8 charset based on the file extension.
 */
export function getContentType(filePath: string): string {
  if (filePath.endsWith('.json')) {
    return 'application/json; charset=utf-8';
  }
  if (filePath.endsWith('.html')) {
    return 'text/html; charset=utf-8';
  }
  if (filePath.endsWith('.marker')) {
    return 'text/plain';
  }
  return 'text/plain; charset=utf-8';
}

function formatErrorValue(value: unknown): string {
  if (value instanceof Error) {
    return value.stack || String(value);
  }
  if (typeof value === 'object' && value !== null && 'stack' in value && typeof value.stack === 'string' &&
      value.stack) {
    return value.stack;
  }
  return String(value);
}

/**
 * Formats an Error (or thrown value) and its optional cause stack trace for logs.
 */
export function formatError(err: unknown): string {
  const primary = formatErrorValue(err);
  if (err instanceof Error && err.cause !== undefined && err.cause !== null) {
    const cause = formatErrorValue(err.cause);
    return cause ? `${primary}\n${cause}` : primary;
  }
  return primary;
}

/**
 * Formats a duration in seconds as a protobuf Duration string (e.g. `12.345s`).
 */
export function formatProtoDuration(seconds: number): string {
  return `${seconds.toFixed(3)}s`;
}

/**
 * Formats a task or phase status as a protobuf enum string (e.g. `TASK_STATUS_SUCCEEDED`).
 */
export function formatProtoTaskStatus(status: PhaseStatus): string {
  return `TASK_STATUS_${status}`;
}

/**
 * Summarises the outcome of a task's verification step for the
 * verification_stdout.log artifact.
 */
export function formatVerificationStdout(taskId: string, target: string, hasError: boolean): string {
  return [
    `[Verification] Task: ${taskId}`,
    `[Verification] Target: ${target}`,
    `[Verification] Result: ${hasError ? 'FAILED' : 'PASSED'}`,
    '',
  ].join('\n');
}

/**
 * Formats the error and assertion failures of a task for the
 * verification_stderr.log artifact. Returns an empty string when the
 * task did not fail.
 */
export function formatVerificationStderr(errorMessage?: string): string {
  return errorMessage ? `[Error]: ${errorMessage}\n` : '';
}

/**
 * Builds the Gleam Eval Dashboard `agent_type:devtools-<target>` filter tags
 * for a run across all registered eval targets.
 */
export function buildRunTags(evalTargets: Iterable<string>): string[] {
  return Array.from(evalTargets, t => `agent_type:devtools-${t}`);
}

/**
 * Builds the Gleam Eval Dashboard filter tags (`attempt:<N>` and
 * `agent_type:devtools-<evalTarget>`) for a completed or failed task.
 *
 * @param evalTarget The DevTools panel/agent target domain (e.g. `'elements'`,
 *     `'network'`, `'performance'`, `'console'`), used to construct the
 *     `agent_type:devtools-<evalTarget>` tag.
 * @param taskId The task identifier, optionally suffixed with `__attempt_<N>`
 *     on multi-attempt runs.
 */
export function buildTaskTags(evalTarget: string, taskId: string): string[] {
  // Extract the 1-based attempt number when a task is run multiple times with a
  // `<taskId>__attempt_<N>` suffix (per the Gleam Eval persistence contract),
  // defaulting to `'1'` for single-attempt runs so the dashboard's `Attempt`
  // filter chip is populated as `attempt:1`.
  const attemptMatch = /__attempt_(\d+)$/.exec(taskId);
  const attempt = attemptMatch ? attemptMatch[1] : '1';
  return [`attempt:${attempt}`, `agent_type:devtools-${evalTarget}`];
}

/**
 * Aggregates per-task token, tool call, and skill activation counts into
 * run-level metrics.
 */
export function aggregateRunMetrics(
    taskStats: Iterable<ToolCallStats>,
    taskTokens: Iterable<TurnTokens>,
    ): RunMetrics {
  let inputTokens: number|undefined;
  let outputTokens: number|undefined;
  let cachedTokens: number|undefined;
  let totalTokens: number|undefined;
  for (const tokens of taskTokens) {
    if (tokens.input !== undefined) {
      inputTokens = (inputTokens ?? 0) + tokens.input;
    }
    if (tokens.output !== undefined) {
      outputTokens = (outputTokens ?? 0) + tokens.output;
    }
    if (tokens.cached !== undefined) {
      cachedTokens = (cachedTokens ?? 0) + tokens.cached;
    }
    if (tokens.total !== undefined) {
      totalTokens = (totalTokens ?? 0) + tokens.total;
    }
  }
  let totalToolCalls = 0;
  const toolCallsByTool: Record<string, number> = {};
  const failedToolCallsByTool: Record<string, number> = {};
  const activationsBySkill: Record<string, number> = {};
  for (const stats of taskStats) {
    totalToolCalls += stats.total;
    for (const [tool, count] of Object.entries(stats.byTool)) {
      toolCallsByTool[tool] = (toolCallsByTool[tool] ?? 0) + count;
    }
    for (const [tool, count] of Object.entries(stats.failedByTool)) {
      failedToolCallsByTool[tool] = (failedToolCallsByTool[tool] ?? 0) + count;
    }
    for (const [skill, count] of Object.entries(stats.activationsBySkill)) {
      activationsBySkill[skill] = (activationsBySkill[skill] ?? 0) + count;
    }
  }
  return {
    inputTokens,
    outputTokens,
    cachedTokens,
    totalTokens,
    totalToolCalls,
    toolCallsByTool,
    failedToolCallsByTool,
    activationsBySkill,
  };
}
