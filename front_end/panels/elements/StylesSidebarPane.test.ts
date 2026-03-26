// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as ComputedStyle from '../../models/computed_style/computed_style.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {
  createTarget,
  describeWithEnvironment,
  updateHostConfig,
} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../testing/MockConnection.js';
import {createStubbedDomNodeWithModels, getMatchedStyles} from '../../testing/StyleHelpers.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html} from '../../ui/lit/lit.js';
import * as PanelsCommon from '../common/common.js';

import * as Elements from './elements.js';

describe('StylesSidebarPane', () => {
  let node: SDK.DOMModel.DOMNode;
  beforeEach(() => {
    ({node} = createStubbedDomNodeWithModels({nodeId: 1}));
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
  });

  describeWithMockConnection('StylesSidebarPane', () => {
    beforeEach(() => {
      const target = createTarget();
      const cssModel = target.model(SDK.CSSModel.CSSModel);
      sinon.stub(ComputedStyle.ComputedStyleModel.ComputedStyleModel.prototype, 'cssModel').returns(cssModel);
      sinon.stub(Host.AidaClient.HostConfigTracker, 'instance').returns({
        addEventListener: () => {},
        removeEventListener: () => {},
        dispose: () => {},
      } as unknown as Host.AidaClient.HostConfigTracker);
    });

    it('unescapes CSS strings', () => {
      assert.strictEqual(
          Elements.StylesSidebarPane.unescapeCssString(
              String.raw`"I\F1 t\EB rn\E2 ti\F4 n\E0 liz\E6 ti\F8 n\2603 \1F308  can be \t\r\ic\k\y"`),
          '"I\xF1t\xEBrn\xE2ti\xF4n\xE0liz\xE6ti\xF8n\u2603\u{1F308} can be tricky"');
      assert.strictEqual(
          Elements.StylesSidebarPane.unescapeCssString(String.raw`"_\DBFF_\\DBFF_\\\DBFF_\\\\DBFF_\\\\\DBFF_"`),
          '"_\uFFFD_\\DBFF_\\\\DBFF_\\\\\\DBFF_\\\\\\\\DBFF_"');
      assert.strictEqual(
          Elements.StylesSidebarPane.unescapeCssString(String.raw`"\0_\DBFF_\DFFF_\110000"`),
          '"\uFFFD_\uFFFD_\uFFFD_\uFFFD"', 'U+0000, lone surrogates, and values above U+10FFFF should become U+FFFD');
      assert.strictEqual(
          Elements.StylesSidebarPane.unescapeCssString(String.raw`"_\D83C\DF08_"`), '"_\uFFFD\uFFFD_"',
          'surrogates should not be combined');
      assert.strictEqual(
          Elements.StylesSidebarPane.unescapeCssString('"_\\41\n_\\41\t_\\41\x20_"'), '"_A_A_A_"',
          'certain trailing whitespace characters should be consumed as part of the escape sequence');
    });

    it('escapes URL as CSS comments', () => {
      assert.strictEqual(Elements.StylesSidebarPane.escapeUrlAsCssComment('https://abc.com/'), 'https://abc.com/');
      assert.strictEqual(Elements.StylesSidebarPane.escapeUrlAsCssComment('https://abc.com/*/'), 'https://abc.com/*/');
      assert.strictEqual(
          Elements.StylesSidebarPane.escapeUrlAsCssComment('https://abc.com/*/?q=*'), 'https://abc.com/*/?q=*');
      assert.strictEqual(
          Elements.StylesSidebarPane.escapeUrlAsCssComment('https://abc.com/*/?q=*/'), 'https://abc.com/*/?q=*%2F');
      assert.strictEqual(
          Elements.StylesSidebarPane.escapeUrlAsCssComment('https://abc.com/*/?q=*/#hash'),
          'https://abc.com/*/?q=*%2F#hash');
    });

    describe('rebuildSectionsForMatchedStyleRulesForTest', () => {
      it('should add @position-try section', async () => {
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const matchedStyles = await getMatchedStyles({
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
    });

    describe('collapsing non-contributing sections', () => {
      it('collapses a section where all properties are overloaded', async () => {
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.id = 1 as Protocol.DOM.NodeId;
        const matchedStyles = await getMatchedStyles({
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
        assert.strictEqual(
            matchedStyles.propertyState(overloadedProperty), SDK.CSSMatchedStyles.PropertyState.OVERLOADED,
            'Expected div{color:blue} to be overloaded by #id{color:red}');

        // The section with all overloaded properties should be collapsed.
        assert.isTrue(
            overloadedSection.element.classList.contains('collapsed'),
            'Section with all overloaded properties should have collapsed class');

        // The section with active properties should NOT be collapsed.
        assert.isFalse(
            activeSection.element.classList.contains('collapsed'),
            'Section with active properties should not be collapsed');
      });

      it('collapses an empty section (no leading properties)', async () => {
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.id = 1 as Protocol.DOM.NodeId;
        const matchedStyles = await getMatchedStyles({
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
        assert.isFalse(
            activeSection.element.classList.contains('collapsed'), 'Non-empty section should not be collapsed');
      });

      it('does NOT collapse a section containing only disabled properties', async () => {
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.id = 1 as Protocol.DOM.NodeId;
        const matchedStyles = await getMatchedStyles({
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
        assert.isFalse(
            disabledSection.element.classList.contains('collapsed'),
            'Section with disabled properties should not be collapsed');
      });

      it('does NOT collapse a section with at least one active property', async () => {
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.id = 1 as Protocol.DOM.NodeId;
        const matchedStyles = await getMatchedStyles({
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

        assert.isFalse(
            mixedSection.element.classList.contains('collapsed'),
            'Section with at least one active property should not be collapsed');
      });

      it('expands a collapsed section when jump-to targets it', async () => {
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.id = 1 as Protocol.DOM.NodeId;
        const matchedStyles = await getMatchedStyles({
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
        assert.strictEqual(
            matchedStyles.propertyState(overloadedProperty), SDK.CSSMatchedStyles.PropertyState.OVERLOADED,
            'Expected div{color:blue} to be overloaded by #id{color:red}');

        // Verify section is initially collapsed.
        assert.isTrue(
            overloadedSection.element.classList.contains('collapsed'), 'Section should be initially collapsed');

        stylesSidebarPane.revealProperty(overloadedProperty);

        // After reveal, the section should be expanded (not collapsed).
        assert.isFalse(
            overloadedSection.element.classList.contains('collapsed'),
            'Section should be expanded after revealProperty');
      });

      it('can be manually expanded and re-collapsed via toggle', async () => {
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.id = 1 as Protocol.DOM.NodeId;
        const matchedStyles = await getMatchedStyles({
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
        assert.isTrue(
            overloadedSection.element.classList.contains('collapsible'), 'Section should have collapsible class');

        // Expand manually.
        overloadedSection.expand();
        assert.isFalse(overloadedSection.isCollapsed(), 'Section should be expanded after expand()');
        assert.isFalse(
            overloadedSection.element.classList.contains('collapsed'),
            'Section should not have collapsed class after expand()');
        // Still marked collapsible so the icon remains visible.
        assert.isTrue(
            overloadedSection.element.classList.contains('collapsible'),
            'Section should retain collapsible class after manual expand');
      });

      it('expands collapsed sections before adding a new blank property', async () => {
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
        node.id = 1 as Protocol.DOM.NodeId;
        const styleSheetId = '0' as Protocol.DOM.StyleSheetId;

        const matchedStyles = await getMatchedStyles({
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
        assert.strictEqual(
            matchedStyles.propertyState(inheritedProperty), SDK.CSSMatchedStyles.PropertyState.OVERLOADED,
            'Expected inherited color to be overloaded by element color');

        // The inherited section's color property is overloaded by the div rule,
        // so it should be collapsed.
        assert.isTrue(
            inheritedSection.element.classList.contains('collapsed'),
            'Inherited section with all overloaded properties should be collapsed');
      });
    });

    it('should add @font-* section to the end', async () => {
      const stylesSidebarPane =
          new Elements.StylesSidebarPane.StylesSidebarPane(new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
      const matchedStyles = await getMatchedStyles({
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
      assert.strictEqual(sectionBlocks[1].titleElement()?.textContent, '@font-*');
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
                                }
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
              }
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
          '--f(--x, --y) { @media (width > 400px) { @container (width > 300px) { @supports (color: red) { result: var(--y); } } } result: var(--x);}');
    });

    describe('Animation styles', () => {
      function mockGetAnimatedComputedStyles(response: Partial<Protocol.CSS.GetAnimatedStylesForNodeResponse>) {
        setMockConnectionResponseHandler('CSS.getAnimatedStylesForNode', () => response);
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

      it('should render transition & animation styles in the styles tab when the animations panel is visible',
         async () => {
           (UI.ViewManager.ViewManager.instance().isViewVisible as sinon.SinonStub).returns(true);
           const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(
               new ComputedStyle.ComputedStyleModel.ComputedStyleModel());
           const matchedStyles = await getMatchedStyles({
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
            assert.include(
                sectionBlocks[0].sections[0].propertiesTreeOutline.contentElement.textContent, 'color: blue;');

            const handledComputedStyleChanged =
                expectCall(sinon.stub(stylesSidebarPane, 'handledComputedStyleChangedForTest'));
            stylesSidebarPane.onComputedStyleChanged();
            await handledComputedStyleChanged;

            assert.include(
                sectionBlocks[0].sections[0].propertiesTreeOutline.contentElement.textContent, 'color: red;');
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
            assert.include(
                sectionBlocks[0].sections[0].propertiesTreeOutline.contentElement.textContent, 'color: blue;');

            const handledComputedStyleChanged =
                expectCall(sinon.stub(stylesSidebarPane, 'handledComputedStyleChangedForTest'));
            stylesSidebarPane.onComputedStyleChanged();
            await handledComputedStyleChanged;

            assert.include(
                sectionBlocks[0].sections[0].propertiesTreeOutline.contentElement.textContent, 'color: red;');
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
                 assert.include(
                     sectionBlocks[1].sections[0].propertiesTreeOutline.contentElement.textContent, 'color: blue;');

                 const handledComputedStyleChanged =
                     expectCall(sinon.stub(stylesSidebarPane, 'handledComputedStyleChangedForTest'));
                 stylesSidebarPane.onComputedStyleChanged();
                 await handledComputedStyleChanged;

                 assert.include(
                     sectionBlocks[1].sections[0].propertiesTreeOutline.contentElement.textContent, 'color: red;');
                 sinon.assert.notCalled(resetUpdateSpy);
               });
          });
        });
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
        }
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
          }
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
        });

        assert.exists(section.activeAiSuggestion);
        assert.deepEqual(section.activeAiSuggestion.properties, [
          {name: 'background-image', value: 'url("https://example.com/image;v=1?query:part=true")'},
          {name: 'content', value: '"This is a semicolon; and this is a colon: inside a string"'},
          {name: '--custom-property', value: 'var(--other, "fallback;value")'},
          {name: 'width', value: 'calc(100% - 20px)'}, {name: 'color', value: 'pink !important'}
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

          cssPropertyPrompt.aiCodeCompletionProvider?.setAiAutoCompletion?.({
            text: 'color: pink;',
            from: 0,
            startTime: 0,
            clearCachedRequest: () => {},
            onImpression: () => {},
          });
          const tabEvent = new KeyboardEvent('keydown', {key: 'Tab'});
          cssPropertyPrompt.onKeyDown(tabEvent);

          sinon.assert.calledOnce(section.commitActiveAiSuggestion);
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
});
