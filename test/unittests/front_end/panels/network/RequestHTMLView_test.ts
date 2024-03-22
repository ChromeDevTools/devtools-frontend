// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as TextUtils from '../../../../../front_end/models/text_utils/text_utils.js';
import * as Network from '../../../../../front_end/panels/network/network.js';

describe('RequestHTMLView', () => {
  it('renders a HTML document into an iframe', async () => {
    const content = '<body><p>octothorp: #</p><p>hello world!<p>%3Cp%3EURI%20encoded%20tag!%3C%2Fp%3E</body>';
    const contentData = new TextUtils.ContentData.ContentData(content, false, 'text/html');
    const htmlView = Network.RequestHTMLView.RequestHTMLView.create(contentData);
    assertNotNullOrUndefined(htmlView);
    htmlView.markAsRoot();
    const div = document.createElement('div');
    htmlView.show(div);

    const iframe = htmlView.contentElement.querySelector('iframe');
    assertNotNullOrUndefined(iframe);

    assert.strictEqual(iframe.src, contentData.asDataUrl());
    assert.strictEqual(decodeURIComponent(iframe.src), 'data:text/html,' + content);

    htmlView.detach();
  });
});
