// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createResource, getMainFrame} from '../../testing/ResourceTreeHelpers.js';
import {createCSSStyle, getMatchedStyles, ruleMatch} from '../../testing/StyleHelpers.js';
import * as Bindings from '../bindings/bindings.js';
import * as Workspace from '../workspace/workspace.js';

import * as ExtensionScope from './ExtensionScope.js';
import * as Injected from './injected.js';

const {urlString} = Platform.DevToolsPath;

function createNode(options?: {getAttribute?: (attribute: string) => string | undefined}) {
  const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
  node.id = 1 as Protocol.DOM.NodeId;
  // Needed to process the inline styles
  node.nodeType.returns(Node.ELEMENT_NODE);
  node.localName.returns('div');
  node.simpleSelector.callThrough();
  if (options?.getAttribute) {
    node.getAttribute.callsFake(options.getAttribute);
  }
  return node;
}

async function getSelector(
    payload: Partial<SDK.CSSMatchedStyles.CSSMatchedStylesPayload>,
    node?: SDK.DOMModel.DOMNode,
) {
  if (!node) {
    node = createNode();
  }

  const matchedStyles = await getMatchedStyles({
    node,
    ...payload,
  });

  const styleRule = ExtensionScope.ExtensionScope.getStyleRuleFromMatchesStyles(matchedStyles);

  if (!styleRule) {
    return '';
  }

  return ExtensionScope.ExtensionScope.getSelectorsFromStyleRule(styleRule, matchedStyles);
}

describe('ExtensionScope', () => {
  const MOCK_STYLE = [
    {
      name: 'color',
      value: 'red',
    },
  ];

  describe('getSimpleSelector', () => {
    it('should work with node that has classes', () => {
      const node = createNode({
        getAttribute: attribute => {
          if (attribute === 'class') {
            return 'my-class-a my-class-b';
          }

          return undefined;
        }
      });
      const selector = ExtensionScope.ExtensionScope.getSelectorForNode(node);
      assert.strictEqual(selector, '.my-class-a.my-class-b');
    });

    it('should exclude ai generated class', () => {
      const node = createNode({
        getAttribute: attribute => {
          if (attribute === 'class') {
            return `my-class-a my-class-b ${Injected.AI_ASSISTANCE_CSS_CLASS_NAME}-2`;
          }

          return undefined;
        }
      });
      const selector = ExtensionScope.ExtensionScope.getSelectorForNode(node);
      assert.strictEqual(selector, '.my-class-a.my-class-b');
    });

    it('should work with node has classes that need escaping', () => {
      const node = createNode({
        getAttribute: attribute => {
          if (attribute === 'class') {
            return `my.special-class my-class-b ${Injected.AI_ASSISTANCE_CSS_CLASS_NAME}-2`;
          }

          return undefined;
        }
      });
      const selector = ExtensionScope.ExtensionScope.getSelectorForNode(node);
      assert.strictEqual(selector, '.my\\.special-class.my-class-b');
    });

    it('should work with only ai generated class', () => {
      const node = createNode({
        getAttribute: attribute => {
          if (attribute === 'class') {
            return `${Injected.AI_ASSISTANCE_CSS_CLASS_NAME}-2`;
          }

          return undefined;
        }
      });
      const selector = ExtensionScope.ExtensionScope.getSelectorForNode(node);
      assert.strictEqual(selector, 'div');
    });
  });

  describe('getSelectorFromRules', () => {
    it('should work with empty styles', async () => {
      const selector = await getSelector({});
      assert.strictEqual(selector, '');
    });

    it('should omit inline selectors', async () => {
      const inlinePayload = createCSSStyle(MOCK_STYLE);
      const selector = await getSelector({
        inlinePayload,
      });
      assert.strictEqual(selector, '');
    });

    it('should work with id selector', async () => {
      const matchedPayload = [
        ruleMatch('#test', MOCK_STYLE),
      ];
      const selector = await getSelector({matchedPayload});
      assert.strictEqual(selector, '#test');
    });

    it('should work with class selector', async () => {
      const matchedPayload = [
        ruleMatch('.test', MOCK_STYLE),
      ];
      const selector = await getSelector({matchedPayload});
      assert.strictEqual(selector, '.test');
    });

    it('should work with tag selector', async () => {
      const matchedPayload = [
        ruleMatch('div', MOCK_STYLE),
      ];
      const selector = await getSelector({matchedPayload});
      assert.strictEqual(selector, 'div');
    });

    it('should prefer id selectors', async () => {
      const matchedPayload = [
        ruleMatch(
            {
              selectors: [
                {
                  text: '#my-id',
                  specificity: {a: 1, b: 0, c: 0},
                },
                {
                  text: '.my-class',
                  specificity: {a: 0, b: 1, c: 0},
                },
                {
                  text: 'div',
                  specificity: {a: 0, b: 0, c: 1},
                },
              ],
              text: '#my-id, .my-class, div'
            },
            MOCK_STYLE,
            ),
      ];
      const selector = await getSelector({matchedPayload});
      assert.strictEqual(selector, '#my-id');
    });

    it('should prefer class selectors over tags', async () => {
      const matchedPayload = [
        ruleMatch(
            {
              selectors: [
                {
                  text: '.my-class',
                  specificity: {a: 0, b: 1, c: 0},
                },
                {
                  text: 'div',
                  specificity: {a: 0, b: 0, c: 1},
                },
              ],
              text: '.my-class, div'
            },
            MOCK_STYLE,
            ),
      ];
      const selector = await getSelector({matchedPayload});
      assert.strictEqual(selector, '.my-class');
    });

    it('should pick first rule from the cascade', async () => {
      // Order is reversed we know that specificity order will
      // be returned correctly
      // front_end/core/sdk/CSSMatchedStyles.ts:373
      const matchedPayload = [
        ruleMatch('.test', MOCK_STYLE),
        ruleMatch('.test-2', MOCK_STYLE),
      ];
      const selector = await getSelector({matchedPayload});
      assert.strictEqual(selector, '.test-2');
    });

    it('should work with complex selector', async () => {
      const matchedPayload = [
        ruleMatch('div.container > .header', MOCK_STYLE),
      ];
      const selector = await getSelector({matchedPayload});
      assert.strictEqual(selector, 'div.container > .header');
    });

    it('should skip selector with ai assistance prefix', async () => {
      // Order is reversed we know that specificity order will
      // be returned correctly
      // front_end/core/sdk/CSSMatchedStyles.ts:373
      const matchedPayload = [
        ruleMatch('.test', MOCK_STYLE),
        ruleMatch(`.${Injected.AI_ASSISTANCE_CSS_CLASS_NAME}-1`, MOCK_STYLE),
      ];
      const selector = await getSelector({matchedPayload});
      assert.strictEqual(selector, '.test');
    });
    it('should skip selector with ai assistance prefix in complex selector', async () => {
      // Order is reversed we know that specificity order will
      // be returned correctly
      // front_end/core/sdk/CSSMatchedStyles.ts:373
      const matchedPayload = [
        ruleMatch(
            {
              selectors: [{text: `.${Injected.AI_ASSISTANCE_CSS_CLASS_NAME}-1`}, {text: '.test'}],
              text: `.${Injected.AI_ASSISTANCE_CSS_CLASS_NAME}-1, .test`
            },
            MOCK_STYLE),
      ];
      const selector = await getSelector({matchedPayload});
      assert.strictEqual(selector, '.test');
    });

    it('should skip nested selector with ai assistance prefix', async () => {
      // Order is reversed we know that specificity order will
      // be returned correctly
      // front_end/core/sdk/CSSMatchedStyles.ts:373
      const matchedPayload = [
        ruleMatch('.test', MOCK_STYLE),
        ruleMatch(

            {
              selectors: [{text: 'div&'}],
              text: 'div&',
            },
            MOCK_STYLE,
            {
              nestingSelectors: [`.${Injected.AI_ASSISTANCE_CSS_CLASS_NAME}-1`],
            },
            ),
      ];
      const selector = await getSelector({matchedPayload});
      assert.strictEqual(selector, '.test');
    });

    it('should work with nested selector and strip the &', async () => {
      // Order is reversed we know that specificity order will
      // be returned correctly
      // front_end/core/sdk/CSSMatchedStyles.ts:373
      const matchedPayload = [
        ruleMatch('.test', MOCK_STYLE),
        ruleMatch(
            {
              selectors: [{text: 'div&'}],
              text: 'div&',
            },
            MOCK_STYLE,
            {
              nestingSelectors: ['.my-parent-selector'],
            },
            )
      ];
      const selector = await getSelector({matchedPayload});
      assert.strictEqual(selector, 'div');
    });

    it('should ignore * selectors', async () => {
      const matchedPayload = [
        ruleMatch('*', MOCK_STYLE),
      ];
      const selector = await getSelector({matchedPayload});
      assert.strictEqual(selector, '');
    });

    it('should ignore selectors ending with * ', async () => {
      const matchedPayload = [
        ruleMatch(
            {
              selectors: [{
                text: 'div > *',
                specificity: {
                  a: 0,
                  b: 0,
                  c: 1,
                }
              }],
              text: 'div > *',

            },
            MOCK_STYLE,
            ),
      ];
      const selector = await getSelector({matchedPayload});
      assert.strictEqual(selector, '');
    });

    it('should not ignore selectors with intermediate * and class', async () => {
      const matchedPayload = [
        ruleMatch(
            {
              selectors: [{
                text: '.main > * > .header',
                specificity: {
                  a: 0,
                  b: 2,
                  c: 0,
                }
              }],
              text: '.main > * > .header',

            },
            MOCK_STYLE,
            ),
      ];
      const selector = await getSelector({matchedPayload});
      assert.strictEqual(selector, '.main > * > .header');
    });
    it('should not ignore selectors with intermediate * and id', async () => {
      const matchedPayload = [ruleMatch(
          {
            selectors: [{
              text: '.main > * > #header',
              specificity: {
                a: 1,
                b: 1,
                c: 0,
              }
            }],
            text: '.main > * > #header',

          },
          MOCK_STYLE,
          )];
      const selector = await getSelector({matchedPayload});
      assert.strictEqual(selector, '.main > * > #header');
    });
  });

  describeWithMockConnection('getSourceLocation', () => {
    async function setupMockedStyleRules() {
      const target = createTarget();

      const targetManager = target.targetManager();
      targetManager.setScopeTarget(target);
      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
      const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
      Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance({forceNew: true, resourceMapping, targetManager});
      const sourceURL = urlString`http://localhost/something/style.css`;
      createResource(getMainFrame(target), sourceURL, 'text/html', '');
      const uiSourceCode = workspace.uiSourceCodeForURL(sourceURL) as Workspace.UISourceCode.UISourceCode;
      assert.isNotNull(uiSourceCode);
      const cssModel = target.model(SDK.CSSModel.CSSModel)!;
      const cssStyleSheetHeader = new SDK.CSSStyleSheetHeader.CSSStyleSheetHeader(cssModel, {
        styleSheetId: 'test' as Protocol.CSS.StyleSheetId,
        frameId: 'test' as Protocol.Page.FrameId,
        sourceURL,
        origin: Protocol.CSS.StyleSheetOrigin.Regular,
        title: 'style.css',
        disabled: false,
        isInline: false,
        isMutable: false,
        isConstructed: false,
        startLine: 0,
        startColumn: 0,
        length: 10,
        endLine: 1,
        endColumn: 8,
      });
      sinon.stub(cssModel, 'styleSheetHeaderForId').returns(cssStyleSheetHeader);
      const node = createNode();
      const matchedPayload = [
        ruleMatch(
            {
              text: '.test',
              selectors: [{
                text: '.test',
                range: {
                  startLine: 0,
                  startColumn: 0,
                  endLine: 0,
                  endColumn: 10,
                }
              }]
            },
            MOCK_STYLE, {
              styleSheetId: cssStyleSheetHeader.id,
            }),
        ruleMatch(

            {
              selectors: [{text: 'div&'}],
              text: 'div&',
            },
            MOCK_STYLE,
            {
              nestingSelectors: [`.${Injected.AI_ASSISTANCE_CSS_CLASS_NAME}-1`],
            },
            ),
      ];

      const matchedStyles = await getMatchedStyles({
        node,
        matchedPayload,
        cssModel,
      });

      return ExtensionScope.ExtensionScope.getStyleRuleFromMatchesStyles(matchedStyles)!;
    }

    it('should compute a source location', async () => {
      const styleRule = await setupMockedStyleRules();
      assert.strictEqual(ExtensionScope.ExtensionScope.getSourceLocation(styleRule), 'style.css:1:1');
    });
  });
});
