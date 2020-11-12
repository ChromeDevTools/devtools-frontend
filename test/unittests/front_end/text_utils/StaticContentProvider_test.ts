// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../front_end/common/common.js';
import * as TextUtils from '../../../../front_end/text_utils/text_utils.js';

const {assert} = chai;

describe('StaticContentProvider', () => {
  const jsonResource = Common.ResourceType.ResourceType.fromMimeType('application/json');

  it('can be created from a string source', () => {
    const provider = TextUtils.StaticContentProvider.StaticContentProvider.fromString(
        'www.testurl.com', jsonResource, '{ "hello": "world" }');

    assert.instanceOf(provider, TextUtils.StaticContentProvider.StaticContentProvider);
  });

  it('lazily fetches its contents when requestContent is called', async () => {
    const jsonContent = '{ "hello": "world" }';
    const provider =
        TextUtils.StaticContentProvider.StaticContentProvider.fromString('www.testurl.com', jsonResource, jsonContent);

    const contents = await provider.requestContent();

    assert.deepEqual(contents, {
      content: jsonContent,
      isEncoded: false,
    });
  });
});
