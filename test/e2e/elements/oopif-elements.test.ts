
// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  expandSelectedNodeRecursively,
  waitForElementsStyleSection,
  waitForElementWithPartialText,
} from '../helpers/elements-helpers.js';

describe('The Elements tab', () => {
  it('shows OOPIF frame error inline', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/page-error.html');
    await waitForElementsStyleSection(devToolsPage, null);
    await expandSelectedNodeRecursively(devToolsPage);
    await waitForElementWithPartialText(devToolsPage, '<iframe src=');
    await waitForElementWithPartialText(devToolsPage, '404 - File not found');
  });
});
