// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';

import type * as ElementsModule from '../../../../../front_end/panels/elements/elements.js';
import * as Common from '../../../../../front_end/core/common/common.js';
import * as InlineEditor from '../../../../../front_end/ui/legacy/components/inline_editor/inline_editor.js';
import type * as LegacyUI from '../../../../../front_end/ui/legacy/legacy.js';
import {describeWithRealConnection} from '../../helpers/RealConnection.js';

const {assert} = chai;

const mockCssStyleDeclaration = {
  isPropertyImplicit: () => false,
} as unknown as SDK.CSSStyleDeclaration.CSSStyleDeclaration;

const mockMatchedStyles = {
  computeValue: () => null,
  availableCSSVariables: () => [],
} as unknown as SDK.CSSMatchedStyles.CSSMatchedStyles;

const mockCssProperty = {} as unknown as SDK.CSSProperty.CSSProperty;

describeWithRealConnection('StylePropertyTreeElement', async () => {
  let Elements: typeof ElementsModule;
  let mockStylesSidebarPane: ElementsModule.StylesSidebarPane.StylesSidebarPane;

  beforeEach(async () => {
    Elements = await import('../../../../../front_end/panels/elements/elements.js');

    mockStylesSidebarPane = Elements.StylesSidebarPane.StylesSidebarPane.instance();
  });

  describe('updateTitle', () => {
    describe('color-mix swatch', () => {
      it('should show color mix swatch when color-mix is used', () => {
        const cssPropertyWithColorMix = new SDK.CSSProperty.CSSProperty(
            mockCssStyleDeclaration, 0, 'color', 'color-mix(in srgb, red, blue)', true, false, true, false, '',
            undefined);
        const stylePropertyTreeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement(
            mockStylesSidebarPane, mockMatchedStyles, cssPropertyWithColorMix, false, false, false, true);

        stylePropertyTreeElement.updateTitle();

        const colorMixSwatch = stylePropertyTreeElement.valueElement?.querySelector('devtools-color-mix-swatch');
        const colorSwatches =
            Array.from(stylePropertyTreeElement.valueElement?.querySelectorAll('devtools-color-swatch') || []);
        assertNotNullOrUndefined(colorMixSwatch);
        assertNotNullOrUndefined(colorSwatches.find(colorSwatch => colorSwatch.textContent === 'red'));
        assertNotNullOrUndefined(colorSwatches.find(colorSwatch => colorSwatch.textContent === 'blue'));
      });
    });
  });

  it('applies the new style when the color format is changed', async () => {
    const cssPropertyWithColorMix = new SDK.CSSProperty.CSSProperty(
        mockCssStyleDeclaration, 0, 'color', 'color(srgb .5 .5 1)', true, false, true, false, '', undefined);
    const stylePropertyTreeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement(
        mockStylesSidebarPane, mockMatchedStyles, cssPropertyWithColorMix, false, false, false, true);

    const applyStyleTextStub = sinon.stub(stylePropertyTreeElement, 'applyStyleText');
    // Make sure we don't leave a dangling promise behind:
    const returnValue = (async () => {})();
    await returnValue;
    applyStyleTextStub.returns(returnValue);

    stylePropertyTreeElement.updateTitle();

    const {valueElement} = stylePropertyTreeElement;
    assertNotNullOrUndefined(valueElement);

    const swatch = valueElement.querySelector<InlineEditor.ColorSwatch.ColorSwatch>(
        `${InlineEditor.ColorSwatch.ColorSwatch.litTagName.value}`);

    assertNotNullOrUndefined(swatch);

    const expectedColorString = swatch.getColor()?.asString(Common.Color.Format.LAB);
    assertNotNullOrUndefined(expectedColorString);
    assert.match(expectedColorString, /lab\([-.0-9]* [-.0-9]* [-.0-9]*\)/);

    swatch.setFormat(Common.Color.Format.LAB);
    assert.deepEqual(stylePropertyTreeElement.renderedPropertyText(), `color: ${expectedColorString}`);

    assert.isTrue(applyStyleTextStub.alwaysCalledWith(`color: ${expectedColorString}`, false));
  });

  describe('Context menu', () => {
    const expectedHeaderSectionItemsLabels =
        ['Copy declaration', 'Copy property', 'Copy value', 'Copy rule', 'Copy declaration as JS'];
    const expectedClipboardSectionItemsLabels = ['Copy all declarations', 'Copy all declarations as JS'];
    const expectedDefaultSectionItemsLabels = ['Copy all CSS changes'];
    const expectedFooterSectionItemsLabels = ['View computed value'];

    it('should create a context menu', () => {
      const verifySection = (expectedSectionItemLabels: string[], sectionItems: LegacyUI.ContextMenu.Item[]) => {
        const sectionItemLabels = sectionItems.map(item => item.buildDescriptor().label);
        assert.deepEqual(sectionItemLabels, expectedSectionItemLabels);
      };
      const stylePropertyTreeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement(
          mockStylesSidebarPane, mockMatchedStyles, mockCssProperty, false, false, false, true);

      const event = new CustomEvent('contextmenu');
      const contextMenu = stylePropertyTreeElement.createCopyContextMenu(event);

      const headerSection = contextMenu.headerSection();
      const clipboardSection = contextMenu.clipboardSection();
      const defaultSection = contextMenu.defaultSection();
      const footerSection = contextMenu.footerSection();
      verifySection(expectedHeaderSectionItemsLabels, headerSection.items);
      verifySection(expectedClipboardSectionItemsLabels, clipboardSection.items);
      verifySection(expectedDefaultSectionItemsLabels, defaultSection.items);
      verifySection(expectedFooterSectionItemsLabels, footerSection.items);
    });
  });
});
