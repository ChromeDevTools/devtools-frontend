// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as SDK from '../../../core/sdk/sdk.js';
import * as TextUtils from '../../../core/text_utils/text_utils.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {createNetworkRequest} from '../../../testing/NetworkRequestHelpers.js';
import {setupSettingsHooks} from '../../../testing/SettingsHelpers.js';
import {SnapshotTester} from '../../../testing/SnapshotTester.js';
import * as NetworkTimeCalculator from '../../network_time_calculator/network_time_calculator.js';
import * as AiAssistance from '../ai_assistance.js';

describe('RequestContext', function() {
  setupLocaleHooks();
  setupSettingsHooks();
  const snapshotTester = new SnapshotTester(this, import.meta);

  it('should return the origin of the documentURL', () => {
    const request = createNetworkRequest({
      requestId: 'requestId',
      url: 'https://www.example.com',
      documentURL: 'https://www.example.com/path/to/page.html',
    });
    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const context = new AiAssistance.RequestContext.RequestContext(request, calculator);
    assert.isTrue(
        context.getOrigin().isSameOriginWith(SDK.SecurityOrigin.SecurityOrigin.create('https://www.example.com')));
  });

  it('should return the origin of the documentURL and strips the trailing slash', () => {
    const request = createNetworkRequest({
      requestId: 'requestId',
      url: 'https://www.example.com',
      documentURL: 'https://www.example.com/',
    });
    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const context = new AiAssistance.RequestContext.RequestContext(request, calculator);
    assert.isTrue(
        context.getOrigin().isSameOriginWith(SDK.SecurityOrigin.SecurityOrigin.create('https://www.example.com')));
  });

  it('should return the virtual HAR origin if the request is imported from HAR', () => {
    const request = createNetworkRequest({
      withoutBackend: true,
      requestId: 'requestId',
      url: 'https://www.example.com/path',
      documentURL: 'https://www.example.com/',
      isImportedHar: true,
    });
    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const context = new AiAssistance.RequestContext.RequestContext(request, calculator);
    assert.isTrue(context.getOrigin().isSameOriginWith(
        SDK.SecurityOrigin.SecurityOrigin.create('imported-har://www.example.com')));
  });

  it('getPromptDetails describes the network request correctly', async function() {
    const request = createNetworkRequest({
      requestId: 'requestId',
      url: 'https://www.example.com/api/users',
      documentURL: 'https://www.example.com/',
      responseHeaders: [{name: 'Content-Type', value: 'application/json'}],
      requestHeaders: [{name: 'Accept', value: 'application/json'}],
      statusCode: 200,
      contentData: () =>
          Promise.resolve(new TextUtils.ContentData.ContentData('{}', false, 'application/json', 'utf-8')),
    });

    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const context = new AiAssistance.RequestContext.RequestContext(request, calculator);
    const promptDetails = await context.getPromptDetails();

    assert.isNotNull(promptDetails);
    snapshotTester.assert(this, promptDetails!);
  });

  it('getUserFacingDetails returns details correctly', async function() {
    const request = createNetworkRequest({
      requestId: 'requestId',
      url: 'https://www.example.com/api/users',
      documentURL: 'https://www.example.com/',
      responseHeaders: [{name: 'Content-Type', value: 'application/json'}],
      requestHeaders: [{name: 'Accept', value: 'application/json'}],
      statusCode: 200,
      contentData: () =>
          Promise.resolve(new TextUtils.ContentData.ContentData('{}', false, 'application/json', 'utf-8')),
    });

    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const context = new AiAssistance.RequestContext.RequestContext(request, calculator);
    const details = await context.getUserFacingDetails();

    assert.isNotNull(details);
    snapshotTester.assert(this, JSON.stringify(details, null, 2));
  });

  it('getPromptDetails redacts response body and non-safelisted headers for cross-origin requests', async function() {
    const request = createNetworkRequest({
      requestId: 'requestId',
      url: 'https://victim.com/sensitive-data',
      documentURL: 'https://attacker.com/index.html',
      responseHeaders: [
        {name: 'Content-Type', value: 'application/json'},
        {name: 'Location', value: '/secret-redirect'},
        {name: 'WWW-Authenticate', value: 'Bearer realm="secret"'},
      ],
      requestHeaders: [{name: 'Accept', value: 'application/json'}],
      statusCode: 200,
      contentData: () => Promise.resolve(
          new TextUtils.ContentData.ContentData('{"secret":"leak"}', false, 'application/json', 'utf-8')),
    });

    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const context = new AiAssistance.RequestContext.RequestContext(request, calculator);
    const promptDetails = await context.getPromptDetails();

    assert.isNotNull(promptDetails);
    assert.include(promptDetails!, SDK.NetworkRequestAccess.REDACTED_RESPONSE_BODY);
    assert.notInclude(promptDetails!, '{"secret":"leak"}');
    assert.notInclude(promptDetails!, 'Location');
    assert.notInclude(promptDetails!, 'secret-redirect');
    assert.notInclude(promptDetails!, 'WWW-Authenticate');
  });

  it('getUserFacingDetails redacts response body and non-safelisted headers for cross-origin requests',
     async function() {
       const request = createNetworkRequest({
         requestId: 'requestId',
         url: 'https://victim.com/sensitive-data',
         documentURL: 'https://attacker.com/index.html',
         responseHeaders: [
           {name: 'Content-Type', value: 'application/json'},
           {name: 'Location', value: '/secret-redirect'},
           {name: 'WWW-Authenticate', value: 'Bearer realm="secret"'},
         ],
         requestHeaders: [{name: 'Accept', value: 'application/json'}],
         statusCode: 200,
         contentData: () => Promise.resolve(
             new TextUtils.ContentData.ContentData('{"secret":"leak"}', false, 'application/json', 'utf-8')),
       });

       const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
       const context = new AiAssistance.RequestContext.RequestContext(request, calculator);
       const details = await context.getUserFacingDetails();

       assert.isNotNull(details);
       const responseDetail = details!.find(d => d.title === 'Response');
       assert.isDefined(responseDetail);
       assert.include(responseDetail!.text, SDK.NetworkRequestAccess.REDACTED_RESPONSE_BODY);
       assert.notInclude(responseDetail!.text, '{"secret":"leak"}');
       assert.notInclude(responseDetail!.text, 'Location');
       assert.notInclude(responseDetail!.text, 'secret-redirect');
       assert.notInclude(responseDetail!.text, 'WWW-Authenticate');
     });

  it('preserves response body for same-origin requests in an imported HAR', async () => {
    const request = createNetworkRequest({
      requestId: 'harRequestId',
      url: 'https://example.com/api/users',
      documentURL: 'https://example.com/index.html',
      isImportedHar: true,
      statusCode: 200,
      responseHeaders: [{name: 'Content-Type', value: 'application/json'}],
      contentData: () =>
          Promise.resolve(new TextUtils.ContentData.ContentData('{"har":"data"}', false, 'application/json', 'utf-8')),
    });

    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const context = new AiAssistance.RequestContext.RequestContext(request, calculator);
    const promptDetails = await context.getPromptDetails();

    assert.isNotNull(promptDetails);
    assert.include(promptDetails!, '{"har":"data"}');
    assert.notInclude(promptDetails!, SDK.NetworkRequestAccess.REDACTED_RESPONSE_BODY);
  });

  it('redacts response body for cross-origin requests in an imported HAR', async () => {
    const request = createNetworkRequest({
      requestId: 'harRequestId',
      url: 'https://third-party.com/api/data',
      documentURL: 'https://example.com/index.html',
      isImportedHar: true,
      statusCode: 200,
      responseHeaders: [{name: 'Content-Type', value: 'application/json'}],
      contentData: () => Promise.resolve(
          new TextUtils.ContentData.ContentData('{"secret":"leak"}', false, 'application/json', 'utf-8')),
    });

    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const context = new AiAssistance.RequestContext.RequestContext(request, calculator);
    const promptDetails = await context.getPromptDetails();

    assert.isNotNull(promptDetails);
    assert.include(promptDetails!, SDK.NetworkRequestAccess.REDACTED_RESPONSE_BODY);
    assert.notInclude(promptDetails!, '{"secret":"leak"}');
  });
});
