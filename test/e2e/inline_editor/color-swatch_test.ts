// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {waitForSoftContextMenu} from '../helpers/context-menu-helpers.js';

import type * as puppeteer from 'puppeteer-core';

import {click, goToResource} from '../../shared/helper.js';

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

async function goToTestPageAndSelectTestElement(path: string = 'inline_editor/default.html') {
  await goToResource(path);
  await waitForContentOfSelectedElementsNode('<body>\u200B');
  await clickNthChildOfSelectedElementNode(1);
  await waitForContentOfSelectedElementsNode('<div id=\u200B"inspected">\u200BInspected div\u200B</div>\u200B');
}

async function assertColorSwatch(container: puppeteer.ElementHandle|undefined, expectedColor: string) {
  if (!container) {
    assert.fail('Container not found');
  }
  const swatch = await getColorSwatch(container, 0);
  assert.isTrue(Boolean(swatch), 'Color swatch found');

  const color = await getColorSwatchColor(container, 0);
  assert.strictEqual(color, expectedColor, 'Color swatch has the right color');
}

async function assertNoColorSwatch(container: puppeteer.ElementHandle|undefined) {
  if (!container) {
    assert.fail('Container not found');
  }
  const swatch = await getColorSwatch(container, 0);
  assert.isUndefined(swatch, 'No color swatch found');
}

describe('The color swatch', () => {
  it('is displayed for color properties in the Styles pane', async () => {
    await goToTestPageAndSelectTestElement();

    await waitForCSSPropertyValue('#inspected', 'color', 'red');
    const property = await getCSSPropertyInRule('#inspected', 'color');

    await assertColorSwatch(property, 'red');
  });

  it('is displayed for color properties in the Computed pane', async () => {
    await goToTestPageAndSelectTestElement();
    await navigateToSidePane('Computed');
    await waitForElementsComputedSection();

    const property = await getPropertyFromComputedPane('color');
    await assertColorSwatch(property, 'rgb(255, 0, 0)');
  });

  it('is not displayed for non-color properties in the Styles pane', async () => {
    await goToTestPageAndSelectTestElement();

    await waitForCSSPropertyValue('#inspected', 'margin', '10px');
    const property = await getCSSPropertyInRule('#inspected', 'margin');

    await assertNoColorSwatch(property);
  });

  it('is not displayed for non-color properties that have color-looking values in the Styles pane', async () => {
    await goToTestPageAndSelectTestElement();

    await waitForCSSPropertyValue('#inspected', 'animation-name', 'black');
    const property = await getCSSPropertyInRule('#inspected', 'animation-name');

    await assertNoColorSwatch(property);
  });

  it('is not displayed for color properties that have color-looking values in the Styles pane', async () => {
    await goToTestPageAndSelectTestElement();

    await waitForCSSPropertyValue('#inspected', 'background', 'url(red green blue.jpg)');
    const property = await getCSSPropertyInRule('#inspected', 'background');

    await assertNoColorSwatch(property);
  });

  it('is displayed for var() functions that compute to colors in the Styles pane', async () => {
    await goToTestPageAndSelectTestElement();

    await waitForCSSPropertyValue('#inspected', 'background-color', 'var(--variable)');
    const property = await getCSSPropertyInRule('#inspected', 'background-color');
    await assertColorSwatch(property, 'blue');
  });

  it('is not displayed for var() functions that have color-looking names but do not compute to colors in the Styles pane',
     async () => {
       await goToTestPageAndSelectTestElement();

       await waitForCSSPropertyValue('#inspected', 'border-color', 'var(--red)');
       const property = await getCSSPropertyInRule('#inspected', 'border-color');
       await assertNoColorSwatch(property);
     });

  it('is displayed for color-looking custom properties in the Styles pane', async () => {
    await goToTestPageAndSelectTestElement();

    await waitForCSSPropertyValue('#inspected', '--variable', 'blue');
    const property = await getCSSPropertyInRule('#inspected', '--variable');
    await assertColorSwatch(property, 'blue');
  });

  it('supports shift-clicking for color properties in the Styles pane', async () => {
    await goToTestPageAndSelectTestElement();

    await waitForCSSPropertyValue('#inspected', 'color', 'red');
    const property = await getCSSPropertyInRule('#inspected', 'color');
    if (!property) {
      assert.fail('Property not found');
    }
    await shiftClickColorSwatch(
        property, 0, 'Panel: elements > Pane: styles > Section: style-properties > Tree > TreeItem: color > Value');

    const menu = await waitForSoftContextMenu();
    await click('[aria-label="#f00"]', {root: menu});
    await waitForCSSPropertyValue('#inspected', 'color', '#f00');
  });

  it('supports shift-clicking for colors next to var() functions', async () => {
    await goToTestPageAndSelectTestElement();

    await waitForCSSPropertyValue('#inspected', 'background-color', 'var(--variable)');
    const property = await getCSSPropertyInRule('#inspected', 'background-color');
    if (!property) {
      assert.fail('Property not found');
    }
    await shiftClickColorSwatch(
        property, 0,
        'Panel: elements > Pane: styles > Section: style-properties > Tree > TreeItem: background-color > Value');

    const menu = await waitForSoftContextMenu();
    await click('[aria-label="#00f"]', {root: menu});
    await waitForCSSPropertyValue('#inspected', 'background-color', '#00f');
  });

  it('is updated when the color value is updated in the Styles pane', async () => {
    await goToTestPageAndSelectTestElement();

    await waitForCSSPropertyValue('#inspected', 'color', 'red');
    let property = await getCSSPropertyInRule('#inspected', 'color');
    await assertColorSwatch(property, 'red');

    await editCSSProperty('#inspected', 'color', 'blue');

    await waitForCSSPropertyValue('#inspected', 'color', 'blue');
    property = await getCSSPropertyInRule('#inspected', 'color');
    await assertColorSwatch(property, 'blue');
  });

  it('is updated for a var() function when the customer property value changes in the Styles pane', async () => {
    await goToTestPageAndSelectTestElement('inline_editor/var-chain.html');

    await waitForCSSPropertyValue('#inspected', '--bar', 'var(--baz)');
    await waitForCSSPropertyValue('#inspected', 'color', 'var(--bar)');

    let barProperty = await getCSSPropertyInRule('#inspected', '--bar');
    let colorProperty = await getCSSPropertyInRule('#inspected', 'color');
    await assertColorSwatch(barProperty, 'red');
    await assertColorSwatch(colorProperty, 'red');

    await editCSSProperty('#inspected', '--baz', 'blue');
    await waitForCSSPropertyValue('#inspected', '--baz', 'blue');

    barProperty = await getCSSPropertyInRule('#inspected', '--bar');
    colorProperty = await getCSSPropertyInRule('#inspected', 'color');
    await assertColorSwatch(barProperty, 'blue');
    await assertColorSwatch(colorProperty, 'blue');
  });
});
