// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {getBrowserAndPages, goToResource} from '../../shared/helper.js';
import {COMPUTED_PROPERTY_SELECTOR, focusElementsTree, getAllPropertiesFromComputedPane, getContentOfComputedPane, getTracesFromComputedStyle, navigateToSidePane, toggleShowAllComputedProperties, waitForComputedPaneChange, waitForElementsComputedSection} from '../helpers/elements-helpers.js';

describe('The Computed pane', async () => {
  beforeEach(async function() {
    await goToResource('elements/simple-styled-page.html');
    await navigateToSidePane('Computed');
    await waitForElementsComputedSection();
    // Note that navigating to the computed pane moved focus away from the
    // elements pane. Restore it.
    await focusElementsTree();
  });

  it('can display the CSS properties of the selected element', async () => {
    const {frontend} = getBrowserAndPages();

    // Select the H1 element and wait for the computed pane to change.
    let content = await getContentOfComputedPane();
    await frontend.keyboard.press('ArrowDown');
    await waitForComputedPaneChange(content);
    await waitForElementsComputedSection();

    const h1Properties = await getAllPropertiesFromComputedPane();
    assert.strictEqual(h1Properties.length, 10, 'There should be 10 computed properties on the H1 element');

    const colorProperty = h1Properties.find(property => property && property.name === 'color');
    assert.exists(colorProperty, 'H1 element should have a color computed property');
    assert.deepEqual(colorProperty, {
      name: 'color',
      value: 'rgb(255, 0, 102)',
    });

    // Select the H2 element by pressing down again.
    content = await getContentOfComputedPane();
    await frontend.keyboard.press('ArrowDown');
    await waitForComputedPaneChange(content);
    await waitForElementsComputedSection();

    const h2Properties = await getAllPropertiesFromComputedPane();
    assert.strictEqual(h2Properties.length, 11, 'There should be 11 computed properties on the H2 element');

    const backgroundProperty = h2Properties.find(property => property && property.name === 'background-color');
    assert.exists(backgroundProperty, 'H2 element should have a background-color computed property');
    assert.deepEqual(backgroundProperty, {
      name: 'background-color',
      value: 'rgb(255, 215, 0)',
    });
  });

  it('can display inherited CSS properties of the selected element', async () => {
    const {frontend} = getBrowserAndPages();

    // Select the H1 element and wait for the computed pane to change.
    const content = await getContentOfComputedPane();
    await frontend.keyboard.press('ArrowDown');
    await waitForComputedPaneChange(content);

    await toggleShowAllComputedProperties();
    await waitForElementsComputedSection();

    const allH1Properties = await getAllPropertiesFromComputedPane();
    const alignContentProperty = allH1Properties.find(property => property && property.name === 'align-content');
    assert.exists(alignContentProperty, 'H1 element should display the inherited align-content computed property');
    assert.deepEqual(alignContentProperty, {
      name: 'align-content',
      value: 'normal',
    });
  });

  it('can show traces when clicked on a property', async () => {
    const {frontend} = getBrowserAndPages();

    // Select the H1 element and wait for the computed pane to change.
    const content = await getContentOfComputedPane();
    await frontend.keyboard.press('ArrowDown');
    await waitForComputedPaneChange(content);
    await waitForElementsComputedSection();

    const tracesText = await getTracesFromComputedStyle(COMPUTED_PROPERTY_SELECTOR);
    assert.deepEqual(tracesText, [
      '#f06body h1simple-styled-page.html:16',
      '#f05h1simple-styled-page.html:9',
    ]);
  });
});
