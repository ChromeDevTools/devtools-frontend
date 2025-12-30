// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
import { debugLog } from './debug.js';
export const basePreamble = `You are a highly skilled senior software engineer with deep expertise across multiple web technologies and programming languages, including JavaScript, TypeScript, HTML, and CSS.
Your role is to act as an expert pair programmer within the Chrome DevTools environment.

**Core Directives (Adhere to these strictly):**

1. **Language and Quality:**
    * Generate code that is modern, efficient, and idiomatic for the inferred language (e.g., modern JavaScript/ES6+, semantic HTML5, efficient CSS).
    * Where appropriate, include basic error handling (e.g., for API calls).
    * Determine the programming language from the user's prompt.

2.  **Output Format (Strict):**
    * **Return ONLY code blocks.** * Do NOT include any introductory text, explanations, or concluding remarks.
    * Do NOT provide step-by-step guides or descriptions of how the code works.
    * Inline comments within the code are permitted and encouraged for clarity.
`;
export const additionalContextForConsole = `
You are operating within the execution environment of the Chrome DevTools Console.
The console has direct access to the inspected page's \`window\` and \`document\`.

*   **Utilize Console Utilities:** You have access to the Console Utilities API. You **should** use these helper functions and variables when they are the most direct way to accomplish the user's goal.
`;
/**
 * The AiCodeGeneration class is responsible for fetching generated code suggestions
 * from the AIDA backend.
 */
export class AiCodeGeneration {
    #sessionId = crypto.randomUUID();
    #aidaClient;
    #serverSideLoggingEnabled;
    constructor(opts) {
        this.#aidaClient = opts.aidaClient;
        this.#serverSideLoggingEnabled = opts.serverSideLoggingEnabled ?? false;
    }
    #buildRequest(prompt, preamble, inferenceLanguage = "JAVASCRIPT" /* Host.AidaClient.AidaInferenceLanguage.JAVASCRIPT */) {
        const userTier = Host.AidaClient.convertToUserTierEnum(this.#userTier);
        function validTemperature(temperature) {
            return typeof temperature === 'number' && temperature >= 0 ? temperature : undefined;
        }
        // Workaround: Combine preamble and target language into the main prompt to enforce instructions.
        // The API and model ignores system-level instructions provided in the preamble field of the request.
        prompt = preamble + prompt + '\n**Target Language:** ' + inferenceLanguage;
        return {
            client: Host.AidaClient.CLIENT_NAME,
            preamble,
            current_message: {
                parts: [{
                        text: prompt,
                    }],
                role: Host.AidaClient.Role.USER,
            },
            use_case: Host.AidaClient.UseCase.CODE_GENERATION,
            options: {
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
    get #userTier() {
        return Root.Runtime.hostConfig.devToolsAiCodeGeneration?.userTier;
    }
    get #options() {
        const temperature = Root.Runtime.hostConfig.devToolsAiCodeGeneration?.temperature;
        const modelId = Root.Runtime.hostConfig.devToolsAiCodeGeneration?.modelId;
        return {
            temperature,
            modelId,
        };
    }
    registerUserImpression(rpcGlobalId, latency, sampleId) {
        const seconds = Math.floor(latency / 1_000);
        const remainingMs = latency % 1_000;
        const nanos = Math.floor(remainingMs * 1_000_000);
        void this.#aidaClient.registerClientEvent({
            corresponding_aida_rpc_global_id: rpcGlobalId,
            disable_user_content_logging: true,
            generate_code_client_event: {
                user_impression: {
                    sample: {
                        sample_id: sampleId,
                    },
                    latency: {
                        duration: {
                            seconds,
                            nanos,
                        },
                    }
                },
            },
        });
        debugLog('Registered user impression with latency {seconds:', seconds, ', nanos:', nanos, '}');
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeGenerationSuggestionDisplayed);
    }
    registerUserAcceptance(rpcGlobalId, sampleId) {
        void this.#aidaClient.registerClientEvent({
            corresponding_aida_rpc_global_id: rpcGlobalId,
            disable_user_content_logging: true,
            generate_code_client_event: {
                user_acceptance: {
                    sample: {
                        sample_id: sampleId,
                    }
                },
            },
        });
        debugLog('Registered user acceptance');
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeGenerationSuggestionAccepted);
    }
    async generateCode(prompt, preamble, inferenceLanguage, options) {
        const request = this.#buildRequest(prompt, preamble, inferenceLanguage);
        const response = await this.#aidaClient.generateCode(request, options);
        debugLog({ request, response });
        return response;
    }
    static isAiCodeGenerationEnabled(locale) {
        if (!locale.startsWith('en-')) {
            return false;
        }
        const aidaAvailability = Root.Runtime.hostConfig.aidaAvailability;
        if (!aidaAvailability || aidaAvailability.blockedByGeo || aidaAvailability.blockedByAge ||
            aidaAvailability.blockedByEnterprisePolicy) {
            return false;
        }
        return Boolean(aidaAvailability.enabled && Root.Runtime.hostConfig.devToolsAiCodeGeneration?.enabled);
    }
}
//# sourceMappingURL=AiCodeGeneration.js.map