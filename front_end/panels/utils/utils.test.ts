// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as Diff from '../../third_party/diff/diff.js';

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
    it('creates an error red icon for request with status code 404', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, 'https://www.example.com' as Platform.DevToolsPath.UrlString,
          '' as Platform.DevToolsPath.UrlString, null, null, null);
      request.statusCode = 404;

      const iconElement = PanelUtils.PanelUtils.getIconForNetworkRequest(request);

      const iconStyle = iconElement.style;
      const indexOfIconImage = iconStyle.webkitMaskImage.indexOf('Images/') + 7;
      const iconImage = iconStyle.webkitMaskImage.substring(indexOfIconImage);

      assert.strictEqual('cross-circle-filled.svg")', iconImage);

      const backgroundColorOfIcon = iconStyle.backgroundColor.toString();
      assert.strictEqual(backgroundColorOfIcon, 'var(--icon-error)');
    });

    it('show document icon', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, 'https://www.example.com/' as Platform.DevToolsPath.UrlString,
          '' as Platform.DevToolsPath.UrlString, null, null, null);
      request.setResourceType(Common.ResourceType.resourceTypes.Document);
      request.mimeType = 'text/html';

      const iconElement = PanelUtils.PanelUtils.getIconForNetworkRequest(request);

      const iconStyle = iconElement.style;
      const indexOfIconImage = iconStyle.webkitMaskImage.indexOf('Images/') + 7;
      const iconImage = iconStyle.webkitMaskImage.substring(indexOfIconImage);

      assert.strictEqual('file-document.svg")', iconImage);

      const backgroundColorOfIcon = iconStyle.backgroundColor.toString();
      assert.strictEqual(backgroundColorOfIcon, 'var(--icon-file-document)');
    });

    it('show media icon', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId,
          'https://www.example.com/test.mp3' as Platform.DevToolsPath.UrlString, '' as Platform.DevToolsPath.UrlString,
          null, null, null);
      request.setResourceType(Common.ResourceType.resourceTypes.Media);
      request.mimeType = 'audio/mpeg';

      const iconElement = PanelUtils.PanelUtils.getIconForNetworkRequest(request);

      const iconStyle = iconElement.style;
      const indexOfIconImage = iconStyle.webkitMaskImage.indexOf('Images/') + 7;
      const iconImage = iconStyle.webkitMaskImage.substring(indexOfIconImage);

      assert.strictEqual('file-media.svg")', iconImage);
    });

    it('show wasm icon', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId,
          'https://www.example.com/test.wasm' as Platform.DevToolsPath.UrlString, '' as Platform.DevToolsPath.UrlString,
          null, null, null);
      request.setResourceType(Common.ResourceType.resourceTypes.Wasm);
      request.mimeType = 'application/wasm';

      const iconElement = PanelUtils.PanelUtils.getIconForNetworkRequest(request);

      const iconStyle = iconElement.style;
      const indexOfIconImage = iconStyle.webkitMaskImage.indexOf('Images/') + 7;
      const iconImage = iconStyle.webkitMaskImage.substring(indexOfIconImage);

      assert.strictEqual('file-wasm.svg")', iconImage);
    });

    it('show websocket icon', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, 'https://www.example.com/ws' as Platform.DevToolsPath.UrlString,
          '' as Platform.DevToolsPath.UrlString, null, null, null);
      request.setResourceType(Common.ResourceType.resourceTypes.WebSocket);
      request.mimeType = '';

      const iconElement = PanelUtils.PanelUtils.getIconForNetworkRequest(request);

      const iconStyle = iconElement.style;
      const indexOfIconImage = iconStyle.webkitMaskImage.indexOf('Images/') + 7;
      const iconImage = iconStyle.webkitMaskImage.substring(indexOfIconImage);

      assert.strictEqual('file-websocket.svg")', iconImage);
    });

    it('shows fetch icon', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId,
          'https://www.example.com/test.json?keepalive=false' as Platform.DevToolsPath.UrlString,
          '' as Platform.DevToolsPath.UrlString, null, null, null);
      request.setResourceType(Common.ResourceType.resourceTypes.Fetch);
      request.mimeType = '';

      const iconElement = PanelUtils.PanelUtils.getIconForNetworkRequest(request);

      const iconStyle = iconElement.style;
      const indexOfIconImage = iconStyle.webkitMaskImage.indexOf('Images/') + 7;
      const iconImage = iconStyle.webkitMaskImage.substring(indexOfIconImage);

      assert.strictEqual('file-fetch-xhr.svg")', iconImage);
    });

    it('shows xhr icon', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId,
          'https://www.example.com/test.json?keepalive=false' as Platform.DevToolsPath.UrlString,
          '' as Platform.DevToolsPath.UrlString, null, null, null);
      request.setResourceType(Common.ResourceType.resourceTypes.XHR);
      request.mimeType = 'application/octet-stream';

      const iconElement = PanelUtils.PanelUtils.getIconForNetworkRequest(request);

      const iconStyle = iconElement.style;
      const indexOfIconImage = iconStyle.webkitMaskImage.indexOf('Images/') + 7;
      const iconImage = iconStyle.webkitMaskImage.substring(indexOfIconImage);

      assert.strictEqual('file-fetch-xhr.svg")', iconImage);
    });

    it('mime win: show image preview icon for xhr-image', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId,
          'https://www.example.com/test.svg' as Platform.DevToolsPath.UrlString, '' as Platform.DevToolsPath.UrlString,
          null, null, null);
      request.setResourceType(Common.ResourceType.resourceTypes.XHR);
      request.mimeType = 'image/svg+xml';

      const iconElement = PanelUtils.PanelUtils.getIconForNetworkRequest(request);
      const imagePreview = iconElement.querySelector('.image-network-icon-preview') as HTMLImageElement;

      assert.isTrue(iconElement instanceof HTMLDivElement);
      assert.isTrue(imagePreview instanceof HTMLImageElement);
    });

    it('mime win: show document icon for fetch-html', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, 'https://www.example.com/page' as Platform.DevToolsPath.UrlString,
          '' as Platform.DevToolsPath.UrlString, null, null, null);
      request.setResourceType(Common.ResourceType.resourceTypes.Fetch);
      request.mimeType = 'text/html';

      const iconElement = PanelUtils.PanelUtils.getIconForNetworkRequest(request);

      const iconStyle = iconElement.style;
      const indexOfIconImage = iconStyle.webkitMaskImage.indexOf('Images/') + 7;
      const iconImage = iconStyle.webkitMaskImage.substring(indexOfIconImage);

      assert.strictEqual('file-document.svg")', iconImage);
    });

    it('mime win: show generic icon for preflight-text', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId,
          'https://www.example.com/api/test' as Platform.DevToolsPath.UrlString, '' as Platform.DevToolsPath.UrlString,
          null, null, null);
      request.setResourceType(Common.ResourceType.resourceTypes.Preflight);
      request.mimeType = 'text/plain';

      const iconElement = PanelUtils.PanelUtils.getIconForNetworkRequest(request);

      const iconStyle = iconElement.style;
      const indexOfIconImage = iconStyle.webkitMaskImage.indexOf('Images/') + 7;
      const iconImage = iconStyle.webkitMaskImage.substring(indexOfIconImage);

      assert.strictEqual('file-generic.svg")', iconImage);
    });

    it('mime win: show script icon for other-javascript)', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, 'https://www.example.com/ping' as Platform.DevToolsPath.UrlString,
          '' as Platform.DevToolsPath.UrlString, null, null, null);
      request.setResourceType(Common.ResourceType.resourceTypes.Other);
      request.mimeType = 'application/javascript';

      const iconElement = PanelUtils.PanelUtils.getIconForNetworkRequest(request);

      const iconStyle = iconElement.style;
      const indexOfIconImage = iconStyle.webkitMaskImage.indexOf('Images/') + 7;
      const iconImage = iconStyle.webkitMaskImage.substring(indexOfIconImage);

      assert.strictEqual('file-script.svg")', iconImage);
    });

    it('mime win: shows json icon for fetch-json', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId,
          'https://www.example.com/api/list' as Platform.DevToolsPath.UrlString, '' as Platform.DevToolsPath.UrlString,
          null, null, null);
      request.setResourceType(Common.ResourceType.resourceTypes.Fetch);
      request.mimeType = 'application/json';

      const iconElement = PanelUtils.PanelUtils.getIconForNetworkRequest(request);

      const iconStyle = iconElement.style;
      const indexOfIconImage = iconStyle.webkitMaskImage.indexOf('Images/') + 7;
      const iconImage = iconStyle.webkitMaskImage.substring(indexOfIconImage);

      assert.strictEqual('file-json.svg")', iconImage);
    });
  });
});
