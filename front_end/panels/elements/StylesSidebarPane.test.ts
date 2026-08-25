// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as ComputedStyle from '../../models/computed_style/computed_style.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {
  createTarget,
  describeWithEnvironment,
  updateHostConfig,
} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {createStubbedDomNodeWithModels, getMatchedStyles, ruleMatch} from '../../testing/StyleHelpers.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import type {Icon} from '../../ui/kit/kit.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html} from '../../ui/lit/lit.js';
import * as PanelsCommon from '../common/common.js';

import type * as ElementsComponents from './components/components.js';
import * as Elements from './elements.js';

describe('StylesSidebarPane', () => {
  let node: SDK.DOMModel.DOMNode;
  beforeEach(() => {
    ({node} = createStubbedDomNodeWithModels({nodeId: 1}));
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
  });

  describeWithEnvironment('StylesSidebarPane', () => {
    let connection: MockCDPConnection;
    beforeEach(() => {
      connection = new MockCDPConnection();
      const target = createTarget({connection});
      const cssModel = target.model(SDK.CSSModel.CSSModel);
      sinon.stub(ComputedStyle.ComputedStyleModel.ComputedStyleModel.prototype, 'cssModel').returns(cssModel);
      sinon.stub(Host.AidaClient.HostConfigTracker, 'instance').returns({
        addEventListener: () => {},
        removeEventListener: () => {},
        dispose: () => {},
      } as unknown as Host.AidaClient.HostConfigTracker);
    });

    it('unescapes CSS strings', () => {
      assert.strictEqual(Elements.StylesSidebarPane.unescapeCssString(
                             String.raw`"I\F1 t\EB rn\E2 ti\F4 n\E0 liz\E6 ti\F8 n\2603 \1F308  can be \t\r\ic\k\y"`),
                         '"I\xF1t\xEBrn\xE2ti\xF4n\xE0liz\xE6ti\xF8n\u2603\u{1F308} can be tricky"');
      assert.strictEqual(
          Elements.StylesSidebarPane.unescapeCssString(String.raw`"_\DBFF_\\DBFF_\\\DBFF_\\\\DBFF_\\\\\DBFF_"`),
          '"_\uFFFD_\\DBFF_\\\\DBFF_\\\\\\DBFF_\\\\\\\\DBFF_"');
      assert.strictEqual(Elements.StylesSidebarPane.unescapeCssString(String.raw`"\0_\DBFF_\DFFF_\110000"`),
                         '"\uFFFD_\uFFFD_\uFFFD_\uFFFD"',
                         'U+0000, lone surrogates, and values above U+10FFFF should become U+FFFD');
      assert.strictEqual(Elements.StylesSidebarPane.unescapeCssString(String.raw`"_\D83C\DF08_"`), '"_\uFFFD\uFFFD_"',
                         'surrogates should not be combined');
      assert.strictEqual(Elements.StylesSidebarPane.unescapeCssString('"_\\41\n_\\41\t_\\41\x20_"'), '"_A_A_A_"',
                         'certain trailing whitespace characters should be consumed as part of the escape sequence');
    });

    it('escapes URL as CSS comments', () => {
      assert.strictEqual(Elements.StylesSidebarPane.escapeUrlAsCssComment('https://abc.com/'), 'https://abc.com/');
      assert.strictEqual(Elements.StylesSidebarPane.escapeUrlAsCssComment('https://abc.com/*/'), 'https://abc.com/*/');
      assert.strictEqual(Elements.StylesSidebarPane.escapeUrlAsCssComment('https://abc.com/*/?q=*'),
                         'https://abc.com/*/?q=*');
      assert.strictEqual(Elements.StylesSidebarPane.escapeUrlAsCssComment('https://abc.com/*/?q=*/'),
                         'https://abc.com/*/?q=*%2F');
      assert.strictEqual(Elements.StylesSidebarPane.escapeUrlAsCssComment('https://abc.com/*/?q=*/#hash'),
                         'https://abc.com/*/?q=*%2F#hash');
    });

    describe('mergeOrderedItems', () => {
      interface TestItem {
        id: string;
        inactive?: boolean;
      }

      it('preserves the relative ordering of inactive items when some items become inactive', () => {
        const oldItems: TestItem[] = [{id: 'a'}, {id: 'b'}, {id: 'c'}];
        const newItems: TestItem[] = [{id: 'a'}, {id: 'c'}];

        const merged = Elements.StylesSidebarPane.mergeOrderedItems(
            oldItems,
            newItems,
            item => item.id,
            item => {
              item.inactive = true;
            },
        );

        assert.deepEqual(merged, [
          {id: 'a'},
          {id: 'b', inactive: true},
          {id: 'c'},
        ]);
      });

      it('appends and inserts new items into the sequence', () => {
        const oldItems: TestItem[] = [{id: 'a'}, {id: 'c'}];
        const newItems: TestItem[] = [{id: 'a'}, {id: 'b'}, {id: 'c'}, {id: 'd'}];

        const merged = Elements.StylesSidebarPane.mergeOrderedItems(
            oldItems,
            newItems,
            item => item.id,
            item => {
              item.inactive = true;
            },
        );

        assert.deepEqual(merged, [
          {id: 'a'},
          {id: 'b'},
          {id: 'c'},
          {id: 'd'},
        ]);
      });

      it('reorders items when new active items appear in a different order', () => {
        const oldItems: TestItem[] = [{id: 'a'}, {id: 'b'}];
        const newItems: TestItem[] = [{id: 'b'}, {id: 'a'}];

        const merged = Elements.StylesSidebarPane.mergeOrderedItems(
            oldItems,
            newItems,
            item => item.id,
            item => {
              item.inactive = true;
            },
        );

        assert.deepEqual(merged, [
          {id: 'b'},
          {id: 'a'},
        ]);
      });

      it('restores previously inactive items to active state when matched again', () => {
        const oldItems: TestItem[] = [{id: 'a'}, {id: 'b', inactive: true}, {id: 'c'}];
        const newItems: TestItem[] = [{id: 'a'}, {id: 'b'}, {id: 'c'}];

        const merged = Elements.StylesSidebarPane.mergeOrderedItems(
            oldItems,
            newItems,
            item => item.id,
            item => {
              item.inactive = true;
            },
        );

        assert.deepEqual(merged, [
          {id: 'a'},
          {id: 'b'},
          {id: 'c'},
        ]);
      });

      it('handles empty old items list', () => {
        const oldItems: TestItem[] = [];
        const newItems: TestItem[] = [{id: 'a'}, {id: 'b'}];

        const merged = Elements.StylesSidebarPane.mergeOrderedItems(
            oldItems,
            newItems,
            item => item.id,
            item => {
              item.inactive = true;
            },
        );

        assert.deepEqual(merged, [
          {id: 'a'},
          {id: 'b'},
        ]);
      });

      it('handles empty new items list by marking all old items inactive', () => {
        const oldItems: TestItem[] = [{id: 'a'}, {id: 'b'}];
        const newItems: TestItem[] = [];

        const merged = Elements.StylesSidebarPane.mergeOrderedItems(
            oldItems,
            newItems,
            item => item.id,
            item => {
              item.inactive = true;
            },
        );

        assert.deepEqual(merged, [
          {id: 'a', inactive: true},
          {id: 'b', inactive: true},
        ]);
      });
    });

    describe('update', () => {
      it('does not update when a selector is being edited', () => {
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());

        const requestUpdateSpy = sinon.spy(stylesSidebarPane, 'requestUpdate');
        const event = {data: null} as unknown as
            Common.EventTarget.EventTargetEvent<ComputedStyle.ComputedStyleModel.CSSModelChangedEvent>;

        // The pane should update when a selector is not being edited.
        stylesSidebarPane.onCSSModelChanged(event);
        sinon.assert.calledOnce(requestUpdateSpy);

        requestUpdateSpy.resetHistory();

        // The pane shouldn't update when a selector is being edited.
        stylesSidebarPane.setEditingStyle(true);
        stylesSidebarPane.onCSSModelChanged(event);
        sinon.assert.notCalled(requestUpdateSpy);
      });

      it('maintains focus if changes occur while editing', async () => {
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());

        // @ts-expect-error
        sinon.stub(stylesSidebarPane, 'fetchMatchedCascade').resolves(null);
        // @ts-expect-error
        sinon.stub(stylesSidebarPane, 'fetchComputedStylesFor').resolves(new Map());
        // @ts-expect-error
        sinon.stub(stylesSidebarPane, 'fetchComputedStyleExtraFieldsFor').resolves(null);

        const resetFocusSpy = sinon.spy(stylesSidebarPane, 'resetFocus');

        // Verify that innerRebuildUpdate is not called to reset focus
        // if an update was already scheduled before editing started.
        stylesSidebarPane.setEditingStyle(true);
        await stylesSidebarPane.performUpdate();

        sinon.assert.notCalled(resetFocusSpy);
      });
    });

    describe('createNewRuleInViaInspectorStyleSheet', () => {
      it('creates a new rule in the via inspector stylesheet and starts editing the selector', async () => {
        (node.frameId as sinon.SinonStub).returns('frame-id' as Protocol.Page.FrameId);
        (node.nodeType as sinon.SinonStub).returns(Node.ELEMENT_NODE);
        (node.nodeName as sinon.SinonStub).returns('div');
        (node.simpleSelector as sinon.SinonStub).returns('div');
        sinon.stub(Components.Linkifier.Linkifier.prototype, 'linkifyCSSLocation')
            .returns(document.createElement('div'));

        const inlineStyle: Protocol.CSS.CSSStyle = {
          styleSheetId: '0' as Protocol.DOM.StyleSheetId,
          cssProperties: [{name: 'color', value: 'blue'}],
          shorthandEntries: [],
        };

        const computedStyleModel = new ComputedStyle.ComputedStyleModel.ComputedStyleModel();
        computedStyleModel.node = node;

        const cssModel = computedStyleModel.cssModel() as SDK.CSSModel.CSSModel;

        const matchedStyles = await SDK.CSSMatchedStyles.CSSMatchedStyles.create({
          cssModel,
          node,
          inlinePayload: inlineStyle,
          attributesPayload: null,
          matchedPayload: [],
          pseudoPayload: [],
          inheritedPayload: [],
          inheritedPseudoPayload: [],
          animationsPayload: [],
          parentLayoutNodeId: undefined as unknown as Protocol.DOM.NodeId,
          positionTryRules: [],
          propertyRules: [],
          functionRules: [],
          cssPropertyRegistrations: [],
          atRules: [],
          activePositionFallbackIndex: -1,
          animationStylesPayload: [],
          inheritedAnimatedPayload: [],
          transitionsStylePayload: null,
        });

        sinon.stub(cssModel, 'getMatchedStyles').resolves(matchedStyles);
        const styleSheetHeader = sinon.createStubInstance(SDK.CSSStyleSheetHeader.CSSStyleSheetHeader);
        styleSheetHeader.cssModel.returns(cssModel);
        styleSheetHeader.lineNumberInSource.callsFake(line => line);
        styleSheetHeader.columnNumberInSource.callsFake((line, column) => column);
        (styleSheetHeader.id as string) = '0';
        sinon.stub(cssModel, 'requestViaInspectorStylesheet').resolves(styleSheetHeader);
        styleSheetHeader.requestContentData.resolves(new TextUtils.ContentData.ContentData('', false, 'text/css'));

        const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
        renderElementIntoDOM(stylesSidebarPane);

        stylesSidebarPane.forceUpdate();

        await new Promise<void>(resolve => {
          stylesSidebarPane.addEventListener(Elements.StylesSidebarPane.Events.INITIAL_UPDATE_COMPLETED,
                                             () => resolve(), {once: true});
        });

        assert.isFalse(UI.UIUtils.isEditing());

        await stylesSidebarPane.createNewRuleInViaInspectorStyleSheet();

        assert.isTrue(UI.UIUtils.isEditing());

        const allSections = stylesSidebarPane.allSections();
        assert.instanceOf(allSections[1], Elements.StylePropertiesSection.BlankStylePropertiesSection);

        stylesSidebarPane.detach();
      });
    });

    describe('rebuildSectionsForMatchedStyleRulesForTest', () => {
      it('should add @position-try section', async () => {
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const matchedStyles = await getMatchedStyles({
          connection,
          cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
          node: sinon.createStubInstance(SDK.DOMModel.DOMNode),
          positionTryRules: [{
            name: {text: '--try-one'},
            origin: Protocol.CSS.StyleSheetOrigin.Regular,
            style: {
              cssProperties: [{name: 'bottom', value: 'anchor(--anchor-name bottom)'}],
              shorthandEntries: [],
            },
            active: false,
          }],
        });

        const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
            matchedStyles, new Map(), new Map(), null);

        assert.lengthOf(sectionBlocks, 2);
        assert.strictEqual(sectionBlocks[1].titleElement()?.textContent, '@position-try --try-one');
        assert.lengthOf(sectionBlocks[1].sections, 1);
        assert.instanceOf(sectionBlocks[1].sections[0], Elements.StylePropertiesSection.PositionTryRuleSection);
      });

      it('correctly hides and shows nested section blocks when filtering', async () => {
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.nodeName.returns('div');
        node.id = 1 as Protocol.DOM.NodeId;
        const parentNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.parentNode = parentNode;
        parentNode.nodeName.returns('body');

        const matchedStyles = await getMatchedStyles({
          connection,
          cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
          node,
          matchedPayload: [{
            rule: {
              selectorList: {selectors: [{text: 'div'}], text: 'div'},
              origin: Protocol.CSS.StyleSheetOrigin.Regular,
              style: {
                cssProperties: [{name: 'background', value: 'red'}],
                shorthandEntries: [],
              },
            },
            matchingSelectors: [0],
          }],
          inheritedPayload: [{
            matchedCSSRules: [{
              rule: {
                selectorList: {selectors: [{text: 'body'}], text: 'body'},
                origin: Protocol.CSS.StyleSheetOrigin.Regular,
                style: {
                  cssProperties: [{name: 'color', value: 'blue'}],
                  shorthandEntries: [],
                },
                layers: [{text: 'mylayer'}],
              },
              matchingSelectors: [0],
            }],
          }],
        });

        const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
            matchedStyles, new Map(), new Map(), null);

        assert.lengthOf(sectionBlocks, 3);
        const inheritedBlock = sectionBlocks[1];
        assert.strictEqual(inheritedBlock.titleElement()?.textContent, 'Inherited from ');
        assert.lengthOf(inheritedBlock.childBlocks, 1);
        const layerBlock = inheritedBlock.childBlocks[0];
        assert.strictEqual(layerBlock.titleElement()?.textContent, 'Layermylayer');

        const elementStyleSections = sectionBlocks[0].sections;
        const inheritedStyleSections = layerBlock.sections;

        // Filter to something that only matches the inherited style.
        stylesSidebarPane.setFilter(/color/i);
        sectionBlocks.forEach(block => block.updateFilter());

        assert.isTrue(elementStyleSections[0].element.classList.contains('hidden'));
        assert.isFalse(inheritedStyleSections[0].element.classList.contains('hidden'));
        assert.isFalse(inheritedBlock.titleElement()?.classList.contains('hidden'));
        assert.isFalse(layerBlock.titleElement()?.classList.contains('hidden'));

        // Filter to something that matches nothing.
        stylesSidebarPane.setFilter(/display/i);
        sectionBlocks.forEach(block => block.updateFilter());

        assert.isTrue(elementStyleSections[0].element.classList.contains('hidden'));
        assert.isTrue(inheritedStyleSections[0].element.classList.contains('hidden'));
        assert.isTrue(inheritedBlock.titleElement()?.classList.contains('hidden'));
        assert.isTrue(layerBlock.titleElement()?.classList.contains('hidden'));

        // Clear filter.
        stylesSidebarPane.setFilter(null);
        sectionBlocks.forEach(block => block.updateFilter());

        assert.isFalse(elementStyleSections[0].element.classList.contains('hidden'));
        assert.isFalse(inheritedStyleSections[0].element.classList.contains('hidden'));
        assert.isFalse(inheritedBlock.titleElement()?.classList.contains('hidden'));
        assert.isFalse(layerBlock.titleElement()?.classList.contains('hidden'));
      });

      it('hides sidebar separators when filtering results', async () => {
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        sinon.stub(stylesSidebarPane, 'performUpdate').resolves();

        const firstNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        firstNode.nodeName.returns('div');
        firstNode.nodeNameInCorrectCase.returns('div');
        firstNode.id = 101 as Protocol.DOM.NodeId;
        firstNode.nodeType.returns(Node.ELEMENT_NODE);
        firstNode.pseudoType.returns(undefined);
        firstNode.pseudoElements.returns(new Map());
        firstNode.getAttribute.withArgs('id').returns('first');

        const secondNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        secondNode.nodeName.returns('div');
        secondNode.nodeNameInCorrectCase.returns('div');
        secondNode.id = 102 as Protocol.DOM.NodeId;
        secondNode.nodeType.returns(Node.ELEMENT_NODE);
        secondNode.pseudoType.returns(undefined);
        secondNode.pseudoElements.returns(new Map());
        secondNode.parentNode = firstNode;
        secondNode.getAttribute.withArgs('id').returns('second');

        const thirdNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        thirdNode.nodeName.returns('div');
        thirdNode.nodeNameInCorrectCase.returns('div');
        thirdNode.id = 103 as Protocol.DOM.NodeId;
        thirdNode.nodeType.returns(Node.ELEMENT_NODE);
        thirdNode.pseudoType.returns(undefined);
        thirdNode.pseudoElements.returns(new Map());
        thirdNode.parentNode = secondNode;
        thirdNode.getAttribute.withArgs('id').returns('third');

        const matchedPayload = [
          ruleMatch('#third', {'font-family': 'times', display: 'block'}),
        ];

        const inheritedPayload: Protocol.CSS.InheritedStyleEntry[] = [
          {
            matchedCSSRules: [
              ruleMatch('#second', {'font-family': 'helvetica'}),
            ],
          },
          {
            matchedCSSRules: [
              ruleMatch('#first', {'font-family': 'arial', display: 'block'}),
            ],
          },
        ];

        const pseudoPayload: Protocol.CSS.PseudoElementMatches[] = [
          {
            pseudoType: Protocol.DOM.PseudoType.Before,
            matches: [
              ruleMatch('#third::before', {content: '"uno-1"'}),
            ],
          },
          {
            pseudoType: Protocol.DOM.PseudoType.After,
            matches: [
              ruleMatch('#third::after', {content: '"dos-2"', display: 'block'}),
            ],
          },
        ];

        const matchedStyles = await getMatchedStyles({
          connection,
          cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
          node: thirdNode,
          matchedPayload,
          inheritedPayload,
          pseudoPayload,
        });

        const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
            matchedStyles, new Map(), new Map(), null);

        // Define the expected blocks and their indices.
        // Block 0 represents active node styles (#third) and has no title element.
        // Block 1 represents styles inherited from div#second.
        // Block 2 represents styles inherited from div#first.
        // Block 3 represents the pseudo ::before element.
        // Block 4 represents the pseudo ::after element.
        assert.lengthOf(sectionBlocks, 5);

        assert.isNull(sectionBlocks[0].titleElement());
        assert.exists(sectionBlocks[1].titleElement());
        assert.exists(sectionBlocks[2].titleElement());
        assert.exists(sectionBlocks[3].titleElement());
        assert.exists(sectionBlocks[4].titleElement());

        // Define a helper function to assert the visibility of block title elements.
        const assertBlockVisibility = (expectedVisibilities: boolean[]) => {
          for (let i = 1; i < sectionBlocks.length; i++) {
            const titleEl = sectionBlocks[i].titleElement();
            if (titleEl) {
              const isHidden = titleEl.classList.contains('hidden');
              assert.strictEqual(!isHidden, expectedVisibilities[i - 1], `Block ${i} visibility mismatch`);
            }
          }
        };

        // Initially, all blocks should be visible when the filter is null.
        stylesSidebarPane.setFilter(null);
        sectionBlocks.forEach(block => block.updateFilter());
        assertBlockVisibility([true, true, true, true]);

        // Filter by 'font-family'.
        // The secondNode has 'font-family: helvetica' and should be visible.
        // The firstNode has 'font-family: arial' and should be visible.
        // The ::before element has only 'content' and should be hidden.
        // The ::after element has 'content' and 'display' and should be hidden.
        stylesSidebarPane.setFilter(/font-family/i);
        sectionBlocks.forEach(block => block.updateFilter());
        assertBlockVisibility([true, true, false, false]);

        // Filter by 'content'.
        // The secondNode should be hidden.
        // The firstNode should be hidden.
        // The ::before element has 'content' and should be visible.
        // The ::after element has 'content' and should be visible.
        stylesSidebarPane.setFilter(/content/i);
        sectionBlocks.forEach(block => block.updateFilter());
        assertBlockVisibility([false, false, true, true]);

        // Filter by 'display'.
        // The secondNode should be hidden.
        // The firstNode has 'display' and should be visible.
        // The ::before element should be hidden.
        // The ::after element has 'display' and should be visible.
        stylesSidebarPane.setFilter(/display/i);
        sectionBlocks.forEach(block => block.updateFilter());
        assertBlockVisibility([false, true, false, true]);
      });

      it('renders media queries', async () => {
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.id = 1 as Protocol.DOM.NodeId;

        const matchedStyles = await getMatchedStyles({
          connection,
          cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
          node,
          matchedPayload: [{
            rule: {
              selectorList: {selectors: [{text: '#main'}], text: '#main'},
              origin: Protocol.CSS.StyleSheetOrigin.Regular,
              style: {
                cssProperties: [{name: 'background', value: 'blue'}],
                shorthandEntries: [],
              },
              media: [{
                text: '(max-width: 100px)',
                source: Protocol.CSS.CSSMediaSource.MediaRule,
              }],
              ruleTypes: [Protocol.CSS.CSSRuleType.MediaRule],
            },
            matchingSelectors: [0],
          }],
        });

        const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
            matchedStyles, new Map(), new Map(), null);

        assert.lengthOf(sectionBlocks, 1);
        const sections = sectionBlocks[0].sections;
        assert.lengthOf(sections, 1);
        const section = sections[0];

        const mediaQueryElements = section.element.querySelectorAll('devtools-css-query');
        assert.lengthOf(mediaQueryElements, 1);
        const mediaQueryElement = mediaQueryElements[0] as ElementsComponents.CSSQuery.CSSQuery;

        const queryDiv = mediaQueryElement.shadowRoot?.querySelector('.query');
        assert.exists(queryDiv);
        assert.strictEqual(queryDiv?.textContent?.trim().replace(/\s+/g, ' '), '@media (max-width: 100px) {');
      });

      it('renders multiple media queries (imported stylesheet)', async () => {
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.id = 1 as Protocol.DOM.NodeId;

        const matchedStyles = await getMatchedStyles({
          connection,
          cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
          node,
          matchedPayload: [{
            rule: {
              selectorList: {selectors: [{text: '#main'}], text: '#main'},
              origin: Protocol.CSS.StyleSheetOrigin.Regular,
              style: {
                cssProperties: [{name: 'border', value: '1px solid black'}],
                shorthandEntries: [],
              },
              media: [
                {
                  text: '(min-width: 200px)',
                  source: Protocol.CSS.CSSMediaSource.MediaRule,
                },
                {
                  text: '(orientation: landscape)',
                  source: Protocol.CSS.CSSMediaSource.ImportRule,
                },
              ],
              ruleTypes: [Protocol.CSS.CSSRuleType.MediaRule, Protocol.CSS.CSSRuleType.MediaRule],
            },
            matchingSelectors: [0],
          }],
        });

        const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
            matchedStyles, new Map(), new Map(), null);

        assert.lengthOf(sectionBlocks, 1);
        const sections = sectionBlocks[0].sections;
        assert.lengthOf(sections, 1);
        const section = sections[0];

        const mediaQueryElements = section.element.querySelectorAll('devtools-css-query');
        assert.lengthOf(mediaQueryElements, 2);

        const queryTexts = Array.from(mediaQueryElements).map(el => {
          const queryDiv = el.shadowRoot?.querySelector('.query');
          return queryDiv?.textContent?.trim().replace(/\s+/g, ' ');
        });

        assert.deepEqual(queryTexts, ['@import (orientation: landscape) {', '@media (min-width: 200px) {']);
      });
    });

    describe('collapsing non-contributing sections', () => {
      const enableCollapse = () =>
          Common.Settings.Settings.instance().moduleSetting('collapse-non-contributing-css-rules').set(true);

      it('collapses a section where all properties are overloaded', async () => {
        enableCollapse();
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.id = 1 as Protocol.DOM.NodeId;
        const matchedStyles = await getMatchedStyles({
          connection,
          cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
          node,
          matchedPayload: [
            // Lower specificity rule: color will be overloaded by the higher specificity rule.
            {
              rule: {
                selectorList: {selectors: [{text: 'div'}], text: 'div'},
                origin: Protocol.CSS.StyleSheetOrigin.Regular,
                style: {
                  cssProperties: [{name: 'color', value: 'blue'}],
                  shorthandEntries: [],
                },
              },
              matchingSelectors: [0],
            },
            // Higher specificity rule: color is active here.
            {
              rule: {
                selectorList: {selectors: [{text: '#id'}], text: '#id'},
                origin: Protocol.CSS.StyleSheetOrigin.Regular,
                style: {
                  cssProperties: [{name: 'color', value: 'red'}],
                  shorthandEntries: [],
                },
              },
              matchingSelectors: [0],
            },
          ],
        });

        const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
            matchedStyles, new Map(), new Map(), null);

        assert.lengthOf(sectionBlocks[0].sections, 2);

        const activeSection = sectionBlocks[0].sections.find(section => section.headerText() === '#id');
        const overloadedSection = sectionBlocks[0].sections.find(section => section.headerText() === 'div');
        if (!activeSection || !overloadedSection) {
          assert.fail('Expected #id and div sections to exist');
        }

        const overloadedProperty = overloadedSection.style().leadingProperties()[0];
        if (!overloadedProperty) {
          assert.fail('Expected overloaded section to have at least one property');
        }
        assert.strictEqual(matchedStyles.propertyState(overloadedProperty),
                           SDK.CSSMatchedStyles.PropertyState.OVERLOADED,
                           'Expected div{color:blue} to be overloaded by #id{color:red}');

        // The section with all overloaded properties should be collapsed.
        assert.isTrue(overloadedSection.element.classList.contains('collapsed'),
                      'Section with all overloaded properties should have collapsed class');

        // The section with active properties should NOT be collapsed.
        assert.isFalse(activeSection.element.classList.contains('collapsed'),
                       'Section with active properties should not be collapsed');
      });

      it('does not leak LiveLocations when rebuilding styles multiple times', async () => {
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.id = 1 as Protocol.DOM.NodeId;
        const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
        const origin = Protocol.CSS.StyleSheetOrigin.Regular;

        const matchedPayload = [{
          rule: {
            selectorList: {selectors: [{text: 'div'}], text: 'div'},
            origin,
            style: {
              cssProperties: [{name: 'color', value: 'red'}],
              shorthandEntries: [],
              styleSheetId,
              range: {startLine: 0, startColumn: 0, endLine: 0, endColumn: 15},
            },
          },
          matchingSelectors: [0],
        }];

        const matchedStyles = await getMatchedStyles({
          connection,
          cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
          node,
          matchedPayload,
        });

        const workspace = Workspace.Workspace.WorkspaceImpl.instance();
        const targetManager = SDK.TargetManager.TargetManager.instance();
        const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
        Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance({forceNew: true, resourceMapping, targetManager});

        // Initialize the LiveLocation objects for the test.
        await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles, new Map(), new Map(), null);

        function countLiveLocations(): number {
          let locationsCount = 0;
          const modelInfos = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().modelToInfo.values();
          for (const modelInfo of modelInfos) {
            locationsCount += modelInfo.locations.valuesArray().length;
          }
          return locationsCount;
        }

        const initialCount = countLiveLocations();

        for (let i = 0; i < 5; i++) {
          stylesSidebarPane.linkifier.reset();
          await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles, new Map(), new Map(), null);
        }

        const finalCount = countLiveLocations();
        assert.strictEqual(finalCount, initialCount, 'LiveLocations count is growing');
      });

      it('does not collapse non-contributing sections when the setting is disabled', async () => {
        Common.Settings.Settings.instance().moduleSetting('collapse-non-contributing-css-rules').set(false);
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.id = 1 as Protocol.DOM.NodeId;
        const matchedStyles = await getMatchedStyles({
          connection,
          cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
          node,
          matchedPayload: [
            {
              rule: {
                selectorList: {selectors: [{text: 'div'}], text: 'div'},
                origin: Protocol.CSS.StyleSheetOrigin.Regular,
                style: {
                  cssProperties: [{name: 'color', value: 'blue'}],
                  shorthandEntries: [],
                },
              },
              matchingSelectors: [0],
            },
            {
              rule: {
                selectorList: {selectors: [{text: '#id'}], text: '#id'},
                origin: Protocol.CSS.StyleSheetOrigin.Regular,
                style: {
                  cssProperties: [{name: 'color', value: 'red'}],
                  shorthandEntries: [],
                },
              },
              matchingSelectors: [0],
            },
          ],
        });

        const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
            matchedStyles, new Map(), new Map(), null);

        const overloadedSection = sectionBlocks[0].sections.find(section => section.headerText() === 'div');
        if (!overloadedSection) {
          assert.fail('Expected div section to exist');
        }

        assert.isFalse(overloadedSection.element.classList.contains('collapsed'),
                       'Section with all overloaded properties should not collapse when the setting is disabled');
        assert.isFalse(overloadedSection.element.classList.contains('collapsible'),
                       'Section should not be marked collapsible when automatic collapsing is disabled');
      });

      it('collapses an empty section (no leading properties)', async () => {
        enableCollapse();
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.id = 1 as Protocol.DOM.NodeId;
        const matchedStyles = await getMatchedStyles({
          connection,
          cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
          node,
          matchedPayload: [
            // Empty rule (no properties -- common with CSS nesting).
            {
              rule: {
                selectorList: {selectors: [{text: '.empty'}], text: '.empty'},
                origin: Protocol.CSS.StyleSheetOrigin.Regular,
                style: {
                  cssProperties: [],
                  shorthandEntries: [],
                },
              },
              matchingSelectors: [0],
            },
            // Non-empty rule.
            {
              rule: {
                selectorList: {selectors: [{text: '#id'}], text: '#id'},
                origin: Protocol.CSS.StyleSheetOrigin.Regular,
                style: {
                  cssProperties: [{name: 'color', value: 'red'}],
                  shorthandEntries: [],
                },
              },
              matchingSelectors: [0],
            },
          ],
        });

        const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
            matchedStyles, new Map(), new Map(), null);

        assert.lengthOf(sectionBlocks[0].sections, 2);
        const activeSection = sectionBlocks[0].sections[0];  // #id - has properties
        const emptySection = sectionBlocks[0].sections[1];   // .empty - no properties

        assert.isTrue(emptySection.element.classList.contains('collapsed'), 'Empty section should be collapsed');
        assert.isFalse(activeSection.element.classList.contains('collapsed'),
                       'Non-empty section should not be collapsed');
      });

      it('does NOT collapse a section containing only disabled properties', async () => {
        enableCollapse();
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.id = 1 as Protocol.DOM.NodeId;
        const matchedStyles = await getMatchedStyles({
          connection,
          cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
          node,
          matchedPayload: [
            // Rule with a disabled (user-toggled-off) property.
            {
              rule: {
                selectorList: {selectors: [{text: '.disabled-props'}], text: '.disabled-props'},
                origin: Protocol.CSS.StyleSheetOrigin.Regular,
                style: {
                  cssProperties: [{name: 'color', value: 'blue', disabled: true}],
                  shorthandEntries: [],
                },
              },
              matchingSelectors: [0],
            },
            // Another rule so the disabled one has something to compare against.
            {
              rule: {
                selectorList: {selectors: [{text: '#id'}], text: '#id'},
                origin: Protocol.CSS.StyleSheetOrigin.Regular,
                style: {
                  cssProperties: [{name: 'background', value: 'white'}],
                  shorthandEntries: [],
                },
              },
              matchingSelectors: [0],
            },
          ],
        });

        const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
            matchedStyles, new Map(), new Map(), null);

        assert.lengthOf(sectionBlocks[0].sections, 2);
        const disabledSection = sectionBlocks[0].sections[1];  // .disabled-props

        // A section with disabled properties should NOT be collapsed.
        // Disabled properties are user-intentional and should remain visible.
        assert.isFalse(disabledSection.element.classList.contains('collapsed'),
                       'Section with disabled properties should not be collapsed');
      });

      it('does NOT collapse a section with at least one active property', async () => {
        enableCollapse();
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.id = 1 as Protocol.DOM.NodeId;
        const matchedStyles = await getMatchedStyles({
          connection,
          cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
          node,
          matchedPayload: [
            // Rule with one overloaded and one active property.
            {
              rule: {
                selectorList: {selectors: [{text: 'div'}], text: 'div'},
                origin: Protocol.CSS.StyleSheetOrigin.Regular,
                style: {
                  cssProperties: [
                    {name: 'color', value: 'blue'},   // will be overloaded
                    {name: 'margin', value: '10px'},  // will be active (not set elsewhere)
                  ],
                  shorthandEntries: [],
                },
              },
              matchingSelectors: [0],
            },
            // Higher specificity rule that overrides color.
            {
              rule: {
                selectorList: {selectors: [{text: '#id'}], text: '#id'},
                origin: Protocol.CSS.StyleSheetOrigin.Regular,
                style: {
                  cssProperties: [{name: 'color', value: 'red'}],
                  shorthandEntries: [],
                },
              },
              matchingSelectors: [0],
            },
          ],
        });

        const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
            matchedStyles, new Map(), new Map(), null);

        assert.lengthOf(sectionBlocks[0].sections, 2);
        const mixedSection = sectionBlocks[0].sections[1];  // div - has one active, one overloaded

        assert.isFalse(mixedSection.element.classList.contains('collapsed'),
                       'Section with at least one active property should not be collapsed');
      });

      it('expands a collapsed section when jump-to targets it', async () => {
        enableCollapse();
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.id = 1 as Protocol.DOM.NodeId;
        const matchedStyles = await getMatchedStyles({
          connection,
          cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
          node,
          matchedPayload: [
            // Lower specificity -- all overloaded.
            {
              rule: {
                selectorList: {selectors: [{text: 'div'}], text: 'div'},
                origin: Protocol.CSS.StyleSheetOrigin.Regular,
                style: {
                  cssProperties: [{name: 'color', value: 'blue'}],
                  shorthandEntries: [],
                },
              },
              matchingSelectors: [0],
            },
            // Higher specificity.
            {
              rule: {
                selectorList: {selectors: [{text: '#id'}], text: '#id'},
                origin: Protocol.CSS.StyleSheetOrigin.Regular,
                style: {
                  cssProperties: [{name: 'color', value: 'red'}],
                  shorthandEntries: [],
                },
              },
              matchingSelectors: [0],
            },
          ],
        });

        stylesSidebarPane.setMatchedStylesForTest(matchedStyles);
        const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
            matchedStyles, new Map(), new Map(), null);

        // In production, requestUpdate() stores these blocks internally.
        // In this unit test we call rebuildSectionsForMatchedStyleRulesForTest()
        // directly, so wire them into the pane explicitly for jump-to lookup.
        (stylesSidebarPane as unknown as {sectionBlocks: Elements.StylesSidebarPane.SectionBlock[]}).sectionBlocks =
            sectionBlocks;

        const overloadedSection = sectionBlocks[0].sections.find(section => section.headerText() === 'div');
        if (!overloadedSection) {
          assert.fail('Expected div section to exist');
        }

        // Reveal the overloaded property via jump-to.
        const overloadedProperty = overloadedSection.style().leadingProperties()[0];
        if (!overloadedProperty) {
          assert.fail('Expected overloaded section to have at least one property');
        }
        assert.strictEqual(matchedStyles.propertyState(overloadedProperty),
                           SDK.CSSMatchedStyles.PropertyState.OVERLOADED,
                           'Expected div{color:blue} to be overloaded by #id{color:red}');

        // Verify section is initially collapsed.
        assert.isTrue(overloadedSection.element.classList.contains('collapsed'),
                      'Section should be initially collapsed');

        stylesSidebarPane.revealProperty(overloadedProperty);

        // After reveal, the section should be expanded (not collapsed).
        assert.isFalse(overloadedSection.element.classList.contains('collapsed'),
                       'Section should be expanded after revealProperty');
      });

      it('can be manually expanded and re-collapsed via toggle', async () => {
        enableCollapse();
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.id = 1 as Protocol.DOM.NodeId;
        const matchedStyles = await getMatchedStyles({
          connection,
          cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
          node,
          matchedPayload: [
            {
              rule: {
                selectorList: {selectors: [{text: 'div'}], text: 'div'},
                origin: Protocol.CSS.StyleSheetOrigin.Regular,
                style: {
                  cssProperties: [{name: 'color', value: 'blue'}],
                  shorthandEntries: [],
                },
              },
              matchingSelectors: [0],
            },
            {
              rule: {
                selectorList: {selectors: [{text: '#id'}], text: '#id'},
                origin: Protocol.CSS.StyleSheetOrigin.Regular,
                style: {
                  cssProperties: [{name: 'color', value: 'red'}],
                  shorthandEntries: [],
                },
              },
              matchingSelectors: [0],
            },
          ],
        });

        const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
            matchedStyles, new Map(), new Map(), null);

        const overloadedSection = sectionBlocks[0].sections.find(section => section.headerText() === 'div');
        if (!overloadedSection) {
          assert.fail('Expected div section to exist');
        }

        // Initially collapsed.
        assert.isTrue(overloadedSection.isCollapsed(), 'Section should be initially collapsed');
        assert.isTrue(overloadedSection.element.classList.contains('collapsible'),
                      'Section should have collapsible class');

        // Expand manually.
        overloadedSection.expand();
        assert.isFalse(overloadedSection.isCollapsed(), 'Section should be expanded after expand()');
        assert.isFalse(overloadedSection.element.classList.contains('collapsed'),
                       'Section should not have collapsed class after expand()');
        // Still marked collapsible so the icon remains visible.
        assert.isTrue(overloadedSection.element.classList.contains('collapsible'),
                      'Section should retain collapsible class after manual expand');
      });

      it('reacts to toggling the collapse-non-contributing-css-rules setting at runtime', async () => {
        enableCollapse();
        const collapseSetting =
            Common.Settings.Settings.instance().moduleSetting('collapse-non-contributing-css-rules');
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.id = 1 as Protocol.DOM.NodeId;
        const matchedStyles = await getMatchedStyles({
          connection,
          cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
          node,
          matchedPayload: [
            {
              rule: {
                selectorList: {selectors: [{text: 'div'}], text: 'div'},
                origin: Protocol.CSS.StyleSheetOrigin.Regular,
                style: {
                  cssProperties: [{name: 'color', value: 'blue'}],
                  shorthandEntries: [],
                },
              },
              matchingSelectors: [0],
            },
            {
              rule: {
                selectorList: {selectors: [{text: '#id'}], text: '#id'},
                origin: Protocol.CSS.StyleSheetOrigin.Regular,
                style: {
                  cssProperties: [{name: 'color', value: 'red'}],
                  shorthandEntries: [],
                },
              },
              matchingSelectors: [0],
            },
          ],
        });

        const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
            matchedStyles, new Map(), new Map(), null);
        // `allSections()` reads from `sectionBlocks`, which the test helper doesn't populate.
        (stylesSidebarPane as unknown as {sectionBlocks: Elements.StylesSidebarPane.SectionBlock[]}).sectionBlocks =
            sectionBlocks;

        const overloadedSection = sectionBlocks[0].sections.find(section => section.headerText() === 'div');
        if (!overloadedSection) {
          assert.fail('Expected div section to exist');
        }

        assert.isTrue(overloadedSection.element.classList.contains('collapsed'),
                      'Section should be collapsed while the setting is enabled');

        collapseSetting.set(false);
        assert.isFalse(overloadedSection.element.classList.contains('collapsed'),
                       'Section should expand when the setting is turned off');
        assert.isFalse(overloadedSection.element.classList.contains('collapsible'),
                       'Section should drop the collapsible marker when the setting is turned off');

        collapseSetting.set(true);
        assert.isTrue(overloadedSection.element.classList.contains('collapsed'),
                      'Section should collapse again when the setting is re-enabled');
        assert.isTrue(overloadedSection.element.classList.contains('collapsible'),
                      'Section should be marked collapsible again when the setting is re-enabled');
      });

      it('expands collapsed sections before adding a new blank property', async () => {
        enableCollapse();
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.id = 1 as Protocol.DOM.NodeId;
        const styleSheetId = '0' as Protocol.DOM.StyleSheetId;

        const matchedStyles = await getMatchedStyles({
          connection,
          cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
          node,
          matchedPayload: [
            {
              rule: {
                selectorList: {selectors: [{text: 'div'}], text: 'div'},
                origin: Protocol.CSS.StyleSheetOrigin.Regular,
                style: {
                  cssProperties: [{name: 'color', value: 'blue'}],
                  shorthandEntries: [],
                  styleSheetId,
                  range: {startLine: 0, startColumn: 0, endLine: 0, endColumn: 15},
                },
              },
              matchingSelectors: [0],
            },
            {
              rule: {
                selectorList: {selectors: [{text: '#id'}], text: '#id'},
                origin: Protocol.CSS.StyleSheetOrigin.Regular,
                style: {
                  cssProperties: [{name: 'color', value: 'red'}],
                  shorthandEntries: [],
                  styleSheetId,
                  range: {startLine: 1, startColumn: 0, endLine: 1, endColumn: 15},
                },
              },
              matchingSelectors: [0],
            },
          ],
        });

        const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
            matchedStyles, new Map(), new Map(), null);

        const overloadedSection = sectionBlocks[0].sections.find(section => section.headerText() === 'div');
        if (!overloadedSection) {
          assert.fail('Expected div section to exist');
        }

        assert.isTrue(overloadedSection.isCollapsed(), 'Section should be initially collapsed');

        const treeElement = overloadedSection.addNewBlankProperty();

        assert.isFalse(overloadedSection.isCollapsed(), 'Section should expand before adding a new property');
        assert.exists(treeElement, 'Expected a new blank property tree element to be created');
      });

      it('collapses inherited sections with all overloaded properties', async () => {
        enableCollapse();
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.nodeName.returns('div');
        node.id = 1 as Protocol.DOM.NodeId;
        const parentNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        parentNode.id = 2 as Protocol.DOM.NodeId;
        node.parentNode = parentNode;
        parentNode.nodeName.returns('body');

        const matchedStyles = await getMatchedStyles({
          connection,
          cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
          node,
          matchedPayload: [{
            rule: {
              selectorList: {selectors: [{text: 'div'}], text: 'div'},
              origin: Protocol.CSS.StyleSheetOrigin.Regular,
              style: {
                cssProperties: [{name: 'color', value: 'red'}],
                shorthandEntries: [],
              },
            },
            matchingSelectors: [0],
          }],
          inheritedPayload: [{
            matchedCSSRules: [{
              rule: {
                selectorList: {selectors: [{text: 'body'}], text: 'body'},
                origin: Protocol.CSS.StyleSheetOrigin.Regular,
                style: {
                  // color is inheritable but overloaded by the div rule above.
                  cssProperties: [{name: 'color', value: 'blue'}],
                  shorthandEntries: [],
                },
              },
              matchingSelectors: [0],
            }],
          }],
        });

        const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
            matchedStyles, new Map(), new Map(), null);

        // Block 0: element styles (div rule), Block 1: inherited from body.
        assert.isTrue(sectionBlocks.length >= 2);
        const inheritedSection = sectionBlocks[1].sections.find(section => section.headerText() === 'body');
        if (!inheritedSection) {
          assert.fail('Expected inherited body section to exist');
        }

        const inheritedProperty = inheritedSection.style().leadingProperties()[0];
        if (!inheritedProperty) {
          assert.fail('Expected inherited section to have at least one property');
        }
        assert.strictEqual(matchedStyles.propertyState(inheritedProperty),
                           SDK.CSSMatchedStyles.PropertyState.OVERLOADED,
                           'Expected inherited color to be overloaded by element color');

        // The inherited section's color property is overloaded by the div rule,
        // so it should be collapsed.
        assert.isTrue(inheritedSection.element.classList.contains('collapsed'),
                      'Inherited section with all overloaded properties should be collapsed');
      });
    });

    describe('overloaded properties', () => {
      it('correctly identifies overloaded properties', async () => {
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.nodeName.returns('DIV');
        node.id = 1 as Protocol.DOM.NodeId;

        const parentNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        parentNode.nodeName.returns('DIV');
        parentNode.id = 2 as Protocol.DOM.NodeId;

        node.parentNode = parentNode;

        // Mock the CSS rules and properties.
        const inspectProperties: Protocol.CSS.CSSProperty[] = [
          {name: 'margin-top', value: '1px', text: 'margin-top: 1px;'},
          {name: 'margin-left', value: '1px', text: 'margin-left: 1px;'},
          {name: 'margin-right', value: '1px', text: 'margin-right: 1px;'},
          {name: 'margin-bottom', value: '1px', text: 'margin-bottom: 1px;'},
          {name: 'font', value: '10px Arial', text: 'font: 10px Arial;'},
          {name: 'font-size', value: '10px', implicit: true},
          {name: 'font-family', value: 'Arial', implicit: true},
        ];
        const inspectRuleMatch = ruleMatch('#inspect', inspectProperties, {
          styleSheetId: '1' as Protocol.DOM.StyleSheetId,
        });

        const divProperties: Protocol.CSS.CSSProperty[] = [
          {name: 'margin', value: '1px', text: 'margin: 1px;'},
          {name: 'margin-top', value: '1px', implicit: true},
          {name: 'margin-left', value: '1px', implicit: true},
          {name: 'margin-right', value: '1px', implicit: true},
          {name: 'margin-bottom', value: '1px', implicit: true},
          {name: 'border', value: '1px solid black', text: 'border: 1px solid black;'},
          {name: 'border-top-width', value: '1px', implicit: true},
          {name: 'border-right-width', value: '1px', implicit: true},
          {name: 'border-bottom-width', value: '1px', implicit: true},
          {name: 'border-left-width', value: '1px', implicit: true},
          {name: 'border-top-style', value: 'solid', implicit: true},
          {name: 'border-right-style', value: 'solid', implicit: true},
          {name: 'border-bottom-style', value: 'solid', implicit: true},
          {name: 'border-left-style', value: 'solid', implicit: true},
          {name: 'border-top-color', value: 'black', implicit: true},
          {name: 'border-right-color', value: 'black', implicit: true},
          {name: 'border-bottom-color', value: 'black', implicit: true},
          {name: 'border-left-color', value: 'black', implicit: true},
        ];
        const divRuleMatch = ruleMatch('div', divProperties, {
          styleSheetId: '1' as Protocol.DOM.StyleSheetId,
        });

        const containerProperties: Protocol.CSS.CSSProperty[] = [
          {name: 'font-size', value: '10px', text: 'font-size: 10px;'},
          {name: 'border', value: '0', text: 'border: 0;'},
        ];
        const containerRuleMatch = ruleMatch('.container', containerProperties, {
          styleSheetId: '1' as Protocol.DOM.StyleSheetId,
        });

        const matchedStyles = await getMatchedStyles({
          connection,
          cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
          node,
          matchedPayload: [divRuleMatch, inspectRuleMatch],
          inheritedPayload: [{
            matchedCSSRules: [divRuleMatch, containerRuleMatch],
          }],
        });

        const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
            matchedStyles, new Map(), new Map(), null);

        assert.lengthOf(sectionBlocks, 2);

        const elementBlock = sectionBlocks[0];
        const inheritedBlock = sectionBlocks[1];

        assert.lengthOf(elementBlock.sections, 2);
        const inspectSection = elementBlock.sections.find(s => s.headerText() === '#inspect');
        const divSection = elementBlock.sections.find(s => s.headerText() === 'div');

        assert.exists(inspectSection);
        assert.exists(divSection);

        const containerSection = inheritedBlock.sections.find(s => s.headerText() === '.container');
        assert.exists(containerSection);

        // Verify overloaded properties in the div section of the element block.
        const divMargin = divSection.style().leadingProperties().find(p => p.name === 'margin');
        assert.exists(divMargin);
        assert.strictEqual(matchedStyles.propertyState(divMargin), SDK.CSSMatchedStyles.PropertyState.OVERLOADED);

        const divBorder = divSection.style().leadingProperties().find(p => p.name === 'border');
        assert.exists(divBorder);
        assert.strictEqual(matchedStyles.propertyState(divBorder), SDK.CSSMatchedStyles.PropertyState.ACTIVE);

        // Verify overloaded properties in the container section of the inherited block.
        const containerFontSize = containerSection.style().leadingProperties().find(p => p.name === 'font-size');
        assert.exists(containerFontSize);
        assert.strictEqual(matchedStyles.propertyState(containerFontSize),
                           SDK.CSSMatchedStyles.PropertyState.OVERLOADED);

        // Verify the inheritance status in the UI using StylePropertyTreeElement.
        inspectSection.onpopulate();
        divSection.onpopulate();
        containerSection.onpopulate();

        const containerTreeElements = containerSection.propertiesTreeOutline.rootElement().children();

        const fontSizeTreeElement =
            containerTreeElements.find((el): el is Elements.StylePropertyTreeElement.StylePropertyTreeElement =>
                                           el instanceof Elements.StylePropertyTreeElement.StylePropertyTreeElement &&
                                           el.property.name === 'font-size');
        assert.exists(fontSizeTreeElement);
        // `font-size` is truly inherited. In the UI, truly inherited properties
        // in inherited sections are rendered as active (not dimmed). This
        // corresponds to `inherited() === false` due to the reversed meaning
        // used for styling.
        assert.isFalse(fontSizeTreeElement.inherited());

        const borderTreeElement =
            containerTreeElements.find((el): el is Elements.StylePropertyTreeElement.StylePropertyTreeElement =>
                                           el instanceof Elements.StylePropertyTreeElement.StylePropertyTreeElement &&
                                           el.property.name === 'border');
        assert.exists(borderTreeElement);
        // `border` is not truly inherited. In the UI, non-inherited properties
        // in inherited sections are rendered as dimmed. This corresponds to
        // `inherited() === true` (which adds the `.inherited` class for dimming)
        // due to the reversed meaning used for styling.
        assert.isTrue(borderTreeElement.inherited());
      });
    });

    it('should add "Other @rules" section to the end', async () => {
      const stylesSidebarPane =
          new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
      const matchedStyles = await getMatchedStyles({
        connection,
        cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
        node: sinon.createStubInstance(SDK.DOMModel.DOMNode),
        atRules: [
          {
            name: {text: '--palette'},
            type: Protocol.CSS.CSSAtRuleType.FontPaletteValues,
            origin: Protocol.CSS.StyleSheetOrigin.Regular,
            style: {
              cssProperties: [{name: 'font-family', value: 'Bixa'}, {name: 'override-colors', value: '0 red'}],
              shorthandEntries: [],
            },
          },
          {
            type: Protocol.CSS.CSSAtRuleType.FontFace,
            origin: Protocol.CSS.StyleSheetOrigin.Regular,
            style: {
              cssProperties: [{name: 'font-family', value: 'Bixa'}, {name: 'src', value: 'local(Bixa)'}],
              shorthandEntries: [],
            },
          },
          {
            type: Protocol.CSS.CSSAtRuleType.FontFeatureValues,
            name: {text: 'Bixa'},
            subsection: Protocol.CSS.CSSAtRuleSubsection.Swash,
            origin: Protocol.CSS.StyleSheetOrigin.Regular,
            style: {
              cssProperties: [{name: 'fancy', value: '1'}],
              shorthandEntries: [],
            },
          },
        ],
      });

      const sectionBlocks =
          await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles, new Map(), new Map(), null);

      assert.lengthOf(sectionBlocks, 2);
      assert.strictEqual(sectionBlocks[1].titleElement()?.textContent, 'Other @rules');
      assert.lengthOf(sectionBlocks[1].sections, 3);
      const contents = [
        '@font-palette-values --palette {    font-family: Bixa;    override-colors: 0 red;}',
        '@font-face {    font-family: Bixa;    src: local(Bixa);}',
        '@font-feature-values Bixa {    @swash {        fancy: 1;    }}',
      ];
      for (let i = 0; i < 3; i++) {
        const section = sectionBlocks[1].sections[i];
        assert.instanceOf(section, Elements.StylePropertiesSection.AtRuleSection);
        assert.strictEqual(section.element.deepTextContent(), contents[i]);
      }
    });

    it('should add @function section to the end', async () => {
      const stylesSidebarPane =
          new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
      const matchedStyles = await getMatchedStyles({
        connection,
        cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
        node: sinon.createStubInstance(SDK.DOMModel.DOMNode),
        functionRules: [{
          name: {text: '--f'},
          parameters: [{name: '--x', type: '*'}, {name: '--y', type: '*'}],
          origin: Protocol.CSS.StyleSheetOrigin.Regular,
          children: [
            {
              condition: {
                media: {
                  text: '(width > 400px)',
                  source: Protocol.CSS.CSSMediaSource.MediaRule,
                },
                conditionText: '<unused>',
                children: [
                  {
                    condition: {
                      containerQueries: {
                        text: '(width > 300px)',
                        conditionText: '--foo (width > 300px)',
                      },
                      conditionText: '<unused>',
                      children: [
                        {
                          condition: {
                            supports: {
                              text: '(color: red)',
                              active: true,
                            },
                            conditionText: '<unused>',
                            children: [
                              {
                                style: {
                                  cssProperties: [{name: 'result', value: 'var(--y)'}],
                                  shorthandEntries: [],
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            {
              style: {
                cssProperties: [{name: 'result', value: 'var(--x)'}],
                shorthandEntries: [],
              },
            },
          ],
        }],
      });

      const sectionBlocks =
          await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles, new Map(), new Map(), null);

      assert.lengthOf(sectionBlocks, 2);
      assert.strictEqual(sectionBlocks[1].titleElement()?.textContent, '@function');
      assert.lengthOf(sectionBlocks[1].sections, 1);
      assert.instanceOf(sectionBlocks[1].sections[0], Elements.StylePropertiesSection.FunctionRuleSection);
      assert.strictEqual(
          sectionBlocks[1].sections[0].element.deepTextContent().replaceAll(/\s+/g, ' ').trim(),
          '--f(--x, --y) { @media (width > 400px) { @container --foo (width > 300px) { @supports (color: red) { result: var(--y); } } } result: var(--x);}');
    });

    it('should add @functions with same name but different tree scope depths', async () => {
      const stylesSidebarPane =
          new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());

      const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
      node.id = 1 as Protocol.DOM.NodeId;
      node.backendNodeId.returns(1 as Protocol.DOM.BackendNodeId);

      const parent = sinon.createStubInstance(SDK.DOMModel.DOMNode);
      parent.id = 2 as Protocol.DOM.NodeId;
      parent.backendNodeId.returns(2 as Protocol.DOM.BackendNodeId);
      node.parentNode = parent;

      const grandparent = sinon.createStubInstance(SDK.DOMModel.DOMNode);
      grandparent.id = 3 as Protocol.DOM.NodeId;
      grandparent.backendNodeId.returns(3 as Protocol.DOM.BackendNodeId);
      parent.parentNode = grandparent;

      node.getTreeRoot.returns(node);

      const matchedStyles = await getMatchedStyles({
        connection,
        cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
        node,
        functionRules: [
          {
            name: {text: '--f'},
            parameters: [],
            origin: Protocol.CSS.StyleSheetOrigin.Regular,
            children: [{
              style: {
                cssProperties: [{name: 'result', value: 'red'}],
                shorthandEntries: [],
              },
            }],
            originTreeScopeNodeId: 2 as Protocol.DOM.BackendNodeId,
          },
          {
            name: {text: '--f'},
            parameters: [],
            origin: Protocol.CSS.StyleSheetOrigin.Regular,
            children: [{
              style: {
                cssProperties: [{name: 'result', value: 'blue'}],
                shorthandEntries: [],
              },
            }],
            originTreeScopeNodeId: 3 as Protocol.DOM.BackendNodeId,
          },
        ],
      });

      const sectionBlocks =
          await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles, new Map(), new Map(), null);

      assert.lengthOf(sectionBlocks, 2);
      assert.strictEqual(sectionBlocks[1].titleElement()?.textContent, '@function');
      assert.lengthOf(sectionBlocks[1].sections, 2);
      assert.instanceOf(sectionBlocks[1].sections[0], Elements.StylePropertiesSection.FunctionRuleSection);
      assert.instanceOf(sectionBlocks[1].sections[1], Elements.StylePropertiesSection.FunctionRuleSection);

      assert.strictEqual(sectionBlocks[1].sections[0].element.deepTextContent().replaceAll(/\s+/g, ' ').trim(),
                         '--f() { result: red;}');
      assert.strictEqual(sectionBlocks[1].sections[1].element.deepTextContent().replaceAll(/\s+/g, ' ').trim(),
                         '--f() { result: blue;}');

      assert.strictEqual(sectionBlocks[1].sections[0].treeScopeDistance(), 1);
      assert.strictEqual(sectionBlocks[1].sections[1].treeScopeDistance(), 2);
    });

    describe('Adding a new rule', () => {
      it('fails silently when adding a new rule with an invalid selector', async () => {
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.id = 1 as Protocol.DOM.NodeId;
        node.simpleSelector.returns('div');
        sinon.stub(stylesSidebarPane, 'node').returns(node);

        const cssModel = stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel;
        const addRuleStub = sinon.stub(cssModel, 'addRule').resolves(null);

        const styleSheetHeader = sinon.createStubInstance(SDK.CSSStyleSheetHeader.CSSStyleSheetHeader);
        styleSheetHeader.id = '1' as Protocol.DOM.StyleSheetId;
        styleSheetHeader.cssModel.returns(cssModel);
        styleSheetHeader.lineNumberInSource.returns(0);
        styleSheetHeader.columnNumberInSource.returns(0);

        sinon.stub(stylesSidebarPane.linkifier, 'linkifyCSSLocation').returns(document.createElement('div'));

        const matchedStyles = await getMatchedStyles({
          connection,
          cssModel,
          node,
          matchedPayload: [
            {
              rule: {
                selectorList: {selectors: [{text: 'div'}], text: 'div'},
                origin: Protocol.CSS.StyleSheetOrigin.Regular,
                style: {
                  cssProperties: [{name: 'color', value: 'blue'}],
                  shorthandEntries: [],
                },
              },
              matchingSelectors: [0],
            },
          ],
        });

        const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
            matchedStyles, new Map(), new Map(), null);
        (stylesSidebarPane as unknown as {sectionBlocks: Elements.StylesSidebarPane.SectionBlock[]}).sectionBlocks =
            sectionBlocks;

        const insertAfterSection = sectionBlocks[0].sections[0];
        assert.exists(insertAfterSection);

        sinon.stub(stylesSidebarPane, 'performUpdate').resolves();

        // Add a blank section.
        const range = {
          startLine: 0,
          startColumn: 0,
          endLine: 0,
          endColumn: 0,
          rebaseAfterTextEdit: () => range,
        } as unknown as Parameters<typeof stylesSidebarPane.addBlankSection>[2];
        stylesSidebarPane.addBlankSection(insertAfterSection, styleSheetHeader, range);

        const blankSection =
            sectionBlocks[0].sections[1] as Elements.StylePropertiesSection.BlankStylePropertiesSection;
        assert.exists(blankSection);
        assert.isTrue(blankSection.isBlank);

        // Commit with an invalid selector.
        blankSection.editingSelectorCommitted(blankSection.element, '@keyframes shake', '@keyframes shake', undefined,
                                              'forward');

        // Wait for the async addRule to complete and microtasks to process.
        await new Promise(resolve => setTimeout(resolve, 0));

        // The addRule should have been called.
        sinon.assert.calledOnce(addRuleStub);

        // Since it returned null (invalid selector), the blank section should have been removed.
        assert.lengthOf(sectionBlocks[0].sections, 1);
        assert.strictEqual(sectionBlocks[0].sections[0], insertAfterSection);
      });
    });

    describe('Animation styles', () => {
      function mockGetAnimatedComputedStyles(response: Partial<Protocol.CSS.GetAnimatedStylesForNodeResponse>) {
        connection.setHandler('CSS.getAnimatedStylesForNode', null);
        connection.setSuccessHandler('CSS.getAnimatedStylesForNode', () => response);
      }

      beforeEach(() => {
        sinon.stub(PanelsCommon.DOMLinkifier.Linkifier.instance(), 'linkify').returns(html`<div></div>`);
        sinon.stub(UI.ViewManager.ViewManager.instance(), 'isViewVisible').returns(false);
        updateHostConfig({
          devToolsAnimationStylesInStylesTab: {
            enabled: true,
          },
        });
      });

      it('should not render transition & animation styles when the animations panel is not visible', async () => {
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const matchedStyles = await getMatchedStyles({
          connection,
          cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
          node: sinon.createStubInstance(SDK.DOMModel.DOMNode),
          animationStylesPayload: [
            {
              name: '--animation-name',
              style: {
                cssProperties: [{
                  name: 'background-color',
                  value: 'blue',
                }],
                shorthandEntries: [],
              },
            },
          ],
          transitionsStylePayload: {
            cssProperties: [{
              name: 'color',
              value: 'red',
            }],
            shorthandEntries: [],
          },
          inheritedAnimatedPayload: [],
        });

        const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
            matchedStyles, new Map(), new Map(), null);
        assert.lengthOf(sectionBlocks[0].sections, 0);
      });

      it('should render transition & animation styles when the animations panel is not visible but the css-animations-only-when-animations-tab-open setting is disabled',
         async () => {
           Common.Settings.Settings.instance().moduleSetting('css-animations-only-when-animations-tab-open').set(false);
           const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(
               new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
           const matchedStyles = await getMatchedStyles({
             connection,
             cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
             node: sinon.createStubInstance(SDK.DOMModel.DOMNode),
             animationStylesPayload: [
               {
                 name: '--animation-name',
                 style: {
                   cssProperties: [{
                     name: 'background-color',
                     value: 'blue',
                   }],
                   shorthandEntries: [],
                 },
               },
             ],
             transitionsStylePayload: {
               cssProperties: [{
                 name: 'color',
                 value: 'red',
               }],
               shorthandEntries: [],
             },
             inheritedAnimatedPayload: [],
           });

           const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
               matchedStyles, new Map(), new Map(), null);
           assert.lengthOf(sectionBlocks[0].sections, 2);
         });

      it('should render transition & animation styles in the styles tab when the animations panel is visible',
         async () => {
           (UI.ViewManager.ViewManager.instance().isViewVisible as sinon.SinonStub).returns(true);
           const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(
               new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
           const matchedStyles = await getMatchedStyles({
             connection,
             cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
             node: sinon.createStubInstance(SDK.DOMModel.DOMNode),
             animationStylesPayload: [
               {
                 name: '--animation-name',
                 style: {
                   cssProperties: [{
                     name: 'background-color',
                     value: 'blue',
                   }],
                   shorthandEntries: [],
                 },
               },
               {
                 style: {
                   cssProperties: [{
                     name: 'color',
                     value: 'blue',
                   }],
                   shorthandEntries: [],
                 },
               },
             ],
             transitionsStylePayload: {
               cssProperties: [{
                 name: 'color',
                 value: 'red',
               }],
               shorthandEntries: [],
             },
             inheritedAnimatedPayload: [],
           });

           const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
               matchedStyles, new Map(), new Map(), null);
           assert.lengthOf(sectionBlocks[0].sections, 3);
           assert.strictEqual(sectionBlocks[0].sections[0].headerText(), 'transitions style');
           assert.strictEqual(sectionBlocks[0].sections[1].headerText(), '--animation-name animation');
           assert.strictEqual(sectionBlocks[0].sections[2].headerText(), 'animation style');
         });

      describe('should auto update animated style sections when onComputedStyleChanged called', () => {
        beforeEach(() => {
          (UI.ViewManager.ViewManager.instance().isViewVisible as sinon.SinonStub).returns(true);
        });
        describe('transition styles', () => {
          it('should trigger re-render when there was no transition style before', async () => {
            mockGetAnimatedComputedStyles({
              transitionsStyle: {
                cssProperties: [{
                  name: 'color',
                  value: 'red',
                }],
                shorthandEntries: [],
              },
            });
            const {node} = createStubbedDomNodeWithModels({nodeId: 1});

            const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(
                new ComputedStyle.ComputedStyleModel.ComputedStyleModel(node));
            const resetUpdateSpy = sinon.spy(stylesSidebarPane, 'scheduleResetUpdateIfNotEditingCalledForTest');
            const matchedStyles = await getMatchedStyles({
              connection,
              cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
              node,
              transitionsStylePayload: null,
            });
            stylesSidebarPane.setMatchedStylesForTest(matchedStyles);
            const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
                matchedStyles, new Map(), new Map(), null);
            assert.lengthOf(sectionBlocks[0].sections, 0);

            const handledComputedStyleChanged =
                expectCall(sinon.stub(stylesSidebarPane, 'handledComputedStyleChangedForTest'));
            stylesSidebarPane.onComputedStyleChanged();
            await handledComputedStyleChanged;

            sinon.assert.called(resetUpdateSpy);
          });

          it('should update value only when there was a transition style before', async () => {
            mockGetAnimatedComputedStyles({
              transitionsStyle: {
                cssProperties: [{
                  name: 'color',
                  value: 'red',
                }],
                shorthandEntries: [],
              },
            });
            const {node} = createStubbedDomNodeWithModels({nodeId: 1});

            const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(
                new ComputedStyle.ComputedStyleModel.ComputedStyleModel(node));
            const resetUpdateSpy = sinon.spy(stylesSidebarPane, 'scheduleResetUpdateIfNotEditingCalledForTest');
            const matchedStyles = await getMatchedStyles({
              connection,
              cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
              node,
              transitionsStylePayload: {
                cssProperties: [{
                  name: 'color',
                  value: 'blue',
                }],
                shorthandEntries: [],
              },
            });
            stylesSidebarPane.setMatchedStylesForTest(matchedStyles);
            const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
                matchedStyles, new Map(), new Map(), null);
            assert.lengthOf(sectionBlocks[0].sections, 1);
            assert.include(sectionBlocks[0].sections[0].propertiesTreeOutline.contentElement.textContent,
                           'color: blue;');

            const handledComputedStyleChanged =
                expectCall(sinon.stub(stylesSidebarPane, 'handledComputedStyleChangedForTest'));
            stylesSidebarPane.onComputedStyleChanged();
            await handledComputedStyleChanged;

            assert.include(sectionBlocks[0].sections[0].propertiesTreeOutline.contentElement.textContent,
                           'color: red;');
            sinon.assert.notCalled(resetUpdateSpy);
          });
        });

        describe('animation styles', () => {
          it('should trigger re-render when there was no animation style before', async () => {
            mockGetAnimatedComputedStyles({
              animationStyles: [{
                name: '--animation',
                style: {
                  cssProperties: [{
                    name: 'color',
                    value: 'red',
                  }],
                  shorthandEntries: [],
                },
              }],
            });
            const {node} = createStubbedDomNodeWithModels({nodeId: 1});

            const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(
                new ComputedStyle.ComputedStyleModel.ComputedStyleModel(node));
            const resetUpdateSpy = sinon.spy(stylesSidebarPane, 'scheduleResetUpdateIfNotEditingCalledForTest');
            const matchedStyles = await getMatchedStyles({
              connection,
              cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
              node,
              animationStylesPayload: [],
            });
            stylesSidebarPane.setMatchedStylesForTest(matchedStyles);
            const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
                matchedStyles, new Map(), new Map(), null);
            assert.lengthOf(sectionBlocks[0].sections, 0);

            const handledComputedStyleChanged =
                expectCall(sinon.stub(stylesSidebarPane, 'handledComputedStyleChangedForTest'));
            stylesSidebarPane.onComputedStyleChanged();
            await handledComputedStyleChanged;

            sinon.assert.called(resetUpdateSpy);
          });

          it('should trigger re-render when there is no animation style after', async () => {
            mockGetAnimatedComputedStyles({
              animationStyles: [],
            });
            const {node} = createStubbedDomNodeWithModels({nodeId: 1});

            const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(
                new ComputedStyle.ComputedStyleModel.ComputedStyleModel(node));
            const resetUpdateSpy = sinon.spy(stylesSidebarPane, 'scheduleResetUpdateIfNotEditingCalledForTest');
            const matchedStyles = await getMatchedStyles({
              connection,
              cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
              node,
              animationStylesPayload: [{
                style: {
                  cssProperties: [{
                    name: 'color',
                    value: 'blue',
                  }],
                  shorthandEntries: [],
                },
              }],
            });
            stylesSidebarPane.setMatchedStylesForTest(matchedStyles);
            const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
                matchedStyles, new Map(), new Map(), null);
            assert.lengthOf(sectionBlocks[0].sections, 1);

            const handledComputedStyleChanged =
                expectCall(sinon.stub(stylesSidebarPane, 'handledComputedStyleChangedForTest'));
            stylesSidebarPane.onComputedStyleChanged();
            await handledComputedStyleChanged;

            sinon.assert.called(resetUpdateSpy);
          });

          it('should update value only when there was the animation style before', async () => {
            mockGetAnimatedComputedStyles({
              animationStyles: [{
                style: {
                  cssProperties: [{
                    name: 'color',
                    value: 'red',
                  }],
                  shorthandEntries: [],
                },
              }],
            });
            const {node} = createStubbedDomNodeWithModels({nodeId: 1});

            const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(
                new ComputedStyle.ComputedStyleModel.ComputedStyleModel(node));
            const resetUpdateSpy = sinon.spy(stylesSidebarPane, 'scheduleResetUpdateIfNotEditingCalledForTest');
            const matchedStyles = await getMatchedStyles({
              connection,
              cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
              node,
              animationStylesPayload: [{
                style: {
                  cssProperties: [{
                    name: 'color',
                    value: 'blue',
                  }],
                  shorthandEntries: [],
                },
              }],
            });
            stylesSidebarPane.setMatchedStylesForTest(matchedStyles);
            const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
                matchedStyles, new Map(), new Map(), null);
            assert.lengthOf(sectionBlocks[0].sections, 1);
            assert.include(sectionBlocks[0].sections[0].propertiesTreeOutline.contentElement.textContent,
                           'color: blue;');

            const handledComputedStyleChanged =
                expectCall(sinon.stub(stylesSidebarPane, 'handledComputedStyleChangedForTest'));
            stylesSidebarPane.onComputedStyleChanged();
            await handledComputedStyleChanged;

            assert.include(sectionBlocks[0].sections[0].propertiesTreeOutline.contentElement.textContent,
                           'color: red;');
            sinon.assert.notCalled(resetUpdateSpy);
          });
        });

        describe('inherited animated styles', () => {
          describe('transition styles', () => {
            it('should trigger re-render when there was no inherited transition style but there is a new one now',
               async () => {
                 mockGetAnimatedComputedStyles({
                   inherited: [{
                     transitionsStyle: {
                       cssProperties: [{
                         name: 'color',
                         value: 'red',
                       }],
                       shorthandEntries: [],
                     },
                   }],
                 });
                 const {node} = createStubbedDomNodeWithModels({nodeId: 1});
                 node.parentNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);

                 const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(
                     new ComputedStyle.ComputedStyleModel.ComputedStyleModel(node));
                 const resetUpdateSpy = sinon.spy(stylesSidebarPane, 'scheduleResetUpdateIfNotEditingCalledForTest');
                 const matchedStyles = await getMatchedStyles({
                   connection,
                   cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
                   node,
                 });
                 stylesSidebarPane.setMatchedStylesForTest(matchedStyles);
                 const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
                     matchedStyles, new Map(), new Map(), null);
                 assert.lengthOf(sectionBlocks[0].sections, 0);

                 const handledComputedStyleChanged =
                     expectCall(sinon.stub(stylesSidebarPane, 'handledComputedStyleChangedForTest'));
                 stylesSidebarPane.onComputedStyleChanged();
                 await handledComputedStyleChanged;

                 sinon.assert.called(resetUpdateSpy);
               });

            it('should not trigger re-render when there was no inherited transition style and the new one does not contain inherited property',
               async () => {
                 mockGetAnimatedComputedStyles({
                   inherited: [{
                     transitionsStyle: {
                       cssProperties: [{
                         name: 'background-color',
                         value: 'red',
                       }],
                       shorthandEntries: [],
                     },
                   }],
                 });
                 const {node} = createStubbedDomNodeWithModels({nodeId: 1});
                 node.parentNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);

                 const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(
                     new ComputedStyle.ComputedStyleModel.ComputedStyleModel(node));
                 const resetUpdateSpy = sinon.spy(stylesSidebarPane, 'scheduleResetUpdateIfNotEditingCalledForTest');
                 const matchedStyles = await getMatchedStyles({
                   connection,
                   cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
                   node,
                 });
                 stylesSidebarPane.setMatchedStylesForTest(matchedStyles);
                 const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
                     matchedStyles, new Map(), new Map(), null);
                 assert.lengthOf(sectionBlocks[0].sections, 0);

                 const handledComputedStyleChanged =
                     expectCall(sinon.stub(stylesSidebarPane, 'handledComputedStyleChangedForTest'));
                 stylesSidebarPane.onComputedStyleChanged();
                 await handledComputedStyleChanged;

                 sinon.assert.notCalled(resetUpdateSpy);
               });

            it('should update value only when there is no new inherited transition style and the value is updated',
               async () => {
                 mockGetAnimatedComputedStyles({
                   inherited: [{
                     transitionsStyle: {
                       cssProperties: [{
                         name: 'color',
                         value: 'red',
                       }],
                       shorthandEntries: [],
                     },
                   }],
                 });
                 const {node} = createStubbedDomNodeWithModels({nodeId: 1});
                 node.parentNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);

                 const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(
                     new ComputedStyle.ComputedStyleModel.ComputedStyleModel(node));
                 const resetUpdateSpy = sinon.spy(stylesSidebarPane, 'scheduleResetUpdateIfNotEditingCalledForTest');
                 const matchedStyles = await getMatchedStyles({
                   connection,
                   cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
                   node,
                   inheritedPayload: [{
                     matchedCSSRules: [],
                   }],
                   inheritedAnimatedPayload: [{
                     transitionsStyle: {
                       cssProperties: [{
                         name: 'color',
                         value: 'blue',
                       }],
                       shorthandEntries: [],
                     },
                   }],
                 });
                 stylesSidebarPane.setMatchedStylesForTest(matchedStyles);
                 const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
                     matchedStyles, new Map(), new Map(), null);
                 assert.lengthOf(sectionBlocks[1].sections, 1);
                 assert.include(sectionBlocks[1].sections[0].propertiesTreeOutline.contentElement.textContent,
                                'color: blue;');

                 const handledComputedStyleChanged =
                     expectCall(sinon.stub(stylesSidebarPane, 'handledComputedStyleChangedForTest'));
                 stylesSidebarPane.onComputedStyleChanged();
                 await handledComputedStyleChanged;

                 assert.include(sectionBlocks[1].sections[0].propertiesTreeOutline.contentElement.textContent,
                                'color: red;');
                 sinon.assert.notCalled(resetUpdateSpy);
               });
          });
        });
      });
    });

    describe('ai code completion provider callbacks', () => {
      let stylesWrapper: UI.Widget.VBox;
      let stylesSidebarPane: Elements.StylesSidebarPane.StylesSidebarPane;

      beforeEach(async () => {
        updateHostConfig({
          devToolsAiCodeCompletionStyles: {
            enabled: true,
          },
          aidaAvailability: {
            enabled: true,
            blockedByAge: false,
            blockedByGeo: false,
          },
        });
        const aiCodeCompletionProviderStub =
            sinon.createStubInstance(TextEditor.AiCodeCompletionProvider.AiCodeCompletionProvider);
        aiCodeCompletionProviderStub.extension.returns([]);
        sinon.stub(TextEditor.AiCodeCompletionProvider.AiCodeCompletionProvider, 'createInstance')
            .returns(aiCodeCompletionProviderStub);
        Common.Settings.Settings.instance().createSetting('ai-code-completion-enabled', true);
        stylesWrapper = new UI.Widget.VBox();
        stylesWrapper.element.classList.add('style-panes-wrapper');
        stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        stylesSidebarPane.show(stylesWrapper.element);
      });

      it('initializes toolbar when the feature is enabled', async () => {
        const providerConfig = stylesSidebarPane.aiCodeCompletionConfig;
        assert.exists(providerConfig);

        providerConfig.onFeatureEnabled();

        assert.exists(stylesWrapper.contentElement.querySelector('div.ai-code-completion-summary-toolbar-container'));
      });

      it('cleans up toolbar when the feature is disabled', async () => {
        const providerConfig = stylesSidebarPane.aiCodeCompletionConfig;
        assert.exists(providerConfig);
        providerConfig.onFeatureEnabled();
        assert.exists(stylesWrapper.contentElement.querySelector('div.ai-code-completion-summary-toolbar-container'));

        providerConfig.onFeatureDisabled();

        assert.notExists(
            stylesWrapper.contentElement.querySelector('div.ai-code-completion-summary-toolbar-container'));
      });

      it('shows a loading state when a request is triggered', async () => {
        const setLoadingSpy = sinon.stub(
            PanelsCommon.AiCodeCompletionSummaryToolbar.AiCodeCompletionSummaryToolbar.prototype, 'setLoading');
        const providerConfig = stylesSidebarPane.aiCodeCompletionConfig;
        assert.exists(providerConfig);
        providerConfig.onFeatureEnabled();

        providerConfig.onRequestTriggered();

        sinon.assert.calledOnce(setLoadingSpy);
        assert.isTrue(setLoadingSpy.firstCall.args[0]);
      });

      it('hides the loading indicator when a response is received', async () => {
        const setLoadingSpy = sinon.stub(
            PanelsCommon.AiCodeCompletionSummaryToolbar.AiCodeCompletionSummaryToolbar.prototype, 'setLoading');
        const providerConfig = stylesSidebarPane.aiCodeCompletionConfig;
        assert.exists(providerConfig);
        providerConfig.onFeatureEnabled();
        providerConfig.onRequestTriggered();
        sinon.assert.calledOnce(setLoadingSpy);
        assert.isTrue(setLoadingSpy.firstCall.args[0]);

        providerConfig.onResponseReceived();

        sinon.assert.calledTwice(setLoadingSpy);
        assert.isFalse(setLoadingSpy.secondCall.args[0]);
      });

      it('attaches the citations toolbar when a suggestion with citations is accepted', async () => {
        const updateCitationsSpy = sinon.spy(
            PanelsCommon.AiCodeCompletionSummaryToolbar.AiCodeCompletionSummaryToolbar.prototype, 'updateCitations');
        const providerConfig = stylesSidebarPane.aiCodeCompletionConfig;
        assert.exists(providerConfig);

        providerConfig.onFeatureEnabled();
        providerConfig.onResponseReceived();

        providerConfig.onSuggestionAccepted([{uri: 'https://example.com/source'}]);

        sinon.assert.calledOnce(updateCitationsSpy);
        assert.deepEqual(updateCitationsSpy.firstCall.args, [['https://example.com/source']]);
      });

      it('does not attach the citations toolbar if there are no citations', async () => {
        const updateCitationsSpy = sinon.spy(
            PanelsCommon.AiCodeCompletionSummaryToolbar.AiCodeCompletionSummaryToolbar.prototype, 'updateCitations');
        const providerConfig = stylesSidebarPane.aiCodeCompletionConfig;
        assert.exists(providerConfig);

        providerConfig.onFeatureEnabled();
        providerConfig.onResponseReceived();

        providerConfig.onSuggestionAccepted([]);

        sinon.assert.notCalled(updateCitationsSpy);
      });

      it('safely handles onFeatureEnabled when not yet attached to style-panes-wrapper and creates toolbar upon show',
         async () => {
           const unattachedPane = new Elements.StylesSidebarPane.StylesSidebarPane(
               new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
           const config = unattachedPane.aiCodeCompletionConfig;
           assert.exists(config);

           // Enabling before show() should not throw
           assert.doesNotThrow(() => {
             config.onFeatureEnabled();
           });

           const wrapper = new UI.Widget.VBox();
           wrapper.element.classList.add('style-panes-wrapper');
           wrapper.markAsRoot();
           renderElementIntoDOM(wrapper);
           unattachedPane.show(wrapper.element);

           assert.exists(wrapper.contentElement.querySelector('div.ai-code-completion-summary-toolbar-container'));
           wrapper.detach();
         });
    });
  });

  describe('IdleCallbackManager', () => {
    // IdleCallbackManager delegates work using requestIdleCallback, which does not generally execute requested callbacks
    // in order. This test verifies that callbacks do happen in order even if timeouts are run out.
    it('schedules callbacks in order', async () => {
      /** Override the default timeout with a very short one **/
      class QuickIdleCallbackManager extends Elements.StylesSidebarPane.IdleCallbackManager {
        protected override scheduleIdleCallback(_: number): void {
          super.scheduleIdleCallback(1);
        }
      }

      const timeout = (time: number) => new Promise<void>(resolve => setTimeout(resolve, time));

      const elements: number[] = [];

      const callbacks = new QuickIdleCallbackManager();
      callbacks.schedule(() => elements.push(0));
      callbacks.schedule(() => elements.push(1));
      callbacks.schedule(() => elements.push(2));
      callbacks.schedule(() => elements.push(3));
      await timeout(10);
      callbacks.schedule(() => elements.push(4));
      callbacks.schedule(() => elements.push(5));
      callbacks.schedule(() => elements.push(6));
      callbacks.schedule(() => elements.push(7));
      await timeout(10);

      await callbacks.awaitDone();

      assert.deepEqual(elements, [0, 1, 2, 3, 4, 5, 6, 7]);
    });
  });

  describe('CSSPropertyPrompt', () => {
    setupLocaleHooks();
    const CSSPropertyPrompt = Elements.StylesSidebarPane.CSSPropertyPrompt;

    const CSS_VARIABLES_FOR_TEST: Record<string, string> = {
      '--rgb-color': 'rgb(0 0 0)',
      '--wide-gamut-color': 'lch(0 0 0)',
    };

    let aiCodeCompletionProvider:
        sinon.SinonStubbedInstance<Elements.StylesAiCodeCompletionProvider.StylesAiCodeCompletionProvider>;
    let section: sinon.SinonStubbedInstance<Elements.StylePropertiesSection.StylePropertiesSection>;
    let mockTreeItem: Elements.StylePropertyTreeElement.StylePropertyTreeElement;

    const noop = () => {};

    beforeEach(() => {
      section = sinon.createStubInstance(Elements.StylePropertiesSection.StylePropertiesSection);
      let activeAiSuggestion: Elements.StylePropertiesSection.ActiveAiSuggestion|undefined;
      Object.defineProperty(section, 'activeAiSuggestion', {
        get: () => activeAiSuggestion,
        set: aiSuggestion => {
          activeAiSuggestion = aiSuggestion;
        },
        configurable: true,
      });
      sinon.stub(section, 'activeAiSuggestion').get(() => activeAiSuggestion);
      section.commitActiveAiSuggestion.resolves();
      mockTreeItem = {
        property: {
          name: 'color',
        },
        node() {
          return {
            isSVGNode() {
              return false;
            },
            domModel() {
              return {
                cssModel() {
                  return {
                    getComputedStyle() {
                      return new Map<string, string>();
                    },
                  };
                },
              };
            },
          };
        },
        matchedStyles() {
          return {
            availableCSSVariables(): string[] {
              return ['--rgb-color', '--wide-gamut-color'];
            },
            computeCSSVariable(_: unknown, completion: string): {value: string, declaration: null} |
                undefined {
                  return {value: CSS_VARIABLES_FOR_TEST[completion], declaration: null};
                },
          };
        },
        section() {
          return section;
        },
        showGhostTextInValue(_text: string): void{},
        stylesContainer() {
          const pane = sinon.createStubInstance(Elements.StylesSidebarPane.StylesSidebarPane);
          const cssModel = sinon.createStubInstance(SDK.CSSModel.CSSModel);
          pane.cssModel.returns(cssModel);
          aiCodeCompletionProvider =
              sinon.createStubInstance(Elements.StylesAiCodeCompletionProvider.StylesAiCodeCompletionProvider);
          pane.aiCodeCompletionProvider = aiCodeCompletionProvider;
          return pane;
        },
      } as unknown as Elements.StylePropertyTreeElement.StylePropertyTreeElement;
    });

    describeWithEnvironment('value autocompletion', () => {
      it('shows autocomplete item with color swatch for CSS variables with RGB color', async () => {
        const attachedElement = document.createElement('div');
        renderElementIntoDOM(attachedElement);
        const cssPropertyPrompt = new CSSPropertyPrompt(mockTreeItem, false);

        cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);
        const spyObj = sinon.spy(cssPropertyPrompt.suggestBoxForTest());
        cssPropertyPrompt.setText('var(--rgb');
        await cssPropertyPrompt.complete(true);

        const colorCompletions = spyObj?.updateSuggestions.firstCall.args[1];
        const renderedElement = colorCompletions?.[0].subtitleRenderer?.();
        assert.instanceOf(renderedElement, InlineEditor.ColorSwatch.ColorSwatch);
      });

      it('shows autocomplete item with color swatch for CSS variables with wide gamut color', async () => {
        const attachedElement = document.createElement('div');
        renderElementIntoDOM(attachedElement);
        const cssPropertyPrompt = new CSSPropertyPrompt(mockTreeItem, false);

        cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);
        const spyObj = sinon.spy(cssPropertyPrompt.suggestBoxForTest());
        cssPropertyPrompt.setText('var(--wide');
        await cssPropertyPrompt.complete(true);

        const colorCompletions = spyObj?.updateSuggestions.firstCall.args[1];
        const renderedElement = colorCompletions?.[0].subtitleRenderer?.();
        assert.instanceOf(renderedElement, InlineEditor.ColorSwatch.ColorSwatch);
      });

      it('shows autocomplete property names for CSS aliases', async () => {
        const attachedElement = document.createElement('div');
        renderElementIntoDOM(attachedElement);
        const cssPropertyPrompt = new CSSPropertyPrompt(mockTreeItem, true);

        cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);
        const spyObj = sinon.spy(cssPropertyPrompt.suggestBoxForTest());
        cssPropertyPrompt.setText('word-wra');
        await cssPropertyPrompt.complete(true);
        const completions = spyObj?.updateSuggestions.firstCall.args[1];
        assert.strictEqual(completions?.[0].text, 'word-wrap');
        assert.strictEqual(completions?.[1].text, 'overflow-wrap');
        assert.strictEqual(completions?.[1].subtitle, '= word-wrap');
      });

      it('returns no completions when property name contains invalid characters', async () => {
        const attachedElement = document.createElement('div');
        renderElementIntoDOM(attachedElement);
        const cssPropertyPrompt = new CSSPropertyPrompt(mockTreeItem, true);

        cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);
        const suggestBox = cssPropertyPrompt.suggestBoxForTest();
        assert.exists(suggestBox);
        const spyObj = sinon.spy(suggestBox);

        cssPropertyPrompt.setText('height"');
        await cssPropertyPrompt.complete(true);

        sinon.assert.notCalled(spyObj.updateSuggestions);
      });

      it('allows completions for valid property names', async () => {
        const attachedElement = document.createElement('div');
        renderElementIntoDOM(attachedElement);
        const cssPropertyPrompt = new CSSPropertyPrompt(mockTreeItem, true);

        cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);
        const spyObj = sinon.spy(cssPropertyPrompt.suggestBoxForTest());
        cssPropertyPrompt.setText('backgrou');
        await cssPropertyPrompt.complete(true);

        assert.isTrue(spyObj?.updateSuggestions.called);
        const completions = spyObj?.updateSuggestions.firstCall.args[1];
        assert.isAbove(completions.length, 0);
      });
    });

    describe('AI code completion', () => {
      let attachedElement: HTMLDivElement;
      let cssPropertyPrompt: Elements.StylesSidebarPane.CSSPropertyPrompt;

      beforeEach(() => {
        updateHostConfig({
          devToolsAiCodeCompletionStyles: {
            enabled: true,
          },
          aidaAvailability: {
            enabled: true,
            blockedByAge: false,
            blockedByGeo: false,
          },
        });

        attachedElement = document.createElement('div');
        renderElementIntoDOM(attachedElement);
        cssPropertyPrompt = new Elements.StylesSidebarPane.CSSPropertyPrompt(mockTreeItem, false);
      });

      it('getCompletionHint returns null if suggestBox is not visible', () => {
        cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);

        assert.exists(cssPropertyPrompt.aiCodeCompletionProvider?.getCompletionHint);
        assert.isNull(cssPropertyPrompt.aiCodeCompletionProvider.getCompletionHint());
      });

      it('getCompletionHint returns the correct completion hint', async () => {
        cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);
        cssPropertyPrompt.setText('var(--rgb');
        await cssPropertyPrompt.complete(true);

        assert.strictEqual(cssPropertyPrompt.aiCodeCompletionProvider?.getCompletionHint?.(), '-color)');
      });

      it('debounces triggerAiCodeCompletion', async () => {
        const clock = sinon.useFakeTimers();
        const triggerAiCodeCompletionStub = aiCodeCompletionProvider.triggerAiCodeCompletion.resolves();
        cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);

        cssPropertyPrompt.setText('backgr');
        cssPropertyPrompt.onInput(new Event('input'));
        cssPropertyPrompt.setText('backgro');
        cssPropertyPrompt.onInput(new Event('input'));
        cssPropertyPrompt.setText('backgrou');
        cssPropertyPrompt.onInput(new Event('input'));
        await clock.tickAsync(TextEditor.AiCodeCompletionProvider.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);

        sinon.assert.calledOnce(triggerAiCodeCompletionStub);
        assert.strictEqual(triggerAiCodeCompletionStub.firstCall.args[0], 'backgrou');
        assert.strictEqual(triggerAiCodeCompletionStub.firstCall.args[1], 8);
        clock.restore();
      });

      it('cancels pending requests and clears suggestions on deletion', async () => {
        const clock = sinon.useFakeTimers();
        const triggerAiCodeCompletionStub = aiCodeCompletionProvider.triggerAiCodeCompletion.resolves();
        cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);

        // First call triggerAiCodeCompletion by typing a letter
        cssPropertyPrompt.setText('b');
        cssPropertyPrompt.onInput(new Event('input'));

        // Perform deletion
        cssPropertyPrompt.setText('');
        const deleteEvent = new InputEvent('input', {inputType: 'deleteContentBackward'});
        cssPropertyPrompt.onInput(deleteEvent);

        await clock.tickAsync(TextEditor.AiCodeCompletionProvider.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);

        // Verify no request was made
        sinon.assert.notCalled(triggerAiCodeCompletionStub);
        // Verify active suggestion was cleared
        assert.isUndefined(mockTreeItem.section().activeAiSuggestion);
        clock.restore();
      });

      it('triggerAiCodeCompletion calls the provider with correct arguments', () => {
        const clock = sinon.useFakeTimers();
        const triggerAiCodeCompletionStub = aiCodeCompletionProvider.triggerAiCodeCompletion.resolves();
        cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);

        cssPropertyPrompt.setText('backgrou');
        cssPropertyPrompt.onInput(new Event('input'));
        clock.tick(TextEditor.AiCodeCompletionProvider.AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS + 1);

        sinon.assert.calledOnce(triggerAiCodeCompletionStub);
        assert.strictEqual(triggerAiCodeCompletionStub.firstCall.args[0], 'backgrou');
        assert.strictEqual(triggerAiCodeCompletionStub.firstCall.args[1], 8);
        clock.restore();
      });

      it('setAiAutoCompletion sets activeAiSuggestion on the section', async () => {
        cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);

        cssPropertyPrompt.aiCodeCompletionProvider?.setAiAutoCompletion?.({
          text: 'color: pink;',
          from: 0,
          startTime: 0,
          clearCachedRequest: () => {},
          onImpression: () => {},
          citations: [],
        });

        assert.exists(section.activeAiSuggestion);
        assert.deepEqual(section.activeAiSuggestion.properties, [{name: 'color', value: 'pink'}]);
      });

      it('setAiAutoCompletion correctly parses complex CSS and sets activeAiSuggestion on the section', async () => {
        const cssPropertyPrompt = new CSSPropertyPrompt(mockTreeItem, true);
        cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);
        const complexCss = `background-image: url("https://example.com/image;v=1?query:part=true");
content: "This is a semicolon; and this is a colon: inside a string";
--custom-property: var(--other, "fallback;value");
width: calc(100% - 20px);
color: pink !important;`;

        cssPropertyPrompt.aiCodeCompletionProvider?.setAiAutoCompletion?.({
          text: complexCss,
          from: 0,
          startTime: 0,
          clearCachedRequest: () => {},
          onImpression: () => {},
          citations: [],
        });

        assert.exists(section.activeAiSuggestion);
        assert.deepEqual(section.activeAiSuggestion.properties, [
          {name: 'background-image', value: 'url("https://example.com/image;v=1?query:part=true")'},
          {name: 'content', value: '"This is a semicolon; and this is a colon: inside a string"'},
          {name: '--custom-property', value: 'var(--other, "fallback;value")'},
          {name: 'width', value: 'calc(100% - 20px)'},
          {name: 'color', value: 'pink !important'},
        ]);
      });

      it('only hides suggest box on Escape when suggest box is visible but does not clear AI suggestion', async () => {
        cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);
        cssPropertyPrompt.setText('var(--rgb');
        await cssPropertyPrompt.complete(true);

        cssPropertyPrompt.aiCodeCompletionProvider?.setAiAutoCompletion?.({
          text: 'color: var(--rgb-color);',
          from: 0,
          startTime: 0,
          clearCachedRequest: () => {},
          onImpression: () => {},
          citations: [],
        });

        assert.isTrue(cssPropertyPrompt.isSuggestBoxVisible());
        const escapeEvent = new KeyboardEvent('keydown', {key: 'Escape'});
        cssPropertyPrompt.onKeyDown(escapeEvent);

        assert.isFalse(cssPropertyPrompt.isSuggestBoxVisible());
        assert.strictEqual(section.activeAiSuggestion?.text, 'color: var(--rgb-color);');
      });

      it('clears active AI suggestion on ArrowDown', async () => {
        cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);
        cssPropertyPrompt.setText('var(--rgb');
        await cssPropertyPrompt.complete(true);

        cssPropertyPrompt.aiCodeCompletionProvider?.setAiAutoCompletion?.({
          text: 'color: var(--rgb-color);',
          from: 0,
          startTime: 0,
          clearCachedRequest: () => {},
          onImpression: () => {},
          citations: [],
        });

        assert.strictEqual(section.activeAiSuggestion?.text, 'color: var(--rgb-color);');
        assert.isTrue(cssPropertyPrompt.isSuggestBoxVisible());

        const arrowDownEvent = new KeyboardEvent('keydown', {key: 'ArrowDown'});
        cssPropertyPrompt.onKeyDown(arrowDownEvent);

        assert.notExists(section.activeAiSuggestion);
      });

      describe('acceptAiCodeComplete', () => {
        it('accepts suggestion on Tab when suggest box is hidden', async () => {
          cssPropertyPrompt = new Elements.StylesSidebarPane.CSSPropertyPrompt(mockTreeItem, true);
          cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);
          const onSuggestionAcceptedStub = aiCodeCompletionProvider.onSuggestionAccepted.returns();

          cssPropertyPrompt.aiCodeCompletionProvider?.setAiAutoCompletion?.({
            text: 'color: pink;',
            from: 0,
            startTime: 0,
            clearCachedRequest: () => {},
            onImpression: () => {},
            citations: [{uri: 'https://example.com'}],
            sampleId: 1,
            rpcGlobalId: 1,
          });
          const tabEvent = new KeyboardEvent('keydown', {key: 'Tab'});
          cssPropertyPrompt.onKeyDown(tabEvent);
          // Required to make sure section.commitActiveAiSuggestion resolves
          await raf();

          sinon.assert.calledOnce(section.commitActiveAiSuggestion);
          sinon.assert.calledOnce(onSuggestionAcceptedStub);
          assert.deepEqual(onSuggestionAcceptedStub.firstCall.args, [[{uri: 'https://example.com'}], 1, 1]);
        });

        it('accepts auto complete suggestion and re-applies ghost text on first Tab accept when suggest box is visible',
           async () => {
             const cssPropertyPrompt = new CSSPropertyPrompt(mockTreeItem, false, ['green']);
             cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);

             cssPropertyPrompt.setText('gre');
             await cssPropertyPrompt.complete(true);
             cssPropertyPrompt.aiCodeCompletionProvider?.setAiAutoCompletion?.({
               text: 'color: greenyellow;',
               from: 0,
               startTime: 0,
               clearCachedRequest: () => {},
               onImpression: () => {},
               citations: [],
             });

             assert.isTrue(cssPropertyPrompt.isSuggestBoxVisible());
             const applySuggestionSpy = sinon.spy(cssPropertyPrompt, 'applySuggestion');
             const tabEvent = new KeyboardEvent('keydown', {key: 'Tab'});
             cssPropertyPrompt.onKeyDown(tabEvent);

             // On first Tab, the suggestion from auto complete menu is applied.
             // And the AI suggestion text is set as ghost text.
             assert.strictEqual(applySuggestionSpy.lastCall.args[0]?.text, 'greenyellow');
             assert.strictEqual(cssPropertyPrompt.text(), 'green');
           });

        it('accepts AI suggestion on second Tab when suggest box is visible', async () => {
          cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);

          cssPropertyPrompt.setText('var(--rgb');
          await cssPropertyPrompt.complete(true);
          cssPropertyPrompt.aiCodeCompletionProvider?.setAiAutoCompletion?.({
            text: 'color: var(--rgb-color); background-color: white;',
            from: 0,
            startTime: 0,
            clearCachedRequest: () => {},
            onImpression: () => {},
            citations: [],
          });

          assert.isTrue(cssPropertyPrompt.isSuggestBoxVisible());
          const tabEvent = new KeyboardEvent('keydown', {key: 'Tab'});
          cssPropertyPrompt.onKeyDown(tabEvent);

          // On first Tab, the suggestion from auto complete menu is applied.
          assert.strictEqual(cssPropertyPrompt.text(), 'var(--rgb-color)');

          cssPropertyPrompt.onKeyDown(tabEvent);

          // On second Tab, the AI suggestion is committed.
          sinon.assert.calledOnce(section.commitActiveAiSuggestion);
        });

        it('accepts traditional autocomplete suggestion on Tab when suggest box is hidden but inline suggestion is active',
           async () => {
             const cssPropertyPrompt = new CSSPropertyPrompt(mockTreeItem, true);
             cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);

             cssPropertyPrompt.setText('flex-g');
             await cssPropertyPrompt.complete(true);

             assert.isFalse(cssPropertyPrompt.isSuggestBoxVisible());
             assert.strictEqual(cssPropertyPrompt.currentSuggestion()?.text, 'flex-grow');

             const tabEvent = new KeyboardEvent('keydown', {key: 'Tab'});
             cssPropertyPrompt.onKeyDown(tabEvent);

             assert.strictEqual(cssPropertyPrompt.text(), 'flex-grow');
           });
      });

      describe('updateAiCodeSuggestion', () => {
        it('clears suggestion if user input does not match', async () => {
          cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);

          assert.exists(cssPropertyPrompt.aiCodeCompletionProvider);
          cssPropertyPrompt.aiCodeCompletionProvider.setAiAutoCompletion?.({
            text: 'color: pink;',
            from: 0,
            startTime: 0,
            clearCachedRequest: () => {},
            onImpression: () => {},
            citations: [],
          });
          assert.exists(section.activeAiSuggestion);

          cssPropertyPrompt.setText('bac');
          cssPropertyPrompt.onInput(new Event('input'));

          assert.isUndefined(section.activeAiSuggestion);
        });

        it('clears suggestion if cursor is moved before trigger point', async () => {
          cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);

          cssPropertyPrompt.setText('pin');
          cssPropertyPrompt.aiCodeCompletionProvider?.setAiAutoCompletion?.({
            text: 'color: pink;',
            from: 3,
            startTime: 0,
            clearCachedRequest: () => {},
            onImpression: () => {},
            citations: [],
          });
          assert.exists(section.activeAiSuggestion);

          const mockSelection = ({
                                  rangeCount: 1,
                                  getRangeAt: () => ({
                                    endOffset: 2,
                                  }),
                                }) as unknown as Selection;
          sinon.stub(cssPropertyPrompt.element(), 'getComponentSelection').returns(mockSelection);

          cssPropertyPrompt.onInput(new Event('input'));
          assert.isUndefined(section.activeAiSuggestion);
        });

        it('clears suggestion if suggest box shows inconsistent top suggestion', async () => {
          cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);

          cssPropertyPrompt.setText('var(--rgb');
          await cssPropertyPrompt.complete(true);
          cssPropertyPrompt.aiCodeCompletionProvider?.setAiAutoCompletion?.({
            text: 'color: var(--rgb-background-color);',
            from: 0,
            startTime: 0,
            clearCachedRequest: () => {},
            onImpression: () => {},
            citations: [],
          });

          assert.exists(section.activeAiSuggestion);

          await cssPropertyPrompt.onInput(new Event('input'));

          assert.isUndefined(section.activeAiSuggestion);
        });

        it('keeps suggestion if input matches', async () => {
          cssPropertyPrompt.attachAndStartEditing(attachedElement, noop);

          cssPropertyPrompt.setText('p');
          cssPropertyPrompt.aiCodeCompletionProvider?.setAiAutoCompletion?.({
            text: 'color: pink;',
            from: 1,
            startTime: 0,
            clearCachedRequest: () => {},
            onImpression: () => {},
            citations: [],
          });
          assert.exists(section.activeAiSuggestion);

          cssPropertyPrompt.setText('pi');
          cssPropertyPrompt.onInput(new Event('input'));

          assert.exists(section.activeAiSuggestion);
          assert.deepEqual(section.activeAiSuggestion.properties, [{name: 'color', value: 'pink'}]);
        });
      });
    });
  });

  describeWithEnvironment('UpdatesFromJS', () => {
    let connection: MockCDPConnection;
    let domModel: SDK.DOMModel.DOMModel;
    let cssModel: SDK.CSSModel.CSSModel;
    let stylesSidebarPane: Elements.StylesSidebarPane.StylesSidebarPane;

    beforeEach(() => {
      connection = new MockCDPConnection();
      const target = createTarget({connection});
      domModel = target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel;
      cssModel = target.model(SDK.CSSModel.CSSModel) as SDK.CSSModel.CSSModel;
      sinon.stub(ComputedStyle.ComputedStyleModel.ComputedStyleModel.prototype, 'cssModel').returns(cssModel);
    });

    it('updates inline styles when style attribute is modified', async () => {
      const CONTAINER_NODE_ID = 1 as Protocol.DOM.NodeId;

      domModel.setDocumentForTest({
        nodeId: 0 as Protocol.DOM.NodeId,
        backendNodeId: 0 as Protocol.DOM.BackendNodeId,
        nodeType: Node.DOCUMENT_NODE,
        nodeName: '#document',
        localName: '',
        nodeValue: '',
        childNodeCount: 1,
        children: [
          {
            nodeId: CONTAINER_NODE_ID,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'div',
            localName: 'div',
            attributes: ['id', 'container', 'style', 'font-weight:bold'],
            nodeValue: '',
          },
        ],
      } as Protocol.DOM.Node);

      const containerNode = domModel.nodeForId(CONTAINER_NODE_ID);
      assert.exists(containerNode);

      UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, containerNode);

      const inlineStyle: Protocol.CSS.CSSStyle = {
        styleSheetId: '0' as Protocol.DOM.StyleSheetId,
        cssProperties: [{name: 'font-weight', value: 'bold'}],
        shorthandEntries: [],
      };

      const matchedStylesPayload: Protocol.CSS.GetMatchedStylesForNodeResponse = {
        inlineStyle,
        matchedCSSRules: [],
        pseudoElements: [],
        inherited: [],
        inheritedPseudoElements: [],
        cssKeyframesRules: [],
        cssPositionTryRules: [],
        cssPropertyRules: [],
        cssPropertyRegistrations: [],
        cssAtRules: [],
        activePositionFallbackIndex: -1,
        cssFunctionRules: [],
        getError: () => undefined,
      };

      connection.setSuccessHandler('CSS.getMatchedStylesForNode', () => matchedStylesPayload);

      const computedStyleModel = new ComputedStyle.ComputedStyleModel.ComputedStyleModel();
      computedStyleModel.node = containerNode;
      stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
      renderElementIntoDOM(stylesSidebarPane);

      stylesSidebarPane.forceUpdate();

      await new Promise<void>(resolve => {
        stylesSidebarPane.addEventListener(Elements.StylesSidebarPane.Events.INITIAL_UPDATE_COMPLETED, () => resolve(),
                                           {once: true});
      });

      let sections = stylesSidebarPane.allSections();
      assert.lengthOf(sections, 1);
      assert.strictEqual(sections[0].headerText(), 'element.style');
      assert.lengthOf(sections[0].style().leadingProperties(), 1);
      assert.strictEqual(sections[0].style().leadingProperties()[0].name, 'font-weight');
      assert.strictEqual(sections[0].style().leadingProperties()[0].value, 'bold');

      matchedStylesPayload.inlineStyle = {
        styleSheetId: '0' as Protocol.DOM.StyleSheetId,
        cssProperties: [
          {name: 'color', value: 'rgb(218, 192, 222)'},
          {name: 'border', value: '1px solid black'},
        ],
        shorthandEntries: [],
      };

      connection.dispatchEvent('DOM.attributeModified', {
        nodeId: CONTAINER_NODE_ID,
        name: 'style',
        value: 'color: #daC0DE; border: 1px solid black;',
      },
                               undefined);

      await new Promise<void>(resolve => {
        stylesSidebarPane.addEventListener(Elements.StylesSidebarPane.Events.STYLES_UPDATE_COMPLETED, () => resolve(),
                                           {once: true});
      });

      sections = stylesSidebarPane.allSections();
      assert.lengthOf(sections, 1);
      const properties = sections[0].style().leadingProperties();
      assert.lengthOf(properties, 2);
      assert.strictEqual(properties[0].name, 'color');
      assert.strictEqual(properties[0].value, 'rgb(218, 192, 222)');
      assert.strictEqual(properties[1].name, 'border');
      assert.strictEqual(properties[1].value, '1px solid black');
    });

    it('updates styles when ancestor class is modified', async () => {
      const CONTAINER_NODE_ID = 1 as Protocol.DOM.NodeId;
      const CHILD_NODE_ID = 2 as Protocol.DOM.NodeId;

      domModel.setDocumentForTest({
        nodeId: 0 as Protocol.DOM.NodeId,
        backendNodeId: 0 as Protocol.DOM.BackendNodeId,
        nodeType: Node.DOCUMENT_NODE,
        nodeName: '#document',
        localName: '',
        nodeValue: '',
        childNodeCount: 1,
        children: [
          {
            nodeId: CONTAINER_NODE_ID,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'div',
            localName: 'div',
            attributes: ['id', 'container'],
            nodeValue: '',
            childNodeCount: 1,
            children: [
              {
                nodeId: CHILD_NODE_ID,
                backendNodeId: 3 as Protocol.DOM.BackendNodeId,
                nodeType: Node.ELEMENT_NODE,
                nodeName: 'div',
                localName: 'div',
                attributes: ['id', 'child'],
                nodeValue: '',
              },
            ],
          },
        ],
      } as Protocol.DOM.Node);

      const childNode = domModel.nodeForId(CHILD_NODE_ID);
      assert.exists(childNode);

      UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, childNode);

      const matchedStylesPayload: Protocol.CSS.GetMatchedStylesForNodeResponse = {
        inlineStyle: undefined,
        matchedCSSRules: [],
        pseudoElements: [],
        inherited: [],
        inheritedPseudoElements: [],
        cssKeyframesRules: [],
        cssPositionTryRules: [],
        cssPropertyRules: [],
        cssPropertyRegistrations: [],
        cssAtRules: [],
        activePositionFallbackIndex: -1,
        cssFunctionRules: [],
        getError: () => undefined,
      };

      connection.setSuccessHandler('CSS.getMatchedStylesForNode', () => matchedStylesPayload);

      const computedStyleModel = new ComputedStyle.ComputedStyleModel.ComputedStyleModel();
      computedStyleModel.node = childNode;
      stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
      renderElementIntoDOM(stylesSidebarPane);

      stylesSidebarPane.forceUpdate();
      await new Promise<void>(resolve => {
        stylesSidebarPane.addEventListener(Elements.StylesSidebarPane.Events.INITIAL_UPDATE_COMPLETED, () => resolve(),
                                           {once: true});
      });

      let sections = stylesSidebarPane.allSections();
      assert.isUndefined(sections.find(s => s.headerText() === '.red div:first-child'));

      matchedStylesPayload.matchedCSSRules = [
        ruleMatch('.red div:first-child', {'background-color': 'red'}),
      ];

      connection.dispatchEvent('DOM.attributeModified', {
        nodeId: CONTAINER_NODE_ID,
        name: 'class',
        value: 'red',
      },
                               undefined);

      await new Promise<void>(resolve => {
        stylesSidebarPane.addEventListener(Elements.StylesSidebarPane.Events.STYLES_UPDATE_COMPLETED, () => resolve(),
                                           {once: true});
      });

      sections = stylesSidebarPane.allSections();
      const redSection = sections.find(s => s.headerText() === '.red div:first-child');
      assert.exists(redSection);
      assert.strictEqual(redSection.style().leadingProperties()[0].name, 'background-color');
      assert.strictEqual(redSection.style().leadingProperties()[0].value, 'red');
    });

    it('updates styles when sibling attribute is modified', async () => {
      const CONTAINER_NODE_ID = 1 as Protocol.DOM.NodeId;
      const CHILD_NODE_ID = 2 as Protocol.DOM.NodeId;
      const SIBLING_NODE_ID = 3 as Protocol.DOM.NodeId;

      domModel.setDocumentForTest({
        nodeId: 0 as Protocol.DOM.NodeId,
        backendNodeId: 0 as Protocol.DOM.BackendNodeId,
        nodeType: Node.DOCUMENT_NODE,
        nodeName: '#document',
        localName: '',
        nodeValue: '',
        childNodeCount: 1,
        children: [
          {
            nodeId: CONTAINER_NODE_ID,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'div',
            localName: 'div',
            attributes: ['id', 'container'],
            nodeValue: '',
            childNodeCount: 2,
            children: [
              {
                nodeId: CHILD_NODE_ID,
                backendNodeId: 3 as Protocol.DOM.BackendNodeId,
                nodeType: Node.ELEMENT_NODE,
                nodeName: 'div',
                localName: 'div',
                attributes: ['id', 'child'],
                nodeValue: '',
              },
              {
                nodeId: SIBLING_NODE_ID,
                backendNodeId: 4 as Protocol.DOM.BackendNodeId,
                nodeType: Node.ELEMENT_NODE,
                nodeName: 'div',
                localName: 'div',
                attributes: ['id', 'childSibling'],
                nodeValue: '',
              },
            ],
          },
        ],
      } as Protocol.DOM.Node);

      const siblingNode = domModel.nodeForId(SIBLING_NODE_ID);
      assert.exists(siblingNode);

      UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, siblingNode);

      const matchedStylesPayload: Protocol.CSS.GetMatchedStylesForNodeResponse = {
        inlineStyle: undefined,
        matchedCSSRules: [],
        pseudoElements: [],
        inherited: [],
        inheritedPseudoElements: [],
        cssKeyframesRules: [],
        cssPositionTryRules: [],
        cssPropertyRules: [],
        cssPropertyRegistrations: [],
        cssAtRules: [],
        activePositionFallbackIndex: -1,
        cssFunctionRules: [],
        getError: () => undefined,
      };

      connection.setSuccessHandler('CSS.getMatchedStylesForNode', () => matchedStylesPayload);

      const computedStyleModel = new ComputedStyle.ComputedStyleModel.ComputedStyleModel();
      computedStyleModel.node = siblingNode;
      stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
      renderElementIntoDOM(stylesSidebarPane);

      stylesSidebarPane.forceUpdate();
      await new Promise<void>(resolve => {
        stylesSidebarPane.addEventListener(Elements.StylesSidebarPane.Events.INITIAL_UPDATE_COMPLETED, () => resolve(),
                                           {once: true});
      });

      let sections = stylesSidebarPane.allSections();
      assert.isUndefined(sections.find(s => s.headerText() === 'div[foo="bar"] + div'));

      matchedStylesPayload.matchedCSSRules = [
        ruleMatch('div[foo="bar"] + div', {'background-color': 'blue'}),
      ];

      connection.dispatchEvent('DOM.attributeModified', {
        nodeId: CHILD_NODE_ID,
        name: 'foo',
        value: 'bar',
      },
                               undefined);

      await new Promise<void>(resolve => {
        stylesSidebarPane.addEventListener(Elements.StylesSidebarPane.Events.STYLES_UPDATE_COMPLETED, () => resolve(),
                                           {once: true});
      });

      sections = stylesSidebarPane.allSections();
      const siblingSection = sections.find(s => s.headerText() === 'div[foo="bar"] + div');
      assert.exists(siblingSection);
      assert.strictEqual(siblingSection.style().leadingProperties()[0].name, 'background-color');
      assert.strictEqual(siblingSection.style().leadingProperties()[0].value, 'blue');
    });

    describe('Mouse interaction', () => {
      let stylesSidebarPane: Elements.StylesSidebarPane.StylesSidebarPane;
      let matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles;
      let cssModel: SDK.CSSModel.CSSModel;

      beforeEach(async () => {
        (node.frameId as sinon.SinonStub).returns('frame-id' as Protocol.Page.FrameId);
        (node.nodeType as sinon.SinonStub).returns(Node.ELEMENT_NODE);
        (node.nodeName as sinon.SinonStub).returns('DIV');
        (node.simpleSelector as sinon.SinonStub).returns('#inspected');
        sinon.stub(Components.Linkifier.Linkifier.prototype, 'linkifyCSSLocation')
            .returns(document.createElement('div'));

        const inlineStyle: Protocol.CSS.CSSStyle = {
          styleSheetId: '0' as Protocol.DOM.StyleSheetId,
          cssProperties: [],
          shorthandEntries: [],
          range: {startLine: 0, startColumn: 0, endLine: 0, endColumn: 0},
        };

        const cssText = '\n  color: blue;\n  background-color: red;\n';
        const matchedPayload: Protocol.CSS.RuleMatch[] = [
          ruleMatch('#inspected',
                    [
                      {
                        name: 'color',
                        value: 'blue',
                        range: {startLine: 1, startColumn: 2, endLine: 1, endColumn: 14},
                        text: 'color: blue;',
                      },
                      {
                        name: 'background-color',
                        value: 'red',
                        range: {startLine: 2, startColumn: 2, endLine: 2, endColumn: 24},
                        text: 'background-color: red;',
                      },
                    ],
                    {
                      styleSheetId: '0' as Protocol.DOM.StyleSheetId,
                      range: {startLine: 0, startColumn: 12, endLine: 3, endColumn: 0},
                    }),
        ];
        matchedPayload[0].rule.style.cssText = cssText;

        const computedStyleModel = new ComputedStyle.ComputedStyleModel.ComputedStyleModel();
        computedStyleModel.node = node;

        cssModel = computedStyleModel.cssModel() as SDK.CSSModel.CSSModel;

        matchedStyles = await SDK.CSSMatchedStyles.CSSMatchedStyles.create({
          cssModel,
          node,
          inlinePayload: inlineStyle,
          attributesPayload: null,
          matchedPayload,
          pseudoPayload: [],
          inheritedPayload: [],
          inheritedPseudoPayload: [],
          animationsPayload: [],
          parentLayoutNodeId: undefined as unknown as Protocol.DOM.NodeId,
          positionTryRules: [],
          propertyRules: [],
          functionRules: [],
          cssPropertyRegistrations: [],
          atRules: [],
          activePositionFallbackIndex: -1,
          animationStylesPayload: [],
          inheritedAnimatedPayload: [],
          transitionsStylePayload: null,
        });

        sinon.stub(cssModel, 'getMatchedStyles').resolves(matchedStyles);

        stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
        renderElementIntoDOM(stylesSidebarPane);

        stylesSidebarPane.forceUpdate();

        await new Promise<void>(resolve => {
          stylesSidebarPane.addEventListener(Elements.StylesSidebarPane.Events.INITIAL_UPDATE_COMPLETED,
                                             () => resolve(), {once: true});
        });
      });

      afterEach(() => {
        stylesSidebarPane.detach();
      });

      it('starts editing value on click', () => {
        const mySection = stylesSidebarPane.allSections()[1] as Elements.StylePropertiesSection.StylePropertiesSection;
        assert.exists(mySection);

        const colorTreeElement = mySection.propertiesTreeOutline.rootElement().childAt(0) as
            Elements.StylePropertyTreeElement.StylePropertyTreeElement;
        assert.exists(colorTreeElement);

        const valueElement = colorTreeElement.valueElement;
        assert.exists(valueElement);

        assert.isFalse(stylesSidebarPane.isEditingStyle);

        // Click on the value.
        valueElement.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, button: 0}));
        valueElement.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));

        assert.isTrue(stylesSidebarPane.isEditingStyle);
        assert.isTrue(UI.UIUtils.isBeingEdited(valueElement));
      });

      it('starts editing name on click', () => {
        const mySection = stylesSidebarPane.allSections()[1] as Elements.StylePropertiesSection.StylePropertiesSection;
        assert.exists(mySection);

        const colorTreeElement = mySection.propertiesTreeOutline.rootElement().childAt(0) as
            Elements.StylePropertyTreeElement.StylePropertyTreeElement;
        assert.exists(colorTreeElement);

        const nameElement = colorTreeElement.nameElement;
        assert.exists(nameElement);

        assert.isFalse(stylesSidebarPane.isEditingStyle);

        // Click on the name.
        nameElement.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, button: 0}));
        nameElement.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));

        assert.isTrue(stylesSidebarPane.isEditingStyle);
        assert.isTrue(UI.UIUtils.isBeingEdited(nameElement));
      });

      it('toggles property enabled state on checkbox click', async () => {
        const mySection = stylesSidebarPane.allSections()[1] as Elements.StylePropertiesSection.StylePropertiesSection;
        assert.exists(mySection);

        const colorTreeElement = mySection.propertiesTreeOutline.rootElement().childAt(0) as
            Elements.StylePropertyTreeElement.StylePropertyTreeElement;
        assert.exists(colorTreeElement);

        const checkbox = colorTreeElement.listItemElement.querySelector('.enabled-button') as HTMLInputElement;
        assert.exists(checkbox);
        assert.isTrue(checkbox.checked);

        // Mock CDP calls for disabling.
        connection.setSuccessHandler('CSS.getStyleSheetText',
                                     () => ({text: '#inspected {\n  color: blue;\n  background-color: red;\n}'}));
        connection.setSuccessHandler('CSS.setStyleTexts', () => {
          return {
            styles: [{
              styleSheetId: '0' as Protocol.DOM.StyleSheetId,
              cssProperties: [
                {
                  name: 'color',
                  value: 'blue',
                  disabled: true,
                  range: {startLine: 1, startColumn: 2, endLine: 1, endColumn: 20},
                  text: '/* color: blue; */',
                },
                {
                  name: 'background-color',
                  value: 'red',
                  range: {startLine: 2, startColumn: 2, endLine: 2, endColumn: 24},
                  text: 'background-color: red;',
                },
              ],
              shorthandEntries: [],
              range: {startLine: 0, startColumn: 12, endLine: 3, endColumn: 0},
            }],
          };
        });

        const sendSpy = sinon.spy(connection, 'send');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toggleSpy = sinon.spy(colorTreeElement as any, 'toggleDisabled');

        checkbox.dispatchEvent(new MouseEvent('click', {bubbles: true}));

        // We need to wait for the async toggleDisabled to complete.
        await new Promise<void>(resolve => {
          sinon.stub(colorTreeElement, 'styleTextAppliedForTest').callsFake(() => {
            resolve();
          });
        });

        sinon.assert.calledOnceWithExactly(toggleSpy, true);

        const setStyleTextsCall = sendSpy.getCalls().find(call => call.args[0] === 'CSS.setStyleTexts');
        assert.exists(setStyleTextsCall);
        const args = setStyleTextsCall.args[1] as Protocol.CSS.SetStyleTextsRequest;
        assert.deepEqual(args.edits[0].text, '\n  /* color: blue; */\n  background-color: red;\n');
      });

      it('cancels editing on clicking empty space when editing', async () => {
        const mySection = stylesSidebarPane.allSections()[1] as Elements.StylePropertiesSection.StylePropertiesSection;
        const colorTreeElement = mySection.propertiesTreeOutline.rootElement().childAt(0) as
            Elements.StylePropertyTreeElement.StylePropertyTreeElement;
        const valueElement = colorTreeElement.valueElement;
        assert.exists(valueElement);

        // Start editing.
        valueElement.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, button: 0}));
        valueElement.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
        assert.isTrue(stylesSidebarPane.isEditingStyle);

        const sectionElement = mySection.element;

        // Simulate a click on the empty space.
        sectionElement.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, button: 0}));

        // Manually trigger blur to simulate a focus change.
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        sectionElement.dispatchEvent(new MouseEvent('click', {bubbles: true}));

        assert.isFalse(stylesSidebarPane.isEditingStyle);
        assert.strictEqual(mySection.propertiesTreeOutline.rootElement().childCount(), 2);
      });

      it('creates new property on clicking empty space when not editing', () => {
        const mySection = stylesSidebarPane.allSections()[1] as Elements.StylePropertiesSection.StylePropertiesSection;
        const sectionElement = mySection.element;

        assert.isFalse(stylesSidebarPane.isEditingStyle);
        assert.strictEqual(mySection.propertiesTreeOutline.rootElement().childCount(), 2);

        // Click on the empty space.
        sectionElement.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, button: 0}));
        sectionElement.dispatchEvent(new MouseEvent('click', {bubbles: true}));

        assert.isTrue(stylesSidebarPane.isEditingStyle);
        assert.strictEqual(mySection.propertiesTreeOutline.rootElement().childCount(), 3);

        const newProperty = mySection.propertiesTreeOutline.rootElement().childAt(2) as
            Elements.StylePropertyTreeElement.StylePropertyTreeElement;
        assert.exists(newProperty);
        assert.strictEqual(newProperty.name, '');
        assert.strictEqual(newProperty.value, '');
        assert.isTrue(UI.UIUtils.isBeingEdited(newProperty.nameElement));
      });
    });
  });
});

describeWithEnvironment('StylesSidebarPane Inactive Styles', () => {
  let connection: MockCDPConnection;
  let computedStyleModel: ComputedStyle.ComputedStyleModel.ComputedStyleModel;
  let stylesSidebarPane: Elements.StylesSidebarPane.StylesSidebarPane;
  let cssModel: SDK.CSSModel.CSSModel;
  let node: SDK.DOMModel.DOMNode;

  beforeEach(() => {
    Common.Settings.Settings.instance().moduleSetting('show-inactive-css-rules').set(true);
    connection = new MockCDPConnection();
    const target = createTarget({connection});
    cssModel = target.model(SDK.CSSModel.CSSModel)!;
    computedStyleModel = new ComputedStyle.ComputedStyleModel.ComputedStyleModel();
    stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(computedStyleModel);
    node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    node.id = 1 as Protocol.DOM.NodeId;
    stylesSidebarPane.setNodeForTest(node);
  });

  it('does not preserve inactive rules when setting is disabled', async () => {
    Common.Settings.Settings.instance().moduleSetting('show-inactive-css-rules').set(false);

    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const rangeA = {startLine: 0, startColumn: 0, endLine: 0, endColumn: 10};
    const rangeB = {startLine: 1, startColumn: 0, endLine: 1, endColumn: 10};

    // 1. Initial match: Rule A and Rule B
    const matchedStyles1 = await getMatchedStyles({
      connection,
      cssModel,
      node,
      matchedPayload: [
        {
          rule: {
            selectorList: {selectors: [{text: '.a'}], text: '.a'},
            origin: Protocol.CSS.StyleSheetOrigin.Regular,
            style: {cssProperties: [{name: 'color', value: 'red'}], shorthandEntries: [], range: rangeA},
            styleSheetId,
          },
          matchingSelectors: [0],
        },
        {
          rule: {
            selectorList: {selectors: [{text: '.b'}], text: '.b'},
            origin: Protocol.CSS.StyleSheetOrigin.Regular,
            style: {cssProperties: [{name: 'color', value: 'blue'}], shorthandEntries: [], range: rangeB},
            styleSheetId,
          },
          matchingSelectors: [0],
        },
      ],
    });

    const blocks1 =
        await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles1, new Map(), new Map(), null);
    stylesSidebarPane.sectionBlocks = blocks1;

    assert.lengthOf(blocks1[0].sections, 2);
    const sectionA = blocks1[0].sections[0];
    const sectionB = blocks1[0].sections[1];
    assert.strictEqual(sectionA.headerText(), '.b');
    assert.strictEqual(sectionB.headerText(), '.a');

    // 2. Update: Only Rule A matches. Rule B should NOT be preserved when setting is disabled.
    const matchedStyles2 = await getMatchedStyles({
      connection,
      cssModel,
      node,
      matchedPayload: [
        {
          rule: {
            selectorList: {selectors: [{text: '.a'}], text: '.a'},
            origin: Protocol.CSS.StyleSheetOrigin.Regular,
            style: {cssProperties: [{name: 'color', value: 'red'}], shorthandEntries: [], range: rangeA},
            styleSheetId,
          },
          matchingSelectors: [0],
        },
      ],
    });

    const blocks2 =
        await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles2, new Map(), new Map(), null);

    assert.lengthOf(blocks2[0].sections, 1);
    assert.strictEqual(blocks2[0].sections[0].headerText(), '.a');
    assert.isFalse(blocks2[0].sections[0].element.classList.contains('styles-section-inactive'));
  });

  it('preserves sections as inactive when they no longer match', async () => {
    // Initial match: Rule A and Rule B
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const rangeA = {startLine: 0, startColumn: 0, endLine: 0, endColumn: 10};
    const rangeB = {startLine: 1, startColumn: 0, endLine: 1, endColumn: 10};

    const matchedStyles1 = await getMatchedStyles({
      connection,
      cssModel,
      node,
      matchedPayload: [
        {
          rule: {
            selectorList: {selectors: [{text: '.a'}], text: '.a'},
            origin: Protocol.CSS.StyleSheetOrigin.Regular,
            style: {cssProperties: [{name: 'color', value: 'red'}], shorthandEntries: [], range: rangeA},
            styleSheetId,
          },
          matchingSelectors: [0],
        },
        {
          rule: {
            selectorList: {selectors: [{text: '.b'}], text: '.b'},
            origin: Protocol.CSS.StyleSheetOrigin.Regular,
            style: {cssProperties: [{name: 'color', value: 'blue'}], shorthandEntries: [], range: rangeB},
            styleSheetId,
          },
          matchingSelectors: [0],
        },
      ],
    });

    const blocks1 =
        await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles1, new Map(), new Map(), null);

    // Wire blocks into the pane so it can preserve them in the next update
    stylesSidebarPane.sectionBlocks = blocks1;

    assert.lengthOf(blocks1[0].sections, 2);
    const sectionA = blocks1[0].sections[0];
    const sectionB = blocks1[0].sections[1];
    assert.strictEqual(sectionA.headerText(), '.b');
    assert.strictEqual(sectionB.headerText(), '.a');

    // Update 1: Only Rule A matches. Rule B should become inactive.
    const matchedStyles2 = await getMatchedStyles({
      connection,
      cssModel,
      node,
      matchedPayload: [
        {
          rule: {
            selectorList: {selectors: [{text: '.a'}], text: '.a'},
            origin: Protocol.CSS.StyleSheetOrigin.Regular,
            style: {cssProperties: [{name: 'color', value: 'red'}], shorthandEntries: [], range: rangeA},
            styleSheetId,
          },
          matchingSelectors: [0],
        },
      ],
    });

    const blocks2 =
        await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles2, new Map(), new Map(), null);

    assert.lengthOf(blocks2[0].sections, 2, 'Inactive section should be preserved');
    assert.strictEqual(blocks2[0].sections[0].headerText(), '.b');
    assert.strictEqual(blocks2[0].sections[1].headerText(), '.a');
    assert.isTrue(blocks2[0].sections[0].element.classList.contains('styles-section-inactive'));
    assert.isFalse(blocks2[0].sections[1].element.classList.contains('styles-section-inactive'));

    const statusIconB =
        blocks2[0].sections[0].element.querySelector('devtools-icon.styles-section-status') as HTMLElement;
    const statusIconA =
        blocks2[0].sections[1].element.querySelector('devtools-icon.styles-section-status') as HTMLElement;
    assert.isNotNull(statusIconB);
    assert.isFalse(statusIconB.classList.contains('hidden'));
    assert.strictEqual((statusIconB as Icon).name, 'warning');
    assert.strictEqual(statusIconB.title, 'This rule doesn’t currently match the selected element');
    assert.isTrue(statusIconA.classList.contains('hidden'));
  });

  it('restores inactive sections to active when they match again', async () => {
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const rangeA = {startLine: 0, startColumn: 0, endLine: 0, endColumn: 10};

    // 1. Rule A matches.
    const matchedStyles1 = await getMatchedStyles({
      connection,
      cssModel,
      node,
      matchedPayload: [ruleMatch('.a', {color: 'red'}, {range: rangeA, styleSheetId})],
    });
    const blocks1 =
        await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles1, new Map(), new Map(), null);
    stylesSidebarPane.sectionBlocks = blocks1;

    // 2. Rule A stops matching.
    const matchedStyles2 = await getMatchedStyles({connection, cssModel, node, matchedPayload: []});
    const blocks2 =
        await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles2, new Map(), new Map(), null);
    stylesSidebarPane.sectionBlocks = blocks2;
    assert.isTrue(blocks2[0].sections[0].element.classList.contains('styles-section-inactive'));

    // 3. Rule A matches again.
    const blocks3 =
        await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles1, new Map(), new Map(), null);
    assert.isFalse(blocks3[0].sections[0].element.classList.contains('styles-section-inactive'));
    assert.lengthOf(blocks3[0].sections, 1);
  });

  it('maintains stable relative ordering of inactive rules', async () => {
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const rangeA = {startLine: 0, startColumn: 0, endLine: 0, endColumn: 10};
    const rangeB = {startLine: 1, startColumn: 0, endLine: 1, endColumn: 10};
    const rangeC = {startLine: 2, startColumn: 0, endLine: 2, endColumn: 10};

    const matchA = ruleMatch('.a', {color: 'red'}, {range: rangeA, styleSheetId});
    const matchB = ruleMatch('.b', {color: 'blue'}, {range: rangeB, styleSheetId});
    const matchC = ruleMatch('.c', {color: 'green'}, {range: rangeC, styleSheetId});

    // 1. Initial: A, B, C matches.
    const matchedStylesABC =
        await getMatchedStyles({connection, cssModel, node, matchedPayload: [matchA, matchB, matchC]});
    const blocks1 = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStylesABC, new Map(),
                                                                                       new Map(), null);
    stylesSidebarPane.sectionBlocks = blocks1;

    // 2. Update: A and C match. B becomes inactive.
    const matchedStylesAC = await getMatchedStyles({connection, cssModel, node, matchedPayload: [matchA, matchC]});
    const blocks2 =
        await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStylesAC, new Map(), new Map(), null);
    stylesSidebarPane.sectionBlocks = blocks2;

    assert.strictEqual(blocks2[0].sections[0].headerText(), '.c');
    assert.strictEqual(blocks2[0].sections[1].headerText(), '.b');  // Inactive, but in original relative order
    assert.strictEqual(blocks2[0].sections[2].headerText(), '.a');
    assert.isTrue(blocks2[0].sections[1].element.classList.contains('styles-section-inactive'));

    // 3. Update: Only C matches. A and B inactive.
    const matchedStylesC = await getMatchedStyles({connection, cssModel, node, matchedPayload: [matchC]});
    const blocks3 =
        await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStylesC, new Map(), new Map(), null);
    stylesSidebarPane.sectionBlocks = blocks3;

    assert.strictEqual(blocks3[0].sections[0].headerText(), '.c');
    assert.strictEqual(blocks3[0].sections[1].headerText(), '.b');
    assert.strictEqual(blocks3[0].sections[2].headerText(), '.a');
    assert.isFalse(blocks3[0].sections[0].element.classList.contains('styles-section-inactive'));
    assert.isTrue(blocks3[0].sections[1].element.classList.contains('styles-section-inactive'));
    assert.isTrue(blocks3[0].sections[2].element.classList.contains('styles-section-inactive'));
  });

  it('clears inactive rules on node change', async () => {
    const styleSheetId = '0' as Protocol.DOM.StyleSheetId;
    const rangeA = {startLine: 0, startColumn: 0, endLine: 0, endColumn: 10};

    // 1. Match Rule A.
    const matchedStylesA = await getMatchedStyles({
      connection,
      cssModel,
      node,
      matchedPayload: [ruleMatch('.a', {color: 'red'}, {range: rangeA, styleSheetId})],
    });
    const blocks1 =
        await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStylesA, new Map(), new Map(), null);
    stylesSidebarPane.sectionBlocks = blocks1;

    // 2. Stop matching (Rule A inactive).
    const blocks2 = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
        await getMatchedStyles({connection, cssModel, node}), new Map(), new Map(), null);
    stylesSidebarPane.sectionBlocks = blocks2;
    assert.lengthOf(blocks2[0].sections, 1);
    assert.isTrue(blocks2[0].sections[0].element.classList.contains('styles-section-inactive'));

    // 3. Change node.
    const newNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    newNode.id = 2 as Protocol.DOM.NodeId;
    stylesSidebarPane.setNodeForTest(newNode);

    // 4. Update for new node. Inactive rules from previous node should be gone.
    const blocks3 = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
        await getMatchedStyles({connection, cssModel, node: newNode}), new Map(), new Map(), null);
    assert.lengthOf(blocks3[0].sections, 0);
  });

  it('collapses inactive sections when collapse-non-contributing-css-rules is enabled', async () => {
    Common.Settings.Settings.instance().moduleSetting('collapse-non-contributing-css-rules').set(true);

    const styleSheetIdA = '0' as Protocol.DOM.StyleSheetId;
    const styleSheetIdB = '1' as Protocol.DOM.StyleSheetId;

    // 1. Initial match: Rule A and Rule B with non-conflicting properties
    const matchA = ruleMatch('.a', {color: 'red'}, {styleSheetId: styleSheetIdA});
    const matchB = ruleMatch('.b', {'background-color': 'blue'}, {styleSheetId: styleSheetIdB});
    const matchedStyles1 = await getMatchedStyles({connection, cssModel, node, matchedPayload: [matchA, matchB]});

    const blocks1 =
        await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles1, new Map(), new Map(), null);
    stylesSidebarPane.sectionBlocks = blocks1;

    const sectionB = blocks1[0].sections[0];
    const sectionA = blocks1[0].sections[1];
    assert.strictEqual(sectionB.headerText(), '.b');
    assert.strictEqual(sectionA.headerText(), '.a');
    assert.isFalse(sectionB.isCollapsed(), 'Rule B should not be collapsed initially');
    assert.isFalse(sectionA.isCollapsed(), 'Rule A should not be collapsed initially');

    // 2. Update: Only Rule A matches. Rule B becomes inactive and should collapse.
    const matchedStyles2 = await getMatchedStyles({connection, cssModel, node, matchedPayload: [matchA]});
    const blocks2 =
        await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles2, new Map(), new Map(), null);
    stylesSidebarPane.sectionBlocks = blocks2;

    const sectionB2 = blocks2[0].sections[0];
    const sectionA2 = blocks2[0].sections[1];
    assert.isTrue(sectionB2.isInactive());
    assert.isTrue(sectionB2.isCollapsed(), 'Inactive section should be collapsed when setting is enabled');
    assert.isFalse(sectionA2.isInactive());
    assert.isFalse(sectionA2.isCollapsed());

    // 3. User manually expands section B while it is inactive.
    sectionB2.expand();
    assert.isFalse(sectionB2.isCollapsed(), 'User manually expanded the inactive section');

    // 4. Update: Still only Rule A matches (Rule B remains inactive).
    // The previous collapse state (expanded by user) should be preserved because its inactive state did not change.
    const blocks3 =
        await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles2, new Map(), new Map(), null);
    stylesSidebarPane.sectionBlocks = blocks3;

    const sectionB3 = blocks3[0].sections[0];
    assert.isTrue(sectionB3.isInactive());
    assert.isFalse(sectionB3.isCollapsed(), 'Manual expansion should be preserved when inactive state did not change');

    // 5. Update: Rule B matches again (transitions from inactive back to active).
    // Since inactive changed from true to false, it should update its collapsed state to expanded.
    const blocks4 =
        await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles1, new Map(), new Map(), null);
    stylesSidebarPane.sectionBlocks = blocks4;

    const sectionB4 = blocks4[0].sections[0];
    assert.isFalse(sectionB4.isInactive());
    assert.isFalse(sectionB4.isCollapsed(), 'Section should be uncollapsed when matching again');
  });

  it('does not collapse inactive sections when collapse-non-contributing-css-rules is disabled', async () => {
    Common.Settings.Settings.instance().moduleSetting('collapse-non-contributing-css-rules').set(false);

    const styleSheetIdA = '0' as Protocol.DOM.StyleSheetId;
    const styleSheetIdB = '1' as Protocol.DOM.StyleSheetId;

    // 1. Initial match: Rule A and Rule B
    const matchA = ruleMatch('.a', {color: 'red'}, {styleSheetId: styleSheetIdA});
    const matchB = ruleMatch('.b', {'background-color': 'blue'}, {styleSheetId: styleSheetIdB});
    const matchedStyles1 = await getMatchedStyles({connection, cssModel, node, matchedPayload: [matchA, matchB]});

    const blocks1 =
        await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles1, new Map(), new Map(), null);
    stylesSidebarPane.sectionBlocks = blocks1;

    // 2. Update: Only Rule A matches. Rule B becomes inactive.
    const matchedStyles2 = await getMatchedStyles({connection, cssModel, node, matchedPayload: [matchA]});
    const blocks2 =
        await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles2, new Map(), new Map(), null);

    const sectionB = blocks2[0].sections[0];
    assert.isTrue(sectionB.isInactive());
    assert.isFalse(sectionB.isCollapsed(), 'Inactive section should not be collapsed when setting is disabled');
  });

  it('preserves the relative ordering of section blocks across inactive state transitions', async () => {
    const propertyRule = {
      propertyName: '--my-prop',
      style: {
        cssProperties: [{name: 'syntax', value: '"<color>"'}, {name: 'inherits', value: 'true'}],
        shorthandEntries: [],
      },
    };
    const keyframesRule = {
      animationName: {text: 'my-animation'},
      keyframes: [{
        keyText: {text: '100%'},
        style: {cssProperties: [{name: 'opacity', value: '1'}], shorthandEntries: []},
      }],
    };

    // 1. Initial State: Only @property matches
    const matchedStyles1 = await getMatchedStyles({
      connection,
      cssModel,
      node,
      propertyRules: [propertyRule as unknown as Protocol.CSS.CSSPropertyRule],
    });
    const blocks1 =
        await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles1, new Map(), new Map(), null);
    stylesSidebarPane.sectionBlocks = blocks1;

    assert.lengthOf(blocks1, 2);
    assert.strictEqual(blocks1[1].titleElement()?.textContent, '@property');

    // 2. State 2: Animation starts. @keyframes matches in addition to @property.
    // In CSS cascade order, @keyframes appears before @property.
    const matchedStyles2 = await getMatchedStyles({
      connection,
      cssModel,
      node,
      animationsPayload: [keyframesRule as unknown as Protocol.CSS.CSSKeyframesRule],
      propertyRules: [propertyRule as unknown as Protocol.CSS.CSSPropertyRule],
    });
    const blocks2 =
        await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles2, new Map(), new Map(), null);
    stylesSidebarPane.sectionBlocks = blocks2;

    assert.lengthOf(blocks2, 3);
    assert.strictEqual(blocks2[1].titleElement()?.textContent, '@keyframes my-animation');
    assert.strictEqual(blocks2[2].titleElement()?.textContent, '@property');

    // 3. State 3: Animation stops. @keyframes becomes inactive.
    // The relative ordering of blocks (@keyframes before @property) should be preserved.
    const blocks3 =
        await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles1, new Map(), new Map(), null);
    stylesSidebarPane.sectionBlocks = blocks3;

    assert.lengthOf(blocks3, 3);
    assert.strictEqual(blocks3[1].titleElement()?.textContent, '@keyframes my-animation');
    assert.strictEqual(blocks3[2].titleElement()?.textContent, '@property');
    assert.isTrue(blocks3[1].sections[0].isInactive(), '@keyframes section should be marked inactive');
    assert.isFalse(blocks3[2].sections[0].isInactive(), '@property section should remain active');
  });
});
