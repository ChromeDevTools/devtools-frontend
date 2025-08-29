// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {toggleAccessibilityPane} from '../../e2e/helpers/elements-helpers.js';

describe('Accessibility Pane in the Elements Tab', function() {
  it('displays the partial accessibility tree', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityPane(devToolsPage);
    await devToolsPage.waitForAria('Accessibility Tree');
  });

  it('shows computed name from contents for title element', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityPane(devToolsPage);
    const titleElement = await devToolsPage.waitForAria('<h1>');
    await devToolsPage.clickElement(titleElement);
    await devToolsPage.waitForAria('Contents:\xa0"Title"');
  });

  it('shows name from label for span element', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityPane(devToolsPage);
    const a11yPane = await devToolsPage.waitForAria('Accessibility panel');
    const spanElement = await devToolsPage.waitForElementWithTextContent('span-name');
    await devToolsPage.clickElement(spanElement);
    await devToolsPage.waitForAria('Name:\xa0"span-name"', a11yPane);
  });
});
