// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';

let builtInAiInstance: BuiltInAi|undefined;

export interface LanguageModel {
  promptStreaming: (arg0: string, opts?: {
    signal?: AbortSignal,
  }) => AsyncGenerator<string>;
  clone: () => LanguageModel;
  destroy: () => void;
}

export const enum LanguageModelAvailability {
  UNAVAILABLE = 'unavailable',
  DOWNLOADABLE = 'downloadable',
  DOWNLOADING = 'downloading',
  AVAILABLE = 'available',
  DISABLED = 'disabled',
}

export class BuiltInAi {
  #availability: LanguageModelAvailability|null = null;
  #hasGpu: boolean;
  #consoleInsightsSession: LanguageModel|null = null;

  static instance(): BuiltInAi {
    if (builtInAiInstance === undefined) {
      builtInAiInstance = new BuiltInAi();
    }
    return builtInAiInstance;
  }

  constructor() {
    this.#hasGpu = this.#isGpuAvailable();
    void this.getLanguageModelAvailability().then(() => this.initialize()).then(() => this.#sendAvailabilityMetrics());
  }

  async getLanguageModelAvailability(): Promise<LanguageModelAvailability> {
    if (!Root.Runtime.hostConfig.devToolsAiPromptApi?.enabled) {
      this.#availability = LanguageModelAvailability.DISABLED;
      return this.#availability;
    }
    try {
      // @ts-expect-error
      this.#availability = await window.LanguageModel.availability(
                               {expectedOutputs: [{type: 'text', languages: ['en']}]}) as LanguageModelAvailability;
    } catch {
      this.#availability = LanguageModelAvailability.UNAVAILABLE;
    }
    return this.#availability;
  }

  #isGpuAvailable(): boolean {
    const canvas = document.createElement('canvas');
    try {
      const webgl = canvas.getContext('webgl');
      if (!webgl) {
        return false;
      }
      const debugInfo = webgl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) {
        return false;
      }
      const renderer = webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      if (renderer.includes('SwiftShader')) {
        return false;
      }
    } catch {
      return false;
    }
    return true;
  }

  hasSession(): boolean {
    return Boolean(this.#consoleInsightsSession);
  }

  async initialize(): Promise<void> {
    if (!Root.Runtime.hostConfig.devToolsAiPromptApi?.allowWithoutGpu && !this.#hasGpu) {
      return;
    }
    if (this.#availability !== LanguageModelAvailability.AVAILABLE) {
      return;
    }
    await this.#createSession();
  }

  async #createSession(): Promise<void> {
    try {
      // @ts-expect-error
      this.#consoleInsightsSession = await window.LanguageModel.create({
        initialPrompts: [{
          role: 'system',
          content: `
You are an expert web developer. Your goal is to help a human web developer who
is using Chrome DevTools to debug a web site or web app. The Chrome DevTools
console is showing a message which is either an error or a warning. Please help
the user understand the problematic console message.

Your instructions are as follows:
  - Explain the reason why the error or warning is showing up.
  - The explanation has a maximum length of 200 characters. Anything beyond this
    length will be cut off. Make sure that your explanation is at most 200 characters long.
  - Your explanation should not end in the middle of a sentence.
  - Your explanation should consist of a single paragraph only. Do not include any
    headings or code blocks. Only write a single paragraph of text.
  - Your response should be concise and to the point. Avoid lengthy explanations
    or unnecessary details.
          `
        }],
        expectedInputs: [{
          type: 'text',
          languages: ['en'],
        }],
        expectedOutputs: [{
          type: 'text',
          languages: ['en'],
        }],
      });
      if (this.#availability !== LanguageModelAvailability.AVAILABLE) {
        void this.getLanguageModelAvailability();
      }
    } catch (e) {
      console.error('Error when creating LanguageModel session', e.message);
    }
  }

  static removeInstance(): void {
    builtInAiInstance = undefined;
  }

  async * getConsoleInsight(prompt: string, abortController: AbortController): AsyncGenerator<string> {
    if (!this.#consoleInsightsSession) {
      return;
    }
    // Clone the session to start a fresh conversation for each answer. Otherwise
    // previous dialog would pollute the context resulting in worse answers.
    let session: LanguageModel|null = null;
    try {
      session = await this.#consoleInsightsSession.clone();
      const stream = session.promptStreaming(prompt, {
        signal: abortController.signal,
      });
      for await (const chunk of stream) {
        yield chunk;
      }
    } finally {
      if (session) {
        session.destroy();
      }
    }
  }

  #sendAvailabilityMetrics(): void {
    if (this.#hasGpu) {
      switch (this.#availability) {
        case LanguageModelAvailability.UNAVAILABLE:
          Host.userMetrics.builtInAiAvailability(Host.UserMetrics.BuiltInAiAvailability.UNAVAILABLE_HAS_GPU);
          break;
        case LanguageModelAvailability.DOWNLOADABLE:
          Host.userMetrics.builtInAiAvailability(Host.UserMetrics.BuiltInAiAvailability.DOWNLOADABLE_HAS_GPU);
          break;
        case LanguageModelAvailability.DOWNLOADING:
          Host.userMetrics.builtInAiAvailability(Host.UserMetrics.BuiltInAiAvailability.DOWNLOADING_HAS_GPU);
          break;
        case LanguageModelAvailability.AVAILABLE:
          Host.userMetrics.builtInAiAvailability(Host.UserMetrics.BuiltInAiAvailability.AVAILABLE_HAS_GPU);
          break;
        case LanguageModelAvailability.DISABLED:
          Host.userMetrics.builtInAiAvailability(Host.UserMetrics.BuiltInAiAvailability.DISABLED_HAS_GPU);
          break;
      }
    } else {
      switch (this.#availability) {
        case LanguageModelAvailability.UNAVAILABLE:
          Host.userMetrics.builtInAiAvailability(Host.UserMetrics.BuiltInAiAvailability.UNAVAILABLE_NO_GPU);
          break;
        case LanguageModelAvailability.DOWNLOADABLE:
          Host.userMetrics.builtInAiAvailability(Host.UserMetrics.BuiltInAiAvailability.DOWNLOADABLE_NO_GPU);
          break;
        case LanguageModelAvailability.DOWNLOADING:
          Host.userMetrics.builtInAiAvailability(Host.UserMetrics.BuiltInAiAvailability.DOWNLOADING_NO_GPU);
          break;
        case LanguageModelAvailability.AVAILABLE:
          Host.userMetrics.builtInAiAvailability(Host.UserMetrics.BuiltInAiAvailability.AVAILABLE_NO_GPU);
          break;
        case LanguageModelAvailability.DISABLED:
          Host.userMetrics.builtInAiAvailability(Host.UserMetrics.BuiltInAiAvailability.DISABLED_NO_GPU);
          break;
      }
    }
  }
}
