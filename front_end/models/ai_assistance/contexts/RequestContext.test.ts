// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {SnapshotTester} from '../../../testing/SnapshotTester.js';
import * as NetworkTimeCalculator from '../../network_time_calculator/network_time_calculator.js';
import * as TextUtils from '../../text_utils/text_utils.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('RequestContext', function() {
  const snapshotTester = new SnapshotTester(this, import.meta);

  it('should return the origin of the documentURL', () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com`,
        urlString`https://www.example.com/path/to/page.html`, null, null, null);
    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const context = new AiAssistance.RequestContext.RequestContext(request, calculator);
    assert.strictEqual(context.getOrigin(), 'https://www.example.com');
  });

  it('should return the origin of the documentURL and strips the trailing slash', () => {
    const request = SDK.NetworkRequest.NetworkRequest.create('requestId' as Protocol.Network.RequestId,
                                                             urlString`https://www.example.com`,
                                                             urlString`https://www.example.com/`, null, null, null);
    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const context = new AiAssistance.RequestContext.RequestContext(request, calculator);
    assert.strictEqual(context.getOrigin(), 'https://www.example.com');
  });

  it('should return the virtual HAR origin if the request is imported from HAR', () => {
    const request = SDK.NetworkRequest.NetworkRequest.createWithoutBackendRequest(
        'requestId', urlString`https://www.example.com/path`, urlString`https://www.example.com/`, null);
    request.setIsImportedHar(true);
    const calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
    const context = new AiAssistance.RequestContext.RequestContext(request, calculator);
    assert.strictEqual(context.getOrigin(), 'imported-har://www.example.com');
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
});
