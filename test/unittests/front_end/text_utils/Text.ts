// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {Text} from '../../../../front_end/text_utils/Text.js';

describe('Text', () => {
  it('can be instantiated successfully', () => {
    const testVal = 'Test Value';
    const text = new Text(testVal);
    assert.equal(text.value(), testVal, 'value was not set or retrieved correctly');
  });

  // TODO continue writing tests here or use another describe block
});
