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
  customScore?: number;
}

export interface HandleTaskFailureOptions {
  runId: string;
  taskId: string;
  phase: 'Preparation'|'Execution';
  durationSeconds: number;
  logger: EvalLogger;
  taskStatuses: TaskStatus[];
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
 * (`agent_logs/agent.log` and `agent_logs/agent_stderr.log`) before sealing `eval_task_completed.marker`.
 */
export function handleTaskFailure(options: HandleTaskFailureOptions): void {
  const {runId, taskId, phase, durationSeconds, logger, taskStatuses} = options;
  logger.append(`[Task ${taskId}] ${phase} failed (${durationSeconds}s)`);
  uploadTaskContent(runId, taskId, TaskOutputFile.AGENT_LOG, logger.getTaskLogContent(taskId));
  uploadTaskContent(runId, taskId, TaskOutputFile.AGENT_STDERR, logger.getTaskStderrContent(taskId));
  recordTaskFailure(taskId, runId, durationSeconds, taskStatuses);
}

/**
 * Uploads every per-task artifact to GCS. Returns true only if all of them
 * were uploaded successfully.
 */
export function uploadTaskArtifacts(
    runId: string,
    taskId: string,
    logger: EvalLogger,
    trajectory: Trajectory,
    evalOutputPath: string,
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

  return trajectoryUploaded && agentLogUploaded && chatLogUploaded && agentStderrUploaded;
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
    customScore,
  } = options;

  logger.append(`[Task ${taskId}] Finished execution (${durationSeconds}s)`);
  const evalOutputPath = exportEvalTrajectory(trajectory, label, outputDir);
  const allUploadsSucceeded = uploadTaskArtifacts(runId, taskId, logger, trajectory, evalOutputPath);
  recordTaskCompletion(taskId, runId, durationSeconds, taskStatuses, allUploadsSucceeded, hasError, customScore);

  return evalOutputPath;
}
