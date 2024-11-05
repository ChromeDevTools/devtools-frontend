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
    const base64content = new TextUtils.ContentData.ContentData(
        'c2VuZGluZyB0aGlzIHV0Zi04IHN0cmluZyBhcyBhIGJpbmFyeSBtZXNzYWdlLi4u', true, '');
    const factory = new SourceFrame.BinaryResourceViewFactory.BinaryResourceViewFactory(
        TextUtils.StreamingContentData.StreamingContentData.from(base64content),
        'http://example.com' as Platform.DevToolsPath.UrlString, Common.ResourceType.resourceTypes.WebSocket);

    async function getResourceText(view: SourceFrame.ResourceSourceFrame.ResourceSourceFrame): Promise<string> {
      const contentData =
          TextUtils.ContentData.ContentData.contentDataOrEmpty(await view.resource.requestContentData());
      return contentData.text;
    }

    assert.strictEqual(
        await getResourceText(factory.createBase64View()),
        'c2VuZGluZyB0aGlzIHV0Zi04IHN0cmluZyBhcyBhIGJpbmFyeSBtZXNzYWdlLi4u');
    assert.instanceOf(factory.createHexView(), SourceFrame.StreamingContentHexView.StreamingContentHexView);
    assert.strictEqual(
        await getResourceText(factory.createUtf8View()), 'sending this utf-8 string as a binary message...');
  });

  it('returns the right content for the "copy-to-clipboard" getters', async () => {
    const base64content = new TextUtils.ContentData.ContentData(
        'c2VuZGluZyB0aGlzIHV0Zi04IHN0cmluZyBhcyBhIGJpbmFyeSBtZXNzYWdlLi4u', true, '');
    const factory = new SourceFrame.BinaryResourceViewFactory.BinaryResourceViewFactory(
        TextUtils.StreamingContentData.StreamingContentData.from(base64content),
        'http://example.com' as Platform.DevToolsPath.UrlString, Common.ResourceType.resourceTypes.WebSocket);

    assert.strictEqual(factory.base64(), 'c2VuZGluZyB0aGlzIHV0Zi04IHN0cmluZyBhcyBhIGJpbmFyeSBtZXNzYWdlLi4u');
    assert.strictEqual(
        factory.hex(),
        '73656e64696e672074686973207574662d3820737472696e6720617320612062696e617279206d6573736167652e2e2e');
    assert.strictEqual(factory.utf8(), 'sending this utf-8 string as a binary message...');
  });
});
