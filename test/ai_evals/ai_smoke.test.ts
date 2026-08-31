// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as SDK from '../../front_end/core/sdk/sdk.js';
import type * as AiAssistanceModule from '../../front_end/panels/ai_assistance/ai_assistance.js';
import {
  dismissOptInDialogIfPresent,
  getAiLogs,
  inspectNode,
  typeQuery,
} from '../e2e/helpers/ai-assistance-helpers.js';
import {navigateToNetworkTab} from '../e2e/helpers/network-helpers.js';

import {findAndSetContext} from './helpers/ai_eval-helpers.js';

describe('DevTools AI Smoke Test', () => {
  setup({
    dockingMode: 'undocked',
    devToolsSettings: {
      'ai-assistance-enabled': true,
      'ai-assistance-v2-opt-in-change-dialog-seen': true,
    },
  });

  it('should successfully ask AI about a selected element and get a real response',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/simple-styled-page.html');
       await devToolsPage.waitFor('button.global-ai-button');

       await inspectNode(devToolsPage, 'h1');

       await devToolsPage.click('button.global-ai-button');
       await dismissOptInDialogIfPresent(devToolsPage);

       await devToolsPage.setAiAssistanceStructuredLogEnabled();

       await typeQuery(devToolsPage, 'Why is this h1 element styled with color?');
       await devToolsPage.pressKey('Enter');

       const logs = await getAiLogs(devToolsPage);
       assert.isNotNull(logs, 'Failed to retrieve AI structured logs.');
       assert.isNotEmpty(logs, 'AI logs are empty.');
       assert.match(JSON.stringify(logs), /color|style|h1|red|f06/i, 'AI response did not explain the styling.');
     });

  it('finds and sets NETWORK_REQUEST context and verifies getMatchingFlavorContext',
     async ({devToolsPage, inspectedPage}) => {
       await navigateToNetworkTab(devToolsPage, inspectedPage, 'headers-and-payload.html');
       await findAndSetContext(devToolsPage, {
         type: 'NETWORK_REQUEST',
         contextIdentifier: 'headers-and-payload.html',
       });

       const matchingContextInfo = await devToolsPage.evaluate(async () => {
         const path = './panels/ai_assistance/ai_assistance.js';
         const AiAssistance: typeof AiAssistanceModule = await import(path);
         const resolvedContext = AiAssistance.ExternalHandler.getMatchingFlavorContext({
           type: 'NETWORK_REQUEST',
           contextIdentifier: 'headers-and-payload.html',
         });
         const item = resolvedContext?.getItem() as SDK.NetworkRequest.NetworkRequest | undefined;
         return {
           hasContext: Boolean(resolvedContext),
           requestName: item?.name(),
           requestUrl: item?.url(),
         };
       });

       assert.isTrue(matchingContextInfo.hasContext, 'Expected getMatchingFlavorContext to return a resolved context');
       assert.strictEqual(matchingContextInfo.requestName, 'headers-and-payload.html');
     });
});
