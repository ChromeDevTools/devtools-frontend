// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {getBrowserAndPages, goToResource} from '../../shared/helper.js';
import {focusElementsTree, getAllPropertiesFromComputedPane, getContentOfComputedPane, navigateToSidePane, waitForComputedPaneChange, waitForElementsComputedSection} from '../helpers/elements-helpers.js';

describe('The Computed pane', async () => {
  it('can display the CSS properties of the selected element', async () => {
    const {frontend} = getBrowserAndPages();

    await goToResource('elements/simple-styled-page.html');
    await navigateToSidePane('Computed');
    await waitForElementsComputedSection();

    // Note that navigating to the computed pane moved focus away from the elements pane. Restore it.
    await focusElementsTree();

    // Select the H1 element and wait for the computed pane to change.
    let content = await getContentOfComputedPane();
    await frontend.keyboard.press('ArrowDown');
    await waitForComputedPaneChange(content);

    const h1Properties = await getAllPropertiesFromComputedPane();
    assert.strictEqual(h1Properties.length, 10, 'There should be 10 computed properties on the H1 element');

    const colorProperty = h1Properties.find(property => property && property.name === 'color');
    assert.isTrue(!!colorProperty, 'H1 element should have a color computed property');
    assert.strictEqual(colorProperty && colorProperty.value, 'rgb(255, 0, 102)');

    // Select the H2 element by pressing down again.
    content = await getContentOfComputedPane();
    await frontend.keyboard.press('ArrowDown');
    await waitForComputedPaneChange(content);

    const h2Properties = await getAllPropertiesFromComputedPane();
    assert.strictEqual(h2Properties.length, 11, 'There should be 11 computed properties on the H2 element');

    const backgroundProperty = h2Properties.find(property => property && property.name === 'background-color');
    assert.isTrue(!!backgroundProperty, 'H2 element should have a background-color computed property');
    assert.strictEqual(backgroundProperty && backgroundProperty.value, 'rgb(255, 215, 0)');
  });
});
