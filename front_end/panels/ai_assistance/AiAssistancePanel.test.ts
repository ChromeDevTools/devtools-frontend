// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {
  createAiAssistancePanel,
  createNetworkRequest,
  detachPanels,
  mockAidaClient
} from '../../testing/AiAssistanceHelpers.js';
import {findMenuItemWithLabel, getMenu} from '../../testing/ContextMenuHelpers.js';
import {dispatchClickEvent} from '../../testing/DOMHelpers.js';
import {createTarget, registerNoopActions, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
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
    detachPanels();
  });

  describe('consent view', () => {
    it('should render consent view when the consent is not given before', async () => {
      const {view} = await createAiAssistancePanel();
      sinon.assert.calledWith(view.lastCall, sinon.match({state: AiAssistance.State.CONSENT_VIEW}));
    });

    it('should switch from consent view to chat view when enabling setting', async () => {
      const {view, expectViewUpdate} = await createAiAssistancePanel();
      sinon.assert.calledWith(view.lastCall, sinon.match({state: AiAssistance.State.CONSENT_VIEW}));
      await expectViewUpdate(() => {
        Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
      });
      sinon.assert.calledWith(view.lastCall, sinon.match({state: AiAssistance.State.CHAT_VIEW}));
    });

    it('should render chat view when the consent is given before', async () => {
      Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
      const {view} = await createAiAssistancePanel();
      sinon.assert.calledWith(view.lastCall, sinon.match({state: AiAssistance.State.CHAT_VIEW}));
    });

    it('should render the consent view when the setting is disabled', async () => {
      Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
      Common.Settings.moduleSetting('ai-assistance-enabled').setDisabled(true);
      const {view} = await createAiAssistancePanel();
      sinon.assert.calledWith(view.lastCall, sinon.match({state: AiAssistance.State.CONSENT_VIEW}));
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

      const {view} = await createAiAssistancePanel();
      sinon.assert.calledWith(view.lastCall, sinon.match({state: AiAssistance.State.CONSENT_VIEW}));
    });

    it('updates when the user logs in', async () => {
      Common.Settings.moduleSetting('ai-assistance-enabled').set(true);

      const {view, expectViewUpdate} =
          await createAiAssistancePanel({aidaAvailability: Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL});
      sinon.assert.calledWith(view.lastCall, sinon.match({
        state: AiAssistance.State.CHAT_VIEW,
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL,
      }));

      sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions')
          .returns(Promise.resolve(Host.AidaClient.AidaAccessPreconditions.AVAILABLE));

      await expectViewUpdate(() => {
        Host.AidaClient.HostConfigTracker.instance().dispatchEventToListeners(
            Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED);
      });

      // TODO: how do we wait for setting update to propagate?
      await new Promise(resolve => setTimeout(resolve, 0));
      sinon.assert.calledWith(view.lastCall, sinon.match({
        state: AiAssistance.State.CHAT_VIEW,
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      }));
    });
  });

  describe('rating', () => {
    it('renders a button linking to settings', async () => {
      const stub = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView');
      const {panel} = await createAiAssistancePanel();
      const button = panel.contentElement.querySelector('devtools-button[aria-label=\'Settings\']');
      assert.instanceOf(button, HTMLElement);
      button.click();
      assert.isTrue(stub.calledWith('chrome-ai'));
    });

    it('should allow logging if configured', async () => {
      updateHostConfig({
        aidaAvailability: {
          disallowLogging: false,
        },
      });
      const {view, aidaClient} = await createAiAssistancePanel();
      await view.lastCall.args[0].onFeedbackSubmit(0, Host.AidaClient.Rating.POSITIVE);
      sinon.assert.match((aidaClient.registerClientEvent as sinon.SinonStub).firstCall.firstArg, sinon.match({
        disable_user_content_logging: false,
      }));
    });

    it('should send POSITIVE rating to aida client when the user clicks on positive rating', async () => {
      updateHostConfig({
        aidaAvailability: {
          enabled: true,
          disallowLogging: true,
        }
      });
      const RPC_ID = 999;

      const {view, aidaClient} = await createAiAssistancePanel();
      await view.lastCall.args[0].onFeedbackSubmit(RPC_ID, Host.AidaClient.Rating.POSITIVE);

      sinon.assert.match((aidaClient.registerClientEvent as sinon.SinonStub).firstCall.firstArg, sinon.match({
        corresponding_aida_rpc_global_id: RPC_ID,
        do_conversation_client_event: {
          user_feedback: {
            sentiment: 'POSITIVE',
          },
        },
        disable_user_content_logging: true,
      }));
    });

    it('should send NEGATIVE rating to aida client when the user clicks on negative rating', async () => {
      updateHostConfig({
        aidaAvailability: {
          enabled: true,
          disallowLogging: true,
        }
      });
      const RPC_ID = 0;
      const {view, aidaClient} = await createAiAssistancePanel();
      await view.lastCall.args[0].onFeedbackSubmit(RPC_ID, Host.AidaClient.Rating.NEGATIVE);

      sinon.assert.match((aidaClient.registerClientEvent as sinon.SinonStub).firstCall.firstArg, sinon.match({
        corresponding_aida_rpc_global_id: RPC_ID,
        do_conversation_client_event: {
          user_feedback: {
            sentiment: 'NEGATIVE',
          },
        },
        disable_user_content_logging: true,
      }));
    });

    it('should send feedback text with data', async () => {
      updateHostConfig({
        aidaAvailability: {
          enabled: true,
          disallowLogging: true,
        }
      });

      const feedback = 'This helped me a ton.';
      const RPC_ID = 0;
      const {view, aidaClient} = await createAiAssistancePanel();
      await view.lastCall.args[0].onFeedbackSubmit(RPC_ID, Host.AidaClient.Rating.POSITIVE, feedback);

      sinon.assert.match((aidaClient.registerClientEvent as sinon.SinonStub).firstCall.firstArg, sinon.match({
        corresponding_aida_rpc_global_id: RPC_ID,
        do_conversation_client_event: {
          user_feedback: {
            sentiment: 'POSITIVE',
            user_input: {
              comment: feedback,
            },
          },
        },
        disable_user_content_logging: true,
      }));
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
        const [{selectedContext}] = await expectViewUpdate(() => {
          UI.Context.Context.instance().setFlavor(test.flavor, contextItem);
          panel.handleAction(test.action);
        });
        expect(selectedContext?.getItem()).equals(contextItem);
      });

      it(`should update the selected ${test.flavor.name} context whenever flavor changes`, async () => {
        const {view, panel, expectViewUpdate} = await createAiAssistancePanel();
        const [{selectedContext: selectedContextWithoutFlavor}] = await expectViewUpdate(() => {
          panel.handleAction(test.action);
        });
        expect(selectedContextWithoutFlavor?.getItem()).equals(undefined);

        sinon.assert.calledWith(view.lastCall, sinon.match({
          selectedContext: null,
        }));
        const context = test.createContext();
        const contextItem = context.getItem();
        if (!contextItem) {
          throw new Error('Context is not available');
        }
        UI.Context.Context.instance().setFlavor(test.flavor, contextItem);
        const [{selectedContext}] = await expectViewUpdate(() => {
          UI.Context.Context.instance().setFlavor(test.flavor, contextItem);
        });
        expect(selectedContext?.getItem()).equals(contextItem);
      });

      it(`should ignore ${test.flavor.name} flavor change after the panel was hidden`, async () => {
        const {view, panel} = await createAiAssistancePanel();
        sinon.assert.calledWith(view.lastCall, sinon.match({
          selectedContext: null,
        }));
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
      const {view, panel} = await createAiAssistancePanel();
      panel.handleAction('freestyler.elements-floating-button');
      sinon.assert.calledWith(view.lastCall, sinon.match({
        selectedContext: null,
      }));

      const node = sinon.createStubInstance(SDK.DOMModel.DOMNode, {
        nodeType: Node.COMMENT_NODE,
      });
      UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);

      sinon.assert.calledWith(view.lastCall, sinon.match({
        selectedContext: null,
      }));
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
      const [{inspectElementToggled}] = await expectViewUpdate(() => {
        toggleSearchElementAction.setToggled(true);
      });
      assert.isTrue(inspectElementToggled);
    });

    it('should update inspectElementToggled when the action is toggled', async () => {
      const {view, expectViewUpdate} = await createAiAssistancePanel();
      assert.isFalse(view.lastCall.args[0]?.inspectElementToggled);

      const [{inspectElementToggled}] = await expectViewUpdate(() => {
        toggleSearchElementAction.setToggled(true);
      });
      assert.isTrue(inspectElementToggled);
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

  describe('history interactions', () => {
    it('should have empty messages after new chat', async () => {
      const {panel, expectViewUpdate} =
          await createAiAssistancePanel({aidaClient: mockAidaClient([[{explanation: 'test'}]])});

      const [{onTextSubmit}] = await expectViewUpdate(() => {
        panel.handleAction('freestyler.elements-floating-button');
      });

      const [{messages}] = await expectViewUpdate(() => {
        void onTextSubmit('test');
      });

      assert.deepEqual(messages, [
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

      const [{messages: messagesAfterNewChat}] = await expectViewUpdate(() => {
        // TODO: remove DOM access
        const button = panel.contentElement.querySelector('devtools-button[aria-label=\'New chat\']');
        assert.instanceOf(button, HTMLElement);
        dispatchClickEvent(button);
      });

      assert.deepEqual(messagesAfterNewChat, []);
    });

    it('should select default agent after new chat', async () => {
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
        },
      });
      const {panel, expectViewUpdate} =
          await createAiAssistancePanel({aidaClient: mockAidaClient([[{explanation: 'test'}]])});

      const [{onTextSubmit}] = await expectViewUpdate(() => {
        panel.handleAction('freestyler.elements-floating-button');
      });

      UI.Context.Context.instance().setFlavor(
          Elements.ElementsPanel.ElementsPanel, sinon.createStubInstance(Elements.ElementsPanel.ElementsPanel));

      const [{messages}] = await expectViewUpdate(() => {
        void onTextSubmit('test');
      });

      assert.deepEqual(messages, [
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
      const [{messages: messagesAfterNewChat, agentType}] = await expectViewUpdate(() => {
        // TODO: remove DOM access
        const button = panel.contentElement.querySelector('devtools-button[aria-label=\'New chat\']');
        assert.instanceOf(button, HTMLElement);
        dispatchClickEvent(button);
      });

      assert.deepEqual(messagesAfterNewChat, []);
      assert.deepEqual(agentType, AiAssistance.AgentType.STYLING);
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

      const [{onTextSubmit}] = await expectViewUpdate(() => {
        panel.handleAction('freestyler.elements-floating-button');
      });

      const [{messages}] = await expectViewUpdate(() => {
        void onTextSubmit('test');
      });

      UI.Context.Context.instance().setFlavor(
          Timeline.TimelinePanel.TimelinePanel, sinon.createStubInstance(Timeline.TimelinePanel.TimelinePanel));

      assert.deepEqual(messages, [
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
      const [{messages: messagesAfterNewChat, agentType}] = await expectViewUpdate(() => {
        // TODO: remove DOM access
        const button = panel.contentElement.querySelector('devtools-button[aria-label=\'New chat\']');
        assert.instanceOf(button, HTMLElement);
        dispatchClickEvent(button);
      });

      assert.deepEqual(messagesAfterNewChat, []);
      assert.deepEqual(agentType, AiAssistance.AgentType.PERFORMANCE_INSIGHT);
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

      const [{onTextSubmit}] = await expectViewUpdate(() => {
        panel.handleAction('freestyler.elements-floating-button');
      });

      const [{messages}] = await expectViewUpdate(() => {
        void onTextSubmit('test');
      });

      UI.Context.Context.instance().setFlavor(
          Timeline.TimelinePanel.TimelinePanel, sinon.createStubInstance(Timeline.TimelinePanel.TimelinePanel));

      assert.deepEqual(messages, [
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
      const [{messages: messagesAfterNewChat, agentType}] = await expectViewUpdate(() => {
        // TODO: remove DOM access
        const button = panel.contentElement.querySelector('devtools-button[aria-label=\'New chat\']');
        assert.instanceOf(button, HTMLElement);
        dispatchClickEvent(button);
      });

      assert.deepEqual(messagesAfterNewChat, []);
      assert.deepEqual(agentType, AiAssistance.AgentType.PERFORMANCE);
    });

    it('should switch agents and restore history', async () => {
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
          multimodal: true,
        },
      });
      const {view, panel, expectViewUpdate} = await createAiAssistancePanel(
          {aidaClient: mockAidaClient([[{explanation: 'test'}], [{explanation: 'test2'}]])});
      await expectViewUpdate(() => {
        panel.handleAction('freestyler.elements-floating-button');
      });
      const imageInput = {inlineData: {data: 'imageinputbytes', mimeType: 'image/jpeg'}};
      await view.lastCall.args[0].onTextSubmit('User question to Freestyler?', imageInput);
      assert.deepEqual(view.lastCall.args[0].messages, [
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

      await expectViewUpdate(() => {
        panel.handleAction('drjones.network-floating-button');
      });
      await view.lastCall.args[0].onTextSubmit('User question to DrJones?');
      assert.deepEqual(view.lastCall.args[0].messages, [
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

      // TODO: this should not look into DOM.
      const button = panel.contentElement.querySelector('devtools-button[aria-label=\'History\']');
      assert.instanceOf(button, HTMLElement);
      const contextMenu = getMenu(() => {
        dispatchClickEvent(button);
      });
      const freestylerEntry = findMenuItemWithLabel(contextMenu.defaultSection(), 'User question to Freestyler?')!;
      assert.isDefined(freestylerEntry);
      await expectViewUpdate(() => {
        contextMenu.invokeHandler(freestylerEntry.id());
      });
      // Currently history should not store image input
      assert.deepEqual(view.lastCall.args[0].messages, [
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
      const {view} = await createAiAssistancePanel({
        aidaClient: mockAidaClient([[
          {explanation: 'ANSWER: partially started'}, {explanation: 'ANSWER: partially started and now it\'s finished'}
        ]])
      });
      // Trigger running the conversation (observe that there are two answers: one partial, one complete)
      await view.lastCall.args[0].onTextSubmit('User question to Freestyler?');

      sinon.assert.calledWith(
          addHistoryItemStub, sinon.match({type: 'answer', text: 'partially started and now it\'s finished'}));
      sinon.assert.neverCalledWith(addHistoryItemStub, sinon.match({type: 'answer', text: 'partially started'}));
    });
  });

  it('should have empty state after clear chat', async () => {
    const {panel, expectViewUpdate} =
        await createAiAssistancePanel({aidaClient: mockAidaClient([[{explanation: 'test'}]])});

    const [{onTextSubmit}] = await expectViewUpdate(() => {
      panel.handleAction('freestyler.elements-floating-button');
    });

    const [{messages: messagesBeforeClear}] = await expectViewUpdate(() => {
      void onTextSubmit('test');
    });
    assert.deepEqual(messagesBeforeClear, [
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

    const [{messages: messagesAfterClear, agentType}] = await expectViewUpdate(() => {
      // TODO: remove DOM lookup.
      const button = panel.contentElement.querySelector('devtools-button[aria-label=\'Delete local chat\']');
      assert.instanceOf(button, HTMLElement);
      dispatchClickEvent(button);
    });
    assert.deepEqual(messagesAfterClear, []);
    assert.isUndefined(agentType);
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
    const [{onTextSubmit}] = await expectViewUpdate(() => {
      panel.handleAction('freestyler.elements-floating-button');
    });
    const [{messages: messagesBeforeClear}] = await expectViewUpdate(() => {
      void onTextSubmit('test');
    });
    assert.deepEqual(messagesBeforeClear, [
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
    const [{messages: messagesAfterClear, agentType}] = await expectViewUpdate(() => {
      // TODO: remove DOM lookup.
      const button = panel.contentElement.querySelector('devtools-button[aria-label=\'Delete local chat\']');
      assert.instanceOf(button, HTMLElement);
      dispatchClickEvent(button);
    });
    assert.deepEqual(messagesAfterClear, []);
    assert.deepEqual(agentType, AiAssistance.AgentType.STYLING);
  });

  it('should have empty state after clear chat history', async () => {
    const {view, panel, expectViewUpdate} = await createAiAssistancePanel(
        {aidaClient: mockAidaClient([[{explanation: 'test'}], [{explanation: 'test2'}]])});

    const [{onTextSubmit}] = await expectViewUpdate(() => {
      panel.handleAction('freestyler.elements-floating-button');
    });
    const [{messages: messagesToStyling}] = await expectViewUpdate(() => {
      void onTextSubmit('User question to Freestyler?');
    });
    assert.deepEqual(messagesToStyling, [
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

    {
      const [{onTextSubmit}] = await expectViewUpdate(() => {
        panel.handleAction('drjones.network-floating-button');
      });
      const [{messages: messagesToNetwork}] = await expectViewUpdate(() => {
        void onTextSubmit('User question to DrJones?');
      });
      assert.deepEqual(messagesToNetwork, [
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
    }

    // TODO: remove poking into DOM.
    let button = panel.contentElement.querySelector('devtools-button[aria-label=\'History\']');
    assert.instanceOf(button, HTMLElement);
    let contextMenu = getMenu(() => {
      dispatchClickEvent(button!);
    });
    const clearAll = findMenuItemWithLabel(contextMenu.footerSection(), 'Clear local chats')!;
    assert.isDefined(clearAll);
    await expectViewUpdate(() => {
      contextMenu.invokeHandler(clearAll.id());
    });
    assert.deepEqual(view.lastCall.args[0].messages, []);
    assert.isUndefined(view.lastCall.args[0].agentType);

    contextMenu.discard();

    button = panel.contentElement.querySelector('devtools-button[aria-label=\'History\']');
    assert.instanceOf(button, HTMLElement);
    contextMenu = getMenu(() => {
      dispatchClickEvent(button);
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

      const {view, panel, expectViewUpdate} = await createAiAssistancePanel({
        aidaClient: mockAidaClient([
          [{explanation: 'test'}],
        ])
      });
      await expectViewUpdate(() => {
        panel.handleAction('drjones.network-floating-button');
      });

      sinon.assert.calledWith(view, sinon.match({
        selectedContext: new AiAssistance.RequestContext(networkRequest),
        blockedByCrossOrigin: false,
      }));

      // Send a query for https://a.test.
      await expectViewUpdate(() => {
        panel.handleAction('drjones.network-floating-button');
        void view.lastCall.args[0].onTextSubmit('test');
      });

      // Change context to https://b.test.
      const networkRequest2 = createNetworkRequest({
        url: urlString`https://b.test`,
      });
      UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, networkRequest2);

      await expectViewUpdate(() => {
        panel.handleAction('drjones.network-floating-button');
      });

      sinon.assert.calledWith(view.lastCall, sinon.match({
        selectedContext: new AiAssistance.RequestContext(networkRequest2),
        blockedByCrossOrigin: true,
      }));
    });

    it('should be able to continue same-origin requests', async () => {
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
        },
      });

      const {view, panel, expectViewUpdate} = await createAiAssistancePanel({
        aidaClient: mockAidaClient([[{explanation: 'test'}], [{explanation: 'test2'}]]),
      });
      UI.Context.Context.instance().setFlavor(
          Elements.ElementsPanel.ElementsPanel, sinon.createStubInstance(Elements.ElementsPanel.ElementsPanel));

      await expectViewUpdate(() => {
        panel.handleAction('freestyler.elements-floating-button');
        void view.lastCall.args[0].onTextSubmit('test');
      });

      assert.deepEqual(view.lastCall.args[0].messages, [
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

      await expectViewUpdate(() => {
        panel.handleAction('freestyler.elements-floating-button');
        void view.lastCall.args[0].onTextSubmit('test2');
      });

      assert.isFalse(view.lastCall.args[0].isReadOnly);
      assert.deepEqual(view.lastCall.args[0].messages, [
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
  });

  describe('auto agent selection for panels', () => {
    describe('Elements panel', () => {
      it('should select FREESTYLER agent when the Elements panel is open in initial render', async () => {
        updateHostConfig({
          devToolsFreestyler: {
            enabled: true,
          },
        });
        UI.Context.Context.instance().setFlavor(
            Elements.ElementsPanel.ElementsPanel, sinon.createStubInstance(Elements.ElementsPanel.ElementsPanel));

        const {view} = await createAiAssistancePanel({
          aidaClient: mockAidaClient([[{explanation: 'test'}]]),
        });

        sinon.assert.calledWith(view, sinon.match({
          agentType: AiAssistance.AgentType.STYLING,
        }));
      });

      it('should update to no agent state when the Elements panel is closed and no other panels are open', async () => {
        updateHostConfig({
          devToolsFreestyler: {
            enabled: true,
          },
        });
        UI.Context.Context.instance().setFlavor(
            Elements.ElementsPanel.ElementsPanel, sinon.createStubInstance(Elements.ElementsPanel.ElementsPanel));
        const {view, expectViewUpdate} = await createAiAssistancePanel();

        sinon.assert.calledWith(view, sinon.match({
          agentType: AiAssistance.AgentType.STYLING,
        }));

        await expectViewUpdate(() => {
          UI.Context.Context.instance().setFlavor(Elements.ElementsPanel.ElementsPanel, null);
        });
        assert.isUndefined(view.lastCall.args[0].agentType);
      });

      it('should render no agent state when Elements panel is open but Freestyler is not enabled', async () => {
        updateHostConfig({
          devToolsFreestyler: {
            enabled: false,
          },
        });
        UI.Context.Context.instance().setFlavor(
            Elements.ElementsPanel.ElementsPanel, sinon.createStubInstance(Elements.ElementsPanel.ElementsPanel));
        const {view} = await createAiAssistancePanel();

        assert.isUndefined(view.lastCall.args[0].agentType);
      });
    });

    describe('Network panel', () => {
      it('should select DRJONES_NETWORK agent when the Network panel is open in initial render', async () => {
        updateHostConfig({
          devToolsAiAssistanceNetworkAgent: {
            enabled: true,
          },
        });
        UI.Context.Context.instance().setFlavor(
            Network.NetworkPanel.NetworkPanel, sinon.createStubInstance(Network.NetworkPanel.NetworkPanel));
        const {view} = await createAiAssistancePanel();

        sinon.assert.calledWith(view, sinon.match({
          agentType: AiAssistance.AgentType.NETWORK,
        }));
      });

      it('should update to no agent state when the Network panel is closed and no other panels are open', async () => {
        updateHostConfig({
          devToolsAiAssistanceNetworkAgent: {
            enabled: true,
          },
        });
        UI.Context.Context.instance().setFlavor(
            Network.NetworkPanel.NetworkPanel, sinon.createStubInstance(Network.NetworkPanel.NetworkPanel));
        const {view, expectViewUpdate} = await createAiAssistancePanel();

        sinon.assert.calledWith(view, sinon.match({
          agentType: AiAssistance.AgentType.NETWORK,
        }));

        await expectViewUpdate(() => {
          UI.Context.Context.instance().setFlavor(Network.NetworkPanel.NetworkPanel, null);
        });
        assert.isUndefined(view.lastCall.args[0].agentType);
      });

      it('should render no agent state when Network panel is open but devToolsAiAssistanceNetworkAgent is not enabled',
         async () => {
           updateHostConfig({
             devToolsAiAssistanceNetworkAgent: {
               enabled: false,
             },
           });
           UI.Context.Context.instance().setFlavor(
               Network.NetworkPanel.NetworkPanel, sinon.createStubInstance(Network.NetworkPanel.NetworkPanel));
           const {view} = await createAiAssistancePanel();

           assert.isUndefined(view.lastCall.args[0].agentType);
         });
    });

    describe('Sources panel', () => {
      it('should select DRJONES_FILE agent when the Sources panel is open in initial render', async () => {
        updateHostConfig({
          devToolsAiAssistanceFileAgent: {
            enabled: true,
          },
        });
        UI.Context.Context.instance().setFlavor(
            Sources.SourcesPanel.SourcesPanel, sinon.createStubInstance(Sources.SourcesPanel.SourcesPanel));
        const {view} = await createAiAssistancePanel();

        sinon.assert.calledWith(view, sinon.match({
          agentType: AiAssistance.AgentType.FILE,
        }));
      });

      it('should update to no agent state when the Sources panel is closed and no other panels are open', async () => {
        updateHostConfig({
          devToolsAiAssistanceFileAgent: {
            enabled: true,
          },
        });
        UI.Context.Context.instance().setFlavor(
            Sources.SourcesPanel.SourcesPanel, sinon.createStubInstance(Sources.SourcesPanel.SourcesPanel));
        const {view, expectViewUpdate} = await createAiAssistancePanel();
        sinon.assert.calledWith(view, sinon.match({
          agentType: AiAssistance.AgentType.FILE,
        }));

        await expectViewUpdate(() => {
          UI.Context.Context.instance().setFlavor(Sources.SourcesPanel.SourcesPanel, null);
        });
        assert.isUndefined(view.lastCall.args[0].agentType);
      });

      it('should render no agent state when Sources panel is open but devToolsAiAssistanceFileAgent is not enabled',
         async () => {
           updateHostConfig({
             devToolsAiAssistanceFileAgent: {
               enabled: false,
             },
           });
           UI.Context.Context.instance().setFlavor(
               Sources.SourcesPanel.SourcesPanel, sinon.createStubInstance(Sources.SourcesPanel.SourcesPanel));
           const {view} = await createAiAssistancePanel();

           assert.isUndefined(view.lastCall.args[0].agentType);
         });
    });

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
           const {view} = await createAiAssistancePanel();
           sinon.assert.calledWith(view, sinon.match({
             agentType: AiAssistance.AgentType.PERFORMANCE_INSIGHT,
           }));
         });
    });

    describe('Performance panel', () => {
      it('should select DRJONES_PERFORMANCE agent when the Performance panel is open in initial render', async () => {
        updateHostConfig({
          devToolsAiAssistancePerformanceAgent: {
            enabled: true,
          },
        });
        UI.Context.Context.instance().setFlavor(
            Timeline.TimelinePanel.TimelinePanel, sinon.createStubInstance(Timeline.TimelinePanel.TimelinePanel));
        const {view} = await createAiAssistancePanel();

        sinon.assert.calledWith(view, sinon.match({
          agentType: AiAssistance.AgentType.PERFORMANCE,
        }));
      });

      it('should update to no agent state when the Performance panel is closed and no other panels are open',
         async () => {
           updateHostConfig({
             devToolsAiAssistancePerformanceAgent: {
               enabled: true,
             },
           });
           UI.Context.Context.instance().setFlavor(
               Timeline.TimelinePanel.TimelinePanel, sinon.createStubInstance(Timeline.TimelinePanel.TimelinePanel));
           const {view, expectViewUpdate} = await createAiAssistancePanel();
           sinon.assert.calledWith(view, sinon.match({
             agentType: AiAssistance.AgentType.PERFORMANCE,
           }));

           await expectViewUpdate(() => {
             UI.Context.Context.instance().setFlavor(Timeline.TimelinePanel.TimelinePanel, null);
           });
           assert.isUndefined(view.lastCall.args[0].agentType);
         });

      it('should render no agent state when Performance panel is open but devToolsAiAssistancePerformanceAgent is not enabled',
         async () => {
           updateHostConfig({
             devToolsAiAssistancePerformanceAgent: {
               enabled: false,
             },
           });
           UI.Context.Context.instance().setFlavor(
               Timeline.TimelinePanel.TimelinePanel, sinon.createStubInstance(Timeline.TimelinePanel.TimelinePanel));
           const {view} = await createAiAssistancePanel();

           assert.isUndefined(view.lastCall.args[0].agentType);
         });
    });
  });

  it('erases previous partial response on blocked error', async () => {
    const {view, panel, expectViewUpdate} = await createAiAssistancePanel({
      aidaClient: mockAidaClient([[{
        explanation: 'This is the first part of the answer.',
        metadata: {attributionMetadata: {attributionAction: Host.AidaClient.RecitationAction.BLOCK, citations: []}}
      }]]),
    });
    await expectViewUpdate(() => {
      panel.handleAction('freestyler.elements-floating-button');
      void view.lastCall.args[0].onTextSubmit('test');
    });

    assert.deepEqual(view.lastCall.args[0].messages, [
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
      const {
        view,
      } = await createAiAssistancePanel();

      assert.isFalse(view.lastCall.args[0].multimodalInputEnabled);
      assert.notExists(view.lastCall.args[0].onTakeScreenshot);
      assert.notExists(view.lastCall.args[0].onRemoveImageInput);
      assert.isEmpty(view.lastCall.args[0].imageInput);
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
      const {view, expectViewUpdate} = await createAiAssistancePanel();

      assert.isTrue(view.lastCall.args[0].multimodalInputEnabled);

      const [{imageInput, onRemoveImageInput}] = await expectViewUpdate(() => {
        void view.lastCall.args[0].onTakeScreenshot?.();
      });

      expect(captureScreenshotStub.calledOnce);
      assert.deepEqual(imageInput, 'imageInput');

      {
        const [{imageInput}] = await expectViewUpdate(() => {
          onRemoveImageInput?.();
        });
        assert.isEmpty(imageInput);
      }
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
      const {view, expectViewUpdate} =
          await createAiAssistancePanel({aidaClient: mockAidaClient([[{explanation: 'test'}]])});

      assert.isTrue(view.lastCall.args[0].multimodalInputEnabled);

      const [{messages}] = await expectViewUpdate(() => {
        void view.lastCall.args[0].onTextSubmit('test', {inlineData: {data: 'imageInput', mimeType: 'image/jpeg'}});
      });

      assert.deepEqual(messages, [
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
