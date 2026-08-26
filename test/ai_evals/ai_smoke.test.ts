// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as SDK from '../../front_end/core/sdk/sdk.js';
import type * as AiAssistanceModule from '../../front_end/panels/ai_assistance/ai_assistance.js';
import {navigateToNetworkTab} from '../e2e/helpers/network-helpers.js';

import {findAndSetContext} from './helpers/ai_eval-helpers.js';

describe('DevTools AI Smoke Test', () => {
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
