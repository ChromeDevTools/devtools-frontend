// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {EvalLogger} from './eval-logger.js';
import {
  type PhaseStatus,
  type TaskOutcomeStatus,
  TaskOutputFile,
  type TaskStatus,
  uploadTaskCompleted,
  uploadTaskContent,
  uploadTaskFile,
} from './gcs-upload.js';
import {
  calculateTrajectoryToolCalls,
  exportEvalTrajectory,
  formatChatLog,
  type ToolCallStats,
  type Trajectory,
} from './trajectory-builder.js';

export const PASS_SCORE_THRESHOLD = 0.7;

export interface FinalizeTaskOptions {
  runId: string;
  taskId: string;
  label: string;
  /** Eval target domain (e.g. 'elements', 'network'), used for logs and agent_type tags. */
  target: string;
  trajectory: Trajectory;
  outputDir: string;
  durationSeconds: number;
  verificationDurationSeconds: number;
  gradingDurationSeconds: number;
  logger: EvalLogger;
  taskStatuses: TaskStatus[];
  taskToolCallStats: Map<string, ToolCallStats>;
  hasError?: boolean;
  errorMessage?: string;
  customScore?: number|null;
  gradingOutput?: string;
}

export interface HandleTaskFailureOptions {
  runId: string;
  taskId: string;
  /** Eval target domain (e.g. 'elements', 'network'), used for logs and agent_type tags. */
  target: string;
  phase: 'Preparation'|'Execution'|'Finalization';
  durationSeconds: number;
  logger: EvalLogger;
  taskStatuses: TaskStatus[];
  toolCallStats: ToolCallStats;
  errorMessage?: string;
}

export interface RecordTaskFailureOptions {
  taskId: string;
  runId: string;
  target: string;
  phase: 'Preparation'|'Execution'|'Finalization';
  durationSeconds: number;
  taskStatuses: TaskStatus[];
  toolCallStats: ToolCallStats;
}

export interface UploadTaskArtifactsOptions {
  runId: string;
  taskId: string;
  target: string;
  logger: EvalLogger;
  trajectory: Trajectory;
  evalOutputPath: string;
  hasError?: boolean;
  errorMessage?: string;
}

export interface RecordTaskCompletionOptions {
  taskId: string;
  runId: string;
  target: string;
  durationSeconds: number;
  verificationDurationSeconds: number;
  gradingDurationSeconds: number;
  taskStatuses: TaskStatus[];
  allUploadsSucceeded: boolean;
  toolCallStats: ToolCallStats;
  hasError?: boolean;
  customScore?: number|null;
  gradingOutput?: string;
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
 * Builds the Gleam Eval Dashboard filter tags (`attempt:<N>` and
 * `agent_type:devtools-<evalTarget>`) for a completed or failed task.
 *
 * @param evalTarget The DevTools panel/agent target domain (e.g. `'elements'`,
 *     `'network'`, `'performance'`, `'console'`), used to construct the
 *     `agent_type:devtools-<evalTarget>` tag.
 * @param taskId The task identifier, optionally suffixed with `__attempt_<N>`
 *     on multi-attempt runs.
 */
function buildTaskTags(evalTarget: string, taskId: string): string[] {
  // Extract the 1-based attempt number when a task is run multiple times with a
  // `<taskId>__attempt_<N>` suffix (per the Gleam Eval persistence contract),
  // defaulting to `'1'` for single-attempt runs so the dashboard's `Attempt`
  // filter chip is populated as `attempt:1`.
  const attemptMatch = /__attempt_(\d+)$/.exec(taskId);
  const attempt = attemptMatch ? attemptMatch[1] : '1';
  return [`attempt:${attempt}`, `agent_type:devtools-${evalTarget}`];
}

/**
 * Records a task failure to GCS (`eval_task_completed.json` + `.marker`) and in-memory `taskStatuses`.
 */
export function recordTaskFailure(options: RecordTaskFailureOptions): void {
  const {
    taskId,
    runId,
    target,
    phase,
    durationSeconds,
    taskStatuses,
    toolCallStats,
  } = options;
  uploadTaskCompleted({
    taskId,
    runId,
    status: 'FAILED',
    // Failed tasks receive null as they encountered an error or timeout prior to completing or grading.
    score: null,
    durationSeconds,
    tags: buildTaskTags(target, taskId),
    tokens: {},
    metrics: {
      taskStatus: 'FAILED',
      verificationDurationSeconds: 0,
      verificationStatus: phase === 'Finalization' ? 'FAILED' : 'UNSPECIFIED',
      gradingDurationSeconds: 0,
      gradingStatus: 'UNSPECIFIED',
      toolCallCount: toolCallStats.total,
      toolCallsByTool: toolCallStats.byTool,
      failedToolCallsByTool: toolCallStats.failedByTool,
      activationsBySkill: toolCallStats.activationsBySkill,
    },
  });
  taskStatuses.push({taskId, status: 'FAILED', score: null});
}

/**
 * Handles a task failure during preparation or execution.
 * Logs the failure and immediately uploads diagnostic logs
 * (`agent_logs/agent.log`, `agent_logs/agent_stderr.log`, and `verification/*`) before sealing `eval_task_completed.marker`.
 */
export function handleTaskFailure(options: HandleTaskFailureOptions): void {
  const {
    runId,
    taskId,
    target,
    phase,
    durationSeconds,
    logger,
    taskStatuses,
    errorMessage,
    toolCallStats,
  } = options;
  logger.append(`[Task ${taskId}] ${phase} failed (${durationSeconds}s)`);
  uploadTaskContent(runId, taskId, TaskOutputFile.AGENT_LOG, logger.getTaskLogContent(taskId));
  uploadTaskContent(runId, taskId, TaskOutputFile.AGENT_STDERR, logger.getTaskStderrContent(taskId));
  uploadTaskContent(runId, taskId, TaskOutputFile.VERIFICATION_STDOUT, formatVerificationStdout(taskId, target, true));
  uploadTaskContent(runId, taskId, TaskOutputFile.VERIFICATION_STDERR, formatVerificationStderr(errorMessage));
  recordTaskFailure({
    taskId,
    runId,
    target,
    phase,
    durationSeconds,
    taskStatuses,
    toolCallStats,
  });
}

/**
 * Uploads every per-task artifact to GCS. Returns true only if all of them
 * were uploaded successfully.
 */
export function uploadTaskArtifacts(options: UploadTaskArtifactsOptions): boolean {
  const {
    runId,
    taskId,
    target,
    logger,
    trajectory,
    evalOutputPath,
    hasError = false,
    errorMessage,
  } = options;
  const trajectoryUploaded = uploadTaskFile(
      runId,
      taskId,
      TaskOutputFile.TRAJECTORY,
      evalOutputPath,
  );
  const agentLogUploaded = uploadTaskContent(runId, taskId, TaskOutputFile.AGENT_LOG, logger.getTaskLogContent(taskId));
  const chatLogUploaded = uploadTaskContent(runId, taskId, TaskOutputFile.CHAT_LOG, formatChatLog(trajectory));
  const agentStderrUploaded =
      uploadTaskContent(runId, taskId, TaskOutputFile.AGENT_STDERR, logger.getTaskStderrContent(taskId));
  const verificationStdoutUploaded = uploadTaskContent(runId, taskId, TaskOutputFile.VERIFICATION_STDOUT,
                                                       formatVerificationStdout(taskId, target, hasError));
  const verificationStderrUploaded =
      uploadTaskContent(runId, taskId, TaskOutputFile.VERIFICATION_STDERR, formatVerificationStderr(errorMessage));

  return trajectoryUploaded && agentLogUploaded && chatLogUploaded && agentStderrUploaded &&
      verificationStdoutUploaded && verificationStderrUploaded;
}

/**
 * Derives the task score and status and reports the completion both to GCS and
 * to the in-memory run summary (`taskStatuses`).
 */
export function recordTaskCompletion(options: RecordTaskCompletionOptions): void {
  const {
    taskId,
    runId,
    target,
    durationSeconds,
    verificationDurationSeconds,
    gradingDurationSeconds,
    taskStatuses,
    allUploadsSucceeded,
    toolCallStats,
    hasError = false,
    customScore,
    gradingOutput,
  } = options;
  // Only report a numeric score if a custom/grader score was computed and execution/upload succeeded;
  // otherwise emit null so ungraded tasks or execution failures do not skew averages.
  const score = (!allUploadsSucceeded || hasError) ? null : (customScore ?? null);
  const status: TaskOutcomeStatus =
      (!allUploadsSucceeded || hasError || (score !== null && score < PASS_SCORE_THRESHOLD)) ? 'FAILED' : 'PASSED';
  const wasGraded = (customScore !== undefined && customScore !== null) || gradingOutput !== undefined;
  const gradingPassed = customScore === undefined || customScore === null || customScore >= PASS_SCORE_THRESHOLD;
  const gradingStatus: PhaseStatus = wasGraded ? (gradingPassed ? 'SUCCEEDED' : 'FAILED') : 'UNSPECIFIED';

  uploadTaskCompleted({
    taskId,
    runId,
    status,
    score,
    durationSeconds,
    tags: buildTaskTags(target, taskId),
    tokens: {},
    metrics: {
      taskStatus: 'SUCCEEDED',
      verificationDurationSeconds,
      verificationStatus: hasError ? 'FAILED' : 'SUCCEEDED',
      gradingDurationSeconds,
      gradingStatus,
      toolCallCount: toolCallStats.total,
      toolCallsByTool: toolCallStats.byTool,
      failedToolCallsByTool: toolCallStats.failedByTool,
      activationsBySkill: toolCallStats.activationsBySkill,
    },
  });
  taskStatuses.push({taskId, status, score});
}

/**
 * Exports the task trajectory to disk (`outputDir`), uploads all task artifacts,
 * and seals `eval_task_completed.marker`.
 * Returns the path of the exported `.eval.json` file.
 */
export function finalizeEvalTask(options: FinalizeTaskOptions): string {
  const {
    runId,
    taskId,
    label,
    target,
    trajectory,
    outputDir,
    durationSeconds,
    verificationDurationSeconds,
    gradingDurationSeconds,
    logger,
    taskStatuses,
    taskToolCallStats,
    hasError = false,
    errorMessage,
    customScore,
    gradingOutput,
  } = options;

  logger.append(`[Task ${taskId}] Finished execution (${durationSeconds}s)`);
  const evalOutputPath = exportEvalTrajectory(trajectory, label, outputDir);
  const toolCallStats = calculateTrajectoryToolCalls(trajectory);
  taskToolCallStats.set(taskId, toolCallStats);
  let allUploadsSucceeded = uploadTaskArtifacts({
    runId,
    taskId,
    target,
    logger,
    trajectory,
    evalOutputPath,
    hasError,
    errorMessage,
  });
  if (gradingOutput) {
    const evalResultJson = JSON.stringify({
      runId,
      target,
      gradingOutput,
    },
                                          null, 2);
    const evalResultUploaded = uploadTaskContent(runId, taskId, TaskOutputFile.EVAL_RESULT, evalResultJson);
    const graderLogUploaded = uploadTaskContent(runId, taskId, TaskOutputFile.GRADER_LOG, gradingOutput);
    allUploadsSucceeded = allUploadsSucceeded && evalResultUploaded && graderLogUploaded;
  }
  recordTaskCompletion({
    taskId,
    runId,
    target,
    durationSeconds,
    verificationDurationSeconds,
    gradingDurationSeconds,
    taskStatuses,
    allUploadsSucceeded,
    toolCallStats,
    hasError,
    customScore,
    gradingOutput,
  });

  return evalOutputPath;
}
