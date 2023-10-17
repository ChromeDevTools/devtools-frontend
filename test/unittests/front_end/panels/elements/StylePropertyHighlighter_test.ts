// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as ElementsModule from '../../../../../front_end/panels/elements/elements.js';
import * as PanelUtils from '../../../../../front_end/panels/utils/utils.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {describeWithRealConnection} from '../../helpers/RealConnection.js';

describeWithRealConnection('StylePropertyHighlighter', () => {
  let Elements: typeof ElementsModule;
  before(async () => {
    Elements = await import('../../../../../front_end/panels/elements/elements.js');
  });

  async function setupStylesPane(): Promise<{
    stylesSidebarPane: ElementsModule.StylesSidebarPane.StylesSidebarPane,
    matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles,
  }> {
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    assertNotNullOrUndefined(target);
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assertNotNullOrUndefined(domModel);
    await domModel.requestDocument();
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, domModel.existingDocument());
    const stylesSidebarPane = Elements.StylesSidebarPane.StylesSidebarPane.instance({forceNew: true});
    const matchedStyles = await SDK.CSSMatchedStyles.CSSMatchedStyles.create({
      cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
      node: stylesSidebarPane.node() as SDK.DOMModel.DOMNode,
      inlinePayload: null,
      attributesPayload: null,
      matchedPayload: [],
      pseudoPayload: [],
      inheritedPayload: [],
      inheritedPseudoPayload: [],
      animationsPayload: [],
      parentLayoutNodeId: undefined,
      positionFallbackRules: [],
      propertyRules: [],
      cssPropertyRegistrations: [],
    });
    return {
      stylesSidebarPane,
      matchedStyles,
    };
  }

  function createSection(
      stylesSidebarPane: ElementsModule.StylesSidebarPane.StylesSidebarPane,
      matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, sectionName?: string, propertyName?: string) {
    const style = sinon.createStubInstance(SDK.CSSStyleDeclaration.CSSStyleDeclaration);
    if (propertyName) {
      const property =
          new SDK.CSSProperty.CSSProperty(style, 0, propertyName, 'value', true, false, true, false, '', undefined);
      style.leadingProperties.returns([property]);
      style.hasActiveProperty.callsFake(name => name === propertyName);
    } else {
      style.leadingProperties.returns([]);
    }
    return new Elements.StylePropertiesSection.StylePropertiesSection(
        stylesSidebarPane, matchedStyles, style,
        /* sectionIdx */ 0, /* computedStyles */ null,
        /* parentsComputedStyles */ null, sectionName);
  }

  function createBlockAndSection(
      stylesSidebarPane: ElementsModule.StylesSidebarPane.StylesSidebarPane,
      matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, sectionName?: string, propertyName?: string) {
    const titleElement = sinon.createStubInstance(Element);
    const block = new Elements.StylesSidebarPane.SectionBlock(titleElement, true);
    block.sections = [createSection(stylesSidebarPane, matchedStyles, sectionName, propertyName)];

    return block;
  }

  it('highlights layers', async () => {
    const {stylesSidebarPane, matchedStyles} = await setupStylesPane();
    const getSectionBlockByName = sinon.stub(stylesSidebarPane, 'getSectionBlockByName');

    const block = createBlockAndSection(stylesSidebarPane, matchedStyles);
    getSectionBlockByName.returns(block);
    const [section] = block.sections;

    const style = section.style() as sinon.SinonStubbedInstance<SDK.CSSStyleDeclaration.CSSStyleDeclaration>;
    // Attach a property late, in order to verify that highlighting the layer repopulates the tree view.
    const property = new SDK.CSSProperty.CSSProperty(style, 0, '', '', true, false, true, false, '', undefined);
    style.leadingProperties.returns([property]);
    assert.isUndefined(section.propertiesTreeOutline.firstChild());

    const highlighter = new Elements.StylePropertyHighlighter.StylePropertyHighlighter(stylesSidebarPane);
    const highlightSpy = sinon.spy(PanelUtils.PanelUtils, 'highlightElement');
    highlighter.findAndHighlightSectionBlock('dontcare');

    const firstChild = section.propertiesTreeOutline.firstChild();
    assertNotNullOrUndefined(firstChild);
    assert.deepEqual(
        (firstChild as ElementsModule.StylePropertyTreeElement.StylePropertyTreeElement).property, property);

    assert.isTrue(highlightSpy.calledOnceWithExactly(block.titleElement() as HTMLElement));
  });

  it('highlights sections', async () => {
    const {stylesSidebarPane, matchedStyles} = await setupStylesPane();
    const getSectionBlockByName = sinon.stub(stylesSidebarPane, 'getSectionBlockByName');

    const block = createBlockAndSection(stylesSidebarPane, matchedStyles, 'sectionname');
    const blockExpandSpy = sinon.spy(block, 'expand');

    getSectionBlockByName.callsFake(name => name === 'blockname' ? block : undefined);

    const highlighter = new Elements.StylePropertyHighlighter.StylePropertyHighlighter(stylesSidebarPane);
    const highlightSpy = sinon.stub(PanelUtils.PanelUtils, 'highlightElement');
    highlighter.findAndHighlightSection('sectionname', 'blockname');

    assert.isTrue(blockExpandSpy.called);
    assert.isTrue(highlightSpy.calledOnceWithExactly(block.sections[0].element));
  });

  it('highlights properties in sections in blocks', async () => {
    const {stylesSidebarPane, matchedStyles} = await setupStylesPane();
    const getSectionBlockByName = sinon.stub(stylesSidebarPane, 'getSectionBlockByName');

    const block1 = createBlockAndSection(stylesSidebarPane, matchedStyles, 'section1', 'property');
    const block1ExpandSpy = sinon.spy(block1, 'expand');
    const block2 = createBlockAndSection(stylesSidebarPane, matchedStyles, 'section2', 'property');
    block2.sections.unshift(createSection(stylesSidebarPane, matchedStyles, 'extrasection'));
    const block2ExpandSpy = sinon.spy(block2, 'expand');

    getSectionBlockByName.callsFake(name => {
      if (name === 'block1') {
        return block1;
      }
      if (name === 'block2') {
        return block2;
      }
      return undefined;
    });

    const highlighter = new Elements.StylePropertyHighlighter.StylePropertyHighlighter(stylesSidebarPane);
    const highlightSpy = sinon.stub(PanelUtils.PanelUtils, 'highlightElement');
    highlighter.findAndHighlightPropertyName('property', 'section2', 'block2');

    assert.isFalse(block1ExpandSpy.called);
    assert.isTrue(block2ExpandSpy.called);
    const element = block2.sections[1].propertiesTreeOutline.firstChild()?.listItemElement;
    assertNotNullOrUndefined(element);
    assert.isTrue(highlightSpy.calledOnceWithExactly(element));
  });
});
