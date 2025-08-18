// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as Trace from '../../models/trace/trace.js';
import * as AiAssistancePanel from '../../panels/ai_assistance/ai_assistance.js';
import * as Timeline from '../../panels/timeline/timeline.js';
import {
  createAiAssistancePanel,
  createNetworkRequest,
  mockAidaClient,
  openHistoryContextMenu
} from '../../testing/AiAssistanceHelpers.js';
import {createTarget, registerNoopActions, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createNetworkPanelForMockConnection} from '../../testing/NetworkHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as Snackbars from '../../ui/components/snackbars/snackbars.js';
import * as UI from '../../ui/legacy/legacy.js';

const {urlString} = Platform.DevToolsPath;

describeWithMockConnection('ConversationHandler', () => {
  describe('handleExternalRequest', () => {
    const explanation = 'I need more information';
    let performSearchStub: sinon.SinonStub;

    beforeEach(async () => {
      AiAssistanceModel.ConversationHandler.removeInstance();  // maybe move out
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

    describe('can be blocked', () => {
      it('by a setting', async () => {
        Common.Settings.moduleSetting('ai-assistance-enabled').set(false);
        const conversationHandler = AiAssistanceModel.ConversationHandler.instance({
          aidaClient: mockAidaClient([[{explanation}]]),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        });
        const generator = await conversationHandler.handleExternalRequest({
          prompt: 'Please help me debug this problem',
          conversationType: AiAssistanceModel.ConversationType.STYLING,
        });
        const response = await generator.next();
        assert.strictEqual(response.value.type, 'error');
        assert.strictEqual(
            response.value.message,
            'For AI features to be available, you need to enable AI assistance in DevTools settings.');
      });

      it('by feature availability', async () => {
        const conversationHandler = AiAssistanceModel.ConversationHandler.instance({
          aidaClient: mockAidaClient([[{explanation}]]),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.SYNC_IS_PAUSED,
        });
        const generator = await conversationHandler.handleExternalRequest({
          prompt: 'Please help me debug this problem',
          conversationType: AiAssistanceModel.ConversationType.STYLING,
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
        const conversationHandler = AiAssistanceModel.ConversationHandler.instance({
          aidaClient: mockAidaClient([[{explanation}]]),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        });
        const generator = await conversationHandler.handleExternalRequest({
          prompt: 'Please help me debug this problem',
          conversationType: AiAssistanceModel.ConversationType.STYLING
        });
        const response = await generator.next();
        assert.strictEqual(response.value.type, 'error');
        assert.strictEqual(
            response.value.message, 'This feature is only available to users who are 18 years of age or older.');
      });
    });

    it('returns an explanation for styling assistance requests', async () => {
      const conversationHandler = AiAssistanceModel.ConversationHandler.instance({
        aidaClient: mockAidaClient([[{explanation}]]),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      });
      const snackbarShowStub = sinon.stub(Snackbars.Snackbar.Snackbar, 'show');
      const generator = await conversationHandler.handleExternalRequest(
          {prompt: 'Please help me debug this problem', conversationType: AiAssistanceModel.ConversationType.STYLING});
      const response = await generator.next();
      assert.strictEqual(response.value.message, explanation);
      sinon.assert.calledOnceWithExactly(snackbarShowStub, {message: 'DevTools received an external request'});
    });

    it('handles styling assistance requests which contain a selector', async () => {
      const conversationHandler = AiAssistanceModel.ConversationHandler.instance({
        aidaClient: mockAidaClient([[{explanation}]]),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      });
      const generator = await conversationHandler.handleExternalRequest({
        prompt: 'Please help me debug this problem',
        conversationType: AiAssistanceModel.ConversationType.STYLING,
        selector: 'h1'
      });
      const response = await generator.next();
      assert.strictEqual(response.value.message, explanation);
      sinon.assert.calledOnce(performSearchStub);
      assert.strictEqual(performSearchStub.getCall(0).args[0].query, 'h1');
    });

    it('returns an error if no answer could be generated', async () => {
      const conversationHandler = AiAssistanceModel.ConversationHandler.instance({
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
      const generator = await conversationHandler.handleExternalRequest(
          {prompt: 'Please help me debug this problem', conversationType: AiAssistanceModel.ConversationType.STYLING});
      const response = await generator.next();
      assert.strictEqual(response.value.type, 'error');
      assert.strictEqual(response.value.message, 'Something went wrong. No answer was generated.');
    });

    it('persists external conversations to history', async () => {
      const aidaClient = mockAidaClient([[{explanation}]]);
      const conversationHandler = AiAssistanceModel.ConversationHandler.instance({
        aidaClient,
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      });
      const {view} = await createAiAssistancePanel({aidaClient});
      const generator = await conversationHandler.handleExternalRequest(
          {prompt: 'Please help me debug this problem', conversationType: AiAssistanceModel.ConversationType.STYLING});
      await generator.next();
      const {contextMenu, id} = openHistoryContextMenu(view.input, '[External] Please help me debug this problem');
      assert.isDefined(id);
      contextMenu.invokeHandler(id);
      assert.isTrue((await view.nextInput).isReadOnly);
      assert.deepEqual(view.input.messages, [
        {
          entity: AiAssistancePanel.ChatMessageEntity.USER,
          imageInput: undefined,
          text: 'Please help me debug this problem',
        },
        {
          answer: explanation,
          entity: AiAssistancePanel.ChatMessageEntity.MODEL,
          rpcId: undefined,
          suggestions: undefined,
          steps: [],
        },
      ]);
    });

    it('can switch contexts', async () => {
      const steps = [
        {
          contextDetails: [
            {
              text: 'Request URL: https://a.test\n\nRequest headers:\ncontent-type: bar1',
              title: 'Request',
            },
            {
              text: 'Response Status: 200 \n\nResponse headers:\ncontent-type: bar2\nx-forwarded-for: bar3',
              title: 'Response',
            },
            {
              text:
                  'Queued at (timestamp): 0 μs\nStarted at (timestamp): 0 μs\nConnection start (stalled) (duration): -\nDuration (duration): -',
              title: 'Timing',
            },
            {
              text: '- URL: https://a.test',
              title: 'Request initiator chain',
            },
          ],
          isLoading: false,
          sideEffect: undefined,
          title: 'Analyzing network data',
        },
      ] as AiAssistancePanel.Step[];

      await createNetworkPanelForMockConnection();
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
        },
      });
      const networkRequest = createNetworkRequest({
        url: urlString`https://a.test`,
      });
      UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, networkRequest);
      Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
      const aidaClient = mockAidaClient([[{explanation: 'test'}], [{explanation: 'test2'}], [{explanation: 'test3'}]]);
      const conversationHandler = AiAssistanceModel.ConversationHandler.instance({
        aidaClient,
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      });
      const {panel, view} = await createAiAssistancePanel({aidaClient});

      panel.handleAction('drjones.network-floating-button');
      (await view.nextInput).onTextSubmit('User question to DrJones?');
      assert.deepEqual((await view.nextInput).messages, [
        {
          entity: AiAssistancePanel.ChatMessageEntity.USER,
          text: 'User question to DrJones?',
          imageInput: undefined,
        },
        {
          answer: 'test',
          entity: AiAssistancePanel.ChatMessageEntity.MODEL,
          rpcId: undefined,
          suggestions: undefined,
          steps,
        },
      ]);

      const generator = await conversationHandler.handleExternalRequest(
          {prompt: 'Please help me debug this problem', conversationType: AiAssistanceModel.ConversationType.STYLING});
      const response = await generator.next();
      assert.strictEqual(response.value.message, 'test2');

      view.input.onTextSubmit('Follow-up question to DrJones?');
      assert.deepEqual((await view.nextInput).messages, [
        {
          entity: AiAssistancePanel.ChatMessageEntity.USER,
          text: 'User question to DrJones?',
          imageInput: undefined,
        },
        {
          answer: 'test',
          entity: AiAssistancePanel.ChatMessageEntity.MODEL,
          rpcId: undefined,
          suggestions: undefined,
          steps,
        },
        {
          entity: AiAssistancePanel.ChatMessageEntity.USER,
          text: 'Follow-up question to DrJones?',
          imageInput: undefined,
        },
        {
          answer: 'test3',
          entity: AiAssistancePanel.ChatMessageEntity.MODEL,
          rpcId: undefined,
          suggestions: undefined,
          steps,
        },
      ]);
    });

    it('returns an explanation for network assistance requests', async () => {
      await createNetworkPanelForMockConnection();
      Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
      const conversationHandler = AiAssistanceModel.ConversationHandler.instance({
        aidaClient: mockAidaClient([[{explanation}]]),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      });
      const snackbarShowStub = sinon.stub(Snackbars.Snackbar.Snackbar, 'show');

      const request = createNetworkRequest();
      const networkManager = sinon.createStubInstance(SDK.NetworkManager.NetworkManager, {
        requestForURL: request,
      });
      sinon.stub(SDK.TargetManager.TargetManager.instance(), 'models').returns([networkManager]);

      const generator = await conversationHandler.handleExternalRequest({
        prompt: 'Please help me debug this problem',
        conversationType: AiAssistanceModel.ConversationType.NETWORK,
        requestUrl: 'https://localhost:8080/'
      });
      let response = await generator.next();
      assert.strictEqual(response.value.message, 'Analyzing network data');
      response = await generator.next();
      assert.strictEqual(response.value.message, explanation);
      sinon.assert.calledOnceWithExactly(snackbarShowStub, {message: 'DevTools received an external request'});
    });

    it('handles performance insight requests with an insight title', async function() {
      const conversationHandler = AiAssistanceModel.ConversationHandler.instance({
        aidaClient: mockAidaClient([[{explanation}]]),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      });

      // Create a timeline panel that has a trace imported with insights.
      const events = await TraceLoader.rawEvents(this, 'web-dev-with-commit.json.gz');
      const traceModel = Trace.TraceModel.Model.createWithAllHandlers();
      await traceModel.parse(events);
      Timeline.TimelinePanel.TimelinePanel.instance({forceNew: true, isNode: false, traceModel});

      const generator = await conversationHandler.handleExternalRequest({
        prompt: 'Please help me debug this problem',
        conversationType: AiAssistanceModel.ConversationType.PERFORMANCE_INSIGHT,
        insightTitle: 'LCP breakdown',
        traceModel,
      });
      let response = await generator.next();
      assert.strictEqual(response.value.message, 'Analyzing insight: LCP breakdown');
      response = await generator.next();
      assert.strictEqual(response.value.message, explanation);
    });

    it('errors for performance insight requests with no insightTitle', async () => {
      const conversationHandler = AiAssistanceModel.ConversationHandler.instance({
        aidaClient: mockAidaClient([[{explanation}]]),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      });
      const generator = await conversationHandler.handleExternalRequest({
        prompt: 'Please help me debug this problem',
        conversationType: AiAssistanceModel.ConversationType.PERFORMANCE_INSIGHT
      } as AiAssistanceModel.ExternalPerformanceInsightsRequestParameters);
      const response = await generator.next();
      assert.strictEqual(response.value.type, 'error');
      assert.strictEqual(
          response.value.message, 'The insightTitle parameter is required for debugging a Performance Insight.');
    });
  });
});
