// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';

import * as Network from './network.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('RequestInitiatorView', () => {
  it('renders empty request initiator view correctly', async () => {
    const component = document.createElement('div');
    renderElementIntoDOM(component);

    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://example.com/foo.js`,
        urlString`https://example.com`, null, null, null);

    const initiatorGraph = {initiators: new Set<SDK.NetworkRequest.NetworkRequest>(), initiated: new Map()};

    const linkifier = new Components.Linkifier.Linkifier();

    Network.RequestInitiatorView.DEFAULT_VIEW(
        {
          initiatorGraph,
          hasStackTrace: false,
          request,
          linkifier,
        },
        undefined, component);

    await assertScreenshot('network/request-initiator-view-empty.png');
  });

  it('renders the initiator view with stack trace correctly', async () => {
    const component = document.createElement('div');
    renderElementIntoDOM(component);

    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://example.com/foo.js`,
        urlString`https://example.com`, null, null, {
          type: Protocol.Network.InitiatorType.Script,
          stack: {
            callFrames: [
              {
                functionName: 'foo',
                scriptId: 'scriptId' as Protocol.Runtime.ScriptId,
                url: 'https://example.com/foo.js',
                lineNumber: 10,
                columnNumber: 5,
              },
            ],
          },
        });

    const initiatorGraph = {initiators: new Set<SDK.NetworkRequest.NetworkRequest>(), initiated: new Map()};

    const linkifier = new Components.Linkifier.Linkifier();

    Network.RequestInitiatorView.DEFAULT_VIEW(
        {
          initiatorGraph,
          hasStackTrace: true,
          request,
          linkifier,
        },
        undefined, component);

    await assertScreenshot('network/request-initiator-view-stack.png');
  });

  it('renders the initiator view with initiator chain correctly', async () => {
    const component = document.createElement('div');
    renderElementIntoDOM(component);

    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://example.com/foo.js`,
        urlString`https://example.com`, null, null, null);

    const initiator = SDK.NetworkRequest.NetworkRequest.create(
        'initiatorId' as Protocol.Network.RequestId, urlString`https://example.com/initiator.js`,
        urlString`https://example.com`, null, null, null);

    const initiatorGraph = {initiators: new Set([initiator, request]), initiated: new Map()};

    const linkifier = new Components.Linkifier.Linkifier();

    Network.RequestInitiatorView.DEFAULT_VIEW(
        {
          initiatorGraph,
          hasStackTrace: false,
          request,
          linkifier,
        },
        undefined, component);

    await assertScreenshot('network/request-initiator-view-chain.png');
  });

  it('renders the initiator view with both stack trace and initiator chain correctly', async () => {
    const component = document.createElement('div');
    renderElementIntoDOM(component);

    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://example.com/foo.js`,
        urlString`https://example.com`, null, null, {
          type: Protocol.Network.InitiatorType.Script,
          stack: {
            callFrames: [
              {
                functionName: 'foo',
                scriptId: 'scriptId' as Protocol.Runtime.ScriptId,
                url: 'https://example.com/foo.js',
                lineNumber: 10,
                columnNumber: 5,
              },
            ],
          },
        });

    const initiator = SDK.NetworkRequest.NetworkRequest.create(
        'initiatorId' as Protocol.Network.RequestId, urlString`https://example.com/initiator.js`,
        urlString`https://example.com`, null, null, null);

    const initiatorGraph = {initiators: new Set([initiator, request]), initiated: new Map()};

    const linkifier = new Components.Linkifier.Linkifier();

    Network.RequestInitiatorView.DEFAULT_VIEW(
        {
          initiatorGraph,
          hasStackTrace: true,
          request,
          linkifier,
        },
        undefined, component);

    await assertScreenshot('network/request-initiator-view-chain-and-stack.png');
  });
});
