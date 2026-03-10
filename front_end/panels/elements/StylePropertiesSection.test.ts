// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as ComputedStyle from '../../models/computed_style/computed_style.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {expectCalled} from '../../testing/ExpectStubCall.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {getMatchedStylesWithBlankRule, getMatchedStylesWithStylesheet} from '../../testing/StyleHelpers.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';

import * as Elements from './elements.js';

describeWithMockConnection('StylesPropertySection', () => {
  let computedStyleModel: ComputedStyle.ComputedStyleModel.ComputedStyleModel;
  beforeEach(() => {
    SDK.PageResourceLoader.PageResourceLoader.instance({forceNew: true, loadOverride: null, maxConcurrentLoads: 1});
    computedStyleModel = new ComputedStyle.ComputedStyleModel.ComputedStyleModel();
  });

  afterEach(() => {
    SDK.PageResourceLoader.PageResourceLoader.removeInstance();
  });

  it('contains specificity information', async () => {
    const specificity = {a: 0, b: 1, c: 0};
    const matchedStyles = await getMatchedStylesWithBlankRule({cssModel: new SDK.CSSModel.CSSModel(createTarget())});
    const section = new Elements.StylePropertiesSection.StylePropertiesSection(
        new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel), matchedStyles,
        matchedStyles.nodeStyles()[0], 0, new Map(), new Map(), null);
    section.renderSelectors([{text: '.child', specificity}], [true], new WeakMap());
    const selectorElement = section.element.querySelector('.selector');
    assert.strictEqual(selectorElement?.textContent, '.child');
    assert.deepEqual(section.element?.querySelector('devtools-tooltip')?.textContent?.trim(), 'Specificity: (0,1,0)');
  });

  it('renders selectors correctly', async () => {
    const matchedStyles = await getMatchedStylesWithBlankRule({cssModel: new SDK.CSSModel.CSSModel(createTarget())});
    const section = new Elements.StylePropertiesSection.StylePropertiesSection(
        new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel), matchedStyles,
        matchedStyles.nodeStyles()[0], 0, new Map(), new Map(), null);
    section.renderSelectors(
        [{text: '.child', specificity: {a: 0, b: 2, c: 0}}, {text: '.item', specificity: {a: 0, b: 2, c: 0}}], [true],
        new WeakMap());
    const selectorElement = section.element.querySelector('.selector');
    assert.deepEqual(selectorElement?.textContent, '.child, .item');
    section.renderSelectors(
        [{text: '.child', specificity: {a: 0, b: 2, c: 0}}, {text: '& .item', specificity: {a: 0, b: 2, c: 0}}], [true],
        new WeakMap());
    assert.deepEqual(selectorElement?.textContent, '.child, & .item');
    section.renderSelectors(
        [{text: '&.child', specificity: {a: 0, b: 2, c: 0}}, {text: '& .item', specificity: {a: 0, b: 2, c: 0}}],
        [true], new WeakMap());
    assert.deepEqual(selectorElement?.textContent, '&.child, & .item');
  });

  it('displays the proper sourceURL origin for constructed stylesheets', async () => {
    const cssModel = createTarget().model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
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
    const matchedStyles =
        await getMatchedStylesWithStylesheet({cssModel, origin, styleSheetId, ...header, matchedPayload});

    const rule = matchedStyles.nodeStyles()[0].parentRule;
    const linkifier = sinon.createStubInstance(Components.Linkifier.Linkifier);
    const originNode =
        Elements.StylePropertiesSection.StylePropertiesSection.createRuleOriginNode(matchedStyles, linkifier, rule);
    assert.strictEqual(originNode.textContent, '<style>');
    sinon.assert.calledOnce(linkifier.linkifyCSSLocation);
    assert.strictEqual(linkifier.linkifyCSSLocation.args[0][0].styleSheetId, styleSheetId);
    assert.strictEqual(linkifier.linkifyCSSLocation.args[0][0].url, 'constructed.css');
  });

  it('displays the proper sourceMappingURL origin for constructed stylesheets', async () => {
    const cssModel = createTarget().model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
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
    const matchedStyles =
        await getMatchedStylesWithStylesheet({cssModel, origin, styleSheetId, ...header, matchedPayload});

    const styleSheetHeader = cssModel.styleSheetHeaderForId(styleSheetId);
    assert.exists(styleSheetHeader);
    const sourceMap = await cssModel.sourceMapManager().sourceMapForClientPromise(styleSheetHeader);
    assert.exists(sourceMap);

    const rule = matchedStyles.nodeStyles()[0].parentRule;
    const linkifier = sinon.createStubInstance(Components.Linkifier.Linkifier);
    const originNode =
        Elements.StylePropertiesSection.StylePropertiesSection.createRuleOriginNode(matchedStyles, linkifier, rule);
    assert.strictEqual(originNode.textContent, 'constructed stylesheet');
    sinon.assert.calledOnce(linkifier.linkifyCSSLocation);
    // Since we already asserted that a sourcemap exists for our header, it's sufficient to check that
    // linkifyCSSLocation has been called. Verifying that linkifyCSSLocation applies source mapping is out of scope
    // for this unit under test.
    assert.strictEqual(linkifier.linkifyCSSLocation.args[0][0].styleSheetId, styleSheetId);
    assert.strictEqual(linkifier.linkifyCSSLocation.args[0][0].url, '');
  });

  it('properly renders ancestor rules', async () => {
    Common.Settings.Settings.instance().moduleSetting('text-editor-indent').set('  ');
    const cssModel = createTarget().model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const range = {startLine: 0, startColumn: 0, endLine: 0, endColumn: 6};
    {
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
      const matchedStyles =
          await getMatchedStylesWithStylesheet({cssModel, origin, styleSheetId, ...range, matchedPayload});
      const declaration = matchedStyles.nodeStyles()[0];
      assert.exists(declaration);
      const section = new Elements.StylePropertiesSection.StylePropertiesSection(
          stylesSidebarPane, matchedStyles, declaration, 0, null, null, null);
      assert.strictEqual(section.element.textContent, 'div {  & ul {    body {      div {      }    }  }}');
    }

    {
      const matchedPayload: Protocol.CSS.RuleMatch[] = [{
        rule: {
          nestingSelectors: ['body', 'div'],
          ruleTypes: [
            Protocol.CSS.CSSRuleType.StyleRule,
            Protocol.CSS.CSSRuleType.StyleRule,
          ],
          selectorList: {selectors: [], text: ''},
          origin,
          style: {cssProperties: [{name: 'color', value: 'red'}], shorthandEntries: []},
        },
        matchingSelectors: [0],
      }];
      const matchedStyles =
          await getMatchedStylesWithStylesheet({cssModel, origin, styleSheetId, ...range, matchedPayload});
      const declaration = matchedStyles.nodeStyles()[0];
      assert.exists(declaration);
      const section = new Elements.StylePropertiesSection.StylePropertiesSection(
          stylesSidebarPane, matchedStyles, declaration, 0, null, null, null);
      assert.strictEqual(section.element.textContent, 'div {  body {    }}');
    }
  });

  it('updates property rule property names', async () => {
    const cssModel = createTarget().model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
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
        await getMatchedStylesWithStylesheet({cssModel, origin, styleSheetId, ...range, propertyRules, matchedPayload});

    function assertIsPropertyRule(rule: SDK.CSSRule.CSSRule|null): asserts rule is SDK.CSSRule.CSSPropertyRule {
      assert.instanceOf(rule, SDK.CSSRule.CSSPropertyRule);
    }
    const declaration = matchedStyles.getRegisteredProperty(propertyName.text)?.style();
    assert.exists(declaration);
    const rule = declaration.parentRule;
    assertIsPropertyRule(rule);
    const section = new Elements.StylePropertiesSection.RegisteredPropertiesSection(
        stylesSidebarPane, matchedStyles, declaration, 0, propertyName.text, /* expandedByDefault=*/ true);

    const forceUpdateSpy = sinon.spy(stylesSidebarPane, 'forceUpdate');
    const setNameSpy = sinon.stub(cssModel, 'setPropertyRulePropertyName');
    setNameSpy.returns(Promise.resolve(true));
    await section.setHeaderText(rule, propertyName.text);

    assert.isTrue(forceUpdateSpy.calledAfter(setNameSpy));
    sinon.assert.calledOnceWithExactly(
        setNameSpy, styleSheetId,
        sinon.match(
            (r: TextUtils.TextRange.TextRange) => r.startLine === range.startLine &&
                r.startColumn === range.startColumn && r.endLine === range.endLine && r.endColumn === range.endColumn),
        propertyName.text);
  });

  it('renders braces correctly with a non-style-rule section', async () => {
    Common.Settings.Settings.instance().moduleSetting('text-editor-indent').set('  ');
    const cssModel = createTarget().model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const range = {startLine: 0, startColumn: 0, endLine: 0, endColumn: 6};
    const fontPaletteValuesRule = {
      styleSheetId,
      origin,
      style: {
        range,
        cssProperties: [],
        shorthandEntries: [],
      },
      name: {
        range,
        text: '--palette-name',
      },
      type: Protocol.CSS.CSSAtRuleType.FontPaletteValues,
    };
    const matchedStyles = await getMatchedStylesWithStylesheet(
        {cssModel, origin, styleSheetId, ...range, atRules: [fontPaletteValuesRule]});
    const declaration = matchedStyles.atRules()[0]?.style;
    assert.exists(declaration);
    const section =
        new Elements.StylePropertiesSection.AtRuleSection(stylesSidebarPane, matchedStyles, declaration, 0, true);
    assert.strictEqual(section.element.textContent, '@font-palette-values --palette-name {}');
  });

  it('renders active and inactive position-try rule sections correctly', async () => {
    const cssModel = createTarget().model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const range = {startLine: 0, startColumn: 0, endLine: 0, endColumn: 6};
    const positionTryRules = [
      {
        styleSheetId,
        origin,
        name: {
          text: '--try-1',
        },
        style: {
          range,
          cssProperties: [],
          shorthandEntries: [],
        },
        active: true,
      },
      {
        styleSheetId,
        origin,
        name: {
          text: '--try-2',
        },
        style: {
          range,
          cssProperties: [],
          shorthandEntries: [],
        },
        active: false,
      },
    ];
    const matchedStyles =
        await getMatchedStylesWithStylesheet({cssModel, origin, styleSheetId, ...range, positionTryRules});
    const declaration1 = matchedStyles.positionTryRules()[0].style;
    const declaration2 = matchedStyles.positionTryRules()[1].style;
    assert.exists(declaration1);
    assert.exists(declaration2);
    const section1 = new Elements.StylePropertiesSection.PositionTryRuleSection(
        stylesSidebarPane, matchedStyles, declaration1, 0, positionTryRules[0].active);
    const section2 = new Elements.StylePropertiesSection.PositionTryRuleSection(
        stylesSidebarPane, matchedStyles, declaration1, 1, positionTryRules[1].active);
    assert.isFalse(section1.propertiesTreeOutline.element.classList.contains('no-affect'));
    assert.isTrue(section2.propertiesTreeOutline.element.classList.contains('no-affect'));
  });

  describe('GhostStylePropertyTreeElement', () => {
    let section: Elements.StylePropertiesSection.StylePropertiesSection;
    beforeEach(async () => {
      const matchedStyles = await getMatchedStylesWithBlankRule({cssModel: new SDK.CSSModel.CSSModel(createTarget())});
      section = new Elements.StylePropertiesSection.StylePropertiesSection(
          new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel), matchedStyles,
          matchedStyles.nodeStyles()[0], 0, new Map(), new Map(), null);
    });

    it('renders ghost elements correctly from suggestion', async () => {
      section.renderGhostStyleTreeElements('color: red; font-size: 10px;');

      const ghostElements = section.propertiesTreeOutline.rootElement().children().filter(
          e => e instanceof Elements.StylePropertyTreeElement.GhostStylePropertyTreeElement);
      assert.lengthOf(ghostElements, 2);
      assert.strictEqual(ghostElements[0].property.name, 'color');
      assert.strictEqual(ghostElements[0].property.value, 'red');
      assert.strictEqual(ghostElements[1].property.name, 'font-size');
      assert.strictEqual(ghostElements[1].property.value, '10px');
    });

    it('clears ghost elements correctly', async () => {
      const rootElement = section.propertiesTreeOutline.rootElement();
      section.renderGhostStyleTreeElements('color: red;');

      let ghostElements = rootElement.children().filter(
          e => e instanceof Elements.StylePropertyTreeElement.GhostStylePropertyTreeElement);
      assert.lengthOf(ghostElements, 1);

      section.clearGhostStyleTreeElements();

      ghostElements = rootElement.children().filter(
          e => e instanceof Elements.StylePropertyTreeElement.GhostStylePropertyTreeElement);
      assert.lengthOf(ghostElements, 0);
    });
  });

  describe('onCSSModelChanged', () => {
    let cssModel: SDK.CSSModel.CSSModel;
    let matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles;
    let container: Elements.StylesSidebarPane.StylesSidebarPane;

    beforeEach(async () => {
      cssModel = new SDK.CSSModel.CSSModel(createTarget());
      matchedStyles = await getMatchedStylesWithBlankRule({cssModel});
      container = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
    });

    function createSection(): Elements.StylePropertiesSection.StylePropertiesSection {
      return new Elements.StylePropertiesSection.StylePropertiesSection(
          container, matchedStyles, matchedStyles.nodeStyles()[0], 0, new Map(), new Map(), null);
    }

    it('updates internal model and values upon receiving a direct edit event', async () => {
      const section = createSection();
      const styleSheetEditedSpy = sinon.spy(section, 'styleSheetEdited');
      const refreshComputedValuesSpy = sinon.stub(section, 'refreshComputedValues').resolves();

      const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
      const edit = new SDK.CSSModel.Edit(
          styleSheetId, TextUtils.TextRange.TextRange.createFromLocation(0, 0), 'color: red', null);
      const eventData: SDK.CSSModel.StyleSheetChangedEvent = {styleSheetId, edit};

      computedStyleModel.dispatchEventToListeners(ComputedStyle.ComputedStyleModel.Events.CSS_MODEL_CHANGED, eventData);

      await expectCalled(refreshComputedValuesSpy);

      sinon.assert.calledWith(styleSheetEditedSpy, edit);
    });

    it('updates computed values while the container panel is in an editing state', async () => {
      container.isEditingStyle = true;
      const section = createSection();
      const refreshComputedValuesSpy = sinon.stub(section, 'refreshComputedValues').resolves();

      const eventData: ComputedStyle.ComputedStyleModel.CSSModelChangedEvent = {
        styleSheetId: '0' as Protocol.DOM.StyleSheetId,
      } as ComputedStyle.ComputedStyleModel.CSSModelChangedEvent;

      computedStyleModel.dispatchEventToListeners(ComputedStyle.ComputedStyleModel.Events.CSS_MODEL_CHANGED, eventData);

      await expectCalled(refreshComputedValuesSpy);
    });

    it('updates computed values while a user operation (like a popover) is active in the container', async () => {
      container.userOperation = true;
      const section = createSection();
      const refreshComputedValuesSpy = sinon.stub(section, 'refreshComputedValues').resolves();

      const eventData: ComputedStyle.ComputedStyleModel.CSSModelChangedEvent = {
        styleSheetId: '0' as Protocol.DOM.StyleSheetId,
      } as ComputedStyle.ComputedStyleModel.CSSModelChangedEvent;

      computedStyleModel.dispatchEventToListeners(ComputedStyle.ComputedStyleModel.Events.CSS_MODEL_CHANGED, eventData);

      await expectCalled(refreshComputedValuesSpy);
    });

    it('does not update computed values if not editing and no user operation is active', async () => {
      container.isEditingStyle = false;
      container.userOperation = false;
      const section = createSection();
      const refreshComputedValuesSpy = sinon.stub(section, 'refreshComputedValues').resolves();

      const eventData: ComputedStyle.ComputedStyleModel.CSSModelChangedEvent = {
        styleSheetId: '0' as Protocol.DOM.StyleSheetId,
      } as ComputedStyle.ComputedStyleModel.CSSModelChangedEvent;

      computedStyleModel.dispatchEventToListeners(ComputedStyle.ComputedStyleModel.Events.CSS_MODEL_CHANGED, eventData);

      await new Promise(resolve => setTimeout(resolve, 0));

      sinon.assert.notCalled(refreshComputedValuesSpy);
    });
  });
});
