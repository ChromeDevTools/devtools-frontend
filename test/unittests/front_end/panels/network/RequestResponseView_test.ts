// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as TextUtils from '../../../../../front_end/models/text_utils/text_utils.js';
import * as Network from '../../../../../front_end/panels/network/network.js';
import * as SourceFrame from '../../../../../front_end/ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';

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
    component.markAsRoot();
    const widget = await component.showPreview();

    assert.isTrue(viewStub.calledOnceWithExactly(request, 'application/wasm'));
    assert.strictEqual(widget, mockedSourceView);

    component.detach();
  });
});
