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

    const builtInAi = await AiAssistanceModel.BuiltInAi.BuiltInAi.instance();
    assert.isDefined(builtInAi);
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

    const builtInAi = await AiAssistanceModel.BuiltInAi.BuiltInAi.instance();
    assert.isUndefined(builtInAi);
  });
});
