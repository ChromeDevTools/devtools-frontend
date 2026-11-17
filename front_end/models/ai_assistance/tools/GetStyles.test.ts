// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import {
  assertIsError,
  assertIsResult,
} from '../../../testing/AiAssistanceHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../../testing/MockCDPConnection.js';
import {
  createStubbedDomNodeWithModels,
  getMatchedStyles,
  ruleMatch,
} from '../../../testing/StyleHelpers.js';
import * as AiAssistance from '../ai_assistance.js';

describe('GetStylesTool', () => {
  setupLocaleHooks();
  let target: sinon.SinonStubbedInstance<SDK.Target.Target>;
  let domModel: sinon.SinonStubbedInstance<SDK.DOMModel.DOMModel>;
  let connection: MockCDPConnection;
  let tool: AiAssistance.GetStyles.GetStylesTool;
  let defaultContext: AiAssistance.Tool.BaseToolCapability&AiAssistance.Tool.TargetCapability&
      AiAssistance.Tool.OriginLockCapability;

  beforeEach(() => {
    connection = new MockCDPConnection();
    target = sinon.createStubInstance(SDK.Target.Target);
    target.model.returns(null);

    domModel = sinon.createStubInstance(SDK.DOMModel.DOMModel);
    domModel.target.returns(target);

    tool = new AiAssistance.GetStyles.GetStylesTool();
    defaultContext = {
      getTarget: () => target,
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };
  });

  async function stubResolvedNodeStyles(
      computed: Record<string, string>,
      matchedPayload: Protocol.CSS.RuleMatch[],
      ): Promise<SDK.CSSMatchedStyles.CSSMatchedStyles> {
    const {node, cssModel} = createStubbedDomNodeWithModels({nodeId: 42});
    node.securityOrigin.callsFake(() => SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'));
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(node);
    cssModel.getComputedStyle.resolves(new Map(Object.entries(computed)));
    const matchedStyles = await getMatchedStyles({cssModel, node, matchedPayload, connection});
    cssModel.getMatchedStyles.resolves(matchedStyles);
    return matchedStyles;
  }

  it('successfully returns computed and authored styles', async () => {
    const {node: resolvedNode, cssModel} = createStubbedDomNodeWithModels({nodeId: 42});

    resolvedNode.ownerDocument = {
      documentURL: 'https://example.com',
    } as unknown as SDK.DOMModel.DOMDocument;

    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(resolvedNode);

    const computedStyleMap = new Map([['color', 'red']]);
    (cssModel.getComputedStyle as sinon.SinonStub).resolves(computedStyleMap);

    const matchedPayload = [ruleMatch('div', {color: 'red'})];
    const matchedStyles = await getMatchedStyles({cssModel, node: resolvedNode, matchedPayload, connection});
    (cssModel.getMatchedStyles as sinon.SinonStub).resolves(matchedStyles);

    const tool = new AiAssistance.GetStyles.GetStylesTool();
    const context = {
      getTarget: () => target,
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };

    const response = await tool.handler(
        {
          explanation: 'Get element styles',
          elements: [42],
          styleProperties: ['color'],
        },
        context);

    assertIsResult(response);
    assert.strictEqual(
        response.result,
        JSON.stringify(
            {
              42: {
                computed: {color: 'red'},
                authored: {color: 'red'},
              },
            },
            null, 2));
  });

  it('returns error when target is missing', async () => {
    const tool = new AiAssistance.GetStyles.GetStylesTool();
    const context = {
      getTarget: () => null,
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({status: 'UNINITIALIZED'}),
    };

    const response = await tool.handler(
        {
          explanation: 'Get element styles',
          elements: [42],
          styleProperties: ['color'],
        },
        context);

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: Could not find the inspected page.');
  });

  it('returns error on origin mismatch', async () => {
    const {node: resolvedNode} = createStubbedDomNodeWithModels({nodeId: 42});

    resolvedNode.ownerDocument = {
      documentURL: 'https://another.com',
    } as unknown as SDK.DOMModel.DOMDocument;

    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(resolvedNode);

    const tool = new AiAssistance.GetStyles.GetStylesTool();
    const context = {
      getTarget: () => target,
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };

    const response = await tool.handler({
      explanation: 'Get element styles',
      elements: [42],
      styleProperties: ['color'],
    },
                                        context);

    assertIsError(response, 'Error: Node does not belong to the current origin.');
  });

  it('successfully returns styles for an element in a cross-origin iframe under iframe origin lock', async () => {
    const {node: resolvedNode, cssModel} = createStubbedDomNodeWithModels({nodeId: 42});

    resolvedNode.ownerDocument = {
      documentURL: 'https://iframe.example.com',
    } as unknown as SDK.DOMModel.DOMDocument;

    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(resolvedNode);

    const computedStyleMap = new Map([['color', 'blue']]);
    (cssModel.getComputedStyle as sinon.SinonStub).resolves(computedStyleMap);

    const matchedPayload = [ruleMatch('button', {color: 'blue'})];
    const matchedStyles = await getMatchedStyles({cssModel, node: resolvedNode, matchedPayload, connection});
    (cssModel.getMatchedStyles as sinon.SinonStub).resolves(matchedStyles);

    const tool = new AiAssistance.GetStyles.GetStylesTool();
    const context = {
      getTarget: () => target,
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://iframe.example.com'),
      }),
    };

    const response = await tool.handler({
      explanation: 'Get element styles',
      elements: [42],
      styleProperties: ['color'],
    },
                                        context);

    assertIsResult(response);
    assert.strictEqual(response.result,
                       JSON.stringify({
                         42: {
                           computed: {color: 'blue'},
                           authored: {color: 'blue'},
                         },
                       },
                                      null, 2));
  });

  it('returns error if resolved node has no security origin (detached node)', async () => {
    const detachedNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    detachedNode.securityOrigin.returns(null);
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(detachedNode);

    const tool = new AiAssistance.GetStyles.GetStylesTool();
    const context = {
      getTarget: () => target,
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };

    const response = await tool.handler(
        {
          explanation: 'Get element styles',
          elements: [42],
          styleProperties: ['color'],
        },
        context);

    assertIsError(response, 'Error: Node does not belong to the current origin.');
  });

  it('returns error when origin lock is not established', async () => {
    const {node: resolvedNode} = createStubbedDomNodeWithModels({nodeId: 42});
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(resolvedNode);

    const tool = new AiAssistance.GetStyles.GetStylesTool();
    const context = {
      getTarget: () => target,
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({status: 'UNINITIALIZED'}),
    };

    const response = await tool.handler({
      explanation: 'Get element styles',
      elements: [42],
      styleProperties: ['color'],
    },
                                        context);

    assertIsError(response, 'Error: Node does not belong to the current origin.');
  });

  it('returns error when navigation occurred during run', async () => {
    const {node: resolvedNode} = createStubbedDomNodeWithModels({nodeId: 42});
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(resolvedNode);

    const tool = new AiAssistance.GetStyles.GetStylesTool();
    const context = {
      getTarget: () => target,
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({status: 'BLOCKED_BY_NAVIGATION'}),
    };

    const response = await tool.handler({
      explanation: 'Get element styles',
      elements: [42],
      styleProperties: ['color'],
    },
                                        context);

    assertIsError(response, 'Error: Node does not belong to the current origin.');
  });

  it('rejects generic "all" and "*" values in styleProperties', async () => {
    const resolveStub = sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise');

    const allResponse = await tool.handler({
      explanation: 'Get all styles',
      elements: [42],
      styleProperties: [' ALL '],
    },
                                           defaultContext);
    assertIsError(allResponse,
                  'Error: Generic values like "all" or "*" are not supported. Provide specific CSS property names.');

    const wildcardResponse = await tool.handler({
      explanation: 'Get wildcard styles',
      elements: [42],
      styleProperties: ['color', ' * '],
    },
                                                defaultContext);
    assertIsError(wildcardResponse,
                  'Error: Generic values like "all" or "*" are not supported. Provide specific CSS property names.');

    sinon.assert.notCalled(resolveStub);
  });

  it('expands shorthand properties into computed longhands and active authored rules', async () => {
    const baseRule = ruleMatch('div',
                               [
                                 {
                                   name: 'margin',
                                   value: '4px 8px',
                                   text: 'margin: 4px 8px;',
                                   range: {startLine: 0, startColumn: 2, endLine: 0, endColumn: 18},
                                   longhandProperties: [
                                     {name: 'margin-top', value: '4px'},
                                     {name: 'margin-right', value: '8px'},
                                     {name: 'margin-bottom', value: '4px'},
                                     {name: 'margin-left', value: '8px'},
                                   ],
                                 },
                                 {
                                   name: 'color',
                                   value: 'red',
                                   text: 'color: red;',
                                   range: {startLine: 0, startColumn: 19, endLine: 0, endColumn: 30},
                                 },
                               ],
                               {
                                 range: {startLine: 0, startColumn: 0, endLine: 0, endColumn: 31},
                               });
    baseRule.rule.style.cssText = '  margin: 4px 8px; color: red; ';
    const overrideRule = ruleMatch('.card', {
      'margin-left': '16px',
      '--ThemeGap': '12px',
    });

    await stubResolvedNodeStyles({
      'margin-top': '4px',
      'margin-right': '8px',
      'margin-bottom': '4px',
      'margin-left': '16px',
      '--ThemeGap': '12px',
      color: 'red',
    },
                                 [baseRule, overrideRule]);

    const response = await tool.handler({
      explanation: 'Get spacing styles',
      elements: [42],
      styleProperties: [' Margin ', '   ', '--ThemeGap'],
    },
                                        defaultContext);

    assertIsResult(response);
    assert.deepEqual(JSON.parse(response.result), {
      42: {
        computed: {
          'margin-top': '4px',
          'margin-right': '8px',
          'margin-bottom': '4px',
          'margin-left': '16px',
          '--ThemeGap': '12px',
        },
        authored: {
          margin: '4px 8px',
          'margin-top': '4px',
          'margin-right': '8px',
          'margin-bottom': '4px',
          'margin-left': '16px',
          '--ThemeGap': '12px',
        },
      },
    });

    assert.lengthOf(response.widgets ?? [], 1);
    const widget = response.widgets?.[0];
    if (widget?.name !== 'COMPUTED_STYLES') {
      assert.fail('Expected COMPUTED_STYLES widget.');
    }
    assert.deepEqual(widget.data.properties, [
      'margin',
      'margin-top',
      'margin-right',
      'margin-bottom',
      'margin-left',
      '--ThemeGap',
    ]);
  });

  it('includes parent var() shorthands in authored and omits empty implicit longhands', async () => {
    const varRule = ruleMatch('div',
                              [
                                {
                                  name: 'padding',
                                  value: 'var(--space)',
                                  text: 'padding: var(--space);',
                                  range: {startLine: 0, startColumn: 2, endLine: 0, endColumn: 24},
                                },
                                {
                                  name: 'border-bottom',
                                  value: 'var(--line)',
                                  text: 'border-bottom: var(--line);',
                                  range: {startLine: 0, startColumn: 25, endLine: 0, endColumn: 52},
                                },
                                {
                                  name: 'margin',
                                  value: 'var(--unused)',
                                  text: 'margin: var(--unused);',
                                  range: {startLine: 0, startColumn: 53, endLine: 0, endColumn: 75},
                                },
                              ],
                              {
                                range: {startLine: 0, startColumn: 0, endLine: 0, endColumn: 76},
                              });
    varRule.rule.style.cssText = '  padding: var(--space); border-bottom: var(--line); margin: var(--unused); ';

    const matchedStyles = await stubResolvedNodeStyles({
      'padding-left': '12px',
      'border-bottom-width': '1px',
      'border-bottom-style': 'solid',
      'border-bottom-color': 'rgb(0, 0, 0)',
    },
                                                       [varRule]);
    assert.isTrue(
        matchedStyles.nodeStyles()[0].allProperties().some(p => p.name === 'padding-left' && p.implicit && !p.value));

    const response = await tool.handler({
      explanation: 'Get var shorthand styles',
      elements: [42],
      styleProperties: ['padding-left', 'border'],
    },
                                        defaultContext);

    assertIsResult(response);
    assert.deepEqual(JSON.parse(response.result), {
      42: {
        computed: {
          'padding-left': '12px',
          'border-bottom-width': '1px',
          'border-bottom-style': 'solid',
          'border-bottom-color': 'rgb(0, 0, 0)',
        },
        authored: {
          padding: 'var(--space)',
          'border-bottom': 'var(--line)',
        },
      },
    });
  });
});
