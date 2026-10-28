// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {assertIsError, assertIsResult} from '../../../testing/AiAssistanceHelpers.js';
import * as AiAssistance from '../ai_assistance.js';

describe('ResolveDevtoolsNodePathTool', () => {
  function createMockContext(overrides?: {
    nodeUrl?: string,
    nodeSecurityOrigin?: SDK.SecurityOrigin.SecurityOrigin|null,
    originLock?: AiAssistance.Tool.OriginLockState,
    resolvedNodeId?: number,
    backendNodeId?: number,
    pushNodeResult?: number|null,
    hasTarget?: boolean,
    nodeExists?: boolean,
    hasDomModel?: boolean,
    snapshot?: SDK.DOMModel.DOMNode,
  }) {
    const nodeUrl = overrides?.nodeUrl ?? 'https://example.com/page.html';
    const originLock: AiAssistance.Tool.OriginLockState = overrides?.originLock ??
        {status: 'ESTABLISHED_ORIGIN', origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com')};
    const resolvedNodeId = overrides?.resolvedNodeId ?? 123;
    const backendNodeId = overrides?.backendNodeId ?? 42;
    const pushNodeResult = overrides && 'pushNodeResult' in overrides ? overrides.pushNodeResult : 123;
    const hasTarget = overrides?.hasTarget ?? true;
    const nodeExists = overrides?.nodeExists ?? true;
    const hasDomModel = overrides?.hasDomModel ?? true;
    const snapshot = overrides?.snapshot ?? {} as unknown as SDK.DOMModel.DOMNode;

    const nodeSecurityOrigin = (overrides && 'nodeSecurityOrigin' in overrides) ?
        (overrides.nodeSecurityOrigin ?? null) :
        SDK.SecurityOrigin.SecurityOrigin.create(nodeUrl);

    const mockNode = nodeExists ? {
      backendNodeId: () => backendNodeId,
      securityOrigin: () => nodeSecurityOrigin,
      takeSnapshot: async () => snapshot,
    } :
                                  null;
    const mockDomModel = hasDomModel ? {
      pushNodeByPathToFrontend: async (path: string) => path === '1,HTML,1,BODY' ? pushNodeResult : null,
      nodeForId: (id: number) => id === resolvedNodeId ? mockNode : null,
    } :
                                       null;
    const mockTarget = hasTarget ? {
      model: () => mockDomModel,
    } :
                                   null;
    return {
      getTarget: () => mockTarget as unknown as SDK.Target.Target,
      getOriginLock: () => originLock,
    };
  }

  it('resolves a path to a backend node ID under origin lock', async () => {
    const context = createMockContext();
    const tool = new AiAssistance.ResolveDevtoolsNodePath.ResolveDevtoolsNodePathTool();
    const result = await tool.handler({path: '1,HTML,1,BODY', explanation: 'resolve'}, context);
    assertIsResult(result);
    assert.strictEqual(result.result.backendNodeId, 42);
  });

  it('returns a DOM_TREE widget for the resolved node', async () => {
    const snapshot = {id: 'snapshot-sentinel'} as unknown as SDK.DOMModel.DOMNode;
    const context = createMockContext({snapshot});
    const tool = new AiAssistance.ResolveDevtoolsNodePath.ResolveDevtoolsNodePathTool();
    const result = await tool.handler({path: '1,HTML,1,BODY', explanation: 'resolve'}, context);
    assertIsResult(result);
    assert.deepEqual(result.widgets, [{
                       name: 'DOM_TREE',
                       data: {
                         root: snapshot,
                         title: i18n.i18n.lockedString('Element details'),
                         accessibleRevealLabel: i18n.i18n.lockedString('Reveal element'),
                       },
                     }]);
  });

  it('returns error when target is not found', async () => {
    const context = createMockContext({hasTarget: false});
    const tool = new AiAssistance.ResolveDevtoolsNodePath.ResolveDevtoolsNodePathTool();
    const result = await tool.handler({path: '1,HTML,1,BODY', explanation: 'resolve'}, context);
    assertIsError(result, 'Error: Inspected target not found.');
  });

  it('returns error when DOM model is not found', async () => {
    const context = createMockContext({hasDomModel: false});
    const tool = new AiAssistance.ResolveDevtoolsNodePath.ResolveDevtoolsNodePathTool();
    const result = await tool.handler({path: '1,HTML,1,BODY', explanation: 'resolve'}, context);
    assertIsError(result, 'Error: Inspected target not found.');
  });

  it('returns error when path cannot be resolved', async () => {
    const context = createMockContext({pushNodeResult: null});
    const tool = new AiAssistance.ResolveDevtoolsNodePath.ResolveDevtoolsNodePathTool();
    const result = await tool.handler({path: '1,HTML,1,BODY', explanation: 'resolve'}, context);
    assertIsError(result, 'Error: Could not find node by path.');
  });

  it('returns error when origin lock is not established', async () => {
    const context = createMockContext({originLock: {status: 'UNINITIALIZED'}});
    const tool = new AiAssistance.ResolveDevtoolsNodePath.ResolveDevtoolsNodePathTool();
    const result = await tool.handler({path: '1,HTML,1,BODY', explanation: 'resolve'}, context);
    assertIsError(result, 'Error: Node does not belong to the current origin.');
  });

  it('returns error when cross-origin navigation occurred during run', async () => {
    const context = createMockContext({originLock: {status: 'BLOCKED_BY_NAVIGATION'}});
    const tool = new AiAssistance.ResolveDevtoolsNodePath.ResolveDevtoolsNodePathTool();
    const result = await tool.handler({path: '1,HTML,1,BODY', explanation: 'resolve'}, context);
    assertIsError(result, 'Error: Node does not belong to the current origin.');
  });

  it('returns error when node is from different origin', async () => {
    const context = createMockContext({nodeUrl: 'https://different.com/page.html'});
    const tool = new AiAssistance.ResolveDevtoolsNodePath.ResolveDevtoolsNodePathTool();
    const result = await tool.handler({path: '1,HTML,1,BODY', explanation: 'resolve'}, context);
    assertIsError(result, 'Error: Node does not belong to the current origin.');
  });

  it('returns error when resolved node is missing from DOMModel', async () => {
    const context = createMockContext({nodeExists: false});
    const tool = new AiAssistance.ResolveDevtoolsNodePath.ResolveDevtoolsNodePathTool();
    const result = await tool.handler({path: '1,HTML,1,BODY', explanation: 'resolve'}, context);
    assertIsError(result, 'Error: Could not retrieve resolved node.');
  });

  it('resolves a path for an element in an iframe under iframe origin lock', async () => {
    const iframeOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://iframe.example.com');
    const context = createMockContext({
      nodeUrl: 'https://iframe.example.com/frame.html',
      originLock: {status: 'ESTABLISHED_ORIGIN', origin: iframeOrigin},
    });
    const tool = new AiAssistance.ResolveDevtoolsNodePath.ResolveDevtoolsNodePathTool();
    const result = await tool.handler({path: '1,HTML,1,BODY', explanation: 'resolve'}, context);
    assertIsResult(result);
    assert.strictEqual(result.result.backendNodeId, 42);
  });

  it('returns error if resolved node has no security origin (detached node)', async () => {
    const context = createMockContext({nodeSecurityOrigin: null});
    const tool = new AiAssistance.ResolveDevtoolsNodePath.ResolveDevtoolsNodePathTool();
    const result = await tool.handler({path: '1,HTML,1,BODY', explanation: 'resolve'}, context);
    assertIsError(result, 'Error: Node does not belong to the current origin.');
  });

  describe('displayInfoFromArgs', () => {
    it('includes the element selector in the step title when provided', () => {
      const tool = new AiAssistance.ResolveDevtoolsNodePath.ResolveDevtoolsNodePathTool();
      const displayInfo = tool.displayInfoFromArgs({
        path: '1,HTML,1,BODY,2,BUTTON',
        selector: 'button.submit',
        explanation: 'Resolve failing button',
      });
      assert.deepEqual(displayInfo, {
        title: 'Resolving element (button.submit)',
        thought: 'Resolve failing button',
        action: 'resolveDevtoolsNodePath(\'1,HTML,1,BODY,2,BUTTON\')',
      });
    });

    it('strips a leading "body >" prefix from the selector', () => {
      const tool = new AiAssistance.ResolveDevtoolsNodePath.ResolveDevtoolsNodePathTool();
      assert.strictEqual(
          tool.displayInfoFromArgs({
                path: '1,HTML,1,BODY,0,MAIN,2,DIV,0,BUTTON',
                selector: 'body > main > div.modal-header > button#close-modal',
                explanation: 'Resolve failing button',
              })
              .title,
          'Resolving element (main > div.modal-header > button#close-modal)',
      );
      assert.strictEqual(
          tool.displayInfoFromArgs({
                path: '1,HTML,1,BODY',
                selector: 'body',
                explanation: 'Resolve body',
              })
              .title,
          'Resolving element (body)',
      );
    });

    it('falls back to default title when selector is omitted or empty', () => {
      const tool = new AiAssistance.ResolveDevtoolsNodePath.ResolveDevtoolsNodePathTool();
      assert.strictEqual(
          tool.displayInfoFromArgs({path: '1,HTML,1,BODY', explanation: 'resolve'}).title,
          'Resolving element path',
      );
      assert.strictEqual(
          tool.displayInfoFromArgs({path: '1,HTML,1,BODY', selector: '   ', explanation: 'resolve'}).title,
          'Resolving element path',
      );
    });
  });
});
