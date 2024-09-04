// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, goToResource, waitFor, waitForFunction} from '../../shared/helper.js';
import {
  filterComputedProperties,
  focusElementsTree,
  getAllPropertiesFromComputedPane,
  getComputedPanel,
  getComputedStyleProperties,
  getContentOfComputedPane,
  navigateToSidePane,
  toggleShowAllComputedProperties,
  waitForComputedPaneChange,
  waitForElementsComputedSection,
  waitForNumberOfComputedProperties,
  waitForPartialContentOfSelectedElementsNode,
} from '../helpers/elements-helpers.js';

describe('The Computed pane', function() {
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
    assert.strictEqual(h1Properties.length, 11, 'There should be 11 computed properties on the H1 element');

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
    assert.strictEqual(h2Properties.length, 12, 'There should be 12 computed properties on the H2 element');

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

    const getAlignContentProperty = async () => {
      const allH1Properties = await getAllPropertiesFromComputedPane();
      const prop = allH1Properties.find(property => property && property.name === 'align-content');
      return prop;
    };
    const alignContentProperty = await waitForFunction(getAlignContentProperty);
    assert.exists(alignContentProperty, 'H1 element should display the inherited align-content computed property');
    assert.deepEqual(alignContentProperty, {
      name: 'align-content',
      value: 'normal',
    });
  });

  it('remembers which properties that are expanded when re-rendering', async () => {
    const {frontend} = getBrowserAndPages();
    await frontend.keyboard.press('ArrowDown');
    const colorProperty =
        await waitFor('CSS property name: color CSS property value: rgb(255, 0, 102)', undefined, undefined, 'aria');
    await click('.arrow-icon', {
      root: colorProperty,
    });
    const isExpandedBefore = await colorProperty.evaluate(element => element.ariaExpanded);
    assert(isExpandedBefore);
    await focusElementsTree();
    await frontend.keyboard.press('ArrowDown');
    const colorPropertyAfter =
        await waitFor('CSS property name: color CSS property value: rgb(0, 0, 0)', undefined, undefined, 'aria');
    const isExpandedAfter = await colorPropertyAfter.evaluate(element => element.ariaExpanded);
    assert(isExpandedAfter);
  });

  // Skip until flake is fixed
  it.skip('[crbug.com/1346261]: allows tracing to style rules (ported layout test)', async () => {
    const {frontend} = getBrowserAndPages();
    await goToResource('elements/css-styles-variables.html');
    await waitForNumberOfComputedProperties(7);
    await toggleShowAllComputedProperties();
    await filterComputedProperties('--');
    await waitForNumberOfComputedProperties(1);
    await focusElementsTree();
    await frontend.keyboard.press('ArrowRight');
    await frontend.keyboard.press('ArrowRight');
    await waitForPartialContentOfSelectedElementsNode('"id1"');
    await waitForNumberOfComputedProperties(2);
    const computedPane = await getComputedPanel();
    await computedPane.$$eval(
        'pierce/.arrow-icon', elements => elements.map(element => (element as HTMLElement).click()));
    const expectedPropId1 = [
      {
        name: '--a',
        value: 'red',
        trace: [{
          value: 'red',
          selector: 'body',
          link: 'css-styles-variables.html:8',
        }],
      },
      {
        name: '--b',
        value: '44px',
        trace: [{
          value: '44px',
          selector: '#id1',
          link: 'css-styles-variables.html:12',
        }],
      },
    ];
    await waitForFunction(
        async () => JSON.stringify(await getComputedStyleProperties()) === JSON.stringify(expectedPropId1));
    await frontend.keyboard.press('ArrowRight');
    await frontend.keyboard.press('ArrowRight');
    await waitForPartialContentOfSelectedElementsNode('"id2"');
    const expectedPropId2 = [
      {
        name: '--a',
        value: 'green',
        trace: [
          {
            value: 'green',
            selector: '#id2',
            link: 'css-styles-variables.html:16',
          },
          {
            value: 'red',
            selector: 'body',
            link: 'css-styles-variables.html:8',
          },
        ],
      },
      {
        name: '--b',
        value: '44px',
        trace: [{
          value: '44px',
          selector: '#id1',
          link: 'css-styles-variables.html:12',
        }],
      },
    ];
    await waitForFunction(
        async () => JSON.stringify(await getComputedStyleProperties()) === JSON.stringify(expectedPropId2));
    await frontend.keyboard.press('ArrowRight');
    await frontend.keyboard.press('ArrowRight');
    await waitForPartialContentOfSelectedElementsNode('"id3"');
    const expectedPropId3 = [
      {
        name: '--a',
        value: 'green',
        trace: [
          {
            value: 'inherit',
            selector: '#id3',
            link: 'css-styles-variables.html:20',
          },
          {
            value: 'green',
            selector: '#id2',
            link: 'css-styles-variables.html:16',
          },
          {
            value: 'red',
            selector: 'body',
            link: 'css-styles-variables.html:8',
          },
        ],
      },
      {
        name: '--b',
        value: '44px',
        trace: [{
          value: '44px',
          selector: '#id1',
          link: 'css-styles-variables.html:12',
        }],
      },
    ];
    await waitForFunction(
        async () => JSON.stringify(await getComputedStyleProperties()) === JSON.stringify(expectedPropId3));
  });
});
