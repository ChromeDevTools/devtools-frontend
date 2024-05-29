// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';

import * as TextUtils from './text_utils.js';

describe('StaticContentProvider', () => {
  const jsonResource = Common.ResourceType.ResourceType.fromMimeType('application/json');
  const testUrl = 'www.testurl.com' as Platform.DevToolsPath.UrlString;

  it('can be created from a string source', () => {
    const provider =
        TextUtils.StaticContentProvider.StaticContentProvider.fromString(testUrl, jsonResource, '{ "hello": "world" }');

    assert.instanceOf(provider, TextUtils.StaticContentProvider.StaticContentProvider);
  });

  it('lazily fetches its contents when requestContent is called', async () => {
    const jsonContent = '{ "hello": "world" }';
    const provider =
        TextUtils.StaticContentProvider.StaticContentProvider.fromString(testUrl, jsonResource, jsonContent);

    const contents = await provider.requestContentData();

    assert.instanceOf(contents, TextUtils.ContentData.ContentData);
    assert.strictEqual(contents.text, jsonContent);
    assert.isFalse(contents.createdFromBase64);
  });
});
