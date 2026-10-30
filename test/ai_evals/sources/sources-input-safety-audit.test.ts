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

describe('Sources AI Eval: sources-input-safety-audit', function() {
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
      label: 'sources-input-safety-audit',
      taskId: 'sources-input-safety-audit',
    },
  });

  it('launches app, navigates to initial URL, and executes prompt', async ({inspectedPage, evalTask}) => {
    const app = await setupAndRunEvalApp('', 'sources-input-safety-audit');
    try {
      assert.isDefined(app.config.initialUrl, 'Expected initial_url to be defined in task.textproto');

      await inspectedPage.page.goto(app.config.initialUrl, {waitUntil: 'networkidle0'});

      await evalTask.executePrompt({
        prompts: ['Does the passenger notes script on my page handle user input safely?'],
      });

      evalTask.itEval({
        test: 'is an accurate response to \'Does the passenger notes script on my page handle user input safely?\'',
        judge: example => LLMComparison.judge(
            example,
            `${loadInstructions('sources.eval')}\n\n${loadInstructions('sources-input-safety-audit')}`,
            ),
      });
    } finally {
      await stopEvalApp(app);
    }
  });
});
