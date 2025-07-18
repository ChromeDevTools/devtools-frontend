// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import {raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Network from './network.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('RequestResponseView', () => {
  it('does show WASM disassembly for WASM module requests', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`http://devtools-frontend.test/module.wasm`, urlString``,
        null, null, null);
    request.setContentDataProvider(
        () => Promise.resolve(new TextUtils.ContentData.ContentData(
            'AGFzbQEAAAABBQFgAAF/AwIBAAcHAQNiYXIAAAoGAQQAQQILACQEbmFtZQAQD3Nob3ctd2FzbS0yLndhdAEGAQADYmFyAgMBAAA=',
            true, 'application/wasm')));
    request.mimeType = 'application/wasm';
    request.finished = true;

    // This is required, as it otherwise tries to create and wait for a worker to fetch and disassemble wasm
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sinon.stub(SourceFrame.ResourceSourceFrame.ResourceSourceFrame.prototype as any, 'setContentDataOrError')
        .callsFake(() => {});
    const component = new Network.RequestResponseView.RequestResponseView(request);
    assert.deepEqual(component.getMimeTypeForDisplay(), 'application/wasm');
    renderElementIntoDOM(component);
    await component.updateComplete;

    const widget = component.contentElement.querySelector('devtools-widget') as
            UI.Widget.WidgetElement<SourceFrame.ResourceSourceFrame.SearchableContainer>|
        null;
    assert.instanceOf(widget?.getWidget(), SourceFrame.ResourceSourceFrame.SearchableContainer);
    component.detach();
  });

  it('shows the BinaryResourceView for binary content', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`http://devtools-frontend.test/image.png`, urlString``,
        null, null, null);
    request.setContentDataProvider(
        () => Promise.resolve(new TextUtils.ContentData.ContentData(
            'AGFzbQEAAAABBQFgAAF/AwIBAAcHAQNiYXIAAAoGAQQAQQILACQEbmFtZQAQD3Nob3ctd2FzbS0yLndhdAEGAQADYmFyAgMBAAA=',
            true, 'application/octet-stream')));
    request.mimeType = 'application/octet-stream';
    request.finished = true;

    const component = new Network.RequestResponseView.RequestResponseView(request);
    assert.deepEqual(component.getMimeTypeForDisplay(), 'application/octet-stream');
    renderElementIntoDOM(component);

    await component.updateComplete;

    const widget = component.contentElement.querySelector('devtools-widget') as
            UI.Widget.WidgetElement<Network.BinaryResourceView.BinaryResourceView>|
        null;
    assert.instanceOf(widget?.getWidget(), Network.BinaryResourceView.BinaryResourceView);

    await raf();
    component.detach();
  });

  it('renders a view even if mime type is undefined', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`http://devtools-frontend.test/image.png`, urlString``,
        null, null, null);
    request.finished = true;

    const component = new Network.RequestResponseView.RequestResponseView(request);
    assert.isUndefined(component.getMimeTypeForDisplay());

    renderElementIntoDOM(component);
    await component.updateComplete;

    const widget = component.contentElement.querySelector('devtools-widget') as
            UI.Widget.WidgetElement<UI.EmptyWidget.EmptyWidget>|
        null;
    assert.instanceOf(widget?.getWidget(), UI.EmptyWidget.EmptyWidget);
    assert.deepEqual(
        widget.getWidget()?.contentElement.textContent, 'Failed to load response dataNo network manager for request');

    component.detach();
  });

  it('forwards calls to reveal position to the SearchableContainer', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId, urlString`http://devtools-frontend.test/module.wasm`, urlString``,
        null, null, null);
    request.setContentDataProvider(
        () => Promise.resolve(new TextUtils.ContentData.ContentData(
            'AGFzbQEAAAABBQFgAAF/AwIBAAcHAQNiYXIAAAoGAQQAQQILACQEbmFtZQAQD3Nob3ctd2FzbS0yLndhdAEGAQADYmFyAgMBAAA=',
            true, 'application/wasm')));
    request.mimeType = 'application/wasm';
    request.finished = true;

    // This is required, as it otherwise tries to create and wait for a worker to fetch and disassemble wasm
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sinon.stub(SourceFrame.ResourceSourceFrame.ResourceSourceFrame.prototype as any, 'setContentDataOrError')
        .callsFake(() => {});
    const component = new Network.RequestResponseView.RequestResponseView(request);
    assert.deepEqual(component.getMimeTypeForDisplay(), 'application/wasm');
    renderElementIntoDOM(component);

    await component.updateComplete;

    const widget = component.contentElement.querySelector('devtools-widget') as
            UI.Widget.WidgetElement<SourceFrame.ResourceSourceFrame.SearchableContainer>|
        null;
    const searchableContainer = widget?.getWidget();
    assert.instanceOf(searchableContainer, SourceFrame.ResourceSourceFrame.SearchableContainer);
    const searchableSpy = sinon.spy(searchableContainer, 'revealPosition');
    try {
      await component.revealPosition(0);
      sinon.assert.calledOnce(searchableSpy);
    } catch {
      assert.fail('Revealing a position should not throw.');
    }

    component.detach();
  });
});
