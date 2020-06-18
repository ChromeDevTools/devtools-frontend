// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {getAllPropertiesFromComputedPane, getContentOfComputedPane, keyboardNavigateInElementsTree, setupComputedPaneTest, waitForComputedPaneChange} from '../helpers/elements-helpers.js';

describe('The Computed pane', async () => {
  it('can display a simple color property value', async () => {
    await setupComputedPaneTest('elements/simple-styled-page.html');

    // Select the H1 element by pressing down once.
    const content = await getContentOfComputedPane();
    await keyboardNavigateInElementsTree(['ArrowDown']);
    await waitForComputedPaneChange(content);

    const properties = await getAllPropertiesFromComputedPane();
    assert.strictEqual(properties.length, 10, 'The right number of properties was found');

    const property = properties.find(property => property && property.name === 'color');
    assert.isTrue(!!property, 'The computed property was found');
    assert.strictEqual(property && property.value, 'rgb(255, 0, 102)', 'The computed property has the right value');
  });

  it('can display a simple background-color property value', async () => {
    await setupComputedPaneTest('elements/simple-styled-page.html');

    // Select the H2 element by pressing down twice.
    const content = await getContentOfComputedPane();
    await keyboardNavigateInElementsTree(['ArrowDown', 'ArrowDown']);
    await waitForComputedPaneChange(content);

    const properties = await getAllPropertiesFromComputedPane();
    assert.strictEqual(properties.length, 11, 'The right number of properties was found');

    const property = properties.find(property => property && property.name === 'background-color');
    assert.isTrue(!!property, 'The computed property was found');
    assert.strictEqual(property && property.value, 'rgb(255, 215, 0)', 'The computed property has the right value');
  });
});
