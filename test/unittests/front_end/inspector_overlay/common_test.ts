// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {createElement} from '../../../../front_end/inspector_overlay/common.js';

describe('common', () => {
  it('createElement', () => {
    assert.instanceOf(createElement('div', 'test'), HTMLDivElement);
  });
});
