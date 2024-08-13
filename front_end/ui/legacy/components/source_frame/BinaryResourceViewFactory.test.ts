// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';

import * as SourceFrame from './source_frame.js';

describeWithEnvironment('BinaryResourceViewFactory', () => {
  it('interprets base64 content correctly', async () => {
    const base64content = 'c2VuZGluZyB0aGlzIHV0Zi04IHN0cmluZyBhcyBhIGJpbmFyeSBtZXNzYWdlLi4u';
    const factory = new SourceFrame.BinaryResourceViewFactory.BinaryResourceViewFactory(
        base64content, 'http://example.com' as Platform.DevToolsPath.UrlString,
        Common.ResourceType.resourceTypes.WebSocket);

    async function getResourceText(view: SourceFrame.ResourceSourceFrame.ResourceSourceFrame): Promise<string> {
      const contentData =
          TextUtils.ContentData.ContentData.contentDataOrEmpty(await view.resource.requestContentData());
      return contentData.text;
    }

    assert.strictEqual(
        await getResourceText(factory.createBase64View()),
        'c2VuZGluZyB0aGlzIHV0Zi04IHN0cmluZyBhcyBhIGJpbmFyeSBtZXNzYWdlLi4u');
    assert.strictEqual(
        await getResourceText(factory.createHexView()),
        `00000000: 7365 6e64 696e 6720 7468 6973 2075 7466  sending this utf
00000001: 2d38 2073 7472 696e 6720 6173 2061 2062  -8 string as a b
00000002: 696e 6172 7920 6d65 7373 6167 652e 2e2e  inary message...
`);
    assert.strictEqual(
        await getResourceText(factory.createUtf8View()), 'sending this utf-8 string as a binary message...');
  });
});
