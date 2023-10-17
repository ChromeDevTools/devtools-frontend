// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import type * as TextUtils from '../../../../../front_end/models/text_utils/text_utils.js';
import * as ElementsModule from '../../../../../front_end/panels/elements/elements.js';
import {createTarget, stubNoopSettings} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

describe('StylePropertiesSection', async () => {
  let Elements: typeof ElementsModule;
  before(async () => {
    Elements = await import('../../../../../front_end/panels/elements/elements.js');
  });

  it('contains specificity information', async () => {
    const specificity = {a: 0, b: 1, c: 0};
    const selectorElement = Elements.StylePropertiesSection.StylePropertiesSection.renderSelectors(
        [{text: '.child', specificity}], [true], new WeakMap());
    assert.deepEqual(selectorElement.textContent, '.child');
    assert.deepEqual(
        Elements.StylePropertiesSection.StylePropertiesSection.getSpecificityStoredForNodeElement(
            (selectorElement.firstChild as Element)),
        specificity);
  });

  it('renders selectors correctly', async () => {
    let selectorElement = Elements.StylePropertiesSection.StylePropertiesSection.renderSelectors(
        [{text: '.child', specificity: {a: 0, b: 2, c: 0}}, {text: '.item', specificity: {a: 0, b: 2, c: 0}}], [true],
        new WeakMap());
    assert.deepEqual(selectorElement.textContent, '.child, .item');
    selectorElement = Elements.StylePropertiesSection.StylePropertiesSection.renderSelectors(
        [{text: '.child', specificity: {a: 0, b: 2, c: 0}}, {text: '& .item', specificity: {a: 0, b: 2, c: 0}}], [true],
        new WeakMap());
    assert.deepEqual(selectorElement.textContent, '.child, & .item');
    selectorElement = Elements.StylePropertiesSection.StylePropertiesSection.renderSelectors(
        [{text: '&.child', specificity: {a: 0, b: 2, c: 0}}, {text: '& .item', specificity: {a: 0, b: 2, c: 0}}],
        [true], new WeakMap());
    assert.deepEqual(selectorElement.textContent, '&.child, & .item');
  });
});

describeWithMockConnection('StylesPropertySection', () => {
  it('updates property rule property names', async () => {
    stubNoopSettings();
    const cssModel = createTarget().model(SDK.CSSModel.CSSModel);
    Platform.assertNotNullOrUndefined(cssModel);
    const stylesSidebarPane = ElementsModule.StylesSidebarPane.StylesSidebarPane.instance({forceNew: true});
    const range = {startLine: 0, startColumn: 0, endLine: 0, endColumn: 6};
    const propertyName: Protocol.CSS.Value = {text: '--prop', range};
    const propertyRuleStyle: Protocol.CSS.CSSStyle = {
      cssProperties: [
        {name: 'inherits', value: 'false'},
        {name: 'initial-value', value: 'red'},
        {name: 'syntax', value: '"<color>"'},
      ],
      shorthandEntries: [],
    };
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.CSS.StyleSheetId;
    cssModel.styleSheetAdded({
      styleSheetId,
      frameId: '' as Protocol.Page.FrameId,
      sourceURL: '',
      origin,
      title: '',
      disabled: false,
      isInline: false,
      isMutable: false,
      isConstructed: false,
      startLine: 0,
      startColumn: 0,
      length: 0,
      endLine: 0,
      endColumn: 0,
    });
    const propertyRule: Protocol.CSS.CSSPropertyRule = {
      propertyName,
      origin,
      style: propertyRuleStyle,
      styleSheetId,
    };
    const match: Protocol.CSS.RuleMatch = {
      rule: {
        selectorList: {selectors: [{text: 'div'}], text: 'div'},
        origin,
        style: {cssProperties: [{name: propertyName.text, value: 'red'}], shorthandEntries: []},
      },
      matchingSelectors: [0],
    };
    const matchedStyles = await SDK.CSSMatchedStyles.CSSMatchedStyles.create({
      cssModel,
      node: sinon.createStubInstance(SDK.DOMModel.DOMNode),
      inlinePayload: null,
      attributesPayload: null,
      matchedPayload: [match],
      pseudoPayload: [],
      inheritedPayload: [],
      inheritedPseudoPayload: [],
      animationsPayload: [],
      parentLayoutNodeId: undefined,
      positionFallbackRules: [],
      propertyRules: [propertyRule],
      cssPropertyRegistrations: [],
    });

    function assertIsPropertyRule(rule: SDK.CSSRule.CSSRule|null): asserts rule is SDK.CSSRule.CSSPropertyRule {
      assert.instanceOf(rule, SDK.CSSRule.CSSPropertyRule);
    }
    const declaration = matchedStyles.getRegisteredProperty(propertyName.text)?.style();
    Platform.assertNotNullOrUndefined(declaration);
    const rule = declaration.parentRule;
    assertIsPropertyRule(rule);
    const section = new ElementsModule.StylePropertiesSection.RegisteredPropertiesSection(
        stylesSidebarPane, matchedStyles, declaration, 0, propertyName.text, /* expandedByDefault=*/ true);

    const forceUpdateSpy = sinon.spy(stylesSidebarPane, 'forceUpdate');
    const setNameSpy = sinon.stub(cssModel, 'setPropertyRulePropertyName');
    setNameSpy.returns(Promise.resolve(true));
    await section.setHeaderText(rule, propertyName.text);

    assert.isTrue(forceUpdateSpy.calledAfter(setNameSpy));
    assert.isTrue(setNameSpy.calledOnceWithExactly(
        styleSheetId,
        sinon.match(
            (r: TextUtils.TextRange.TextRange) => r.startLine === range.startLine &&
                r.startColumn === range.startColumn && r.endLine === range.endLine && r.endColumn === range.endColumn),
        propertyName.text));
  });
});
