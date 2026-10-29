// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {openNetworkTab} from '../../e2e/helpers/network-helpers.js';
import {
  setupAndRunEvalApp,
  stopEvalApp,
} from '../helpers/ai_eval-helpers.js';
import {describe, it, setup} from '../mocha-interface.js';

describe('Network AI Eval: network-400-invalid-parameter', function() {
  this.timeout(180_000);

  setup({
    dockingMode: 'undocked',
    enabledFeatures: ['DevToolsAiV2Architecture'],
    devToolsSettings: {
      'ai-assistance-enabled': true,
      'ai-assistance-v2-opt-in-change-dialog-seen': true,
    },
    evalConfig: {
      type: 'network',
      label: 'network-400-invalid-parameter',
      taskId: 'network-400-invalid-parameter',
    },
  });

  it('launches app, navigates to initial URL, and executes prompt', async ({devToolsPage, inspectedPage, evalTask}) => {
    const app = await setupAndRunEvalApp('', 'network-400-invalid-parameter');
    try {
      assert.isDefined(app.config.initialUrl, 'Expected initial_url to be defined in task.textproto');

      await openNetworkTab(devToolsPage);
      await inspectedPage.page.goto(app.config.initialUrl, {waitUntil: 'networkidle0'});

      await evalTask.executePrompt({
        prompts: ['Why is the request failing?'],
      });
    } finally {
      await stopEvalApp(app);
    }
  });
});
