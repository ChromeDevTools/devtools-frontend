// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import * as puppeteer from 'puppeteer';

import {click, getBrowserAndPages, resourcesPath, waitFor} from '../../shared/helper.js';
import {assertContentOfSelectedElementsNode, getAriaLabelSelectorFromPropertiesSelector, getCSSPropertySwatchStyle, getDisplayedCSSPropertyNames, getDisplayedStyleRules, waitForElementsStyleSection, waitForStyleRule} from '../helpers/elements-helpers.js';

const PROPERTIES_TO_DELETE_SELECTOR = '#properties-to-delete';
const PROPERTIES_TO_INSPECT_SELECTOR = '#properties-to-inspect';
const FIRST_PROPERTY_NAME_SELECTOR = '.tree-outline li:nth-of-type(1) > .webkit-css-property';
const SECOND_PROPERTY_NAME_SELECTOR = '.tree-outline li:nth-of-type(2) > .webkit-css-property';

const deletePropertyByBackspace = async (selector: string, root?: puppeteer.JSHandle<any>) => {
  const {frontend} = getBrowserAndPages();
  await click(selector, {root});
  await frontend.keyboard.press('Backspace');
  await frontend.keyboard.press('Tab');
  await waitFor('.tree-outline .child-editing', root);
};

describe('The Styles pane', async () => {
  it('can display the CSS properties of the selected element', async () => {
    const {target, frontend} = getBrowserAndPages();

    await target.goto(`${resourcesPath}/elements/simple-styled-page.html`);
    await waitForElementsStyleSection();

    // Select the H1 element by pressing down, since <body> is the default selected element.
    const onH1RuleAppeared = waitForStyleRule('h1');
    await frontend.keyboard.press('ArrowDown');
    await onH1RuleAppeared;

    const h1Rules = await getDisplayedStyleRules();
    // Checking the first h1 rule, that's the authored rule, right after the element style.
    assert.deepEqual(h1Rules[1], {selectorText: 'h1', propertyNames: ['color']}, 'The correct rule is displayed');

    // Select the H2 element by pressing down.
    const onH2RuleAppeared = waitForStyleRule('h2');
    await frontend.keyboard.press('ArrowDown');
    await onH2RuleAppeared;

    const h2Rules = await getDisplayedStyleRules();
    // Checking the first h2 rule, that's the authored rule, right after the element style.
    assert.deepEqual(
        h2Rules[1], {selectorText: 'h2', propertyNames: ['background-color', 'color']},
        'The correct rule is displayed');
  });

  it('can display CSS variables properly', async () => {
    const {target, frontend} = getBrowserAndPages();

    await target.goto(`${resourcesPath}/elements/css-variables.html`);
    await waitForElementsStyleSection();

    // Sanity check to make sure we have the correct node selected after opening a file
    await assertContentOfSelectedElementsNode('<body>\u200B');

    // Select div that we will inspect the CSS variables for
    await frontend.keyboard.press('ArrowRight');
    await assertContentOfSelectedElementsNode('<div id=\u200B"properties-to-inspect">\u200B</div>\u200B');

    const propertiesSection = await waitFor(getAriaLabelSelectorFromPropertiesSelector(PROPERTIES_TO_INSPECT_SELECTOR));
    const swatchStyle = await getCSSPropertySwatchStyle(propertiesSection);
    assert.deepEqual(swatchStyle, 'background-color: black;', 'The swatch has incorrect style');
  });

  it('can remove a CSS property when its name or value is deleted', async () => {
    const {target, frontend} = getBrowserAndPages();

    await target.goto(`${resourcesPath}/elements/style-pane-properties.html`);
    await waitForElementsStyleSection();

    // Sanity check to make sure we have the correct node selected after opening a file
    await assertContentOfSelectedElementsNode('<body>\u200B');

    // Select div that we will remove the CSS properties from
    await frontend.keyboard.press('ArrowRight');
    await assertContentOfSelectedElementsNode('<div id=\u200B"properties-to-delete">\u200B</div>\u200B');

    const propertiesSection = await waitFor(getAriaLabelSelectorFromPropertiesSelector(PROPERTIES_TO_DELETE_SELECTOR));
    {
      const displayedNames = await getDisplayedCSSPropertyNames(propertiesSection);
      assert.deepEqual(
          displayedNames,
          [
            'height',
            'width',
          ],
          'incorrectly displayed style after initialization');
    }

    // select second property's name and delete
    await deletePropertyByBackspace(SECOND_PROPERTY_NAME_SELECTOR, propertiesSection);

    // verify the second CSS property entry has been removed
    {
      const displayedNames = await getDisplayedCSSPropertyNames(propertiesSection);
      assert.deepEqual(
          displayedNames,
          [
            'height',
          ],
          'incorrectly displayed style after removing second property\'s value');
    }

    // select first property's name and delete
    await deletePropertyByBackspace(FIRST_PROPERTY_NAME_SELECTOR, propertiesSection);

    // verify the first CSS property entry has been removed
    {
      const displayedValues = await getDisplayedCSSPropertyNames(propertiesSection);
      assert.deepEqual(displayedValues, [], 'incorrectly displayed style after removing first property\'s name');
    }
  });
});
