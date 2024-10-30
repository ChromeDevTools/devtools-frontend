// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import {raf} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Network from './network.js';

describeWithEnvironment('RequestResponseView', () => {
  it('does show WASM disassembly for WASM module requests', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        'http://devtools-frontend.test/module.wasm' as Platform.DevToolsPath.UrlString,
        '' as Platform.DevToolsPath.UrlString, null, null, null);
    request.setContentDataProvider(
        () => Promise.resolve(new TextUtils.ContentData.ContentData(
            'AGFzbQEAAAABBQFgAAF/AwIBAAcHAQNiYXIAAAoGAQQAQQILACQEbmFtZQAQD3Nob3ctd2FzbS0yLndhdAEGAQADYmFyAgMBAAA=',
            true, 'application/wasm')));
    request.mimeType = 'application/wasm';
    request.finished = true;

    const mockedSourceView = new UI.EmptyWidget.EmptyWidget('<disassembled WASM>');
    const viewStub = sinon.stub(SourceFrame.ResourceSourceFrame.ResourceSourceFrame, 'createSearchableView')
                         .returns(mockedSourceView);

    const component = new Network.RequestResponseView.RequestResponseView(request);
    const showPreviewSpy = sinon.spy(component, 'showPreview');
    component.markAsRoot();
    component.show(document.body);
    const widget = await showPreviewSpy.returnValues[0];

    assert.isTrue(viewStub.calledOnceWithExactly(request, 'application/wasm'));
    assert.strictEqual(widget, mockedSourceView);

    component.detach();
  });

  it('shows the BinaryResourceView for binary content', async () => {
    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId' as Protocol.Network.RequestId,
        'http://devtools-frontend.test/image.png' as Platform.DevToolsPath.UrlString,
        '' as Platform.DevToolsPath.UrlString, null, null, null);
    request.setContentDataProvider(
        () => Promise.resolve(new TextUtils.ContentData.ContentData(
            'AGFzbQEAAAABBQFgAAF/AwIBAAcHAQNiYXIAAAoGAQQAQQILACQEbmFtZQAQD3Nob3ctd2FzbS0yLndhdAEGAQADYmFyAgMBAAA=',
            true, 'application/octet-stream')));
    request.mimeType = 'application/octet-stream';
    request.finished = true;

    const component = new Network.RequestResponseView.RequestResponseView(request);
    const showPreviewSpy = sinon.spy(component, 'showPreview');
    component.markAsRoot();
    component.show(document.body);
    const widget = await showPreviewSpy.returnValues[0];

    assert.instanceOf(widget, Network.BinaryResourceView.BinaryResourceView);

    await raf();
    component.detach();
  });
});
