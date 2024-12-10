// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {findMenuItemWithLabel, getMenu} from '../../testing/ContextMenuHelpers.js';
import {dispatchClickEvent} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment, getGetHostConfigStub, registerNoopActions} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ElementsPanel from '../elements/elements.js';
import * as NetworkPanel from '../network/network.js';
import * as SourcesPanel from '../sources/sources.js';
import * as TimelinePanel from '../timeline/timeline.js';
import * as TimelineUtils from '../timeline/utils/utils.js';

import * as AiAssistance from './ai_assistance.js';

function getTestAidaClient() {
  return {
    async *
        fetch() {
          yield {explanation: 'test', metadata: {}, completed: true};
        },
    registerClientEvent: sinon.spy(),
  };
}

function getTestSyncInfo(): Host.InspectorFrontendHostAPI.SyncInformation {
  return {isSyncActive: true};
}

async function drainMicroTasks() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

describeWithEnvironment('FreestylerPanel', () => {
  let mockView: sinon.SinonStub<[AiAssistance.Props, unknown, HTMLElement]>;
  let panel: AiAssistance.AiAssistancePanel;

  beforeEach(() => {
    mockView = sinon.stub();
    registerNoopActions(['elements.toggle-element-search']);
    UI.Context.Context.instance().setFlavor(ElementsPanel.ElementsPanel.ElementsPanel, null);
    UI.Context.Context.instance().setFlavor(NetworkPanel.NetworkPanel.NetworkPanel, null);
    UI.Context.Context.instance().setFlavor(SourcesPanel.SourcesPanel.SourcesPanel, null);
    UI.Context.Context.instance().setFlavor(TimelinePanel.TimelinePanel.TimelinePanel, null);
  });

  afterEach(() => {
    panel.detach();
  });

  describe('consent view', () => {
    it('should render consent view when the consent is not given before', async () => {
      panel = new AiAssistance.AiAssistancePanel(mockView, {
        aidaClient: getTestAidaClient(),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });
      panel.markAsRoot();
      panel.show(document.body);

      sinon.assert.calledWith(mockView, sinon.match({state: AiAssistance.State.CONSENT_VIEW}));
    });

    it('should switch from consent view to chat view when enabling setting', async () => {
      panel = new AiAssistance.AiAssistancePanel(mockView, {
        aidaClient: getTestAidaClient(),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });
      panel.markAsRoot();
      panel.show(document.body);
      sinon.assert.calledWith(mockView, sinon.match({state: AiAssistance.State.CONSENT_VIEW}));

      Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
      sinon.assert.calledWith(mockView, sinon.match({state: AiAssistance.State.CHAT_VIEW}));
      await drainMicroTasks();
    });

    it('should render chat view when the consent is given before', async () => {
      Common.Settings.moduleSetting('ai-assistance-enabled').set(true);

      panel = new AiAssistance.AiAssistancePanel(mockView, {
        aidaClient: getTestAidaClient(),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });
      panel.markAsRoot();
      panel.show(document.body);

      sinon.assert.calledWith(mockView, sinon.match({state: AiAssistance.State.CHAT_VIEW}));
    });

    it('should render the consent view when the setting is disabled', async () => {
      Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
      Common.Settings.moduleSetting('ai-assistance-enabled').setDisabled(true);
      const chatUiStates: AiAssistance.State[] = [];
      const viewStub = sinon.stub().callsFake(props => {
        chatUiStates.push(props.state);
      });

      panel = new AiAssistance.AiAssistancePanel(viewStub, {
        aidaClient: getTestAidaClient(),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });
      panel.markAsRoot();
      panel.show(document.body);
      await drainMicroTasks();

      sinon.assert.calledWith(viewStub, sinon.match({state: AiAssistance.State.CONSENT_VIEW}));
      assert.isFalse(chatUiStates.includes(AiAssistance.State.CHAT_VIEW));
      Common.Settings.moduleSetting('ai-assistance-enabled').setDisabled(false);
    });

    it('should render the consent view when blocked by age', async () => {
      Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
      const stub = getGetHostConfigStub({
        aidaAvailability: {
          blockedByAge: true,
        },
        devToolsFreestyler: {
          enabled: true,
        },
      });

      panel = new AiAssistance.AiAssistancePanel(mockView, {
        aidaClient: getTestAidaClient(),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });
      panel.markAsRoot();
      panel.show(document.body);

      sinon.assert.calledWith(mockView, sinon.match({state: AiAssistance.State.CONSENT_VIEW}));
      stub.restore();
    });

    it('updates when the user logs in', async () => {
      Common.Settings.moduleSetting('ai-assistance-enabled').set(true);

      panel = new AiAssistance.AiAssistancePanel(mockView, {
        aidaClient: getTestAidaClient(),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL,
        syncInfo: getTestSyncInfo(),
      });
      panel.markAsRoot();
      panel.show(document.body);
      await drainMicroTasks();
      sinon.assert.calledWith(mockView, sinon.match({
        state: AiAssistance.State.CHAT_VIEW,
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL,
      }));
      mockView.reset();

      const stub = sinon.stub(Host.AidaClient.AidaClient, 'checkAccessPreconditions')
                       .returns(Promise.resolve(Host.AidaClient.AidaAccessPreconditions.AVAILABLE));
      Host.AidaClient.HostConfigTracker.instance().dispatchEventToListeners(
          Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED);
      await drainMicroTasks();
      sinon.assert.calledWith(mockView, sinon.match({
        state: AiAssistance.State.CHAT_VIEW,
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      }));

      stub.restore();
    });
  });

  describe('on rate click', () => {
    afterEach(() => {
      // @ts-expect-error global test variable
      setAiAssistanceServerSideLoggingEnabled(false);
    });

    it('renders a button linking to settings', () => {
      const stub = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView');

      panel = new AiAssistance.AiAssistancePanel(mockView, {
        aidaClient: getTestAidaClient(),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });
      const toolbar = panel.contentElement.querySelector('.freestyler-right-toolbar');
      const button = toolbar!.shadowRoot!.querySelector('devtools-button[aria-label=\'Settings\']');
      assert.instanceOf(button, HTMLElement);
      button.click();
      assert.isTrue(stub.calledWith('chrome-ai'));
      stub.restore();
    });

    it('should allow logging if configured', () => {
      // @ts-expect-error global test variable
      setAiAssistanceServerSideLoggingEnabled(true);
      const stub = getGetHostConfigStub({
        aidaAvailability: {
          disallowLogging: false,
        },
      });

      const aidaClient = getTestAidaClient();
      panel = new AiAssistance.AiAssistancePanel(mockView, {
        aidaClient,
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });
      panel.markAsRoot();
      panel.show(document.body);
      const callArgs = mockView.getCall(0)?.args[0];
      mockView.reset();
      callArgs.onFeedbackSubmit(0, Host.AidaClient.Rating.POSITIVE);

      sinon.assert.match(aidaClient.registerClientEvent.firstCall.firstArg, sinon.match({
        disable_user_content_logging: false,
      }));
      stub.restore();
    });

    it('should send POSITIVE rating to aida client when the user clicks on positive rating', () => {
      const RPC_ID = 0;

      const aidaClient = getTestAidaClient();
      panel = new AiAssistance.AiAssistancePanel(mockView, {
        aidaClient,
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });
      panel.markAsRoot();
      panel.show(document.body);
      const callArgs = mockView.getCall(0).args[0];
      mockView.reset();
      callArgs.onFeedbackSubmit(RPC_ID, Host.AidaClient.Rating.POSITIVE);

      sinon.assert.match(aidaClient.registerClientEvent.firstCall.firstArg, sinon.match({
        corresponding_aida_rpc_global_id: RPC_ID,
        do_conversation_client_event: {
          user_feedback: {
            sentiment: 'POSITIVE',
          },
        },
        disable_user_content_logging: true,
      }));
    });

    it('should send NEGATIVE rating to aida client when the user clicks on positive rating', () => {
      const RPC_ID = 0;
      const aidaClient = getTestAidaClient();
      panel = new AiAssistance.AiAssistancePanel(mockView, {
        aidaClient,
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });
      panel.markAsRoot();
      panel.show(document.body);
      const callArgs = mockView.getCall(0).args[0];
      mockView.reset();
      callArgs.onFeedbackSubmit(RPC_ID, Host.AidaClient.Rating.NEGATIVE);

      sinon.assert.match(aidaClient.registerClientEvent.firstCall.firstArg, sinon.match({
        corresponding_aida_rpc_global_id: RPC_ID,
        do_conversation_client_event: {
          user_feedback: {
            sentiment: 'NEGATIVE',
          },
        },
        disable_user_content_logging: true,
      }));
    });

    it('should send feedback text with data', () => {
      const RPC_ID = 0;
      const feedback = 'This helped me a ton.';
      const aidaClient = getTestAidaClient();
      panel = new AiAssistance.AiAssistancePanel(mockView, {
        aidaClient,
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });
      panel.markAsRoot();
      panel.show(document.body);
      const callArgs = mockView.getCall(0).args[0];
      mockView.reset();
      callArgs.onFeedbackSubmit(RPC_ID, Host.AidaClient.Rating.POSITIVE, feedback);

      sinon.assert.match(aidaClient.registerClientEvent.firstCall.firstArg, sinon.match({
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

  describe('flavor change listeners', () => {
    describe('SDK.DOMModel.DOMNode flavor changes for selected element', () => {
      it('should set the selected element when the widget is shown', () => {
        UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, null);
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });

        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode, {
          nodeType: Node.ELEMENT_NODE,
        });
        UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);
        panel.markAsRoot();
        panel.show(document.body);
        panel.handleAction('freestyler.elements-floating-button');

        sinon.assert.calledWith(mockView, sinon.match({
          selectedContext: new AiAssistance.NodeContext(node),
        }));
      });

      it('should update the selected element when the changed DOMNode flavor is an ELEMENT_NODE', () => {
        UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, null);
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });
        panel.markAsRoot();
        panel.show(document.body);
        panel.handleAction('freestyler.elements-floating-button');
        sinon.assert.calledWith(mockView, sinon.match({
          selectedContext: null,
        }));

        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode, {
          nodeType: Node.ELEMENT_NODE,
        });
        UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);

        sinon.assert.calledWith(mockView, sinon.match({
          selectedContext: new AiAssistance.NodeContext(node),
        }));
      });

      it('should set selected element to null when the change DOMNode flavor is not an ELEMENT_NODE', () => {
        UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, null);
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });
        panel.markAsRoot();
        panel.show(document.body);
        panel.handleAction('freestyler.elements-floating-button');
        sinon.assert.calledWith(mockView, sinon.match({
          selectedContext: null,
        }));

        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode, {
          nodeType: Node.COMMENT_NODE,
        });
        UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);

        sinon.assert.calledWith(mockView, sinon.match({
          selectedContext: null,
        }));
      });

      it('should not handle DOMNode flavor changes if the widget is not shown', () => {
        UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, null);
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });

        const node = sinon.createStubInstance(SDK.DOMModel.DOMNode, {
          nodeType: Node.ELEMENT_NODE,
        });
        UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);

        sinon.assert.notCalled(mockView);
      });
    });

    describe('SDK.NetworkRequest.NetworkRequest flavor changes for selected network request', () => {
      it('should set the selected network request when the widget is shown', () => {
        UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, null);
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });

        const networkRequest = sinon.createStubInstance(SDK.NetworkRequest.NetworkRequest);
        UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, networkRequest);
        panel.markAsRoot();
        panel.show(document.body);
        panel.handleAction('drjones.network-floating-button');

        sinon.assert.calledWith(mockView, sinon.match({
          selectedContext: new AiAssistance.RequestContext(networkRequest),
        }));
      });

      it('should set selected network request when the NetworkRequest flavor changes', () => {
        UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, null);
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });
        panel.markAsRoot();
        panel.show(document.body);
        panel.handleAction('drjones.network-floating-button');
        sinon.assert.calledWith(mockView, sinon.match({
          selectedContext: null,
        }));

        const networkRequest = sinon.createStubInstance(SDK.NetworkRequest.NetworkRequest);
        UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, networkRequest);

        sinon.assert.calledWith(mockView, sinon.match({
          selectedContext: new AiAssistance.RequestContext(networkRequest),
        }));
      });

      it('should not handle NetworkRequest flavor changes if the widget is not shown', () => {
        UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, null);
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });

        const networkRequest = sinon.createStubInstance(SDK.NetworkRequest.NetworkRequest);
        UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, networkRequest);

        sinon.assert.notCalled(mockView);
      });
    });

    describe('TimelineUtils.AICallTree.AICallTree flavor changes for selected call tree', () => {
      it('should set the selected call tree when the widget is shown', () => {
        UI.Context.Context.instance().setFlavor(TimelineUtils.AICallTree.AICallTree, null);
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });

        const selectedAiCallTree = {};
        UI.Context.Context.instance().setFlavor(TimelineUtils.AICallTree.AICallTree, selectedAiCallTree);
        panel.markAsRoot();
        panel.show(document.body);
        panel.handleAction('drjones.performance-panel-context');

        sinon.assert.calledWith(mockView, sinon.match({
          selectedContext: new AiAssistance.CallTreeContext(selectedAiCallTree as TimelineUtils.AICallTree.AICallTree),
        }));
      });

      it('should set selected call tree when the AICallTree flavor changes', () => {
        UI.Context.Context.instance().setFlavor(TimelineUtils.AICallTree.AICallTree, null);
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });
        panel.markAsRoot();
        panel.show(document.body);
        panel.handleAction('drjones.performance-panel-context');
        sinon.assert.calledWith(mockView, sinon.match({
          selectedContext: null,
        }));

        const selectedAiCallTree = {};
        UI.Context.Context.instance().setFlavor(TimelineUtils.AICallTree.AICallTree, selectedAiCallTree);

        sinon.assert.calledWith(mockView, sinon.match({
          selectedContext: new AiAssistance.CallTreeContext(selectedAiCallTree as TimelineUtils.AICallTree.AICallTree),
        }));
      });

      it('should not handle AICallTree flavor changes if the widget is not shown', () => {
        UI.Context.Context.instance().setFlavor(TimelineUtils.AICallTree.AICallTree, null);
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });

        const selectedAiCallTree = {};
        UI.Context.Context.instance().setFlavor(TimelineUtils.AICallTree.AICallTree, selectedAiCallTree);

        sinon.assert.notCalled(mockView);
      });
    });

    describe('Workspace.UISourceCode.UISourceCode flavor changes for selected network request', () => {
      it('should set selected file when the widget is shown', () => {
        UI.Context.Context.instance().setFlavor(Workspace.UISourceCode.UISourceCode, null);
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });

        const uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
        UI.Context.Context.instance().setFlavor(Workspace.UISourceCode.UISourceCode, uiSourceCode);
        panel.markAsRoot();
        panel.show(document.body);
        panel.handleAction('drjones.sources-panel-context');

        sinon.assert.calledWith(mockView, sinon.match({
          selectedContext: new AiAssistance.FileContext(uiSourceCode),
        }));
      });

      it('should set selected file when the UISourceCode flavor changes', () => {
        UI.Context.Context.instance().setFlavor(Workspace.UISourceCode.UISourceCode, null);
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });
        panel.markAsRoot();
        panel.show(document.body);
        panel.handleAction('drjones.sources-panel-context');
        sinon.assert.calledWith(mockView, sinon.match({
          selectedContext: null,
        }));

        const uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
        UI.Context.Context.instance().setFlavor(Workspace.UISourceCode.UISourceCode, uiSourceCode);

        sinon.assert.calledWith(mockView, sinon.match({
          selectedContext: new AiAssistance.FileContext(uiSourceCode),
        }));
      });

      it('should not handle NetworkRequest flavor changes if the widget is not shown', () => {
        UI.Context.Context.instance().setFlavor(Workspace.UISourceCode.UISourceCode, null);
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });

        const uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
        UI.Context.Context.instance().setFlavor(Workspace.UISourceCode.UISourceCode, uiSourceCode);

        sinon.assert.notCalled(mockView);
      });
    });
  });

  describe('toggle search element action', () => {
    let toggleSearchElementAction: UI.ActionRegistration.Action;
    beforeEach(() => {
      toggleSearchElementAction =
          UI.ActionRegistry.ActionRegistry.instance().getAction('elements.toggle-element-search');
      toggleSearchElementAction.setToggled(false);
    });

    it('should set inspectElementToggled when the widget is shown', () => {
      panel = new AiAssistance.AiAssistancePanel(mockView, {
        aidaClient: getTestAidaClient(),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });

      toggleSearchElementAction.setToggled(true);
      panel.markAsRoot();
      panel.show(document.body);

      sinon.assert.calledWith(mockView, sinon.match({
        inspectElementToggled: true,
      }));
    });

    it('should update inspectElementToggled when the action is toggled', () => {
      toggleSearchElementAction.setToggled(false);
      panel = new AiAssistance.AiAssistancePanel(mockView, {
        aidaClient: getTestAidaClient(),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });
      panel.markAsRoot();
      panel.show(document.body);
      sinon.assert.calledWith(mockView, sinon.match({
        inspectElementToggled: false,
      }));

      toggleSearchElementAction.setToggled(true);

      sinon.assert.calledWith(mockView, sinon.match({
        inspectElementToggled: true,
      }));
    });

    it('should not update toggleSearchElementAction even after the action is toggled when the widget is not shown',
       () => {
         toggleSearchElementAction.setToggled(false);
         panel = new AiAssistance.AiAssistancePanel(mockView, {
           aidaClient: getTestAidaClient(),
           aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
           syncInfo: getTestSyncInfo(),
         });

         toggleSearchElementAction.setToggled(true);

         sinon.assert.notCalled(mockView);
       });
  });

  describe('history interactions', () => {
    it('should have empty messages after new chat', async () => {
      panel = new AiAssistance.AiAssistancePanel(mockView, {
        aidaClient: getTestAidaClient(),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });
      panel.handleAction('freestyler.elements-floating-button');
      mockView.lastCall.args[0].onTextSubmit('test');
      await drainMicroTasks();

      assert.deepEqual(mockView.lastCall.args[0].messages, [
        {
          entity: AiAssistance.ChatMessageEntity.USER,
          text: 'test',
        },
        {
          answer: 'test',
          entity: AiAssistance.ChatMessageEntity.MODEL,
          rpcId: undefined,
          suggestions: undefined,
          steps: [],
        },
      ]);
      const toolbar = panel.contentElement.querySelector('.freestyler-left-toolbar');
      const button = toolbar!.shadowRoot!.querySelector('devtools-button[aria-label=\'New chat\']');
      assert.instanceOf(button, HTMLElement);
      dispatchClickEvent(button);
      assert.deepEqual(mockView.lastCall.args[0].messages, []);
    });

    it('should select default agent after new chat', async () => {
      const stub = getGetHostConfigStub({
        devToolsFreestyler: {
          enabled: true,
        },
      });
      panel = new AiAssistance.AiAssistancePanel(mockView, {
        aidaClient: getTestAidaClient(),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });
      panel.handleAction('freestyler.elements-floating-button');
      mockView.lastCall.args[0].onTextSubmit('test');
      await drainMicroTasks();
      UI.Context.Context.instance().setFlavor(
          ElementsPanel.ElementsPanel.ElementsPanel,
          sinon.createStubInstance(ElementsPanel.ElementsPanel.ElementsPanel));

      assert.deepEqual(mockView.lastCall.args[0].messages, [
        {
          entity: AiAssistance.ChatMessageEntity.USER,
          text: 'test',
        },
        {
          answer: 'test',
          entity: AiAssistance.ChatMessageEntity.MODEL,
          rpcId: undefined,
          suggestions: undefined,
          steps: [],
        },
      ]);
      const toolbar = panel.contentElement.querySelector('.freestyler-left-toolbar');
      const button = toolbar!.shadowRoot!.querySelector('devtools-button[aria-label=\'New chat\']');
      assert.instanceOf(button, HTMLElement);
      dispatchClickEvent(button);
      assert.deepEqual(mockView.lastCall.args[0].messages, []);
      assert.deepEqual(mockView.lastCall.args[0].agentType, AiAssistance.AgentType.STYLING);
      stub.restore();
    });

    it('should switch agents and restore history', async () => {
      panel = new AiAssistance.AiAssistancePanel(mockView, {
        aidaClient: getTestAidaClient(),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });
      panel.handleAction('freestyler.elements-floating-button');
      mockView.lastCall.args[0].onTextSubmit('User question to Freestyler?');
      await drainMicroTasks();
      assert.deepEqual(mockView.lastCall.args[0].messages, [
        {
          entity: AiAssistance.ChatMessageEntity.USER,
          text: 'User question to Freestyler?',
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
      mockView.lastCall.args[0].onTextSubmit('User question to DrJones?');
      await drainMicroTasks();
      assert.deepEqual(mockView.lastCall.args[0].messages, [
        {
          entity: AiAssistance.ChatMessageEntity.USER,
          text: 'User question to DrJones?',
        },
        {
          answer: 'test',
          entity: AiAssistance.ChatMessageEntity.MODEL,
          rpcId: undefined,
          suggestions: undefined,
          steps: [],
        },
      ]);

      const toolbar = panel.contentElement.querySelector('.freestyler-left-toolbar');
      const button = toolbar!.shadowRoot!.querySelector('devtools-button[aria-label=\'History\']');
      assert.instanceOf(button, HTMLElement);
      const contextMenu = getMenu(() => {
        dispatchClickEvent(button);
      });
      const freestylerEntry = findMenuItemWithLabel(contextMenu.defaultSection(), 'User question to Freestyler?')!;
      assert.isDefined(freestylerEntry);
      contextMenu.invokeHandler(freestylerEntry.id());

      await drainMicroTasks();
      assert.deepEqual(mockView.lastCall.args[0].messages, [
        {
          entity: AiAssistance.ChatMessageEntity.USER,
          text: 'User question to Freestyler?',
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
    panel = new AiAssistance.AiAssistancePanel(mockView, {
      aidaClient: getTestAidaClient(),
      aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      syncInfo: getTestSyncInfo(),
    });
    panel.handleAction('freestyler.elements-floating-button');
    mockView.lastCall.args[0].onTextSubmit('test');
    await drainMicroTasks();

    assert.deepEqual(mockView.lastCall.args[0].messages, [
      {
        entity: AiAssistance.ChatMessageEntity.USER,
        text: 'test',
      },
      {
        answer: 'test',
        entity: AiAssistance.ChatMessageEntity.MODEL,
        rpcId: undefined,
        suggestions: undefined,
        steps: [],
      },
    ]);
    const toolbar = panel.contentElement.querySelector('.freestyler-left-toolbar');
    const button = toolbar!.shadowRoot!.querySelector('devtools-button[aria-label=\'Delete local chat\']');
    assert.instanceOf(button, HTMLElement);
    dispatchClickEvent(button);
    assert.deepEqual(mockView.lastCall.args[0].messages, []);
    assert.deepEqual(mockView.lastCall.args[0].agentType, undefined);
  });

  it('should select default agent based on open panel after clearing the chat', async () => {
    const stub = getGetHostConfigStub({
      devToolsFreestyler: {
        enabled: true,
      },
    });
    panel = new AiAssistance.AiAssistancePanel(mockView, {
      aidaClient: getTestAidaClient(),
      aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      syncInfo: getTestSyncInfo(),
    });
    panel.handleAction('freestyler.elements-floating-button');
    mockView.lastCall.args[0].onTextSubmit('test');
    await drainMicroTasks();

    UI.Context.Context.instance().setFlavor(
        ElementsPanel.ElementsPanel.ElementsPanel, sinon.createStubInstance(ElementsPanel.ElementsPanel.ElementsPanel));
    assert.deepEqual(mockView.lastCall.args[0].messages, [
      {
        entity: AiAssistance.ChatMessageEntity.USER,
        text: 'test',
      },
      {
        answer: 'test',
        entity: AiAssistance.ChatMessageEntity.MODEL,
        rpcId: undefined,
        suggestions: undefined,
        steps: [],
      },
    ]);
    const toolbar = panel.contentElement.querySelector('.freestyler-left-toolbar');
    const button = toolbar!.shadowRoot!.querySelector('devtools-button[aria-label=\'Delete local chat\']');
    assert.instanceOf(button, HTMLElement);
    dispatchClickEvent(button);
    assert.deepEqual(mockView.lastCall.args[0].messages, []);
    assert.deepEqual(mockView.lastCall.args[0].agentType, AiAssistance.AgentType.STYLING);
    stub.restore();
  });

  it('should have empty state after clear chat history', async () => {
    panel = new AiAssistance.AiAssistancePanel(mockView, {
      aidaClient: getTestAidaClient(),
      aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      syncInfo: getTestSyncInfo(),
    });
    panel.handleAction('freestyler.elements-floating-button');
    mockView.lastCall.args[0].onTextSubmit('User question to Freestyler?');
    await drainMicroTasks();
    assert.deepEqual(mockView.lastCall.args[0].messages, [
      {
        entity: AiAssistance.ChatMessageEntity.USER,
        text: 'User question to Freestyler?',
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
    mockView.lastCall.args[0].onTextSubmit('User question to DrJones?');
    await drainMicroTasks();
    assert.deepEqual(mockView.lastCall.args[0].messages, [
      {
        entity: AiAssistance.ChatMessageEntity.USER,
        text: 'User question to DrJones?',
      },
      {
        answer: 'test',
        entity: AiAssistance.ChatMessageEntity.MODEL,
        rpcId: undefined,
        suggestions: undefined,
        steps: [],
      },
    ]);

    let toolbar = panel.contentElement.querySelector('.freestyler-left-toolbar');
    let button = toolbar!.shadowRoot!.querySelector('devtools-button[aria-label=\'History\']');
    assert.instanceOf(button, HTMLElement);
    let contextMenu = getMenu(() => {
      dispatchClickEvent(button!);
    });
    const clearAll = findMenuItemWithLabel(contextMenu.footerSection(), 'Clear local chats')!;
    assert.isDefined(clearAll);
    contextMenu.invokeHandler(clearAll.id());
    await drainMicroTasks();
    assert.deepEqual(mockView.lastCall.args[0].messages, []);
    assert.deepEqual(mockView.lastCall.args[0].agentType, undefined);

    await drainMicroTasks();
    contextMenu.discard();
    await drainMicroTasks();

    toolbar = panel.contentElement.querySelector('.freestyler-left-toolbar');
    button = toolbar!.shadowRoot!.querySelector('devtools-button[aria-label=\'History\']');
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
        url: 'https://a.test' as Platform.DevToolsPath.UrlString,
      });
      UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, networkRequest);
      panel = new AiAssistance.AiAssistancePanel(mockView, {
        aidaClient: getTestAidaClient(),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });
      panel.markAsRoot();
      panel.show(document.body);
      panel.handleAction('drjones.network-floating-button');

      sinon.assert.calledWith(mockView, sinon.match({
        selectedContext: new AiAssistance.RequestContext(networkRequest),
        blockedByCrossOrigin: false,
      }));

      // Send a query for https://a.test.
      panel.handleAction('drjones.network-floating-button');
      mockView.lastCall.args[0].onTextSubmit('test');
      await drainMicroTasks();

      // Change context to https://b.test.
      const networkRequest2 = sinon.createStubInstance(SDK.NetworkRequest.NetworkRequest, {
        url: 'https://b.test' as Platform.DevToolsPath.UrlString,
      });
      UI.Context.Context.instance().setFlavor(SDK.NetworkRequest.NetworkRequest, networkRequest2);
      panel.handleAction('drjones.network-floating-button');
      await drainMicroTasks();

      sinon.assert.calledWith(mockView, sinon.match({
        selectedContext: new AiAssistance.RequestContext(networkRequest2),
        blockedByCrossOrigin: true,
      }));
    });

    it('should be able to continue same-origin requests', async () => {
      const stub = getGetHostConfigStub({
        devToolsFreestyler: {
          enabled: true,
        },
      });
      panel = new AiAssistance.AiAssistancePanel(mockView, {
        aidaClient: getTestAidaClient(),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });
      UI.Context.Context.instance().setFlavor(
          ElementsPanel.ElementsPanel.ElementsPanel,
          sinon.createStubInstance(ElementsPanel.ElementsPanel.ElementsPanel));

      panel.handleAction('freestyler.elements-floating-button');
      mockView.lastCall.args[0].onTextSubmit('test');
      await drainMicroTasks();

      assert.deepEqual(mockView.lastCall.args[0].messages, [
        {
          entity: AiAssistance.ChatMessageEntity.USER,
          text: 'test',
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
      mockView.lastCall.args[0].onTextSubmit('test2');
      await drainMicroTasks();

      assert.strictEqual(mockView.lastCall.args[0].isReadOnly, false);
      assert.deepEqual(mockView.lastCall.args[0].messages, [
        {
          entity: AiAssistance.ChatMessageEntity.USER,
          text: 'test',
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
        },
        {
          answer: 'test',
          entity: AiAssistance.ChatMessageEntity.MODEL,
          rpcId: undefined,
          suggestions: undefined,
          steps: [],
        },
      ]);

      stub.restore();
    });
  });

  describe('auto agent selection for panels', () => {
    describe('Elements panel', () => {
      it('should select FREESTYLER agent when the Elements panel is open in initial render', () => {
        const stub = getGetHostConfigStub({
          devToolsFreestyler: {
            enabled: true,
          },
        });
        UI.Context.Context.instance().setFlavor(
            ElementsPanel.ElementsPanel.ElementsPanel,
            sinon.createStubInstance(ElementsPanel.ElementsPanel.ElementsPanel));
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });

        panel.markAsRoot();
        panel.show(document.body);

        sinon.assert.calledWith(mockView, sinon.match({
          agentType: AiAssistance.AgentType.STYLING,
        }));
        stub.restore();
      });

      it('should update to no agent state when the Elements panel is closed and no other panels are open', () => {
        const stub = getGetHostConfigStub({
          devToolsFreestyler: {
            enabled: true,
          },
        });
        UI.Context.Context.instance().setFlavor(
            ElementsPanel.ElementsPanel.ElementsPanel,
            sinon.createStubInstance(ElementsPanel.ElementsPanel.ElementsPanel));
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });

        panel.markAsRoot();
        panel.show(document.body);
        sinon.assert.calledWith(mockView, sinon.match({
          agentType: AiAssistance.AgentType.STYLING,
        }));

        UI.Context.Context.instance().setFlavor(ElementsPanel.ElementsPanel.ElementsPanel, null);
        assert.deepStrictEqual(mockView.lastCall.args[0].agentType, undefined);
        stub.restore();
      });

      it('should render no agent state when Elements panel is open but Freestyler is not enabled', () => {
        const stub = getGetHostConfigStub({
          devToolsFreestyler: {
            enabled: false,
          },
        });
        UI.Context.Context.instance().setFlavor(
            ElementsPanel.ElementsPanel.ElementsPanel,
            sinon.createStubInstance(ElementsPanel.ElementsPanel.ElementsPanel));
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });

        panel.markAsRoot();
        panel.show(document.body);

        assert.deepStrictEqual(mockView.lastCall.args[0].agentType, undefined);
        stub.restore();
      });
    });

    describe('Network panel', () => {
      it('should select DRJONES_NETWORK agent when the Network panel is open in initial render', () => {
        const stub = getGetHostConfigStub({
          devToolsAiAssistanceNetworkAgent: {
            enabled: true,
          },
        });
        UI.Context.Context.instance().setFlavor(
            NetworkPanel.NetworkPanel.NetworkPanel, sinon.createStubInstance(NetworkPanel.NetworkPanel.NetworkPanel));
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });

        panel.markAsRoot();
        panel.show(document.body);

        sinon.assert.calledWith(mockView, sinon.match({
          agentType: AiAssistance.AgentType.NETWORK,
        }));
        stub.restore();
      });

      it('should update to no agent state when the Network panel is closed and no other panels are open', () => {
        const stub = getGetHostConfigStub({
          devToolsAiAssistanceNetworkAgent: {
            enabled: true,
          },
        });
        UI.Context.Context.instance().setFlavor(
            NetworkPanel.NetworkPanel.NetworkPanel, sinon.createStubInstance(NetworkPanel.NetworkPanel.NetworkPanel));
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });

        panel.markAsRoot();
        panel.show(document.body);
        sinon.assert.calledWith(mockView, sinon.match({
          agentType: AiAssistance.AgentType.NETWORK,
        }));

        UI.Context.Context.instance().setFlavor(NetworkPanel.NetworkPanel.NetworkPanel, null);
        assert.deepStrictEqual(mockView.lastCall.args[0].agentType, undefined);
        stub.restore();
      });

      it('should render no agent state when Network panel is open but devToolsAiAssistanceNetworkAgent is not enabled',
         () => {
           const stub = getGetHostConfigStub({
             devToolsAiAssistanceNetworkAgent: {
               enabled: false,
             },
           });
           UI.Context.Context.instance().setFlavor(
               NetworkPanel.NetworkPanel.NetworkPanel,
               sinon.createStubInstance(NetworkPanel.NetworkPanel.NetworkPanel));
           panel = new AiAssistance.AiAssistancePanel(mockView, {
             aidaClient: getTestAidaClient(),
             aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
             syncInfo: getTestSyncInfo(),
           });

           panel.markAsRoot();
           panel.show(document.body);

           assert.deepStrictEqual(mockView.lastCall.args[0].agentType, undefined);
           stub.restore();
         });
    });

    describe('Sources panel', () => {
      it('should select DRJONES_FILE agent when the Sources panel is open in initial render', () => {
        const stub = getGetHostConfigStub({
          devToolsAiAssistanceFileAgent: {
            enabled: true,
          },
        });
        UI.Context.Context.instance().setFlavor(
            SourcesPanel.SourcesPanel.SourcesPanel, sinon.createStubInstance(SourcesPanel.SourcesPanel.SourcesPanel));
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });

        panel.markAsRoot();
        panel.show(document.body);

        sinon.assert.calledWith(mockView, sinon.match({
          agentType: AiAssistance.AgentType.FILE,
        }));
        stub.restore();
      });

      it('should update to no agent state when the Sources panel is closed and no other panels are open', () => {
        const stub = getGetHostConfigStub({
          devToolsAiAssistanceFileAgent: {
            enabled: true,
          },
        });
        UI.Context.Context.instance().setFlavor(
            SourcesPanel.SourcesPanel.SourcesPanel, sinon.createStubInstance(SourcesPanel.SourcesPanel.SourcesPanel));
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });

        panel.markAsRoot();
        panel.show(document.body);
        sinon.assert.calledWith(mockView, sinon.match({
          agentType: AiAssistance.AgentType.FILE,
        }));

        UI.Context.Context.instance().setFlavor(SourcesPanel.SourcesPanel.SourcesPanel, null);
        assert.deepStrictEqual(mockView.lastCall.args[0].agentType, undefined);
        stub.restore();
      });

      it('should render no agent state when Sources panel is open but devToolsAiAssistanceFileAgent is not enabled',
         () => {
           const stub = getGetHostConfigStub({
             devToolsAiAssistanceFileAgent: {
               enabled: false,
             },
           });
           UI.Context.Context.instance().setFlavor(
               SourcesPanel.SourcesPanel.SourcesPanel,
               sinon.createStubInstance(SourcesPanel.SourcesPanel.SourcesPanel));
           panel = new AiAssistance.AiAssistancePanel(mockView, {
             aidaClient: getTestAidaClient(),
             aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
             syncInfo: getTestSyncInfo(),
           });

           panel.markAsRoot();
           panel.show(document.body);

           assert.deepStrictEqual(mockView.lastCall.args[0].agentType, undefined);
           stub.restore();
         });
    });

    describe('Performance panel', () => {
      it('should select DRJONES_PERFORMANCE agent when the Performance panel is open in initial render', () => {
        const stub = getGetHostConfigStub({
          devToolsAiAssistancePerformanceAgent: {
            enabled: true,
          },
        });
        UI.Context.Context.instance().setFlavor(
            TimelinePanel.TimelinePanel.TimelinePanel,
            sinon.createStubInstance(TimelinePanel.TimelinePanel.TimelinePanel));
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });

        panel.markAsRoot();
        panel.show(document.body);

        sinon.assert.calledWith(mockView, sinon.match({
          agentType: AiAssistance.AgentType.PERFORMANCE,
        }));
        stub.restore();
      });

      it('should update to no agent state when the Performance panel is closed and no other panels are open', () => {
        const stub = getGetHostConfigStub({
          devToolsAiAssistancePerformanceAgent: {
            enabled: true,
          },
        });
        UI.Context.Context.instance().setFlavor(
            TimelinePanel.TimelinePanel.TimelinePanel,
            sinon.createStubInstance(TimelinePanel.TimelinePanel.TimelinePanel));
        panel = new AiAssistance.AiAssistancePanel(mockView, {
          aidaClient: getTestAidaClient(),
          aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
          syncInfo: getTestSyncInfo(),
        });

        panel.markAsRoot();
        panel.show(document.body);
        sinon.assert.calledWith(mockView, sinon.match({
          agentType: AiAssistance.AgentType.PERFORMANCE,
        }));

        UI.Context.Context.instance().setFlavor(TimelinePanel.TimelinePanel.TimelinePanel, null);
        assert.deepStrictEqual(mockView.lastCall.args[0].agentType, undefined);
        stub.restore();
      });

      it('should render no agent state when Performance panel is open but devToolsAiAssistancePerformanceAgent is not enabled',
         () => {
           const stub = getGetHostConfigStub({
             devToolsAiAssistancePerformanceAgent: {
               enabled: false,
             },
           });
           UI.Context.Context.instance().setFlavor(
               TimelinePanel.TimelinePanel.TimelinePanel,
               sinon.createStubInstance(TimelinePanel.TimelinePanel.TimelinePanel));
           panel = new AiAssistance.AiAssistancePanel(mockView, {
             aidaClient: getTestAidaClient(),
             aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
             syncInfo: getTestSyncInfo(),
           });

           panel.markAsRoot();
           panel.show(document.body);

           assert.deepStrictEqual(mockView.lastCall.args[0].agentType, undefined);
           stub.restore();
         });
    });
  });

  it('erases previous partial response on blocked error', async () => {
    async function* generateAnswerAndError() {
      yield {
        explanation: 'ANSWER: This is the first part of the answer.',
        metadata: {},
        completed: false,
      };
      throw new Host.AidaClient.AidaBlockError();
    }

    const mockAidaClient = {
      fetch: generateAnswerAndError,
      registerClientEvent: sinon.spy(),
    };

    const messages: AiAssistance.ModelChatMessage[] = [];
    const viewMock = sinon.stub().callsFake((props: AiAssistance.Props) => {
      messages.push(JSON.parse(JSON.stringify(props.messages[1])));
    });

    panel = new AiAssistance.AiAssistancePanel(viewMock, {
      aidaClient: mockAidaClient,
      aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      syncInfo: getTestSyncInfo(),
    });
    panel.handleAction('freestyler.elements-floating-button');
    viewMock.lastCall.args[0].onTextSubmit('test');
    await drainMicroTasks();

    assert.strictEqual(messages[2].answer, 'This is the first part of the answer.');
    assert.isUndefined(messages[2].error);
    assert.isUndefined(messages[3].answer);
    assert.strictEqual(messages[3].error, 'block');
  });
});
