// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {enableExperiment, getBrowserAndPages, goToResource, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  clickNthChildOfSelectedElementNode,
  getElementStyleFontEditorButton,
  getFontEditorButtons,
  getHiddenFontEditorButtons,
  waitForContentOfSelectedElementsNode,
  waitForCSSPropertyValue,
} from '../helpers/elements-helpers.js';

async function goToTestPageAndSelectTestElement(path: string = 'inline_editor/fontEditor.html') {
  await goToResource(path);
  await waitForContentOfSelectedElementsNode('<body>\u200B');
  await clickNthChildOfSelectedElementNode(1);
}

async function openFontEditorForInlineStyle() {
  const fontEditorButton = await getElementStyleFontEditorButton();
  if (!fontEditorButton) {
    throw new Error('Missing font editor button in the element style section');
  }
  await fontEditorButton.click();
  await waitFor('.font-selector-section');
}

describe('The font editor', async function() {
  beforeEach(async function() {
    await enableExperiment('fontEditor');
    await goToTestPageAndSelectTestElement();
    await waitForCSSPropertyValue('#inspected', 'color', 'red');
  });

  it('icon is displayed for sections containing font properties', async () => {
    const fontEditorButtons = await getFontEditorButtons();
    const hiddenFontEditorButtons = await getHiddenFontEditorButtons();
    assert.deepEqual(fontEditorButtons.length, 5);
    assert.deepEqual(hiddenFontEditorButtons.length, 2);
  });

  it('opens when button is clicked', async () => {
    await openFontEditorForInlineStyle();
  });

  it('is properly applying font family changes to the style section', async () => {
    const {frontend} = getBrowserAndPages();
    await openFontEditorForInlineStyle();
    const fontFamilySelector = await waitFor('[aria-label="Font Family"]');
    await fontFamilySelector.focus();
    await frontend.keyboard.press('a');
    await waitForCSSPropertyValue('element.style', 'font-family', 'Arial');
  });

  it('is properly applying slider input changes to the style section', async () => {
    const {frontend} = getBrowserAndPages();
    await openFontEditorForInlineStyle();
    const fontSizeSliderInput = await waitFor('[aria-label="font-size Slider Input"]');
    await fontSizeSliderInput.focus();
    await frontend.keyboard.press('ArrowRight');
    await waitForCSSPropertyValue('element.style', 'font-size', '11px');
  });

  it('is properly applying text input changes to the style section', async () => {
    const {frontend} = getBrowserAndPages();
    await openFontEditorForInlineStyle();
    const fontSizeTextInput = await waitFor('[aria-label="font-size Text Input"]');
    await fontSizeTextInput.focus();
    await frontend.keyboard.press('ArrowUp');
    await waitForCSSPropertyValue('element.style', 'font-size', '11px');
  });

  it('is properly applying selector key values to the style section', async () => {
    const {frontend} = getBrowserAndPages();
    await openFontEditorForInlineStyle();
    const fontWeightSelectorInput = await waitFor('[aria-label="font-weight Key Value Selector"]');
    await fontWeightSelectorInput.focus();
    await frontend.keyboard.press('i');
    await waitForCSSPropertyValue('element.style', 'font-weight', 'inherit');
  });

  it('is properly converting units and applying changes to the styles section', async () => {
    const {frontend} = getBrowserAndPages();
    await openFontEditorForInlineStyle();
    const fontSizeUnitInput = await waitFor('[aria-label="font-size Unit Input"]');
    await fontSizeUnitInput.focus();
    await frontend.keyboard.press('e');
    await waitForCSSPropertyValue('element.style', 'font-size', '0.6em');
  });

  it('computed font list is being generated correctly', async () => {
    await openFontEditorForInlineStyle();
    await waitFor('[value="testFont"]');
  });
});
