// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {BUCKET, formatGCSDestination, generateRunId, PROJECT_ID} from './gcs-upload.ts';

describe('gcs-upload', () => {
  it('generates a run ID matching the YYYY-MM-DD-HHmmss-xxxx-xxxxxxx pattern', () => {
    const runId = generateRunId();
    assert.match(runId, /^\d{4}-\d{2}-\d{2}-\d{6}-[0-9a-f]{4}-[0-9a-f]{7}$/);
  });

  it('formats destination path correctly for trajectory.json', () => {
    const destination = formatGCSDestination(
        {
          runId: '2026-08-25-134619-c0c1-8f25f69',
          taskId: 'example-target-html',
        },
        'trajectory.json',
    );
    assert.strictEqual(
        destination,
        `gs://${BUCKET}/${
            PROJECT_ID}/runs/2026-08-25-134619-c0c1-8f25f69/tasks/example-target-html/output/trajectory.json`,
    );
  });
});
