// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as Diff from '../../third_party/diff/diff.js';
import {render} from '../../ui/lit/lit.js';

import * as PanelUtils from './utils.js';

const {urlString} = Platform.DevToolsPath;

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
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com`, urlString``, null, null, null);
      request.statusCode = 404;

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('cross-circle-filled', iconImage);
    });

    it('show document icon', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com/`, urlString``, null, null,
          null);
      request.setResourceType(Common.ResourceType.resourceTypes.Document);
      request.mimeType = 'text/html';

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('file-document', iconImage);
    });

    it('show media icon', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com/test.mp3`, urlString``, null,
          null, null);
      request.setResourceType(Common.ResourceType.resourceTypes.Media);
      request.mimeType = 'audio/mpeg';

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('file-media', iconImage);
    });

    it('show wasm icon', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com/test.wasm`, urlString``, null,
          null, null);
      request.setResourceType(Common.ResourceType.resourceTypes.Wasm);
      request.mimeType = 'application/wasm';

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('file-wasm', iconImage);
    });

    it('show websocket icon', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com/ws`, urlString``, null, null,
          null);
      request.setResourceType(Common.ResourceType.resourceTypes.WebSocket);
      request.mimeType = '';

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('file-websocket', iconImage);
    });

    it('shows fetch icon', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com/test.json?keepalive=false`,
          urlString``, null, null, null);
      request.setResourceType(Common.ResourceType.resourceTypes.Fetch);
      request.mimeType = '';

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('file-fetch-xhr', iconImage);
    });

    it('shows xhr icon', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com/test.json?keepalive=false`,
          urlString``, null, null, null);
      request.setResourceType(Common.ResourceType.resourceTypes.XHR);
      request.mimeType = 'application/octet-stream';

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('file-fetch-xhr', iconImage);
    });

    it('mime win: show image preview icon for xhr-image', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com/test.svg`, urlString``, null,
          null, null);
      request.setResourceType(Common.ResourceType.resourceTypes.XHR);
      request.mimeType = 'image/svg+xml';

      const iconElement = renderIcon(request);
      const imagePreview = iconElement.querySelector('.image-network-icon-preview') as HTMLImageElement;

      assert.instanceOf(iconElement, HTMLDivElement);
      assert.instanceOf(imagePreview, HTMLImageElement);
    });

    it('mime win: show document icon for fetch-html', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com/page`, urlString``, null, null,
          null);
      request.setResourceType(Common.ResourceType.resourceTypes.Fetch);
      request.mimeType = 'text/html';

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('file-document', iconImage);
    });

    it('mime win: show generic icon for preflight-text', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com/api/test`, urlString``, null,
          null, null);
      request.setResourceType(Common.ResourceType.resourceTypes.Preflight);
      request.mimeType = 'text/plain';

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('file-generic', iconImage);
    });

    it('mime win: show script icon for other-javascript)', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com/ping`, urlString``, null, null,
          null);
      request.setResourceType(Common.ResourceType.resourceTypes.Other);
      request.mimeType = 'application/javascript';

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('file-script', iconImage);
    });

    it('mime win: shows json icon for fetch-json', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com/api/list`, urlString``, null,
          null, null);
      request.setResourceType(Common.ResourceType.resourceTypes.Fetch);
      request.mimeType = 'application/json';

      const iconElement = renderIcon(request);
      const iconImage = iconElement.getAttribute('name');
      assert.strictEqual('file-json', iconImage);
    });
  });
});
