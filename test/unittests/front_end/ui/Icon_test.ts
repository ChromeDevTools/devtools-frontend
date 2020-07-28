// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as UI from '../../../../front_end/ui/ui.js';

describe('Icon', () => {
  it('can create an empty instance without issues', () => {
    const icon = UI.Icon.Icon.create();
    assert.strictEqual(icon.tagName, 'SPAN', 'icon span element was not created correctly');
    assert.strictEqual(icon.getAttribute('is'), 'ui-icon', 'icon span element "is" attribute was not set correctly');
  });

  // TODO continue writing tests here or use another describe block
});
