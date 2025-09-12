// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

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
} from '../../e2e/helpers/elements-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

describe('The Computed pane', function() {
  async function openComputedPane(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await inspectedPage.goToResource('elements/simple-styled-page.html');
    await navigateToSidePane('Computed', devToolsPage);
    await waitForElementsComputedSection(devToolsPage);
    // Note that navigating to the computed pane moved focus away from the
    // elements pane. Restore it.
    await focusElementsTree(devToolsPage);
  }

  it('can display the CSS properties of the selected element', async ({devToolsPage, inspectedPage}) => {
    await openComputedPane(devToolsPage, inspectedPage);
    // Select the H1 element and wait for the computed pane to change.
    let content = await getContentOfComputedPane(devToolsPage);
    await devToolsPage.pressKey('ArrowDown');
    await waitForComputedPaneChange(content, devToolsPage);
    await waitForElementsComputedSection(devToolsPage);

    const h1Properties = await getAllPropertiesFromComputedPane(devToolsPage);
    assert.lengthOf(h1Properties, 11, 'There should be 11 computed properties on the H1 element');

    const colorProperty = h1Properties.find(property => property && property.name === 'color');
    assert.exists(colorProperty, 'H1 element should have a color computed property');
    assert.deepEqual(colorProperty, {
      name: 'color',
      value: 'rgb(255, 0, 102)',
    });

    // Select the H2 element by pressing down again.
    content = await getContentOfComputedPane(devToolsPage);
    await devToolsPage.pressKey('ArrowDown');
    await waitForComputedPaneChange(content, devToolsPage);
    await waitForElementsComputedSection(devToolsPage);

    const h2Properties = await getAllPropertiesFromComputedPane(devToolsPage);
    assert.lengthOf(h2Properties, 12, 'There should be 12 computed properties on the H2 element');

    const backgroundProperty = h2Properties.find(property => property && property.name === 'background-color');
    assert.exists(backgroundProperty, 'H2 element should have a background-color computed property');
    assert.deepEqual(backgroundProperty, {
      name: 'background-color',
      value: 'rgb(255, 215, 0)',
    });
  });

  it('can display inherited CSS properties of the selected element', async ({devToolsPage, inspectedPage}) => {
    await openComputedPane(devToolsPage, inspectedPage);
    // Select the H1 element and wait for the computed pane to change.
    const content = await getContentOfComputedPane(devToolsPage);
    await devToolsPage.pressKey('ArrowDown');
    await waitForComputedPaneChange(content, devToolsPage);

    await toggleShowAllComputedProperties(devToolsPage);
    await waitForElementsComputedSection(devToolsPage);

    const getAlignContentProperty = async () => {
      const allH1Properties = await getAllPropertiesFromComputedPane(devToolsPage);
      const prop = allH1Properties.find(property => property && property.name === 'align-content');
      return prop;
    };
    const alignContentProperty = await devToolsPage.waitForFunction(getAlignContentProperty);
    assert.exists(alignContentProperty, 'H1 element should display the inherited align-content computed property');
    assert.deepEqual(alignContentProperty, {
      name: 'align-content',
      value: 'normal',
    });
  });

  it('remembers which properties that are expanded when re-rendering', async ({devToolsPage, inspectedPage}) => {
    await openComputedPane(devToolsPage, inspectedPage);
    await devToolsPage.pressKey('ArrowDown');
    const colorProperty = await devToolsPage.waitFor(
        'CSS property name: color CSS property value: rgb(255, 0, 102)', undefined, undefined, 'aria');
    await devToolsPage.click('.arrow-icon', {
      root: colorProperty,
    });
    const isExpandedBefore = await colorProperty.evaluate(element => element.ariaExpanded);
    assert(isExpandedBefore);
    await focusElementsTree(devToolsPage);
    await devToolsPage.pressKey('ArrowDown');
    const colorPropertyAfter = await devToolsPage.waitFor(
        'CSS property name: color CSS property value: rgb(0, 0, 0)', undefined, undefined, 'aria');
    const isExpandedAfter = await colorPropertyAfter.evaluate(element => element.ariaExpanded);
    assert(isExpandedAfter);
  });

  it('allows tracing to style rules (ported layout test)', async ({devToolsPage, inspectedPage}) => {
    await openComputedPane(devToolsPage, inspectedPage);
    await inspectedPage.goToResource('elements/css-styles-variables.html');
    await waitForNumberOfComputedProperties(7, devToolsPage);
    await toggleShowAllComputedProperties(devToolsPage);
    await filterComputedProperties('--', devToolsPage);
    await waitForNumberOfComputedProperties(1, devToolsPage);
    await focusElementsTree(devToolsPage);
    await devToolsPage.pressKey('ArrowRight');
    await devToolsPage.pressKey('ArrowRight');
    await waitForPartialContentOfSelectedElementsNode('"id1"', devToolsPage);
    await waitForNumberOfComputedProperties(2, devToolsPage);
    const computedPane = await getComputedPanel(devToolsPage);
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
    await devToolsPage.waitForFunction(
        async () => JSON.stringify(await getComputedStyleProperties(devToolsPage)) === JSON.stringify(expectedPropId1));
    await devToolsPage.pressKey('ArrowRight');
    await devToolsPage.pressKey('ArrowRight');
    await waitForPartialContentOfSelectedElementsNode('"id2"', devToolsPage);
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
    await devToolsPage.waitForFunction(
        async () => JSON.stringify(await getComputedStyleProperties(devToolsPage)) === JSON.stringify(expectedPropId2));
    await devToolsPage.pressKey('ArrowRight');
    await devToolsPage.pressKey('ArrowRight');
    await waitForPartialContentOfSelectedElementsNode('"id3"', devToolsPage);
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
    await devToolsPage.waitForFunction(
        async () => JSON.stringify(await getComputedStyleProperties(devToolsPage)) === JSON.stringify(expectedPropId3));
  });
});
