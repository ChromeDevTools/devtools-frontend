
// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {goToResource} from '../../shared/helper.js';

import {
  expandSelectedNodeRecursively,
  waitForElementsStyleSection,
  waitForElementWithPartialText,
} from '../helpers/elements-helpers.js';

describe('The Elements tab', () => {
  it('shows OOPIF frame error inline', async () => {
    await goToResource('elements/page-error.html');
    await waitForElementsStyleSection();
    await expandSelectedNodeRecursively();
    await waitForElementWithPartialText('<iframe src=');
    await waitForElementWithPartialText('404 - File not found');
  });
});
