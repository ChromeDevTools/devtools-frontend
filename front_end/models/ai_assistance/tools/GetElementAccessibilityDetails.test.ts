// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import type * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import {assertIsError, assertIsResult} from '../../../testing/AiAssistanceHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import * as AiAssistance from '../ai_assistance.js';

describe('GetElementAccessibilityDetailsTool', () => {
  setupLocaleHooks();

  /**
   * Creates a mock context suitable for testing GetElementAccessibilityDetailsTool.
   *
   * By default, it builds a fully populated mock context that succeeds on the happy path.
   * Tests can pass overrides to simulate failure scenarios or different environments.
   *
   * @param overrides Configuration options to customize the mock context behavior.
   * @param overrides.nodeUrl The URL of the target document node. Defaults to 'https://example.com/page.html'.
   * @param overrides.nodeSecurityOrigin Explicit SecurityOrigin to return from the node, or null for detached nodes.
   * @param overrides.establishedOrigin The origin locked in the conversation context. Defaults to 'https://example.com'.
   * @param overrides.hasTarget If false, simulates a missing target (e.g. target closed).
   * @param overrides.hasAxModel If false, simulates missing AccessibilityModel on target.
   * @param overrides.hasAxNode If false, simulates the AccessibilityModel failing to find the AXNode for the node.
   * @param overrides.canResolveDOMNode If false, simulates failing to resolve the deferred DOM node.
   */
  function createMockContext(overrides?: {
    nodeUrl?: string,
    nodeSecurityOrigin?: SDK.SecurityOrigin.SecurityOrigin|null,
    establishedOrigin?: SDK.SecurityOrigin.SecurityOrigin,
    hasTarget?: boolean,
    hasAxModel?: boolean,
    hasAxNode?: boolean,
    canResolveDOMNode?: boolean,
    ignoredReasons?: Protocol.Accessibility.AXProperty[],
  }) {
    const nodeUrl = overrides?.nodeUrl ?? 'https://example.com/page.html';
    const establishedOrigin = overrides && 'establishedOrigin' in overrides ?
        overrides.establishedOrigin :
        SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
    const hasTarget = overrides?.hasTarget ?? true;
    const hasAxModel = overrides?.hasAxModel ?? true;
    const hasAxNode = overrides?.hasAxNode ?? true;
    const canResolveDOMNode = overrides?.canResolveDOMNode ?? true;
    const ignoredReasons = overrides?.ignoredReasons ?? [];

    const mockAxNode = hasAxNode ? {
      role: () => ({value: 'button'}),
      name: () => ({value: 'Click me', sources: [{type: 'attribute' as Protocol.Accessibility.AXValueSourceType}]}),
      ignored: () => false,
      ignoredReasons: () => ignoredReasons,
      properties: () => [{name: 'aria-expanded', value: {value: 'true'}}],
    } :
                                   null;

    const mockAxModel = hasAxModel ? {
      requestAndLoadSubTreeToNode: async () => {},
      axNodeForDOMNode: () => mockAxNode,
    } :
                                     null;

    const mockTarget = hasTarget ? {
      model: (modelClass: unknown) => {
        if (modelClass === SDK.AccessibilityModel.AccessibilityModel) {
          return mockAxModel;
        }
        return null;
      },
    } :
                                   null;

    const mockNode = sinon.createStubInstance(SDK.DOMModel.DOMNode);
    mockNode.backendNodeId.returns(123 as Protocol.DOM.BackendNodeId);
    mockNode.getAttribute.withArgs('tabindex').returns(undefined);
    mockNode.attributes.returns([
      {name: 'aria-label', value: 'Click me', _node: mockNode},
      {name: 'role', value: 'button', _node: mockNode},
    ]);

    const nodeSecurityOrigin = (overrides && 'nodeSecurityOrigin' in overrides) ?
        (overrides.nodeSecurityOrigin ?? null) :
        SDK.SecurityOrigin.SecurityOrigin.create(nodeUrl);
    mockNode.securityOrigin.returns(nodeSecurityOrigin);

    const mockDomModel = sinon.createStubInstance(SDK.DOMModel.DOMModel);
    mockDomModel.target.returns(mockTarget as unknown as SDK.Target.Target);
    mockNode.domModel.returns(mockDomModel);

    const mockSnapshot = sinon.createStubInstance(SDK.DOMModel.DOMNodeSnapshot);
    mockNode.takeSnapshot.resolves(mockSnapshot);

    const resolvedNode = canResolveDOMNode ? mockNode : null;
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(resolvedNode);

    return {
      context: {
        getTarget: () => mockTarget as unknown as SDK.Target.Target,
        getEstablishedOrigin: () => establishedOrigin,
      },
      mockNode,
      mockSnapshot,
    };
  }

  it('successfully returns AX properties and DOM snapshot', async () => {
    const {context, mockSnapshot} = createMockContext();

    const tool = new AiAssistance.GetElementAccessibilityDetails.GetElementAccessibilityDetailsTool();
    const response = await tool.handler({element: 123, explanation: 'Inspect details'}, context);

    assertIsResult(response);
    assert.deepEqual(JSON.parse(response.result), {
      role: 'button',
      name: 'Click me',
      nameSource: 'attribute',
      properties: [{name: 'aria-expanded', value: 'true'}],
      ariaAttributes: {
        'aria-label': 'Click me',
        role: 'button',
      },
      isIgnored: false,
      ignoredReasons: [],
      backendNodeId: 123,
    });
    assert.deepEqual(response.widgets, [{
                       name: 'DOM_TREE',
                       data: {
                         root: mockSnapshot,
                         title: 'Element details' as Platform.UIString.LocalizedString,
                         accessibleRevealLabel: 'Reveal element' as Platform.UIString.LocalizedString,
                       },
                     }]);
  });

  it('correctly maps ignored reasons', async () => {
    const {context} = createMockContext({
      ignoredReasons: [{
        name: 'uninteresting' as Protocol.Accessibility.AXPropertyName,
        value: {type: 'boolean' as Protocol.Accessibility.AXValueType, value: true},
      }],
    });

    const tool = new AiAssistance.GetElementAccessibilityDetails.GetElementAccessibilityDetailsTool();
    const response = await tool.handler({element: 123, explanation: 'Inspect details'}, context);

    assertIsResult(response);
    const parsed = JSON.parse(response.result);
    assert.deepEqual(parsed.ignoredReasons, [{name: 'uninteresting', value: true}]);
  });

  it('returns error when target is missing', async () => {
    const {context} = createMockContext({hasTarget: false});

    const tool = new AiAssistance.GetElementAccessibilityDetails.GetElementAccessibilityDetailsTool();
    const response = await tool.handler({element: 123, explanation: 'Inspect details'}, context);

    assertIsError(response, 'Error: Inspected target not found.');
  });

  it('returns error when origin lock is not established', async () => {
    const {context} = createMockContext({establishedOrigin: undefined});

    const tool = new AiAssistance.GetElementAccessibilityDetails.GetElementAccessibilityDetailsTool();
    const response = await tool.handler({element: 123, explanation: 'Inspect details'}, context);

    assertIsError(response, 'Error: Node does not belong to the current origin.');
  });

  it('returns error when element cannot be resolved', async () => {
    const {context} = createMockContext({canResolveDOMNode: false});

    const tool = new AiAssistance.GetElementAccessibilityDetails.GetElementAccessibilityDetailsTool();
    const response = await tool.handler({element: 123, explanation: 'Inspect details'}, context);

    assertIsError(response, 'Error: Could not resolve element by ID.');
  });

  it('returns error when element belongs to different origin', async () => {
    const {context} = createMockContext({nodeUrl: 'https://different.com/page.html'});

    const tool = new AiAssistance.GetElementAccessibilityDetails.GetElementAccessibilityDetailsTool();
    const response = await tool.handler({element: 123, explanation: 'Inspect details'}, context);

    assertIsError(response, 'Error: Node does not belong to the current origin.');
  });

  it('returns error when AccessibilityModel is not found', async () => {
    const {context} = createMockContext({hasAxModel: false});

    const tool = new AiAssistance.GetElementAccessibilityDetails.GetElementAccessibilityDetailsTool();
    const response = await tool.handler({element: 123, explanation: 'Inspect details'}, context);

    assertIsError(response, 'Error: Accessibility model not found.');
  });

  it('returns error when AX node is not found', async () => {
    const {context} = createMockContext({hasAxNode: false});

    const tool = new AiAssistance.GetElementAccessibilityDetails.GetElementAccessibilityDetailsTool();
    const response = await tool.handler({element: 123, explanation: 'Inspect details'}, context);

    assertIsError(response, 'Error: AX node details not found.');
  });

  it('successfully returns AX details for an element in an iframe under iframe origin lock', async () => {
    const iframeOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://iframe.example.com');
    const {context} = createMockContext({
      nodeUrl: 'https://iframe.example.com/frame.html',
      establishedOrigin: iframeOrigin,
    });

    const tool = new AiAssistance.GetElementAccessibilityDetails.GetElementAccessibilityDetailsTool();
    const response = await tool.handler({element: 123, explanation: 'Inspect details'}, context);

    assertIsResult(response);
    const parsed = JSON.parse(response.result);
    assert.strictEqual(parsed.role, 'button');
    assert.strictEqual(parsed.name, 'Click me');
    assert.strictEqual(parsed.backendNodeId, 123);
  });

  it('returns error if resolved node has no security origin (detached node)', async () => {
    const {context} = createMockContext({nodeSecurityOrigin: null});

    const tool = new AiAssistance.GetElementAccessibilityDetails.GetElementAccessibilityDetailsTool();
    const response = await tool.handler({element: 123, explanation: 'Inspect details'}, context);

    assertIsError(response, 'Error: Node does not belong to the current origin.');
  });
});
