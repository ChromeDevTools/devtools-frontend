// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {
  cleanup,
  createAiAssistancePanel,
  createNetworkRequest,
  mockAidaClient
} from '../../testing/AiAssistanceHelpers.js';
import {findMenuItemWithLabel, getMenu} from '../../testing/ContextMenuHelpers.js';
import {createTarget, registerNoopActions, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createNetworkPanelForMockConnection} from '../../testing/NetworkHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Elements from '../elements/elements.js';
import * as Network from '../network/network.js';
import * as Sources from '../sources/sources.js';
import * as Timeline from '../timeline/timeline.js';
import * as TimelineUtils from '../timeline/utils/utils.js';

import * as AiAssistance from './ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describeWithMockConnection('AI Assistance Panel', () => {
  beforeEach(() => {
    registerNoopActions(['elements.toggle-element-search']);
    UI.Context.Context.instance().setFlavor(Elements.ElementsPanel.ElementsPanel, null);
    UI.Context.Context.instance().setFlavor(Network.NetworkPanel.NetworkPanel, null);
    UI.Context.Context.instance().setFlavor(Sources.SourcesPanel.SourcesPanel, null);
    UI.Context.Context.instance().setFlavor(Timeline.TimelinePanel.TimelinePanel, null);
    UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, null);
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, null);
    UI.Context.Context.instance().setFlavor(TimelineUtils.AICallTree.AICallTree, null);
    UI.Context.Context.instance().setFlavor(Workspace.UISourceCode.UISourceCode, null);
  });

  afterEach(() => {
    cleanup();
  });

  describe('consent view', () => {
    it('should render consent view when the consent is not given before', async () => {
      const {initialViewInput} = await createAiAssistancePanel();
      assert.strictEqual(initialViewInput.state, AiAssistance.State.CONSENT_VIEW);
    });

    it('should switch from consent view to chat view when enabling setting', async () => {
      const {initialViewInput, expectViewUpdate} = await createAiAssistancePanel();
      assert.strictEqual(initialViewInput.state, AiAssistance.State.CONSENT_VIEW);
      const updatedViewInput = await expectViewUpdate(() => {
        Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
      });
      assert.strictEqual(updatedViewInput.state, AiAssistance.State.CHAT_VIEW);
    });

    it('should render chat view when the consent is given before', async () => {
      Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
      const {initialViewInput} = await createAiAssistancePanel();
      assert.strictEqual(initialViewInput.state, AiAssistance.State.CHAT_VIEW);
    });

    it('should render the consent view when the setting is disabled', async () => {
      Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
      Common.Settings.moduleSetting('ai-assistance-enabled').setDisabled(true);
      const {initialViewInput} = await createAiAssistancePanel();
      assert.strictEqual(initialViewInput.state, AiAssistance.State.CONSENT_VIEW);
      Common.Settings.moduleSetting('ai-assistance-enabled').setDisabled(false);
    });

    it('should render the consent view when blocked by age', async () => {
      Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
      updateHostConfig({
        aidaAvailability: {
          blockedByAge: true,
        },
        devToolsFreestyler: {
          enabled: true,
        },
      });
      const {initialViewInput} = await createAiAssistancePanel();
      assert.strictEqual(initialViewInput.state, AiAssistance.State.CONSENT_VIEW);
    });

    it('updates when the user logs in', async () => {
      Common.Settings.moduleSetting('ai-assistance-enabled').set(true);

      const {initialViewInput, expectViewUpdate, stubAidaCheckAccessPreconditions} =
          await createAiAssistancePanel({aidaAvailability: Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL});

      assert.strictEqual(initialViewInput.state, AiAssistance.State.CHAT_VIEW);
      assert.strictEqual(initialViewInput.aidaAvailability, Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL);

      stubAidaCheckAccessPreconditions(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);

      const updatedViewInput = await expectViewUpdate(() => {
        Host.AidaClient.HostConfigTracker.instance().dispatchEventToListeners(
            Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED);
      });

      assert.strictEqual(updatedViewInput.state, AiAssistance.State.CHAT_VIEW);
      assert.strictEqual(updatedViewInput.aidaAvailability, Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    });
  });

  describe('rating', () => {
    it('should allow logging if configured', async () => {
      updateHostConfig({
        aidaAvailability: {
          disallowLogging: false,
        },
      });
      const {aidaClient, initialViewInput: {onFeedbackSubmit}} = await createAiAssistancePanel();

      const aidaClientCall = expectCall(aidaClient.registerClientEvent as sinon.SinonStub);
      onFeedbackSubmit(0, Host.AidaClient.Rating.POSITIVE);

      const [aidaClientEvent] = await aidaClientCall;
      assert.isFalse(aidaClientEvent.disable_user_content_logging);
    });

    it('should send POSITIVE rating to aida client when the user clicks on positive rating', async () => {
      updateHostConfig({
        aidaAvailability: {
          enabled: true,
          disallowLogging: true,
        }
      });
      const RPC_ID = 999;
      const {aidaClient, initialViewInput: {onFeedbackSubmit}} = await createAiAssistancePanel();

      const aidaClientCall = expectCall(aidaClient.registerClientEvent as sinon.SinonStub);
      onFeedbackSubmit(RPC_ID, Host.AidaClient.Rating.POSITIVE);
      const [aidaClientEvent] = await aidaClientCall;

      assert.deepEqual(aidaClientEvent, {
        corresponding_aida_rpc_global_id: RPC_ID,
        do_conversation_client_event: {
          user_feedback: {
            sentiment: 'POSITIVE',
            user_input: {
              comment: undefined,
            }
          },
        },
        disable_user_content_logging: true,
      });
    });

    it('should send NEGATIVE rating to aida client when the user clicks on negative rating', async () => {
      updateHostConfig({
        aidaAvailability: {
          enabled: true,
          disallowLogging: true,
        }
      });
      const RPC_ID = 999;
      const {aidaClient, initialViewInput: {onFeedbackSubmit}} = await createAiAssistancePanel();

      const aidaClientCall = expectCall(aidaClient.registerClientEvent as sinon.SinonStub);
      onFeedbackSubmit(RPC_ID, Host.AidaClient.Rating.NEGATIVE);
      const [aidaClientEvent] = await aidaClientCall;

      assert.deepEqual(aidaClientEvent, {
        corresponding_aida_rpc_global_id: RPC_ID,
        do_conversation_client_event: {
          user_feedback: {
            sentiment: 'NEGATIVE',
            user_input: {
              comment: undefined,
            }
          },
        },
        disable_user_content_logging: true,
      });
    });

    it('should send feedback text with data', async () => {
      updateHostConfig({
        aidaAvailability: {
          enabled: true,
          disallowLogging: true,
        }
      });
      const feedback = 'This helped me a ton.';
      const RPC_ID = 999;
      const {aidaClient, initialViewInput: {onFeedbackSubmit}} = await createAiAssistancePanel();
      const aidaClientCall = expectCall(aidaClient.registerClientEvent as sinon.SinonStub);
      onFeedbackSubmit(RPC_ID, Host.AidaClient.Rating.POSITIVE, feedback);
      const [aidaClientEvent] = await aidaClientCall;
      assert.deepEqual(aidaClientEvent, {
        corresponding_aida_rpc_global_id: RPC_ID,
        do_conversation_client_event: {
          user_feedback: {
            sentiment: 'POSITIVE',
            user_input: {
              comment: feedback,
            }
          },
        },
        disable_user_content_logging: true,
      });
    });
  });

  describe('contexts', () => {
    const tests = [
      {
        flavor: SDK.DOMModel.DOMNode,
        createContext: () => {
          const node = sinon.createStubInstance(SDK.DOMModel.DOMNode, {
            nodeType: Node.ELEMENT_NODE,
          });
          return new AiAssistance.NodeContext(node);
        },
        action: 'freestyler.elements-floating-button',
      },
      {
        flavor: SDK.NetworkRequest.NetworkRequest,
        createContext: () => {
          return new AiAssistance.RequestContext(sinon.createStubInstance(SDK.NetworkRequest.NetworkRequest));
        },
        action: 'drjones.network-floating-button'
      },
      {
        flavor: TimelineUtils.AICallTree.AICallTree,
        createContext: () => {
          return new AiAssistance.CallTreeContext(sinon.createStubInstance(TimelineUtils.AICallTree.AICallTree));
        },
        action: 'drjones.performance-panel-context'
      },
      {
        flavor: TimelineUtils.InsightAIContext.ActiveInsight,
        createContext: () => {
          return new AiAssistance.InsightContext(
              sinon.createStubInstance(TimelineUtils.InsightAIContext.ActiveInsight));
        },
        action: 'drjones.performance-insight-context'
      },
      {
        flavor: Workspace.UISourceCode.UISourceCode,
        createContext: () => {
          return new AiAssistance.FileContext(sinon.createStubInstance(Workspace.UISourceCode.UISourceCode));
        },
        action: 'drjones.sources-panel-context',
      }
    ];

    for (const test of tests) {
      it(`should use the selected ${test.flavor.name} context after the widget is shown`, async () => {
        const {panel, expectViewUpdate} = await createAiAssistancePanel();
        const context = test.createContext();
        const contextItem = context.getItem();
        if (!contextItem) {
          throw new Error('Context is not available');
        }
        const updatedViewInputAfterFlavorChange = await expectViewUpdate(() => {
          UI.Context.Context.instance().setFlavor(test.flavor, contextItem);
          panel.handleAction(test.action);
        });
        expect(updatedViewInputAfterFlavorChange.selectedContext?.getItem()).equals(contextItem);
      });

      it(`should update the selected ${test.flavor.name} context whenever flavor changes`, async () => {
        const {panel, expectViewUpdate} = await createAiAssistancePanel();
        const updatedViewInput = await expectViewUpdate(() => {
          panel.handleAction(test.action);
        });
        assert.isNull(updatedViewInput.selectedContext);
        const context = test.createContext();
        const contextItem = context.getItem();
        if (!contextItem) {
          throw new Error('Context is not available');
        }
        UI.Context.Context.instance().setFlavor(test.flavor, contextItem);
        const updatedViewInputAfterFlavorChange = await expectViewUpdate(() => {
          UI.Context.Context.instance().setFlavor(test.flavor, contextItem);
        });
        expect(updatedViewInputAfterFlavorChange.selectedContext?.getItem()).equals(contextItem);
      });

      it(`should ignore ${test.flavor.name} flavor change after the panel was hidden`, async () => {
        const {initialViewInput, view, panel} = await createAiAssistancePanel();
        assert.isNull(initialViewInput.selectedContext);
        const callCount = view.callCount;
        panel.hideWidget();
        const context = test.createContext();
        const contextItem = context.getItem();
        if (!contextItem) {
          throw new Error('Context is not available');
        }
        UI.Context.Context.instance().setFlavor(test.flavor, contextItem);
        assert.strictEqual(view.callCount, callCount);
      });
    }

    it('should set selected context to null when the change DOMNode flavor is not an ELEMENT_NODE', async () => {
      const {panel, expectViewUpdate} = await createAiAssistancePanel();
      const updatedViewInput = await expectViewUpdate(() => {
        panel.handleAction('freestyler.elements-floating-button');
      });
      assert.isNull(updatedViewInput.selectedContext);

      const node = sinon.createStubInstance(SDK.DOMModel.DOMNode, {
        nodeType: Node.COMMENT_NODE,
      });
      const updatedViewInputAfterNodeChange = await expectViewUpdate(() => {
        UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
      });

      assert.isNull(updatedViewInputAfterNodeChange.selectedContext);
    });
  });

  describe('toggle search element action', () => {
    let toggleSearchElementAction: UI.ActionRegistration.Action;
    beforeEach(() => {
      toggleSearchElementAction =
          UI.ActionRegistry.ActionRegistry.instance().getAction('elements.toggle-element-search');
      toggleSearchElementAction.setToggled(false);
    });

    it('should set inspectElementToggled when the widget is shown', async () => {
      const {expectViewUpdate} = await createAiAssistancePanel();
      const updatedViewInput = await expectViewUpdate(() => {
        toggleSearchElementAction.setToggled(true);
      });
      assert.isTrue(updatedViewInput.inspectElementToggled);
    });

    it('should update inspectElementToggled when the action is toggled', async () => {
      const {initialViewInput, expectViewUpdate} = await createAiAssistancePanel();
      assert.isFalse(initialViewInput.inspectElementToggled);

      const updatedViewInput = await expectViewUpdate(() => {
        toggleSearchElementAction.setToggled(true);
      });
      assert.isTrue(updatedViewInput.inspectElementToggled);
    });

    it('should not update toggleSearchElementAction when the widget is not shown', async () => {
      toggleSearchElementAction.setToggled(false);

      const {view, panel} = await createAiAssistancePanel();
      const callCount = view.callCount;
      panel.hideWidget();

      toggleSearchElementAction.setToggled(true);

      const uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
      UI.Context.Context.instance().setFlavor(Workspace.UISourceCode.UISourceCode, uiSourceCode);

      assert.strictEqual(view.callCount, callCount);
    });
  });

  describe('toolbar actions', () => {
    it('should show chrome-ai view on settings click', async () => {
      const stub = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView');
      const {initialViewInput} = await createAiAssistancePanel();
      initialViewInput.onSettingsClick();
      assert.isTrue(stub.calledWith('chrome-ai'));
    });
  });

  describe('history interactions', () => {
    it('should have empty messages after new chat', async () => {
      const {panel, expectViewUpdate} =
          await createAiAssistancePanel({aidaClient: mockAidaClient([[{explanation: 'test'}]])});

      const updatedViewInput = await expectViewUpdate(() => {
        panel.handleAction('freestyler.elements-floating-button');
      });

      const updatedViewInputAfterMessage = await expectViewUpdate(() => {
        updatedViewInput.onTextSubmit('test');
      });

      assert.deepEqual(updatedViewInputAfterMessage.messages, [
        {
          entity: AiAssistance.ChatMessageEntity.USER,
          text: 'test',
          imageInput: undefined,
        },
        {
          answer: 'test',
          entity: AiAssistance.ChatMessageEntity.MODEL,
          rpcId: undefined,
          suggestions: undefined,
          steps: [],
        },
      ]);

      const updatedViewInputAfterNewChat = await expectViewUpdate(() => {
        updatedViewInputAfterMessage.onNewChatClick();
      });

      assert.deepEqual(updatedViewInputAfterNewChat.messages, []);
    });

    it('should select default agent after new chat', async () => {
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
        },
      });
      const {panel, expectViewUpdate} =
          await createAiAssistancePanel({aidaClient: mockAidaClient([[{explanation: 'test'}]])});

      const updatedViewInput = await expectViewUpdate(() => {
        panel.handleAction('freestyler.elements-floating-button');
      });

      UI.Context.Context.instance().setFlavor(
          Elements.ElementsPanel.ElementsPanel, sinon.createStubInstance(Elements.ElementsPanel.ElementsPanel));

      const updatedViewInputAfterMessage = await expectViewUpdate(() => {
        updatedViewInput.onTextSubmit('test');
      });

      assert.deepEqual(updatedViewInputAfterMessage.messages, [
        {
          entity: AiAssistance.ChatMessageEntity.USER,
          text: 'test',
          imageInput: undefined,
        },
        {
          answer: 'test',
          entity: AiAssistance.ChatMessageEntity.MODEL,
          rpcId: undefined,
          suggestions: undefined,
          steps: [],
        },
      ]);
      const updatedViewInputAfterNewChat = await expectViewUpdate(() => {
        updatedViewInputAfterMessage.onNewChatClick();
      });

      assert.deepEqual(updatedViewInputAfterNewChat.messages, []);
      assert.deepEqual(updatedViewInputAfterNewChat.conversationType, AiAssistance.ConversationType.STYLING);
    });

    it('should select the performance insights agent if it is enabled', async () => {
      updateHostConfig({
        devToolsAiAssistancePerformanceAgent: {
          enabled: true,
          insightsEnabled: true,
        },
      });
      const {panel, expectViewUpdate} =
          await createAiAssistancePanel({aidaClient: mockAidaClient([[{explanation: 'test'}]])});

      const updatedViewInput = await expectViewUpdate(() => {
        panel.handleAction('freestyler.elements-floating-button');
      });

      const updatedViewInputAfterMessage = await expectViewUpdate(() => {
        updatedViewInput.onTextSubmit('test');
      });

      UI.Context.Context.instance().setFlavor(
          Timeline.TimelinePanel.TimelinePanel, sinon.createStubInstance(Timeline.TimelinePanel.TimelinePanel));

      assert.deepEqual(updatedViewInputAfterMessage.messages, [
        {
          entity: AiAssistance.ChatMessageEntity.USER,
          text: 'test',
          imageInput: undefined,
        },
        {
          answer: 'test',
          entity: AiAssistance.ChatMessageEntity.MODEL,
          rpcId: undefined,
          suggestions: undefined,
          steps: [],
        },
      ]);
      const updatedViewInputAfterNewChat = await expectViewUpdate(() => {
        updatedViewInputAfterMessage.onNewChatClick();
      });

      assert.deepEqual(updatedViewInputAfterNewChat.messages, []);
      assert.deepEqual(
          updatedViewInputAfterNewChat.conversationType, AiAssistance.ConversationType.PERFORMANCE_INSIGHT);
    });

    it('should select the Dr Jones performance agent if insights are not enabled', async () => {
      updateHostConfig({
        devToolsAiAssistancePerformanceAgent: {
          enabled: true,
          insightsEnabled: false,
        },
      });
      const {panel, expectViewUpdate} =
          await createAiAssistancePanel({aidaClient: mockAidaClient([[{explanation: 'test'}]])});

      const updatedViewInput = await expectViewUpdate(() => {
        panel.handleAction('freestyler.elements-floating-button');
      });

      const updatedViewInputAfterMessage = await expectViewUpdate(() => {
        updatedViewInput.onTextSubmit('test');
      });

      UI.Context.Context.instance().setFlavor(
          Timeline.TimelinePanel.TimelinePanel, sinon.createStubInstance(Timeline.TimelinePanel.TimelinePanel));

      assert.deepEqual(updatedViewInputAfterMessage.messages, [
        {
          entity: AiAssistance.ChatMessageEntity.USER,
          text: 'test',
          imageInput: undefined,
        },
        {
          answer: 'test',
          entity: AiAssistance.ChatMessageEntity.MODEL,
          rpcId: undefined,
          suggestions: undefined,
          steps: [],
        },
      ]);
      const updatedViewInputAfterNewChat = await expectViewUpdate(() => {
        updatedViewInputAfterMessage.onNewChatClick();
      });

      assert.deepEqual(updatedViewInputAfterNewChat.messages, []);
      assert.deepEqual(updatedViewInputAfterNewChat.conversationType, AiAssistance.ConversationType.PERFORMANCE);
    });

    it('should switch agents and restore history', async () => {
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
          multimodal: true,
        },
      });
      const {panel, expectViewUpdate} = await createAiAssistancePanel(
          {aidaClient: mockAidaClient([[{explanation: 'test'}], [{explanation: 'test2'}]])});
      const updateViewInput = await expectViewUpdate(() => {
        panel.handleAction('freestyler.elements-floating-button');
      });
      const imageInput = {inlineData: {data: 'imageinputbytes', mimeType: 'image/jpeg'}};
      const updatedViewInputAfterInput = await expectViewUpdate(() => {
        updateViewInput.onTextSubmit('User question to Freestyler?', imageInput);
      });
      assert.deepEqual(updatedViewInputAfterInput.messages, [
        {
          entity: AiAssistance.ChatMessageEntity.USER,
          text: 'User question to Freestyler?',
          imageInput,
        },
        {
          answer: 'test',
          entity: AiAssistance.ChatMessageEntity.MODEL,
          rpcId: undefined,
          suggestions: undefined,
          steps: [],
        },
      ]);

      const updatedViewInputAfterSwitchToNetwork = await expectViewUpdate(() => {
        panel.handleAction('drjones.network-floating-button');
      });
      const updatedViewInputAfterAnotherInput = await expectViewUpdate(() => {
        updatedViewInputAfterSwitchToNetwork.onTextSubmit('User question to DrJones?');
      });
      assert.deepEqual(updatedViewInputAfterAnotherInput.messages, [
        {
          entity: AiAssistance.ChatMessageEntity.USER,
          text: 'User question to DrJones?',
          imageInput: undefined,
        },
        {
          answer: 'test2',
          entity: AiAssistance.ChatMessageEntity.MODEL,
          rpcId: undefined,
          suggestions: undefined,
          steps: [],
        },
      ]);

      const contextMenu = getMenu(() => {
        updatedViewInputAfterSwitchToNetwork.onHistoryClick(new MouseEvent('click'));
      });
      const freestylerEntry = findMenuItemWithLabel(contextMenu.defaultSection(), 'User question to Freestyler?')!;
      assert.isDefined(freestylerEntry);
      const updatedViewInput = await expectViewUpdate(() => {
        contextMenu.invokeHandler(freestylerEntry.id());
      });
      assert.isTrue(updatedViewInput.isReadOnly);
      assert.deepEqual(updatedViewInput.messages, [
        {
          entity: AiAssistance.ChatMessageEntity.USER,
          text: 'User question to Freestyler?',
          imageInput,
        },
        {
          answer: 'test',
          entity: AiAssistance.ChatMessageEntity.MODEL,
          rpcId: undefined,
          suggestions: undefined,
          steps: [],
        },
      ]);
    });

    it('should not save partial responses to conversation history', async () => {
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
        },
      });
      const addHistoryItemStub = sinon.stub(AiAssistance.Conversation.prototype, 'addHistoryItem');
      UI.Context.Context.instance().setFlavor(
          Elements.ElementsPanel.ElementsPanel, sinon.createStubInstance(Elements.ElementsPanel.ElementsPanel));
      const {initialViewInput, expectViewUpdate} = await createAiAssistancePanel({
        aidaClient: mockAidaClient([[
          {explanation: 'ANSWER: partially started'}, {explanation: 'ANSWER: partially started and now it\'s finished'}
        ]])
      });
      // Trigger running the conversation (observe that there are two answers: one partial, one complete)
      await expectViewUpdate(() => {
        initialViewInput.onTextSubmit('User question to Freestyler?');
      });

      sinon.assert.calledWith(
          addHistoryItemStub, sinon.match({type: 'answer', text: 'partially started and now it\'s finished'}));
      sinon.assert.neverCalledWith(addHistoryItemStub, sinon.match({type: 'answer', text: 'partially started'}));
    });
  });

  it('should have empty state after clear chat', async () => {
    const {panel, expectViewUpdate} =
        await createAiAssistancePanel({aidaClient: mockAidaClient([[{explanation: 'test'}]])});

    const updatedViewInput = await expectViewUpdate(() => {
      panel.handleAction('freestyler.elements-floating-button');
    });

    const updatedViewInputAfterMessage = await expectViewUpdate(() => {
      updatedViewInput.onTextSubmit('test');
    });
    assert.deepEqual(updatedViewInputAfterMessage.messages, [
      {
        entity: AiAssistance.ChatMessageEntity.USER,
        text: 'test',
        imageInput: undefined,
      },
      {
        answer: 'test',
        entity: AiAssistance.ChatMessageEntity.MODEL,
        rpcId: undefined,
        suggestions: undefined,
        steps: [],
      },
    ]);

    const updatedViewInputAfterDelete = await expectViewUpdate(() => {
      updatedViewInputAfterMessage.onDeleteClick();
    });
    assert.deepEqual(updatedViewInputAfterDelete.messages, []);
    assert.isUndefined(updatedViewInputAfterDelete.conversationType);
  });

  it('should select default agent based on open panel after clearing the chat', async () => {
    updateHostConfig({
      devToolsFreestyler: {
        enabled: true,
      },
    });
    UI.Context.Context.instance().setFlavor(
        Elements.ElementsPanel.ElementsPanel, sinon.createStubInstance(Elements.ElementsPanel.ElementsPanel));
    const {panel, expectViewUpdate} =
        await createAiAssistancePanel({aidaClient: mockAidaClient([[{explanation: 'test'}]])});
    const updatedViewInput = await expectViewUpdate(() => {
      panel.handleAction('freestyler.elements-floating-button');
    });
    const updatedViewInputAfterMessage = await expectViewUpdate(() => {
      updatedViewInput.onTextSubmit('test');
    });
    assert.deepEqual(updatedViewInputAfterMessage.messages, [
      {
        entity: AiAssistance.ChatMessageEntity.USER,
        text: 'test',
        imageInput: undefined,
      },
      {
        answer: 'test',
        entity: AiAssistance.ChatMessageEntity.MODEL,
        rpcId: undefined,
        suggestions: undefined,
        steps: [],
      },
    ]);
    const updatedViewInputAfterDelete = await expectViewUpdate(() => {
      updatedViewInputAfterMessage.onDeleteClick();
    });
    assert.deepEqual(updatedViewInputAfterDelete.messages, []);
    assert.deepEqual(updatedViewInputAfterDelete.conversationType, AiAssistance.ConversationType.STYLING);
  });

  it('should have empty state after clear chat history', async () => {
    const {panel, expectViewUpdate} = await createAiAssistancePanel(
        {aidaClient: mockAidaClient([[{explanation: 'test'}], [{explanation: 'test2'}]])});

    const updatedViewInput = await expectViewUpdate(() => {
      panel.handleAction('freestyler.elements-floating-button');
    });
    const updatedViewInputAfterMessage = await expectViewUpdate(() => {
      updatedViewInput.onTextSubmit('User question to Freestyler?');
    });
    assert.deepEqual(updatedViewInputAfterMessage.messages, [
      {
        entity: AiAssistance.ChatMessageEntity.USER,
        text: 'User question to Freestyler?',
        imageInput: undefined,
      },
      {
        answer: 'test',
        entity: AiAssistance.ChatMessageEntity.MODEL,
        rpcId: undefined,
        suggestions: undefined,
        steps: [],
      },
    ]);

    const updatedViewInputAfterSwitchToNetwork = await expectViewUpdate(() => {
      panel.handleAction('drjones.network-floating-button');
    });
    const updatedViewInputAfterMessageToNetwork = await expectViewUpdate(() => {
      updatedViewInputAfterSwitchToNetwork.onTextSubmit('User question to DrJones?');
    });
    assert.deepEqual(updatedViewInputAfterMessageToNetwork.messages, [
      {
        entity: AiAssistance.ChatMessageEntity.USER,
        text: 'User question to DrJones?',
        imageInput: undefined,
      },
      {
        answer: 'test2',
        entity: AiAssistance.ChatMessageEntity.MODEL,
        rpcId: undefined,
        suggestions: undefined,
        steps: [],
      },
    ]);

    let contextMenu = getMenu(() => {
      updatedViewInputAfterMessageToNetwork.onHistoryClick(new MouseEvent('click'));
    });
    const clearAll = findMenuItemWithLabel(contextMenu.footerSection(), 'Clear local chats')!;
    assert.isDefined(clearAll);
    const updatedViewInputAfterClearAll = await expectViewUpdate(() => {
      contextMenu.invokeHandler(clearAll.id());
    });
    assert.deepEqual(updatedViewInputAfterClearAll.messages, []);
    assert.isUndefined(updatedViewInputAfterClearAll.conversationType);
    contextMenu.discard();

    contextMenu = getMenu(() => {
      updatedViewInputAfterClearAll.onHistoryClick(new MouseEvent('click'));
    });
    const menuItem = findMenuItemWithLabel(contextMenu.defaultSection(), 'No past conversations');
    assert(menuItem);
  });

  describe('cross-origin', () => {
    beforeEach(async () => {
      createTarget();
      await createNetworkPanelForMockConnection();
    });

    afterEach(async () => {
      Network.NetworkPanel.NetworkPanel.instance().detach();
    });

    it('blocks input on cross origin requests', async () => {
      const networkRequest = createNetworkRequest({
        url: urlString`https://a.test`,
      });
      UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, networkRequest);

      const {panel, expectViewUpdate} = await createAiAssistancePanel({
        aidaClient: mockAidaClient([
          [{explanation: 'test'}],
        ])
      });
      const updatedViewInput = await expectViewUpdate(() => {
        panel.handleAction('drjones.network-floating-button');
      });

      assert.isFalse(updatedViewInput.blockedByCrossOrigin);
      assert.strictEqual(updatedViewInput.selectedContext?.getItem(), networkRequest);

      // Send a query for https://a.test.
      await expectViewUpdate(() => {
        panel.handleAction('drjones.network-floating-button');
        updatedViewInput.onTextSubmit('test');
      });

      // Change context to https://b.test.
      const networkRequest2 = createNetworkRequest({
        url: urlString`https://b.test`,
      });
      UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, networkRequest2);

      const updatedViewInputWithCrossOriginContext = await expectViewUpdate(() => {
        panel.handleAction('drjones.network-floating-button');
      });

      assert.isTrue(updatedViewInputWithCrossOriginContext.blockedByCrossOrigin);
      assert.strictEqual(updatedViewInputWithCrossOriginContext.selectedContext?.getItem(), networkRequest2);
    });

    it('should be able to continue same-origin requests', async () => {
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
        },
      });

      const {initialViewInput, panel, expectViewUpdate} = await createAiAssistancePanel({
        aidaClient: mockAidaClient([[{explanation: 'test'}], [{explanation: 'test2'}]]),
      });
      UI.Context.Context.instance().setFlavor(
          Elements.ElementsPanel.ElementsPanel, sinon.createStubInstance(Elements.ElementsPanel.ElementsPanel));

      const updatedViewInput = await expectViewUpdate(() => {
        panel.handleAction('freestyler.elements-floating-button');
        initialViewInput.onTextSubmit('test');
      });

      assert.deepEqual(updatedViewInput.messages, [
        {
          entity: AiAssistance.ChatMessageEntity.USER,
          text: 'test',
          imageInput: undefined,
        },
        {
          answer: 'test',
          entity: AiAssistance.ChatMessageEntity.MODEL,
          rpcId: undefined,
          suggestions: undefined,
          steps: [],
        },
      ]);

      UI.Context.Context.instance().setFlavor(
          Elements.ElementsPanel.ElementsPanel, sinon.createStubInstance(Elements.ElementsPanel.ElementsPanel));

      const updatedViewInputAfterPanelChange = await expectViewUpdate(() => {
        panel.handleAction('freestyler.elements-floating-button');
        updatedViewInput.onTextSubmit('test2');
      });

      assert.isFalse(updatedViewInputAfterPanelChange.isReadOnly);
      assert.deepEqual(updatedViewInputAfterPanelChange.messages, [
        {
          entity: AiAssistance.ChatMessageEntity.USER,
          text: 'test',
          imageInput: undefined,
        },
        {
          answer: 'test',
          entity: AiAssistance.ChatMessageEntity.MODEL,
          rpcId: undefined,
          suggestions: undefined,
          steps: [],
        },
        {
          entity: AiAssistance.ChatMessageEntity.USER,
          text: 'test2',
          imageInput: undefined,
        },
        {
          answer: 'test2',
          entity: AiAssistance.ChatMessageEntity.MODEL,
          rpcId: undefined,
          suggestions: undefined,
          steps: [],
        },
      ]);
    });

    it('blocks input on cross origin request, when the selected context is changed while the panel was hidden',
       async () => {
         const networkRequest = createNetworkRequest({
           url: urlString`https://a.test`,
         });
         UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, networkRequest);

         const {panel, expectViewUpdate} = await createAiAssistancePanel({
           aidaClient: mockAidaClient([
             [{explanation: 'test'}],
           ])
         });
         const updatedViewInput = await expectViewUpdate(() => {
           panel.handleAction('drjones.network-floating-button');
         });

         assert.isFalse(updatedViewInput.blockedByCrossOrigin);
         assert.strictEqual(updatedViewInput.selectedContext?.getItem(), networkRequest);

         // Send a query for https://a.test.
         await expectViewUpdate(() => {
           panel.handleAction('drjones.network-floating-button');
           updatedViewInput.onTextSubmit('test');
         });

         // Hide the panel
         panel.hideWidget();

         // Change context to https://b.test.
         const networkRequest2 = createNetworkRequest({
           url: urlString`https://b.test`,
         });
         UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, networkRequest2);

         // Show the widget again
         const updatedViewInputWithCrossOriginContext = await expectViewUpdate(() => {
           panel.showWidget();
         });

         assert.isTrue(updatedViewInputWithCrossOriginContext.blockedByCrossOrigin);
         assert.strictEqual(updatedViewInputWithCrossOriginContext.selectedContext?.getItem(), networkRequest2);
       });
  });

  describe('auto agent selection for panels', () => {
    const tests: Array<{
      panel: {new (...args: any[]): UI.Panel.Panel},
      expectedConversationType: AiAssistance.ConversationType,
      featureFlagName: string,
    }> =
        [
          {
            panel: Elements.ElementsPanel.ElementsPanel,
            expectedConversationType: AiAssistance.ConversationType.STYLING,
            featureFlagName: 'devToolsFreestyler',
          },
          {
            panel: Network.NetworkPanel.NetworkPanel,
            expectedConversationType: AiAssistance.ConversationType.NETWORK,
            featureFlagName: 'devToolsAiAssistanceNetworkAgent',
          },
          {
            panel: Sources.SourcesPanel.SourcesPanel,
            expectedConversationType: AiAssistance.ConversationType.FILE,
            featureFlagName: 'devToolsAiAssistanceFileAgent',
          },
          {
            panel: Timeline.TimelinePanel.TimelinePanel,
            expectedConversationType: AiAssistance.ConversationType.PERFORMANCE,
            featureFlagName: 'devToolsAiAssistancePerformanceAgent',
          }
        ];

    for (const test of tests) {
      it(`should select ${test.expectedConversationType} conversation when the panel ${test.panel.name} is opened`,
          async () => {
            updateHostConfig({
              [test.featureFlagName]: {
                enabled: true,
              },
            });
            UI.Context.Context.instance().setFlavor(test.panel, sinon.createStubInstance(test.panel));

            const {initialViewInput} = await createAiAssistancePanel({
              aidaClient: mockAidaClient([[{explanation: 'test'}]]),
            });

            assert.strictEqual(initialViewInput.conversationType, test.expectedConversationType);
          });

      it(`should reset the conversation when ${test.panel.name} is closed and no other panels are open`, async () => {
        updateHostConfig({
          [test.featureFlagName]: {
            enabled: true,
          },
        });

        UI.Context.Context.instance().setFlavor(test.panel, sinon.createStubInstance(test.panel));

        const {initialViewInput, expectViewUpdate} = await createAiAssistancePanel();

        assert.strictEqual(initialViewInput.conversationType, test.expectedConversationType);

        const updatedViewInput = await expectViewUpdate(() => {
          UI.Context.Context.instance().setFlavor(test.panel, null);
        });
        assert.isUndefined(updatedViewInput.conversationType);
      });

      it(`should render no conversation state if the ${
             test.panel.name} panel is changed and the feature is not enabled`,
          async () => {
            updateHostConfig({
              [test.featureFlagName]: {
                enabled: false,
              },
            });
            UI.Context.Context.instance().setFlavor(test.panel, sinon.createStubInstance(test.panel));
            const {initialViewInput} = await createAiAssistancePanel();

            assert.isUndefined(initialViewInput.conversationType);
          });
    }

    describe('Performance Insight agent', () => {
      it('should select the PERFORMANCE_INSIGHT agent when the performance panel is open and insights are enabled',
         async () => {
           updateHostConfig({
             devToolsAiAssistancePerformanceAgent: {
               enabled: true,
               insightsEnabled: true,
             },
           });
           UI.Context.Context.instance().setFlavor(
               Timeline.TimelinePanel.TimelinePanel, sinon.createStubInstance(Timeline.TimelinePanel.TimelinePanel));
           const {initialViewInput} = await createAiAssistancePanel();

           assert.strictEqual(initialViewInput.conversationType, AiAssistance.ConversationType.PERFORMANCE_INSIGHT);
         });
    });
  });

  it('erases previous partial response on blocked error', async () => {
    const {initialViewInput, panel, expectViewUpdate} = await createAiAssistancePanel({
      aidaClient: mockAidaClient([[{
        explanation: 'This is the first part of the answer.',
        metadata: {attributionMetadata: {attributionAction: Host.AidaClient.RecitationAction.BLOCK, citations: []}}
      }]]),
    });
    const updatedViewInput = await expectViewUpdate(() => {
      panel.handleAction('freestyler.elements-floating-button');
      initialViewInput.onTextSubmit('test');
    });

    assert.deepEqual(updatedViewInput.messages, [
      {
        entity: AiAssistance.ChatMessageEntity.USER,
        text: 'test',
        imageInput: undefined,
      },
      {
        answer: undefined,
        entity: AiAssistance.ChatMessageEntity.MODEL,
        rpcId: undefined,
        error: AiAssistance.ErrorType.BLOCK,
        steps: [],
      },
    ]);
  });

  describe('chat input', () => {
    describe('disabled state', () => {
      it('should be disabled when ai assistance enabled setting is disabled and show followTheSteps placeholder',
         async () => {
           Common.Settings.moduleSetting('ai-assistance-enabled').setDisabled(true);

           const {initialViewInput} = await createAiAssistancePanel();

           assert.isTrue(initialViewInput.isTextInputDisabled);
           assert.strictEqual(initialViewInput.inputPlaceholder, 'Follow the steps above to ask a question');
           assert.strictEqual(
               initialViewInput.disclaimerText, 'This is an experimental AI feature and won\'t always get it right.');
         });

      it('should be disabled when ai assistance setting is marked as false and show followTheSteps placeholder',
         async () => {
           Common.Settings.moduleSetting('ai-assistance-enabled').set(false);

           const {initialViewInput} = await createAiAssistancePanel();

           assert.isTrue(initialViewInput.isTextInputDisabled);
           assert.strictEqual(initialViewInput.inputPlaceholder, 'Follow the steps above to ask a question');
           assert.strictEqual(
               initialViewInput.disclaimerText, 'This is an experimental AI feature and won\'t always get it right.');
         });

      it('should be disabled when the user is blocked by age and show followTheSteps placeholder', async () => {
        Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
        updateHostConfig({
          aidaAvailability: {
            blockedByAge: true,
          },
        });

        const {initialViewInput} = await createAiAssistancePanel();

        assert.isTrue(initialViewInput.isTextInputDisabled);
        assert.strictEqual(initialViewInput.inputPlaceholder, 'Follow the steps above to ask a question');
        assert.strictEqual(
            initialViewInput.disclaimerText, 'This is an experimental AI feature and won\'t always get it right.');
      });

      it('should be disabled when Aida availability status is not AVAILABLE', async () => {
        Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
        const {initialViewInput} =
            await createAiAssistancePanel({aidaAvailability: Host.AidaClient.AidaAccessPreconditions.NO_INTERNET});

        assert.isTrue(initialViewInput.isTextInputDisabled);
      });

      it('should be disabled when the next message is blocked by cross origin and show crossOriginError placeholder',
         async () => {
           Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
           const networkRequest = createNetworkRequest({
             url: urlString`https://a.test`,
           });
           UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, networkRequest);

           const {panel, expectViewUpdate} = await createAiAssistancePanel({
             aidaClient: mockAidaClient([
               [{explanation: 'test'}],
             ]),
           });
           const updatedViewInput = await expectViewUpdate(() => {
             panel.handleAction('drjones.network-floating-button');
           });

           assert.isFalse(updatedViewInput.blockedByCrossOrigin);
           assert.strictEqual(updatedViewInput.selectedContext?.getItem(), networkRequest);

           // Send a query for https://a.test.
           await expectViewUpdate(() => {
             panel.handleAction('drjones.network-floating-button');
             updatedViewInput.onTextSubmit('test');
           });

           // Change context to https://b.test.
           const networkRequest2 = createNetworkRequest({
             url: urlString`https://b.test`,
           });
           UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, networkRequest2);

           const updatedViewInputWithCrossOriginContext = await expectViewUpdate(() => {
             panel.handleAction('drjones.network-floating-button');
           });

           assert.isTrue(updatedViewInputWithCrossOriginContext.blockedByCrossOrigin);
           assert.isTrue(updatedViewInputWithCrossOriginContext.isTextInputDisabled);
           assert.strictEqual(
               updatedViewInputWithCrossOriginContext.inputPlaceholder,
               'To talk about data from another origin, start a new chat');
         });

      it('should be disabled when there is no selected context and show inputPlaceholderForStylingNoContext',
         async () => {
           updateHostConfig({
             devToolsFreestyler: {
               enabled: true,
             },
           });
           Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
           const {panel, expectViewUpdate} =
               await createAiAssistancePanel({aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE});
           const updatedViewInput = await expectViewUpdate(() => {
             panel.handleAction('freestyler.elements-floating-button');
           });

           assert.isNull(updatedViewInput.selectedContext);
           assert.isTrue(updatedViewInput.isTextInputDisabled);
           assert.strictEqual(updatedViewInput.inputPlaceholder, 'Select an element to ask a question');
         });
    });
  });

  describe('multimodal input', () => {
    function mockScreenshotModel() {
      const target = createTarget();
      const screenCaptureModel = target.model(SDK.ScreenCaptureModel.ScreenCaptureModel);
      assert.exists(screenCaptureModel);
      return {
        captureScreenshotStub:
            sinon.stub(screenCaptureModel, 'captureScreenshot').returns(Promise.resolve('imageInput')),
      };
    }

    it('multimodal related functions unavailable when multimodal is disabled', async () => {
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
          multimodal: false,
        },
      });
      UI.Context.Context.instance().setFlavor(
          Elements.ElementsPanel.ElementsPanel, sinon.createStubInstance(Elements.ElementsPanel.ElementsPanel));
      const {initialViewInput} = await createAiAssistancePanel();

      assert.isFalse(initialViewInput.multimodalInputEnabled);
      assert.notExists(initialViewInput.onTakeScreenshot);
      assert.notExists(initialViewInput.onRemoveImageInput);
      assert.isEmpty(initialViewInput.imageInput);
    });

    it('adds an image input and then removes it', async () => {
      const {captureScreenshotStub} = mockScreenshotModel();
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
          multimodal: true,
        },
      });
      UI.Context.Context.instance().setFlavor(
          Elements.ElementsPanel.ElementsPanel, sinon.createStubInstance(Elements.ElementsPanel.ElementsPanel));
      const {initialViewInput, expectViewUpdate} = await createAiAssistancePanel();

      assert.isTrue(initialViewInput.multimodalInputEnabled);

      const updatedViewInput = await expectViewUpdate(() => {
        initialViewInput.onTakeScreenshot?.();
      });

      expect(captureScreenshotStub.calledOnce);
      assert.deepEqual(updatedViewInput.imageInput, 'imageInput');

      const updatedViewInputAfterImageRemoval = await expectViewUpdate(() => {
        updatedViewInput.onRemoveImageInput?.();
      });
      assert.isEmpty(updatedViewInputAfterImageRemoval.imageInput);
    });

    it('sends image as input', async () => {
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
          multimodal: true,
        },
      });
      UI.Context.Context.instance().setFlavor(
          Elements.ElementsPanel.ElementsPanel, sinon.createStubInstance(Elements.ElementsPanel.ElementsPanel));
      const {initialViewInput, expectViewUpdate} =
          await createAiAssistancePanel({aidaClient: mockAidaClient([[{explanation: 'test'}]])});

      assert.isTrue(initialViewInput.multimodalInputEnabled);

      const updatedViewInput = await expectViewUpdate(() => {
        initialViewInput.onTextSubmit('test', {inlineData: {data: 'imageInput', mimeType: 'image/jpeg'}});
      });

      assert.deepEqual(updatedViewInput.messages, [
        {
          entity: AiAssistance.ChatMessageEntity.USER,
          text: 'test',
          imageInput: {inlineData: {data: 'imageInput', mimeType: 'image/jpeg'}}
        },
        {
          answer: 'test',
          entity: AiAssistance.ChatMessageEntity.MODEL,
          rpcId: undefined,
          suggestions: undefined,
          steps: [],
        },
      ]);
    });
  });
});
