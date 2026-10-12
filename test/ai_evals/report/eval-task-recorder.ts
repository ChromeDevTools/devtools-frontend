// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {EvalLogger} from './eval-logger.js';
import {
  TaskOutputFile,
  type TaskStatus,
  uploadTaskCompleted,
  uploadTaskContent,
  uploadTaskFile,
} from './gcs-upload.js';
import {
  exportEvalTrajectory,
  formatChatLog,
  type Trajectory,
} from './trajectory-builder.js';

export interface FinalizeTaskOptions {
  runId: string;
  taskId: string;
  label: string;
  trajectory: Trajectory;
  outputDir: string;
  durationSeconds: number;
  logger: EvalLogger;
  taskStatuses: TaskStatus[];
  hasError?: boolean;
  errorMessage?: string;
  customScore?: number;
}

export interface HandleTaskFailureOptions {
  runId: string;
  taskId: string;
  label?: string;
  phase: 'Preparation'|'Execution'|'Finalization';
  durationSeconds: number;
  logger: EvalLogger;
  taskStatuses: TaskStatus[];
  errorMessage?: string;
}

/**
 * Summarises the outcome of a task's verification step for the
 * verification_stdout.log artifact.
 */
export function formatVerificationStdout(taskId: string, label: string, hasError: boolean): string {
  return [
    `[Verification] Task: ${taskId}`,
    `[Verification] Target: ${label}`,
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
 * Records a task failure to GCS (`eval_task_completed.json` + `.marker`) and in-memory `taskStatuses`.
 */
export function recordTaskFailure(
    taskId: string,
    runId: string,
    durationSeconds: number,
    taskStatuses: TaskStatus[],
    ): void {
  uploadTaskCompleted({
    taskId,
    runId,
    status: 'FAILED',
    // Failed tasks receive 0.0 as they encountered an error or timeout prior to completing.
    score: 0.0,
    durationSeconds,
    tokens: {},
  });
  taskStatuses.push({taskId, status: 'FAILED', score: 0.0});
}

/**
 * Handles a task failure during preparation or execution.
 * Logs the failure and immediately uploads diagnostic logs
 * (`agent_logs/agent.log`, `agent_logs/agent_stderr.log`, and `verification/*`) before sealing `eval_task_completed.marker`.
 */
export function handleTaskFailure(options: HandleTaskFailureOptions): void {
  const {runId, taskId, label = taskId, phase, durationSeconds, logger, taskStatuses, errorMessage} = options;
  logger.append(`[Task ${taskId}] ${phase} failed (${durationSeconds}s)`);
  uploadTaskContent(runId, taskId, TaskOutputFile.AGENT_LOG, logger.getTaskLogContent(taskId));
  uploadTaskContent(runId, taskId, TaskOutputFile.AGENT_STDERR, logger.getTaskStderrContent(taskId));
  uploadTaskContent(runId, taskId, TaskOutputFile.VERIFICATION_STDOUT, formatVerificationStdout(taskId, label, true));
  uploadTaskContent(runId, taskId, TaskOutputFile.VERIFICATION_STDERR, formatVerificationStderr(errorMessage));
  recordTaskFailure(taskId, runId, durationSeconds, taskStatuses);
}

/**
 * Uploads every per-task artifact to GCS. Returns true only if all of them
 * were uploaded successfully.
 */
export function uploadTaskArtifacts(
    runId: string,
    taskId: string,
    label: string,
    logger: EvalLogger,
    trajectory: Trajectory,
    evalOutputPath: string,
    hasError = false,
    errorMessage?: string,
    ): boolean {
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
                                                       formatVerificationStdout(taskId, label, hasError));
  const verificationStderrUploaded =
      uploadTaskContent(runId, taskId, TaskOutputFile.VERIFICATION_STDERR, formatVerificationStderr(errorMessage));

  return trajectoryUploaded && agentLogUploaded && chatLogUploaded && agentStderrUploaded &&
      verificationStdoutUploaded && verificationStderrUploaded;
}

/**
 * Derives the task score and status and reports the completion both to GCS and
 * to the in-memory run summary (`taskStatuses`).
 */
export function recordTaskCompletion(
    taskId: string,
    runId: string,
    durationSeconds: number,
    taskStatuses: TaskStatus[],
    allUploadsSucceeded: boolean,
    hasError = false,
    customScore?: number,
    ): void {
  const baseScore = customScore ?? (hasError ? 0.0 : 1.0);
  const score = allUploadsSucceeded ? baseScore : 0.0;
  // Status indicates execution outcome (PASSED if prompt turns completed and uploaded without error,
  // FAILED if upload failed, assertion failures occurred, or score is 0.0).
  const status = (!allUploadsSucceeded || hasError || score <= 0.0) ? 'FAILED' : 'PASSED';

  uploadTaskCompleted({
    taskId,
    runId,
    status,
    score,
    durationSeconds,
    tokens: {},
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
    trajectory,
    outputDir,
    durationSeconds,
    logger,
    taskStatuses,
    hasError = false,
    errorMessage,
    customScore,
  } = options;

  logger.append(`[Task ${taskId}] Finished execution (${durationSeconds}s)`);
  const evalOutputPath = exportEvalTrajectory(trajectory, label, outputDir);
  const allUploadsSucceeded =
      uploadTaskArtifacts(runId, taskId, label, logger, trajectory, evalOutputPath, hasError, errorMessage);
  recordTaskCompletion(taskId, runId, durationSeconds, taskStatuses, allUploadsSucceeded, hasError, customScore);

  return evalOutputPath;
}
