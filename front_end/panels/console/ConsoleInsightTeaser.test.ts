// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import {describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Console from './console.js';

describeWithEnvironment('ConsoleInsightTeaser', () => {
  let originalLanguageModel: AiAssistanceModel.BuiltInAi.LanguageModel|undefined;

  beforeEach(() => {
    // @ts-expect-error
    originalLanguageModel = window.LanguageModel;
  });

  afterEach(() => {
    AiAssistanceModel.BuiltInAi.BuiltInAi.removeInstance();
    // @ts-expect-error
    window.LanguageModel = originalLanguageModel;
  });

  it('renders the loading state', async () => {
    const view = createViewFunctionStub(Console.ConsoleInsightTeaser.ConsoleInsightTeaser);
    new Console.ConsoleInsightTeaser.ConsoleInsightTeaser(
        'test-uuid', {} as Console.ConsoleViewMessage.ConsoleViewMessage, undefined, view);
    const input = await view.nextInput;
    assert.isFalse(input.isInactive);
    assert.isEmpty(input.mainText);
    assert.isEmpty(input.headerText);
  });

  it('renders the generated response', async () => {
    updateHostConfig({
      devToolsAiPromptApi: {
        enabled: true,
      },
    });

    async function* promptStreaming() {
      yield JSON.stringify({
        header: 'test header',
        explanation: 'test explanation',
      });
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

    const view = createViewFunctionStub(Console.ConsoleInsightTeaser.ConsoleInsightTeaser);
    const consoleViewMessage = {
      consoleMessage: () => {
        return {
          runtimeModel: () => null,
          getAffectedResources: () => undefined,
        } as unknown as SDK.ConsoleModel.ConsoleMessage;
      },
      toMessageTextString: () => 'message text string',
      contentElement: () => document.createElement('div') as HTMLElement,
    } as Console.ConsoleViewMessage.ConsoleViewMessage;

    const teaser =
        new Console.ConsoleInsightTeaser.ConsoleInsightTeaser('test-uuid', consoleViewMessage, undefined, view);
    await teaser.maybeGenerateTeaser();
    const input = await view.nextInput;
    assert.isFalse(input.isInactive);
    assert.strictEqual(input.headerText, 'test header');
    assert.strictEqual(input.mainText, 'test explanation');
  });
});
