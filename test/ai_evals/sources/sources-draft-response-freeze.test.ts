// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {
  setupAndRunEvalApp,
  stopEvalApp,
} from '../helpers/ai_eval-helpers.js';
import {describe, it, setup} from '../mocha-interface.js';
import {LLMComparison} from '../report/evaluators.js';
import {loadInstructions} from '../report/instructions.js';

describe('Sources AI Eval: sources-draft-response-freeze', function() {
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
      label: 'sources-draft-response-freeze',
      taskId: 'sources-draft-response-freeze',
    },
  });

  it('launches app, navigates to initial URL, and executes prompt', async ({inspectedPage, evalTask}) => {
    // When the agent records a performance trace to diagnose the freeze, parsing the
    // Next.js bundle triggers three console.assert failures in ScopeParser.js. Each
    // expectError call is consumed on a single match, so register it three times.
    expectError(/ScopeParser\.js|formatter_worker\.js/);
    expectError(/ScopeParser\.js|formatter_worker\.js/);
    expectError(/ScopeParser\.js|formatter_worker\.js/);

    const app = await setupAndRunEvalApp('', 'sources-draft-response-freeze');
    try {
      assert.isDefined(app.config.initialUrl, 'Expected initial_url to be defined in task.textproto');

      await inspectedPage.page.goto(app.config.initialUrl, {waitUntil: 'networkidle0'});

      await evalTask.executePrompt({
        prompts: ['page freezes every time i click the draft response button, can you check what\'s hanging it?'],
      });

      evalTask.itEval({
        test:
            'is an accurate response to \'page freezes every time i click the draft response button, can you check what\'s hanging it?\'',
        judge: example => LLMComparison.judge(
            example,
            `${loadInstructions('sources.eval')}\n\n${loadInstructions('sources-draft-response-freeze')}`,
            ),
      });
    } finally {
      await stopEvalApp(app);
    }
  });
});
