// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import {updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';

import * as AiAssistance from './ai-utils.js';

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

  describe('Debug', () => {
    function stubLocalStorage(initialEntries: Record<string, string> = {}): Map<string, string> {
      const store = new Map<string, string>(Object.entries(initialEntries));
      const mockStorage: Storage = {
        get length() {
          return store.size;
        },
        clear: () => store.clear(),
        getItem: (key: string) => store.get(key) ?? null,
        key: (index: number) => Array.from(store.keys())[index] ?? null,
        removeItem: (key: string) => {
          store.delete(key);
        },
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      };
      sinon.stub(Platform.HostRuntime.HOST_RUNTIME, 'getLocalStorage').returns(mockStorage);
      return store;
    }

    it('returns all flags disabled when localStorage is empty or contains invalid JSON', () => {
      const store = stubLocalStorage();
      assert.deepEqual(AiAssistance.Debug.getDevToolsAIDebugConfig(), {
        assistance: false,
        gca: false,
        codeGenComplete: false,
      });
      assert.isFalse(AiAssistance.Debug.isDebugMode());
      assert.isFalse(AiAssistance.Debug.isCodeGenCompleteDebugMode());

      store.set('devToolsAiDebug', '{not-valid-json');
      assert.deepEqual(AiAssistance.Debug.getDevToolsAIDebugConfig(), {
        assistance: false,
        gca: false,
        codeGenComplete: false,
      });
    });

    it('merges partial config updates in setDevToolsAIDebug and logs to console', () => {
      stubLocalStorage();
      const consoleLogStub = sinon.stub(console, 'log');

      assert.deepEqual(globalThis.setDevToolsAIDebug(), {
        assistance: false,
        gca: false,
        codeGenComplete: false,
      });

      const afterFirst = globalThis.setDevToolsAIDebug({assistance: true});
      assert.deepEqual(afterFirst, {
        assistance: true,
        gca: false,
        codeGenComplete: false,
      });
      assert.isTrue(AiAssistance.Debug.isDebugMode());
      sinon.assert.calledWithExactly(consoleLogStub, 'DevTools AI debug config:', {
        assistance: true,
        gca: false,
        codeGenComplete: false,
      });

      const afterSecond = AiAssistance.Debug.setDevToolsAIDebug({gca: true, codeGenComplete: true});
      assert.deepEqual(afterSecond, {
        assistance: true,
        gca: true,
        codeGenComplete: true,
      });
      assert.isTrue(AiAssistance.Debug.isCodeGenCompleteDebugMode());

      const afterDisableAssistance = AiAssistance.Debug.setDevToolsAIDebug({assistance: false});
      assert.deepEqual(afterDisableAssistance, {
        assistance: false,
        gca: true,
        codeGenComplete: true,
      });
      assert.isFalse(AiAssistance.Debug.isDebugMode());
    });

    it('logs a deprecation warning and forwards legacy global debug setters to setDevToolsAIDebug', () => {
      stubLocalStorage();
      sinon.stub(console, 'log');
      const consoleWarnStub = sinon.stub(console, 'warn');

      globalThis.setDebugAiAssistanceEnabled(true);
      sinon.assert.calledWith(consoleWarnStub,
                              'setDebugAiAssistanceEnabled is deprecated and will be removed soon. ' +
                                  'Use setDevToolsAIDebug({assistance: true, gca: true}) instead.');
      assert.deepEqual(AiAssistance.Debug.getDevToolsAIDebugConfig(), {
        assistance: true,
        gca: true,
        codeGenComplete: false,
      });

      globalThis.setAiAssistanceStructuredLogEnabled(false);
      sinon.assert.calledWith(consoleWarnStub,
                              'setAiAssistanceStructuredLogEnabled is deprecated and will be removed soon. ' +
                                  'Use setDevToolsAIDebug({assistance: false}) instead.');
      assert.deepEqual(AiAssistance.Debug.getDevToolsAIDebugConfig(), {
        assistance: false,
        gca: true,
        codeGenComplete: false,
      });

      globalThis.setDebugAiCodeCompletionEnabled(true);
      sinon.assert.calledWith(consoleWarnStub,
                              'setDebugAiCodeCompletionEnabled is deprecated and will be removed soon. ' +
                                  'Use setDevToolsAIDebug({codeGenComplete: true}) instead.');
      assert.isTrue(AiAssistance.Debug.isCodeGenCompleteDebugMode());

      globalThis.setDebugAiCodeGenerationEnabled(false);
      sinon.assert.calledWith(consoleWarnStub,
                              'setDebugAiCodeGenerationEnabled is deprecated and will be removed soon. ' +
                                  'Use setDevToolsAIDebug({codeGenComplete: false}) instead.');
      assert.isFalse(AiAssistance.Debug.isCodeGenCompleteDebugMode());
    });
  });
});
