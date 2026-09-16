// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {execSync} from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/* eslint-disable no-console */

export const BUCKET = 'gleam-eval-cd4h-nonprod';
export const PROJECT_ID = 'ai_evals';

export const Markers = {
  RUN_STARTED: 'run_started.marker',
  TASK_COMPLETED: 'eval_task_completed.marker',
  RUN_COMPLETED: 'run_completed.marker',
} as const;
export type Markers = (typeof Markers)[keyof typeof Markers];
export type MarkerType = Markers;

export const TaskOutputFile = {
  TRAJECTORY: 'trajectory.json',
  EVAL_RESULT: 'eval_result.json',
  AGENT_LOG: 'agent_logs/agent.log',
  CHAT_LOG: 'agent_logs/chat_log.txt',
  AGENT_STDERR: 'agent_logs/agent_stderr.log',
  GRADER_LOG: 'grader_output/grader.log',
} as const;
export type TaskOutputFile = (typeof TaskOutputFile)[keyof typeof TaskOutputFile];

export interface RunStartedPayload {
  project: string;
  runId: string;
  model: string;
  agent: string;
  startTime: string;
  status: string;
}

export interface TaskCompletedPayload {
  taskId: string;
  runId: string;
  /** Execution status: 'PASSED' on success, 'FAILED' on error or timeout. */
  status: string;
  /** Task evaluation score from 0.0 (failure) to 1.0 (success). Defaults to 1.0 for completed tasks without inline assertions. */
  score: number;
  durationSeconds: number;
  tokens?: Record<string, unknown>;
}

export interface RunCompletedPayload {
  project: string;
  runId: string;
  status: string;
  startTime: string;
  endTime: string;
  totalTasks: number;
  passedTasks: number;
  failedTasks: number;
}

/** Record of a completed task's execution outcome and score. Each task corresponds to an evaluation trajectory. */
export interface TaskStatus {
  taskId: string;
  status: string;
  score: number;
}

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
 * Formats a run-level GCS destination URI (e.g., gs://bucket/ai_evals/runs/<runId>/<fileName>).
 */
export function formatGCSRunDestination(runId: string, destinationFileName: string): string {
  return `gs://${BUCKET}/${PROJECT_ID}/runs/${runId}/${destinationFileName}`;
}

/**
 * Formats a task-level GCS destination URI (e.g., gs://bucket/ai_evals/runs/<runId>/tasks/<taskId>/output/<fileName>).
 */
export function formatGCSTaskDestination(runId: string, taskId: string, destinationFileName: string): string {
  return `gs://${BUCKET}/${PROJECT_ID}/runs/${runId}/tasks/${taskId}/output/${destinationFileName}`;
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

/**
 * Uploads a local file to GCS using system gcloud CLI.
 */
function uploadFileToGCS(localFilePath: string, destination: string, contentType?: string): boolean {
  console.log(`[GCS] Preparing upload of ${localFilePath} to ${destination}`);

  try {
    const type = contentType ?? getContentType(destination);
    const command = `gcloud storage cp --content-type="${type}" "${localFilePath}" "${destination}"`;
    execSync(command, {
      stdio: 'inherit',
    });

    console.log('[GCS] ✅ Upload successful!');
    return true;
  } catch (error) {
    console.error(`[GCS] ❌ Failed to upload to ${destination}. Ensure you are logged in via 'gcloud auth login'.`);
    console.error(error);
    return false;
  }
}

/**
 * Uploads an existing local file to a task-level GCS destination
 * (e.g. tasks/<taskId>/output/<destinationFileName>).
 */
export function uploadTaskFile(
    runId: string,
    taskId: string,
    destinationFileName: TaskOutputFile|string,
    localFilePath: string,
    ): boolean {
  const destination = formatGCSTaskDestination(runId, taskId, destinationFileName);
  return uploadFileToGCS(localFilePath, destination);
}

/**
 * Stages string content into a temporary directory file, uploads it to GCS,
 * and guarantees immediate cleanup in a finally block.
 */
export function uploadTemporaryContentToGCS(content: string, destination: string, contentType?: string): boolean {
  const fileName = path.posix.basename(destination);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gcs-upload-'));
  const tempFilePath = path.join(tempDir, fileName);
  try {
    fs.writeFileSync(tempFilePath, content, 'utf8');
    return uploadFileToGCS(tempFilePath, destination, contentType);
  } finally {
    fs.rmSync(tempDir, {recursive: true, force: true});
  }
}

/**
 * Uploads a 0-byte marker file to GCS for run-level or task-level commit signals.
 * taskId is optional because run-level markers (e.g. RUN_STARTED, RUN_COMPLETED)
 * reside directly under the run root, whereas task-level markers require a taskId.
 */
export function uploadMarker(runId: string, marker: MarkerType, taskId?: string): boolean {
  const destination = taskId ? formatGCSTaskDestination(runId, taskId, marker) : formatGCSRunDestination(runId, marker);
  return uploadTemporaryContentToGCS('', destination);
}
