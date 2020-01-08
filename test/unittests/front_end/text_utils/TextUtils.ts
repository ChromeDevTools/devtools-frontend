// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {FilterParser} from '../../../../front_end/text_utils/TextUtils.js';

describe('FilterParser', () => {
  it('can be instantiated successfully', () => {
    const testVal = 'TestVal1';
    const filterParser = new FilterParser(['TestVal1']);
    const result = filterParser.parse(testVal);
    assert.equal(result[0].text, testVal, 'text value was not returned correctly');
    assert.equal(result[0].negative, false, 'negative value was not returned correctly');
  });

  // TODO continue writing tests here or use another describe block
});
