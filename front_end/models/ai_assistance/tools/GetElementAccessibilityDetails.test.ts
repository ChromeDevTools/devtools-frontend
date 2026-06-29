// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import {assertIsError, assertIsResult} from '../../../testing/AiAssistanceHelpers.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describe('GetElementAccessibilityDetailsTool', () => {
  /**
   * Creates a mock context suitable for testing GetElementAccessibilityDetailsTool.
   *
   * By default, it builds a fully populated mock context that succeeds on the happy path.
   * Tests can pass overrides to simulate failure scenarios or different environments.
   *
   * @param overrides Configuration options to customize the mock context behavior.
   * @param overrides.nodeUrl The URL of the target document node. Defaults to 'https://example.com/page.html'.
   * @param overrides.establishedOrigin The origin locked in the conversation context. Defaults to 'https://example.com'.
   * @param overrides.hasTarget If false, simulates a missing target (e.g. target closed).
   * @param overrides.hasAxModel If false, simulates missing AccessibilityModel on target.
   * @param overrides.hasAxNode If false, simulates the AccessibilityModel failing to find the AXNode for the node.
   * @param overrides.canResolveDOMNode If false, simulates failing to resolve the deferred DOM node.
   */
  function createMockContext(overrides?: {
    nodeUrl?: string,
    establishedOrigin?: string,
    hasTarget?: boolean,
    hasAxModel?: boolean,
    hasAxNode?: boolean,
    canResolveDOMNode?: boolean,
  }) {
    const nodeUrl = overrides?.nodeUrl ?? 'https://example.com/page.html';
    const establishedOrigin =
        overrides && 'establishedOrigin' in overrides ? overrides.establishedOrigin : 'https://example.com';
    const hasTarget = overrides?.hasTarget ?? true;
    const hasAxModel = overrides?.hasAxModel ?? true;
    const hasAxNode = overrides?.hasAxNode ?? true;
    const canResolveDOMNode = overrides?.canResolveDOMNode ?? true;

    const mockAxNode = hasAxNode ? {
      role: () => ({value: 'button'}),
      name: () => ({value: 'Click me'}),
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

    const mockDocument = sinon.createStubInstance(SDK.DOMModel.DOMDocument);
    mockDocument.documentURL = urlString`${nodeUrl}`;
    mockNode.ownerDocument = mockDocument;

    const mockSnapshot = sinon.createStubInstance(SDK.DOMModel.DOMNodeSnapshot);
    mockNode.takeSnapshot.resolves(mockSnapshot);

    const resolvedNode = canResolveDOMNode ? mockNode : null;
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(resolvedNode);

    return {
      context: {
        conversationContext: null,
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
      properties: [{name: 'aria-expanded', value: 'true'}],
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

  it('returns error when target is missing', async () => {
    const {context} = createMockContext({hasTarget: false});

    const tool = new AiAssistance.GetElementAccessibilityDetails.GetElementAccessibilityDetailsTool();
    const response = await tool.handler({element: 123, explanation: 'Inspect details'}, context);

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: Inspected target not found.');
  });

  it('returns error when origin lock is not established', async () => {
    const {context} = createMockContext({establishedOrigin: undefined});

    const tool = new AiAssistance.GetElementAccessibilityDetails.GetElementAccessibilityDetailsTool();
    const response = await tool.handler({element: 123, explanation: 'Inspect details'}, context);

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: Origin lock is not established.');
  });

  it('returns error when element cannot be resolved', async () => {
    const {context} = createMockContext({canResolveDOMNode: false});

    const tool = new AiAssistance.GetElementAccessibilityDetails.GetElementAccessibilityDetailsTool();
    const response = await tool.handler({element: 123, explanation: 'Inspect details'}, context);

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: Could not resolve element by ID.');
  });

  it('returns error when element belongs to different origin', async () => {
    const {context} = createMockContext({nodeUrl: 'https://different.com/page.html'});

    const tool = new AiAssistance.GetElementAccessibilityDetails.GetElementAccessibilityDetailsTool();
    const response = await tool.handler({element: 123, explanation: 'Inspect details'}, context);

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: Node does not belong to the locked origin.');
  });

  it('returns error when AccessibilityModel is not found', async () => {
    const {context} = createMockContext({hasAxModel: false});

    const tool = new AiAssistance.GetElementAccessibilityDetails.GetElementAccessibilityDetailsTool();
    const response = await tool.handler({element: 123, explanation: 'Inspect details'}, context);

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: Accessibility model not found.');
  });

  it('returns error when AX node is not found', async () => {
    const {context} = createMockContext({hasAxNode: false});

    const tool = new AiAssistance.GetElementAccessibilityDetails.GetElementAccessibilityDetailsTool();
    const response = await tool.handler({element: 123, explanation: 'Inspect details'}, context);

    assertIsError(response);
    assert.strictEqual(response.error, 'Error: AX node details not found.');
  });
});
