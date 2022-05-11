// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';

import type * as ElementsModule from '../../../../../front_end/panels/elements/elements.js';
import type * as LegacyUI from '../../../../../front_end/ui/legacy/legacy.js';
import {describeWithRealConnection} from '../../helpers/RealConnection.js';

const {assert} = chai;

describeWithRealConnection('Context menu', async () => {
  let Elements: typeof ElementsModule;

  const expectedHeaderSectionItemsLabels =
      ['Copy declaration', 'Copy property', 'Copy value', 'Copy rule', 'Copy declaration as JS'];
  const expectedClipboardSectionItemsLabels = ['Copy all declarations', 'Copy all declarations as JS'];
  const expectedDefaultSectionItemsLabels = ['Copy all CSS changes'];
  const expectedFooterSectionItemsLabels = ['View computed value'];

  before(async () => {
    Elements = await import('../../../../../front_end/panels/elements/elements.js');
  });

  it('should create a context menu', () => {
    const stylesPane = Elements.StylesSidebarPane.StylesSidebarPane.instance();

    const cssMatchedStyles = new SDK.CSSMatchedStyles.CSSMatchedStyles(
        stylesPane.cssModel() as SDK.CSSModel.CSSModel, stylesPane.node() as SDK.DOMModel.DOMNode, null, null, [], [],
        [], [], []);
    const cssProperty = new SDK.CSSProperty.CSSProperty(
        cssMatchedStyles.nodeStyles()[0], 0, '', '', true, false, true, false, '', undefined);
    const stylePropertyTreeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement(
        stylesPane, cssMatchedStyles, cssProperty, false, false, false, true);

    const event = new CustomEvent('contextmenu');

    const contextMenu = stylePropertyTreeElement.createCopyContextMenu(event);

    const headerSection = contextMenu.headerSection();
    const clipboardSection = contextMenu.clipboardSection();
    const defaultSection = contextMenu.defaultSection();
    const footerSection = contextMenu.footerSection();

    const verifySection = (expectedSectionItemLabels: string[], sectionItems: LegacyUI.ContextMenu.Item[]) => {
      const sectionItemLabels = sectionItems.map(item => item.buildDescriptor().label);
      assert.deepEqual(sectionItemLabels, expectedSectionItemLabels);
    };

    verifySection(expectedHeaderSectionItemsLabels, headerSection.items);
    verifySection(expectedClipboardSectionItemsLabels, clipboardSection.items);
    verifySection(expectedDefaultSectionItemsLabels, defaultSection.items);
    verifySection(expectedFooterSectionItemsLabels, footerSection.items);
  });
});
