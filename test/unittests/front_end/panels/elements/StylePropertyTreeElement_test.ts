// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';

import type * as ElementsModule from '../../../../../front_end/panels/elements/elements.js';
import type * as LegacyUI from '../../../../../front_end/ui/legacy/legacy.js';
import {describeWithRealConnection} from '../../helpers/RealConnection.js';

const {assert} = chai;

const mockCssStyleDeclaration = {
  isPropertyImplicit: () => false,
} as unknown as SDK.CSSStyleDeclaration.CSSStyleDeclaration;

const mockMatchedStyles = {
  computeValue: () => null,
} as unknown as SDK.CSSMatchedStyles.CSSMatchedStyles;

const mockCssProperty = {} as unknown as SDK.CSSProperty.CSSProperty;

describeWithRealConnection('StylePropertyTreeElement', async () => {
  let Elements: typeof ElementsModule;
  let mockStylesSidebarPane: ElementsModule.StylesSidebarPane.StylesSidebarPane;

  before(async () => {
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
