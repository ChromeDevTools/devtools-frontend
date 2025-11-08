// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
let builtInAiInstance;
let availability;
let hasGpu;
let isFirstRun = true;
export class BuiltInAi {
    #consoleInsightsSession;
    static async getLanguageModelAvailability() {
        if (!Root.Runtime.hostConfig.devToolsAiPromptApi?.enabled) {
            return "disabled" /* LanguageModelAvailability.DISABLED */;
        }
        try {
            // @ts-expect-error
            availability = await window.LanguageModel.availability({ expectedOutputs: [{ type: 'text', languages: ['en'] }] });
            return availability;
        }
        catch {
            return "unavailable" /* LanguageModelAvailability.UNAVAILABLE */;
        }
    }
    static cachedIsAvailable() {
        return availability === "available" /* LanguageModelAvailability.AVAILABLE */ &&
            (hasGpu || Boolean(Root.Runtime.hostConfig.devToolsAiPromptApi?.allowWithoutGpu));
    }
    static isGpuAvailable() {
        const hasGpuHelper = () => {
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
        };
        if (hasGpu !== undefined) {
            return hasGpu;
        }
        hasGpu = hasGpuHelper();
        return hasGpu;
    }
    constructor(consoleInsightsSession) {
        this.#consoleInsightsSession = consoleInsightsSession;
    }
    static async instance() {
        if (builtInAiInstance === undefined) {
            if (isFirstRun) {
                const languageModelAvailability = await BuiltInAi.getLanguageModelAvailability();
                const hasGpu = BuiltInAi.isGpuAvailable();
                if (hasGpu) {
                    switch (languageModelAvailability) {
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
                    switch (languageModelAvailability) {
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
                isFirstRun = false;
                if (!Root.Runtime.hostConfig.devToolsAiPromptApi?.allowWithoutGpu && !hasGpu) {
                    return undefined;
                }
                if (languageModelAvailability !== "available" /* LanguageModelAvailability.AVAILABLE */) {
                    return undefined;
                }
            }
            else {
                if (!Root.Runtime.hostConfig.devToolsAiPromptApi?.allowWithoutGpu && !BuiltInAi.isGpuAvailable()) {
                    return undefined;
                }
                if ((await BuiltInAi.getLanguageModelAvailability()) !== "available" /* LanguageModelAvailability.AVAILABLE */) {
                    return undefined;
                }
            }
            try {
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
                });
                builtInAiInstance = new BuiltInAi(consoleInsightsSession);
            }
            catch {
                return undefined;
            }
        }
        return builtInAiInstance;
    }
    static removeInstance() {
        builtInAiInstance = undefined;
    }
    async *getConsoleInsight(prompt, abortController) {
        // Clone the session to start a fresh conversation for each answer. Otherwise
        // previous dialog would pollute the context resulting in worse answers.
        const session = await this.#consoleInsightsSession.clone();
        const stream = session.promptStreaming(prompt, {
            signal: abortController.signal,
        });
        for await (const chunk of stream) {
            yield chunk;
        }
        session.destroy();
    }
}
//# sourceMappingURL=BuiltInAi.js.map