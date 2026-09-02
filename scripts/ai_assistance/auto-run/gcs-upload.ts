// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {execSync} from 'node:child_process';
import crypto from 'node:crypto';

export const BUCKET = 'gleam-eval-cd4h-nonprod';
export const PROJECT_ID = 'ai_evals';

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

export function formatGCSDestination(
    options: Pick<UploadOptions, 'runId'|'taskId'>,
    destinationFileName: string,
    ): string {
  const gcsPath = `${PROJECT_ID}/runs/${options.runId}/tasks/${options.taskId}/output/${destinationFileName}`;
  return `gs://${BUCKET}/${gcsPath}`;
}

/**
 * Uploads a local JSON file to GCS using system gcloud CLI.
 */
export function uploadEvalToGCS(options: UploadOptions): boolean {
  const destination = formatGCSDestination(options, options.destinationFileName);

  console.log(`[GCS] Preparing upload of ${options.localJsonPath} to ${destination}`);

  try {
    const command = `gcloud storage cp "${options.localJsonPath}" "${destination}"`;
    execSync(command, {
      stdio: 'inherit',
    });

    console.log('[GCS] ✅ Upload successful!');
    return true;
  } catch (error) {
    console.error('[GCS] ❌ Failed to upload to GCS. Ensure you are logged in via \'gcloud auth login\'.');
    console.error(error);
    return false;
  }
}
