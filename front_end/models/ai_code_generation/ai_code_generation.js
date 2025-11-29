var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/ai_code_generation/debug.js
function isDebugMode() {
  return Boolean(localStorage.getItem("debugAiCodeGenerationEnabled"));
}
function debugLog(...log) {
  if (!isDebugMode()) {
    return;
  }
  console.log(...log);
}
function setDebugAiCodeGenerationEnabled(enabled) {
  if (enabled) {
    localStorage.setItem("debugAiCodeGenerationEnabled", "true");
  } else {
    localStorage.removeItem("debugAiCodeGenerationEnabled");
  }
}
globalThis.setDebugAiCodeGenerationEnabled = setDebugAiCodeGenerationEnabled;

// gen/front_end/models/ai_code_generation/AiCodeGeneration.js
var AiCodeGeneration_exports = {};
__export(AiCodeGeneration_exports, {
  AiCodeGeneration: () => AiCodeGeneration,
  additionalContextForConsole: () => additionalContextForConsole,
  basePreamble: () => basePreamble
});
import * as Host from "./../../core/host/host.js";
import * as Root from "./../../core/root/root.js";
var basePreamble = `You are a highly skilled senior software engineer with deep expertise across multiple web technologies and programming languages, including JavaScript, TypeScript, HTML, and CSS.
Your role is to act as an expert pair programmer within the Chrome DevTools environment.

**Core Directives (Adhere to these strictly):**

1.  **Language and Quality:**
    *   Generate code that is modern, efficient, and idiomatic for the inferred language (e.g., modern JavaScript/ES6+, semantic HTML5, efficient CSS).
    *   Where appropriate, include basic error handling (e.g., for API calls).
`;
var additionalContextForConsole = `
You are operating within the execution environment of the Chrome DevTools Console.
The console has direct access to the inspected page's \`window\` and \`document\`.

*   **Utilize Console Utilities:** You have access to the Console Utilities API. You **should** use these helper functions and variables when they are the most direct way to accomplish the user's goal.
`;
var AiCodeGeneration = class {
  #sessionId = crypto.randomUUID();
  #aidaClient;
  #serverSideLoggingEnabled;
  constructor(opts) {
    this.#aidaClient = opts.aidaClient;
    this.#serverSideLoggingEnabled = opts.serverSideLoggingEnabled ?? false;
  }
  #buildRequest(prompt, preamble, inferenceLanguage = "JAVASCRIPT") {
    const userTier = Host.AidaClient.convertToUserTierEnum(this.#userTier);
    function validTemperature(temperature) {
      return typeof temperature === "number" && temperature >= 0 ? temperature : void 0;
    }
    return {
      client: Host.AidaClient.CLIENT_NAME,
      preamble,
      current_message: {
        parts: [{
          text: prompt
        }],
        role: Host.AidaClient.Role.USER
      },
      use_case: Host.AidaClient.UseCase.CODE_GENERATION,
      options: {
        inference_language: inferenceLanguage,
        temperature: validTemperature(this.#options.temperature),
        model_id: this.#options.modelId || void 0,
        expect_code_output: true
      },
      metadata: {
        disable_user_content_logging: !(this.#serverSideLoggingEnabled ?? false),
        string_session_id: this.#sessionId,
        user_tier: userTier,
        client_version: Root.Runtime.getChromeVersion()
      }
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
      modelId
    };
  }
  registerUserImpression(rpcGlobalId, latency, sampleId) {
    const seconds = Math.floor(latency / 1e3);
    const remainingMs = latency % 1e3;
    const nanos = Math.floor(remainingMs * 1e6);
    void this.#aidaClient.registerClientEvent({
      corresponding_aida_rpc_global_id: rpcGlobalId,
      disable_user_content_logging: true,
      generate_code_client_event: {
        user_impression: {
          sample: {
            sample_id: sampleId
          },
          latency: {
            duration: {
              seconds,
              nanos
            }
          }
        }
      }
    });
    debugLog("Registered user impression with latency {seconds:", seconds, ", nanos:", nanos, "}");
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeGenerationSuggestionDisplayed);
  }
  registerUserAcceptance(rpcGlobalId, sampleId) {
    void this.#aidaClient.registerClientEvent({
      corresponding_aida_rpc_global_id: rpcGlobalId,
      disable_user_content_logging: true,
      generate_code_client_event: {
        user_acceptance: {
          sample: {
            sample_id: sampleId
          }
        }
      }
    });
    debugLog("Registered user acceptance");
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeGenerationSuggestionAccepted);
  }
  async generateCode(prompt, preamble, inferenceLanguage, options) {
    const request = this.#buildRequest(prompt, preamble, inferenceLanguage);
    const response = await this.#aidaClient.generateCode(request, options);
    debugLog({ request, response });
    return response;
  }
  static isAiCodeGenerationEnabled(locale) {
    if (!locale.startsWith("en-")) {
      return false;
    }
    const aidaAvailability = Root.Runtime.hostConfig.aidaAvailability;
    if (!aidaAvailability || aidaAvailability.blockedByGeo || aidaAvailability.blockedByAge || aidaAvailability.blockedByEnterprisePolicy) {
      return false;
    }
    return Boolean(aidaAvailability.enabled && Root.Runtime.hostConfig.devToolsAiCodeGeneration?.enabled);
  }
};
export {
  AiCodeGeneration_exports as AiCodeGeneration,
  debugLog,
  isDebugMode
};
//# sourceMappingURL=ai_code_generation.js.map
