// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  setupAndRunEvalApp,
  stopEvalApp,
} from '../helpers/ai_eval-helpers.js';
import {describe, it, setup} from '../mocha-interface.js';
import {LLMComparison} from '../report/evaluators.js';
import {loadInstructions} from '../report/instructions.js';

describe('Sources AI Eval: sources-canvas-signature-locator', function() {
  this.timeout(180_000);

  setup({
    dockingMode: 'undocked',
    enabledFeatures: ['DevToolsAiV2Architecture'],
    devToolsSettings: {
      'ai-assistance-enabled': true,
      'ai-assistance-v2-opt-in-change-dialog-seen': true,
    },
    evalConfig: {
      type: 'sources',
      label: 'sources-canvas-signature-locator',
      taskId: 'sources-canvas-signature-locator',
    },
  });

  it('launches app, navigates to initial URL, and executes prompt', async ({inspectedPage, evalTask}) => {
    const app = await setupAndRunEvalApp('', 'sources-canvas-signature-locator');
    try {
      assert.isDefined(app.config.initialUrl, 'Expected initial_url to be defined in task.textproto');

      await inspectedPage.page.goto(app.config.initialUrl, {waitUntil: 'networkidle0'});

      await evalTask.executePrompt({
        prompts: ['How is the canvas with the user signature implemented?'],
      });

      evalTask.itEval({
        test: 'is an accurate response to \'How is the canvas with the user signature implemented?\'',
        judge: example => LLMComparison.judge(
            example,
            `${loadInstructions('sources.eval')}\n\n${loadInstructions('sources-canvas-signature-locator')}`,
            ),
      });
    } finally {
      await stopEvalApp(app);
    }
  });
});
