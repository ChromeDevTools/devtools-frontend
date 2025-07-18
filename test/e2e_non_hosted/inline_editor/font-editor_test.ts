// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  clickNthChildOfSelectedElementNode,
  getElementStyleFontEditorButton,
  getFontEditorButtons,
  getHiddenFontEditorButtons,
  waitForContentOfSelectedElementsNode,
  waitForCSSPropertyValue,
} from '../../e2e/helpers/elements-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

async function goToTestPageAndSelectTestElement(
    inspectedPage: InspectedPage, devToolsPage: DevToolsPage, path = 'inline_editor/fontEditor.html') {
  await inspectedPage.goToResource(path);
  // Wait for the body to be selected
  await waitForContentOfSelectedElementsNode('<body>\u200B', devToolsPage);
  // Select the first child of the body, which is the div with the test styles
  await clickNthChildOfSelectedElementNode(1, devToolsPage);
}

async function openFontEditorForInlineStyle(devToolsPage: DevToolsPage) {
  const fontEditorButton = await getElementStyleFontEditorButton(devToolsPage);
  if (!fontEditorButton) {
    throw new Error('Missing font editor button in the element style section');
  }
  await fontEditorButton.click();
  await devToolsPage.waitFor('.font-selector-section');
}

describe('The font editor', function() {
  setup({
    enabledDevToolsExperiments: ['font-editor'],
  });

  async function setupFontEditorTest(inspectedPage: InspectedPage, devToolsPage: DevToolsPage) {
    await goToTestPageAndSelectTestElement(inspectedPage, devToolsPage);
    await waitForCSSPropertyValue('#inspected', 'color', 'red', undefined, devToolsPage);
  }

  it('icon is displayed for sections containing font properties', async ({devToolsPage, inspectedPage}) => {
    await setupFontEditorTest(inspectedPage, devToolsPage);
    const fontEditorButtons = await getFontEditorButtons(devToolsPage);
    const hiddenFontEditorButtons = await getHiddenFontEditorButtons(devToolsPage);
    assert.lengthOf(fontEditorButtons, 5);
    assert.lengthOf(hiddenFontEditorButtons, 2);
  });

  it('opens when button is clicked', async ({devToolsPage, inspectedPage}) => {
    await setupFontEditorTest(inspectedPage, devToolsPage);
    await openFontEditorForInlineStyle(devToolsPage);
  });

  it('is properly applying font family changes to the style section', async ({devToolsPage, inspectedPage}) => {
    await setupFontEditorTest(inspectedPage, devToolsPage);
    await openFontEditorForInlineStyle(devToolsPage);
    const fontFamilySelector = await devToolsPage.waitFor('[aria-label="Font Family"]');
    await fontFamilySelector.focus();
    await devToolsPage.typeText('a');
    await waitForCSSPropertyValue('element.style', 'font-family', 'Arial', undefined, devToolsPage);
  });

  it('is properly applying slider input changes to the style section', async ({devToolsPage, inspectedPage}) => {
    await setupFontEditorTest(inspectedPage, devToolsPage);
    await openFontEditorForInlineStyle(devToolsPage);
    const fontSizeSliderInput = await devToolsPage.waitFor('[aria-label="font-size Slider Input"]');
    await fontSizeSliderInput.focus();
    await devToolsPage.pressKey('ArrowRight');
    await waitForCSSPropertyValue('element.style', 'font-size', '11px', undefined, devToolsPage);
  });

  it('is properly applying text input changes to the style section', async ({devToolsPage, inspectedPage}) => {
    await setupFontEditorTest(inspectedPage, devToolsPage);
    await openFontEditorForInlineStyle(devToolsPage);
    const fontSizeTextInput = await devToolsPage.waitFor('[aria-label="font-size Text Input"]');
    await fontSizeTextInput.focus();
    await devToolsPage.pressKey('ArrowUp');
    await waitForCSSPropertyValue('element.style', 'font-size', '11px', undefined, devToolsPage);
  });

  it('is properly applying selector key values to the style section', async ({devToolsPage, inspectedPage}) => {
    await setupFontEditorTest(inspectedPage, devToolsPage);
    await openFontEditorForInlineStyle(devToolsPage);
    const fontWeightSelectorInput = await devToolsPage.waitFor('[aria-label="font-weight Key Value Selector"]');
    await fontWeightSelectorInput.focus();
    await devToolsPage.typeText('i');
    await waitForCSSPropertyValue('element.style', 'font-weight', 'inherit', undefined, devToolsPage);
  });

  it('is properly converting units and applying changes to the styles section',
     async ({devToolsPage, inspectedPage}) => {
       await setupFontEditorTest(inspectedPage, devToolsPage);
       await openFontEditorForInlineStyle(devToolsPage);
       const fontSizeUnitInput = await devToolsPage.waitFor('[aria-label="font-size Unit Input"]');
       await fontSizeUnitInput.focus();
       await devToolsPage.typeText('e');
       await waitForCSSPropertyValue('element.style', 'font-size', '0.6em', undefined, devToolsPage);
     });

  it('computed font list is being generated correctly', async ({devToolsPage, inspectedPage}) => {
    await setupFontEditorTest(inspectedPage, devToolsPage);
    await openFontEditorForInlineStyle(devToolsPage);
    await devToolsPage.waitFor('[value="testFont"]');
  });
});
