// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {clickElement, goToResource, waitForAria, waitForElementWithTextContent} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {toggleAccessibilityPane} from '../helpers/elements-helpers.js';

describe('Accessibility Pane in the Elements Tab', async function() {
  it('displays the partial accessibility tree', async () => {
    await goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityPane();
    void waitForAria('Accessibility Tree');
  });

  it('shows computed name from contents for title element', async () => {
    await goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityPane();
    const titleElement = await waitForAria('<h1>');
    await clickElement(titleElement);
    await waitForAria('Contents:\xa0"Title"');
  });

  it('shows name from label for span element', async () => {
    await goToResource('elements/accessibility-simple-page.html');
    await toggleAccessibilityPane();
    const a11yPane = await waitForAria('Accessibility panel');
    const spanElement = await waitForElementWithTextContent('span-name');
    await clickElement(spanElement);
    await waitForAria('Name:\xa0"span-name"', a11yPane);
  });
});
