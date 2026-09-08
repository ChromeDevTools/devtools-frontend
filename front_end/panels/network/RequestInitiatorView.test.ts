// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {createNetworkRequest} from '../../testing/NetworkRequestHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {StubStackTrace} from '../../testing/StackTraceHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Network from './network.js';

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
    renderElementIntoDOM(component, {includeCommonStyles: true});

    const request = createNetworkRequest({
      url: 'https://example.com/foo.js',
      documentURL: 'https://example.com',
    });

    const initiatorGraph = {initiators: new Set<SDK.NetworkRequest.NetworkRequest>(), initiated: new Map()};

    Network.RequestInitiatorView.DEFAULT_VIEW({
      initiatorGraph,
      stackTrace: null,
      request,
      isConsoleOriginated: false,
    },
                                              undefined, component);

    await assertScreenshot('network/request-initiator-view-empty.png');
  });

  it('renders the initiator view with stack trace correctly', async () => {
    const component = document.createElement('div');
    renderElementIntoDOM(component, {includeCommonStyles: true});

    const request = createNetworkRequest({
      url: 'https://example.com/foo.js',
      documentURL: 'https://example.com',
      initiator: {
        type: Protocol.Network.InitiatorType.Script,
      },
    });

    const initiatorGraph = {initiators: new Set<SDK.NetworkRequest.NetworkRequest>(), initiated: new Map()};

    Network.RequestInitiatorView.DEFAULT_VIEW({
      initiatorGraph,
      stackTrace: StubStackTrace.create(['https://example.com/foo.js:foo:10:5']),
      request,
      isConsoleOriginated: false,
    },
                                              undefined, component);

    await Promise.resolve();  // Trigger MutationObserver (which requests widget updates).
    await UI.Widget.Widget.allUpdatesComplete;

    await assertScreenshot('network/request-initiator-view-stack.png');
  });

  it('renders the initiator view with initiator chain correctly', async () => {
    const component = document.createElement('div');
    renderElementIntoDOM(component, {includeCommonStyles: true});

    const request = createNetworkRequest({
      url: 'https://example.com/foo.js',
      documentURL: 'https://example.com',
    });

    const initiator = createNetworkRequest({
      requestId: 'initiatorId',
      url: 'https://example.com/initiator.js',
      documentURL: 'https://example.com',
    });

    const initiatorGraph = {initiators: new Set([initiator, request]), initiated: new Map()};

    Network.RequestInitiatorView.DEFAULT_VIEW({
      initiatorGraph,
      stackTrace: null,
      request,
      isConsoleOriginated: false,
    },
                                              undefined, component);

    await assertScreenshot('network/request-initiator-view-chain.png');
  });

  it('renders the initiator view with both stack trace and initiator chain correctly', async () => {
    const component = document.createElement('div');
    renderElementIntoDOM(component, {includeCommonStyles: true});

    const request = createNetworkRequest({
      url: 'https://example.com/foo.js',
      documentURL: 'https://example.com',
      initiator: {
        type: Protocol.Network.InitiatorType.Script,
      },
    });

    const initiator = createNetworkRequest({
      requestId: 'initiatorId',
      url: 'https://example.com/initiator.js',
      documentURL: 'https://example.com',
    });

    const initiatorGraph = {initiators: new Set([initiator, request]), initiated: new Map()};

    Network.RequestInitiatorView.DEFAULT_VIEW({
      initiatorGraph,
      stackTrace: StubStackTrace.create(['https://example.com/foo.js:foo:10:5']),
      request,
      isConsoleOriginated: false,
    },
                                              undefined, component);

    await Promise.resolve();  // Trigger MutationObserver (which requests widget updates).
    await UI.Widget.Widget.allUpdatesComplete;

    await assertScreenshot('network/request-initiator-view-chain-and-stack.png');
  });

  it('renders Console as root of initiator chain when request is from console', async () => {
    const component = document.createElement('div');
    renderElementIntoDOM(component, {includeCommonStyles: true});

    const request = createNetworkRequest({
      url: 'https://example.com/api',
      documentURL: 'https://example.com',
      initiator: {
        type: Protocol.Network.InitiatorType.Script,
      },
    });

    const initiatorGraph = {initiators: new Set([request]), initiated: new Map()};

    Network.RequestInitiatorView.DEFAULT_VIEW({
      initiatorGraph,
      stackTrace: StubStackTrace.create(['https://example.com/api::0:0']),
      request,
      isConsoleOriginated: true,
    },
                                              undefined, component);

    await Promise.resolve();
    await UI.Widget.Widget.allUpdatesComplete;

    const tree = component.querySelector('devtools-tree') as HTMLElement;
    const shadowRoot = tree.shadowRoot!;
    const treeItems = shadowRoot.querySelectorAll('[role="treeitem"]');
    const consoleNode = Array.from(treeItems).find(el => el.textContent?.includes('Console'));
    assert.exists(consoleNode);
  });

  it('does not render Console node in chain for non-console requests', async () => {
    const component = document.createElement('div');
    renderElementIntoDOM(component, {includeCommonStyles: true});

    const request = createNetworkRequest({
      url: 'https://example.com/foo.js',
      documentURL: 'https://example.com',
      initiator: {
        type: Protocol.Network.InitiatorType.Script,
      },
    });

    const initiatorGraph = {initiators: new Set([request]), initiated: new Map()};

    Network.RequestInitiatorView.DEFAULT_VIEW({
      initiatorGraph,
      stackTrace: StubStackTrace.create(['https://example.com/foo.js:foo:10:5']),
      request,
      isConsoleOriginated: false,
    },
                                              undefined, component);

    await Promise.resolve();
    await UI.Widget.Widget.allUpdatesComplete;

    const tree = component.querySelector('devtools-tree') as HTMLElement;
    const shadowRoot = tree.shadowRoot!;
    const treeItems = shadowRoot.querySelectorAll('[role="treeitem"]');
    const consoleNode = Array.from(treeItems).find(el => el.textContent?.includes('Console'));
    assert.notExists(consoleNode);
  });

  it('truncates very long URLs in the initiator chain', async () => {
    const component = document.createElement('div');
    renderElementIntoDOM(component, {includeCommonStyles: true});

    const longUrl = 'https://example.com/' +
        'a'.repeat(150) + '/path.js';
    const request = createNetworkRequest({
      url: longUrl,
      documentURL: 'https://example.com',
    });

    const initiator = createNetworkRequest({
      requestId: 'initiatorId',
      url: 'https://example.com/initiator.js',
      documentURL: 'https://example.com',
    });

    const initiatorGraph = {initiators: new Set([initiator, request]), initiated: new Map()};

    Network.RequestInitiatorView.DEFAULT_VIEW({
      initiatorGraph,
      stackTrace: null,
      request,
      isConsoleOriginated: false,
    },
                                              undefined, component);

    // devtools-tree uses a MutationObserver to asynchronously copy elements from the light DOM template to the shadow DOM.
    // We yield back to the event loop so the mutation observer can run and populate the shadow root.
    await new Promise(resolve => setTimeout(resolve, 0));

    const devtoolsTree = component.querySelector('devtools-tree');
    assert.isOk(devtoolsTree);
    const shadowRoot = devtoolsTree.shadowRoot;
    assert.isOk(shadowRoot);

    const spans = shadowRoot.querySelectorAll('span');
    const urlSpan = Array.from(spans).find(span => span.title === longUrl);
    assert.isOk(urlSpan);
    const textContent = urlSpan.textContent;
    assert.isOk(textContent);
    assert.isTrue(textContent.includes('…'));
    assert.isTrue(textContent.length < longUrl.length);
  });
});
