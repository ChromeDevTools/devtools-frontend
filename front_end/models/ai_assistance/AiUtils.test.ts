// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Host from '../../core/host/host.js';
import {updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';

import * as AiAssistance from './ai_assistance.js';

describe('AiUtils', () => {
  setupLocaleHooks();
  setupRuntimeHooks();
  describe('getDisabledReasons', () => {
    it('returns an empty array if Aida is available and there are no restrictions', () => {
      updateHostConfig({
        isOffTheRecord: false,
        aidaAvailability: {
          blockedByAge: false,
        },
      });
      const reasons = AiAssistance.AiUtils.getDisabledReasons(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      assert.deepEqual(reasons, []);
    });

    it('returns IS_OFF_THE_RECORD if isOffTheRecord is true', () => {
      updateHostConfig({isOffTheRecord: true});
      const reasons = AiAssistance.AiUtils.getDisabledReasons(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      assert.deepEqual(reasons, [AiAssistance.AiUtils.FrontendAccessPrecondition.IS_OFF_THE_RECORD]);
    });

    it('returns NO_ACCOUNT_EMAIL if Aida is unavailable due to no email', () => {
      updateHostConfig({isOffTheRecord: false});
      const reasons = AiAssistance.AiUtils.getDisabledReasons(Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL);
      assert.deepEqual(reasons, [Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL]);
    });

    it('returns SYNC_IS_PAUSED if Aida is unavailable due to paused sync', () => {
      updateHostConfig({isOffTheRecord: false});
      const reasons = AiAssistance.AiUtils.getDisabledReasons(Host.AidaClient.AidaAccessPreconditions.SYNC_IS_PAUSED);
      assert.deepEqual(reasons, [Host.AidaClient.AidaAccessPreconditions.SYNC_IS_PAUSED]);
    });

    it('returns NO_INTERNET if offline', () => {
      updateHostConfig({isOffTheRecord: false});
      const reasons = AiAssistance.AiUtils.getDisabledReasons(Host.AidaClient.AidaAccessPreconditions.NO_INTERNET);
      assert.deepEqual(reasons, [Host.AidaClient.AidaAccessPreconditions.NO_INTERNET]);
    });

    it('returns AGE_RESTRICTED if age check fails', () => {
      updateHostConfig({
        isOffTheRecord: false,
        aidaAvailability: {
          blockedByAge: true,
        },
      });
      const reasons = AiAssistance.AiUtils.getDisabledReasons(Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      assert.deepEqual(reasons, [AiAssistance.AiUtils.FrontendAccessPrecondition.AGE_RESTRICTED]);
    });

    it('handles multiple reasons at the same time', () => {
      updateHostConfig({
        isOffTheRecord: true,
        aidaAvailability: {
          blockedByAge: true,
        },
      });
      const reasons = AiAssistance.AiUtils.getDisabledReasons(Host.AidaClient.AidaAccessPreconditions.NO_INTERNET);
      assert.deepEqual(reasons, [
        AiAssistance.AiUtils.FrontendAccessPrecondition.IS_OFF_THE_RECORD,
        Host.AidaClient.AidaAccessPreconditions.NO_INTERNET,
        AiAssistance.AiUtils.FrontendAccessPrecondition.AGE_RESTRICTED,
      ]);
    });
  });

  describe('isContextSelectionEnabled', () => {
    it('returns true when devToolsAiAssistanceContextSelectionAgent is enabled', () => {
      updateHostConfig({
        devToolsAiAssistanceContextSelectionAgent: {enabled: true},
        devToolsAiV2Architecture: {enabled: false},
      });
      assert.isTrue(AiAssistance.AiUtils.isContextSelectionEnabled());
    });

    it('returns true when devToolsAiV2Architecture is enabled', () => {
      updateHostConfig({
        devToolsAiAssistanceContextSelectionAgent: {enabled: false},
        devToolsAiV2Architecture: {enabled: true},
      });
      assert.isTrue(AiAssistance.AiUtils.isContextSelectionEnabled());
    });

    it('returns true when both flags are enabled', () => {
      updateHostConfig({
        devToolsAiAssistanceContextSelectionAgent: {enabled: true},
        devToolsAiV2Architecture: {enabled: true},
      });
      assert.isTrue(AiAssistance.AiUtils.isContextSelectionEnabled());
    });

    it('returns false when neither flag is enabled', () => {
      updateHostConfig({
        devToolsAiAssistanceContextSelectionAgent: {enabled: false},
        devToolsAiV2Architecture: {enabled: false},
      });
      assert.isFalse(AiAssistance.AiUtils.isContextSelectionEnabled());
    });
  });
});
