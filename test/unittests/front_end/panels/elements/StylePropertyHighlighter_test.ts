// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithRealConnection} from '../../helpers/RealConnection.js';
import type * as ElementsModule from '../../../../../front_end/panels/elements/elements.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';

describeWithRealConnection('StylePropertyHighlighter', () => {
  let Elements: typeof ElementsModule;
  before(async () => {
    Elements = await import('../../../../../front_end/panels/elements/elements.js');
  });

  it('highlights layers', () => {
    const stylesSidebarPane = Elements.StylesSidebarPane.StylesSidebarPane.instance();
    const getSectionBlockByName = sinon.stub(stylesSidebarPane, 'getSectionBlockByName');
    const matchedStyles = new SDK.CSSMatchedStyles.CSSMatchedStyles(
        stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel, stylesSidebarPane.node() as SDK.DOMModel.DOMNode, null,
        null, [], [], [], [], [], undefined);
    const style = sinon.createStubInstance(SDK.CSSStyleDeclaration.CSSStyleDeclaration);
    style.leadingProperties.returns([]);

    const section = new Elements.StylePropertiesSection.StylePropertiesSection(
        stylesSidebarPane, matchedStyles, style,
        /* sectionIdx */ 0, /* computedStyles */ null,
        /* parentsComputedStyles */ null);

    const titleElement = sinon.createStubInstance(Element);
    const block = new Elements.StylesSidebarPane.SectionBlock(titleElement);
    block.sections = [section];
    getSectionBlockByName.returns(block);

    // Attach a property late, in order to verify that highlighting the layer repopulates the tree view.
    const property = new SDK.CSSProperty.CSSProperty(style, 0, '', '', true, false, true, false, '', undefined);
    style.leadingProperties.returns([property]);
    assert.isUndefined(section.propertiesTreeOutline.firstChild());

    const highlighter = new Elements.StylePropertyHighlighter.StylePropertyHighlighter(stylesSidebarPane);
    highlighter.findAndHighlightSectionBlock('dontcare');

    const firstChild = section.propertiesTreeOutline.firstChild();
    assertNotNullOrUndefined(firstChild);
    assert.deepEqual(
        (firstChild as ElementsModule.StylePropertyTreeElement.StylePropertyTreeElement).property, property);
    assert.isTrue(titleElement.scrollIntoViewIfNeeded.called);
    assert.isTrue(titleElement.animate.called);
  });

  afterEach(() => {
    sinon.restore();
  });
});
