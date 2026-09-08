// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {setupAndRunEvalApp, stopEvalApp} from '../helpers/ai_eval-helpers.js';

describe('Network AI Eval: failing-request', function() {
  this.timeout(120_000);

  it('sets up and runs the app, verifies it started from console output, and terminates it', async () => {
    const app = await setupAndRunEvalApp('network', 'failing-request');
    try {
      assert.strictEqual(app.config.initialUrl, 'http://localhost:4321/devtools-times/articles/life-with-charlie');
      const output = await app.waitForOutput(/localhost:\d+/i);
      assert.match(output, /localhost:\d+/i, 'Expected console output to indicate the app has started on localhost');
    } finally {
      await stopEvalApp(app);
    }
  });
});
