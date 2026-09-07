// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Protocol from '../../generated/protocol.js';
import * as ComputedStyle from '../../models/computed_style/computed_style.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {getMatchedStylesWithBlankRule, getMatchedStylesWithStylesheet} from '../../testing/StyleHelpers.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import {render} from '../../ui/lit/lit.js';

import * as Elements from './elements.js';

describeWithEnvironment('StylesPropertySection', () => {
  let computedStyleModel: ComputedStyle.ComputedStyleModel.ComputedStyleModel;
  let connection: MockCDPConnection;
  beforeEach(() => {
    connection = new MockCDPConnection();
    SDK.PageResourceLoader.PageResourceLoader.instance({forceNew: true, loadOverride: null, maxConcurrentLoads: 1});
    computedStyleModel = new ComputedStyle.ComputedStyleModel.ComputedStyleModel();
  });

  afterEach(() => {
    SDK.PageResourceLoader.PageResourceLoader.removeInstance();
  });

  it('contains specificity information', async () => {
    const specificity = {
      a: 0,
      b: 1,
      c: 0,
      components: [{text: '.child', a: 0, b: 1, c: 0}],
    };
    const matchedStyles = await getMatchedStylesWithBlankRule(
        {cssModel: new SDK.CSSModel.CSSModel(createTarget({connection})), connection});
    const section = new Elements.StylePropertiesSection.StylePropertiesSection(
        new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel), matchedStyles,
        matchedStyles.nodeStyles()[0], 0, new Map(), new Map(), null);
    section.renderSelectors([{text: '.child', specificity}], [true], new WeakMap());
    const selectorElement = section.element.querySelector('.selector');
    assert.strictEqual(selectorElement?.textContent, '.child');
    const tooltip = section.element?.querySelector('devtools-tooltip');
    assert.exists(tooltip);
    const details = tooltip.querySelector('details');
    assert.exists(details);
    const summary = details.querySelector('summary');
    assert.exists(summary);
    assert.include(summary.textContent ?? '', 'Specificity: (0,1,0)');
    assert.include(tooltip.textContent ?? '', '(b) Class-like: .child');
  });

  it('renders selectors correctly', async () => {
    const matchedStyles = await getMatchedStylesWithBlankRule(
        {cssModel: new SDK.CSSModel.CSSModel(createTarget({connection})), connection});
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
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel);
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
        await getMatchedStylesWithStylesheet({cssModel, origin, styleSheetId, ...header, matchedPayload, connection});

    const rule = matchedStyles.nodeStyles()[0].parentRule;
    const linkifier = sinon.createStubInstance(Components.Linkifier.Linkifier);
    const originNode =
        Elements.StylePropertiesSection.StylePropertiesSection.createRuleOriginNode(matchedStyles, linkifier, rule);
    const div = document.createElement('div');
    render(originNode, div);
    assert.strictEqual(div.textContent, '<style>');
    sinon.assert.calledOnce(linkifier.linkifyCSSLocation);
    assert.strictEqual(linkifier.linkifyCSSLocation.args[0][0].styleSheetId, styleSheetId);
    assert.strictEqual(linkifier.linkifyCSSLocation.args[0][0].url, 'constructed.css');
  });

  it('displays the proper sourceURL for matched styles with spaces in URL', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const range = {startLine: 0, endLine: 1, startColumn: 0, endColumn: 0};
    const header = {
      sourceURL: 'file:///drive/path%20with%20spaces/style.css',
      isMutable: true,
      hasSourceURL: true,
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
    const matchedStyles =
        await getMatchedStylesWithStylesheet({cssModel, origin, styleSheetId, ...header, matchedPayload, connection});

    const rule = matchedStyles.nodeStyles()[0].parentRule;
    const linkifier = sinon.createStubInstance(Components.Linkifier.Linkifier);
    Elements.StylePropertiesSection.StylePropertiesSection.createRuleOriginNode(matchedStyles, linkifier, rule);

    sinon.assert.calledOnce(linkifier.linkifyCSSLocation);
    assert.strictEqual(linkifier.linkifyCSSLocation.args[0][0].styleSheetId, styleSheetId);
    assert.strictEqual(linkifier.linkifyCSSLocation.args[0][0].url, 'file:///drive/path%20with%20spaces/style.css');
  });

  it('displays the proper sourceMappingURL origin for constructed stylesheets', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel);
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
        await getMatchedStylesWithStylesheet({cssModel, origin, styleSheetId, ...header, matchedPayload, connection});

    const styleSheetHeader = cssModel.styleSheetHeaderForId(styleSheetId);
    assert.exists(styleSheetHeader);
    const sourceMap = await cssModel.sourceMapManager().sourceMapForClientPromise(styleSheetHeader);
    assert.exists(sourceMap);

    const rule = matchedStyles.nodeStyles()[0].parentRule;
    const linkifier = sinon.createStubInstance(Components.Linkifier.Linkifier);
    const originNode =
        Elements.StylePropertiesSection.StylePropertiesSection.createRuleOriginNode(matchedStyles, linkifier, rule);
    const div = document.createElement('div');
    render(originNode, div);
    assert.strictEqual(div.textContent, 'constructed stylesheet');
    sinon.assert.calledOnce(linkifier.linkifyCSSLocation);
    // Since we already asserted that a sourcemap exists for our header, it's sufficient to check that
    // linkifyCSSLocation has been called. Verifying that linkifyCSSLocation applies source mapping is out of scope
    // for this unit under test.
    assert.strictEqual(linkifier.linkifyCSSLocation.args[0][0].styleSheetId, styleSheetId);
    assert.strictEqual(linkifier.linkifyCSSLocation.args[0][0].url, '');
  });

  it('properly renders ancestor rules', async () => {
    Common.Settings.Settings.instance().moduleSetting('text-editor-indent').set('  ');
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel);
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
          await getMatchedStylesWithStylesheet({cssModel, origin, styleSheetId, ...range, matchedPayload, connection});
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
          await getMatchedStylesWithStylesheet({cssModel, origin, styleSheetId, ...range, matchedPayload, connection});
      const declaration = matchedStyles.nodeStyles()[0];
      assert.exists(declaration);
      const section = new Elements.StylePropertiesSection.StylePropertiesSection(
          stylesSidebarPane, matchedStyles, declaration, 0, null, null, null);
      assert.strictEqual(section.element.textContent, 'div {  body {    }}');
    }
  });

  it('updates property rule property names', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel);
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

    const matchedStyles = await getMatchedStylesWithStylesheet(
        {cssModel, origin, styleSheetId, ...range, propertyRules, matchedPayload, connection});

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
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel);
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
        {cssModel, origin, styleSheetId, ...range, atRules: [fontPaletteValuesRule], connection});
    const declaration = matchedStyles.atRules()[0]?.style;
    assert.exists(declaration);
    const section =
        new Elements.StylePropertiesSection.AtRuleSection(stylesSidebarPane, matchedStyles, declaration, 0, true);
    assert.strictEqual(section.element.textContent, '@font-palette-values --palette-name {}');
  });

  it('renders active and inactive position-try rule sections correctly', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel);
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
        await getMatchedStylesWithStylesheet({cssModel, origin, styleSheetId, ...range, positionTryRules, connection});
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

  describe('activeAiSuggestion', () => {
    let section: Elements.StylePropertiesSection.StylePropertiesSection;
    let cssProperty: SDK.CSSProperty.CSSProperty;
    const sourceTreeElement = sinon.createStubInstance(Elements.StylePropertyTreeElement.StylePropertyTreeElement);

    beforeEach(async () => {
      const matchedStyles = await getMatchedStylesWithBlankRule(
          {cssModel: new SDK.CSSModel.CSSModel(createTarget({connection})), connection});
      section = new Elements.StylePropertiesSection.StylePropertiesSection(
          new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel), matchedStyles,
          matchedStyles.nodeStyles()[0], 0, new Map(), new Map(), null);
      cssProperty = new SDK.CSSProperty.CSSProperty(section.styleInternal, 0, '', '', true, false, true, false);
      sourceTreeElement.property = cssProperty;
      sinon.stub(section, 'closestPropertyForEditing').returns(sourceTreeElement);
    });

    it('setting activeAiSuggestion triggers rendering', async () => {
      const renderActiveAiSuggestionSpy = sinon.spy(sourceTreeElement, 'renderActiveAiSuggestion');
      const activeAiSuggestion = {
        text: 'background-color: white; color: red; font-size: 10px;',
        properties: [
          {name: 'background-color', value: 'white'},
          {name: 'color', value: 'red'},
          {name: 'font-size', value: '10px'},
        ],
        cssProperty,
        cursorPosition: 0,
      };

      section.activeAiSuggestion = activeAiSuggestion;

      sinon.assert.calledOnce(renderActiveAiSuggestionSpy);
      assert.deepEqual(renderActiveAiSuggestionSpy.firstCall.args[0], activeAiSuggestion.properties[0]);
      const ghostElements = section.propertiesTreeOutline.rootElement().children().filter(
          e => e instanceof Elements.StylePropertyTreeElement.GhostStylePropertyTreeElement);
      assert.lengthOf(ghostElements, 2);
      assert.strictEqual(ghostElements[0].property.name, 'color');
      assert.strictEqual(ghostElements[0].property.value, 'red');
      assert.strictEqual(ghostElements[1].property.name, 'font-size');
      assert.strictEqual(ghostElements[1].property.value, '10px');
    });

    it('clearing activeAiSuggestion triggers cleanup', async () => {
      const renderActiveAiSuggestionSpy = sinon.spy(sourceTreeElement, 'renderActiveAiSuggestion');
      const clearActiveAiSuggestionSpy = sinon.spy(sourceTreeElement, 'clearActiveAiSuggestion');
      const rootElement = section.propertiesTreeOutline.rootElement();
      const activeAiSuggestion = {
        text: 'color: red; font-size: 10px;',
        properties: [{name: 'color', value: 'red'}, {name: 'font-size', value: '10px'}],
        cssProperty,
        cursorPosition: 0,
      };

      section.activeAiSuggestion = activeAiSuggestion;

      sinon.assert.calledOnce(renderActiveAiSuggestionSpy);
      assert.deepEqual(renderActiveAiSuggestionSpy.firstCall.args[0], activeAiSuggestion.properties[0]);
      let ghostElements = rootElement.children().filter(
          e => e instanceof Elements.StylePropertyTreeElement.GhostStylePropertyTreeElement);
      assert.lengthOf(ghostElements, 1);

      section.activeAiSuggestion = undefined;

      sinon.assert.calledOnce(clearActiveAiSuggestionSpy);
      ghostElements = rootElement.children().filter(
          e => e instanceof Elements.StylePropertyTreeElement.GhostStylePropertyTreeElement);
      assert.lengthOf(ghostElements, 0);
    });

    it('commitActiveAiSuggestion calls commitAiSuggestion with correct text', async () => {
      const renderActiveAiSuggestionSpy = sinon.spy(sourceTreeElement, 'renderActiveAiSuggestion');
      const commitAiSuggestionStub = sinon.stub(sourceTreeElement, 'commitAiSuggestion').resolves();
      const rootElement = section.propertiesTreeOutline.rootElement();
      const activeAiSuggestion = {
        text: 'background-color: white; color: red; font-size: 10px;',
        properties: [
          {name: 'background-color', value: 'white'},
          {name: 'color', value: 'red'},
          {name: 'font-size', value: '10px'},
        ],
        cssProperty,
        cursorPosition: 0,
      };

      section.activeAiSuggestion = activeAiSuggestion;

      sinon.assert.calledOnce(renderActiveAiSuggestionSpy);
      assert.deepEqual(renderActiveAiSuggestionSpy.firstCall.args[0], activeAiSuggestion.properties[0]);
      const ghostElements = rootElement.children().filter(
          e => e instanceof Elements.StylePropertyTreeElement.GhostStylePropertyTreeElement);
      assert.lengthOf(ghostElements, 2);

      await section.commitActiveAiSuggestion();

      sinon.assert.calledOnceWithExactly(
          commitAiSuggestionStub, 'background-color: white; color: red; font-size: 10px;');
    });
    it('looks like unit test http/tests/devtools/elements/styles-1/commit-selector.js', async () => {
      const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel) as SDK.CSSModel.CSSModel;

      const origin = Protocol.CSS.StyleSheetOrigin.Regular;
      const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
      const range = {startLine: 0, endLine: 1, startColumn: 0, endColumn: 0};
      const header: Partial<Protocol.CSS.CSSStyleSheetHeader> = {
        sourceMapURL: '',
        isMutable: true,
        isConstructed: false,
        length: 1,
        ...range,
      };

      const matchedPayload: Protocol.CSS.RuleMatch[] = [{
        rule: {
          selectorList: {selectors: [{text: '#inspected', range}], text: '#inspected'},
          origin,
          styleSheetId,
          style: {cssProperties: [{name: 'color', value: 'red'}], shorthandEntries: [], range},
        },
        matchingSelectors: [0],
      }];

      const matchedStyles =
          await getMatchedStylesWithStylesheet({cssModel, origin, styleSheetId, ...header, matchedPayload, connection});
      const declaration = matchedStyles.nodeStyles()[0];

      const setSelectorSpy = sinon.spy(cssModel, 'setSelectorText');

      const section = new Elements.StylePropertiesSection.StylePropertiesSection(
          new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel), matchedStyles, declaration, 0,
          new Map(), new Map(), null);

      const selectorElement = section.element.querySelector('.selector') as HTMLElement;

      let commitHandler: (element: Element, newText: string, oldText: string, context: unknown,
                          moveDirection: string) => void;
      const startEditingStub =
          sinon.stub(UI.InplaceEditor.InplaceEditor, 'startEditing').callsFake((element, config) => {
            commitHandler = config.commitHandler as typeof commitHandler;
            return {cancel: () => {}, commit: () => {}};
          });

      section.startEditingSelector();
      sinon.assert.calledOnce(startEditingStub);

      commitHandler!(selectorElement, 'hr, #inspected', '#inspected', undefined, 'forward');

      await new Promise(resolve => setTimeout(resolve, 0));
      sinon.assert.calledOnce(setSelectorSpy);
      assert.strictEqual(setSelectorSpy.firstCall.args[2], 'hr, #inspected');

      section.startEditingSelector();
      commitHandler!(selectorElement, '#inspectedChanged', 'hr, #inspected', undefined, 'forward');

      await new Promise(resolve => setTimeout(resolve, 0));
      sinon.assert.calledTwice(setSelectorSpy);
      assert.strictEqual(setSelectorSpy.secondCall.args[2], '#inspectedChanged');
    });

    it('marks matching selectors properly after rule creation and selector change', async () => {
      const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel) as SDK.CSSModel.CSSModel;

      const origin = Protocol.CSS.StyleSheetOrigin.Regular;
      const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
      const range = {startLine: 0, endLine: 1, startColumn: 0, endColumn: 0};
      const header: Partial<Protocol.CSS.CSSStyleSheetHeader> = {
        sourceMapURL: '',
        isMutable: true,
        isConstructed: false,
        length: 1,
        ...range,
      };

      const initialSelectors = [
        {text: 'foo', range},
        {text: '#inspected', range},
        {text: '.bar', range},
        {text: '#inspected', range},
      ];

      const matchedPayload: Protocol.CSS.RuleMatch[] = [{
        rule: {
          selectorList: {selectors: initialSelectors, text: 'foo, #inspected, .bar, #inspected'},
          origin,
          styleSheetId,
          style: {cssProperties: [{name: 'color', value: 'red'}], shorthandEntries: [], range},
        },
        matchingSelectors: [1, 3],
      }];

      const matchedStyles =
          await getMatchedStylesWithStylesheet({cssModel, origin, styleSheetId, ...header, matchedPayload, connection});
      const declaration = matchedStyles.nodeStyles()[0];

      const section = new Elements.StylePropertiesSection.StylePropertiesSection(
          new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel), matchedStyles, declaration, 0,
          new Map(), new Map(), null);

      const selectorElement = section.element.querySelector('.selector') as HTMLElement;
      assert.exists(selectorElement);

      let simpleSelectors = selectorElement.querySelectorAll('.simple-selector');
      assert.lengthOf(simpleSelectors, 4);
      assert.strictEqual(simpleSelectors[0].textContent, 'foo');
      assert.isFalse(simpleSelectors[0].classList.contains('selector-matches'));
      assert.strictEqual(simpleSelectors[1].textContent, '#inspected');
      assert.isTrue(simpleSelectors[1].classList.contains('selector-matches'));
      assert.strictEqual(simpleSelectors[2].textContent, '.bar');
      assert.isFalse(simpleSelectors[2].classList.contains('selector-matches'));
      assert.strictEqual(simpleSelectors[3].textContent, '#inspected');
      assert.isTrue(simpleSelectors[3].classList.contains('selector-matches'));

      const newSelectorList = {
        selectors: [
          {text: '#inspected', range},
          {text: 'a', range},
          {text: 'hr', range},
        ],
        text: '#inspected, a, hr',
      };

      const rule = declaration.parentRule as SDK.CSSRule.CSSStyleRule;
      assert.exists(rule);

      connection.setSuccessHandler('CSS.getStyleSheetText',
                                   () => ({text: 'foo, #inspected, .bar, #inspected {\n  color: red;\n}'}));
      connection.setSuccessHandler('CSS.setRuleSelector', () => {
        rule.selectors = [
          {text: '#inspected'},
          {text: 'a'},
          {text: 'hr'},
        ] as typeof rule.selectors;
        return {
          selectorList: newSelectorList,
        };
      });

      let commitHandler: (element: Element, newText: string, oldText: string, context: unknown,
                          moveDirection: string) => void;
      sinon.stub(UI.InplaceEditor.InplaceEditor, 'startEditing').callsFake((element, config) => {
        commitHandler = config.commitHandler as typeof commitHandler;
        return {cancel: () => {}, commit: () => {}};
      });

      const setSelectorSpy = sinon.spy(cssModel, 'setSelectorText');

      section.startEditingSelector();
      commitHandler!(selectorElement, '#inspected, a, hr', 'foo, #inspected, .bar, #inspected', undefined, 'forward');

      await setSelectorSpy.returnValues[0];
      await new Promise(resolve => setTimeout(resolve, 0));

      simpleSelectors = selectorElement.querySelectorAll('.simple-selector');
      assert.lengthOf(simpleSelectors, 3);
      assert.strictEqual(simpleSelectors[0].textContent, '#inspected');
      assert.isTrue(simpleSelectors[0].classList.contains('selector-matches'));
      assert.strictEqual(simpleSelectors[1].textContent, 'a');
      assert.isFalse(simpleSelectors[1].classList.contains('selector-matches'));
      assert.strictEqual(simpleSelectors[2].textContent, 'hr');
      assert.isFalse(simpleSelectors[2].classList.contains('selector-matches'));
    });
  });

  it('renders ancestor rules with rich sub-selectors and specificity tooltips when parent rule is found', async () => {
    Common.Settings.Settings.instance().moduleSetting('text-editor-indent').set('  ');
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;

    const parentRule: Protocol.CSS.RuleMatch = {
      rule: {
        selectorList: {
          selectors: [
            {text: '.header', specificity: {a: 0, b: 1, c: 0}},
            {text: '.sidebar', specificity: {a: 0, b: 1, c: 0}},
          ],
          text: '.header, .sidebar',
        },
        origin,
        style: {cssProperties: [{name: 'display', value: 'flex'}], shorthandEntries: []},
      },
      matchingSelectors: [0],
    };

    const childRule: Protocol.CSS.RuleMatch = {
      rule: {
        nestingSelectors: ['.header, .sidebar'],
        ruleTypes: [Protocol.CSS.CSSRuleType.StyleRule],
        selectorList: {selectors: [{text: '& .title', specificity: {a: 0, b: 2, c: 0}}], text: '& .title'},
        origin,
        style: {cssProperties: [{name: 'color', value: 'blue'}], shorthandEntries: []},
      },
      matchingSelectors: [0],
    };

    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      matchedPayload: [parentRule, childRule],
      connection,
    });

    const declaration = matchedStyles.nodeStyles()[0];  // childRule declaration
    assert.exists(declaration);
    const section = new Elements.StylePropertiesSection.StylePropertiesSection(stylesSidebarPane, matchedStyles,
                                                                               declaration, 0, null, null, null);

    const ancestorList = section.element.querySelector('.ancestor-rule-list');
    assert.exists(ancestorList);
    const simpleSelectors = ancestorList.querySelectorAll('.simple-selector');
    assert.lengthOf(simpleSelectors, 2);
    assert.strictEqual(simpleSelectors[0].textContent, '.header');
    assert.isTrue(simpleSelectors[0].classList.contains('selector-matches'));
    assert.strictEqual(simpleSelectors[1].textContent, '.sidebar');
    assert.isFalse(simpleSelectors[1].classList.contains('selector-matches'));

    const tooltip = ancestorList.querySelector('devtools-tooltip');
    assert.exists(tooltip);
    assert.include(tooltip.textContent ?? '', 'Specificity: (0,1,0)');
  });

  it('highlights matching text in ancestor nesting headers when filter is active', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
    sinon.stub(stylesSidebarPane, 'filterRegex').returns(new RegExp('header', 'i'));
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;

    const parentRule: Protocol.CSS.RuleMatch = {
      rule: {
        selectorList: {
          selectors: [
            {text: '.header', specificity: {a: 0, b: 1, c: 0}},
            {text: '.sidebar', specificity: {a: 0, b: 1, c: 0}},
          ],
          text: '.header, .sidebar',
        },
        origin,
        style: {cssProperties: [{name: 'display', value: 'flex'}], shorthandEntries: []},
      },
      matchingSelectors: [0],
    };

    const childRule: Protocol.CSS.RuleMatch = {
      rule: {
        nestingSelectors: ['.header, .sidebar'],
        ruleTypes: [Protocol.CSS.CSSRuleType.StyleRule],
        selectorList: {selectors: [{text: '& .title', specificity: {a: 0, b: 2, c: 0}}], text: '& .title'},
        origin,
        style: {cssProperties: [{name: 'color', value: 'blue'}], shorthandEntries: []},
      },
      matchingSelectors: [0],
    };

    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      matchedPayload: [parentRule, childRule],
      connection,
    });

    const declaration = matchedStyles.nodeStyles()[0];
    assert.exists(declaration);
    const section = new Elements.StylePropertiesSection.StylePropertiesSection(stylesSidebarPane, matchedStyles,
                                                                               declaration, 0, null, null, null);

    section.markSelectorHighlights();

    const ancestorList = section.element.querySelector('.ancestor-rule-list');
    assert.exists(ancestorList);
    const simpleSelectors = ancestorList.querySelectorAll('.simple-selector');
    assert.lengthOf(simpleSelectors, 2);
    assert.isTrue(simpleSelectors[0].classList.contains('filter-match'));
    assert.isFalse(simpleSelectors[1].classList.contains('filter-match'));
  });

  it('triggers node overlay highlight when hovering over ancestor nesting header selector', async () => {
    const target = createTarget({connection});
    const cssModel = target.model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const overlayModel = domModel.overlayModel();

    const node = SDK.DOMModel.DOMNode.create(domModel, null, false, {
      nodeId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
    });

    const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
    sinon.stub(stylesSidebarPane, 'node').returns(node);
    const clock = sinon.useFakeTimers();

    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;

    const parentRule: Protocol.CSS.RuleMatch = {
      rule: {
        selectorList: {
          selectors: [
            {text: '.header', specificity: {a: 0, b: 1, c: 0}},
            {text: '.sidebar', specificity: {a: 0, b: 1, c: 0}},
          ],
          text: '.header, .sidebar',
        },
        origin,
        style: {cssProperties: [{name: 'display', value: 'flex'}], shorthandEntries: []},
      },
      matchingSelectors: [0],
    };

    const childRule: Protocol.CSS.RuleMatch = {
      rule: {
        nestingSelectors: ['.header, .sidebar'],
        ruleTypes: [Protocol.CSS.CSSRuleType.StyleRule],
        selectorList: {selectors: [{text: '& .title', specificity: {a: 0, b: 2, c: 0}}], text: '& .title'},
        origin,
        style: {cssProperties: [{name: 'color', value: 'blue'}], shorthandEntries: []},
      },
      matchingSelectors: [0],
    };

    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      node,
      origin,
      styleSheetId,
      matchedPayload: [parentRule, childRule],
      connection,
    });

    const highlightSpy = sinon.spy(overlayModel, 'highlightInOverlay');
    const hideStub = sinon.stub(SDK.OverlayModel.OverlayModel, 'hideDOMNodeHighlight');

    const declaration = matchedStyles.nodeStyles()[0];
    assert.exists(declaration);
    const section = new Elements.StylePropertiesSection.StylePropertiesSection(stylesSidebarPane, matchedStyles,
                                                                               declaration, 0, null, null, null);

    const ancestorList = section.element.querySelector('.ancestor-rule-list');
    assert.exists(ancestorList);
    const selectorHeader = ancestorList.querySelector('.selector');
    assert.exists(selectorHeader);

    selectorHeader.dispatchEvent(new MouseEvent('mouseenter'));
    clock.tick(300);

    sinon.assert.calledOnceWithExactly(highlightSpy, {node, selectorList: '.header, .sidebar'}, 'all');

    selectorHeader.dispatchEvent(new MouseEvent('mouseleave'));
    sinon.assert.called(hideStub);
    clock.restore();
  });

  it('triggers node overlay highlight with resolved :is(...) selector when hovering nested section selector',
     async () => {
       const target = createTarget({connection});
       const cssModel = target.model(SDK.CSSModel.CSSModel);
       assert.exists(cssModel);
       const domModel = target.model(SDK.DOMModel.DOMModel);
       assert.exists(domModel);
       const overlayModel = domModel.overlayModel();

       const node = SDK.DOMModel.DOMNode.create(domModel, null, false, {
         nodeId: 1 as Protocol.DOM.NodeId,
         backendNodeId: 1 as Protocol.DOM.BackendNodeId,
         nodeType: Node.ELEMENT_NODE,
         nodeName: 'DIV',
         localName: 'div',
         nodeValue: '',
       });

       const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
       sinon.stub(stylesSidebarPane, 'node').returns(node);

       const origin = Protocol.CSS.StyleSheetOrigin.Regular;
       const styleSheetId = '0' as Protocol.DOM.StyleSheetId;

       const parentRule: Protocol.CSS.RuleMatch = {
         rule: {
           selectorList: {selectors: [{text: '.card', specificity: {a: 0, b: 1, c: 0}}], text: '.card'},
           origin,
           style: {cssProperties: [{name: 'display', value: 'flex'}], shorthandEntries: []},
         },
         matchingSelectors: [0],
       };

       const childRule: Protocol.CSS.RuleMatch = {
         rule: {
           nestingSelectors: ['.card'],
           ruleTypes: [Protocol.CSS.CSSRuleType.StyleRule],
           selectorList: {selectors: [{text: '& .title', specificity: {a: 0, b: 2, c: 0}}], text: '& .title'},
           origin,
           style: {cssProperties: [{name: 'color', value: 'blue'}], shorthandEntries: []},
         },
         matchingSelectors: [0],
       };

       const matchedStyles = await getMatchedStylesWithStylesheet({
         cssModel,
         node,
         origin,
         styleSheetId,
         matchedPayload: [parentRule, childRule],
         connection,
       });

       const highlightSpy = sinon.spy(overlayModel, 'highlightInOverlay');

       const declaration = matchedStyles.nodeStyles()[0];
       assert.exists(declaration);
       const section = new Elements.StylePropertiesSection.StylePropertiesSection(stylesSidebarPane, matchedStyles,
                                                                                  declaration, 0, null, null, null);

       const clock = sinon.useFakeTimers();

       const selectorElement = section.element.querySelector('.selector:not(.ancestor-rule-list *)');
       assert.exists(selectorElement);
       selectorElement.dispatchEvent(new MouseEvent('mouseenter'));
       clock.tick(300);
       sinon.assert.calledWith(highlightSpy, {node, selectorList: ':is(.card) .title'}, 'all');

       clock.restore();
     });
});
