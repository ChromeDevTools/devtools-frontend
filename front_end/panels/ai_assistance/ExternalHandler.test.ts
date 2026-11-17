// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import {mockAidaClient, type MockAidaResponse} from '../../testing/AiAssistanceHelpers.js';
import {updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LighthousePanel from '../lighthouse/lighthouse.js';
import * as TimelinePanel from '../timeline/timeline.js';

import * as AiAssistancePanel from './ai_assistance.js';

describe('ExternalHandler', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let getItemStub: sinon.SinonStub;
  let setItemStub: sinon.SinonStub;
  let removeItemStub: sinon.SinonStub;

  function stubDoConversation(responses: Array<[MockAidaResponse, ...MockAidaResponse[]]>):
      sinon.SinonStub<Parameters<Host.AidaClient.AidaClient['doConversation']>,
                      AsyncGenerator<Host.AidaClient.DoConversationResponse, void, void>> {
    const client = mockAidaClient(responses);
    return sinon.stub(Host.AidaClient.AidaClient.prototype, 'doConversation')
        .callsFake((request, options) => client.doConversation(request, options));
  }

  beforeEach(() => {
    sinon.stub(console, 'log');
    getItemStub = sinon.stub(localStorage, 'getItem');
    setItemStub = sinon.stub(localStorage, 'setItem');
    removeItemStub = sinon.stub(localStorage, 'removeItem');
  });

  afterEach(() => {
    AiAssistanceModel.AiHistoryStorage.AiHistoryStorage.removeInstance();
    SDK.TargetManager.TargetManager.removeInstance();
    UI.Context.Context.removeInstance();
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

    sinon.assert.calledWith(setItemStub, 'devToolsAiDebug',
                            JSON.stringify({assistance: true, gca: false, codeGenComplete: false}));
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

  it('auto-confirms SIDE_EFFECT responses during conversation execution', async () => {
    const confirmSpy = sinon.spy();
    sinon.stub(AiAssistanceModel.AiConversation.AiConversation.prototype, 'run').callsFake(async function*() {
      yield {
        type: AiAssistanceModel.AiAgent.ResponseType.SIDE_EFFECT,
        description: 'Execute JavaScript on the page',
        confirm: confirmSpy,
      };
    });

    await AiAssistancePanel.ExternalHandler.handleExternalAIRequest({
      prompts: ['check styles on the page'],
    });

    sinon.assert.calledOnceWithExactly(confirmSpy, AiAssistanceModel.Tool.PermissionDecision.ALLOW_ONCE);
  });

  it('disables server-side logging on conversation requests', async () => {
    updateHostConfig({
      devToolsAiV2Architecture: {enabled: true},
      aidaAvailability: {disallowLogging: false},
    });
    const doConversationStub = stubDoConversation([
      [{explanation: 'test response'}],
    ]);

    await AiAssistancePanel.ExternalHandler.handleExternalAIRequest({
      prompts: ['test prompt'],
    });

    sinon.assert.calledOnce(doConversationStub);
    assert.isTrue(doConversationStub.firstCall.firstArg.metadata?.disable_user_content_logging);
  });

  it('forwards runLighthouse tool calls to LighthousePanel.executeLighthouseRecording with isAIControlled',
     async () => {
       updateHostConfig({devToolsAiV2Architecture: {enabled: true}});
       const executeLighthouseStub =
           sinon.stub(LighthousePanel.LighthousePanel.LighthousePanel, 'executeLighthouseRecording').resolves({
             status: 'cancelled',
           });
       stubDoConversation([
         [{
           explanation: '',
           functionCalls: [{name: 'learnSkills', args: {skills: ['lighthouse']}}],
         }],
         [{
           explanation: '',
           functionCalls: [{
             name: 'runLighthouse',
             args: {explanation: 'audit', categoryId: 'accessibility', mode: 'snapshot'},
           }],
         }],
         [{explanation: 'Done.'}],
       ]);

       await AiAssistancePanel.ExternalHandler.handleExternalAIRequest({
         prompts: ['audit accessibility'],
       });

       sinon.assert.calledOnceWithExactly(executeLighthouseStub, {
         isAIControlled: true,
         mode: 'snapshot',
         categoryIds: ['accessibility'],
       });
     });

  it('forwards recordPerformanceTrace tool calls to TimelinePanel.executeRecordAndReload', async () => {
    updateHostConfig({devToolsAiV2Architecture: {enabled: true}});
    const executeRecordAndReloadStub =
        sinon.stub(TimelinePanel.TimelinePanel.TimelinePanel, 'executeRecordAndReload').rejects(new Error('cancelled'));
    stubDoConversation([
      [{
        explanation: '',
        functionCalls: [{name: 'learnSkills', args: {skills: ['performance']}}],
      }],
      [{
        explanation: '',
        functionCalls: [{name: 'recordPerformanceTrace', args: {}}],
      }],
      [{explanation: 'Done.'}],
    ]);

    await AiAssistancePanel.ExternalHandler.handleExternalAIRequest({
      prompts: ['check performance'],
    });

    sinon.assert.calledOnce(executeRecordAndReloadStub);
  });
});
