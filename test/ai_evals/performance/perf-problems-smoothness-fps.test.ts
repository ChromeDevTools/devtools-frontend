// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  setupAndRunEvalApp,
  stopEvalApp,
} from '../helpers/ai_eval-helpers.js';
import {describe, it, setup} from '../mocha-interface.js';

describe('Performance AI Eval: perf-problems-smoothness-fps', function() {
  this.timeout(180_000);

  setup({
    dockingMode: 'undocked',
    enabledFeatures: ['DevToolsAiV2Architecture'],
    devToolsSettings: {
      'ai-assistance-enabled': true,
      'ai-assistance-v2-opt-in-change-dialog-seen': true,
    },
    evalConfig: {
      type: 'performance',
      label: 'perf-problems-smoothness-fps',
      taskId: 'perf-problems-smoothness-fps',
    },
  });

  it('launches app, navigates to initial URL, and executes prompt', async ({inspectedPage, evalTask}) => {
    const app = await setupAndRunEvalApp('', 'perf-problems-smoothness-fps');
    try {
      assert.isDefined(app.config.initialUrl, 'Expected initial_url to be defined in task.textproto');

      // The smoothness-fps route runs an unthrottled heavy requestAnimationFrame loop on
      // mount, saturating the main thread so Blink's IdlenessDetector never accumulates
      // 500ms of main-thread idle time to emit `networkIdle` (`networkidle0`).
      await inspectedPage.page.goto(app.config.initialUrl, {waitUntil: 'load'});

      await evalTask.executePrompt({
        prompts: ['What performance problems exist on my page?'],
      });
    } finally {
      await stopEvalApp(app);
    }
  });
});
