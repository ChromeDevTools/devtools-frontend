// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {
  assertIsError,
  assertIsResult,
} from '../../../testing/AiAssistanceHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

function createMockFrame(origin: string, outermostTarget: SDK.Target.Target):
    sinon.SinonStubbedInstance<SDK.ResourceTreeModel.ResourceTreeFrame> {
  const resourceTreeModel = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeModel);
  const target = sinon.createStubInstance(SDK.Target.Target);
  target.outermostTarget.returns(outermostTarget);
  resourceTreeModel.target.returns(target);

  const mockFrame = sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeFrame);
  sinon.stub(mockFrame, 'securityOrigin').get(() => origin);
  mockFrame.resourceTreeModel.returns(resourceTreeModel);

  return mockFrame;
}

describe('ListPageOriginsTool', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);
  });

  it('lists active frame origins successfully when allowed', async () => {
    const targetManager = universe.targetManager;
    const primaryTarget = sinon.createStubInstance(SDK.Target.Target);
    primaryTarget.inspectedURL.returns(urlString`http://example.com/index.html`);
    primaryTarget.outermostTarget.returns(primaryTarget);

    sinon.stub(targetManager, 'primaryPageTarget').returns(primaryTarget);

    const mockFrame1 = createMockFrame('http://example.com', primaryTarget);
    const mockFrame2 = createMockFrame('http://sub.example.com', primaryTarget);
    const mockFrame3 = createMockFrame('http://example.com', primaryTarget);

    sinon.stub(SDK.ResourceTreeModel.ResourceTreeModel, 'frames').returns([
      mockFrame1,
      mockFrame2,
      mockFrame3,
    ]);

    const tool = new AiAssistance.ListPageOrigins.ListPageOriginsTool();
    const context = {
      conversationContext: null,
      getEstablishedOrigin: sinon.stub().returns('http://example.com'),
    };

    const response = await tool.handler({}, context);
    assertIsResult(response);
    assert.deepEqual(response.result, {
      origins: ['http://example.com', 'http://sub.example.com'],
    });
  });

  it('filters out frames from other outermost targets/tabs', async () => {
    const targetManager = universe.targetManager;
    const primaryTarget = sinon.createStubInstance(SDK.Target.Target);
    primaryTarget.inspectedURL.returns(urlString`http://example.com/index.html`);
    primaryTarget.outermostTarget.returns(primaryTarget);

    const blockedTarget = sinon.createStubInstance(SDK.Target.Target);
    blockedTarget.inspectedURL.returns(urlString`http://blocked-origin.com/index.html`);
    blockedTarget.outermostTarget.returns(blockedTarget);

    sinon.stub(targetManager, 'primaryPageTarget').returns(primaryTarget);

    const mockFrame1 = createMockFrame('http://example.com', primaryTarget);
    const mockFrame2 = createMockFrame('http://blocked-origin.com', blockedTarget);

    sinon.stub(SDK.ResourceTreeModel.ResourceTreeModel, 'frames').returns([
      mockFrame1,
      mockFrame2,
    ]);

    const tool = new AiAssistance.ListPageOrigins.ListPageOriginsTool();
    const context = {
      conversationContext: null,
      getEstablishedOrigin: sinon.stub().returns('http://example.com'),
    };

    const response = await tool.handler({}, context);
    assertIsResult(response);
    assert.deepEqual(response.result, {
      origins: ['http://example.com'],
    });
  });

  it('filters out opaque origins', async () => {
    const targetManager = universe.targetManager;
    const primaryTarget = sinon.createStubInstance(SDK.Target.Target);
    primaryTarget.inspectedURL.returns(urlString`http://example.com/index.html`);
    primaryTarget.outermostTarget.returns(primaryTarget);

    sinon.stub(targetManager, 'primaryPageTarget').returns(primaryTarget);

    const mockFrame1 = createMockFrame('http://example.com', primaryTarget);
    const mockFrame2 = createMockFrame('data:', primaryTarget);
    const mockFrame3 = createMockFrame('null', primaryTarget);

    sinon.stub(SDK.ResourceTreeModel.ResourceTreeModel, 'frames').returns([
      mockFrame1,
      mockFrame2,
      mockFrame3,
    ]);

    const tool = new AiAssistance.ListPageOrigins.ListPageOriginsTool();
    const context = {
      conversationContext: null,
      getEstablishedOrigin: sinon.stub().returns('http://example.com'),
    };

    const response = await tool.handler({}, context);
    assertIsResult(response);
    assert.deepEqual(response.result, {
      origins: ['http://example.com'],
    });
  });

  it('allows primary target origin when conversationContext is null (empty selection)', async () => {
    const targetManager = universe.targetManager;
    const primaryTarget = sinon.createStubInstance(SDK.Target.Target);
    primaryTarget.inspectedURL.returns(urlString`http://example.com/index.html`);
    primaryTarget.outermostTarget.returns(primaryTarget);

    sinon.stub(targetManager, 'primaryPageTarget').returns(primaryTarget);

    const mockFrame1 = createMockFrame('http://example.com', primaryTarget);

    sinon.stub(SDK.ResourceTreeModel.ResourceTreeModel, 'frames').returns([
      mockFrame1,
    ]);

    const tool = new AiAssistance.ListPageOrigins.ListPageOriginsTool();
    const context = {
      conversationContext: null,
      getEstablishedOrigin: sinon.stub().returns('http://example.com'),
    };

    const response = await tool.handler({}, context);
    assertIsResult(response);
    assert.deepEqual(response.result, {
      origins: ['http://example.com'],
    });
  });

  it('returns error if primary page target origin is different from the allowed origin', async () => {
    const targetManager = universe.targetManager;
    const primaryTarget = sinon.createStubInstance(SDK.Target.Target);
    primaryTarget.inspectedURL.returns(urlString`http://blocked-origin.com/index.html`);

    sinon.stub(targetManager, 'primaryPageTarget').returns(primaryTarget);

    const tool = new AiAssistance.ListPageOrigins.ListPageOriginsTool();
    const context = {
      conversationContext: null,
      getEstablishedOrigin: sinon.stub().returns('http://example.com'),
    };

    const response = await tool.handler({}, context);
    assertIsError(response);
    assert.strictEqual(response.error, 'No origin available or not allowed.');
  });
});
