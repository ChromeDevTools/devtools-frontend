// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {enableExperiment, getBrowserAndPages, goToResource, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {getFontEditorButtons, getHiddenFontEditorButtons, waitForContentOfSelectedElementsNode, waitForCSSPropertyValue} from '../helpers/elements-helpers.js';


async function goToTestPageAndSelectTestElement(path: string = 'inline_editor/fontEditor.html') {
  const {frontend} = getBrowserAndPages();

  await goToResource(path);
  await waitForContentOfSelectedElementsNode('<body>\u200B');

  await frontend.keyboard.press('ArrowDown');
}

async function openFontEditor(index: number) {
  const fontEditorButtons = await getFontEditorButtons();
  const fontEditorButton = fontEditorButtons[index];
  assert.exists(fontEditorButton);
  await fontEditorButtons[index].click();
  await waitFor('.font-selector-section');
}

describe.skip('[https://crbug.com/1154560] The font editor', async function() {
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
    await openFontEditor(0);
  });

  it('is properly applying font family changes to the style section', async () => {
    const {frontend} = getBrowserAndPages();
    await openFontEditor(0);
    const fontFamilySelector = await waitFor('[aria-label="Font Family"]');
    fontFamilySelector.focus();
    frontend.keyboard.press('Enter');
    frontend.keyboard.press('ArrowDown');
    frontend.keyboard.press('Enter');
    await waitForCSSPropertyValue('element.style', 'font-family', 'Times New Roman');
  });

  it('is properly applying slider input changes to the style section', async () => {
    const {frontend} = getBrowserAndPages();
    await openFontEditor(0);
    const fontSizeSliderInput = await waitFor('[aria-label="font-size Slider Input"]');
    await fontSizeSliderInput.focus();
    frontend.keyboard.press('ArrowRight');
    await waitForCSSPropertyValue('element.style', 'font-size', '11px');
  });

  it('is properly applying text input changes to the style section', async () => {
    const {frontend} = getBrowserAndPages();
    await openFontEditor(0);
    const fontSizeTextInput = await waitFor('[aria-label="line-height Text Input"]');
    await fontSizeTextInput.focus();
    frontend.keyboard.type('3');
    await waitForCSSPropertyValue('element.style', 'line-height', '3');
  });

  it('is properly applying selector key values to the style section', async () => {
    const {frontend} = getBrowserAndPages();
    await openFontEditor(0);
    const fontSizeKeySelector = await waitFor('[aria-label="font-weight Key Value Selector"]');
    await fontSizeKeySelector.focus();
    frontend.keyboard.press('Enter');
    frontend.keyboard.press('ArrowDown');
    frontend.keyboard.press('Enter');
    await waitForCSSPropertyValue('element.style', 'font-weight', 'inherit');
  });

  it('is properly converting units and applying changes to the styles section', async () => {
    const {frontend} = getBrowserAndPages();
    await openFontEditor(0);
    const fontSizeUnitInput = await waitFor('[aria-label="font-size Unit Input"]');
    await fontSizeUnitInput.focus();
    frontend.keyboard.press('Enter');
    frontend.keyboard.press('ArrowDown');
    frontend.keyboard.press('Enter');
    await waitForCSSPropertyValue('element.style', 'font-size', '0.6em');
  });

  it('computed font list is being generated correctly', async () => {
    await openFontEditor(0);
    await waitFor('[value="testFont"]');
  });
});
