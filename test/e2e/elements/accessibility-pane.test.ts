// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {toggleAccessibilityPane} from '../helpers/elements-helpers.js';

describe('Accessibility Pane in the Elements Tab', function() {
  it('displays the accessibility pane', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityPane(devToolsPage);
    await devToolsPage.waitForAria('Show accessibility tree');
  });

  it('shows computed name from contents for title element', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityPane(devToolsPage);
    await devToolsPage.click('[aria-label="<h1>"]');
    await devToolsPage.waitForAria('Contents:\xa0"Title"');
  });

  it('shows name from label for span element', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityPane(devToolsPage);
    const a11yPane = await devToolsPage.waitForAria('Accessibility panel');
    const spanElement = await devToolsPage.waitForElementWithTextContent('span-name');
    await devToolsPage.click('text/span-name', {root: spanElement});
    await devToolsPage.waitForAria('Name:\xa0"span-name"', a11yPane);
  });
});
