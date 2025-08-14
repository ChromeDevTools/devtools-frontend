// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  checkStyleAttributes,
  expandSelectedNodeRecursively,
  uncheckStylesPaneCheckbox,
  waitForElementsStyleSection,
} from '../../e2e/helpers/elements-helpers.js';

describe('The Elements tab', function() {
  it('does not break further style inspection if inherited style property was disabled',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/styles-disable-inherited.html');
       await expandSelectedNodeRecursively(devToolsPage);
       const elementsContentPanel = await devToolsPage.waitFor('#elements-content');
       await devToolsPage.click('text/nested', {
         root: elementsContentPanel,
       });
       await waitForElementsStyleSection(null, devToolsPage);
       await checkStyleAttributes(['display: block;', 'font-weight: bold;'], devToolsPage);
       await devToolsPage.click('text/container', {
         root: elementsContentPanel,
       });
       await uncheckStylesPaneCheckbox('font-weight bold', devToolsPage);
       await devToolsPage.click('text/nested', {
         root: elementsContentPanel,
       });
       await checkStyleAttributes(['display: block;'], devToolsPage);
     });
});
