// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {waitForSoftContextMenu} from '../helpers/context-menu-helpers.js';
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
} from '../helpers/elements-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

async function goToTestPageAndSelectTestElement(
    inspectedPage: InspectedPage, devToolsPage: DevToolsPage, path = 'inline_editor/default.html') {
  await inspectedPage.goToResource(path);
  await waitForContentOfSelectedElementsNode(devToolsPage, '<body>\u200B');
  await clickNthChildOfSelectedElementNode(devToolsPage, 1);
  await waitForContentOfSelectedElementsNode(devToolsPage,
                                             '<div id=\u200B"inspected">\u200BInspected div\u200B</div>\u200B');
}

async function assertColorSwatch(
    containerFactory: () => Promise<puppeteer.ElementHandle|undefined>, expectedColor: string,
    devToolsPage: DevToolsPage) {
  const color = await devToolsPage.waitForFunction(async () => {
    const container = await containerFactory();
    if (!container) {
      return container;
    }
    const swatch = await getColorSwatch(devToolsPage, container, 0);
    if (!swatch) {
      return swatch;
    }

    return await getColorSwatchColor(devToolsPage, container, 0);
  });
  assert.strictEqual(color, expectedColor, 'Color swatch has the right color');
}

async function assertNoColorSwatch(container: puppeteer.ElementHandle|undefined, devToolsPage: DevToolsPage) {
  assert.isOk(container, 'Container not found');
  const swatch = await getColorSwatch(devToolsPage, container, 0);
  assert.isUndefined(swatch, 'No color swatch found');
}

describe('The color swatch', () => {
  it('is displayed for color properties in the Styles pane', async ({devToolsPage, inspectedPage}) => {
    await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);

    await waitForCSSPropertyValue(devToolsPage, '#inspected', 'color', 'red', undefined);
    const property = () => getCSSPropertyInRule(devToolsPage, '#inspected', 'color', undefined);

    await assertColorSwatch(property, 'red', devToolsPage);
  });

  it('is displayed for color properties in the Computed pane', async ({devToolsPage, inspectedPage}) => {
    await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);
    await navigateToSidePane(devToolsPage, 'Computed');
    await waitForElementsComputedSection(devToolsPage);

    const property = () => getPropertyFromComputedPane(devToolsPage, 'color');
    await assertColorSwatch(property, 'rgb(255, 0, 0)', devToolsPage);
  });

  it('is not displayed for non-color properties in the Styles pane', async ({devToolsPage, inspectedPage}) => {
    await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);

    await waitForCSSPropertyValue(devToolsPage, '#inspected', 'margin', '10px', undefined);
    const property = await getCSSPropertyInRule(devToolsPage, '#inspected', 'margin', undefined);

    await assertNoColorSwatch(property, devToolsPage);
  });

  it('is not displayed for non-color properties that have color-looking values in the Styles pane',
     async ({devToolsPage, inspectedPage}) => {
       await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);

       await waitForCSSPropertyValue(devToolsPage, '#inspected', 'animation-name', 'black', undefined);
       const property = await getCSSPropertyInRule(devToolsPage, '#inspected', 'animation-name', undefined);

       await assertNoColorSwatch(property, devToolsPage);
     });

  it('is not displayed for color properties that have color-looking values in the Styles pane',
     async ({devToolsPage, inspectedPage}) => {
       await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);

       await waitForCSSPropertyValue(devToolsPage, '#inspected', 'background', 'url(red green blue.jpg)', undefined);
       const property = await getCSSPropertyInRule(devToolsPage, '#inspected', 'background', undefined);

       await assertNoColorSwatch(property, devToolsPage);
     });

  it('is displayed for var() functions that compute to colors in the Styles pane',
     async ({devToolsPage, inspectedPage}) => {
       await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);

       await waitForCSSPropertyValue(devToolsPage, '#inspected', 'background-color', 'var(--variable)', undefined);
       const property = () => getCSSPropertyInRule(devToolsPage, '#inspected', 'background-color', undefined);
       await assertColorSwatch(property, 'blue', devToolsPage);
     });

  it('is not displayed for var() functions that have color-looking names but do not compute to colors in the Styles pane',
     async ({devToolsPage, inspectedPage}) => {
       await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);

       await waitForCSSPropertyValue(devToolsPage, '#inspected', 'border-color', 'var(--red)', undefined);
       const property = await getCSSPropertyInRule(devToolsPage, '#inspected', 'border-color', undefined);
       await assertNoColorSwatch(property, devToolsPage);
     });

  it('is displayed for color-looking custom properties in the Styles pane', async ({devToolsPage, inspectedPage}) => {
    await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);

    await waitForCSSPropertyValue(devToolsPage, '#inspected', '--variable', 'blue', undefined);
    const property = () => getCSSPropertyInRule(devToolsPage, '#inspected', '--variable', undefined);
    await assertColorSwatch(property, 'blue', devToolsPage);
  });

  it('supports shift-clicking for color properties in the Styles pane', async ({devToolsPage, inspectedPage}) => {
    await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);

    await waitForCSSPropertyValue(devToolsPage, '#inspected', 'color', 'red', undefined);
    const property = await getCSSPropertyInRule(devToolsPage, '#inspected', 'color', undefined);
    assert.isOk(property, 'Property not found');
    await shiftClickColorSwatch(
        devToolsPage, property, 0,
        'Panel: elements > Pane: styles > Section: style-properties > Tree > TreeItem: color > Value');

    const menu = await waitForSoftContextMenu(devToolsPage);
    await devToolsPage.click('[aria-label="#f00"]', {root: menu});
    await waitForCSSPropertyValue(devToolsPage, '#inspected', 'color', '#f00', undefined);
  });

  it('supports shift-clicking for colors next to var() functions', async ({devToolsPage, inspectedPage}) => {
    await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);

    await waitForCSSPropertyValue(devToolsPage, '#inspected', 'background-color', 'var(--variable)', undefined);
    const property = await getCSSPropertyInRule(devToolsPage, '#inspected', 'background-color', undefined);
    assert.isOk(property, 'Property not found');
    await shiftClickColorSwatch(
        devToolsPage, property, 0,
        'Panel: elements > Pane: styles > Section: style-properties > Tree > TreeItem: background-color > Value');

    const menu = await waitForSoftContextMenu(devToolsPage);
    await devToolsPage.click('[aria-label="#00f"]', {root: menu});
    await waitForCSSPropertyValue(devToolsPage, '#inspected', 'background-color', '#00f', undefined);
  });

  it('is updated when the color value is updated in the Styles pane', async ({devToolsPage, inspectedPage}) => {
    await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);

    await waitForCSSPropertyValue(devToolsPage, '#inspected', 'color', 'red', undefined);
    let property = () => getCSSPropertyInRule(devToolsPage, '#inspected', 'color', undefined);
    await assertColorSwatch(property, 'red', devToolsPage);

    await editCSSProperty(devToolsPage, '#inspected', 'color', 'blue');

    await waitForCSSPropertyValue(devToolsPage, '#inspected', 'color', 'blue', undefined);
    property = () => getCSSPropertyInRule(devToolsPage, '#inspected', 'color', undefined);
    await assertColorSwatch(property, 'blue', devToolsPage);
  });

  it('is updated for a var() function when the customer property value changes in the Styles pane',
     async ({devToolsPage, inspectedPage}) => {
       await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage, 'inline_editor/var-chain.html');

       await waitForCSSPropertyValue(devToolsPage, '#inspected', '--bar', 'var(--baz)', undefined);
       await waitForCSSPropertyValue(devToolsPage, '#inspected', 'color', 'var(--bar)', undefined);

       let barProperty = () => getCSSPropertyInRule(devToolsPage, '#inspected', '--bar', undefined);
       let colorProperty = () => getCSSPropertyInRule(devToolsPage, '#inspected', 'color', undefined);
       await assertColorSwatch(barProperty, 'red', devToolsPage);
       await assertColorSwatch(colorProperty, 'red', devToolsPage);

       await editCSSProperty(devToolsPage, '#inspected', '--baz', 'blue');
       await waitForCSSPropertyValue(devToolsPage, '#inspected', '--baz', 'blue', undefined);

       barProperty = () => getCSSPropertyInRule(devToolsPage, '#inspected', '--bar', undefined);
       colorProperty = () => getCSSPropertyInRule(devToolsPage, '#inspected', 'color', undefined);
       await assertColorSwatch(barProperty, 'blue', devToolsPage);
       await assertColorSwatch(colorProperty, 'blue', devToolsPage);
     });
});
