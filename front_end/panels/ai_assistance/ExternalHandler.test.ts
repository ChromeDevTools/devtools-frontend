// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as AiAssistancePanel from './ai_assistance.js';

describe('ExternalHandler', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let getItemStub: sinon.SinonStub;
  let setItemStub: sinon.SinonStub;
  let removeItemStub: sinon.SinonStub;

  beforeEach(() => {
    getItemStub = sinon.stub(localStorage, 'getItem');
    setItemStub = sinon.stub(localStorage, 'setItem');
    removeItemStub = sinon.stub(localStorage, 'removeItem');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('exposes handleExternalAIRequest globally on window', () => {
    assert.isFunction(window.handleExternalAIRequest);
    assert.strictEqual(window.handleExternalAIRequest, AiAssistancePanel.ExternalHandler.handleExternalAIRequest);
  });

  it('enables structured logging and resets existing logs', async () => {
    sinon.stub(AiAssistanceModel.AiConversation.AiConversation.prototype, 'run').callsFake(async function*() {
      yield {type: AiAssistanceModel.AiAgent.ResponseType.QUERYING};
    });

    const result = await AiAssistancePanel.ExternalHandler.handleExternalAIRequest({
      prompts: ['test prompt'],
    });

    sinon.assert.calledWith(setItemStub, 'aiAssistanceStructuredLogEnabled', 'true');
    sinon.assert.calledWith(removeItemStub, 'aiAssistanceStructuredLog');
    assert.deepEqual(result, []);
  });

  it('returns parsed structured logs from localStorage when available', async () => {
    const mockLogs = [
      {
        request: {client: 'test'},
        aidaResponse: {explanation: 'test explanation'},
      },
    ];

    getItemStub.withArgs('aiAssistanceStructuredLog').returns(JSON.stringify(mockLogs));

    sinon.stub(AiAssistanceModel.AiConversation.AiConversation.prototype, 'run').callsFake(async function*() {
      yield {type: AiAssistanceModel.AiAgent.ResponseType.QUERYING};
    });

    const result = await AiAssistancePanel.ExternalHandler.handleExternalAIRequest({
      prompts: ['test prompt'],
    });

    assert.deepEqual(result, mockLogs);
  });

  it('resolves NETWORK_REQUEST context when contextIdentifier matches request name', async () => {
    const mockRequest = sinon.createStubInstance(SDK.NetworkRequest.NetworkRequest);
    mockRequest.name.returns('blabla.png');
    mockRequest.url.returns(Platform.DevToolsPath.urlString`https://example.com/blabla.png`);
    UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, mockRequest);

    const setContextSpy = sinon.spy(AiAssistanceModel.AiConversation.AiConversation.prototype, 'setContext');
    sinon.stub(AiAssistanceModel.AiConversation.AiConversation.prototype, 'run').callsFake(async function*() {
      yield {type: AiAssistanceModel.AiAgent.ResponseType.QUERYING};
    });

    await AiAssistancePanel.ExternalHandler.handleExternalAIRequest({
      context: {type: 'NETWORK_REQUEST', contextIdentifier: 'blabla.png'},
      prompts: ['why is this request failing'],
    });

    sinon.assert.calledOnce(setContextSpy);
    const passedContext = setContextSpy.firstCall.args[0];
    assert.isNotNull(passedContext);
    assert.strictEqual(passedContext?.getItem(), mockRequest);
  });

  it('does not resolve NETWORK_REQUEST context if contextIdentifier does not match', async () => {
    const mockRequest = sinon.createStubInstance(SDK.NetworkRequest.NetworkRequest);
    mockRequest.name.returns('other.png');
    mockRequest.url.returns(Platform.DevToolsPath.urlString`https://example.com/other.png`);
    UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, mockRequest);

    const setContextSpy = sinon.spy(AiAssistanceModel.AiConversation.AiConversation.prototype, 'setContext');
    sinon.stub(AiAssistanceModel.AiConversation.AiConversation.prototype, 'run').callsFake(async function*() {
      yield {type: AiAssistanceModel.AiAgent.ResponseType.QUERYING};
    });

    await AiAssistancePanel.ExternalHandler.handleExternalAIRequest({
      context: {type: 'NETWORK_REQUEST', contextIdentifier: 'blabla.png'},
      prompts: ['why is this request failing'],
    });

    sinon.assert.notCalled(setContextSpy);
  });
});
