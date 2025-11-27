// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import * as AiAssistanceModel from '../ai_assistance/ai_assistance.js';

describe('BuiltInAi', () => {
  it('can generate a console insight teaser', async () => {
    updateHostConfig({
      devToolsAiPromptApi: {
        enabled: true,
        allowWithoutGpu: true,
      },
    });

    async function* promptStreaming() {
      yield 'This is';
      yield ' an explanation.';
    }

    const mockLanguageModel = {
      destroy: () => {},
      clone: () => mockLanguageModel,
      promptStreaming,
    };
    // @ts-expect-error
    window.LanguageModel = {
      availability: () => 'available',
      create: () => mockLanguageModel,
    };

    const builtInAi = new AiAssistanceModel.BuiltInAi.BuiltInAi();
    assert.isDefined(builtInAi);
    await builtInAi.initDoneForTesting;
    assert.isTrue(builtInAi.hasSession());
    const abortController = new AbortController();
    const stream = builtInAi.getConsoleInsight('explain this error', abortController);
    let response = '';
    for await (const chunk of stream) {
      response += chunk;
    }
    assert.strictEqual(response, 'This is an explanation.');
    AiAssistanceModel.BuiltInAi.BuiltInAi.removeInstance();
  });

  it('is not available if there is no dedicated GPU', async () => {
    updateHostConfig({
      devToolsAiPromptApi: {
        enabled: true,
        allowWithoutGpu: false,
      },
    });

    // @ts-expect-error
    window.LanguageModel = {
      availability: () => 'available',
      create: () => {},
    };

    const builtInAi = new AiAssistanceModel.BuiltInAi.BuiltInAi();
    await builtInAi.initDoneForTesting;
    assert.isFalse(builtInAi.isEventuallyAvailable());
  });

  it('can download the AI model', async () => {
    updateHostConfig({
      devToolsAiPromptApi: {
        enabled: true,
        allowWithoutGpu: true,
      },
    });

    // @ts-expect-error
    window.LanguageModel = {
      availability: () => 'downloadable',
      create: (params: {monitor: (et: EventTarget) => void}) => {
        const eventTarget = new EventTarget();
        params.monitor(eventTarget);
        eventTarget.dispatchEvent(new ProgressEvent('downloadprogress', {loaded: 0.4}));
        return {};
      },
    };

    const builtInAi = new AiAssistanceModel.BuiltInAi.BuiltInAi();
    assert.isDefined(builtInAi);
    await builtInAi.initDoneForTesting;
    assert.isFalse(builtInAi.hasSession());
    assert.isTrue(builtInAi.isEventuallyAvailable());

    const downloadProgressPromise = new Promise<void>(resolve => {
      builtInAi.addEventListener(AiAssistanceModel.BuiltInAi.Events.DOWNLOAD_PROGRESS_CHANGED, () => {
        assert.strictEqual(builtInAi.getDownloadProgress(), 0.4);
        resolve();
      });
    });

    const sessionCreatedPromise = new Promise<void>(resolve => {
      builtInAi.addEventListener(AiAssistanceModel.BuiltInAi.Events.DOWNLOADED_AND_SESSION_CREATED, () => {
        resolve();
      });
    });

    builtInAi.startDownloadingModel();
    await downloadProgressPromise;
    await sessionCreatedPromise;
    assert.isTrue(builtInAi.hasSession());
  });
});
