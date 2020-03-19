// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ResourceType} from '../../../../front_end/common/ResourceType.js';
import {StaticContentProvider} from '../../../../front_end/text_utils/StaticContentProvider.js';

const {assert} = chai;

describe('StaticContentProvider', () => {
  const jsonResource = ResourceType.fromMimeType('application/json');

  it('can be created from a string source', () => {
    const provider = StaticContentProvider.fromString('www.testurl.com', jsonResource, '{ "hello": "world" }');

    assert.instanceOf(provider, StaticContentProvider);
  });

  it('lazily fetches its contents when requestContent is called', async () => {
    const jsonContent = '{ "hello": "world" }';
    const provider = StaticContentProvider.fromString('www.testurl.com', jsonResource, jsonContent);

    const contents = await provider.requestContent();

    assert.deepEqual(contents, {
      content: jsonContent,
      isEncoded: false,
    });
  });
});
