// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {
  createTarget,
  describeWithEnvironment,
  describeWithLocale,
  updateHostConfig,
} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../testing/MockConnection.js';
import {getMatchedStyles} from '../../testing/StyleHelpers.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

describe('StylesSidebarPane', () => {
  let node: SDK.DOMModel.DOMNode;
  beforeEach(() => {
    node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    node.id = 1 as Protocol.DOM.NodeId;
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
  });

  describeWithMockConnection('StylesSidebarPane', () => {
    beforeEach(() => {
      const target = createTarget();
      const cssModel = target.model(SDK.CSSModel.CSSModel);
      sinon.stub(Elements.ComputedStyleModel.ComputedStyleModel.prototype, 'cssModel').returns(cssModel);
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
            new Elements.StylesSidebarPane.StylesSidebarPane(new Elements.ComputedStyleModel.ComputedStyleModel());
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

        const sectionBlocks =
            await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles, new Map(), new Map());

        assert.lengthOf(sectionBlocks, 2);
        assert.strictEqual(sectionBlocks[1].titleElement()?.textContent, '@position-try --try-one');
        assert.lengthOf(sectionBlocks[1].sections, 1);
        assert.instanceOf(sectionBlocks[1].sections[0], Elements.StylePropertiesSection.PositionTryRuleSection);
      });
    });

    it('should add @font-palette-values section to the end', async () => {
      const stylesSidebarPane =
          new Elements.StylesSidebarPane.StylesSidebarPane(new Elements.ComputedStyleModel.ComputedStyleModel());
      const matchedStyles = await getMatchedStyles({
        cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
        node: sinon.createStubInstance(SDK.DOMModel.DOMNode),
        fontPaletteValuesRule: {
          fontPaletteName: {text: '--palette'},
          origin: Protocol.CSS.StyleSheetOrigin.Regular,
          style: {
            cssProperties: [{name: 'font-family', value: 'Bixa'}, {name: 'override-colors', value: '0 red'}],
            shorthandEntries: [],

          },
        },
      });

      const sectionBlocks =
          await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles, new Map(), new Map());

      assert.lengthOf(sectionBlocks, 2);
      assert.strictEqual(sectionBlocks[1].titleElement()?.textContent, '@font-palette-values --palette');
      assert.lengthOf(sectionBlocks[1].sections, 1);
      assert.instanceOf(sectionBlocks[1].sections[0], Elements.StylePropertiesSection.FontPaletteValuesRuleSection);
    });

    it('should add @function section to the end', async () => {
      const stylesSidebarPane =
          new Elements.StylesSidebarPane.StylesSidebarPane(new Elements.ComputedStyleModel.ComputedStyleModel());
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
          await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles, new Map(), new Map());

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
        sinon.stub(Common.Linkifier.Linkifier, 'linkify').returns(Promise.resolve(document.createTextNode('link')));
        updateHostConfig({
          devToolsAnimationStylesInStylesTab: {
            enabled: true,
          },
        });
      });

      it('should render transition & animation styles in the styles tab', async () => {
        const stylesSidebarPane =
            new Elements.StylesSidebarPane.StylesSidebarPane(new Elements.ComputedStyleModel.ComputedStyleModel());
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

        const sectionBlocks =
            await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles, new Map(), new Map());
        assert.lengthOf(sectionBlocks[0].sections, 3);
        assert.strictEqual(sectionBlocks[0].sections[0].headerText(), 'transitions style');
        assert.strictEqual(sectionBlocks[0].sections[1].headerText(), '--animation-name animation');
        assert.strictEqual(sectionBlocks[0].sections[2].headerText(), 'animation style');
      });

      describe('should auto update animated style sections when onComputedStyleChanged called', () => {
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
            const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
            node.id = 1 as Protocol.DOM.NodeId;

            const stylesSidebarPane =
                new Elements.StylesSidebarPane.StylesSidebarPane(new Elements.ComputedStyleModel.ComputedStyleModel());
            const resetUpdateSpy = sinon.spy(stylesSidebarPane, 'scheduleResetUpdateIfNotEditingCalledForTest');
            const matchedStyles = await getMatchedStyles({
              cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
              node,
              transitionsStylePayload: null,
            });
            stylesSidebarPane.setMatchedStylesForTest(matchedStyles);
            const sectionBlocks =
                await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles, new Map(), new Map());
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
            const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
            node.id = 1 as Protocol.DOM.NodeId;

            const stylesSidebarPane =
                new Elements.StylesSidebarPane.StylesSidebarPane(new Elements.ComputedStyleModel.ComputedStyleModel());
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
            const sectionBlocks =
                await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles, new Map(), new Map());
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
            const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
            node.id = 1 as Protocol.DOM.NodeId;

            const stylesSidebarPane =
                new Elements.StylesSidebarPane.StylesSidebarPane(new Elements.ComputedStyleModel.ComputedStyleModel());
            const resetUpdateSpy = sinon.spy(stylesSidebarPane, 'scheduleResetUpdateIfNotEditingCalledForTest');
            const matchedStyles = await getMatchedStyles({
              cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
              node,
              animationStylesPayload: [],
            });
            stylesSidebarPane.setMatchedStylesForTest(matchedStyles);
            const sectionBlocks =
                await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles, new Map(), new Map());
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
            const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
            node.id = 1 as Protocol.DOM.NodeId;

            const stylesSidebarPane =
                new Elements.StylesSidebarPane.StylesSidebarPane(new Elements.ComputedStyleModel.ComputedStyleModel());
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
            const sectionBlocks =
                await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles, new Map(), new Map());
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
            const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
            node.id = 1 as Protocol.DOM.NodeId;

            const stylesSidebarPane =
                new Elements.StylesSidebarPane.StylesSidebarPane(new Elements.ComputedStyleModel.ComputedStyleModel());
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
            const sectionBlocks =
                await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(matchedStyles, new Map(), new Map());
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
                 const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
                 node.id = 1 as Protocol.DOM.NodeId;
                 node.parentNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);

                 const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(
                     new Elements.ComputedStyleModel.ComputedStyleModel());
                 const resetUpdateSpy = sinon.spy(stylesSidebarPane, 'scheduleResetUpdateIfNotEditingCalledForTest');
                 const matchedStyles = await getMatchedStyles({
                   cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
                   node,
                 });
                 stylesSidebarPane.setMatchedStylesForTest(matchedStyles);
                 const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
                     matchedStyles, new Map(), new Map());
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
                 const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
                 node.id = 1 as Protocol.DOM.NodeId;
                 node.parentNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);

                 const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(
                     new Elements.ComputedStyleModel.ComputedStyleModel());
                 const resetUpdateSpy = sinon.spy(stylesSidebarPane, 'scheduleResetUpdateIfNotEditingCalledForTest');
                 const matchedStyles = await getMatchedStyles({
                   cssModel: stylesSidebarPane.cssModel() as SDK.CSSModel.CSSModel,
                   node,
                 });
                 stylesSidebarPane.setMatchedStylesForTest(matchedStyles);
                 const sectionBlocks = await stylesSidebarPane.rebuildSectionsForMatchedStyleRulesForTest(
                     matchedStyles, new Map(), new Map());
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
                 const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
                 node.id = 1 as Protocol.DOM.NodeId;
                 node.parentNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);

                 const stylesSidebarPane = new Elements.StylesSidebarPane.StylesSidebarPane(
                     new Elements.ComputedStyleModel.ComputedStyleModel());
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
                     matchedStyles, new Map(), new Map());
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
      // Override the default timeout with a very short one
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

  describeWithLocale('CSSPropertyPrompt', () => {
    const CSSPropertyPrompt = Elements.StylesSidebarPane.CSSPropertyPrompt;

    const CSS_VARIABLES_FOR_TEST: Record<string, string> = {
      '--rgb-color': 'rgb(0 0 0)',
      '--wide-gamut-color': 'lch(0 0 0)',
    };

    const mockTreeItem = {
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
    } as unknown as Elements.StylePropertyTreeElement.StylePropertyTreeElement;

    const noop = () => {};

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
    });
  });
});
