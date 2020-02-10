// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '/front_end/common/common.js';

describe('UIString', () => {
  it('serializes UI strings', () => {
    const output = Common.UIString.serializeUIString('foo');
    assert.equal(output, JSON.stringify({
      messageParts: ['foo'],
      values: [],
    }));
  });
});
