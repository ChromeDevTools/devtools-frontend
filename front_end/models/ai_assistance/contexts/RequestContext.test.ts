// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as TextUtils from '../../../core/text_utils/text_utils.js';
import type * as Protocol from '../../../generated/protocol.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {setupSettingsHooks} from '../../../testing/SettingsHelpers.js';
import {SnapshotTester} from '../../../testing/SnapshotTester.js';
import * as NetworkTimeCalculator from '../../network_time_calculator/network_time_calculator.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describe('RequestContext', function() {
  setupLocaleHooks();
  setupSettingsHooks();
  const snapshotTester = new SnapshotTester(this, import.meta);

  it('should return the origin of the documentURL', () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com`,
        urlString`https://www.example.com/path/to/page.html`, null, null, null);
    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const context = new AiAssistance.RequestContext.RequestContext(request, calculator);
    assert.isTrue(
        context.getOrigin().isSameOriginWith(SDK.SecurityOrigin.SecurityOrigin.create('https://www.example.com')));
  });

  it('should return the origin of the documentURL and strips the trailing slash', () => {
    const request = SDK.NetworkRequest.NetworkRequest.create('requestId' as Protocol.Network.RequestId,
                                                             urlString`https://www.example.com`,
                                                             urlString`https://www.example.com/`, null, null, null);
    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const context = new AiAssistance.RequestContext.RequestContext(request, calculator);
    assert.isTrue(
        context.getOrigin().isSameOriginWith(SDK.SecurityOrigin.SecurityOrigin.create('https://www.example.com')));
  });

  it('should return the virtual HAR origin if the request is imported from HAR', () => {
    const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'requestId', urlString`https://www.example.com/path`, urlString`https://www.example.com/`, null);
    request.setIsImportedHar(true);
    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const context = new AiAssistance.RequestContext.RequestContext(request, calculator);
    assert.isTrue(context.getOrigin().isSameOriginWith(
        SDK.SecurityOrigin.SecurityOrigin.create('imported-har://www.example.com')));
  });

  it('getPromptDetails describes the network request correctly', async function() {
    const request = SDK.NetworkRequest.NetworkRequest.create('requestId' as Protocol.Network.RequestId,
                                                             urlString`https://www.example.com/api/users`,
                                                             urlString`https://www.example.com/`, null, null, null);
    request.responseHeaders = [{name: 'Content-Type', value: 'application/json'}];
    request.setRequestHeaders([{name: 'Accept', value: 'application/json'}]);
    request.statusCode = 200;
    request.requestContentData = () => {
      return Promise.resolve(new TextUtils.ContentData.ContentData('{}', false, 'application/json', 'utf-8'));
    };

    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const context = new AiAssistance.RequestContext.RequestContext(request, calculator);
    const promptDetails = await context.getPromptDetails();

    assert.isNotNull(promptDetails);
    snapshotTester.assert(this, promptDetails!);
  });

  it('getUserFacingDetails returns details correctly', async function() {
    const request = SDK.NetworkRequest.NetworkRequest.create('requestId' as Protocol.Network.RequestId,
                                                             urlString`https://www.example.com/api/users`,
                                                             urlString`https://www.example.com/`, null, null, null);
    request.responseHeaders = [{name: 'Content-Type', value: 'application/json'}];
    request.setRequestHeaders([{name: 'Accept', value: 'application/json'}]);
    request.statusCode = 200;
    request.requestContentData = () => {
      return Promise.resolve(new TextUtils.ContentData.ContentData('{}', false, 'application/json', 'utf-8'));
    };

    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const context = new AiAssistance.RequestContext.RequestContext(request, calculator);
    const details = await context.getUserFacingDetails();

    assert.isNotNull(details);
    snapshotTester.assert(this, JSON.stringify(details, null, 2));
  });

  it('getPromptDetails redacts response body and non-safelisted headers for cross-origin requests', async function() {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        urlString`https://victim.com/sensitive-data`,
        urlString`https://attacker.com/index.html`,
        null,
        null,
        null,
    );
    request.responseHeaders = [
      {name: 'Content-Type', value: 'application/json'},
      {name: 'Location', value: '/secret-redirect'},
      {name: 'WWW-Authenticate', value: 'Bearer realm="secret"'},
    ];
    request.setRequestHeaders([{name: 'Accept', value: 'application/json'}]);
    request.statusCode = 200;
    request.requestContentData = () => {
      return Promise.resolve(
          new TextUtils.ContentData.ContentData('{"secret":"leak"}', false, 'application/json', 'utf-8'));
    };

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
       const request = SDK.NetworkRequest.NetworkRequest.create(
           'requestId' as Protocol.Network.RequestId,
           urlString`https://victim.com/sensitive-data`,
           urlString`https://attacker.com/index.html`,
           null,
           null,
           null,
       );
       request.responseHeaders = [
         {name: 'Content-Type', value: 'application/json'},
         {name: 'Location', value: '/secret-redirect'},
         {name: 'WWW-Authenticate', value: 'Bearer realm="secret"'},
       ];
       request.setRequestHeaders([{name: 'Accept', value: 'application/json'}]);
       request.statusCode = 200;
       request.requestContentData = () => {
         return Promise.resolve(
             new TextUtils.ContentData.ContentData('{"secret":"leak"}', false, 'application/json', 'utf-8'));
       };

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
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'harRequestId' as Protocol.Network.RequestId,
        urlString`https://example.com/api/users`,
        urlString`https://example.com/index.html`,
        null,
        null,
        null,
    );
    request.setIsImportedHar(true);
    request.statusCode = 200;
    request.responseHeaders = [{name: 'Content-Type', value: 'application/json'}];
    request.requestContentData = () => {
      return Promise.resolve(
          new TextUtils.ContentData.ContentData('{"har":"data"}', false, 'application/json', 'utf-8'));
    };

    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const context = new AiAssistance.RequestContext.RequestContext(request, calculator);
    const promptDetails = await context.getPromptDetails();

    assert.isNotNull(promptDetails);
    assert.include(promptDetails!, '{"har":"data"}');
    assert.notInclude(promptDetails!, SDK.NetworkRequestAccess.REDACTED_RESPONSE_BODY);
  });

  it('redacts response body for cross-origin requests in an imported HAR', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'harRequestId' as Protocol.Network.RequestId,
        urlString`https://third-party.com/api/data`,
        urlString`https://example.com/index.html`,
        null,
        null,
        null,
    );
    request.setIsImportedHar(true);
    request.statusCode = 200;
    request.responseHeaders = [{name: 'Content-Type', value: 'application/json'}];
    request.requestContentData = () => {
      return Promise.resolve(
          new TextUtils.ContentData.ContentData('{"secret":"leak"}', false, 'application/json', 'utf-8'));
    };

    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const context = new AiAssistance.RequestContext.RequestContext(request, calculator);
    const promptDetails = await context.getPromptDetails();

    assert.isNotNull(promptDetails);
    assert.include(promptDetails!, SDK.NetworkRequestAccess.REDACTED_RESPONSE_BODY);
    assert.notInclude(promptDetails!, '{"secret":"leak"}');
  });
});
