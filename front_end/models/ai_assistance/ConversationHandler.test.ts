// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import {
  cleanup,
  createNetworkRequest,
  mockAidaClient,
} from '../../testing/AiAssistanceHelpers.js';
import {createTarget, registerNoopActions, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createNetworkPanelForMockConnection} from '../../testing/NetworkHelpers.js';

describeWithMockConnection('ConversationHandler', () => {
  describe('handleExternalRequest', () => {
    const explanation = 'I need more information';
    let performSearchStub: sinon.SinonStub;

    beforeEach(async () => {
      AiAssistanceModel.ConversationHandler.ConversationHandler.removeInstance();
      registerNoopActions([
        'elements.toggle-element-search', 'timeline.record-reload', 'timeline.toggle-recording',
        'timeline.show-history', 'components.collect-garbage'
      ]);
      Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,

        },
        devToolsAiAssistanceNetworkAgent: {
          enabled: true,
        }
      });

      const target = createTarget();
      performSearchStub = sinon.stub(target.domAgent(), 'invoke_performSearch')
                              .resolves({searchId: 'uniqueId', resultCount: 0, getError: () => undefined});
    });

    afterEach(cleanup);

    describe('can be blocked', () => {
      it('by a setting', async () => {
        Common.Settings.moduleSetting('ai-assistance-enabled').set(false);
        const conversationHandler = AiAssistanceModel.ConversationHandler.ConversationHandler.instance({
          aidaClient: mockAidaClient([[{explanation}]]),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        });
        const generator = await conversationHandler.handleExternalRequest({
          prompt: 'Please help me debug this problem',
          conversationType: AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING,
        });
        const response = await generator.next();
        assert.strictEqual(response.value.type, 'error');
        assert.strictEqual(
            response.value.message,
            'For AI features to be available, you need to enable AI assistance in DevTools settings.');
      });

      it('by feature availability', async () => {
        const conversationHandler = AiAssistanceModel.ConversationHandler.ConversationHandler.instance({
          aidaClient: mockAidaClient([[{explanation}]]),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.SYNC_IS_PAUSED,
        });
        const generator = await conversationHandler.handleExternalRequest({
          prompt: 'Please help me debug this problem',
          conversationType: AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING,
        });
        const response = await generator.next();
        assert.strictEqual(response.value.type, 'error');
        assert.strictEqual(
            response.value.message,
            'This feature is only available when you sign into Chrome with your Google account.');
      });

      it('by user age', async () => {
        updateHostConfig({
          aidaAvailability: {
            blockedByAge: true,
          },
          devToolsFreestyler: {
            enabled: true,
          },
        });
        const conversationHandler = AiAssistanceModel.ConversationHandler.ConversationHandler.instance({
          aidaClient: mockAidaClient([[{explanation}]]),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        });
        const generator = await conversationHandler.handleExternalRequest({
          prompt: 'Please help me debug this problem',
          conversationType: AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING
        });
        const response = await generator.next();
        assert.strictEqual(response.value.type, 'error');
        assert.strictEqual(
            response.value.message, 'This feature is only available to users who are 18 years of age or older.');
      });
    });

    it('returns an explanation for styling assistance requests', async () => {
      const conversationHandler = AiAssistanceModel.ConversationHandler.ConversationHandler.instance({
        aidaClient: mockAidaClient([[{explanation}]]),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      });
      const requestReceivedSpy = sinon.spy();
      conversationHandler.addEventListener(
          AiAssistanceModel.ConversationHandler.ConversationHandlerEvents.EXTERNAL_REQUEST_RECEIVED,
          requestReceivedSpy);
      const generator = await conversationHandler.handleExternalRequest({
        prompt: 'Please help me debug this problem',
        conversationType: AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING
      });
      const response = await generator.next();
      assert.strictEqual(response.value.message, explanation);
      sinon.assert.calledOnce(requestReceivedSpy);
    });

    it('handles styling assistance requests which contain a selector', async () => {
      const conversationHandler = AiAssistanceModel.ConversationHandler.ConversationHandler.instance({
        aidaClient: mockAidaClient([[{explanation}]]),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      });
      const generator = await conversationHandler.handleExternalRequest({
        prompt: 'Please help me debug this problem',
        conversationType: AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING,
        selector: 'h1'
      });
      const response = await generator.next();
      assert.strictEqual(response.value.message, explanation);
      sinon.assert.calledOnce(performSearchStub);
      assert.strictEqual(performSearchStub.getCall(0).args[0].query, 'h1');
    });

    it('returns an error if no answer could be generated', async () => {
      const conversationHandler = AiAssistanceModel.ConversationHandler.ConversationHandler.instance({
        aidaClient: mockAidaClient([
          [{
            functionCalls: [{
              name: 'executeJavaScript',
              args: {code: '$0.style.backgroundColor = \'red\';'},
            }],
            explanation: '',
          }],
        ]),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      });
      const generator = await conversationHandler.handleExternalRequest({
        prompt: 'Please help me debug this problem',
        conversationType: AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING
      });
      const response = await generator.next();
      assert.strictEqual(response.value.type, 'error');
      assert.strictEqual(response.value.message, 'Something went wrong. No answer was generated.');
    });

    it('persists external conversations to history', async () => {
      const aidaClient = mockAidaClient([[{explanation}]]);
      await AiAssistanceModel.AiHistoryStorage.AiHistoryStorage.instance().deleteAll();
      const conversationHandler = AiAssistanceModel.ConversationHandler.ConversationHandler.instance({
        aidaClient,
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      });
      const generator = await conversationHandler.handleExternalRequest({
        prompt: 'Please help me debug this problem',
        conversationType: AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING
      });
      await generator.next();
      const historicalConversations = AiAssistanceModel.AiHistoryStorage.AiHistoryStorage.instance().getHistory();
      assert.lengthOf(historicalConversations, 1);
      assert.strictEqual(historicalConversations[0].type, AiAssistanceModel.AiHistoryStorage.ConversationType.STYLING);
      assert.isTrue(historicalConversations[0].isExternal);
      assert.strictEqual(
          JSON.stringify(historicalConversations[0].history),
          '[{"type":"user-query","query":"Please help me debug this problem"},{"type":"querying"},{"type":"answer","text":"I need more information","complete":true}]');
    });

    it('returns an explanation for network assistance requests', async () => {
      await createNetworkPanelForMockConnection();
      Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
      const conversationHandler = AiAssistanceModel.ConversationHandler.ConversationHandler.instance({
        aidaClient: mockAidaClient([[{explanation}]]),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      });
      const requestReceivedSpy = sinon.spy();
      conversationHandler.addEventListener(
          AiAssistanceModel.ConversationHandler.ConversationHandlerEvents.EXTERNAL_REQUEST_RECEIVED,
          requestReceivedSpy);

      const request = createNetworkRequest();
      sinon.stub(request, 'requestContentData')
          .resolves(new TextUtils.ContentData.ContentData('', false, 'text/plain'));

      const networkManager = sinon.createStubInstance(SDK.NetworkManager.NetworkManager, {
        requestForURL: request,
      });
      sinon.stub(SDK.TargetManager.TargetManager.instance(), 'models').returns([networkManager]);

      const generator = await conversationHandler.handleExternalRequest({
        prompt: 'Please help me debug this problem',
        conversationType: AiAssistanceModel.AiHistoryStorage.ConversationType.NETWORK,
        requestUrl: 'https://localhost:8080/'
      });
      let response = await generator.next();
      assert.strictEqual(response.value.message, 'Analyzing network data');
      response = await generator.next();
      assert.strictEqual(response.value.message, explanation);
      sinon.assert.calledOnce(requestReceivedSpy);
    });
  });
});
