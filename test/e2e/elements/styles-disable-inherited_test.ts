// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {goToResource, waitFor, waitForElementWithTextContent} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  checkStyleAttributes,
  expandSelectedNodeRecursively,
  uncheckStylesPaneCheckbox,
  waitForElementsStyleSection,
} from '../helpers/elements-helpers.js';

describe('The Elements tab', async function() {
  it('does not break further style inspection if inherited style property was disabled', async () => {
    await goToResource('elements/styles-disable-inherited.html');
    await expandSelectedNodeRecursively();
    const elementsContentPanel = await waitFor('#elements-content');
    const nested = await waitForElementWithTextContent('nested', elementsContentPanel);
    await nested.click();
    await waitForElementsStyleSection();
    await checkStyleAttributes(['display: block;', 'font-weight: bold;']);
    const container = await waitForElementWithTextContent('container', elementsContentPanel);
    await container.click();
    await uncheckStylesPaneCheckbox('font-weight bold');
    await nested.click();
    await checkStyleAttributes(['display: block;']);
  });
});
