// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as ComputedStyle from '../../models/computed_style/computed_style.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
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
    const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
    const resourceMapping =
        new Bindings.ResourceMapping.ResourceMapping(SDK.TargetManager.TargetManager.instance(), workspace);
    Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance(
        {forceNew: true, resourceMapping, targetManager: SDK.TargetManager.TargetManager.instance()});
    computedStyleModel = new ComputedStyle.ComputedStyleModel.ComputedStyleModel();
  });

  afterEach(() => {
    Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.removeInstance();
    Workspace.IgnoreListManager.IgnoreListManager.removeInstance();
    Workspace.Workspace.WorkspaceImpl.removeInstance();
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

  it('highlights rule selectors in overlay when hovering selector container', async () => {
    const target = createTarget({connection});
    const cssModel = target.model(SDK.CSSModel.CSSModel)!;
    const domModel = target.model(SDK.DOMModel.DOMModel)!;
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
    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      node,
      origin,
      styleSheetId,
      matchedPayload: [{
        rule: {
          selectorList: {selectors: [{text: '#hovered-rule'}, {text: '.extra'}], text: '#hovered-rule, .extra'},
          origin,
          styleSheetId,
          style: {cssProperties: [{name: 'color', value: 'red'}], shorthandEntries: []},
        },
        matchingSelectors: [0],
      }],
      connection,
    });
    const highlightSpy = sinon.spy(domModel.overlayModel(), 'highlightInOverlay');
    const hideStub = sinon.stub(SDK.OverlayModel.OverlayModel, 'hideDOMNodeHighlight');
    const section = new Elements.StylePropertiesSection.StylePropertiesSection(
        stylesSidebarPane, matchedStyles, matchedStyles.nodeStyles()[0], 0, null, null, null);
    const clock = sinon.useFakeTimers();
    try {
      const selectorElement = section.element.querySelector('.selector')!;
      selectorElement.dispatchEvent(new MouseEvent('mouseenter'));
      clock.tick(300);
      sinon.assert.calledOnceWithExactly(highlightSpy, {node, selectorList: '#hovered-rule, .extra'}, 'all');
      selectorElement.dispatchEvent(new MouseEvent('mouseleave'));
      sinon.assert.called(hideStub);
    } finally {
      clock.restore();
    }
  });

  it('renders rule origin link with mapped selector line number regardless of start column offset', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel)!;
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const range = {startLine: 12, startColumn: 18, endLine: 14, endColumn: 1};
    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      sourceURL: 'http://example.com/styles.css',
      startLine: 5,
      startColumn: 4,
      matchedPayload: [{
        rule: {
          selectorList: {selectors: [{text: '.offset-selector', range}], text: '.offset-selector'},
          origin,
          styleSheetId,
          style: {cssProperties: [{name: 'color', value: 'green'}], shorthandEntries: [], range},
        },
        matchingSelectors: [0],
      }],
      connection,
    });
    const linkifier = sinon.createStubInstance(Components.Linkifier.Linkifier);
    Elements.StylePropertiesSection.StylePropertiesSection.createRuleOriginNode(
        matchedStyles, linkifier, matchedStyles.nodeStyles()[0].parentRule);
    sinon.assert.calledOnce(linkifier.linkifyCSSLocation);
    assert.strictEqual(linkifier.linkifyCSSLocation.args[0][0].lineNumber, 17);
    assert.strictEqual(linkifier.linkifyCSSLocation.args[0][0].columnNumber, 18);
  });

  it('truncates rules with more than 50 properties and expands all on clicking Show all', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel)!;
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const cssProperties = Array.from({length: 105}, (_, i) => ({name: `--prop-${i}`, value: `${i}px`}));
    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      matchedPayload: [{
        rule: {
          selectorList: {selectors: [{text: 'div'}], text: 'div'},
          origin,
          styleSheetId,
          style: {cssProperties, shorthandEntries: []},
        },
        matchingSelectors: [0],
      }],
      connection,
    });
    const section = new Elements.StylePropertiesSection.StylePropertiesSection(
        new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel), matchedStyles,
        matchedStyles.nodeStyles()[0], 0, null, null, null);
    assert.strictEqual(section.propertiesTreeOutline.rootElement().childCount(), 50);
    const showAllButton = section.element.querySelector('.styles-show-all') as HTMLElement;
    assert.isFalse(showAllButton.classList.contains('hidden'));
    assert.include(showAllButton.textContent ?? '', '55');
    showAllButton.click();
    assert.strictEqual(section.propertiesTreeOutline.rootElement().childCount(), 105);
    assert.isTrue(showAllButton.classList.contains('hidden'));
  });

  it('supports editing selector text via setSelectorText and undoing via DOMModelUndoStack', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel)!;
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const range = {startLine: 0, startColumn: 0, endLine: 0, endColumn: 4};
    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      matchedPayload: [{
        rule: {
          selectorList: {selectors: [{text: '.old', range}], text: '.old'},
          origin,
          styleSheetId,
          style: {cssProperties: [{name: 'color', value: 'red'}], shorthandEntries: [], range},
        },
        matchingSelectors: [0],
      }],
      connection,
    });
    connection.setSuccessHandler('CSS.setRuleSelector',
                                 () => ({
                                   selectorList: {selectors: [{text: '.updated', range}], text: '.updated'},
                                 }));
    let undoCalled = false;
    connection.setSuccessHandler('DOM.undo', () => {
      undoCalled = true;
      return {};
    });
    let redoCalled = false;
    connection.setSuccessHandler('DOM.redo', () => {
      redoCalled = true;
      return {};
    });
    const section = new Elements.StylePropertiesSection.StylePropertiesSection(
        new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel), matchedStyles,
        matchedStyles.nodeStyles()[0], 0, null, null, null);
    cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetChanged, event => {
      if (event.data.edit) {
        section.styleSheetEdited(event.data.edit);
      }
    });
    const rule = matchedStyles.nodeStyles()[0].parentRule as SDK.CSSRule.CSSStyleRule;
    await section.setHeaderText(rule, '.updated');
    assert.strictEqual(rule.selectorText(), '.updated');
    await SDK.DOMModel.DOMModelUndoStack.instance().undo();
    assert.isTrue(undoCalled);
    await SDK.DOMModel.DOMModelUndoStack.instance().redo();
    assert.isTrue(redoCalled);
  });

  it('updates rule header media element when editing @media query text', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel)!;
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const range = {startLine: 0, startColumn: 7, endLine: 0, endColumn: 25};
    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      isMutable: true,
      matchedPayload: [{
        rule: {
          selectorList: {selectors: [{text: 'div', range}], text: 'div'},
          origin,
          styleSheetId,
          media: [{text: '(max-width: 600px)', source: Protocol.CSS.CSSMediaSource.MediaRule, styleSheetId, range}],
          ruleTypes: [Protocol.CSS.CSSRuleType.MediaRule],
          style: {cssProperties: [{name: 'color', value: 'red'}], shorthandEntries: [], styleSheetId, range},
        },
        matchingSelectors: [0],
      }],
      connection,
    });
    const setMediaStub = sinon.stub(cssModel, 'setMediaText').resolves(true);
    const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
    sinon.stub(stylesSidebarPane, 'cssModel').returns(cssModel);
    const refreshSpy = sinon.spy(stylesSidebarPane, 'refreshUpdate');
    const section = new Elements.StylePropertiesSection.StylePropertiesSection(
        stylesSidebarPane, matchedStyles, matchedStyles.nodeStyles()[0], 0, null, null, null);
    const rule = matchedStyles.nodeStyles()[0].parentRule as SDK.CSSRule.CSSStyleRule;
    const queryEl = document.createElement('div');
    queryEl.classList.add('query');
    await (section as unknown as {
      editingMediaCommitted: (q: SDK.CSSMedia.CSSMedia, el: Element, newText: string, oldText: string, ctx: unknown,
                              dir: string) => Promise<void>,
    }).editingMediaCommitted(rule.media[0], queryEl, '(min-width: 800px)', '(max-width: 600px)', undefined, 'forward');
    sinon.assert.calledOnceWithExactly(setMediaStub, styleSheetId, sinon.match.any, '(min-width: 800px)');
    sinon.assert.calledOnce(refreshSpy);
  });

  it('adds a new rule creating a new editable StylePropertiesSection', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel)!;
    const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
    sinon.stub(stylesSidebarPane, 'cssModel').returns(cssModel);
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const range = {startLine: 0, startColumn: 0, endLine: 0, endColumn: 12};
    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      isMutable: true,
      matchedPayload: [{
        rule: {
          selectorList: {selectors: [{text: 'div', range}], text: 'div'},
          origin,
          styleSheetId,
          style: {cssProperties: [], shorthandEntries: [], styleSheetId, range},
        },
        matchingSelectors: [0],
      }],
      connection,
    });
    connection.setSuccessHandler('CSS.addRule',
                                 () => ({
                                   rule: {
                                     selectorList: {selectors: [{text: '.added-rule', range}], text: '.added-rule'},
                                     origin,
                                     styleSheetId,
                                     style: {cssProperties: [], shorthandEntries: [], styleSheetId, range},
                                   },
                                 }));
    const header = cssModel.styleSheetHeaderForId(styleSheetId)!;
    const declRange = matchedStyles.nodeStyles()[0].range!;
    const blankSection = new Elements.StylePropertiesSection.BlankStylePropertiesSection(
        stylesSidebarPane, matchedStyles, 'div', header, declRange, matchedStyles.nodeStyles()[0], 1);
    assert.isTrue(blankSection.isBlank);
    blankSection.editingSelectorCommitted(blankSection.element, '.added-rule', 'div', undefined, '');
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isFalse(blankSection.isBlank);
    assert.strictEqual(blankSection.headerText(), '.added-rule');
  });

  it('moves focus to property editing when committing new rule selector on colon', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel)!;
    const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
    sinon.stub(stylesSidebarPane, 'cssModel').returns(cssModel);
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const range = {startLine: 0, startColumn: 0, endLine: 0, endColumn: 10};
    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      isMutable: true,
      matchedPayload: [{
        rule: {
          selectorList: {selectors: [{text: 'div', range}], text: 'div'},
          origin,
          styleSheetId,
          style: {cssProperties: [], shorthandEntries: [], styleSheetId, range},
        },
        matchingSelectors: [0],
      }],
      connection,
    });
    connection.setSuccessHandler('CSS.addRule',
                                 () => ({
                                   rule: {
                                     selectorList: {selectors: [{text: '.colon-rule', range}], text: '.colon-rule'},
                                     origin,
                                     styleSheetId,
                                     style: {cssProperties: [], shorthandEntries: [], styleSheetId, range},
                                   },
                                 }));
    const header = cssModel.styleSheetHeaderForId(styleSheetId)!;
    const blankSection = new Elements.StylePropertiesSection.BlankStylePropertiesSection(
        stylesSidebarPane, matchedStyles, 'div', header, matchedStyles.nodeStyles()[0].range!,
        matchedStyles.nodeStyles()[0], 1);
    const container = document.createElement('div');
    container.appendChild(blankSection.element);
    const moveSpy = sinon.spy(blankSection, 'moveEditorFromSelector');
    blankSection.editingSelectorCommitted(blankSection.element, '.colon-rule', 'div', undefined, 'forward');
    await new Promise(resolve => setTimeout(resolve, 0));
    sinon.assert.calledOnceWithExactly(moveSpy, 'forward');
    assert.strictEqual(blankSection.propertiesTreeOutline.rootElement().childCount(), 1);
  });

  it('moves focus to first property when committing new rule selector on Tab', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel)!;
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const range = {startLine: 0, startColumn: 0, endLine: 0, endColumn: 10};
    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      isMutable: true,
      matchedPayload: [{
        rule: {
          selectorList: {selectors: [{text: 'div', range}], text: 'div'},
          origin,
          styleSheetId,
          style: {cssProperties: [], shorthandEntries: [], styleSheetId, range},
        },
        matchingSelectors: [0],
      }],
      connection,
    });
    const section = new Elements.StylePropertiesSection.StylePropertiesSection(
        new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel), matchedStyles,
        matchedStyles.nodeStyles()[0], 0, null, null, null);
    const addBlankSpy = sinon.spy(section, 'addNewBlankProperty');
    section.moveEditorFromSelector('forward');
    sinon.assert.calledOnce(addBlankSpy);
    assert.strictEqual(section.propertiesTreeOutline.rootElement().childCount(), 1);
  });

  it('appends new rule at the end of a specific target stylesheet', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel)!;
    const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
    sinon.stub(stylesSidebarPane, 'cssModel').returns(cssModel);
    const dummyNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    dummyNode.simpleSelector.returns('div');
    sinon.stub(stylesSidebarPane, 'node').returns(dummyNode);
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = 'target-sheet' as Protocol.DOM.StyleSheetId;
    const range = {startLine: 0, startColumn: 0, endLine: 1, endColumn: 20};
    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      matchedPayload: [{
        rule: {
          selectorList: {selectors: [{text: 'div', range}], text: 'div'},
          origin,
          styleSheetId,
          style: {cssProperties: [], shorthandEntries: [], styleSheetId, range},
        },
        matchingSelectors: [0],
      }],
      connection,
    });
    const header = cssModel.styleSheetHeaderForId(styleSheetId)!;
    sinon.stub(header, 'requestContentData')
        .resolves(
            new TextUtils.ContentData.ContentData('div { color: red; }\nspan { color: blue; }', false, 'text/css'));
    const firstSection = new Elements.StylePropertiesSection.StylePropertiesSection(
        stylesSidebarPane, matchedStyles, matchedStyles.nodeStyles()[0], 0, null, null, null);
    stylesSidebarPane.sectionBlocks =
        [new Elements.StylesSidebarPane.SectionBlock(null), new Elements.StylesSidebarPane.SectionBlock(null)];
    stylesSidebarPane.sectionBlocks[0].sections = [firstSection];
    const addBlankSpy = sinon.spy(stylesSidebarPane, 'addBlankSection');
    await (stylesSidebarPane as unknown as {
      createNewRuleInStyleSheet: (h: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader) => Promise<void>,
    }).createNewRuleInStyleSheet(header);
    sinon.assert.calledOnce(addBlankSpy);
    const passedRange = addBlankSpy.firstCall.args[2];
    assert.strictEqual(passedRange.startLine, 1);
    assert.strictEqual(passedRange.startColumn, 21);
  });

  it('rebases rule ranges after selector edit so subsequent property setDisabled succeeds', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel)!;
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const selRange = {startLine: 0, startColumn: 0, endLine: 0, endColumn: 4};
    const styleRange = {startLine: 0, startColumn: 6, endLine: 0, endColumn: 18};
    const propRange = {startLine: 0, startColumn: 7, endLine: 0, endColumn: 17};
    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      isMutable: true,
      matchedPayload: [{
        rule: {
          selectorList: {selectors: [{text: '.old', range: selRange}], text: '.old'},
          origin,
          styleSheetId,
          style: {
            cssProperties: [{name: 'color', value: 'red', text: 'color: red;', range: propRange}],
            shorthandEntries: [],
            styleSheetId,
            range: styleRange,
          },
        },
        matchingSelectors: [0],
      }],
      connection,
    });
    const section = new Elements.StylePropertiesSection.StylePropertiesSection(
        new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel), matchedStyles,
        matchedStyles.nodeStyles()[0], 0, null, null, null);
    const rule = matchedStyles.nodeStyles()[0].parentRule as SDK.CSSRule.CSSStyleRule;
    const edit =
        new SDK.CSSModel.Edit(styleSheetId, TextUtils.TextRange.TextRange.fromObject(selRange), '.longer-selector',
                              {selectors: [{text: '.longer-selector', range: selRange}], text: '.longer-selector'});
    section.styleSheetEdited(edit);
    assert.strictEqual(rule.style.range!.startColumn, 18);
    const setStyleTextsStub = sinon.stub(cssModel, 'setStyleText').resolves(true);
    const prop = matchedStyles.nodeStyles()[0].leadingProperties()[0];
    const disabledResult = await prop.setDisabled(true);
    assert.isTrue(disabledResult);
    sinon.assert.calledOnce(setStyleTextsStub);
  });

  it('keeps CSSStyleSheetHeader sourceMap attached when editing rule or property', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel)!;
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const selRange = {startLine: 0, startColumn: 0, endLine: 0, endColumn: 7};
    const styleRange = {startLine: 0, startColumn: 9, endLine: 1, endColumn: 1};
    sinon.stub(SDK.PageResourceLoader.PageResourceLoader.instance(), 'loadResource').resolves({
      content: '{"version":3,"sources":["app.scss"],"mappings":"AAAA"}',
    });
    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      sourceURL: 'http://example.com/app.css',
      sourceMapURL: 'http://example.com/app.css.map',
      isMutable: true,
      matchedPayload: [{
        rule: {
          selectorList: {selectors: [{text: '.mapped', range: selRange}], text: '.mapped'},
          origin,
          styleSheetId,
          style:
              {cssProperties: [{name: 'color', value: 'red'}], shorthandEntries: [], styleSheetId, range: styleRange},
        },
        matchingSelectors: [0],
      }],
      connection,
    });
    const header = cssModel.styleSheetHeaderForId(styleSheetId)!;
    const sourceMap = await cssModel.sourceMapManager().sourceMapForClientPromise(header);
    assert.exists(sourceMap);
    const section = new Elements.StylePropertiesSection.StylePropertiesSection(
        new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel), matchedStyles,
        matchedStyles.nodeStyles()[0], 0, null, null, null);
    section.styleSheetEdited(
        new SDK.CSSModel.Edit(styleSheetId, TextUtils.TextRange.TextRange.fromObject(selRange), '.mapped2',
                              {selectors: [{text: '.mapped2', range: selRange}], text: '.mapped2'}));
    assert.strictEqual(cssModel.sourceMapManager().sourceMapForClient(header), sourceMap);
  });

  it('displays exact source line numbers for multi-line rules in section header', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel)!;
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const range1 = {startLine: 2, startColumn: 0, endLine: 6, endColumn: 1};
    const range2 = {startLine: 8, startColumn: 2, endLine: 12, endColumn: 1};
    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      sourceURL: 'http://example.com/multiline.css',
      matchedPayload: [
        {
          rule: {
            selectorList: {selectors: [{text: '.first', range: range1}], text: '.first'},
            origin,
            styleSheetId,
            style: {cssProperties: [{name: 'color', value: 'red'}], shorthandEntries: [], range: range1},
          },
          matchingSelectors: [0],
        },
        {
          rule: {
            selectorList: {selectors: [{text: '.second', range: range2}], text: '.second'},
            origin,
            styleSheetId,
            style: {cssProperties: [{name: 'color', value: 'blue'}], shorthandEntries: [], range: range2},
          },
          matchingSelectors: [0],
        },
      ],
      connection,
    });
    const linkifier = sinon.createStubInstance(Components.Linkifier.Linkifier);
    Elements.StylePropertiesSection.StylePropertiesSection.createRuleOriginNode(
        matchedStyles, linkifier, matchedStyles.nodeStyles()[0].parentRule);
    Elements.StylePropertiesSection.StylePropertiesSection.createRuleOriginNode(
        matchedStyles, linkifier, matchedStyles.nodeStyles()[1].parentRule);
    assert.strictEqual(linkifier.linkifyCSSLocation.firstCall.args[0].lineNumber, 8);
    assert.strictEqual(linkifier.linkifyCSSLocation.secondCall.args[0].lineNumber, 2);
  });

  it('displays <style> tag line offsets for inline stylesheet rules', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel)!;
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const range = {startLine: 3, startColumn: 4, endLine: 5, endColumn: 1};
    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      sourceURL: 'http://example.com/inline.html',
      isInline: true,
      startLine: 10,
      startColumn: 2,
      matchedPayload: [{
        rule: {
          selectorList: {selectors: [{text: '.inline-rule', range}], text: '.inline-rule'},
          origin,
          styleSheetId,
          style: {cssProperties: [{name: 'display', value: 'block'}], shorthandEntries: [], range},
        },
        matchingSelectors: [0],
      }],
      connection,
    });
    const linkifier = sinon.createStubInstance(Components.Linkifier.Linkifier);
    Elements.StylePropertiesSection.StylePropertiesSection.createRuleOriginNode(
        matchedStyles, linkifier, matchedStyles.nodeStyles()[0].parentRule);
    sinon.assert.calledOnce(linkifier.linkifyCSSLocation);
    assert.strictEqual(linkifier.linkifyCSSLocation.firstCall.args[0].lineNumber, 13);
    assert.strictEqual(linkifier.linkifyCSSLocation.firstCall.args[0].columnNumber, 4);
  });

  it('recovers accurate line numbers for valid rules following malformed CSS rules', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel)!;
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const validRange = {startLine: 15, startColumn: 0, endLine: 17, endColumn: 1};
    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      sourceURL: 'http://example.com/malformed.css',
      matchedPayload: [{
        rule: {
          selectorList: {selectors: [{text: '.recovered', range: validRange}], text: '.recovered'},
          origin,
          styleSheetId,
          style: {cssProperties: [{name: 'opacity', value: '1'}], shorthandEntries: [], range: validRange},
        },
        matchingSelectors: [0],
      }],
      connection,
    });
    const linkifier = sinon.createStubInstance(Components.Linkifier.Linkifier);
    Elements.StylePropertiesSection.StylePropertiesSection.createRuleOriginNode(
        matchedStyles, linkifier, matchedStyles.nodeStyles()[0].parentRule);
    assert.strictEqual(linkifier.linkifyCSSLocation.firstCall.args[0].lineNumber, 15);
  });

  it('updates header source location link of subsequent rules when inserting a new property', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel)!;
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const range1 = {startLine: 0, startColumn: 6, endLine: 2, endColumn: 0};
    const range2 = {startLine: 4, startColumn: 6, endLine: 6, endColumn: 0};
    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      sourceURL: 'http://example.com/update1.css',
      matchedPayload: [
        {
          rule: {
            selectorList: {selectors: [{text: '.r1', range: range1}], text: '.r1'},
            origin,
            styleSheetId,
            style: {cssProperties: [{name: 'color', value: 'red'}], shorthandEntries: [], styleSheetId, range: range1},
          },
          matchingSelectors: [0],
        },
        {
          rule: {
            selectorList: {selectors: [{text: '.r2', range: range2}], text: '.r2'},
            origin,
            styleSheetId,
            style: {cssProperties: [{name: 'color', value: 'blue'}], shorthandEntries: [], styleSheetId, range: range2},
          },
          matchingSelectors: [0],
        },
      ],
      connection,
    });
    const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
    const section2 = new Elements.StylePropertiesSection.StylePropertiesSection(
        stylesSidebarPane, matchedStyles, matchedStyles.nodeStyles()[0], 0, null, null, null);
    const insertEdit = new SDK.CSSModel.Edit(
        styleSheetId,
        TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 12, endLine: 1, endColumn: 12}),
        '\n  margin: 0;', null);
    section2.styleSheetEdited(insertEdit);
    assert.strictEqual(section2.style().range!.startLine, 5);
  });

  it('updates header source location links of subsequent rules when editing a multiline selector', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel)!;
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const range2 = {startLine: 4, startColumn: 6, endLine: 6, endColumn: 0};
    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      sourceURL: 'http://example.com/update2.css',
      matchedPayload: [{
        rule: {
          selectorList: {selectors: [{text: '.r2', range: range2}], text: '.r2'},
          origin,
          styleSheetId,
          style: {cssProperties: [{name: 'color', value: 'blue'}], shorthandEntries: [], styleSheetId, range: range2},
        },
        matchingSelectors: [0],
      }],
      connection,
    });
    const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
    const section2 = new Elements.StylePropertiesSection.StylePropertiesSection(
        stylesSidebarPane, matchedStyles, matchedStyles.nodeStyles()[0], 0, null, null, null);
    const selectorEdit = new SDK.CSSModel.Edit(
        styleSheetId,
        TextUtils.TextRange.TextRange.fromObject({startLine: 0, startColumn: 0, endLine: 0, endColumn: 3}),
        '.a,\n.b,\n.c', null);
    section2.styleSheetEdited(selectorEdit);
    assert.strictEqual(section2.style().range!.startLine, 6);
  });

  it('updates rule ranges and header links of subsequent rules when disabling a property', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel)!;
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const range2 = {startLine: 5, startColumn: 8, endLine: 7, endColumn: 0};
    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      sourceURL: 'http://example.com/update3.css',
      matchedPayload: [{
        rule: {
          selectorList: {selectors: [{text: '.r2', range: range2}], text: '.r2'},
          origin,
          styleSheetId,
          style: {cssProperties: [{name: 'color', value: 'blue'}], shorthandEntries: [], styleSheetId, range: range2},
        },
        matchingSelectors: [0],
      }],
      connection,
    });
    const section2 = new Elements.StylePropertiesSection.StylePropertiesSection(
        new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel), matchedStyles,
        matchedStyles.nodeStyles()[0], 0, null, null, null);
    const disableEdit = new SDK.CSSModel.Edit(
        styleSheetId,
        TextUtils.TextRange.TextRange.fromObject({startLine: 1, startColumn: 2, endLine: 1, endColumn: 14}),
        '/* color: red; */\n/* padding: 0; */', null);
    section2.styleSheetEdited(disableEdit);
    assert.strictEqual(section2.style().range!.startLine, 6);
  });

  it('updates header links of subsequent rules when editing a pseudo-element rule', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel)!;
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const rangeAfter = {startLine: 8, startColumn: 4, endLine: 10, endColumn: 0};
    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      sourceURL: 'http://example.com/update4.css',
      matchedPayload: [{
        rule: {
          selectorList: {selectors: [{text: '.after-pseudo', range: rangeAfter}], text: '.after-pseudo'},
          origin,
          styleSheetId,
          style: {cssProperties: [{name: 'top', value: '0'}], shorthandEntries: [], styleSheetId, range: rangeAfter},
        },
        matchingSelectors: [0],
      }],
      connection,
    });
    const sectionAfter = new Elements.StylePropertiesSection.StylePropertiesSection(
        new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel), matchedStyles,
        matchedStyles.nodeStyles()[0], 0, null, null, null);
    const pseudoEdit = new SDK.CSSModel.Edit(
        styleSheetId,
        TextUtils.TextRange.TextRange.fromObject({startLine: 2, startColumn: 0, endLine: 2, endColumn: 12}),
        'div::before {\n  content: "";\n}', null);
    sectionAfter.styleSheetEdited(pseudoEdit);
    assert.strictEqual(sectionAfter.style().range!.startLine, 10);
  });

  it('removes the added rule section when undoing addNewRule via DOMModelUndoStack', async () => {
    const target = createTarget({connection});
    const domModel = target.model(SDK.DOMModel.DOMModel)!;
    const cssModel = target.model(SDK.CSSModel.CSSModel)!;
    await cssModel.resumeModel();
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const range = {startLine: 0, startColumn: 0, endLine: 0, endColumn: 10};
    const baseRule: Protocol.CSS.RuleMatch = {
      rule: {
        selectorList: {selectors: [{text: 'div', range}], text: 'div'},
        origin,
        styleSheetId,
        style: {cssProperties: [], shorthandEntries: [], styleSheetId, range},
      },
      matchingSelectors: [0],
    };
    const addedRuleMatch: Protocol.CSS.RuleMatch = {
      rule: {
        selectorList: {selectors: [{text: '.undo-rule', range}], text: '.undo-rule'},
        origin,
        styleSheetId,
        style: {cssProperties: [], shorthandEntries: [], styleSheetId, range},
      },
      matchingSelectors: [0],
    };
    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      isMutable: true,
      matchedPayload: [baseRule],
      connection,
    });
    const node = matchedStyles.node();
    (node.domModel as sinon.SinonStub).returns(domModel);
    sinon.stub(domModel, 'nodeForId').returns(node);
    computedStyleModel.node = node;
    const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);

    let ruleAdded = false;
    connection.setSuccessHandler('CSS.getComputedStyleForNode',
                                 () => ({computedStyle: [], extraFields: {isAppearanceBase: false}}));
    connection.setSuccessHandler('CSS.getBackgroundColors', () => ({}));
    connection.setSuccessHandler('CSS.getMatchedStylesForNode',
                                 () => ({
                                   matchedCSSRules: ruleAdded ? [baseRule, addedRuleMatch] : [baseRule],
                                 }));
    connection.setSuccessHandler('CSS.addRule', () => {
      ruleAdded = true;
      return {rule: addedRuleMatch.rule};
    });
    connection.setSuccessHandler('DOM.undo', () => {
      ruleAdded = false;
      cssModel.fireStyleSheetChanged(styleSheetId);
      return {};
    });
    connection.setSuccessHandler('DOM.redo', () => {
      ruleAdded = true;
      cssModel.fireStyleSheetChanged(styleSheetId);
      return {};
    });

    stylesSidebarPane.requestUpdate();
    await stylesSidebarPane.updateComplete;
    assert.lengthOf(stylesSidebarPane.allSections(), 1);

    const header = cssModel.styleSheetHeaderForId(styleSheetId)!;
    const blankSection = new Elements.StylePropertiesSection.BlankStylePropertiesSection(
        stylesSidebarPane, matchedStyles, 'div', header, matchedStyles.nodeStyles()[0].range!,
        matchedStyles.nodeStyles()[0], 1);
    stylesSidebarPane.sectionBlocks[0].sections.push(blankSection);
    blankSection.editingSelectorCommitted(blankSection.element, '.undo-rule', 'div', undefined, '');
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.lengthOf(stylesSidebarPane.allSections(), 2);

    await SDK.DOMModel.DOMModelUndoStack.instance().undo();
    await stylesSidebarPane.updateComplete;
    assert.lengthOf(stylesSidebarPane.allSections(), 1);
    assert.strictEqual(stylesSidebarPane.allSections()[0].headerText(), 'div');

    await SDK.DOMModel.DOMModelUndoStack.instance().redo();
    await stylesSidebarPane.updateComplete;
    assert.lengthOf(stylesSidebarPane.allSections(), 2);
    assert.strictEqual(stylesSidebarPane.allSections()[0].headerText(), '.undo-rule');
    assert.strictEqual(stylesSidebarPane.allSections()[1].headerText(), 'div');
  });

  it('does not throw or crash when undoing addNewRule after node refresh', async () => {
    const target = createTarget({connection});
    const domModel = target.model(SDK.DOMModel.DOMModel)!;
    const cssModel = target.model(SDK.CSSModel.CSSModel)!;
    await cssModel.resumeModel();
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const range = {startLine: 0, startColumn: 0, endLine: 0, endColumn: 10};
    const baseRule: Protocol.CSS.RuleMatch = {
      rule: {
        selectorList: {selectors: [{text: 'div', range}], text: 'div'},
        origin,
        styleSheetId,
        style: {cssProperties: [], shorthandEntries: [], styleSheetId, range},
      },
      matchingSelectors: [0],
    };
    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      isMutable: true,
      matchedPayload: [baseRule],
      connection,
    });
    const node = matchedStyles.node();
    (node.domModel as sinon.SinonStub).returns(domModel);
    sinon.stub(domModel, 'nodeForId').returns(node);
    computedStyleModel.node = node;
    const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
    connection.setSuccessHandler('CSS.getComputedStyleForNode',
                                 () => ({computedStyle: [], extraFields: {isAppearanceBase: false}}));
    connection.setSuccessHandler('CSS.getBackgroundColors', () => ({}));
    connection.setSuccessHandler('CSS.getMatchedStylesForNode', () => ({matchedCSSRules: [baseRule]}));
    connection.setSuccessHandler('CSS.addRule',
                                 () => ({
                                   rule: {
                                     selectorList: {selectors: [{text: '.no-crash', range}], text: '.no-crash'},
                                     origin,
                                     styleSheetId,
                                     style: {cssProperties: [], shorthandEntries: [], styleSheetId, range},
                                   },
                                 }));
    connection.setSuccessHandler('DOM.undo', () => {
      cssModel.fireStyleSheetChanged(styleSheetId);
      return {};
    });

    stylesSidebarPane.requestUpdate();
    await stylesSidebarPane.updateComplete;
    assert.lengthOf(stylesSidebarPane.allSections(), 1);

    const header = cssModel.styleSheetHeaderForId(styleSheetId)!;
    const blankSection = new Elements.StylePropertiesSection.BlankStylePropertiesSection(
        stylesSidebarPane, matchedStyles, 'div', header, matchedStyles.nodeStyles()[0].range!,
        matchedStyles.nodeStyles()[0], 1);
    blankSection.editingSelectorCommitted(blankSection.element, '.no-crash', 'div', undefined, '');
    await new Promise(resolve => setTimeout(resolve, 0));

    sinon.stub(stylesSidebarPane, 'node').returns(null);
    await SDK.DOMModel.DOMModelUndoStack.instance().undo();
    await stylesSidebarPane.updateComplete;
    assert.lengthOf(stylesSidebarPane.allSections(), 0);
  });

  it('renders SVG <style> rule and Attributes Style sections for an SVG element without crashing', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel)!;
    const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = 'svg-sheet' as Protocol.DOM.StyleSheetId;
    const range = {startLine: 5, startColumn: 0, endLine: 5, endColumn: 16};
    const matchedStyles = await getMatchedStylesWithStylesheet({
      cssModel,
      origin,
      styleSheetId,
      sourceURL: 'http://example.com/svg-style.xhtml',
      attributesPayload: {
        cssProperties: [{name: 'width', value: '100px'}],
        shorthandEntries: [],
      },
      matchedPayload: [{
        rule: {
          selectorList: {selectors: [{text: 'rect', range}], text: 'rect'},
          origin,
          styleSheetId,
          style: {
            cssProperties: [{name: 'fill', value: 'red', text: 'fill: red;', range}],
            shorthandEntries: [],
            styleSheetId,
            range,
          },
        },
        matchingSelectors: [0],
      }],
      connection,
    });
    (matchedStyles.node().nodeNameInCorrectCase as sinon.SinonStub).returns('svg:rect');
    const styles = matchedStyles.nodeStyles();
    const linkifier = sinon.createStubInstance(Components.Linkifier.Linkifier);
    Elements.StylePropertiesSection.StylePropertiesSection.createRuleOriginNode(matchedStyles, linkifier,
                                                                                styles[0].parentRule);
    sinon.assert.calledOnce(linkifier.linkifyCSSLocation);
    assert.strictEqual(linkifier.linkifyCSSLocation.firstCall.args[0].lineNumber, 5);

    const svgRuleSection = new Elements.StylePropertiesSection.StylePropertiesSection(stylesSidebarPane, matchedStyles,
                                                                                      styles[0], 0, null, null, null);
    const attrSection = new Elements.StylePropertiesSection.StylePropertiesSection(stylesSidebarPane, matchedStyles,
                                                                                   styles[1], 1, null, null, null);

    assert.strictEqual(svgRuleSection.headerText(), 'rect');
    assert.strictEqual(attrSection.headerText(), 'svg:rect[Attributes Style]');
  });

  describe('KeyframePropertiesSection', () => {
    const styleSheetId = 'keyframes-sheet' as Protocol.DOM.StyleSheetId;
    const keyRange = {startLine: 1, startColumn: 4, endLine: 1, endColumn: 6};

    async function createKeyframeSection() {
      const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel);
      assert.exists(cssModel);
      const origin = Protocol.CSS.StyleSheetOrigin.Regular;
      const matchedStyles = await getMatchedStylesWithStylesheet({
        cssModel,
        origin,
        styleSheetId,
        isMutable: true,
        connection,
        animationsPayload: [{
          animationName: {text: 'animName'},
          keyframes: [{
            origin,
            styleSheetId,
            keyText: {text: '0%', range: keyRange},
            style: {
              styleSheetId,
              range: {startLine: 1, startColumn: 9, endLine: 1, endColumn: 21},
              cssProperties: [{name: 'color', value: 'red'}],
              shorthandEntries: [],
            },
          }],
        }],
      });
      connection.setSuccessHandler('CSS.getStyleSheetText',
                                   () => ({text: '@keyframes animName {\n    0% { color: red; }\n}'}));
      const markUndoableStateStub = sinon.stub().returns({});
      connection.setSuccessHandler('DOM.markUndoableState', markUndoableStateStub);
      const undoStub = sinon.stub().returns({});
      connection.setSuccessHandler('DOM.undo', undoStub);
      const redoStub = sinon.stub().returns({});
      connection.setSuccessHandler('DOM.redo', redoStub);
      const setKeyframeKeyStub = sinon.stub().callsFake((params: Protocol.CSS.SetKeyframeKeyRequest) => {
        if (params.keyText.includes('/*')) {
          return {error: {message: 'Selector or media text is not valid.', code: -32000}};
        }
        return {
          result: {
            keyText: {
              text: params.keyText,
              range: {
                startLine: params.range.startLine,
                startColumn: params.range.startColumn,
                endLine: params.range.startLine,
                endColumn: params.range.startColumn + params.keyText.length,
              },
            },
          },
        };
      });
      connection.setHandler('CSS.setKeyframeKey', setKeyframeKeyStub);
      SDK.DOMModel.DOMModelUndoStack.instance({forceNew: true});

      const keyframesRule = matchedStyles.keyframes()[0];
      assert.exists(keyframesRule);
      const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
      const section = new Elements.StylePropertiesSection.KeyframePropertiesSection(
          stylesSidebarPane, matchedStyles, keyframesRule.keyframes()[0].style, 0);
      // The Styles pane forwards style sheet edits to its sections.
      cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetChanged, event => {
        if (event.data.edit) {
          section.styleSheetEdited(event.data.edit);
        }
      });
      const refreshUpdateSpy = sinon.spy(stylesSidebarPane, 'refreshUpdate');
      let commitHandler: ((element: Element, newText: string, oldText: string, context: unknown,
                           moveDirection: string) => void)|undefined;
      sinon.stub(UI.InplaceEditor.InplaceEditor, 'startEditing').callsFake((_element, config) => {
        commitHandler = config.commitHandler as typeof commitHandler;
        return {cancel: () => {}, commit: () => {}};
      });
      const selectorElement = section.element.querySelector('.keyframe-key');
      assert.instanceOf(selectorElement, HTMLElement);

      // Starts editing the key in the section header and commits `newText` like the in-place editor does on Enter.
      async function editKey(newText: string): Promise<void> {
        assert.instanceOf(selectorElement, HTMLElement);
        section.startEditingSelector();
        assert.exists(commitHandler);
        const oldText = selectorElement.textContent ?? '';
        selectorElement.textContent = newText;
        const callCount = setKeyframeKeyStub.callCount;
        commitHandler(selectorElement, newText, oldText, undefined, '');
        while (setKeyframeKeyStub.callCount === callCount) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        // Let the commit callbacks settle.
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      return {
        section,
        selectorElement,
        editKey,
        setKeyframeKeyStub,
        markUndoableStateStub,
        undoStub,
        redoStub,
        refreshUpdateSpy,
      };
    }

    it('commits a new keyframe key through CSS.setKeyframeKey and renders it in the header', async () => {
      const {section, selectorElement, editKey, setKeyframeKeyStub, markUndoableStateStub, refreshUpdateSpy} =
          await createKeyframeSection();
      assert.strictEqual(selectorElement.textContent, '0%');

      await editKey('1%');

      sinon.assert.calledOnce(setKeyframeKeyStub);
      assert.deepEqual(setKeyframeKeyStub.firstCall.args[0], {styleSheetId, range: keyRange, keyText: '1%'});
      sinon.assert.calledOnce(markUndoableStateStub);
      sinon.assert.calledOnceWithExactly(refreshUpdateSpy, section);
      assert.strictEqual(section.headerText(), '1%');
      assert.strictEqual(selectorElement.textContent, '1%');
    });

    it('supports undo and redo of a keyframe key edit', async () => {
      const {editKey, markUndoableStateStub, undoStub, redoStub} = await createKeyframeSection();

      await editKey('1%');
      sinon.assert.calledOnce(markUndoableStateStub);

      const undoStack = SDK.DOMModel.DOMModelUndoStack.instance();
      await undoStack.undo();
      sinon.assert.calledOnce(undoStub);
      await undoStack.redo();
      sinon.assert.calledOnce(redoStub);
    });

    it('restores the previous key in the header when the new key is invalid', async () => {
      const {section, selectorElement, editKey, setKeyframeKeyStub, markUndoableStateStub, refreshUpdateSpy} =
          await createKeyframeSection();

      await editKey('1%');
      refreshUpdateSpy.resetHistory();
      markUndoableStateStub.resetHistory();

      await editKey('1% /*');

      sinon.assert.calledTwice(setKeyframeKeyStub);
      assert.strictEqual(setKeyframeKeyStub.secondCall.args[0].keyText, '1% /*');
      sinon.assert.notCalled(markUndoableStateStub);
      sinon.assert.notCalled(refreshUpdateSpy);
      assert.strictEqual(section.headerText(), '1%');
      assert.strictEqual(selectorElement.textContent, '1%');
    });
  });

  it('matches untruncated stylesheet filename in updateFilter when Linkifier truncates link text', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const range = {startLine: 0, startColumn: 0, endLine: 0, endColumn: 10};
    const header = {
      sourceURL: 'https://example.com/very-long-stylesheet-filename-for-search.css',
      isMutable: true,
      hasSourceURL: true,
      length: 10,
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
    const declaration = matchedStyles.nodeStyles()[0];
    assert.exists(declaration);

    const section = new Elements.StylePropertiesSection.StylePropertiesSection(stylesSidebarPane, matchedStyles,
                                                                               declaration, 0, null, null, null);
    const block = new Elements.StylesSidebarPane.SectionBlock(null);
    block.sections = [section];
    stylesSidebarPane.sectionBlocks = [block];

    // Apply the filter before LiveLocations resolve so the initial pass hides the section
    // and the coalesced LIVE_LOCATION_UPDATED listener re-evaluates it once links settle.
    const filterRegexStub = sinon.stub(stylesSidebarPane, 'filterRegex');
    filterRegexStub.returns(/very-long-stylesheet-filename/i);
    assert.isFalse(section.updateFilter());
    assert.isTrue(section.isHidden());

    const updateFilterSpy = sinon.spy(section, 'updateFilter');
    await Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().pendingLiveLocationChangesPromise();

    sinon.assert.calledOnce(updateFilterSpy);
    assert.isNotNull(section.element.querySelector('.devtools-link-ellipsis'));
    assert.notInclude(section.element.deepTextContent(), 'very-long-stylesheet-filename');
    assert.isFalse(section.isHidden());

    filterRegexStub.returns(/non-existent-stylesheet/i);
    assert.isFalse(section.updateFilter());
    assert.isTrue(section.isHidden());
  });

  it('does not start editing selector on FunctionRuleSection, AtRuleSection, or PositionTryRuleSection', async () => {
    const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const range = {startLine: 0, startColumn: 0, endLine: 0, endColumn: 10};
    const functionRules: Protocol.CSS.CSSFunctionRule[] = [{
      name: {text: '--my-func', range},
      origin,
      styleSheetId,
      parameters: [{name: '--param', type: '*'}],
      children: [{
        style: {
          styleSheetId,
          range,
          cssProperties: [{name: 'result', value: 'var(--param)'}],
          shorthandEntries: [],
        },
      }],
    }];
    const atRules: Protocol.CSS.CSSAtRule[] = [{
      type: Protocol.CSS.CSSAtRuleType.FontPaletteValues,
      name: {text: '--my-palette', range},
      origin,
      styleSheetId,
      style: {
        styleSheetId,
        range,
        cssProperties: [{name: 'font-family', value: 'Bixa'}],
        shorthandEntries: [],
      },
    }];
    const positionTryRules: Protocol.CSS.CSSPositionTryRule[] = [{
      name: {text: '--my-try', range},
      origin,
      styleSheetId,
      style: {
        styleSheetId,
        range,
        cssProperties: [{name: 'top', value: '10px'}],
        shorthandEntries: [],
      },
      active: true,
    }];
    const matchedStyles = await getMatchedStylesWithStylesheet(
        {cssModel, origin, styleSheetId, ...range, functionRules, atRules, positionTryRules, connection});
    const functionRule = matchedStyles.functionRules()[0];
    const atRule = matchedStyles.atRules()[0];
    const positionTryRule = matchedStyles.positionTryRules()[0];
    assert.exists(functionRule);
    assert.exists(atRule);
    assert.exists(positionTryRule);

    const functionSection = new Elements.StylePropertiesSection.FunctionRuleSection(
        stylesSidebarPane, matchedStyles, functionRule.style, functionRule.children(), 0,
        functionRule.nameWithParameters(), true);
    const atRuleSection =
        new Elements.StylePropertiesSection.AtRuleSection(stylesSidebarPane, matchedStyles, atRule.style, 1, true);
    const positionTrySection = new Elements.StylePropertiesSection.PositionTryRuleSection(
        stylesSidebarPane, matchedStyles, positionTryRule.style, 2, true);

    assert.isFalse(functionSection.isHeaderEditable());
    assert.isFalse(atRuleSection.isHeaderEditable());
    assert.isFalse(positionTrySection.isHeaderEditable());

    const startEditingStub = sinon.stub(UI.InplaceEditor.InplaceEditor, 'startEditing');

    for (const [section, selectorClass] of [[functionSection, '.function-key'],
                                            [atRuleSection, '.font-palette-values-key'],
                                            [positionTrySection, '.position-try-values-key']] as const) {
      const selectorElement = section.element.querySelector(selectorClass) as HTMLElement;
      assert.exists(selectorElement);
      selectorElement.click();
      sinon.assert.notCalled(startEditingStub);
      assert.isFalse(stylesSidebarPane.isEditingStyle);

      section.startEditingSelector();
      sinon.assert.notCalled(startEditingStub);
      assert.isFalse(stylesSidebarPane.isEditingStyle);
    }
  });

  describe('keyboard navigation with non-editable headers', () => {
    const origin = Protocol.CSS.StyleSheetOrigin.Regular;
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const range = {startLine: 0, startColumn: 0, endLine: 0, endColumn: 10};

    function cancelEditing(treeElement: Elements.StylePropertyTreeElement.StylePropertyTreeElement): void {
      treeElement.nameElement?.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    }

    async function createFunctionSection(children: Protocol.CSS.CSSFunctionNode[]): Promise<{
      stylesSidebarPane: Elements.StylesSidebarPane.StylesSidebarPane,
      section: Elements.StylePropertiesSection.FunctionRuleSection,
    }> {
      const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel);
      assert.exists(cssModel);
      const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
      const functionRules: Protocol.CSS.CSSFunctionRule[] = [{
        name: {text: '--my-func', range},
        origin,
        styleSheetId,
        parameters: [],
        children,
      }];
      const matchedStyles =
          await getMatchedStylesWithStylesheet({cssModel, origin, styleSheetId, functionRules, connection});
      const functionRule = matchedStyles.functionRules()[0];
      assert.exists(functionRule);
      const section = new Elements.StylePropertiesSection.FunctionRuleSection(
          stylesSidebarPane, matchedStyles, functionRule.style, functionRule.children(), 0,
          functionRule.nameWithParameters(), true);
      renderElementIntoDOM(section.element);
      return {stylesSidebarPane, section};
    }

    it('edits the first declaration on Enter when a @function body starts with a condition block', async () => {
      const {stylesSidebarPane, section} = await createFunctionSection([{
        condition: {
          media: {text: '(width > 0px)', source: Protocol.CSS.CSSMediaSource.MediaRule, styleSheetId},
          conditionText: '(width > 0px)',
          children: [{
            style: {styleSheetId, range, cssProperties: [{name: 'result', value: '1px', range}], shorthandEntries: []},
          }],
        },
      }]);
      const conditionElement = section.propertiesTreeOutline.firstChild();
      assert.exists(conditionElement);
      assert.notInstanceOf(conditionElement, Elements.StylePropertyTreeElement.StylePropertyTreeElement);
      const declaration = conditionElement.firstChild();
      assert.instanceOf(declaration, Elements.StylePropertyTreeElement.StylePropertyTreeElement);
      const addBlankSpy = sinon.spy(section, 'addNewBlankProperty');

      section.element.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));

      assert.isTrue(stylesSidebarPane.isEditingStyle);
      assert.isTrue(UI.UIUtils.isBeingEdited(declaration.nameElement));
      sinon.assert.notCalled(addBlankSpy);
      cancelEditing(declaration);
    });

    it('does not add a blank property on Enter in a @function without declarations', async () => {
      const {stylesSidebarPane, section} = await createFunctionSection([]);
      const addBlankSpy = sinon.spy(section, 'addNewBlankProperty');

      section.element.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));

      sinon.assert.notCalled(addBlankSpy);
      assert.isFalse(stylesSidebarPane.isEditingStyle);
      assert.strictEqual(section.propertiesTreeOutline.rootElement().childCount(), 0);
    });

    it('moves to the previous section on Shift+Tab from the first declaration', async () => {
      const cssModel = createTarget({connection}).model(SDK.CSSModel.CSSModel);
      assert.exists(cssModel);
      const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
      const style = {styleSheetId, range, cssProperties: [{name: 'top', value: '10px', range}], shorthandEntries: []};
      const positionTryRules: Protocol.CSS.CSSPositionTryRule[] = [
        {name: {text: '--first', range}, origin, styleSheetId, style, active: true},
        {name: {text: '--second', range}, origin, styleSheetId, style, active: true},
      ];
      const matchedStyles =
          await getMatchedStylesWithStylesheet({cssModel, origin, styleSheetId, positionTryRules, connection});
      const [firstSection, secondSection] = matchedStyles.positionTryRules().map(
          (rule, index) => new Elements.StylePropertiesSection.PositionTryRuleSection(stylesSidebarPane, matchedStyles,
                                                                                      rule.style, index, true));
      const container = document.createElement('div');
      container.append(firstSection.element, secondSection.element);
      renderElementIntoDOM(container);
      const declaration = secondSection.propertiesTreeOutline.firstChild();
      assert.instanceOf(declaration, Elements.StylePropertyTreeElement.StylePropertyTreeElement);
      const startEditingStub = sinon.stub(UI.InplaceEditor.InplaceEditor, 'startEditing');
      const addBlankSpy = sinon.spy(firstSection, 'addNewBlankProperty');

      declaration.startEditingName();
      assert.isTrue(UI.UIUtils.isBeingEdited(declaration.nameElement));
      declaration.nameElement?.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', shiftKey: true, bubbles: true}));
      await new Promise(resolve => setTimeout(resolve, 0));

      // The header is not editable, so the editor moves on to the previous section.
      sinon.assert.notCalled(startEditingStub);
      sinon.assert.calledOnce(addBlankSpy);
      const newProperty = addBlankSpy.firstCall.returnValue;
      assert.isTrue(UI.UIUtils.isBeingEdited(newProperty.nameElement));
      assert.isTrue(stylesSidebarPane.isEditingStyle);
      cancelEditing(newProperty);
    });
  });
});
