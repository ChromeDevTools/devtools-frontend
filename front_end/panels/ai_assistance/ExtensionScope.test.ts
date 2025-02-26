// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createCSSStyle, getMatchedStyles, ruleMatch} from '../../testing/StyleHelpers.js';

import * as ExtensionScope from './ExtensionScope.js';
import * as Injected from './injected.js';

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

  return ExtensionScope.ExtensionScope.getSelectorForRule(matchedStyles);
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

    it('should return nested selector with ai assistance prefix', async () => {
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
      assert.strictEqual(selector, 'div');
    });
  });
});
