// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as SDK from '../../../core/sdk/sdk.js';
import {assertIsError, assertIsResult} from '../../../testing/AiAssistanceHelpers.js';
import * as AiAssistance from '../ai_assistance.js';

describe('ResolveLighthousePathTool', () => {
  function createMockContext(overrides?: {
    nodeUrl?: string,
    establishedOrigin?: string,
    resolvedNodeId?: number,
    backendNodeId?: number,
    pushNodeResult?: number|null,
    hasTarget?: boolean,
    nodeExists?: boolean,
  }) {
    const nodeUrl = overrides?.nodeUrl ?? 'https://example.com/page.html';
    const establishedOrigin =
        overrides && 'establishedOrigin' in overrides ? overrides.establishedOrigin : 'https://example.com';
    const resolvedNodeId = overrides?.resolvedNodeId ?? 123;
    const backendNodeId = overrides?.backendNodeId ?? 42;
    const pushNodeResult = overrides && 'pushNodeResult' in overrides ? overrides.pushNodeResult : 123;
    const hasTarget = overrides?.hasTarget ?? true;
    const nodeExists = overrides?.nodeExists ?? true;

    const mockNode = nodeExists ? {
      backendNodeId: () => backendNodeId,
      ownerDocument: {documentURL: nodeUrl},
    } :
                                  null;
    const mockDomModel = {
      pushNodeByPathToFrontend: async (path: string) => path === '1,HTML,1,BODY' ? pushNodeResult : null,
      nodeForId: (id: number) => id === resolvedNodeId ? mockNode : null,
    };
    const mockTarget = hasTarget ? {
      model: () => mockDomModel,
    } :
                                   null;
    return {
      conversationContext: null,
      getTarget: () => mockTarget as unknown as SDK.Target.Target,
      getEstablishedOrigin: () => establishedOrigin,
    };
  }

  it('resolves a path to a backend node ID under origin lock', async () => {
    const context = createMockContext();
    const tool = new AiAssistance.ResolveLighthousePath.ResolveLighthousePathTool();
    const result = await tool.handler({path: '1,HTML,1,BODY', explanation: 'resolve'}, context);
    assertIsResult(result);
    assert.strictEqual(result.result.backendNodeId, 42);
  });

  it('returns error when target is not found', async () => {
    const context = createMockContext({hasTarget: false});
    const tool = new AiAssistance.ResolveLighthousePath.ResolveLighthousePathTool();
    const result = await tool.handler({path: '1,HTML,1,BODY', explanation: 'resolve'}, context);
    assertIsError(result);
    assert.strictEqual(result.error, 'Error: Inspected target not found.');
  });

  it('returns error when path cannot be resolved', async () => {
    const context = createMockContext({pushNodeResult: null});
    const tool = new AiAssistance.ResolveLighthousePath.ResolveLighthousePathTool();
    const result = await tool.handler({path: '1,HTML,1,BODY', explanation: 'resolve'}, context);
    assertIsError(result);
    assert.strictEqual(result.error, 'Error: Could not find node by path.');
  });

  it('returns error when origin lock is not established', async () => {
    const context = createMockContext({establishedOrigin: undefined});
    const tool = new AiAssistance.ResolveLighthousePath.ResolveLighthousePathTool();
    const result = await tool.handler({path: '1,HTML,1,BODY', explanation: 'resolve'}, context);
    assertIsError(result);
    assert.strictEqual(result.error, 'Error: Origin lock is not established.');
  });

  it('returns error when node is from different origin', async () => {
    const context = createMockContext({nodeUrl: 'https://different.com/page.html'});
    const tool = new AiAssistance.ResolveLighthousePath.ResolveLighthousePathTool();
    const result = await tool.handler({path: '1,HTML,1,BODY', explanation: 'resolve'}, context);
    assertIsError(result);
    assert.strictEqual(result.error, 'Error: Node does not belong to the locked origin.');
  });

  it('returns error when resolved node is missing from DOMModel', async () => {
    const context = createMockContext({nodeExists: false});
    const tool = new AiAssistance.ResolveLighthousePath.ResolveLighthousePathTool();
    const result = await tool.handler({path: '1,HTML,1,BODY', explanation: 'resolve'}, context);
    assertIsError(result);
    assert.strictEqual(result.error, 'Error: Could not retrieve resolved node.');
  });
});
