// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createNetworkRequest} from '../../testing/NetworkRequestHelpers.js';
import * as Diff from '../../third_party/diff/diff.js';
import {render} from '../../ui/lit/lit.js';

import * as PanelUtils from './utils.js';

describeWithEnvironment('panels/utils', () => {
  it('formats CSS changes from diff arrays', async () => {
    const original = `
      .container {
        width: 10px;
        height: 10px;
      }

      .child {
        display: grid;
        --child-theme-color: 100, 200, 0;
      }

      @supports (display: grid) {
        .container {
          display: grid;
        }
      }`;
    const current = `
      .container {
        width: 15px;
        margin: 0;
      }

      .child2 {
        display: grid;
        --child-theme-color: 5, 10, 15;
        padding: 10px;
      }

      @supports (display: flex) {
        .container {
          display: flex;
        }
      }`;
    const diff = Diff.Diff.DiffWrapper.lineDiff(original.split('\n'), current.split('\n'));
    const changes = await PanelUtils.PanelUtils.formatCSSChangesFromDiff(diff);
    assert.strictEqual(
        changes, `.container {
  /* width: 10px; */
  /* height: 10px; */
  width: 15px;
  margin: 0;
}

/* .child { */
.child2 {
  /* --child-theme-color: 100, 200, 0; */
  --child-theme-color: 5, 10, 15;
  padding: 10px;
}

/* @supports (display: grid) { */
@supports (display: flex) {
.container {
  /* display: grid; */
  display: flex;
}`,
        'formatted CSS changes are not correct');
  });

  describe('getIconForNetworkRequest', () => {
    function renderIcon(request: SDK.NetworkRequest.NetworkRequest): HTMLElement {
      const container = document.createElement('div');
      renderElementIntoDOM(container);
      render(PanelUtils.PanelUtils.getIconForNetworkRequest(request), container);
      assert.instanceOf(container.firstElementChild, HTMLElement);
      return container.firstElementChild;
    }

    it('creates an error icon for request with status code 404', async () => {
      const request = createNetworkRequest({url: 'https://www.example.com', statusCode: 404});

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('cross-circle-filled', iconImage);
    });

    it('creates a warning icon for failed preloading request', async () => {
      const request = createNetworkRequest({
        url: 'https://www.example.com',
        statusCode: 404,
        initiator: {type: Protocol.Network.InitiatorType.Preload},
      });

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('warning-filled', iconImage);
    });

    it('show document icon', async () => {
      const request = createNetworkRequest({
        url: 'https://www.example.com/',
        resourceType: Common.ResourceType.resourceTypes.Document,
        mimeType: 'text/html',
      });

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('file-document', iconImage);
    });

    it('show media icon', async () => {
      const request = createNetworkRequest({
        url: 'https://www.example.com/test.mp3',
        resourceType: Common.ResourceType.resourceTypes.Media,
        mimeType: 'audio/mpeg',
      });

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('file-media', iconImage);
    });

    it('show wasm icon', async () => {
      const request = createNetworkRequest({
        url: 'https://www.example.com/test.wasm',
        resourceType: Common.ResourceType.resourceTypes.Wasm,
        mimeType: 'application/wasm',
      });

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('file-wasm', iconImage);
    });

    it('show websocket icon', async () => {
      const request = createNetworkRequest({
        url: 'https://www.example.com/ws',
        resourceType: Common.ResourceType.resourceTypes.WebSocket,
      });

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('file-websocket', iconImage);
    });

    it('shows fetch icon', async () => {
      const request = createNetworkRequest({
        url: 'https://www.example.com/test.json?keepalive=false',
        resourceType: Common.ResourceType.resourceTypes.Fetch,
      });

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('file-fetch-xhr', iconImage);
    });

    it('shows xhr icon', async () => {
      const request = createNetworkRequest({
        url: 'https://www.example.com/test.json?keepalive=false',
        resourceType: Common.ResourceType.resourceTypes.XHR,
        mimeType: 'application/octet-stream',
      });

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('file-fetch-xhr', iconImage);
    });

    it('mime win: show image preview icon for xhr-image', async () => {
      const request = createNetworkRequest({
        url: 'https://www.example.com/test.svg',
        resourceType: Common.ResourceType.resourceTypes.XHR,
        mimeType: 'image/svg+xml',
      });

      const iconElement = renderIcon(request);
      const imagePreview = iconElement.querySelector('.image-network-icon-preview') as HTMLImageElement;

      assert.instanceOf(iconElement, HTMLDivElement);
      assert.instanceOf(imagePreview, HTMLImageElement);
    });

    it('mime win: show document icon for fetch-html', async () => {
      const request = createNetworkRequest({
        url: 'https://www.example.com/page',
        resourceType: Common.ResourceType.resourceTypes.Fetch,
        mimeType: 'text/html',
      });

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('file-document', iconImage);
    });

    it('mime win: show generic icon for preflight-text', async () => {
      const request = createNetworkRequest({
        url: 'https://www.example.com/api/test',
        resourceType: Common.ResourceType.resourceTypes.Preflight,
        mimeType: 'text/plain',
      });

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('file-generic', iconImage);
    });

    it('mime win: show script icon for other-javascript)', async () => {
      const request = createNetworkRequest({
        url: 'https://www.example.com/ping',
        resourceType: Common.ResourceType.resourceTypes.Other,
        mimeType: 'application/javascript',
      });

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('file-script', iconImage);
    });

    it('mime win: shows json icon for fetch-json', async () => {
      const request = createNetworkRequest({
        url: 'https://www.example.com/api/list',
        resourceType: Common.ResourceType.resourceTypes.Fetch,
        mimeType: 'application/json',
      });

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('file-json', iconImage);
    });

    it('preserves specific icon for overridden stylesheet request', async () => {
      const request = createNetworkRequest({
        url: 'https://www.example.com/styles.css',
        resourceType: Common.ResourceType.resourceTypes.Stylesheet,
        mimeType: 'text/css',
      });
      request.hasOverriddenContent = true;

      const markerElement = renderIcon(request);
      assert.strictEqual(markerElement.className, 'network-override-marker');
      const iconElement = markerElement.querySelector('devtools-icon');
      assert.isNotNull(iconElement);
      assert.strictEqual(iconElement?.getAttribute('name'), 'file-stylesheet');
      assert.strictEqual(iconElement?.getAttribute('title'), 'Request content is overridden');
    });

    it('preserves specific icon for overridden image request', async () => {
      const request = createNetworkRequest({
        url: 'https://www.example.com/image.png',
        resourceType: Common.ResourceType.resourceTypes.Image,
        mimeType: 'image/png',
        responseHeaders: [{name: 'foo', value: 'overridden'}],
        originalResponseHeaders: [{name: 'foo', value: 'original'}],
      });

      const markerElement = renderIcon(request);
      assert.strictEqual(markerElement.className, 'network-override-marker');
      const iconElement = markerElement.querySelector('.image.icon');
      assert.isNotNull(iconElement);
      const imgElement = iconElement?.querySelector('img');
      assert.isNotNull(imgElement);
      assert.strictEqual(imgElement?.getAttribute('title'), 'Request headers are overridden');
    });
  });
});
