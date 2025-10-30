"use strict";
import * as Common from "../common/common.js";
import * as Root from "../root/root.js";
import * as DispatchHttpRequestClient from "./DispatchHttpRequestClient.js";
import { InspectorFrontendHostInstance } from "./InspectorFrontendHost.js";
import { bindOutputStream } from "./ResourceLoader.js";
export var Role = /* @__PURE__ */ ((Role2) => {
  Role2[Role2["ROLE_UNSPECIFIED"] = 0] = "ROLE_UNSPECIFIED";
  Role2[Role2["USER"] = 1] = "USER";
  Role2[Role2["MODEL"] = 2] = "MODEL";
  return Role2;
})(Role || {});
export var Rating = /* @__PURE__ */ ((Rating2) => {
  Rating2["SENTIMENT_UNSPECIFIED"] = "SENTIMENT_UNSPECIFIED";
  Rating2["POSITIVE"] = "POSITIVE";
  Rating2["NEGATIVE"] = "NEGATIVE";
  return Rating2;
})(Rating || {});
export var ParametersTypes = /* @__PURE__ */ ((ParametersTypes2) => {
  ParametersTypes2[ParametersTypes2["STRING"] = 1] = "STRING";
  ParametersTypes2[ParametersTypes2["NUMBER"] = 2] = "NUMBER";
  ParametersTypes2[ParametersTypes2["INTEGER"] = 3] = "INTEGER";
  ParametersTypes2[ParametersTypes2["BOOLEAN"] = 4] = "BOOLEAN";
  ParametersTypes2[ParametersTypes2["ARRAY"] = 5] = "ARRAY";
  ParametersTypes2[ParametersTypes2["OBJECT"] = 6] = "OBJECT";
  return ParametersTypes2;
})(ParametersTypes || {});
export var FunctionalityType = /* @__PURE__ */ ((FunctionalityType2) => {
  FunctionalityType2[FunctionalityType2["FUNCTIONALITY_TYPE_UNSPECIFIED"] = 0] = "FUNCTIONALITY_TYPE_UNSPECIFIED";
  FunctionalityType2[FunctionalityType2["CHAT"] = 1] = "CHAT";
  FunctionalityType2[FunctionalityType2["EXPLAIN_ERROR"] = 2] = "EXPLAIN_ERROR";
  FunctionalityType2[FunctionalityType2["AGENTIC_CHAT"] = 5] = "AGENTIC_CHAT";
  return FunctionalityType2;
})(FunctionalityType || {});
export var ClientFeature = /* @__PURE__ */ ((ClientFeature2) => {
  ClientFeature2[ClientFeature2["CLIENT_FEATURE_UNSPECIFIED"] = 0] = "CLIENT_FEATURE_UNSPECIFIED";
  ClientFeature2[ClientFeature2["CHROME_CONSOLE_INSIGHTS"] = 1] = "CHROME_CONSOLE_INSIGHTS";
  ClientFeature2[ClientFeature2["CHROME_STYLING_AGENT"] = 2] = "CHROME_STYLING_AGENT";
  ClientFeature2[ClientFeature2["CHROME_NETWORK_AGENT"] = 7] = "CHROME_NETWORK_AGENT";
  ClientFeature2[ClientFeature2["CHROME_PERFORMANCE_ANNOTATIONS_AGENT"] = 20] = "CHROME_PERFORMANCE_ANNOTATIONS_AGENT";
  ClientFeature2[ClientFeature2["CHROME_FILE_AGENT"] = 9] = "CHROME_FILE_AGENT";
  ClientFeature2[ClientFeature2["CHROME_PATCH_AGENT"] = 12] = "CHROME_PATCH_AGENT";
  ClientFeature2[ClientFeature2["CHROME_PERFORMANCE_FULL_AGENT"] = 24] = "CHROME_PERFORMANCE_FULL_AGENT";
  return ClientFeature2;
})(ClientFeature || {});
export var UserTier = /* @__PURE__ */ ((UserTier2) => {
  UserTier2[UserTier2["USER_TIER_UNSPECIFIED"] = 0] = "USER_TIER_UNSPECIFIED";
  UserTier2[UserTier2["TESTERS"] = 1] = "TESTERS";
  UserTier2[UserTier2["BETA"] = 2] = "BETA";
  UserTier2[UserTier2["PUBLIC"] = 3] = "PUBLIC";
  return UserTier2;
})(UserTier || {});
export var EditType = /* @__PURE__ */ ((EditType2) => {
  EditType2[EditType2["EDIT_TYPE_UNSPECIFIED"] = 0] = "EDIT_TYPE_UNSPECIFIED";
  EditType2[EditType2["ADD"] = 1] = "ADD";
  EditType2[EditType2["DELETE"] = 2] = "DELETE";
  EditType2[EditType2["PASTE"] = 3] = "PASTE";
  EditType2[EditType2["UNDO"] = 4] = "UNDO";
  EditType2[EditType2["REDO"] = 5] = "REDO";
  EditType2[EditType2["ACCEPT_COMPLETION"] = 6] = "ACCEPT_COMPLETION";
  return EditType2;
})(EditType || {});
export var Reason = /* @__PURE__ */ ((Reason2) => {
  Reason2[Reason2["UNKNOWN"] = 0] = "UNKNOWN";
  Reason2[Reason2["CURRENTLY_OPEN"] = 1] = "CURRENTLY_OPEN";
  Reason2[Reason2["RECENTLY_OPENED"] = 2] = "RECENTLY_OPENED";
  Reason2[Reason2["RECENTLY_EDITED"] = 3] = "RECENTLY_EDITED";
  Reason2[Reason2["COLOCATED"] = 4] = "COLOCATED";
  Reason2[Reason2["RELATED_FILE"] = 5] = "RELATED_FILE";
  return Reason2;
})(Reason || {});
export var UseCase = /* @__PURE__ */ ((UseCase2) => {
  UseCase2[UseCase2["USE_CASE_UNSPECIFIED"] = 0] = "USE_CASE_UNSPECIFIED";
  UseCase2[UseCase2["CODE_GENERATION"] = 1] = "CODE_GENERATION";
  return UseCase2;
})(UseCase || {});
export var RecitationAction = /* @__PURE__ */ ((RecitationAction2) => {
  RecitationAction2["ACTION_UNSPECIFIED"] = "ACTION_UNSPECIFIED";
  RecitationAction2["CITE"] = "CITE";
  RecitationAction2["BLOCK"] = "BLOCK";
  RecitationAction2["NO_ACTION"] = "NO_ACTION";
  RecitationAction2["EXEMPT_FOUND_IN_PROMPT"] = "EXEMPT_FOUND_IN_PROMPT";
  return RecitationAction2;
})(RecitationAction || {});
export var CitationSourceType = /* @__PURE__ */ ((CitationSourceType2) => {
  CitationSourceType2["CITATION_SOURCE_TYPE_UNSPECIFIED"] = "CITATION_SOURCE_TYPE_UNSPECIFIED";
  CitationSourceType2["TRAINING_DATA"] = "TRAINING_DATA";
  CitationSourceType2["WORLD_FACTS"] = "WORLD_FACTS";
  CitationSourceType2["LOCAL_FACTS"] = "LOCAL_FACTS";
  CitationSourceType2["INDIRECT"] = "INDIRECT";
  return CitationSourceType2;
})(CitationSourceType || {});
export var AidaAccessPreconditions = /* @__PURE__ */ ((AidaAccessPreconditions2) => {
  AidaAccessPreconditions2["AVAILABLE"] = "available";
  AidaAccessPreconditions2["NO_ACCOUNT_EMAIL"] = "no-account-email";
  AidaAccessPreconditions2["NO_INTERNET"] = "no-internet";
  AidaAccessPreconditions2["SYNC_IS_PAUSED"] = "sync-is-paused";
  return AidaAccessPreconditions2;
})(AidaAccessPreconditions || {});
export var AidaInferenceLanguage = /* @__PURE__ */ ((AidaInferenceLanguage2) => {
  AidaInferenceLanguage2["CPP"] = "CPP";
  AidaInferenceLanguage2["PYTHON"] = "PYTHON";
  AidaInferenceLanguage2["KOTLIN"] = "KOTLIN";
  AidaInferenceLanguage2["JAVA"] = "JAVA";
  AidaInferenceLanguage2["JAVASCRIPT"] = "JAVASCRIPT";
  AidaInferenceLanguage2["GO"] = "GO";
  AidaInferenceLanguage2["TYPESCRIPT"] = "TYPESCRIPT";
  AidaInferenceLanguage2["HTML"] = "HTML";
  AidaInferenceLanguage2["BASH"] = "BASH";
  AidaInferenceLanguage2["CSS"] = "CSS";
  AidaInferenceLanguage2["DART"] = "DART";
  AidaInferenceLanguage2["JSON"] = "JSON";
  AidaInferenceLanguage2["MARKDOWN"] = "MARKDOWN";
  AidaInferenceLanguage2["VUE"] = "VUE";
  AidaInferenceLanguage2["XML"] = "XML";
  return AidaInferenceLanguage2;
})(AidaInferenceLanguage || {});
const AidaLanguageToMarkdown = {
  CPP: "cpp",
  PYTHON: "py",
  KOTLIN: "kt",
  JAVA: "java",
  JAVASCRIPT: "js",
  GO: "go",
  TYPESCRIPT: "ts",
  HTML: "html",
  BASH: "sh",
  CSS: "css",
  DART: "dart",
  JSON: "json",
  MARKDOWN: "md",
  VUE: "vue",
  XML: "xml"
};
export const CLIENT_NAME = "CHROME_DEVTOOLS";
export const SERVICE_NAME = "aidaService";
const CODE_CHUNK_SEPARATOR = (lang = "") => "\n`````" + lang + "\n";
export class AidaAbortError extends Error {
}
export class AidaBlockError extends Error {
}
export class AidaClient {
  static buildConsoleInsightsRequest(input) {
    const disallowLogging = Root.Runtime.hostConfig.aidaAvailability?.disallowLogging ?? true;
    const chromeVersion = Root.Runtime.getChromeVersion();
    if (!chromeVersion) {
      throw new Error("Cannot determine Chrome version");
    }
    const request = {
      current_message: { parts: [{ text: input }], role: 1 /* USER */ },
      client: CLIENT_NAME,
      functionality_type: 2 /* EXPLAIN_ERROR */,
      client_feature: 1 /* CHROME_CONSOLE_INSIGHTS */,
      metadata: {
        disable_user_content_logging: disallowLogging,
        client_version: chromeVersion
      }
    };
    let temperature = -1;
    let modelId;
    if (Root.Runtime.hostConfig.devToolsConsoleInsights?.enabled) {
      temperature = Root.Runtime.hostConfig.devToolsConsoleInsights.temperature ?? -1;
      modelId = Root.Runtime.hostConfig.devToolsConsoleInsights.modelId;
    }
    if (temperature >= 0) {
      request.options ??= {};
      request.options.temperature = temperature;
    }
    if (modelId) {
      request.options ??= {};
      request.options.model_id = modelId;
    }
    return request;
  }
  static async checkAccessPreconditions() {
    if (!navigator.onLine) {
      return "no-internet" /* NO_INTERNET */;
    }
    const syncInfo = await new Promise(
      (resolve) => InspectorFrontendHostInstance.getSyncInformation((syncInfo2) => resolve(syncInfo2))
    );
    if (!syncInfo.accountEmail) {
      return "no-account-email" /* NO_ACCOUNT_EMAIL */;
    }
    if (syncInfo.isSyncPaused) {
      return "sync-is-paused" /* SYNC_IS_PAUSED */;
    }
    return "available" /* AVAILABLE */;
  }
  async *doConversation(request, options) {
    if (!InspectorFrontendHostInstance.doAidaConversation) {
      throw new Error("doAidaConversation is not available");
    }
    const stream = (() => {
      let { promise, resolve, reject } = Promise.withResolvers();
      options?.signal?.addEventListener("abort", () => {
        reject(new AidaAbortError());
      }, { once: true });
      return {
        write: async (data) => {
          resolve(data);
          ({ promise, resolve, reject } = Promise.withResolvers());
        },
        close: async () => {
          resolve(null);
        },
        read: () => {
          return promise;
        },
        fail: (e) => reject(e)
      };
    })();
    const streamId = bindOutputStream(stream);
    InspectorFrontendHostInstance.doAidaConversation(JSON.stringify(request), streamId, (result) => {
      if (result.statusCode === 403) {
        stream.fail(new Error("Server responded: permission denied"));
      } else if (result.error) {
        stream.fail(new Error(`Cannot send request: ${result.error} ${result.detail || ""}`));
      } else if (result.netErrorName === "net::ERR_TIMED_OUT") {
        stream.fail(new Error("doAidaConversation timed out"));
      } else if (result.statusCode !== 200) {
        stream.fail(new Error(`Request failed: ${JSON.stringify(result)}`));
      } else {
        void stream.close();
      }
    });
    let chunk;
    const text = [];
    let inCodeChunk = false;
    const functionCalls = [];
    let metadata = { rpcGlobalId: 0 };
    while (chunk = await stream.read()) {
      let textUpdated = false;
      if (!chunk.length) {
        continue;
      }
      if (chunk.startsWith(",")) {
        chunk = chunk.slice(1);
      }
      if (!chunk.startsWith("[")) {
        chunk = "[" + chunk;
      }
      if (!chunk.endsWith("]")) {
        chunk = chunk + "]";
      }
      let results;
      try {
        results = JSON.parse(chunk);
      } catch (error) {
        throw new Error("Cannot parse chunk: " + chunk, { cause: error });
      }
      for (const result of results) {
        if ("metadata" in result) {
          metadata = result.metadata;
          if (metadata?.attributionMetadata?.attributionAction === "BLOCK" /* BLOCK */) {
            throw new AidaBlockError();
          }
        }
        if ("textChunk" in result) {
          if (inCodeChunk) {
            text.push(CODE_CHUNK_SEPARATOR());
            inCodeChunk = false;
          }
          text.push(result.textChunk.text);
          textUpdated = true;
        } else if ("codeChunk" in result) {
          if (!inCodeChunk) {
            const language = AidaLanguageToMarkdown[result.codeChunk.inferenceLanguage] ?? "";
            text.push(CODE_CHUNK_SEPARATOR(language));
            inCodeChunk = true;
          }
          text.push(result.codeChunk.code);
          textUpdated = true;
        } else if ("functionCallChunk" in result) {
          functionCalls.push({
            name: result.functionCallChunk.functionCall.name,
            args: result.functionCallChunk.functionCall.args
          });
        } else if ("error" in result) {
          throw new Error(`Server responded: ${JSON.stringify(result)}`);
        } else {
          throw new Error("Unknown chunk result");
        }
      }
      if (textUpdated) {
        yield {
          explanation: text.join("") + (inCodeChunk ? CODE_CHUNK_SEPARATOR() : ""),
          metadata,
          completed: false
        };
      }
    }
    yield {
      explanation: text.join("") + (inCodeChunk ? CODE_CHUNK_SEPARATOR() : ""),
      metadata,
      functionCalls: functionCalls.length ? functionCalls : void 0,
      completed: true
    };
  }
  registerClientEvent(clientEvent) {
    const { promise, resolve } = Promise.withResolvers();
    InspectorFrontendHostInstance.registerAidaClientEvent(
      JSON.stringify({
        client: CLIENT_NAME,
        event_time: (/* @__PURE__ */ new Date()).toISOString(),
        ...clientEvent
      }),
      resolve
    );
    return promise;
  }
  async completeCode(request) {
    if (!InspectorFrontendHostInstance.aidaCodeComplete) {
      throw new Error("aidaCodeComplete is not available");
    }
    const { promise, resolve } = Promise.withResolvers();
    InspectorFrontendHostInstance.aidaCodeComplete(JSON.stringify(request), resolve);
    const completeCodeResult = await promise;
    if (completeCodeResult.error) {
      throw new Error(`Cannot send request: ${completeCodeResult.error} ${completeCodeResult.detail || ""}`);
    }
    const response = completeCodeResult.response;
    if (!response?.length) {
      throw new Error("Empty response");
    }
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
    } catch (error) {
      throw new Error("Cannot parse response: " + response, { cause: error });
    }
    const generatedSamples = [];
    let metadata = { rpcGlobalId: 0 };
    if ("metadata" in parsedResponse) {
      metadata = parsedResponse.metadata;
    }
    if ("generatedSamples" in parsedResponse) {
      for (const generatedSample of parsedResponse.generatedSamples) {
        const sample = {
          generationString: generatedSample.generationString,
          score: generatedSample.score,
          sampleId: generatedSample.sampleId
        };
        if ("metadata" in generatedSample && "attributionMetadata" in generatedSample.metadata) {
          sample.attributionMetadata = generatedSample.metadata.attributionMetadata;
        }
        generatedSamples.push(sample);
      }
    } else {
      return null;
    }
    return { generatedSamples, metadata };
  }
  async generateCode(request) {
    const response = await DispatchHttpRequestClient.makeHttpRequest({
      service: SERVICE_NAME,
      path: "/v1/aida:generateCode",
      method: "POST",
      body: JSON.stringify(request)
    });
    return response;
  }
}
export function convertToUserTierEnum(userTier) {
  if (userTier) {
    switch (userTier) {
      case "TESTERS":
        return 1 /* TESTERS */;
      case "BETA":
        return 2 /* BETA */;
      case "PUBLIC":
        return 3 /* PUBLIC */;
    }
  }
  return 2 /* BETA */;
}
let hostConfigTrackerInstance;
export class HostConfigTracker extends Common.ObjectWrapper.ObjectWrapper {
  #pollTimer;
  #aidaAvailability;
  constructor() {
    super();
  }
  static instance() {
    if (!hostConfigTrackerInstance) {
      hostConfigTrackerInstance = new HostConfigTracker();
    }
    return hostConfigTrackerInstance;
  }
  addEventListener(eventType, listener) {
    const isFirst = !this.hasEventListeners(eventType);
    const eventDescriptor = super.addEventListener(eventType, listener);
    if (isFirst) {
      window.clearTimeout(this.#pollTimer);
      void this.pollAidaAvailability();
    }
    return eventDescriptor;
  }
  removeEventListener(eventType, listener) {
    super.removeEventListener(eventType, listener);
    if (!this.hasEventListeners(eventType)) {
      window.clearTimeout(this.#pollTimer);
    }
  }
  async pollAidaAvailability() {
    this.#pollTimer = window.setTimeout(() => this.pollAidaAvailability(), 2e3);
    const currentAidaAvailability = await AidaClient.checkAccessPreconditions();
    if (currentAidaAvailability !== this.#aidaAvailability) {
      this.#aidaAvailability = currentAidaAvailability;
      const config = await new Promise((resolve) => InspectorFrontendHostInstance.getHostConfig(resolve));
      Object.assign(Root.Runtime.hostConfig, config);
      this.dispatchEventToListeners("aidaAvailabilityChanged" /* AIDA_AVAILABILITY_CHANGED */);
    }
  }
}
export var Events = /* @__PURE__ */ ((Events2) => {
  Events2["AIDA_AVAILABILITY_CHANGED"] = "aidaAvailabilityChanged";
  return Events2;
})(Events || {});
//# sourceMappingURL=AidaClient.js.map
