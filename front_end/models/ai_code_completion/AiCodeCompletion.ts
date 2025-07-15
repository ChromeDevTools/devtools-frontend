// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import type {AgentOptions, RequestOptions} from '../ai_assistance/ai_assistance.js';

export class AiCodeCompletion {
  #aidaRequestThrottler: Common.Throttler.Throttler;
  #editor: TextEditor.TextEditor.TextEditor;

  readonly #sessionId: string = crypto.randomUUID();
  readonly #aidaClient: Host.AidaClient.AidaClient;
  readonly #serverSideLoggingEnabled: boolean;

  constructor(opts: AgentOptions, editor: TextEditor.TextEditor.TextEditor, throttler: Common.Throttler.Throttler) {
    this.#aidaClient = opts.aidaClient;
    this.#serverSideLoggingEnabled = opts.serverSideLoggingEnabled ?? false;
    this.#editor = editor;
    this.#aidaRequestThrottler = throttler;
  }

  #buildRequest(
      prefix: string, suffix: string,
      inferenceLanguage: Host.AidaClient.AidaInferenceLanguage = Host.AidaClient.AidaInferenceLanguage.JAVASCRIPT):
      Host.AidaClient.CompletionRequest {
    const userTier = Host.AidaClient.convertToUserTierEnum(this.#userTier);
    function validTemperature(temperature: number|undefined): number|undefined {
      return typeof temperature === 'number' && temperature >= 0 ? temperature : undefined;
    }
    return {
      client: Host.AidaClient.CLIENT_NAME,
      prefix,
      suffix,
      options: {
        inference_language: inferenceLanguage,
        temperature: validTemperature(this.#options.temperature),
        model_id: this.#options.modelId || undefined,
      },
      metadata: {
        disable_user_content_logging: !(this.#serverSideLoggingEnabled ?? false),
        string_session_id: this.#sessionId,
        user_tier: userTier,
        client_version: Root.Runtime.getChromeVersion(),
      },
    };
  }

  async #requestAidaSuggestion(request: Host.AidaClient.CompletionRequest): Promise<void> {
    const response = await this.#aidaClient.completeCode(request);
    if (response && response.generatedSamples.length > 0 && response.generatedSamples[0].generationString) {
      this.#editor.dispatch({
        effects: TextEditor.Config.setAiAutoCompleteSuggestion.of(response.generatedSamples[0].generationString),
      });
    }
  }

  get #userTier(): string|undefined {
    return Root.Runtime.hostConfig.devToolsAiCodeCompletion?.userTier;
  }

  get #options(): RequestOptions {
    const temperature = Root.Runtime.hostConfig.devToolsAiCodeCompletion?.temperature;
    const modelId = Root.Runtime.hostConfig.devToolsAiCodeCompletion?.modelId;

    return {
      temperature,
      modelId,
    };
  }

  onTextChanged(prefix: string, suffix: string): void {
    void this.#aidaRequestThrottler.schedule(() => this.#requestAidaSuggestion(this.#buildRequest(prefix, suffix)));
  }
}
