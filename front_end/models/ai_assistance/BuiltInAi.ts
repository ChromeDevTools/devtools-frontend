// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../core/root/root.js';

let builtInAiInstance: BuiltInAi|undefined;
let availability = '';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    header: {type: 'string', maxLength: 60, description: 'Label for the console message which is being analyzed'},
    // No hard `maxLength` for `explanation`. This would often result in responses which are cut off in the middle of a
    // sentence. Instead provide a soft `maxLength` via the prompt.
    explanation: {
      type: 'string',
      description: 'Actual explanation of the console message being analyzed',
    },
  },
  required: ['header', 'explanation'],
  additionalProperties: false,
};

interface LanguageModel {
  promptStreaming: (arg0: string, opts?: {
    responseConstraint: Object,
    signal?: AbortSignal,
  }) => AsyncGenerator<string>;
  clone: () => LanguageModel;
  destroy: () => void;
}

export class BuiltInAi {
  #consoleInsightsSession: LanguageModel;

  static async isAvailable(): Promise<boolean> {
    if (!Root.Runtime.hostConfig.devToolsAiPromptApi?.enabled) {
      return false;
    }
    // @ts-expect-error
    availability = await window.LanguageModel.availability({expectedOutputs: [{type: 'text', languages: ['en']}]});
    return availability === 'available';
  }

  static cachedIsAvailable(): boolean {
    return availability === 'available';
  }

  private constructor(consoleInsightsSession: LanguageModel) {
    this.#consoleInsightsSession = consoleInsightsSession;
  }

  static async instance(): Promise<BuiltInAi|undefined> {
    if (builtInAiInstance === undefined) {
      if (!(await BuiltInAi.isAvailable())) {
        return undefined;
      }
      // @ts-expect-error
      const consoleInsightsSession = await window.LanguageModel.create({
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
      }) as LanguageModel;
      builtInAiInstance = new BuiltInAi(consoleInsightsSession);
    }
    return builtInAiInstance;
  }

  static removeInstance(): void {
    builtInAiInstance = undefined;
  }

  async * getConsoleInsight(prompt: string, abortController: AbortController): AsyncGenerator<string> {
    // Clone the session to start a fresh conversation for each answer. Otherwise
    // previous dialog would pollute the context resulting in worse answers.
    const session = await this.#consoleInsightsSession.clone();
    const stream = session.promptStreaming(prompt, {
      signal: abortController.signal,
      responseConstraint: RESPONSE_SCHEMA,
    });
    for await (const chunk of stream) {
      yield chunk;
    }
    session.destroy();
  }
}
