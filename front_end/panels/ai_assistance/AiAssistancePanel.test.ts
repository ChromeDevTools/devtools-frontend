// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {createAiAssistancePanel, detachPanels, mockAidaClient} from '../../testing/AiAssistanceHelpers.js';
import {findMenuItemWithLabel, getMenu} from '../../testing/ContextMenuHelpers.js';
import {dispatchClickEvent} from '../../testing/DOMHelpers.js';
import {createTarget, registerNoopActions, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ElementsPanel from '../elements/elements.js';
import * as NetworkPanel from '../network/network.js';
import * as SourcesPanel from '../sources/sources.js';
import * as TimelinePanel from '../timeline/timeline.js';
import * as TimelineUtils from '../timeline/utils/utils.js';

import * as AiAssistance from './ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describeWithMockConnection('AI Assistance Panel', () => {
  beforeEach(() => {
    registerNoopActions(['elements.toggle-element-search']);
    UI.Context.Context.instance().setFlavor(ElementsPanel.ElementsPanel.ElementsPanel, null);
    UI.Context.Context.instance().setFlavor(NetworkPanel.NetworkPanel.NetworkPanel, null);
    UI.Context.Context.instance().setFlavor(SourcesPanel.SourcesPanel.SourcesPanel, null);
    UI.Context.Context.instance().setFlavor(TimelinePanel.TimelinePanel.TimelinePanel, null);
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
      const {view, waitForRendering} = await createAiAssistancePanel();
      sinon.assert.calledWith(view.lastCall, sinon.match({state: AiAssistance.State.CONSENT_VIEW}));
      Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
      await waitForRendering();
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

      const {view, waitForRendering} =
          await createAiAssistancePanel({aidaAvailability: Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL});
      sinon.assert.calledWith(view.lastCall, sinon.match({
        state: AiAssistance.State.CHAT_VIEW,
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL,
      }));

      sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions')
          .returns(Promise.resolve(Host.AidaClient.AidaAccessPreconditions.AVAILABLE));
      Host.AidaClient.HostConfigTracker.instance().dispatchEventToListeners(
          Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED);
      await waitForRendering();
      sinon.assert.calledWith(view.lastCall, sinon.match({
        state: AiAssistance.State.CHAT_VIEW,
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      }));
    });
  });

  describe('on rate click', () => {
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
      view.lastCall.args[0].onFeedbackSubmit(0, Host.AidaClient.Rating.POSITIVE);
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
      view.lastCall.args[0].onFeedbackSubmit(RPC_ID, Host.AidaClient.Rating.POSITIVE);

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
      view.lastCall.args[0].onFeedbackSubmit(RPC_ID, Host.AidaClient.Rating.NEGATIVE);

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
      view.lastCall.args[0].onFeedbackSubmit(RPC_ID, Host.AidaClient.Rating.POSITIVE, feedback);

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

  describe('Contexts', () => {
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
        flavor: Workspace.UISourceCode.UISourceCode,
        createContext: () => {
          return new AiAssistance.FileContext(sinon.createStubInstance(Workspace.UISourceCode.UISourceCode));
        },
        action: 'drjones.sources-panel-context',
      }
    ];

    for (const test of tests) {
      it(`should use the selected ${test.flavor.name} context after the widget is shown`, async () => {
        const {view, panel, waitForRendering} = await createAiAssistancePanel();
        const context = test.createContext();
        const contextItem = context.getItem();
        if (!contextItem) {
          throw new Error('Context is not available');
        }
        UI.Context.Context.instance().setFlavor(test.flavor, contextItem);
        panel.handleAction(test.action);
        await waitForRendering();
        sinon.assert.calledWith(view.lastCall, sinon.match({
          selectedContext: context,
        }));
      });

      it(`should update the selected ${test.flavor.name} context whenever flavor changes`, async () => {
        const {view, panel, waitForRendering} = await createAiAssistancePanel();
        panel.handleAction(test.action);
        sinon.assert.calledWith(view.lastCall, sinon.match({
          selectedContext: null,
        }));
        const context = test.createContext();
        const contextItem = context.getItem();
        if (!contextItem) {
          throw new Error('Context is not available');
        }
        UI.Context.Context.instance().setFlavor(test.flavor, contextItem);
        await waitForRendering();
        sinon.assert.calledWith(view.lastCall, sinon.match({
          selectedContext: context,
        }));
      });

      it(`should ignore ${test.flavor.name} flavor change after the panel was hidden`, async () => {
        const {view, panel, waitForRendering} = await createAiAssistancePanel();
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
        await waitForRendering();
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
      const {view} = await createAiAssistancePanel();
      toggleSearchElementAction.setToggled(true);
      sinon.assert.calledWith(view.lastCall, sinon.match({inspectElementToggled: true}));
    });

    it('should update inspectElementToggled when the action is toggled', async () => {
      const {view} = await createAiAssistancePanel();
      toggleSearchElementAction.setToggled(false);

      sinon.assert.calledWith(view.lastCall, sinon.match({inspectElementToggled: false}));

      toggleSearchElementAction.setToggled(true);
      sinon.assert.calledWith(view.lastCall, sinon.match({inspectElementToggled: true}));
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
      const {view, panel, waitForRendering} =
          await createAiAssistancePanel({aidaClient: mockAidaClient([[{explanation: 'test'}]])});

      panel.handleAction('freestyler.elements-floating-button');
      view.lastCall.args[0].onTextSubmit('test');
      await waitForRendering();

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
      const button = panel.contentElement.querySelector('devtools-button[aria-label=\'New chat\']');
      assert.instanceOf(button, HTMLElement);
      dispatchClickEvent(button);
      assert.deepEqual(view.lastCall.args[0].messages, []);
    });

    it('should select default agent after new chat', async () => {
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
        },
      });
      const {view, panel, waitForRendering} =
          await createAiAssistancePanel({aidaClient: mockAidaClient([[{explanation: 'test'}]])});

      panel.handleAction('freestyler.elements-floating-button');
      view.lastCall.args[0].onTextSubmit('test');
      await waitForRendering();

      UI.Context.Context.instance().setFlavor(
          ElementsPanel.ElementsPanel.ElementsPanel,
          sinon.createStubInstance(ElementsPanel.ElementsPanel.ElementsPanel));

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
      const button = panel.contentElement.querySelector('devtools-button[aria-label=\'New chat\']');
      assert.instanceOf(button, HTMLElement);
      dispatchClickEvent(button);
      assert.deepEqual(view.lastCall.args[0].messages, []);
      assert.deepEqual(view.lastCall.args[0].agentType, AiAssistance.AgentType.STYLING);
    });

    it('should select the performance insights agent if it is enabled', async () => {
      updateHostConfig({
        devToolsAiAssistancePerformanceAgent: {
          enabled: true,
          insightsEnabled: true,
        },
      });
      const {view, panel, waitForRendering} =
          await createAiAssistancePanel({aidaClient: mockAidaClient([[{explanation: 'test'}]])});

      panel.handleAction('freestyler.elements-floating-button');
      view.lastCall.args[0].onTextSubmit('test');
      await waitForRendering();
      UI.Context.Context.instance().setFlavor(
          TimelinePanel.TimelinePanel.TimelinePanel,
          sinon.createStubInstance(TimelinePanel.TimelinePanel.TimelinePanel));

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
      const button = panel.contentElement.querySelector('devtools-button[aria-label=\'New chat\']');
      assert.instanceOf(button, HTMLElement);
      dispatchClickEvent(button);
      assert.deepEqual(view.lastCall.args[0].messages, []);
      assert.deepEqual(view.lastCall.args[0].agentType, AiAssistance.AgentType.PERFORMANCE_INSIGHT);
    });

    it('should select the Dr Jones performance agent if insights are not enabled', async () => {
      updateHostConfig({
        devToolsAiAssistancePerformanceAgent: {
          enabled: true,
          insightsEnabled: false,
        },
      });
      const {view, panel, waitForRendering} =
          await createAiAssistancePanel({aidaClient: mockAidaClient([[{explanation: 'test'}]])});

      panel.handleAction('freestyler.elements-floating-button');
      view.lastCall.args[0].onTextSubmit('test');
      await waitForRendering();
      UI.Context.Context.instance().setFlavor(
          TimelinePanel.TimelinePanel.TimelinePanel,
          sinon.createStubInstance(TimelinePanel.TimelinePanel.TimelinePanel));

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
      const button = panel.contentElement.querySelector('devtools-button[aria-label=\'New chat\']');
      assert.instanceOf(button, HTMLElement);
      dispatchClickEvent(button);
      assert.deepEqual(view.lastCall.args[0].messages, []);
      assert.deepEqual(view.lastCall.args[0].agentType, AiAssistance.AgentType.PERFORMANCE);
    });

    it('should switch agents and restore history', async () => {
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
          multimodal: true,
        },
      });
      const {view, panel, waitForRendering} = await createAiAssistancePanel(
          {aidaClient: mockAidaClient([[{explanation: 'test'}], [{explanation: 'test2'}]])});
      panel.handleAction('freestyler.elements-floating-button');
      const imageInput = {inlineData: {data: 'imageinputbytes', mimeType: 'image/jpeg'}};
      view.lastCall.args[0].onTextSubmit('User question to Freestyler?', imageInput);
      await waitForRendering();
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

      panel.handleAction('drjones.network-floating-button');
      view.lastCall.args[0].onTextSubmit('User question to DrJones?');
      await waitForRendering();
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

      const button = panel.contentElement.querySelector('devtools-button[aria-label=\'History\']');
      assert.instanceOf(button, HTMLElement);
      const contextMenu = getMenu(() => {
        dispatchClickEvent(button);
      });
      const freestylerEntry = findMenuItemWithLabel(contextMenu.defaultSection(), 'User question to Freestyler?')!;
      assert.isDefined(freestylerEntry);
      contextMenu.invokeHandler(freestylerEntry.id());

      await waitForRendering();
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
  });

  it('should have empty state after clear chat', async () => {
    const {view, panel, waitForRendering} =
        await createAiAssistancePanel({aidaClient: mockAidaClient([[{explanation: 'test'}]])});
    panel.handleAction('freestyler.elements-floating-button');
    view.lastCall.args[0].onTextSubmit('test');
    await waitForRendering();

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
    const button = panel.contentElement.querySelector('devtools-button[aria-label=\'Delete local chat\']');
    assert.instanceOf(button, HTMLElement);
    dispatchClickEvent(button);
    assert.deepEqual(view.lastCall.args[0].messages, []);
    assert.isUndefined(view.lastCall.args[0].agentType);
  });

  it('should select default agent based on open panel after clearing the chat', async () => {
    updateHostConfig({
      devToolsFreestyler: {
        enabled: true,
      },
    });
    const {view, panel, waitForRendering} =
        await createAiAssistancePanel({aidaClient: mockAidaClient([[{explanation: 'test'}]])});
    panel.handleAction('freestyler.elements-floating-button');
    view.lastCall.args[0].onTextSubmit('test');
    await waitForRendering();

    UI.Context.Context.instance().setFlavor(
        ElementsPanel.ElementsPanel.ElementsPanel, sinon.createStubInstance(ElementsPanel.ElementsPanel.ElementsPanel));
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
    const button = panel.contentElement.querySelector('devtools-button[aria-label=\'Delete local chat\']');
    assert.instanceOf(button, HTMLElement);
    dispatchClickEvent(button);
    assert.deepEqual(view.lastCall.args[0].messages, []);
    assert.deepEqual(view.lastCall.args[0].agentType, AiAssistance.AgentType.STYLING);
  });

  it('should have empty state after clear chat history', async () => {
    const {view, panel, waitForRendering} = await createAiAssistancePanel(
        {aidaClient: mockAidaClient([[{explanation: 'test'}], [{explanation: 'test2'}]])});
    panel.handleAction('freestyler.elements-floating-button');
    view.lastCall.args[0].onTextSubmit('User question to Freestyler?');
    await waitForRendering();
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

    panel.handleAction('drjones.network-floating-button');
    view.lastCall.args[0].onTextSubmit('User question to DrJones?');
    await waitForRendering();
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

    let button = panel.contentElement.querySelector('devtools-button[aria-label=\'History\']');
    assert.instanceOf(button, HTMLElement);
    let contextMenu = getMenu(() => {
      dispatchClickEvent(button!);
    });
    const clearAll = findMenuItemWithLabel(contextMenu.footerSection(), 'Clear local chats')!;
    assert.isDefined(clearAll);
    contextMenu.invokeHandler(clearAll.id());
    await waitForRendering();
    assert.deepEqual(view.lastCall.args[0].messages, []);
    assert.isUndefined(view.lastCall.args[0].agentType);

    await waitForRendering();
    contextMenu.discard();
    await waitForRendering();

    button = panel.contentElement.querySelector('devtools-button[aria-label=\'History\']');
    assert.instanceOf(button, HTMLElement);
    contextMenu = getMenu(() => {
      dispatchClickEvent(button);
    });
    const menuItem = findMenuItemWithLabel(contextMenu.defaultSection(), 'No past conversations');
    assert(menuItem);
  });

  describe('cross-origin', () => {
    it('blocks input on cross origin requests', async () => {
      const networkRequest = sinon.createStubInstance(SDK.NetworkRequest.NetworkRequest, {
        url: urlString`https://a.test`,
      });
      UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, networkRequest);

      const {view, panel, waitForRendering} = await createAiAssistancePanel({
        aidaClient: mockAidaClient([
          [{explanation: 'test'}],
        ])
      });
      panel.handleAction('drjones.network-floating-button');

      sinon.assert.calledWith(view, sinon.match({
        selectedContext: new AiAssistance.RequestContext(networkRequest),
        blockedByCrossOrigin: false,
      }));

      // Send a query for https://a.test.
      panel.handleAction('drjones.network-floating-button');
      view.lastCall.args[0].onTextSubmit('test');
      await waitForRendering();

      // Change context to https://b.test.
      const networkRequest2 = sinon.createStubInstance(SDK.NetworkRequest.NetworkRequest, {
        url: urlString`https://b.test`,
      });
      UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, networkRequest2);
      panel.handleAction('drjones.network-floating-button');
      await waitForRendering();

      sinon.assert.calledWith(view, sinon.match({
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

      const {view, panel, waitForRendering} = await createAiAssistancePanel({
        aidaClient: mockAidaClient([[{explanation: 'test'}], [{explanation: 'test2'}]]),
      });
      UI.Context.Context.instance().setFlavor(
          ElementsPanel.ElementsPanel.ElementsPanel,
          sinon.createStubInstance(ElementsPanel.ElementsPanel.ElementsPanel));

      panel.handleAction('freestyler.elements-floating-button');
      view.lastCall.args[0].onTextSubmit('test');
      await waitForRendering();

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
          ElementsPanel.ElementsPanel.ElementsPanel,
          sinon.createStubInstance(ElementsPanel.ElementsPanel.ElementsPanel));

      panel.handleAction('freestyler.elements-floating-button');
      view.lastCall.args[0].onTextSubmit('test2');
      await waitForRendering();

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
            ElementsPanel.ElementsPanel.ElementsPanel,
            sinon.createStubInstance(ElementsPanel.ElementsPanel.ElementsPanel));

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
            ElementsPanel.ElementsPanel.ElementsPanel,
            sinon.createStubInstance(ElementsPanel.ElementsPanel.ElementsPanel));
        const {view} = await createAiAssistancePanel();

        sinon.assert.calledWith(view, sinon.match({
          agentType: AiAssistance.AgentType.STYLING,
        }));

        UI.Context.Context.instance().setFlavor(ElementsPanel.ElementsPanel.ElementsPanel, null);
        assert.isUndefined(view.lastCall.args[0].agentType);
      });

      it('should render no agent state when Elements panel is open but Freestyler is not enabled', async () => {
        updateHostConfig({
          devToolsFreestyler: {
            enabled: false,
          },
        });
        UI.Context.Context.instance().setFlavor(
            ElementsPanel.ElementsPanel.ElementsPanel,
            sinon.createStubInstance(ElementsPanel.ElementsPanel.ElementsPanel));
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
            NetworkPanel.NetworkPanel.NetworkPanel, sinon.createStubInstance(NetworkPanel.NetworkPanel.NetworkPanel));
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
            NetworkPanel.NetworkPanel.NetworkPanel, sinon.createStubInstance(NetworkPanel.NetworkPanel.NetworkPanel));
        const {view} = await createAiAssistancePanel();

        sinon.assert.calledWith(view, sinon.match({
          agentType: AiAssistance.AgentType.NETWORK,
        }));

        UI.Context.Context.instance().setFlavor(NetworkPanel.NetworkPanel.NetworkPanel, null);
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
               NetworkPanel.NetworkPanel.NetworkPanel,
               sinon.createStubInstance(NetworkPanel.NetworkPanel.NetworkPanel));
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
            SourcesPanel.SourcesPanel.SourcesPanel, sinon.createStubInstance(SourcesPanel.SourcesPanel.SourcesPanel));
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
            SourcesPanel.SourcesPanel.SourcesPanel, sinon.createStubInstance(SourcesPanel.SourcesPanel.SourcesPanel));
        const {view} = await createAiAssistancePanel();
        sinon.assert.calledWith(view, sinon.match({
          agentType: AiAssistance.AgentType.FILE,
        }));

        UI.Context.Context.instance().setFlavor(SourcesPanel.SourcesPanel.SourcesPanel, null);
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
               SourcesPanel.SourcesPanel.SourcesPanel,
               sinon.createStubInstance(SourcesPanel.SourcesPanel.SourcesPanel));
           const {view} = await createAiAssistancePanel();

           assert.isUndefined(view.lastCall.args[0].agentType);
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
            TimelinePanel.TimelinePanel.TimelinePanel,
            sinon.createStubInstance(TimelinePanel.TimelinePanel.TimelinePanel));
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
               TimelinePanel.TimelinePanel.TimelinePanel,
               sinon.createStubInstance(TimelinePanel.TimelinePanel.TimelinePanel));
           const {view} = await createAiAssistancePanel();
           sinon.assert.calledWith(view, sinon.match({
             agentType: AiAssistance.AgentType.PERFORMANCE,
           }));

           UI.Context.Context.instance().setFlavor(TimelinePanel.TimelinePanel.TimelinePanel, null);
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
               TimelinePanel.TimelinePanel.TimelinePanel,
               sinon.createStubInstance(TimelinePanel.TimelinePanel.TimelinePanel));
           const {view} = await createAiAssistancePanel();

           assert.isUndefined(view.lastCall.args[0].agentType);
         });
    });
  });

  it('erases previous partial response on blocked error', async () => {
    const {view, panel, waitForRendering} = await createAiAssistancePanel({
      aidaClient: mockAidaClient([[{
        explanation: 'This is the first part of the answer.',
        metadata: {attributionMetadata: {attributionAction: Host.AidaClient.RecitationAction.BLOCK, citations: []}}
      }]]),
    });
    panel.handleAction('freestyler.elements-floating-button');
    view.lastCall.args[0].onTextSubmit('test');
    await waitForRendering();

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
          ElementsPanel.ElementsPanel.ElementsPanel,
          sinon.createStubInstance(ElementsPanel.ElementsPanel.ElementsPanel));
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
          ElementsPanel.ElementsPanel.ElementsPanel,
          sinon.createStubInstance(ElementsPanel.ElementsPanel.ElementsPanel));
      const {
        view,
      } = await createAiAssistancePanel();

      assert.isTrue(view.lastCall.args[0].multimodalInputEnabled);

      await view.lastCall.args[0].onTakeScreenshot?.();

      expect(captureScreenshotStub.calledOnce);
      assert.deepEqual(view.lastCall.args[0].imageInput, 'imageInput');

      await view.lastCall.args[0].onRemoveImageInput?.();

      assert.isEmpty(view.lastCall.args[0].imageInput);
    });

    it('sends image as input', async () => {
      updateHostConfig({
        devToolsFreestyler: {
          enabled: true,
          multimodal: true,
        },
      });
      UI.Context.Context.instance().setFlavor(
          ElementsPanel.ElementsPanel.ElementsPanel,
          sinon.createStubInstance(ElementsPanel.ElementsPanel.ElementsPanel));
      const {
        view,
        waitForRendering,
      } = await createAiAssistancePanel({aidaClient: mockAidaClient([[{explanation: 'test'}]])});

      assert.isTrue(view.lastCall.args[0].multimodalInputEnabled);

      view.lastCall.args[0].onTextSubmit('test', {inlineData: {data: 'imageInput', mimeType: 'image/jpeg'}});
      await waitForRendering();

      assert.deepEqual(view.lastCall.args[0].messages, [
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
