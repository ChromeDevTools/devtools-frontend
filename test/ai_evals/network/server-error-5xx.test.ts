// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../ai-eval-state-provider.js';

import {openNetworkTab} from '../../e2e/helpers/network-helpers.js';
import {findAndSetContext} from '../helpers/ai_eval-helpers.js';

describe('Network AI Eval: server-error-5xx', function() {
  this.timeout(180_000);

  setup({
    dockingMode: 'undocked',
    devToolsSettings: {
      'ai-assistance-enabled': true,
      'ai-assistance-v2-opt-in-change-dialog-seen': true,
    },
    evalConfig: {
      label: 'server-error-5xx',
      taskId: 'coffee-alchemy',
    },
  });

  it('sets network context to coffee-brew and executes prompt', async ({devToolsPage, inspectedPage, evalTask}) => {
    // Open Network tab first so DevTools starts capturing network activity.
    await openNetworkTab(devToolsPage);

    // Open the page that triggers the coffee-brew request.
    const targetUrl = 'http://localhost:4321/devtools-times/articles/coffee-alchemy';
    await inspectedPage.page.goto(targetUrl, {waitUntil: 'networkidle0'});

    // Set the network context to coffee-brew.
    await findAndSetContext(devToolsPage, {
      type: 'NETWORK_REQUEST',
      contextIdentifier: 'coffee-brew',
    });

    // Execute the prompt via evalTask; trajectory export and GCS upload happen in harness teardown.
    await evalTask.executePrompt({
      context: {
        type: 'NETWORK_REQUEST',
        contextIdentifier: 'coffee-brew',
      },
      prompts: ['Why is this request failing?'],
    });
  });
});
