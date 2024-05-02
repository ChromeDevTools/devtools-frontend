// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';

import * as Elements from './elements.js';

const {assert} = chai;

describe('StylePropertiesSection', () => {
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

function setUpStyles(
    cssModel: SDK.CSSModel.CSSModel, origin: Protocol.CSS.StyleSheetOrigin, styleSheetId: Protocol.CSS.StyleSheetId,
    header: Partial<Protocol.CSS.CSSStyleSheetHeader>,
    payload: Partial<SDK.CSSMatchedStyles.CSSMatchedStylesPayload>): Promise<SDK.CSSMatchedStyles.CSSMatchedStyles> {
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
    ...header,
  });
  return SDK.CSSMatchedStyles.CSSMatchedStyles.create({
    cssModel,
    node: sinon.createStubInstance(SDK.DOMModel.DOMNode),
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
    fontPaletteValuesRule: undefined,
    ...payload,
  });
}

describeWithMockConnection('StylesPropertySection', () => {
  it('displays the proper sourceURL origin for constructed stylesheets', async () => {
    const cssModel = createTarget().model(SDK.CSSModel.CSSModel);
    Platform.assertNotNullOrUndefined(cssModel);
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.CSS.StyleSheetId;
    const range = {startLine: 0, endLine: 1, startColumn: 0, endColumn: 0};
    const header =
        {sourceURL: 'constructed.css', isMutable: true, isConstructed: true, hasSourceURL: true, length: 1, ...range};
    const matchedPayload: Protocol.CSS.RuleMatch[] = [{
      rule: {
        selectorList: {selectors: [{text: 'div'}], text: 'div'},
        origin,
        styleSheetId,
        style: {cssProperties: [{name: 'color', value: 'red'}], shorthandEntries: [], range},
      },
      matchingSelectors: [0],
    }];
    const matchedStyles = await setUpStyles(cssModel, origin, styleSheetId, header, {matchedPayload});

    const rule = matchedStyles.nodeStyles()[0].parentRule;
    const linkifier = sinon.createStubInstance(Components.Linkifier.Linkifier);
    const originNode =
        Elements.StylePropertiesSection.StylePropertiesSection.createRuleOriginNode(matchedStyles, linkifier, rule);
    assert.strictEqual(originNode.textContent, '<style>');
    assert.isTrue(linkifier.linkifyCSSLocation.calledOnce);
    assert.strictEqual(linkifier.linkifyCSSLocation.args[0][0].styleSheetId, styleSheetId);
    assert.strictEqual(linkifier.linkifyCSSLocation.args[0][0].url, 'constructed.css');
  });

  it('displays the proper sourceMappingURL origin for constructed stylesheets', async () => {
    const cssModel = createTarget().model(SDK.CSSModel.CSSModel);
    Platform.assertNotNullOrUndefined(cssModel);
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.CSS.StyleSheetId;
    const range = {startLine: 0, endLine: 1, startColumn: 0, endColumn: 0};
    const header: Partial<Protocol.CSS.CSSStyleSheetHeader> = {
      sourceMapURL: 'http://example.com/constructed.css.map',
      isMutable: true,
      isConstructed: true,
      length: 1,
      ...range,
    };
    const matchedPayload: Protocol.CSS.RuleMatch[] = [{
      rule: {
        selectorList: {selectors: [{text: 'div'}], text: 'div'},
        origin,
        styleSheetId,
        style: {cssProperties: [{name: 'color', value: 'red'}], shorthandEntries: [], range},
      },
      matchingSelectors: [0],
    }];

    sinon.stub(SDK.PageResourceLoader.PageResourceLoader.instance(), 'loadResource').callsFake(url => Promise.resolve({
      content: url === header.sourceMapURL ? '{"sources": []}' : '',
    }));
    const matchedStyles = await setUpStyles(cssModel, origin, styleSheetId, header, {matchedPayload});

    const styleSheetHeader = cssModel.styleSheetHeaderForId(styleSheetId);
    Platform.assertNotNullOrUndefined(styleSheetHeader);
    const sourceMap = await cssModel.sourceMapManager().sourceMapForClientPromise(styleSheetHeader);
    Platform.assertNotNullOrUndefined(sourceMap);

    const rule = matchedStyles.nodeStyles()[0].parentRule;
    const linkifier = sinon.createStubInstance(Components.Linkifier.Linkifier);
    const originNode =
        Elements.StylePropertiesSection.StylePropertiesSection.createRuleOriginNode(matchedStyles, linkifier, rule);
    assert.strictEqual(originNode.textContent, 'constructed stylesheet');
    assert.isTrue(linkifier.linkifyCSSLocation.calledOnce);
    // Since we already asserted that a sourcemap exists for our header, it's sufficient to check that
    // linkifyCSSLocation has been called. Verifying that linkifyCSSLocation applies source mapping is out of scope
    // for this unit under test.
    assert.strictEqual(linkifier.linkifyCSSLocation.args[0][0].styleSheetId, styleSheetId);
    assert.strictEqual(linkifier.linkifyCSSLocation.args[0][0].url, '');
  });

  it('properly renders ancestor rules', async () => {
    Common.Settings.Settings.instance().moduleSetting('text-editor-indent').set('  ');
    const cssModel = createTarget().model(SDK.CSSModel.CSSModel);
    Platform.assertNotNullOrUndefined(cssModel);
    const stylesSidebarPane = Elements.StylesSidebarPane.StylesSidebarPane.instance({forceNew: true});
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.CSS.StyleSheetId;
    const range = {startLine: 0, startColumn: 0, endLine: 0, endColumn: 6};
    const matchedPayload: Protocol.CSS.RuleMatch[] = [{
      rule: {
        nestingSelectors: ['body', '& ul', 'div'],
        ruleTypes: [
          Protocol.CSS.CSSRuleType.StyleRule,
          Protocol.CSS.CSSRuleType.StyleRule,
          Protocol.CSS.CSSRuleType.StyleRule,
        ],
        selectorList: {selectors: [{text: 'div'}], text: 'div'},
        origin,
        style: {cssProperties: [{name: 'color', value: 'red'}], shorthandEntries: []},
      },
      matchingSelectors: [0],
    }];
    const matchedStyles = await setUpStyles(cssModel, origin, styleSheetId, {...range}, {matchedPayload});
    const declaration = matchedStyles.nodeStyles()[0];
    Platform.assertNotNullOrUndefined(declaration);
    const section = new Elements.StylePropertiesSection.StylePropertiesSection(
        stylesSidebarPane, matchedStyles, declaration, 0, null, null);
    assert.strictEqual(section.element.textContent, 'div {  & ul {    body {      div {      }    }  }}');
  });

  it('updates property rule property names', async () => {
    const cssModel = createTarget().model(SDK.CSSModel.CSSModel);
    Platform.assertNotNullOrUndefined(cssModel);
    const stylesSidebarPane = Elements.StylesSidebarPane.StylesSidebarPane.instance({forceNew: true});
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.CSS.StyleSheetId;
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

    const propertyRules: Protocol.CSS.CSSPropertyRule[] = [{
      propertyName,
      origin,
      style: propertyRuleStyle,
      styleSheetId,
    }];
    const matchedPayload: Protocol.CSS.RuleMatch[] = [{
      rule: {
        selectorList: {selectors: [{text: 'div'}], text: 'div'},
        origin,
        style: {cssProperties: [{name: propertyName.text, value: 'red'}], shorthandEntries: []},
      },
      matchingSelectors: [0],
    }];

    const matchedStyles =
        await setUpStyles(cssModel, origin, styleSheetId, {...range}, {propertyRules, matchedPayload});

    function assertIsPropertyRule(rule: SDK.CSSRule.CSSRule|null): asserts rule is SDK.CSSRule.CSSPropertyRule {
      assert.instanceOf(rule, SDK.CSSRule.CSSPropertyRule);
    }
    const declaration = matchedStyles.getRegisteredProperty(propertyName.text)?.style();
    Platform.assertNotNullOrUndefined(declaration);
    const rule = declaration.parentRule;
    assertIsPropertyRule(rule);
    const section = new Elements.StylePropertiesSection.RegisteredPropertiesSection(
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
