// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {getMatchedStyles} from '../../testing/StyleHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as PanelUtils from '../utils/utils.js';

import * as Elements from './elements.js';

describeWithMockConnection('StylePropertyHighlighter', () => {
  async function setupStylesPane(): Promise<{
    stylesSidebarPane: Elements.StylesSidebarPane.StylesSidebarPane,
    matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles,
  }> {
    const target = createTarget();
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, sinon.createStubInstance(SDK.DOMModel.DOMNode));
    const computedStyleModel = new Elements.ComputedStyleModel.ComputedStyleModel();
    const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
    const matchedStyles = await getMatchedStyles(
        {node: stylesSidebarPane.node() as SDK.DOMModel.DOMNode, cssModel: target.model(SDK.CSSModel.CSSModel)!});
    return {
      stylesSidebarPane,
      matchedStyles,
    };
  }

  function createSection(
      stylesSidebarPane: Elements.StylesSidebarPane.StylesSidebarPane,
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
      stylesSidebarPane: Elements.StylesSidebarPane.StylesSidebarPane,
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
    assert.exists(firstChild);
    assert.deepEqual((firstChild as Elements.StylePropertyTreeElement.StylePropertyTreeElement).property, property);

    sinon.assert.calledOnceWithExactly(highlightSpy, block.titleElement() as HTMLElement);
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

    sinon.assert.called(blockExpandSpy);
    sinon.assert.calledOnceWithExactly(highlightSpy, block.sections[0].element);
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

    sinon.assert.notCalled(block1ExpandSpy);
    sinon.assert.called(block2ExpandSpy);
    const element = block2.sections[1].propertiesTreeOutline.firstChild()?.listItemElement;
    assert.exists(element);
    sinon.assert.calledOnceWithExactly(highlightSpy, element);
  });

  it('highlights longhand properties of a shorthand property', async () => {
    const {stylesSidebarPane, matchedStyles} = await setupStylesPane();
    const style = sinon.createStubInstance(SDK.CSSStyleDeclaration.CSSStyleDeclaration);
    const shorthandProperty =
        new SDK.CSSProperty.CSSProperty(style, 0, 'background', 'red', true, false, true, false, '', undefined);
    const longhandProperty =
        new SDK.CSSProperty.CSSProperty(style, 1, 'background-color', 'red', true, false, true, false, '', undefined);
    sinon.stub(shorthandProperty, 'getLonghandProperties').returns([longhandProperty]);

    style.leadingProperties.returns([shorthandProperty]);
    style.allProperties.returns([shorthandProperty, longhandProperty]);

    const section = new Elements.StylePropertiesSection.StylePropertiesSection(
        stylesSidebarPane, matchedStyles, style, 0, null, null);
    sinon.stub(stylesSidebarPane, 'allSections').returns([section]);

    const highlighter = new Elements.StylePropertyHighlighter.StylePropertyHighlighter(stylesSidebarPane);
    const highlightSpy = sinon.stub(PanelUtils.PanelUtils, 'highlightElement');
    await highlighter.highlightProperty(longhandProperty);

    // Assert that the shorthand is expanded and the longhand is highlighted.
    const shorthandTreeElement =
        section.propertiesTreeOutline.firstChild() as Elements.StylePropertyTreeElement.StylePropertyTreeElement;
    const longhandTreeElement =
        shorthandTreeElement.childAt(0) as Elements.StylePropertyTreeElement.StylePropertyTreeElement;
    assert.isTrue(shorthandTreeElement.expanded, 'Shorthand property should be expanded');
    sinon.assert.calledOnceWithExactly(highlightSpy, longhandTreeElement.listItemElement);
  });
});
