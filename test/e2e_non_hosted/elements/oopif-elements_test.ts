
// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  expandSelectedNodeRecursively,
  waitForElementsStyleSection,
  waitForElementWithPartialText,
} from '../../e2e/helpers/elements-helpers.js';

describe('The Elements tab', () => {
  it('shows OOPIF frame error inline', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/page-error.html');
    await waitForElementsStyleSection(null, devToolsPage);
    await expandSelectedNodeRecursively(devToolsPage);
    await waitForElementWithPartialText('<iframe src=', devToolsPage);
    await waitForElementWithPartialText('404 - File not found', devToolsPage);
  });
});
