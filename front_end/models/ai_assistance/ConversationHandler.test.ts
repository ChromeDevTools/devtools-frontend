// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import {
  createNetworkRequest,
  mockAidaClient,
} from '../../testing/AiAssistanceHelpers.js';
import {registerNoopActions, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createNetworkPanelForMockConnection} from '../../testing/NetworkHelpers.js';
import * as Snackbars from '../../ui/components/snackbars/snackbars.js';

describeWithMockConnection('ConversationHandler', () => {
  describe('handleExternalRequest', () => {
    const explanation = 'I need more information';

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
  });
});
