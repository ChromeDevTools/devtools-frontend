// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  BUCKET,
  formatGCSRunDestination,
  formatGCSTaskDestination,
  generateRunId,
  Markers,
  PROJECT_ID,
} from './gcs-upload.ts';

describe('gcs-upload', () => {
  it('generates a run ID matching the YYYY-MM-DD-HHmmss-xxxx-xxxxxxx pattern', () => {
    const runId = generateRunId();
    assert.match(runId, /^\d{4}-\d{2}-\d{2}-\d{6}-[0-9a-f]{4}-[0-9a-f]{7}$/);
  });

  it('formats task destination path correctly for trajectory.json', () => {
    const destination = formatGCSTaskDestination(
        '2026-08-25-134619-c0c1-8f25f69',
        'example-target-html',
        'trajectory.json',
    );
    assert.strictEqual(
        destination,
        `gs://${BUCKET}/${
            PROJECT_ID}/runs/2026-08-25-134619-c0c1-8f25f69/tasks/example-target-html/output/trajectory.json`,
    );
  });

  it('formats run-level destination paths correctly', () => {
    const runId = '2026-08-25-134619-c0c1-8f25f69';
    assert.strictEqual(
        formatGCSRunDestination(runId, 'run_started.json'),
        `gs://${BUCKET}/${PROJECT_ID}/runs/2026-08-25-134619-c0c1-8f25f69/run_started.json`,
    );
    assert.strictEqual(
        formatGCSRunDestination(runId, Markers.RUN_STARTED),
        `gs://${BUCKET}/${PROJECT_ID}/runs/2026-08-25-134619-c0c1-8f25f69/run_started.marker`,
    );
    assert.strictEqual(
        formatGCSRunDestination(runId, 'eval_run.log'),
        `gs://${BUCKET}/${PROJECT_ID}/runs/2026-08-25-134619-c0c1-8f25f69/eval_run.log`,
    );
    assert.strictEqual(
        formatGCSRunDestination(runId, 'run_completed.json'),
        `gs://${BUCKET}/${PROJECT_ID}/runs/2026-08-25-134619-c0c1-8f25f69/run_completed.json`,
    );
    assert.strictEqual(
        formatGCSRunDestination(runId, Markers.RUN_COMPLETED),
        `gs://${BUCKET}/${PROJECT_ID}/runs/2026-08-25-134619-c0c1-8f25f69/run_completed.marker`,
    );
  });

  it('formats task-level destination paths correctly', () => {
    const runId = '2026-08-25-134619-c0c1-8f25f69';
    const taskId = 'example-target-html';
    assert.strictEqual(
        formatGCSTaskDestination(runId, taskId, 'eval_task_completed.json'),
        `gs://${BUCKET}/${
            PROJECT_ID}/runs/2026-08-25-134619-c0c1-8f25f69/tasks/example-target-html/output/eval_task_completed.json`,
    );
    assert.strictEqual(
        formatGCSTaskDestination(runId, taskId, Markers.TASK_COMPLETED),
        `gs://${BUCKET}/${
            PROJECT_ID}/runs/2026-08-25-134619-c0c1-8f25f69/tasks/example-target-html/output/eval_task_completed.marker`,
    );
  });
});
