// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
let builtInAiInstance;
export class BuiltInAi {
    #availability = null;
    #hasGpu;
    #consoleInsightsSession = null;
    static instance() {
        if (builtInAiInstance === undefined) {
            builtInAiInstance = new BuiltInAi();
        }
        return builtInAiInstance;
    }
    constructor() {
        this.#hasGpu = this.#isGpuAvailable();
        void this.getLanguageModelAvailability().then(() => this.initialize()).then(() => this.#sendAvailabilityMetrics());
    }
    async getLanguageModelAvailability() {
        if (!Root.Runtime.hostConfig.devToolsAiPromptApi?.enabled) {
            this.#availability = "disabled" /* LanguageModelAvailability.DISABLED */;
            return this.#availability;
        }
        try {
            // @ts-expect-error
            this.#availability = await window.LanguageModel.availability({ expectedOutputs: [{ type: 'text', languages: ['en'] }] });
        }
        catch {
            this.#availability = "unavailable" /* LanguageModelAvailability.UNAVAILABLE */;
        }
        return this.#availability;
    }
    #isGpuAvailable() {
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
        }
        catch {
            return false;
        }
        return true;
    }
    hasSession() {
        return Boolean(this.#consoleInsightsSession);
    }
    async initialize() {
        if (!Root.Runtime.hostConfig.devToolsAiPromptApi?.allowWithoutGpu && !this.#hasGpu) {
            return;
        }
        if (this.#availability !== "available" /* LanguageModelAvailability.AVAILABLE */) {
            return;
        }
        await this.#createSession();
    }
    async #createSession() {
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
            if (this.#availability !== "available" /* LanguageModelAvailability.AVAILABLE */) {
                void this.getLanguageModelAvailability();
            }
        }
        catch (e) {
            console.error('Error when creating LanguageModel session', e.message);
        }
    }
    static removeInstance() {
        builtInAiInstance = undefined;
    }
    async *getConsoleInsight(prompt, abortController) {
        if (!this.#consoleInsightsSession) {
            return;
        }
        // Clone the session to start a fresh conversation for each answer. Otherwise
        // previous dialog would pollute the context resulting in worse answers.
        let session = null;
        try {
            session = await this.#consoleInsightsSession.clone();
            const stream = session.promptStreaming(prompt, {
                signal: abortController.signal,
            });
            for await (const chunk of stream) {
                yield chunk;
            }
        }
        finally {
            if (session) {
                session.destroy();
            }
        }
    }
    #sendAvailabilityMetrics() {
        if (this.#hasGpu) {
            switch (this.#availability) {
                case "unavailable" /* LanguageModelAvailability.UNAVAILABLE */:
                    Host.userMetrics.builtInAiAvailability(0 /* Host.UserMetrics.BuiltInAiAvailability.UNAVAILABLE_HAS_GPU */);
                    break;
                case "downloadable" /* LanguageModelAvailability.DOWNLOADABLE */:
                    Host.userMetrics.builtInAiAvailability(1 /* Host.UserMetrics.BuiltInAiAvailability.DOWNLOADABLE_HAS_GPU */);
                    break;
                case "downloading" /* LanguageModelAvailability.DOWNLOADING */:
                    Host.userMetrics.builtInAiAvailability(2 /* Host.UserMetrics.BuiltInAiAvailability.DOWNLOADING_HAS_GPU */);
                    break;
                case "available" /* LanguageModelAvailability.AVAILABLE */:
                    Host.userMetrics.builtInAiAvailability(3 /* Host.UserMetrics.BuiltInAiAvailability.AVAILABLE_HAS_GPU */);
                    break;
                case "disabled" /* LanguageModelAvailability.DISABLED */:
                    Host.userMetrics.builtInAiAvailability(4 /* Host.UserMetrics.BuiltInAiAvailability.DISABLED_HAS_GPU */);
                    break;
            }
        }
        else {
            switch (this.#availability) {
                case "unavailable" /* LanguageModelAvailability.UNAVAILABLE */:
                    Host.userMetrics.builtInAiAvailability(5 /* Host.UserMetrics.BuiltInAiAvailability.UNAVAILABLE_NO_GPU */);
                    break;
                case "downloadable" /* LanguageModelAvailability.DOWNLOADABLE */:
                    Host.userMetrics.builtInAiAvailability(6 /* Host.UserMetrics.BuiltInAiAvailability.DOWNLOADABLE_NO_GPU */);
                    break;
                case "downloading" /* LanguageModelAvailability.DOWNLOADING */:
                    Host.userMetrics.builtInAiAvailability(7 /* Host.UserMetrics.BuiltInAiAvailability.DOWNLOADING_NO_GPU */);
                    break;
                case "available" /* LanguageModelAvailability.AVAILABLE */:
                    Host.userMetrics.builtInAiAvailability(8 /* Host.UserMetrics.BuiltInAiAvailability.AVAILABLE_NO_GPU */);
                    break;
                case "disabled" /* LanguageModelAvailability.DISABLED */:
                    Host.userMetrics.builtInAiAvailability(9 /* Host.UserMetrics.BuiltInAiAvailability.DISABLED_NO_GPU */);
                    break;
            }
        }
    }
}
//# sourceMappingURL=BuiltInAi.js.map