// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as TextUtils from '../../../../../front_end/models/text_utils/text_utils.js';

const {assert} = chai;

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

    const contents = await provider.requestContent();

    assert.deepEqual(contents, {
      content: jsonContent,
      isEncoded: false,
    });
  });
});
