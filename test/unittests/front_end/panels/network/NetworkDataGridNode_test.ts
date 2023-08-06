// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Network from '../../../../../front_end/panels/network/network.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';

import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {assertElement} from '../../helpers/DOMHelpers.js';

describeWithEnvironment('NetworkLogView', () => {
  it('adds marker to requests with overridden headers', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, 'https://www.example.com' as Platform.DevToolsPath.UrlString,
        '' as Platform.DevToolsPath.UrlString, null, null, null);
    request.statusCode = 200;

    request.setWasIntercepted(true);
    request.responseHeaders = [{name: 'foo', value: 'overridden'}];
    request.originalResponseHeaders = [{name: 'foo', value: 'original'}];

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.renderCell(el, 'name');
    const marker = el.querySelector('.network-override-marker');
    const tooltip = el.querySelector('[title="Request headers are overridden"]');
    assertElement(marker, HTMLDivElement);
    assert.isNotNull(tooltip);
  });

  it('adds marker to requests with overridden content', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, 'https://www.example.com' as Platform.DevToolsPath.UrlString,
        '' as Platform.DevToolsPath.UrlString, null, null, null);
    request.statusCode = 200;

    request.setWasIntercepted(true);
    request.hasOverriddenContent = true;

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.renderCell(el, 'name');
    const marker = el.querySelector('.network-override-marker');
    const tooltip = el.querySelector('[title="Request content is overridden"]');
    assertElement(marker, HTMLDivElement);
    assert.isNotNull(tooltip);
  });

  it('adds marker to requests with overridden headers and content', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, 'https://www.example.com' as Platform.DevToolsPath.UrlString,
        '' as Platform.DevToolsPath.UrlString, null, null, null);
    request.statusCode = 200;

    request.setWasIntercepted(true);
    request.hasOverriddenContent = true;
    request.responseHeaders = [{name: 'foo', value: 'overridden'}];
    request.originalResponseHeaders = [{name: 'foo', value: 'original'}];

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.renderCell(el, 'name');
    const marker = el.querySelector('.network-override-marker');
    const tooltip = el.querySelector('[title="Both request content and headers are overridden"]');
    assertElement(marker, HTMLDivElement);
    assert.isNotNull(tooltip);
  });

  it('does not add marker to unoverridden request', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, 'https://www.example.com' as Platform.DevToolsPath.UrlString,
        '' as Platform.DevToolsPath.UrlString, null, null, null);
    request.statusCode = 200;

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');
    networkRequestNode.renderCell(el, 'name');
    const marker = el.querySelector('.network-override-marker');
    assert.isNull(marker);
  });

  it('adds an error red icon to the left of the failed requests', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, 'https://www.example.com' as Platform.DevToolsPath.UrlString,
        '' as Platform.DevToolsPath.UrlString, null, null, null);
    request.statusCode = 404;

    const networkRequestNode = new Network.NetworkDataGridNode.NetworkRequestNode(
        {} as Network.NetworkDataGridNode.NetworkLogViewInterface, request);
    const el = document.createElement('div');

    networkRequestNode.renderCell(el, 'name');
    const iconElement = el.querySelector('.icon') as HTMLElement;

    const iconStyle = iconElement.style;
    const indexOfIconImage = iconStyle.webkitMaskImage.indexOf('Images/') + 7;
    const iconImage = iconStyle.webkitMaskImage.substring(indexOfIconImage);

    assert.strictEqual('cross-circle-filled.svg")', iconImage);

    const backgroundColorOfIcon = iconStyle.backgroundColor.toString();
    assert.strictEqual(backgroundColorOfIcon, 'var(--icon-error)');
  });
});
