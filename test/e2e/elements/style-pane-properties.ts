// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import * as puppeteer from 'puppeteer';

import {$, click, getBrowserAndPages, resetPages, resourcesPath, waitFor} from '../../shared/helper.js';
import {assertContentOfSelectedElementsNode, getAriaLabelSelectorFromPropertiesSelector, getDisplayedCSSPropertyNames, waitForElementsStyleSection} from '../helpers/elements-helpers.js';

const PROPERTIES_TO_DELETE_SELECTOR = '#properties-to-delete';
const FIRST_PROPERTY_NAME_SELECTOR = '.tree-outline li:nth-of-type(1) > .webkit-css-property';
const SECOND_PROPERTY_VALUE_SELECTOR = '.tree-outline li:nth-of-type(2) > .value';

const deletePropertyByBackspace = async (selector: string, root?: puppeteer.JSHandle<any>) => {
  const {frontend} = getBrowserAndPages();
  await click(selector, {root});
  await frontend.keyboard.press('Backspace');
  await frontend.keyboard.press('Tab');
};

describe('The Elements Tab', async () => {
  beforeEach(async () => {
    await resetPages();
  });

  it('can remove a CSS property when its name or value is deleted', async () => {
    const {target, frontend} = getBrowserAndPages();

    await target.goto(`${resourcesPath}/elements/style-pane-properties.html`);
    await click('#tab-elements');

    // Sanity check to make sure we have the correct node selected after opening a file
    await assertContentOfSelectedElementsNode('<body>\u200B');

    // Select div that we will remove the CSS properties from
    await frontend.keyboard.press('ArrowRight');
    await assertContentOfSelectedElementsNode('<div id=\u200B"properties-to-delete">\u200B</div>\u200B');
    await waitForElementsStyleSection();
    {
      const displayedNames = await getDisplayedCSSPropertyNames(PROPERTIES_TO_DELETE_SELECTOR);
      assert.deepEqual(
          displayedNames,
          [
            'height',
            'width',
          ],
          'incorrectly displayed style after initialization');
    }

    const propertiesSection = await $(getAriaLabelSelectorFromPropertiesSelector(PROPERTIES_TO_DELETE_SELECTOR));
    // select second property's value and delete
    await deletePropertyByBackspace(SECOND_PROPERTY_VALUE_SELECTOR, propertiesSection);
    await waitForElementsStyleSection();
    await waitFor('.tree-outline .child-editing', propertiesSection);

    // verify the second CSS property entry has been removed
    {
      const displayedNames = await getDisplayedCSSPropertyNames(PROPERTIES_TO_DELETE_SELECTOR);
      assert.deepEqual(
          displayedNames,
          [
            'height',
          ],
          'incorrectly displayed style after removing second property\'s value');
    }

    // select first property's name and delete
    await deletePropertyByBackspace(FIRST_PROPERTY_NAME_SELECTOR, propertiesSection);
    await waitForElementsStyleSection();
    await waitFor('.tree-outline .child-editing', propertiesSection);

    // verify the first CSS property entry has been removed
    {
      await waitForElementsStyleSection();
      const displayedValues = await getDisplayedCSSPropertyNames(PROPERTIES_TO_DELETE_SELECTOR);
      assert.deepEqual(displayedValues, [], 'incorrectly displayed style after removing first property\'s name');
    }
  });
});
