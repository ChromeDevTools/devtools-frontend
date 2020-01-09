// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {XWidget} from '/front_end/ui/XWidget.js';

describe('XWidget', () => {
  it('can be instantiated correctly', () => {
    const xWidget = new XWidget();
    assert.isFalse(xWidget.isShowing(), 'xwidget should not be showing upon initialization');
  });

  // TODO continue writing tests here or use another describe block
});
