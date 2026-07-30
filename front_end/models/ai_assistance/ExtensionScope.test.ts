// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {createCSSStyle, getMatchedStyles, ruleMatch} from '../../testing/StyleHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

import * as AiAssistance from './ai_assistance.js';

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

  const connection = new MockCDPConnection();
  const matchedStyles = await getMatchedStyles({
    node,
    connection,
    ...payload,
  });

  const styleRule = AiAssistance.ExtensionScope.ExtensionScope.getStyleRuleFromMatchesStyles(matchedStyles);

  if (!styleRule) {
    return '';
  }

  return AiAssistance.ExtensionScope.ExtensionScope.getSelectorsFromStyleRule(styleRule, matchedStyles);
}

describe('ExtensionScope', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();
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
        },
      });
      const selector = AiAssistance.ExtensionScope.ExtensionScope.getSelectorForNode(node);
      assert.strictEqual(selector, '.my-class-a.my-class-b');
    });

    it('should exclude ai generated class', () => {
      const node = createNode({
        getAttribute: attribute => {
          if (attribute === 'class') {
            return `my-class-a my-class-b ${AiAssistance.Injected.AI_ASSISTANCE_CSS_CLASS_NAME}-2`;
          }

          return undefined;
        },
      });
      const selector = AiAssistance.ExtensionScope.ExtensionScope.getSelectorForNode(node);
      assert.strictEqual(selector, '.my-class-a.my-class-b');
    });

    it('should work with node has classes that need escaping', () => {
      const node = createNode({
        getAttribute: attribute => {
          if (attribute === 'class') {
            return `my.special-class my-class-b ${AiAssistance.Injected.AI_ASSISTANCE_CSS_CLASS_NAME}-2`;
          }

          return undefined;
        },
      });
      const selector = AiAssistance.ExtensionScope.ExtensionScope.getSelectorForNode(node);
      assert.strictEqual(selector, '.my\\.special-class.my-class-b');
    });

    it('should work with only ai generated class', () => {
      const node = createNode({
        getAttribute: attribute => {
          if (attribute === 'class') {
            return `${AiAssistance.Injected.AI_ASSISTANCE_CSS_CLASS_NAME}-2`;
          }

          return undefined;
        },
      });
      const selector = AiAssistance.ExtensionScope.ExtensionScope.getSelectorForNode(node);
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
              text: '#my-id, .my-class, div',
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
              text: '.my-class, div',
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
        ruleMatch(`.${AiAssistance.Injected.AI_ASSISTANCE_CSS_CLASS_NAME}-1`, MOCK_STYLE),
      ];
      const selector = await getSelector({matchedPayload});
      assert.strictEqual(selector, '.test');
    });
    it('should skip selector with ai assistance prefix in complex selector', async () => {
      // Order is reversed we know that specificity order will
      // be returned correctly
      // front_end/core/sdk/CSSMatchedStyles.ts:373
      const matchedPayload = [
        ruleMatch({
          selectors: [{text: `.${AiAssistance.Injected.AI_ASSISTANCE_CSS_CLASS_NAME}-1`}, {text: '.test'}],
          text: `.${AiAssistance.Injected.AI_ASSISTANCE_CSS_CLASS_NAME}-1, .test`,
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
              nestingSelectors: [`.${AiAssistance.Injected.AI_ASSISTANCE_CSS_CLASS_NAME}-1`],
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
            ),
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
                },
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
                },
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
              },
            }],
            text: '.main > * > #header',

          },
          MOCK_STYLE,
          )];
      const selector = await getSelector({matchedPayload});
      assert.strictEqual(selector, '.main > * > #header');
    });
  });

  describe('install', () => {
    it('creates an isolated world with CSP', async () => {
      const universe = new TestUniverse();
      const target = universe.createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      assert.exists(domModel);
      const node = new SDK.DOMModel.DOMNode(domModel);
      node.id = 1 as Protocol.DOM.NodeId;
      sinon.stub(node, 'frameId').returns('main-frame-id' as Protocol.Page.FrameId);

      const pageAgent = target.pageAgent();
      const createIsolatedWorldStub = sinon.stub(pageAgent, 'invoke_createIsolatedWorld').resolves({
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
        getError: () => undefined,
      });

      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assert.exists(runtimeModel);
      const mockContext = sinon.createStubInstance(SDK.RuntimeModel.ExecutionContext);
      mockContext.id = 1 as Protocol.Runtime.ExecutionContextId;
      const mockRemoteObject = sinon.createStubInstance(SDK.RemoteObject.RemoteObject);
      mockContext.evaluate.resolves({object: mockRemoteObject});
      sinon.stub(runtimeModel, 'executionContext').returns(mockContext);

      const changeManager = new AiAssistance.ChangeManager.ChangeManager();
      const scope = new AiAssistance.ExtensionScope.ExtensionScope(changeManager, 'agent-id', node);

      await scope.install();

      sinon.assert.calledOnce(createIsolatedWorldStub);
      assert.strictEqual(createIsolatedWorldStub.firstCall.args[0].contentSecurityPolicy,
                         AiAssistance.Injected.FREESTYLER_WORLD_CSP);
    });
  });
});
