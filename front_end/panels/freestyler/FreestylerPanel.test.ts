// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import {describeWithEnvironment, registerNoopActions} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Freestyler from './freestyler.js';

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

describeWithEnvironment('FreestylerPanel', () => {
  const mockView = sinon.stub();

  beforeEach(() => {
    registerNoopActions(['elements.toggle-element-search']);
    mockView.reset();
  });

  describe('consent view', () => {
    it('should render consent view when the consent is not given before', async () => {
      new Freestyler.FreestylerPanel(mockView, {
        aidaClient: getTestAidaClient(),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });

      sinon.assert.calledWith(mockView, sinon.match({state: Freestyler.State.CONSENT_VIEW}));
    });

    it('should switch from consent view to chat view when enabling setting', async () => {
      const panel = new Freestyler.FreestylerPanel(mockView, {
        aidaClient: getTestAidaClient(),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });
      panel.markAsRoot();
      panel.show(document.body);
      sinon.assert.calledWith(mockView, sinon.match({state: Freestyler.State.CONSENT_VIEW}));

      Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
      sinon.assert.calledWith(mockView, sinon.match({state: Freestyler.State.CHAT_VIEW}));
      panel.detach();
    });

    it('should render chat view when the consent is given before', async () => {
      Common.Settings.moduleSetting('ai-assistance-enabled').set(true);

      new Freestyler.FreestylerPanel(mockView, {
        aidaClient: getTestAidaClient(),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });

      sinon.assert.calledWith(mockView, sinon.match({state: Freestyler.State.CHAT_VIEW}));
    });

    it('should render the consent view when the setting is disabled', async () => {
      Common.Settings.moduleSetting('ai-assistance-enabled').set(true);
      Common.Settings.moduleSetting('ai-assistance-enabled').setDisabled(true);

      new Freestyler.FreestylerPanel(mockView, {
        aidaClient: getTestAidaClient(),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });

      sinon.assert.calledWith(mockView, sinon.match({state: Freestyler.State.CONSENT_VIEW}));
      Common.Settings.moduleSetting('ai-assistance-enabled').setDisabled(false);
    });
  });

  describe('on rate click', () => {
    afterEach(() => {
      // @ts-expect-error global test variable
      setFreestylerServerSideLoggingEnabled(false);
    });

    it('renders a button linking to settings', () => {
      const stub = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView');

      const panel = new Freestyler.FreestylerPanel(mockView, {
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
      setFreestylerServerSideLoggingEnabled(true);

      const aidaClient = getTestAidaClient();
      new Freestyler.FreestylerPanel(mockView, {
        aidaClient,
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });
      const callArgs = mockView.getCall(0).args[0];
      mockView.reset();
      callArgs.onFeedbackSubmit(0, Host.AidaClient.Rating.POSITIVE);

      sinon.assert.match(aidaClient.registerClientEvent.firstCall.firstArg, sinon.match({
        disable_user_content_logging: false,
      }));
    });

    it('should send POSITIVE rating to aida client when the user clicks on positive rating', () => {
      const RPC_ID = 0;

      const aidaClient = getTestAidaClient();
      new Freestyler.FreestylerPanel(mockView, {
        aidaClient,
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });
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
      new Freestyler.FreestylerPanel(mockView, {
        aidaClient,
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });
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
      new Freestyler.FreestylerPanel(mockView, {
        aidaClient,
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
        syncInfo: getTestSyncInfo(),
      });
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
});
