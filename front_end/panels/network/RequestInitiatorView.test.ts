// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {StubStackTrace} from '../../testing/StackTraceHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Network from './network.js';

const {urlString} = Platform.DevToolsPath;

describe('RequestInitiatorView', () => {
  setupLocaleHooks();
  setupSettingsHooks();

  beforeEach(() => {
    Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
  });

  afterEach(() => {
    Workspace.IgnoreListManager.IgnoreListManager.removeInstance();
  });

  it('renders empty request initiator view correctly', async () => {
    const component = document.createElement('div');
    renderElementIntoDOM(component);

    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`https://example.com/foo.js`,
        urlString`https://example.com`, null, null, null);

    const initiatorGraph = {initiators: new Set<SDK.NetworkRequest.NetworkRequest>(), initiated: new Map()};

    Network.RequestInitiatorView.DEFAULT_VIEW(
        {
          initiatorGraph,
          stackTrace: null,
          request,
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
        });

    const initiatorGraph = {initiators: new Set<SDK.NetworkRequest.NetworkRequest>(), initiated: new Map()};

    Network.RequestInitiatorView.DEFAULT_VIEW(
        {
          initiatorGraph,
          stackTrace: StubStackTrace.create(['https://example.com/foo.js:foo:10:5']),
          request,
        },
        undefined, component);

    await Promise.resolve();  // Trigger MutationObserver (which requests widget updates).
    await UI.Widget.Widget.allUpdatesComplete;

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

    Network.RequestInitiatorView.DEFAULT_VIEW(
        {
          initiatorGraph,
          stackTrace: null,
          request,
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
        });

    const initiator = SDK.NetworkRequest.NetworkRequest.create(
        'initiatorId' as Protocol.Network.RequestId, urlString`https://example.com/initiator.js`,
        urlString`https://example.com`, null, null, null);

    const initiatorGraph = {initiators: new Set([initiator, request]), initiated: new Map()};

    Network.RequestInitiatorView.DEFAULT_VIEW(
        {
          initiatorGraph,
          stackTrace: StubStackTrace.create(['https://example.com/foo.js:foo:10:5']),
          request,
        },
        undefined, component);

    await Promise.resolve();  // Trigger MutationObserver (which requests widget updates).
    await UI.Widget.Widget.allUpdatesComplete;

    await assertScreenshot('network/request-initiator-view-chain-and-stack.png');
  });
});
