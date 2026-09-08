// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {execSync} from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export const BUCKET = 'gleam-eval-cd4h-nonprod';
export const PROJECT_ID = 'ai_evals';

export const Markers = {
  RUN_STARTED: 'run_started.marker',
  TASK_COMPLETED: 'eval_task_completed.marker',
  RUN_COMPLETED: 'run_completed.marker',
} as const;
export type Markers = (typeof Markers)[keyof typeof Markers];

export interface UploadOptions {
  runId: string;
  taskId: string;
  localJsonPath: string;
  destinationFileName: string;
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
 * Uploads a local file to GCS using system gcloud CLI.
 */
export function uploadFileToGCS(localFilePath: string, destination: string): boolean {
  console.log(`[GCS] Preparing upload of ${localFilePath} to ${destination}`);

  try {
    const command = `gcloud storage cp "${localFilePath}" "${destination}"`;
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
 * Uploads a local JSON file to GCS using system gcloud CLI.
 */
export function uploadEvalToGCS(options: UploadOptions): boolean {
  const destination = formatGCSTaskDestination(options.runId, options.taskId, options.destinationFileName);
  return uploadFileToGCS(options.localJsonPath, destination);
}

/**
 * Uploads a 0-byte marker file to GCS by creating a temporary empty regular file.
 */
function uploadMarkerToGCS(destination: string): boolean {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marker-'));
  const tempFilePath = path.join(tempDir, 'empty.marker');
  try {
    fs.writeFileSync(tempFilePath, '');
    return uploadFileToGCS(tempFilePath, destination);
  } finally {
    fs.rmSync(tempDir, {recursive: true, force: true});
  }
}

export interface RunStartedPayload {
  project: string;
  runId: string;
  model: string;
  agent: string;
  startTime: string;
  status: string;
}

/**
 * Phase 1: Uploads <run_id>/run_started.marker (0-byte file)
 * Must be called immediately after run_started.json is uploaded.
 */
export function uploadRunStartedMarker(runId: string): boolean {
  return uploadMarkerToGCS(formatGCSRunDestination(runId, Markers.RUN_STARTED));
}

/**
 * Phase 1: Emits run_started.json and immediately uploads run_started.marker.
 */
export function uploadRunStarted(payload: RunStartedPayload): boolean {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-started-'));
  const runStartedPath = path.join(tempDir, 'run_started.json');
  try {
    const jsonContent = {
      project: payload.project,
      run_id: payload.runId,
      model: payload.model,
      agent: payload.agent,
      start_time: payload.startTime,
      status: payload.status,
    };
    fs.writeFileSync(runStartedPath, JSON.stringify(jsonContent, null, 2), 'utf8');

    const jsonUploaded = uploadFileToGCS(runStartedPath, formatGCSRunDestination(payload.runId, 'run_started.json'));
    if (jsonUploaded) {
      return uploadRunStartedMarker(payload.runId);
    }
    return false;
  } finally {
    fs.rmSync(tempDir, {recursive: true, force: true});
  }
}

/**
 * Phase 2: Uploads tasks/<task_id>/output/eval_task_completed.marker (0-byte file)
 * Must be called immediately after all task artifacts and eval_task_completed.json are uploaded.
 */
export function uploadTaskCompletedMarker(runId: string, taskId: string): boolean {
  return uploadMarkerToGCS(formatGCSTaskDestination(runId, taskId, Markers.TASK_COMPLETED));
}

/**
 * Phase 3: Uploads <run_id>/run_completed.marker (0-byte file)
 * Must be called immediately after run_completed.json and eval_run.log are uploaded.
 */
export function uploadRunCompletedMarker(runId: string): boolean {
  return uploadMarkerToGCS(formatGCSRunDestination(runId, Markers.RUN_COMPLETED));
}
