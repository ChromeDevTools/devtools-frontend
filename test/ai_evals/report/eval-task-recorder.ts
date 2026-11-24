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
  buildTaskTags,
  formatVerificationStderr,
  formatVerificationStdout,
} from './report-helpers.js';
import {PASS_SCORE_THRESHOLD, type ScoreResult} from './scorer.js';
import {
  calculateTrajectoryTokens,
  calculateTrajectoryToolCalls,
  exportEvalTrajectory,
  formatChatLog,
  type ToolCallStats,
  type Trajectory,
  type TurnTokens,
} from './trajectory-builder.js';

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
  taskTokens: Map<string, TurnTokens>;
  hasError?: boolean;
  errorMessage?: string;
  customScore?: number|null;
  gradingOutput?: string;
  /** Grading V1 result. When set, it decides pass/fail instead of the score threshold alone. */
  grading?: ScoreResult;
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
  tokens?: TurnTokens;
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
  tokens?: TurnTokens;
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
  tokens: TurnTokens;
  hasError?: boolean;
  customScore?: number|null;
  gradingOutput?: string;
  /** Grading V1 result. When set, it decides pass/fail instead of the score threshold alone. */
  grading?: ScoreResult;
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
    tokens = {},
  } = options;
  uploadTaskCompleted({
    taskId,
    runId,
    status: 'FAILED',
    // Failed tasks receive null as they encountered an error or timeout prior to completing or grading.
    score: null,
    durationSeconds,
    tags: buildTaskTags(target, taskId),
    tokens,
    metrics: {
      taskStatus: 'FAILED',
      verificationDurationSeconds: 0,
      verificationStatus: phase === 'Finalization' ? 'FAILED' : 'UNSPECIFIED',
      gradingDurationSeconds: 0,
      gradingStatus: 'UNSPECIFIED',
      inputTokens: tokens.input,
      outputTokens: tokens.output,
      cachedTokens: tokens.cached,
      totalTokens: tokens.total,
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
    tokens,
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
    tokens,
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
    tokens,
    hasError = false,
    customScore,
    gradingOutput,
    grading,
  } = options;
  // Only report a numeric score if a custom/grader score was computed and execution/upload succeeded;
  // otherwise emit null so ungraded tasks or execution failures do not skew averages.
  const score = (!allUploadsSucceeded || hasError) ? null : (customScore ?? null);
  // With Grading V1, `pass` decides. A grading error fails the task, while its score stays null.
  const gradingV1Failed = grading !== undefined && (grading.pass === false || grading.gradingError !== undefined);
  const status: TaskOutcomeStatus =
      (!allUploadsSucceeded || hasError || gradingV1Failed || (score !== null && score < PASS_SCORE_THRESHOLD)) ?
      'FAILED' :
      'PASSED';
  let gradingStatus: PhaseStatus;
  if (grading) {
    gradingStatus = gradingV1Failed ? 'FAILED' : (grading.pass ? 'SUCCEEDED' : 'UNSPECIFIED');
  } else {
    const wasGraded = (customScore !== undefined && customScore !== null) || gradingOutput !== undefined;
    const gradingPassed = customScore === undefined || customScore === null || customScore >= PASS_SCORE_THRESHOLD;
    gradingStatus = wasGraded ? (gradingPassed ? 'SUCCEEDED' : 'FAILED') : 'UNSPECIFIED';
  }

  uploadTaskCompleted({
    taskId,
    runId,
    status,
    score,
    durationSeconds,
    tags: buildTaskTags(target, taskId),
    tokens,
    metrics: {
      taskStatus: 'SUCCEEDED',
      verificationDurationSeconds,
      verificationStatus: hasError ? 'FAILED' : 'SUCCEEDED',
      gradingDurationSeconds,
      gradingStatus,
      inputTokens: tokens.input,
      outputTokens: tokens.output,
      cachedTokens: tokens.cached,
      totalTokens: tokens.total,
      toolCallCount: toolCallStats.total,
      toolCallsByTool: toolCallStats.byTool,
      failedToolCallsByTool: toolCallStats.failedByTool,
      activationsBySkill: toolCallStats.activationsBySkill,
    },
  });
  taskStatuses.push({taskId, status, score});
}

export interface EvalResultOptions {
  runId: string;
  taskId: string;
  target: string;
  gradingOutput: string;
  grading?: ScoreResult;
}

/**
 * Builds the content of `eval_result.json`. For Grading V1 it holds the score, pass/fail,
 * the M/P/N summary and the check table (id, source, verdict, weight, reason).
 */
export function buildEvalResult(options: EvalResultOptions): object {
  const {runId, taskId, target, gradingOutput, grading} = options;
  if (!grading) {
    return {runId, taskId, target, gradingOutput};
  }
  return {
    runId,
    taskId,
    target,
    score: grading.score,
    pass: grading.pass,
    rawScore: grading.rawScore,
    summary: {
      maxPoints: grading.maxPoints,
      earnedPoints: grading.earnedPoints,
      penaltyPoints: grading.penaltyPoints,
      criticalFailures: grading.criticalFailures,
    },
    checks: grading.checks,
    gradingError: grading.gradingError ?? null,
    gradingOutput,
  };
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
    taskTokens,
    hasError = false,
    errorMessage,
    customScore,
    gradingOutput,
    grading,
  } = options;

  logger.append(`[Task ${taskId}] Finished execution (${durationSeconds}s)`);
  const toolCallStats = taskToolCallStats.get(taskId) ?? calculateTrajectoryToolCalls(trajectory);
  taskToolCallStats.set(taskId, toolCallStats);
  const tokens = taskTokens.get(taskId) ?? calculateTrajectoryTokens(trajectory);
  taskTokens.set(taskId, tokens);
  const evalOutputPath = exportEvalTrajectory(trajectory, label, outputDir);
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
    const evalResultJson = JSON.stringify(buildEvalResult({runId, taskId, target, gradingOutput, grading}), null, 2);
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
    tokens,
    hasError,
    customScore,
    gradingOutput,
    grading,
  });

  return evalOutputPath;
}
