// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {FormattedContentBuilder} from '../../../../front_end/formatter_worker/FormattedContentBuilder.js';

describe('FormattedContentBuilder', () => {
  it('can add a token successfully', () => {
    const formattedContentBuilder = new FormattedContentBuilder('  ');
    formattedContentBuilder.addToken('Test Script', 0);
    assert.equal(formattedContentBuilder.content(), 'Test Script', 'token was not added or retrieved correctly');
  });

  // TODO continue writing tests here or use another describe block
});
