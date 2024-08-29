// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, goToResource, waitFor} from '../../shared/helper.js';

import {
  checkStyleAttributes,
  expandSelectedNodeRecursively,
  uncheckStylesPaneCheckbox,
  waitForElementsStyleSection,
} from '../helpers/elements-helpers.js';

describe('The Elements tab', function() {
  it('does not break further style inspection if inherited style property was disabled', async () => {
    await goToResource('elements/styles-disable-inherited.html');
    await expandSelectedNodeRecursively();
    const elementsContentPanel = await waitFor('#elements-content');
    await click('text/nested', {
      root: elementsContentPanel,
    });
    await waitForElementsStyleSection();
    await checkStyleAttributes(['display: block;', 'font-weight: bold;']);
    await click('text/container', {
      root: elementsContentPanel,
    });
    await uncheckStylesPaneCheckbox('font-weight bold');
    await click('text/nested', {
      root: elementsContentPanel,
    });
    await checkStyleAttributes(['display: block;']);
  });
});
