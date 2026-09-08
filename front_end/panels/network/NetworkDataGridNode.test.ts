// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Logs from '../../models/logs/logs.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createNetworkRequest} from '../../testing/NetworkRequestHelpers.js';

import * as Network from './network.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('NetworkLogView', () => {
  it('adds marker to requests with overridden headers', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com',
      statusCode: 200,
      responseHeaders: [{name: 'foo', value: 'overridden'}],
      originalResponseHeaders: [{name: 'foo', value: 'original'}],
    });
    request.setWasIntercepted(true);

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.renderCell(el, 'name');
    const marker = el.querySelector('.network-override-marker');
    const tooltip = el.querySelector('[title="Request headers are overridden"]');
    assert.instanceOf(marker, HTMLDivElement);
    assert.isNotNull(tooltip);
  });

  it('adds marker to requests with overridden content', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com',
      statusCode: 200,
    });
    request.setWasIntercepted(true);
    request.hasOverriddenContent = true;

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.renderCell(el, 'name');
    const marker = el.querySelector('.network-override-marker');
    const tooltip = el.querySelector('[title="Request content is overridden"]');
    assert.instanceOf(marker, HTMLDivElement);
    assert.isNotNull(tooltip);
  });

  it('adds marker to requests with overridden headers and content', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com',
      statusCode: 200,
      responseHeaders: [{name: 'foo', value: 'overridden'}],
      originalResponseHeaders: [{name: 'foo', value: 'original'}],
    });
    request.setWasIntercepted(true);
    request.hasOverriddenContent = true;

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.renderCell(el, 'name');
    const marker = el.querySelector('.network-override-marker');
    const tooltip = el.querySelector('[title="Both request content and headers are overridden"]');
    assert.instanceOf(marker, HTMLDivElement);
    assert.isNotNull(tooltip);
  });

  it('does not add marker to unoverridden request', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com',
      statusCode: 200,
    });

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.renderCell(el, 'name');
    const marker = el.querySelector('.network-override-marker');
    assert.isNull(marker);
  });

  it('does not add a marker to requests which are intercepted but not overridden', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com',
      statusCode: 200,
    });
    request.setWasIntercepted(true);

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.renderCell(el, 'name');
    const marker = el.querySelector('.network-override-marker');
    assert.isNull(marker);
  });

  it('adds an error icon to the left of the failed requests', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com',
      statusCode: 404,
    });

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');

    networkRequestNode.renderCell(el, 'name');
    const iconElement = el.querySelector('.icon') as HTMLElement;
    const iconImage = iconElement.getAttribute('name');
    assert.strictEqual('cross-circle-filled', iconImage);
  });

  it('show document icon', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com/',
      resourceType: Common.ResourceType.resourceTypes.Document,
      mimeType: 'text/html',
    });

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');

    networkRequestNode.renderCell(el, 'name');
    const iconElement = el.querySelector('.icon') as HTMLElement;
    const iconImage = iconElement.getAttribute('name');
    assert.strictEqual('file-document', iconImage);

    // TODO(barrypollard): Would be good to test the value of --icon-file-document
    // is correctly set to --sys-color-blue-bright. See https://crbug.com/346714111
  });

  it('show media icon', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com/test.mp3',
      resourceType: Common.ResourceType.resourceTypes.Media,
      mimeType: 'audio/mpeg',
    });

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');

    networkRequestNode.renderCell(el, 'name');
    const iconElement = el.querySelector('.icon') as HTMLElement;
    const iconImage = iconElement.getAttribute('name');
    assert.strictEqual('file-media', iconImage);
  });

  it('show wasm icon', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com/test.wasm',
      resourceType: Common.ResourceType.resourceTypes.Wasm,
      mimeType: 'application/wasm',
    });

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');

    networkRequestNode.renderCell(el, 'name');
    const iconElement = el.querySelector('.icon') as HTMLElement;
    const iconImage = iconElement.getAttribute('name');
    assert.strictEqual('file-wasm', iconImage);
  });

  it('show websocket icon', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com/ws',
      resourceType: Common.ResourceType.resourceTypes.WebSocket,
      mimeType: '',
    });

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');

    networkRequestNode.renderCell(el, 'name');
    const iconElement = el.querySelector('.icon') as HTMLElement;
    const iconImage = iconElement.getAttribute('name');
    assert.strictEqual('file-websocket', iconImage);
  });

  it('shows fetch icon', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com/test.json?keepalive=false',
      resourceType: Common.ResourceType.resourceTypes.Fetch,
      mimeType: '',
    });

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');

    networkRequestNode.renderCell(el, 'name');
    const iconElement = el.querySelector('.icon') as HTMLElement;
    const iconImage = iconElement.getAttribute('name');
    assert.strictEqual('file-fetch-xhr', iconImage);
  });

  it('shows xhr icon', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com/test.json?keepalive=false',
      resourceType: Common.ResourceType.resourceTypes.XHR,
      mimeType: 'application/octet-stream',
    });

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');

    networkRequestNode.renderCell(el, 'name');
    const iconElement = el.querySelector('.icon') as HTMLElement;
    const iconImage = iconElement.getAttribute('name');
    assert.strictEqual('file-fetch-xhr', iconImage);
  });

  it('mime win: show image preview icon for xhr-image', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com/test.svg',
      resourceType: Common.ResourceType.resourceTypes.XHR,
      mimeType: 'image/svg+xml',
    });

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');

    networkRequestNode.renderCell(el, 'name');
    const iconElement = el.querySelector('.icon.image') as HTMLElement;
    const imagePreview = el.querySelector('.image-network-icon-preview') as HTMLImageElement;

    assert.instanceOf(iconElement, HTMLDivElement);
    assert.instanceOf(imagePreview, HTMLImageElement);
  });

  it('mime win: show document icon for fetch-html', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com/page',
      resourceType: Common.ResourceType.resourceTypes.Fetch,
      mimeType: 'text/html',
    });

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');

    networkRequestNode.renderCell(el, 'name');
    const iconElement = el.querySelector('.icon') as HTMLElement;
    const iconImage = iconElement.getAttribute('name');
    assert.strictEqual('file-document', iconImage);
  });

  it('mime win: show generic icon for preflight-text', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com/api/test',
      resourceType: Common.ResourceType.resourceTypes.Preflight,
      mimeType: 'text/plain',
    });

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');

    networkRequestNode.renderCell(el, 'name');
    const iconElement = el.querySelector('.icon') as HTMLElement;
    const iconImage = iconElement.getAttribute('name');
    assert.strictEqual('file-generic', iconImage);
  });

  it('mime win: show script icon for other-javascript)', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com/ping',
      resourceType: Common.ResourceType.resourceTypes.Other,
      mimeType: 'application/javascript',
    });

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');

    networkRequestNode.renderCell(el, 'name');
    const iconElement = el.querySelector('.icon') as HTMLElement;
    const iconImage = iconElement.getAttribute('name');
    assert.strictEqual('file-script', iconImage);
  });

  it('mime win: shows json icon for fetch-json', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com/api/list',
      resourceType: Common.ResourceType.resourceTypes.Fetch,
      mimeType: 'application/json',
    });

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');

    networkRequestNode.renderCell(el, 'name');
    const iconElement = el.querySelector('.icon') as HTMLElement;
    const iconImage = iconElement.getAttribute('name');
    assert.strictEqual('file-json', iconImage);
  });

  it('shows the corresponding status text of a status code', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com',
      statusCode: 305,
    });

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');

    networkRequestNode.renderCell(el, 'status');

    assert.strictEqual(el.title, '305 Use Proxy');
  });

  it('populate has-overrides: headers', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com',
      statusCode: 200,
      responseHeaders: [{name: 'foo', value: 'overridden'}],
      originalResponseHeaders: [{name: 'foo', value: 'original'}],
    });
    request.setWasIntercepted(true);

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.renderCell(el, 'has-overrides');
    const marker = el.innerText;
    assert.strictEqual(marker, 'headers');
  });

  it('populate has-overrides: content', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com',
      statusCode: 200,
    });
    request.setWasIntercepted(true);
    request.hasOverriddenContent = true;

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.renderCell(el, 'has-overrides');
    const marker = el.innerText;
    assert.strictEqual(marker, 'content');
  });

  it('populate has-overrides: content, headers', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com',
      statusCode: 200,
      responseHeaders: [{name: 'foo', value: 'overridden'}],
      originalResponseHeaders: [{name: 'foo', value: 'original'}],
    });
    request.setWasIntercepted(true);
    request.hasOverriddenContent = true;

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.renderCell(el, 'has-overrides');
    const marker = el.innerText;
    assert.strictEqual(marker, 'content, headers');
  });

  it('populate has-overrides: null', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com',
      statusCode: 200,
    });
    request.setWasIntercepted(false);

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.renderCell(el, 'has-overrides');
    const marker = el.innerText;
    assert.strictEqual(marker, '');
  });

  it('only counts non-blocked response cookies', async () => {
    const request = createNetworkRequest({url: 'https://www.example.com'});
    request.addExtraResponseInfo({
      responseHeaders:
          [{name: 'Set-Cookie', value: 'good=123; Path=/; Secure; SameSite=None\nbad=456; Path=/; SameSite=None'}],
      blockedResponseCookies: [{
        blockedReasons: [Protocol.Network.SetCookieBlockedReason.SameSiteNoneInsecure],
        cookie: null,
        cookieLine: 'bad=456; Path=/; SameSite=None',
      }],
      resourceIPAddressSpace: Protocol.Network.IPAddressSpace.Public,
      statusCode: undefined,
      cookiePartitionKey: undefined,
      cookiePartitionKeyOpaque: undefined,
      exemptedResponseCookies: undefined,
    });

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.renderCell(el, 'set-cookies');
    assert.strictEqual(el.innerText, '1');
  });

  it('shows the request number in request-number column', async () => {
    const request1 = createNetworkRequest({
      requestId: 'requestId-1',
      url: 'https://www.example.com/1',
    });
    const request2 = createNetworkRequest({
      requestId: 'requestId-2',
      url: 'https://www.example.com/2',
    });
    Logs.NetworkLog.NetworkLog.instance().importRequests([request1, request2]);

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request2);
    const el = document.createElement('div');
    networkRequestNode.renderCell(el, 'request-number');

    assert.strictEqual(el.innerText, '2');
  });

  it('shows early hints in initiator column when request is from early hints', async () => {
    const request = createNetworkRequest({url: 'https://www.example.com'});
    request.setFromEarlyHints();

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.renderCell(el, 'initiator');

    assert.strictEqual(el.innerText, 'Early-hints');
    const tooltip = el.getAttribute('title')!;
    assert.strictEqual(tooltip, 'Early-hints');
  });

  it('shows other in initiator column when request has no initiator and is not from early hints', async () => {
    const request = createNetworkRequest({url: 'https://www.example.com'});

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.renderCell(el, 'initiator');

    assert.strictEqual(el.innerText, 'Other');
    const tooltip = el.getAttribute('title')!;
    assert.strictEqual(tooltip, 'Other');
  });

  it('shows transferred size when the matched ServiceWorker router source is network', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com',
      statusCode: 200,
      serviceWorkerRouterInfo: {
        ruleIdMatched: 1,
        matchedSourceType: Protocol.Network.ServiceWorkerRouterSource.Network,
      },
    });
    request.resourceSize = 4;
    request.setTransferSize(2);

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.renderCell(el, 'size');
    assert.strictEqual(el.innerText, '(ServiceWorker router)0.0\xa0kB');
    const tooltip = el.getAttribute('title')!;
    const expected = 'Matched to ServiceWorker router#1, 0.0\xa0kB transferred over network, resource size: 0.0\xa0kB';
    assert.strictEqual(tooltip, expected);
  });

  it('shows ServiceWorker when the request matches no router rule but is fulfilled by the fetch handler', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com',
      statusCode: 200,
      fetchedViaServiceWorker: true,
      serviceWorkerRouterInfo: {} as Protocol.Network.ServiceWorkerRouterInfo,
    });
    request.resourceSize = 4;
    request.setTransferSize(2);

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.renderCell(el, 'size');
    assert.strictEqual(el.innerText, '(ServiceWorker)0.0\xa0kB');
    const tooltip = el.getAttribute('title')!;
    assert.strictEqual(tooltip, 'Served from ServiceWorker, resource size: 0.0\xa0kB');
  });

  it('shows transferred size when the request matches no router rule and falls back to network', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com',
      statusCode: 200,
      serviceWorkerRouterInfo: {} as Protocol.Network.ServiceWorkerRouterInfo,
    });
    request.resourceSize = 4;
    request.setTransferSize(2);

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.renderCell(el, 'size');
    assert.strictEqual(el.innerText, '0.0\xa0kB0.0\xa0kB');
    const tooltip = el.getAttribute('title')!;
    const expected = '0.0\xa0kB transferred over network, resource size: 0.0\xa0kB, no matching ServiceWorker routes';
    assert.strictEqual(tooltip, expected);
  });

  it('styles a prefetch network request error as a warning', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com',
      statusCode: 404,
      failed: true,
      resourceType: Common.ResourceType.resourceTypes.Prefetch,
    });

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.createCells(el);
    const cell = el.appendChild(document.createElement('div'));
    networkRequestNode.renderCell(cell, 'name');

    // The row should have the warning-row class name.
    assert.isTrue(el.classList.contains('network-warning-row'));
    assert.isFalse(el.classList.contains('network-error-row'));

    // The icon should be the warning icon.
    const iconElement = el.querySelector('.icon') as HTMLElement;
    const iconImage = iconElement.getAttribute('name');
    assert.strictEqual('warning-filled', iconImage);
  });

  it('styles a preloading network request error as a warning', async () => {
    const request = createNetworkRequest({
      url: 'https://www.example.com',
      statusCode: 404,
      failed: true,
      initiator: {type: Protocol.Network.InitiatorType.Preload},
    });

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.createCells(el);
    const cell = el.appendChild(document.createElement('div'));
    networkRequestNode.renderCell(cell, 'name');

    // The row should have the warning-row class name.
    assert.isTrue(el.classList.contains('network-warning-row'));
    assert.isFalse(el.classList.contains('network-error-row'));

    // The icon should be the warning icon.
    const iconElement = el.querySelector('.icon') as HTMLElement;
    const iconImage = iconElement.getAttribute('name');
    assert.strictEqual('warning-filled', iconImage);
  });

  describe('OverrideTypesComparator', () => {
    it('should sort correctly based on override types', () => {
      const createRequest = (hasContent: boolean, hasHeaders: boolean, id: string) => {
        const request = createNetworkRequest({
          requestId: id,
          url: 'https://www.example.com',
          statusCode: 200,
          responseHeaders: hasHeaders ? [{name: 'foo', value: 'overridden'}] : undefined,
          originalResponseHeaders: hasHeaders ? [{name: 'foo', value: 'original'}] : undefined,
        });
        request.statusCode = 200;
        if (hasContent || hasHeaders) {
          request.setWasIntercepted(true);
        }
        if (hasContent) {
          request.hasOverriddenContent = true;
        }
        if (hasHeaders) {
          request.responseHeaders = [{name: 'foo', value: 'overridden'}];
          request.originalResponseHeaders = [{name: 'foo', value: 'original'}];
        }
        return new Network.NetworkDataGridNode.NetworkRequestNode(
            {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
      };

      const nodeNone = createRequest(false, false, 'none');
      const nodeContent = createRequest(true, false, 'content');
      const nodeHeaders = createRequest(false, true, 'headers');
      const nodeBoth = createRequest(true, true, 'both');

      // Sort order should be: "" < "content" < "content, headers" < "headers"
      assert.isBelow(Network.NetworkDataGridNode.NetworkRequestNode.OverrideTypesComparator(nodeNone, nodeContent), 0);
      assert.isAbove(Network.NetworkDataGridNode.NetworkRequestNode.OverrideTypesComparator(nodeContent, nodeNone), 0);

      assert.isBelow(Network.NetworkDataGridNode.NetworkRequestNode.OverrideTypesComparator(nodeContent, nodeBoth), 0);
      assert.isAbove(Network.NetworkDataGridNode.NetworkRequestNode.OverrideTypesComparator(nodeBoth, nodeContent), 0);

      assert.isBelow(Network.NetworkDataGridNode.NetworkRequestNode.OverrideTypesComparator(nodeBoth, nodeHeaders), 0);
      assert.isAbove(Network.NetworkDataGridNode.NetworkRequestNode.OverrideTypesComparator(nodeHeaders, nodeBoth), 0);

      assert.isBelow(Network.NetworkDataGridNode.NetworkRequestNode.OverrideTypesComparator(nodeNone, nodeHeaders), 0);

      const nodeNone2 = createRequest(false, false, 'none2');
      assert.isBelow(Network.NetworkDataGridNode.NetworkRequestNode.OverrideTypesComparator(nodeNone, nodeNone2), 0);
      assert.isAbove(Network.NetworkDataGridNode.NetworkRequestNode.OverrideTypesComparator(nodeNone2, nodeNone), 0);
    });

    it('should handle null requests correctly', () => {
      const nodeA = new Network.NetworkDataGridNode.NetworkRequestNode(
          {} as Network.NetworkDataGridNode.NetworkLogViewInterface, createNetworkRequest({
            requestId: 'a',
            url: 'https://www.example.com',
          }));

      const nodeNull1 = new Network.NetworkDataGridNode.NetworkRequestNode(
          {} as Network.NetworkDataGridNode.NetworkLogViewInterface, createNetworkRequest({
            requestId: 'null1',
            url: 'https://www.example.com',
          }));
      sinon.stub(nodeNull1, 'requestOrFirstKnownChildRequest').returns(null);

      const nodeNull2 = new Network.NetworkDataGridNode.NetworkRequestNode(
          {} as Network.NetworkDataGridNode.NetworkLogViewInterface, createNetworkRequest({
            requestId: 'null2',
            url: 'https://www.example.com',
          }));
      sinon.stub(nodeNull2, 'requestOrFirstKnownChildRequest').returns(null);

      // null vs null -> 0
      assert.strictEqual(
          Network.NetworkDataGridNode.NetworkRequestNode.OverrideTypesComparator(nodeNull1, nodeNull2), 0);

      // null vs valid -> -1
      assert.isBelow(Network.NetworkDataGridNode.NetworkRequestNode.OverrideTypesComparator(nodeNull1, nodeA), 0);

      // valid vs null -> 1
      assert.isAbove(Network.NetworkDataGridNode.NetworkRequestNode.OverrideTypesComparator(nodeA, nodeNull1), 0);
    });
  });

  describe('IsPreloadedComparator', () => {
    it('sorts nodes based on isLinkPreload status correctly', () => {
      const createPreloadRequest = (isLinkPreload: boolean, id: string) => {
        const req = createNetworkRequest({
          requestId: id,
          url: `https://www.example.com/${id}`,
        });
        req.setIsLinkPreload(isLinkPreload);
        return new Network.NetworkDataGridNode.NetworkRequestNode(
            {} as Network.NetworkDataGridNode.NetworkLogViewInterface, req);
      };

      const nodePreloaded = createPreloadRequest(true, 'a');
      const nodeNotPreloaded = createPreloadRequest(false, 'b');

      assert.isAbove(
          Network.NetworkDataGridNode.NetworkRequestNode.IsPreloadedComparator(nodePreloaded, nodeNotPreloaded), 0);
      assert.isBelow(
          Network.NetworkDataGridNode.NetworkRequestNode.IsPreloadedComparator(nodeNotPreloaded, nodePreloaded), 0);
    });

    it('handles nodes without requests symmetrically', () => {
      const emptyNodeA =
          new Network.NetworkDataGridNode.NetworkGroupNode({} as Network.NetworkDataGridNode.NetworkLogViewInterface);
      const emptyNodeB =
          new Network.NetworkDataGridNode.NetworkGroupNode({} as Network.NetworkDataGridNode.NetworkLogViewInterface);

      assert.strictEqual(Network.NetworkDataGridNode.NetworkRequestNode.IsPreloadedComparator(emptyNodeA, emptyNodeB),
                         0);
    });
  });

  it('renders is-preloaded cell correctly', async () => {
    const request = createNetworkRequest({url: 'https://www.example.com'});
    request.setIsLinkPreload(true);

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.renderCell(el, 'is-preloaded');
    assert.strictEqual(el.textContent, 'true');

    const el2 = document.createElement('div');
    request.setIsLinkPreload(false);
    networkRequestNode.renderCell(el2, 'is-preloaded');
    assert.strictEqual(el2.textContent, 'false');
  });

  describe('getExecutionContextDescription', () => {
    it('returns empty string when there is no frame and no target', () => {
      const request = createNetworkRequest({url: 'https://www.example.com'});

      const description = Network.NetworkDataGridNode.NetworkRequestNode.getExecutionContextDescription(request);
      assert.strictEqual(description, '');
    });

    it('returns context label for a service worker target with a named default execution context', () => {
      const request = createNetworkRequest({url: 'https://www.example.com'});

      const fakeTarget = {
        type: () => SDK.Target.Type.ServiceWorker,
        name: () => 'sw-target',
        model: (modelClass: unknown) => {
          if (modelClass === SDK.RuntimeModel.RuntimeModel) {
            return {
              executionContexts: () =>
                  [{isDefault: true, name: 'https://example.com/sw1.js', label: () => 'https://example.com/sw2.js'}],
            };
          }
          return null;
        },
      };
      const fakeNetworkManager = {target: () => fakeTarget};
      sinon.stub(SDK.NetworkManager.NetworkManager, 'forRequest')
          .returns(fakeNetworkManager as unknown as SDK.NetworkManager.NetworkManager);

      const description = Network.NetworkDataGridNode.NetworkRequestNode.getExecutionContextDescription(request);
      assert.strictEqual(description, 'https://example.com/sw2.js');
    });

    it('falls back to target name when worker target has no default execution context', () => {
      const request = createNetworkRequest({url: 'https://www.example.com'});

      const fakeTarget = {
        type: () => SDK.Target.Type.Worker,
        name: () => 'my-worker',
        model: (modelClass: unknown) => {
          if (modelClass === SDK.RuntimeModel.RuntimeModel) {
            return {
              executionContexts: () => [{isDefault: false, name: 'non-default-name', label: () => 'non-default-label'}],
            };
          }
          return null;
        },
      };
      const fakeNetworkManager = {target: () => fakeTarget};
      sinon.stub(SDK.NetworkManager.NetworkManager, 'forRequest')
          .returns(fakeNetworkManager as unknown as SDK.NetworkManager.NetworkManager);

      const description = Network.NetworkDataGridNode.NetworkRequestNode.getExecutionContextDescription(request);
      assert.strictEqual(description, 'my-worker');
    });

    it('returns context label for a frame-based request with matching execution context', () => {
      const request = createNetworkRequest({
        url: 'https://www.example.com',
        frameId: 'frame-id' as Protocol.Page.FrameId,
      });

      const fakeTarget = {
        type: () => SDK.Target.Type.FRAME,
        name: () => 'main',
        model: (modelClass: unknown) => {
          if (modelClass === SDK.RuntimeModel.RuntimeModel) {
            return {
              executionContexts: () => [{
                isDefault: true,
                name: 'https://example.com/name',
                frameId: 'frame-id',
                label: () => 'https://example.com/label',
              }],
            };
          }
          return null;
        },
      };
      const fakeNetworkManager = {target: () => fakeTarget};
      sinon.stub(SDK.NetworkManager.NetworkManager, 'forRequest')
          .returns(fakeNetworkManager as unknown as SDK.NetworkManager.NetworkManager);
      sinon.stub(SDK.ResourceTreeModel.ResourceTreeModel, 'frameForRequest').returns({
        displayName: () => 'example.com',
      } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame);

      const description = Network.NetworkDataGridNode.NetworkRequestNode.getExecutionContextDescription(request);
      assert.strictEqual(description, 'https://example.com/label');
    });

    it('falls back to frame displayName when no matching execution context is found', () => {
      const request = createNetworkRequest({
        url: 'https://www.example.com',
        frameId: 'frame-id' as Protocol.Page.FrameId,
      });

      const fakeTarget = {
        type: () => SDK.Target.Type.FRAME,
        name: () => 'main',
        model: (modelClass: unknown) => {
          if (modelClass === SDK.RuntimeModel.RuntimeModel) {
            return {
              executionContexts: () => [{
                isDefault: true,
                name: 'https://other.com/name',
                frameId: 'other-frame',
                label: () => 'https://other.com/label',
              }],
            };
          }
          return null;
        },
      };
      const fakeNetworkManager = {target: () => fakeTarget};
      sinon.stub(SDK.NetworkManager.NetworkManager, 'forRequest')
          .returns(fakeNetworkManager as unknown as SDK.NetworkManager.NetworkManager);
      sinon.stub(SDK.ResourceTreeModel.ResourceTreeModel, 'frameForRequest').returns({
        displayName: () => 'fallback-name',
      } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame);

      const description = Network.NetworkDataGridNode.NetworkRequestNode.getExecutionContextDescription(request);
      assert.strictEqual(description, 'fallback-name');
    });
  });

  describe('renderExecutionContextCell', () => {
    it('renders without error when context is empty', () => {
      const request = createNetworkRequest({url: 'https://www.example.com'});
      const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
          {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
      const cell = document.createElement('td');

      networkRequestNode.renderCell(cell, 'execution-context');

      assert.exists(cell);
    });

    it('shows context text in the cell', () => {
      const request = createNetworkRequest({url: 'https://www.example.com'});

      const fakeTarget = {
        type: () => SDK.Target.Type.ServiceWorker,
        name: () => 'sw',
        model: (modelClass: unknown) => {
          if (modelClass === SDK.RuntimeModel.RuntimeModel) {
            return {
              executionContexts: () =>
                  [{isDefault: true, name: 'https://sw.example.com/name', label: () => 'https://sw.example.com/label'}],
            };
          }
          return null;
        },
      };
      const fakeNetworkManager = {target: () => fakeTarget};
      sinon.stub(SDK.NetworkManager.NetworkManager, 'forRequest')
          .returns(fakeNetworkManager as unknown as SDK.NetworkManager.NetworkManager);

      const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
          {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
      const cell = document.createElement('td');
      networkRequestNode.renderCell(cell, 'execution-context');

      assert.include(cell.textContent || '', 'https://sw.example.com/label');
    });
  });

  describe('ExecutionContextComparator', () => {
    it('sorts empty contexts equal to each other', () => {
      const requestA = createNetworkRequest({
        requestId: 'a',
        url: 'https://www.example.com',
      });
      const requestB = createNetworkRequest({
        requestId: 'b',
        url: 'https://www.example.com',
      });

      const nodeA = new Network.NetworkDataGridNode.NetworkRequestNode(
          {} as Network.NetworkDataGridNode.NetworkLogViewInterface, requestA);
      const nodeB = new Network.NetworkDataGridNode.NetworkRequestNode(
          {} as Network.NetworkDataGridNode.NetworkLogViewInterface, requestB);

      // Both have empty context (no target/frame), so they should be equal
      assert.strictEqual(Network.NetworkDataGridNode.NetworkRequestNode.ExecutionContextComparator(nodeA, nodeB), 0);
    });

    it('sorts non-empty contexts alphabetically', () => {
      const requestA = createNetworkRequest({
        requestId: 'a',
        url: 'https://www.example.com',
      });
      const requestB = createNetworkRequest({
        requestId: 'b',
        url: 'https://www.example.com',
      });

      sinon.stub(Network.NetworkDataGridNode.NetworkRequestNode, 'getExecutionContextDescription')
          .callsFake(request => {
            if (request === requestA) {
              return 'alpha';
            }
            if (request === requestB) {
              return 'beta';
            }
            return '';
          });

      const nodeA = new Network.NetworkDataGridNode.NetworkRequestNode(
          {} as Network.NetworkDataGridNode.NetworkLogViewInterface, requestA);
      const nodeB = new Network.NetworkDataGridNode.NetworkRequestNode(
          {} as Network.NetworkDataGridNode.NetworkLogViewInterface, requestB);

      assert.isBelow(Network.NetworkDataGridNode.NetworkRequestNode.ExecutionContextComparator(nodeA, nodeB), 0);
      assert.isAbove(Network.NetworkDataGridNode.NetworkRequestNode.ExecutionContextComparator(nodeB, nodeA), 0);
    });

    it('handles missing request by sorting it first', () => {
      const requestA = createNetworkRequest({
        requestId: 'a',
        url: 'https://www.example.com',
      });
      const nodeA = new Network.NetworkDataGridNode.NetworkRequestNode(
          {} as Network.NetworkDataGridNode.NetworkLogViewInterface, requestA);

      const nodeNull = new Network.NetworkDataGridNode.NetworkRequestNode(
          {} as Network.NetworkDataGridNode.NetworkLogViewInterface, createNetworkRequest({
            requestId: 'null',
            url: 'https://www.example.com',
          }));
      sinon.stub(nodeNull, 'requestOrFirstKnownChildRequest').returns(null);

      // null sorts before valid
      assert.isBelow(Network.NetworkDataGridNode.NetworkRequestNode.ExecutionContextComparator(nodeNull, nodeA), 0);
      assert.isAbove(Network.NetworkDataGridNode.NetworkRequestNode.ExecutionContextComparator(nodeA, nodeNull), 0);
    });
  });

  describe('isConsoleOriginated', () => {
    function createRequestWithInitiator(
        resourceType: Common.ResourceType.ResourceType,
        initiator: Protocol.Network.Initiator|null,
        ): SDK.NetworkRequest.NetworkRequest {
      const request = createNetworkRequest({
        url: 'https://www.example.com/api',
        resourceType,
      });
      if (initiator) {
        sinon.stub(request, 'initiator').returns(initiator);
      } else {
        sinon.stub(request, 'initiator').returns(null);
      }
      return request;
    }

    it('returns true for a console fetch with single frame', () => {
      const request = createRequestWithInitiator(Common.ResourceType.resourceTypes.Fetch, {
        type: Protocol.Network.InitiatorType.Script,
        url: urlString``,
        stack: {
          callFrames: [
            {url: '', scriptId: '55' as Protocol.Runtime.ScriptId, functionName: '', lineNumber: 0, columnNumber: 0},
          ],
        },
      });
      assert.isTrue(Network.NetworkDataGridNode.NetworkRequestNode.isConsoleOriginated(request));
    });

    it('returns true for a console XHR with single frame', () => {
      const request = createRequestWithInitiator(Common.ResourceType.resourceTypes.XHR, {
        type: Protocol.Network.InitiatorType.Script,
        url: urlString``,
        stack: {
          callFrames: [
            {url: '', scriptId: '55' as Protocol.Runtime.ScriptId, functionName: '', lineNumber: 0, columnNumber: 0},
          ],
        },
      });
      assert.isTrue(Network.NetworkDataGridNode.NetworkRequestNode.isConsoleOriginated(request));
    });

    it('returns false for a non-fetch/XHR resource type', () => {
      const request = createRequestWithInitiator(Common.ResourceType.resourceTypes.Document, {
        type: Protocol.Network.InitiatorType.Script,
        url: urlString``,
        stack: {
          callFrames: [
            {url: '', scriptId: '55' as Protocol.Runtime.ScriptId, functionName: '', lineNumber: 0, columnNumber: 0},
          ],
        },
      });
      assert.isFalse(Network.NetworkDataGridNode.NetworkRequestNode.isConsoleOriginated(request));
    });

    it('returns false for a non-script initiator', () => {
      const request = createRequestWithInitiator(Common.ResourceType.resourceTypes.Fetch, {
        type: Protocol.Network.InitiatorType.Parser,
        url: urlString`https://example.com`,
      });
      assert.isFalse(Network.NetworkDataGridNode.NetworkRequestNode.isConsoleOriginated(request));
    });

    it('returns false when initiator is null', () => {
      const request = createRequestWithInitiator(Common.ResourceType.resourceTypes.Fetch, null);
      assert.isFalse(Network.NetworkDataGridNode.NetworkRequestNode.isConsoleOriginated(request));
    });

    it('returns false when initiator has a URL', () => {
      const request = createRequestWithInitiator(Common.ResourceType.resourceTypes.Fetch, {
        type: Protocol.Network.InitiatorType.Script,
        url: urlString`https://example.com/script.js`,
        stack: {
          callFrames: [
            {url: '', scriptId: '55' as Protocol.Runtime.ScriptId, functionName: '', lineNumber: 0, columnNumber: 0},
          ],
        },
      });
      assert.isFalse(Network.NetworkDataGridNode.NetworkRequestNode.isConsoleOriginated(request));
    });

    it('returns false when there is no stack', () => {
      const request = createRequestWithInitiator(Common.ResourceType.resourceTypes.Fetch, {
        type: Protocol.Network.InitiatorType.Script,
        url: urlString``,
      });
      assert.isFalse(Network.NetworkDataGridNode.NetworkRequestNode.isConsoleOriginated(request));
    });
  });

  describe('console originated icon', () => {
    it('adds icon to console-originated fetch', () => {
      const request = createNetworkRequest({
        url: 'https://www.example.com/api',
        resourceType: Common.ResourceType.resourceTypes.Fetch,
      });
      sinon.stub(request, 'initiator').returns({
        type: Protocol.Network.InitiatorType.Script,
        url: urlString``,
        stack: {
          callFrames: [
            {url: '', scriptId: '55' as Protocol.Runtime.ScriptId, functionName: '', lineNumber: 0, columnNumber: 0},
          ],
        },
      });

      const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
          {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
      const el = document.createElement('div');
      networkRequestNode.renderCell(el, 'name');
      const icon = el.querySelector('.network-console-icon');
      assert.instanceOf(icon, HTMLElement);
    });

    it('does not add icon to non-console request', () => {
      const request = createNetworkRequest({
        url: 'https://www.example.com/',
        resourceType: Common.ResourceType.resourceTypes.Document,
        mimeType: 'text/html',
      });

      const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
          {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
      const el = document.createElement('div');
      networkRequestNode.renderCell(el, 'name');
      const icon = el.querySelector('.network-console-icon');
      assert.isNull(icon);
    });
  });
});
