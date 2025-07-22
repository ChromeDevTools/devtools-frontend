// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {waitForSoftContextMenu} from '../../e2e/helpers/context-menu-helpers.js';
import {
  clickNthChildOfSelectedElementNode,
  editCSSProperty,
  getColorSwatch,
  getColorSwatchColor,
  getCSSPropertyInRule,
  getPropertyFromComputedPane,
  navigateToSidePane,
  shiftClickColorSwatch,
  waitForContentOfSelectedElementsNode,
  waitForCSSPropertyValue,
  waitForElementsComputedSection,
} from '../../e2e/helpers/elements-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

async function goToTestPageAndSelectTestElement(
    inspectedPage: InspectedPage, devToolsPage: DevToolsPage, path = 'inline_editor/default.html') {
  await inspectedPage.goToResource(path);
  await waitForContentOfSelectedElementsNode('<body>\u200B', devToolsPage);
  await clickNthChildOfSelectedElementNode(1, devToolsPage);
  await waitForContentOfSelectedElementsNode(
      '<div id=\u200B"inspected">\u200BInspected div\u200B</div>\u200B', devToolsPage);
}

async function assertColorSwatch(
    container: puppeteer.ElementHandle|undefined, expectedColor: string, devToolsPage: DevToolsPage) {
  assert.isOk(container, 'Container not found');
  const swatch = await getColorSwatch(container, 0, devToolsPage);
  assert.isTrue(Boolean(swatch), 'Color swatch found');

  const color = await getColorSwatchColor(container, 0, devToolsPage);
  assert.strictEqual(color, expectedColor, 'Color swatch has the right color');
}

async function assertNoColorSwatch(container: puppeteer.ElementHandle|undefined, devToolsPage: DevToolsPage) {
  assert.isOk(container, 'Container not found');
  const swatch = await getColorSwatch(container, 0, devToolsPage);
  assert.isUndefined(swatch, 'No color swatch found');
}

describe('The color swatch', () => {
  it('is displayed for color properties in the Styles pane', async ({devToolsPage, inspectedPage}) => {
    await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);

    await waitForCSSPropertyValue('#inspected', 'color', 'red', undefined, devToolsPage);
    const property = await getCSSPropertyInRule('#inspected', 'color', undefined, devToolsPage);

    await assertColorSwatch(property, 'red', devToolsPage);
  });

  it('is displayed for color properties in the Computed pane', async ({devToolsPage, inspectedPage}) => {
    await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);
    await navigateToSidePane('Computed', devToolsPage);
    await waitForElementsComputedSection(devToolsPage);

    const property = await getPropertyFromComputedPane('color', devToolsPage);
    await assertColorSwatch(property, 'rgb(255, 0, 0)', devToolsPage);
  });

  it('is not displayed for non-color properties in the Styles pane', async ({devToolsPage, inspectedPage}) => {
    await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);

    await waitForCSSPropertyValue('#inspected', 'margin', '10px', undefined, devToolsPage);
    const property = await getCSSPropertyInRule('#inspected', 'margin', undefined, devToolsPage);

    await assertNoColorSwatch(property, devToolsPage);
  });

  it('is not displayed for non-color properties that have color-looking values in the Styles pane',
     async ({devToolsPage, inspectedPage}) => {
       await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);

       await waitForCSSPropertyValue('#inspected', 'animation-name', 'black', undefined, devToolsPage);
       const property = await getCSSPropertyInRule('#inspected', 'animation-name', undefined, devToolsPage);

       await assertNoColorSwatch(property, devToolsPage);
     });

  it('is not displayed for color properties that have color-looking values in the Styles pane',
     async ({devToolsPage, inspectedPage}) => {
       await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);

       await waitForCSSPropertyValue('#inspected', 'background', 'url(red green blue.jpg)', undefined, devToolsPage);
       const property = await getCSSPropertyInRule('#inspected', 'background', undefined, devToolsPage);

       await assertNoColorSwatch(property, devToolsPage);
     });

  it('is displayed for var() functions that compute to colors in the Styles pane',
     async ({devToolsPage, inspectedPage}) => {
       await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);

       await waitForCSSPropertyValue('#inspected', 'background-color', 'var(--variable)', undefined, devToolsPage);
       const property = await getCSSPropertyInRule('#inspected', 'background-color', undefined, devToolsPage);
       await assertColorSwatch(property, 'blue', devToolsPage);
     });

  it('is not displayed for var() functions that have color-looking names but do not compute to colors in the Styles pane',
     async ({devToolsPage, inspectedPage}) => {
       await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);

       await waitForCSSPropertyValue('#inspected', 'border-color', 'var(--red)', undefined, devToolsPage);
       const property = await getCSSPropertyInRule('#inspected', 'border-color', undefined, devToolsPage);
       await assertNoColorSwatch(property, devToolsPage);
     });

  it('is displayed for color-looking custom properties in the Styles pane', async ({devToolsPage, inspectedPage}) => {
    await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);

    await waitForCSSPropertyValue('#inspected', '--variable', 'blue', undefined, devToolsPage);
    const property = await getCSSPropertyInRule('#inspected', '--variable', undefined, devToolsPage);
    await assertColorSwatch(property, 'blue', devToolsPage);
  });

  it('supports shift-clicking for color properties in the Styles pane', async ({devToolsPage, inspectedPage}) => {
    await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);

    await waitForCSSPropertyValue('#inspected', 'color', 'red', undefined, devToolsPage);
    const property = await getCSSPropertyInRule('#inspected', 'color', undefined, devToolsPage);
    assert.isOk(property, 'Property not found');
    await shiftClickColorSwatch(
        property, 0, 'Panel: elements > Pane: styles > Section: style-properties > Tree > TreeItem: color > Value',
        devToolsPage);

    const menu = await waitForSoftContextMenu(devToolsPage);
    await devToolsPage.click('[aria-label="#f00"]', {root: menu});
    await waitForCSSPropertyValue('#inspected', 'color', '#f00', undefined, devToolsPage);
  });

  it('supports shift-clicking for colors next to var() functions', async ({devToolsPage, inspectedPage}) => {
    await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);

    await waitForCSSPropertyValue('#inspected', 'background-color', 'var(--variable)', undefined, devToolsPage);
    const property = await getCSSPropertyInRule('#inspected', 'background-color', undefined, devToolsPage);
    assert.isOk(property, 'Property not found');
    await shiftClickColorSwatch(
        property, 0,
        'Panel: elements > Pane: styles > Section: style-properties > Tree > TreeItem: background-color > Value',
        devToolsPage);

    const menu = await waitForSoftContextMenu(devToolsPage);
    await devToolsPage.click('[aria-label="#00f"]', {root: menu});
    await waitForCSSPropertyValue('#inspected', 'background-color', '#00f', undefined, devToolsPage);
  });

  it('is updated when the color value is updated in the Styles pane', async ({devToolsPage, inspectedPage}) => {
    await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);

    await waitForCSSPropertyValue('#inspected', 'color', 'red', undefined, devToolsPage);
    let property = await getCSSPropertyInRule('#inspected', 'color', undefined, devToolsPage);
    await assertColorSwatch(property, 'red', devToolsPage);

    await editCSSProperty('#inspected', 'color', 'blue', devToolsPage);

    await waitForCSSPropertyValue('#inspected', 'color', 'blue', undefined, devToolsPage);
    property = await getCSSPropertyInRule('#inspected', 'color', undefined, devToolsPage);
    await assertColorSwatch(property, 'blue', devToolsPage);
  });

  it('is updated for a var() function when the customer property value changes in the Styles pane',
     async ({devToolsPage, inspectedPage}) => {
       await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage, 'inline_editor/var-chain.html');

       await waitForCSSPropertyValue('#inspected', '--bar', 'var(--baz)', undefined, devToolsPage);
       await waitForCSSPropertyValue('#inspected', 'color', 'var(--bar)', undefined, devToolsPage);

       let barProperty = await getCSSPropertyInRule('#inspected', '--bar', undefined, devToolsPage);
       let colorProperty = await getCSSPropertyInRule('#inspected', 'color', undefined, devToolsPage);
       await assertColorSwatch(barProperty, 'red', devToolsPage);
       await assertColorSwatch(colorProperty, 'red', devToolsPage);

       await editCSSProperty('#inspected', '--baz', 'blue', devToolsPage);
       await waitForCSSPropertyValue('#inspected', '--baz', 'blue', undefined, devToolsPage);

       barProperty = await getCSSPropertyInRule('#inspected', '--bar', undefined, devToolsPage);
       colorProperty = await getCSSPropertyInRule('#inspected', 'color', undefined, devToolsPage);
       await assertColorSwatch(barProperty, 'blue', devToolsPage);
       await assertColorSwatch(colorProperty, 'blue', devToolsPage);
     });
});
