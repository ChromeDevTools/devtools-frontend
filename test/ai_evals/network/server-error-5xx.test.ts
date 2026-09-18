// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as path from 'node:path';

import {SOURCE_ROOT} from '../../conductor/paths.js';
import {openNetworkTab} from '../../e2e/helpers/network-helpers.js';
import {findAndSetContext} from '../helpers/ai_eval-helpers.js';
import {type Step, TrajectoryBuilder} from '../report/trajectory-builder.js';

describe('Network AI Eval: server-error-5xx', function() {
  this.timeout(180_000);

  setup({
    dockingMode: 'undocked',
    devToolsSettings: {
      'ai-assistance-enabled': true,
      'ai-assistance-v2-opt-in-change-dialog-seen': true,
    },
  });

  it('sets network context to coffee-brew, executes prompt, and generates trajectory file',
     async ({devToolsPage, inspectedPage}) => {
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

       // Execute the prompt via handleExternalAIRequest.
       const prompt = 'Why is this request failing?';
       const steps = (await devToolsPage.evaluate(async (promptText, contextId) => {
                       const path = './panels/ai_assistance/ai_assistance.js';
                       const AiAssistance = await import(path);
                       return await AiAssistance.ExternalHandler.handleExternalAIRequest({
                         context: {
                           type: 'NETWORK_REQUEST',
                           contextIdentifier: contextId,
                         },
                         prompts: [promptText],
                       });
                     }, prompt, 'coffee-brew')) as Step[];

       assert.isNotNull(steps, 'Failed to retrieve AI execution steps.');
       assert.isNotEmpty(steps, 'Expected non-empty interaction steps from handleExternalAIRequest.');

       // Build the trajectory and save the output following autorun conventions.
       const exampleId = targetUrl.split('/').pop()?.replace('.html', '') ?? 'coffee-alchemy';
       const trajectoryBuilder = new TrajectoryBuilder({
         autoRunExampleId: exampleId,
       });
       trajectoryBuilder.addSteps(steps);

       const trajectory = trajectoryBuilder.build();
       const outputPath = path.join(
           SOURCE_ROOT,
           'scripts',
           'ai_assistance',
           'auto-run',
           'data',
           `server-error-5xx-${trajectory.metadata.session_id}.eval.json`,
       );
       trajectoryBuilder.writeToFile(outputPath);
     });
});
