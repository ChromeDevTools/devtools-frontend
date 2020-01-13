// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import '/front_end/root.js';
import {Widget} from '/front_end/ui/Widget.js';

describe('Widget', () => {
  after(() => {
    // Clean up polluted globals.
    // TODO(https://crbug.com/1006759): These need removing once the ESM migration is complete.
    const globalObj = (self as any);
    delete globalObj.Root;
  });

  it('can be instantiated correctly', () => {
    const widget = new Widget(false, false);
    assert.isFalse(widget.isShowing(), 'widget should not be showing upon creation');
  });

  // TODO continue writing tests here or use another describe block
});
