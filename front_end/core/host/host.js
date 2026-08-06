var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/core/host/AidaClient.js
var AidaClient_exports = {};
__export(AidaClient_exports, {
  AidaAbortError: () => AidaAbortError,
  AidaBlockError: () => AidaBlockError,
  AidaClient: () => AidaClient,
  AidaClientError: () => AidaClientError,
  AidaInvalidJsonResponseError: () => AidaInvalidJsonResponseError,
  AidaPayloadTooLargeError: () => AidaPayloadTooLargeError,
  AidaPermissionDeniedError: () => AidaPermissionDeniedError,
  AidaQuotaError: () => AidaQuotaError,
  AidaTimeoutError: () => AidaTimeoutError,
  AidaUnknownError: () => AidaUnknownError,
  CLIENT_NAME: () => CLIENT_NAME,
  CitationSourceType: () => CitationSourceType,
  ClientFeature: () => ClientFeature,
  EditType: () => EditType,
  FunctionalityType: () => FunctionalityType,
  HostConfigTracker: () => HostConfigTracker,
  Reason: () => Reason,
  RecitationAction: () => RecitationAction,
  Role: () => Role,
  SERVICE_NAME: () => SERVICE_NAME2,
  UseCase: () => UseCase,
  UserTier: () => UserTier,
  convertToUserTierEnum: () => convertToUserTierEnum,
  debugLog: () => debugLog,
  getClientFeatureName: () => getClientFeatureName,
  isPayloadTooLargeError: () => isPayloadTooLargeError,
  isQuotaError: () => isQuotaError,
  mapError: () => mapError
});
import * as Common4 from "./../common/common.js";
import * as Platform4 from "./../platform/platform.js";
import * as Root3 from "./../root/root.js";

// gen/front_end/core/host/AidaClientTypes.js
import * as Platform from "./../platform/platform.js";
var Role;
(function(Role2) {
  Role2[Role2["ROLE_UNSPECIFIED"] = 0] = "ROLE_UNSPECIFIED";
  Role2[Role2["USER"] = 1] = "USER";
  Role2[Role2["MODEL"] = 2] = "MODEL";
})(Role || (Role = {}));
var FunctionalityType;
(function(FunctionalityType2) {
  FunctionalityType2[FunctionalityType2["FUNCTIONALITY_TYPE_UNSPECIFIED"] = 0] = "FUNCTIONALITY_TYPE_UNSPECIFIED";
  FunctionalityType2[FunctionalityType2["CHAT"] = 1] = "CHAT";
  FunctionalityType2[FunctionalityType2["EXPLAIN_ERROR"] = 2] = "EXPLAIN_ERROR";
  FunctionalityType2[FunctionalityType2["AGENTIC_CHAT"] = 5] = "AGENTIC_CHAT";
})(FunctionalityType || (FunctionalityType = {}));
var ClientFeature;
(function(ClientFeature2) {
  ClientFeature2[ClientFeature2["CLIENT_FEATURE_UNSPECIFIED"] = 0] = "CLIENT_FEATURE_UNSPECIFIED";
  ClientFeature2[ClientFeature2["CHROME_CONSOLE_INSIGHTS"] = 1] = "CHROME_CONSOLE_INSIGHTS";
  ClientFeature2[ClientFeature2["CHROME_STYLING_AGENT"] = 2] = "CHROME_STYLING_AGENT";
  ClientFeature2[ClientFeature2["CHROME_NETWORK_AGENT"] = 7] = "CHROME_NETWORK_AGENT";
  ClientFeature2[ClientFeature2["CHROME_PERFORMANCE_ANNOTATIONS_AGENT"] = 20] = "CHROME_PERFORMANCE_ANNOTATIONS_AGENT";
  ClientFeature2[ClientFeature2["CHROME_FILE_AGENT"] = 9] = "CHROME_FILE_AGENT";
  ClientFeature2[ClientFeature2["CHROME_PATCH_AGENT"] = 12] = "CHROME_PATCH_AGENT";
  ClientFeature2[ClientFeature2["CHROME_PERFORMANCE_FULL_AGENT"] = 24] = "CHROME_PERFORMANCE_FULL_AGENT";
  ClientFeature2[ClientFeature2["CHROME_CONTEXT_SELECTION_AGENT"] = 25] = "CHROME_CONTEXT_SELECTION_AGENT";
  ClientFeature2[ClientFeature2["CHROME_ACCESSIBILITY_AGENT"] = 26] = "CHROME_ACCESSIBILITY_AGENT";
  ClientFeature2[ClientFeature2["CHROME_CONVERSATION_SUMMARY_AGENT"] = 27] = "CHROME_CONVERSATION_SUMMARY_AGENT";
  ClientFeature2[ClientFeature2["CHROME_STORAGE_AGENT"] = 28] = "CHROME_STORAGE_AGENT";
  ClientFeature2[ClientFeature2["CHROME_DEVTOOLS_V2_AGENT"] = 29] = "CHROME_DEVTOOLS_V2_AGENT";
})(ClientFeature || (ClientFeature = {}));
var UserTier;
(function(UserTier2) {
  UserTier2[UserTier2["USER_TIER_UNSPECIFIED"] = 0] = "USER_TIER_UNSPECIFIED";
  UserTier2[UserTier2["TESTERS"] = 1] = "TESTERS";
  UserTier2[UserTier2["BETA"] = 2] = "BETA";
  UserTier2[UserTier2["PUBLIC"] = 3] = "PUBLIC";
})(UserTier || (UserTier = {}));
var EditType;
(function(EditType2) {
  EditType2[EditType2["EDIT_TYPE_UNSPECIFIED"] = 0] = "EDIT_TYPE_UNSPECIFIED";
  EditType2[EditType2["ADD"] = 1] = "ADD";
  EditType2[EditType2["DELETE"] = 2] = "DELETE";
  EditType2[EditType2["PASTE"] = 3] = "PASTE";
  EditType2[EditType2["UNDO"] = 4] = "UNDO";
  EditType2[EditType2["REDO"] = 5] = "REDO";
  EditType2[EditType2["ACCEPT_COMPLETION"] = 6] = "ACCEPT_COMPLETION";
})(EditType || (EditType = {}));
var Reason;
(function(Reason2) {
  Reason2[Reason2["UNKNOWN"] = 0] = "UNKNOWN";
  Reason2[Reason2["CURRENTLY_OPEN"] = 1] = "CURRENTLY_OPEN";
  Reason2[Reason2["RECENTLY_OPENED"] = 2] = "RECENTLY_OPENED";
  Reason2[Reason2["RECENTLY_EDITED"] = 3] = "RECENTLY_EDITED";
  Reason2[Reason2["COLOCATED"] = 4] = "COLOCATED";
  Reason2[Reason2["RELATED_FILE"] = 5] = "RELATED_FILE";
})(Reason || (Reason = {}));
var UseCase;
(function(UseCase2) {
  UseCase2[UseCase2["USE_CASE_UNSPECIFIED"] = 0] = "USE_CASE_UNSPECIFIED";
  UseCase2[UseCase2["CODE_GENERATION"] = 1] = "CODE_GENERATION";
  UseCase2[UseCase2["CODE_TRANSFORMATION"] = 2] = "CODE_TRANSFORMATION";
})(UseCase || (UseCase = {}));
var RecitationAction;
(function(RecitationAction2) {
  RecitationAction2["ACTION_UNSPECIFIED"] = "ACTION_UNSPECIFIED";
  RecitationAction2["CITE"] = "CITE";
  RecitationAction2["BLOCK"] = "BLOCK";
  RecitationAction2["NO_ACTION"] = "NO_ACTION";
  RecitationAction2["EXEMPT_FOUND_IN_PROMPT"] = "EXEMPT_FOUND_IN_PROMPT";
})(RecitationAction || (RecitationAction = {}));
var CitationSourceType;
(function(CitationSourceType2) {
  CitationSourceType2["CITATION_SOURCE_TYPE_UNSPECIFIED"] = "CITATION_SOURCE_TYPE_UNSPECIFIED";
  CitationSourceType2["TRAINING_DATA"] = "TRAINING_DATA";
  CitationSourceType2["WORLD_FACTS"] = "WORLD_FACTS";
  CitationSourceType2["LOCAL_FACTS"] = "LOCAL_FACTS";
  CitationSourceType2["INDIRECT"] = "INDIRECT";
})(CitationSourceType || (CitationSourceType = {}));
function debugLog(...log) {
  if (!Boolean(Platform.HostRuntime.HOST_RUNTIME.getLocalStorage()?.getItem("debugAiServicesEnabled"))) {
    return;
  }
  console.log(...log);
}

// gen/front_end/core/host/AidaGcaTranslation.js
var AidaGcaTranslation_exports = {};
__export(AidaGcaTranslation_exports, {
  aidaCompletionRequestToGcaRequest: () => aidaCompletionRequestToGcaRequest,
  aidaDoConversationRequestToGcaRequest: () => aidaDoConversationRequestToGcaRequest,
  aidaEventToGcaTelemetryRequest: () => aidaEventToGcaTelemetryRequest,
  aidaGenerateCodeRequestToGcaRequest: () => aidaGenerateCodeRequestToGcaRequest,
  gcaChunkResponseToAidaChunkResponse: () => gcaChunkResponseToAidaChunkResponse,
  gcaResponseToAidaCompletionResponse: () => gcaResponseToAidaCompletionResponse,
  gcaResponseToAidaDoConversationResponse: () => gcaResponseToAidaDoConversationResponse,
  gcaResponseToAidaGenerateCodeResponse: () => gcaResponseToAidaGenerateCodeResponse
});

// gen/front_end/core/host/GcaTypes.js
var GcaTypes_exports = {};
__export(GcaTypes_exports, {
  BlockReason: () => BlockReason,
  FinishReason: () => FinishReason,
  HarmBlockMethod: () => HarmBlockMethod,
  HarmBlockThreshold: () => HarmBlockThreshold,
  HarmCategory: () => HarmCategory,
  HarmProbability: () => HarmProbability,
  InclusionReason: () => InclusionReason,
  InteractionType: () => InteractionType,
  Language: () => Language,
  Method: () => Method,
  Mode: () => Mode,
  Outcome: () => Outcome,
  SuggestionStatus: () => SuggestionStatus,
  Type: () => Type
});
var Type;
(function(Type2) {
  Type2[Type2["TYPE_UNSPECIFIED"] = 0] = "TYPE_UNSPECIFIED";
  Type2[Type2["STRING"] = 1] = "STRING";
  Type2[Type2["NUMBER"] = 2] = "NUMBER";
  Type2[Type2["INTEGER"] = 3] = "INTEGER";
  Type2[Type2["BOOLEAN"] = 4] = "BOOLEAN";
  Type2[Type2["ARRAY"] = 5] = "ARRAY";
  Type2[Type2["OBJECT"] = 6] = "OBJECT";
  Type2[Type2["NULL"] = 7] = "NULL";
})(Type || (Type = {}));
var HarmCategory;
(function(HarmCategory2) {
  HarmCategory2[HarmCategory2["HARM_CATEGORY_UNSPECIFIED"] = 0] = "HARM_CATEGORY_UNSPECIFIED";
  HarmCategory2[HarmCategory2["HARM_CATEGORY_HARASSMENT"] = 7] = "HARM_CATEGORY_HARASSMENT";
  HarmCategory2[HarmCategory2["HARM_CATEGORY_HATE_SPEECH"] = 8] = "HARM_CATEGORY_HATE_SPEECH";
  HarmCategory2[HarmCategory2["HARM_CATEGORY_SEXUALLY_EXPLICIT"] = 9] = "HARM_CATEGORY_SEXUALLY_EXPLICIT";
  HarmCategory2[HarmCategory2["HARM_CATEGORY_DANGEROUS_CONTENT"] = 10] = "HARM_CATEGORY_DANGEROUS_CONTENT";
})(HarmCategory || (HarmCategory = {}));
var HarmProbability;
(function(HarmProbability2) {
  HarmProbability2[HarmProbability2["HARM_PROBABILITY_UNSPECIFIED"] = 0] = "HARM_PROBABILITY_UNSPECIFIED";
  HarmProbability2[HarmProbability2["NEGLIGIBLE"] = 1] = "NEGLIGIBLE";
  HarmProbability2[HarmProbability2["LOW"] = 2] = "LOW";
  HarmProbability2[HarmProbability2["MEDIUM"] = 3] = "MEDIUM";
  HarmProbability2[HarmProbability2["HIGH"] = 4] = "HIGH";
})(HarmProbability || (HarmProbability = {}));
var HarmBlockThreshold;
(function(HarmBlockThreshold2) {
  HarmBlockThreshold2[HarmBlockThreshold2["HARM_BLOCK_THRESHOLD_UNSPECIFIED"] = 0] = "HARM_BLOCK_THRESHOLD_UNSPECIFIED";
  HarmBlockThreshold2[HarmBlockThreshold2["BLOCK_LOW_AND_ABOVE"] = 1] = "BLOCK_LOW_AND_ABOVE";
  HarmBlockThreshold2[HarmBlockThreshold2["BLOCK_MEDIUM_AND_ABOVE"] = 2] = "BLOCK_MEDIUM_AND_ABOVE";
  HarmBlockThreshold2[HarmBlockThreshold2["BLOCK_ONLY_HIGH"] = 3] = "BLOCK_ONLY_HIGH";
  HarmBlockThreshold2[HarmBlockThreshold2["BLOCK_NONE"] = 4] = "BLOCK_NONE";
  HarmBlockThreshold2[HarmBlockThreshold2["OFF"] = 5] = "OFF";
})(HarmBlockThreshold || (HarmBlockThreshold = {}));
var HarmBlockMethod;
(function(HarmBlockMethod2) {
  HarmBlockMethod2[HarmBlockMethod2["HARM_BLOCK_METHOD_UNSPECIFIED"] = 0] = "HARM_BLOCK_METHOD_UNSPECIFIED";
  HarmBlockMethod2[HarmBlockMethod2["SEVERITY"] = 1] = "SEVERITY";
  HarmBlockMethod2[HarmBlockMethod2["PROBABILITY"] = 2] = "PROBABILITY";
})(HarmBlockMethod || (HarmBlockMethod = {}));
var FinishReason;
(function(FinishReason2) {
  FinishReason2[FinishReason2["FINISH_REASON_UNSPECIFIED"] = 0] = "FINISH_REASON_UNSPECIFIED";
  FinishReason2[FinishReason2["STOP"] = 1] = "STOP";
  FinishReason2[FinishReason2["MAX_TOKENS"] = 2] = "MAX_TOKENS";
  FinishReason2[FinishReason2["SAFETY"] = 3] = "SAFETY";
  FinishReason2[FinishReason2["RECITATION"] = 4] = "RECITATION";
  FinishReason2[FinishReason2["OTHER"] = 5] = "OTHER";
  FinishReason2[FinishReason2["BLOCKLIST"] = 6] = "BLOCKLIST";
  FinishReason2[FinishReason2["PROHIBITED_CONTENT"] = 7] = "PROHIBITED_CONTENT";
  FinishReason2[FinishReason2["SPII"] = 8] = "SPII";
  FinishReason2[FinishReason2["MALFORMED_FUNCTION_CALL"] = 9] = "MALFORMED_FUNCTION_CALL";
  FinishReason2[FinishReason2["IMAGE_SAFETY"] = 10] = "IMAGE_SAFETY";
  FinishReason2[FinishReason2["IMAGE_PROHIBITED_CONTENT"] = 11] = "IMAGE_PROHIBITED_CONTENT";
  FinishReason2[FinishReason2["IMAGE_RECITATION"] = 12] = "IMAGE_RECITATION";
  FinishReason2[FinishReason2["IMAGE_OTHER"] = 13] = "IMAGE_OTHER";
  FinishReason2[FinishReason2["UNEXPECTED_TOOL_CALL"] = 14] = "UNEXPECTED_TOOL_CALL";
  FinishReason2[FinishReason2["NO_IMAGE"] = 15] = "NO_IMAGE";
})(FinishReason || (FinishReason = {}));
var Method;
(function(Method2) {
  Method2[Method2["METHOD_UNSPECIFIED"] = 0] = "METHOD_UNSPECIFIED";
  Method2[Method2["GENERATE_CODE"] = 1] = "GENERATE_CODE";
  Method2[Method2["COMPLETE_CODE"] = 2] = "COMPLETE_CODE";
  Method2[Method2["TRANSFORM_CODE"] = 3] = "TRANSFORM_CODE";
  Method2[Method2["CHAT"] = 4] = "CHAT";
})(Method || (Method = {}));
var SuggestionStatus;
(function(SuggestionStatus2) {
  SuggestionStatus2[SuggestionStatus2["STATUS_UNSPECIFIED"] = 0] = "STATUS_UNSPECIFIED";
  SuggestionStatus2[SuggestionStatus2["NO_ERROR"] = 1] = "NO_ERROR";
  SuggestionStatus2[SuggestionStatus2["ERROR"] = 2] = "ERROR";
  SuggestionStatus2[SuggestionStatus2["CANCELLED"] = 3] = "CANCELLED";
  SuggestionStatus2[SuggestionStatus2["EMPTY"] = 4] = "EMPTY";
})(SuggestionStatus || (SuggestionStatus = {}));
var InteractionType;
(function(InteractionType2) {
  InteractionType2[InteractionType2["INTERACTION_TYPE_UNSPECIFIED"] = 0] = "INTERACTION_TYPE_UNSPECIFIED";
  InteractionType2[InteractionType2["THUMBS_UP"] = 1] = "THUMBS_UP";
  InteractionType2[InteractionType2["THUMBS_DOWN"] = 2] = "THUMBS_DOWN";
  InteractionType2[InteractionType2["ACCEPT"] = 3] = "ACCEPT";
  InteractionType2[InteractionType2["ACCEPT_PARTIALLY"] = 4] = "ACCEPT_PARTIALLY";
  InteractionType2[InteractionType2["REJECT"] = 5] = "REJECT";
  InteractionType2[InteractionType2["COPY"] = 6] = "COPY";
})(InteractionType || (InteractionType = {}));
var InclusionReason;
(function(InclusionReason2) {
  InclusionReason2[InclusionReason2["INCLUSION_REASON_UNSPECIFIED"] = 0] = "INCLUSION_REASON_UNSPECIFIED";
  InclusionReason2[InclusionReason2["ACTIVE"] = 1] = "ACTIVE";
  InclusionReason2[InclusionReason2["OPEN"] = 2] = "OPEN";
  InclusionReason2[InclusionReason2["RECENTLY_CLOSED"] = 3] = "RECENTLY_CLOSED";
  InclusionReason2[InclusionReason2["RECENTLY_EDITED"] = 4] = "RECENTLY_EDITED";
  InclusionReason2[InclusionReason2["COLOCATED"] = 5] = "COLOCATED";
  InclusionReason2[InclusionReason2["RELATED"] = 6] = "RELATED";
  InclusionReason2[InclusionReason2["USER_SELECTED"] = 7] = "USER_SELECTED";
})(InclusionReason || (InclusionReason = {}));
var BlockReason;
(function(BlockReason2) {
  BlockReason2[BlockReason2["BLOCKED_REASON_UNSPECIFIED"] = 0] = "BLOCKED_REASON_UNSPECIFIED";
  BlockReason2[BlockReason2["SAFETY"] = 1] = "SAFETY";
  BlockReason2[BlockReason2["OTHER"] = 2] = "OTHER";
  BlockReason2[BlockReason2["BLOCKLIST"] = 3] = "BLOCKLIST";
  BlockReason2[BlockReason2["PROHIBITED_CONTENT"] = 4] = "PROHIBITED_CONTENT";
  BlockReason2[BlockReason2["IMAGE_SAFETY"] = 5] = "IMAGE_SAFETY";
})(BlockReason || (BlockReason = {}));
var Language;
(function(Language4) {
  Language4[Language4["LANGUAGE_UNSPECIFIED"] = 0] = "LANGUAGE_UNSPECIFIED";
  Language4[Language4["PYTHON"] = 1] = "PYTHON";
})(Language || (Language = {}));
var Outcome;
(function(Outcome2) {
  Outcome2[Outcome2["OUTCOME_UNSPECIFIED"] = 0] = "OUTCOME_UNSPECIFIED";
  Outcome2[Outcome2["OUTCOME_OK"] = 1] = "OUTCOME_OK";
  Outcome2[Outcome2["OUTCOME_FAILED"] = 2] = "OUTCOME_FAILED";
  Outcome2[Outcome2["OUTCOME_DEADLINE_EXCEEDED"] = 3] = "OUTCOME_DEADLINE_EXCEEDED";
})(Outcome || (Outcome = {}));
var Mode;
(function(Mode2) {
  Mode2[Mode2["MODE_UNSPECIFIED"] = 0] = "MODE_UNSPECIFIED";
  Mode2[Mode2["AUTO"] = 1] = "AUTO";
  Mode2[Mode2["ANY"] = 2] = "ANY";
  Mode2[Mode2["NONE"] = 3] = "NONE";
})(Mode || (Mode = {}));

// gen/front_end/core/host/AidaGcaTranslation.js
function createBaseGcaRequest(request, contents, experience) {
  const gcaRequest = { contents, aicode: { experience } };
  mapCommonAidaRequestFields(request, gcaRequest);
  buildLabels(request, gcaRequest);
  if ("preamble" in request && request.preamble) {
    gcaRequest.systemInstruction = {
      role: "user",
      parts: [{ text: request.preamble }]
    };
  }
  return gcaRequest;
}
function aidaDoConversationRequestToGcaRequest(request) {
  try {
    const contents = [];
    if (request.facts) {
      contents.push(convertAidaFactsToGcaContent(request.facts));
    }
    if (request.historical_contexts) {
      contents.push(...request.historical_contexts.map(convertAidaContentToGcaContent));
    }
    contents.push(convertAidaContentToGcaContent(request.current_message));
    const gcaRequest = createBaseGcaRequest(request, contents, "chat_console_insights");
    if (request.function_declarations) {
      gcaRequest.tools = [{
        functionDeclarations: request.function_declarations.map((fd) => ({
          name: fd.name,
          description: fd.description,
          parameters: convertAidaParamToGcaSchema(fd.parameters)
        }))
      }];
    }
    debugLog("Translation succeeded:", JSON.stringify(request), JSON.stringify(gcaRequest));
    return gcaRequest;
  } catch (e) {
    debugLog("Translation error:", JSON.stringify(request), e);
    throw e;
  }
}
function mapCommonAidaRequestFields(aidaRequest, gcaRequest) {
  if (aidaRequest.options?.model_id) {
    gcaRequest.model = aidaRequest.options.model_id;
  }
  if (aidaRequest.options?.temperature !== void 0) {
    gcaRequest.generationConfig = {
      ...gcaRequest.generationConfig,
      temperature: aidaRequest.options.temperature
    };
  }
}
function gcaResponseToAidaDoConversationResponse(response) {
  const functionCalls = [];
  if (response.candidates?.[0].content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.functionCall) {
        const functionCall = {
          name: part.functionCall.name,
          args: part.functionCall.args || {}
        };
        if (part.thoughtSignature) {
          functionCall.thoughtSignature = part.thoughtSignature;
        }
        functionCalls.push(functionCall);
      }
    }
  }
  return {
    explanation: extractTextFromGcaParts(response.candidates[0].content?.parts),
    metadata: {
      rpcGlobalId: response.responseId
    },
    functionCalls: functionCalls.length > 0 ? functionCalls : void 0,
    completed: true
  };
}
function extractTextFromGcaParts(parts) {
  if (!parts) {
    return "";
  }
  return parts.map((p) => p.text || "").join("");
}
function aidaEventToGcaTelemetryRequest(clientEvent) {
  try {
    const feedbackMetrics = [];
    const responseId = String(clientEvent.corresponding_aida_rpc_global_id);
    const eventTime = (/* @__PURE__ */ new Date()).toISOString();
    if (clientEvent.do_conversation_client_event) {
      const feedback = clientEvent.do_conversation_client_event.user_feedback;
      if (feedback.sentiment) {
        let interaction = InteractionType.INTERACTION_TYPE_UNSPECIFIED;
        if (feedback.sentiment === "POSITIVE") {
          interaction = InteractionType.THUMBS_UP;
        } else if (feedback.sentiment === "NEGATIVE") {
          interaction = InteractionType.THUMBS_DOWN;
        }
        feedbackMetrics.push({
          eventTime,
          responseId,
          suggestionInteraction: { interaction }
        });
      }
    }
    feedbackMetrics.push(...convertCodeTelemetry(clientEvent.complete_code_client_event, Method.COMPLETE_CODE, responseId, eventTime));
    feedbackMetrics.push(...convertCodeTelemetry(clientEvent.generate_code_client_event, Method.GENERATE_CODE, responseId, eventTime));
    const gcaTelemetryRequest = {
      feedbackMetrics
    };
    debugLog("Translation succeeded:", JSON.stringify(clientEvent), JSON.stringify(gcaTelemetryRequest));
    return gcaTelemetryRequest;
  } catch (e) {
    debugLog("Translation error:", JSON.stringify(clientEvent), e);
    throw e;
  }
}
function convertCodeTelemetry(event, method, responseId, eventTime) {
  if (!event) {
    return [];
  }
  if ("user_impression" in event && event.user_impression) {
    const impression = event.user_impression;
    return [{
      eventTime,
      responseId,
      suggestionOffered: {
        method,
        status: SuggestionStatus.NO_ERROR,
        responseLatency: `${impression.latency.duration.seconds + impression.latency.duration.nanos / 1e9}s`
      }
    }];
  }
  if ("user_acceptance" in event && event.user_acceptance) {
    const acceptance = event.user_acceptance;
    return [{
      eventTime,
      responseId,
      suggestionInteraction: {
        interaction: InteractionType.ACCEPT,
        candidateIndex: acceptance.sample.sample_id
      }
    }];
  }
  return [];
}
function aidaCompletionRequestToGcaRequest(request) {
  try {
    let additionalFiles = (request.additional_files ?? []).map((f) => ({
      fileUri: f.path,
      inclusionReason: [AidaReasonToGcaInclusionReason[f.included_reason]],
      segments: [{ content: f.content, isSelected: false }]
    }));
    const inEditorFile = inFileEditRequestToSourceFile(request);
    if (inEditorFile) {
      additionalFiles = [inEditorFile, ...additionalFiles];
    }
    const gcaRequest = createBaseGcaRequest(request, [], "complete_code");
    gcaRequest.aicode.files = additionalFiles;
    if (request.options?.stop_sequences) {
      gcaRequest.generationConfig = {
        ...gcaRequest.generationConfig,
        stopSequences: request.options.stop_sequences
      };
    }
    debugLog("Translation succeeded:", JSON.stringify(request), JSON.stringify(gcaRequest));
    return gcaRequest;
  } catch (e) {
    debugLog("Translation error:", JSON.stringify(request), e);
    throw e;
  }
}
function inFileEditRequestToSourceFile(request) {
  const sourceFile = {
    inclusionReason: [InclusionReason.ACTIVE],
    fileUri: "devtools-code-completion",
    segments: [
      {
        content: request.prefix,
        isSelected: false
      },
      {
        content: "",
        isSelected: true
        // Cursor position
      }
    ]
  };
  if (request.suffix) {
    sourceFile.segments?.push({
      content: request.suffix,
      isSelected: false
    });
  }
  return sourceFile;
}
function sanitizeLabelValue(value) {
  return value.toLowerCase().replace(/[^\p{Ll}\p{Lo}\p{N}_-]/gu, "_").substring(0, 63);
}
function buildLabels(request, gcaRequest) {
  const labels = {};
  if (request.client) {
    labels["client"] = request.client;
  }
  if ("functionality_type" in request && request.functionality_type !== void 0) {
    labels["functionality_type"] = FunctionalityType[request.functionality_type];
  }
  if ("client_feature" in request && request.client_feature !== void 0) {
    labels["client_feature"] = ClientFeature[request.client_feature];
  }
  if ("last_user_action" in request && request.last_user_action !== void 0) {
    labels["last_user_action"] = EditType[request.last_user_action];
  }
  if ("use_case" in request && request.use_case !== void 0) {
    labels["use_case"] = UseCase[request.use_case];
  }
  if (request.metadata.string_session_id) {
    labels["session_id"] = request.metadata.string_session_id;
  }
  const options = request.options;
  if (options?.inference_language) {
    labels["inference_language"] = options.inference_language;
  }
  if (options?.expect_code_output !== void 0) {
    labels["expect_code_output"] = String(options.expect_code_output);
  }
  if (request.metadata.disable_user_content_logging !== void 0) {
    labels["disable_user_content_logging"] = String(request.metadata.disable_user_content_logging);
  }
  if (request.metadata.client_version) {
    labels["client_version"] = request.metadata.client_version;
  }
  if (Object.keys(labels).length > 0) {
    const sanitizedLabels = {};
    for (const [key, value] of Object.entries(labels)) {
      sanitizedLabels[key] = sanitizeLabelValue(value);
    }
    gcaRequest.labels = sanitizedLabels;
  }
}
var AidaReasonToGcaInclusionReason = {
  [Reason.UNKNOWN]: InclusionReason.INCLUSION_REASON_UNSPECIFIED,
  [Reason.CURRENTLY_OPEN]: InclusionReason.OPEN,
  // Intentional mapping due to type mismatch
  // TODO(liviurau): find a way to validate this mapping
  [Reason.RECENTLY_OPENED]: InclusionReason.RECENTLY_CLOSED,
  [Reason.RECENTLY_EDITED]: InclusionReason.RECENTLY_EDITED,
  [Reason.COLOCATED]: InclusionReason.COLOCATED,
  [Reason.RELATED_FILE]: InclusionReason.RELATED
};
function gcaResponseToAidaCompletionResponse(response) {
  try {
    const { samples, metadata } = gcaResponseToAidaSamplesAndMetadata(response);
    const aidaResponse = {
      generatedSamples: samples,
      metadata
    };
    debugLog("Translation succeeded:", JSON.stringify(response), JSON.stringify(aidaResponse));
    return aidaResponse;
  } catch (e) {
    debugLog("Translation error", JSON.stringify(response), e);
    throw e;
  }
}
function gcaResponseToAidaSamplesAndMetadata(response) {
  return {
    samples: (response.candidates ?? []).map(gcaCandidateToAidaGenerationSample),
    metadata: {
      rpcGlobalId: response.responseId
    }
  };
}
function aidaGenerateCodeRequestToGcaRequest(request) {
  try {
    const gcaRequest = createBaseGcaRequest(request, [convertAidaContentToGcaContent(request.current_message)], "generate_code");
    if (request.context_files) {
      gcaRequest.aicode.files = request.context_files.map((f) => ({
        fileUri: f.path,
        programmingLanguage: f.programming_language
      }));
    }
    debugLog("Translation succeeded:", JSON.stringify(request), JSON.stringify(gcaRequest));
    return gcaRequest;
  } catch (e) {
    debugLog("Translation error", JSON.stringify(request), e);
    throw e;
  }
}
function gcaResponseToAidaGenerateCodeResponse(response) {
  try {
    const aidaResponse = gcaResponseToAidaSamplesAndMetadata(response);
    debugLog("Translation succeeded:", JSON.stringify(response), JSON.stringify(aidaResponse));
    return aidaResponse;
  } catch (e) {
    debugLog("translation error", JSON.stringify(response), e);
    throw e;
  }
}
function gcaCandidateToAidaGenerationSample(candidate) {
  const generationSample = {
    generationString: extractTextFromGcaParts(candidate.content?.parts),
    score: 0,
    sampleId: candidate.index
  };
  if (candidate.citationMetadata) {
    generationSample.attributionMetadata = {
      attributionAction: RecitationAction.CITE,
      citations: (candidate.citationMetadata.citations ?? []).map((c) => ({
        startIndex: c.startIndex,
        endIndex: c.endIndex,
        uri: c.uri
      }))
    };
  }
  return generationSample;
}
function convertAidaFactsToGcaContent(facts) {
  return {
    role: "user",
    parts: facts.map((fact) => {
      return { text: `[source: ${fact.metadata.source}] ${fact.text}` };
    })
  };
}
function convertAidaContentToGcaContent(content) {
  let role = "user";
  if (content.role === Role.MODEL) {
    role = "model";
  }
  return {
    role,
    parts: (content.parts ?? []).map(convertAidaPartToGcaPart)
  };
}
function convertAidaPartToGcaPart(part) {
  if ("text" in part) {
    return { text: part.text };
  }
  if ("functionCall" in part) {
    const gcaPart = {
      functionCall: {
        name: part.functionCall.name,
        args: part.functionCall.args
      }
    };
    if (part.functionCall.thoughtSignature) {
      gcaPart.thoughtSignature = part.functionCall.thoughtSignature;
    }
    return gcaPart;
  }
  if ("functionResponse" in part) {
    const fResponse = {};
    if ("result" in part.functionResponse.response) {
      fResponse.output = part.functionResponse.response["result"];
    } else if ("output" in part.functionResponse.response) {
      fResponse.output = part.functionResponse.response["output"];
    } else if (!("error" in part.functionResponse.response)) {
      fResponse.output = part.functionResponse.response;
    }
    if ("error" in part.functionResponse.response) {
      fResponse.error = part.functionResponse.response["error"];
    }
    return {
      functionResponse: {
        name: part.functionResponse.name,
        response: fResponse
      }
    };
  }
  if ("inlineData" in part) {
    return {
      inlineData: {
        mimeType: part.inlineData.mimeType,
        data: part.inlineData.data
      }
    };
  }
  return {};
}
function convertAidaParamToGcaSchema(param) {
  const schema = {
    type: param.type,
    description: param.description
  };
  if (param.nullable) {
    schema.nullable = param.nullable;
  }
  if (param.type === 5 && param.items) {
    schema.items = convertAidaParamToGcaSchema(param.items);
  } else if (param.type === 6 && param.properties) {
    schema.properties = {};
    for (const [key, value] of Object.entries(param.properties)) {
      schema.properties[key] = convertAidaParamToGcaSchema(value);
    }
    schema.required = (param.required ?? []).map((r) => r.toString());
  }
  return schema;
}
function gcaChunkResponseToAidaChunkResponse(response) {
  try {
    if (response.error) {
      throw new Error(JSON.stringify(response.error));
    }
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const metadata = {
      rpcGlobalId: response.responseId,
      inferenceOptionMetadata: { modelId: response.modelVersion }
    };
    if (candidate?.citationMetadata?.citations) {
      metadata.attributionMetadata = {
        attributionAction: RecitationAction.CITE,
        citations: candidate.citationMetadata.citations.map((c) => ({
          startIndex: c.startIndex,
          endIndex: c.endIndex,
          uri: c.uri
        }))
      };
    }
    const chunks = parts.map((part) => {
      const aidaChunkResponse = { metadata };
      if (part.text !== void 0) {
        aidaChunkResponse.textChunk = {
          text: extractTextFromGcaParts(parts)
        };
      }
      if (part.functionCall) {
        aidaChunkResponse.functionCallChunk = {
          functionCall: {
            name: part.functionCall.name,
            args: part.functionCall.args || {}
          }
        };
        if (part.thoughtSignature) {
          aidaChunkResponse.functionCallChunk.functionCall.thoughtSignature = part.thoughtSignature;
        }
      }
      if (part.executableCode) {
        aidaChunkResponse.codeChunk = {
          code: part.executableCode.code,
          inferenceLanguage: part.executableCode.language ? "PYTHON" : "UNKNOWN"
        };
      }
      return aidaChunkResponse;
    });
    debugLog("Translation succeeded:", JSON.stringify(response), JSON.stringify(chunks));
    return chunks;
  } catch (e) {
    debugLog("Translation error", JSON.stringify(response), e);
    throw e;
  }
}

// gen/front_end/core/host/DispatchHttpRequestClient.js
var DispatchHttpRequestClient_exports = {};
__export(DispatchHttpRequestClient_exports, {
  DispatchHttpRequestError: () => DispatchHttpRequestError,
  ErrorType: () => ErrorType,
  makeHttpRequest: () => makeHttpRequest
});
import * as Platform3 from "./../platform/platform.js";

// gen/front_end/core/host/InspectorFrontendHost.js
var InspectorFrontendHost_exports = {};
__export(InspectorFrontendHost_exports, {
  InspectorFrontendHostInstance: () => InspectorFrontendHostInstance,
  InspectorFrontendHostStub: () => InspectorFrontendHostStub,
  installInspectorFrontendHost: () => installInspectorFrontendHost,
  isUnderTest: () => isUnderTest
});
import * as Common3 from "./../common/common.js";
import * as Root from "./../root/root.js";

// gen/front_end/core/host/InspectorFrontendHostAPI.js
var InspectorFrontendHostAPI_exports = {};
__export(InspectorFrontendHostAPI_exports, {
  EventDescriptors: () => EventDescriptors,
  Events: () => Events
});
var Events;
(function(Events2) {
  Events2["AppendedToURL"] = "appendedToURL";
  Events2["CanceledSaveURL"] = "canceledSaveURL";
  Events2["ColorThemeChanged"] = "colorThemeChanged";
  Events2["ContextMenuCleared"] = "contextMenuCleared";
  Events2["ContextMenuItemSelected"] = "contextMenuItemSelected";
  Events2["DeviceCountUpdated"] = "deviceCountUpdated";
  Events2["DevicesDiscoveryConfigChanged"] = "devicesDiscoveryConfigChanged";
  Events2["DevicesPortForwardingStatusChanged"] = "devicesPortForwardingStatusChanged";
  Events2["DevicesUpdated"] = "devicesUpdated";
  Events2["DispatchMessage"] = "dispatchMessage";
  Events2["DispatchMessageChunk"] = "dispatchMessageChunk";
  Events2["EnterInspectElementMode"] = "enterInspectElementMode";
  Events2["EyeDropperPickedColor"] = "eyeDropperPickedColor";
  Events2["FileSystemsLoaded"] = "fileSystemsLoaded";
  Events2["FileSystemRemoved"] = "fileSystemRemoved";
  Events2["FileSystemAdded"] = "fileSystemAdded";
  Events2["FileSystemFilesChangedAddedRemoved"] = "fileSystemFilesChangedAddedRemoved";
  Events2["IndexingTotalWorkCalculated"] = "indexingTotalWorkCalculated";
  Events2["IndexingWorked"] = "indexingWorked";
  Events2["IndexingDone"] = "indexingDone";
  Events2["KeyEventUnhandled"] = "keyEventUnhandled";
  Events2["ReloadInspectedPage"] = "reloadInspectedPage";
  Events2["RevealSourceLine"] = "revealSourceLine";
  Events2["SavedURL"] = "savedURL";
  Events2["SearchCompleted"] = "searchCompleted";
  Events2["SetInspectedTabId"] = "setInspectedTabId";
  Events2["SetUseSoftMenu"] = "setUseSoftMenu";
  Events2["ShowPanel"] = "showPanel";
})(Events || (Events = {}));
var EventDescriptors = [
  [Events.AppendedToURL, ["url"]],
  [Events.CanceledSaveURL, ["url"]],
  [Events.ColorThemeChanged, []],
  [Events.ContextMenuCleared, []],
  [Events.ContextMenuItemSelected, ["id"]],
  [Events.DeviceCountUpdated, ["count"]],
  [Events.DevicesDiscoveryConfigChanged, ["config"]],
  [Events.DevicesPortForwardingStatusChanged, ["status"]],
  [Events.DevicesUpdated, ["devices"]],
  [Events.DispatchMessage, ["messageObject"]],
  [Events.DispatchMessageChunk, ["messageChunk", "messageSize"]],
  [Events.EnterInspectElementMode, []],
  [Events.EyeDropperPickedColor, ["color"]],
  [Events.FileSystemsLoaded, ["fileSystems"]],
  [Events.FileSystemRemoved, ["fileSystemPath"]],
  [Events.FileSystemAdded, ["errorMessage", "fileSystem"]],
  [Events.FileSystemFilesChangedAddedRemoved, ["changed", "added", "removed"]],
  [Events.IndexingTotalWorkCalculated, , ["requestId", "fileSystemPath", "totalWork"]],
  [Events.IndexingWorked, ["requestId", "fileSystemPath", "worked"]],
  [Events.IndexingDone, ["requestId", "fileSystemPath"]],
  [Events.KeyEventUnhandled, ["event"]],
  [Events.ReloadInspectedPage, ["hard"]],
  [Events.RevealSourceLine, ["url", "lineNumber", "columnNumber"]],
  [Events.SavedURL, ["url", "fileSystemPath"]],
  [Events.SearchCompleted, ["requestId", "fileSystemPath", "files"]],
  [Events.SetInspectedTabId, ["tabId"]],
  [Events.SetUseSoftMenu, ["useSoftMenu"]],
  [Events.ShowPanel, ["panelName"]]
];

// gen/front_end/core/host/InspectorFrontendHostStub.js
import * as Common2 from "./../common/common.js";
import * as i18n3 from "./../i18n/i18n.js";
import * as Platform2 from "./../platform/platform.js";

// gen/front_end/core/host/ResourceLoader.js
var ResourceLoader_exports = {};
__export(ResourceLoader_exports, {
  ResourceLoader: () => ResourceLoader,
  bindOutputStream: () => bindOutputStream,
  discardOutputStream: () => discardOutputStream,
  load: () => load,
  loadAsStream: () => loadAsStream,
  netErrorToMessage: () => netErrorToMessage,
  streamWrite: () => streamWrite
});
import * as Common from "./../common/common.js";
import * as i18n from "./../i18n/i18n.js";
var UIStrings = {
  /**
   * @description Name of an error category used in error messages.
   */
  systemError: "System error",
  /**
   * @description Name of an error category used in error messages.
   */
  connectionError: "Connection error",
  /**
   * @description Name of an error category used in error messages.
   */
  certificateError: "Certificate error",
  /**
   * @description Name of an error category used in error messages.
   */
  httpError: "HTTP error",
  /**
   * @description Name of an error category used in error messages.
   */
  cacheError: "Cache error",
  /**
   * @description Name of an error category used in error messages.
   */
  signedExchangeError: "`Signed Exchange` error",
  /**
   * @description Name of an error category used in error messages.
   */
  ftpError: "FTP error",
  /**
   * @description Name of an error category used in error messages.
   */
  certificateManagerError: "Certificate manager error",
  /**
   * @description Name of an error category used in error messages.
   */
  dnsResolverError: "DNS resolver error",
  /**
   * @description Name of an error category used in error messages.
   */
  unknownError: "Unknown error",
  /**
   * @description Phrase used in error messages that carry a network error name.
   * @example {404} PH1
   * @example {net::ERR_INSUFFICIENT_RESOURCES} PH2
   */
  httpErrorStatusCodeSS: "HTTP error: status code {PH1}, {PH2}",
  /**
   * @description Name of an error category used in error messages.
   */
  invalidUrl: "Invalid URL",
  /**
   * @description Name of an error category used in error messages.
   */
  decodingDataUrlFailed: "Decoding data URL failed"
};
var str_ = i18n.i18n.registerUIStrings("core/host/ResourceLoader.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var ResourceLoader = {};
var _lastStreamId = 0;
var _boundStreams = {};
var bindOutputStream = function(stream) {
  _boundStreams[++_lastStreamId] = stream;
  return _lastStreamId;
};
var discardOutputStream = function(id) {
  if (_boundStreams[id]) {
    void _boundStreams[id].close();
    delete _boundStreams[id];
  }
};
var streamWrite = function(id, chunk) {
  void _boundStreams[id].write(chunk);
};
var load = function(url, headers, callback, allowRemoteFilePaths) {
  const stream = new Common.StringOutputStream.StringOutputStream();
  loadAsStream(url, headers, stream, mycallback, allowRemoteFilePaths);
  function mycallback(success, headers2, errorDescription) {
    callback(success, headers2, stream.data(), errorDescription);
  }
};
function getNetErrorCategory(netError) {
  if (netError > -100) {
    return i18nString(UIStrings.systemError);
  }
  if (netError > -200) {
    return i18nString(UIStrings.connectionError);
  }
  if (netError > -300) {
    return i18nString(UIStrings.certificateError);
  }
  if (netError > -400) {
    return i18nString(UIStrings.httpError);
  }
  if (netError > -500) {
    return i18nString(UIStrings.cacheError);
  }
  if (netError > -600) {
    return i18nString(UIStrings.signedExchangeError);
  }
  if (netError > -700) {
    return i18nString(UIStrings.ftpError);
  }
  if (netError > -800) {
    return i18nString(UIStrings.certificateManagerError);
  }
  if (netError > -900) {
    return i18nString(UIStrings.dnsResolverError);
  }
  return i18nString(UIStrings.unknownError);
}
function isHTTPError(netError) {
  return netError <= -300 && netError > -400;
}
function netErrorToMessage(netError, httpStatusCode, netErrorName) {
  if (netError === void 0 || netErrorName === void 0) {
    return null;
  }
  if (netError !== 0) {
    if (isHTTPError(netError)) {
      return i18nString(UIStrings.httpErrorStatusCodeSS, { PH1: String(httpStatusCode), PH2: netErrorName });
    }
    const errorCategory = getNetErrorCategory(netError);
    return `${errorCategory}: ${netErrorName}`;
  }
  return null;
}
function createErrorMessageFromResponse(response) {
  const { statusCode, netError, netErrorName, urlValid, messageOverride } = response;
  let message = "";
  const success = statusCode >= 200 && statusCode < 300;
  if (typeof messageOverride === "string") {
    message = messageOverride;
  } else if (!success) {
    if (typeof netError === "undefined") {
      if (urlValid === false) {
        message = i18nString(UIStrings.invalidUrl);
      } else {
        message = i18nString(UIStrings.unknownError);
      }
    } else {
      const maybeMessage = netErrorToMessage(netError, statusCode, netErrorName);
      if (maybeMessage) {
        message = maybeMessage;
      }
    }
  }
  console.assert(success === (message.length === 0));
  return { success, description: { statusCode, netError, netErrorName, urlValid, message } };
}
async function fetchToString(url) {
  try {
    const response = await fetch(url);
    return await response.text();
  } catch (cause) {
    throw new Error(`Failed to fetch ${url}`, { cause });
  }
}
function canBeRemoteFilePath(url) {
  try {
    const urlObject = new URL(new URL(url).toString());
    return urlObject.protocol === "file:" && urlObject.host !== "";
  } catch {
    return false;
  }
}
var loadAsStream = function(url, headers, stream, callback, allowRemoteFilePaths) {
  const streamId = bindOutputStream(stream);
  const parsedURL = new Common.ParsedURL.ParsedURL(url);
  if (parsedURL.isDataURL()) {
    fetchToString(url).then(dataURLDecodeSuccessful).catch(dataURLDecodeFailed);
    return;
  }
  if (!allowRemoteFilePaths && canBeRemoteFilePath(url)) {
    if (callback) {
      callback(
        /* success */
        false,
        /* headers */
        {},
        {
          statusCode: 400,
          // BAD_REQUEST
          netError: -20,
          // BLOCKED_BY_CLIENT
          netErrorName: "net::BLOCKED_BY_CLIENT",
          message: "Loading from a remote file path is prohibited for security reasons."
        }
      );
    }
    return;
  }
  const rawHeaders = [];
  if (headers) {
    for (const key in headers) {
      rawHeaders.push(key + ": " + headers[key]);
    }
  }
  InspectorFrontendHostInstance.loadNetworkResource(url, rawHeaders.join("\r\n"), streamId, finishedCallback);
  function finishedCallback(response) {
    if (callback) {
      const { success, description } = createErrorMessageFromResponse(response);
      callback(success, response.headers || {}, description);
    }
    discardOutputStream(streamId);
  }
  function dataURLDecodeSuccessful(text) {
    streamWrite(streamId, text);
    finishedCallback({ statusCode: 200 });
  }
  function dataURLDecodeFailed(_xhrStatus) {
    const messageOverride = i18nString(UIStrings.decodingDataUrlFailed);
    finishedCallback({ statusCode: 404, messageOverride });
  }
};

// gen/front_end/core/host/InspectorFrontendHostStub.js
var UIStrings2 = {
  /**
   * @description Document title in Inspector Frontend Host of the DevTools window.
   * @example {example.com} PH1
   */
  devtoolsS: "DevTools - {PH1}"
};
var str_2 = i18n3.i18n.registerUIStrings("core/host/InspectorFrontendHostStub.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var MAX_RECORDED_HISTOGRAMS_SIZE = 100;
var OVERRIDES_FILE_SYSTEM_PATH = "/overrides";
var InspectorFrontendHostStub = class {
  #urlsBeingSaved = /* @__PURE__ */ new Map();
  #fileSystem = null;
  recordedCountHistograms = [];
  recordedEnumeratedHistograms = [];
  recordedPerformanceHistograms = [];
  constructor() {
    if (typeof document === "undefined") {
      return;
    }
    function stopEventPropagation(event) {
      const zoomModifier = this.platform() === "mac" ? event.metaKey : event.ctrlKey;
      if (zoomModifier && (event.key === "+" || event.key === "-")) {
        event.stopPropagation();
      }
    }
    document.addEventListener("keydown", (event) => {
      stopEventPropagation.call(this, event);
    }, true);
  }
  platform() {
    const userAgent = navigator.userAgent;
    if (userAgent.includes("Windows NT")) {
      return "windows";
    }
    if (userAgent.includes("Mac OS X")) {
      return "mac";
    }
    return "linux";
  }
  loadCompleted() {
  }
  bringToFront() {
  }
  closeWindow() {
  }
  setIsDocked(_isDocked, callback) {
    globalThis.setTimeout(callback, 0);
  }
  showSurvey(_trigger, callback) {
    globalThis.setTimeout(() => callback({ surveyShown: false }), 0);
  }
  canShowSurvey(_trigger, callback) {
    globalThis.setTimeout(() => callback({ canShowSurvey: false }), 0);
  }
  /**
   * Requests inspected page to be placed atop of the inspector frontend with specified bounds.
   */
  setInspectedPageBounds(_bounds) {
  }
  inspectElementCompleted() {
  }
  setInjectedScriptForOrigin(_origin, _script) {
  }
  inspectedURLChanged(url) {
    if (!("document" in globalThis)) {
      return;
    }
    document.title = i18nString2(UIStrings2.devtoolsS, { PH1: url.replace(/^https?:\/\//, "") });
  }
  copyText(text) {
    if (text === void 0 || text === null) {
      return;
    }
    void navigator.clipboard.writeText(text);
  }
  openInNewTab(url) {
    if (Common2.ParsedURL.schemeIs(url, "javascript:")) {
      return;
    }
    window.open(url, "_blank");
  }
  openSearchResultsInNewTab(_query) {
    Common2.Console.Console.instance().error("Search is not enabled in hosted mode. Please inspect using chrome://inspect");
  }
  showItemInFolder(_fileSystemPath) {
    Common2.Console.Console.instance().error("Show item in folder is not enabled in hosted mode. Please inspect using chrome://inspect");
  }
  // Reminder: the methods in this class belong to InspectorFrontendHostStub and are typically not executed.
  // InspectorFrontendHostStub is ONLY used in the uncommon case of devtools not being embedded. For example: trace.cafe or http://localhost:9222/devtools/inspector.html?ws=localhost:9222/devtools/page/xTARGET_IDx
  save(url, content, _forceSaveAs, isBase64) {
    let buffer = this.#urlsBeingSaved.get(url)?.buffer;
    if (!buffer) {
      buffer = [];
      this.#urlsBeingSaved.set(url, { isBase64, buffer });
    }
    buffer.push(content);
    this.events.dispatchEventToListeners(Events.SavedURL, { url, fileSystemPath: url });
  }
  append(url, content) {
    const buffer = this.#urlsBeingSaved.get(url)?.buffer;
    if (buffer) {
      buffer.push(content);
      this.events.dispatchEventToListeners(Events.AppendedToURL, url);
    }
  }
  close(url) {
    const { isBase64, buffer } = this.#urlsBeingSaved.get(url) || { isBase64: false, buffer: [] };
    this.#urlsBeingSaved.delete(url);
    let fileName = "";
    if (url) {
      try {
        const trimmed = Platform2.StringUtilities.trimURL(url);
        fileName = Platform2.StringUtilities.removeURLFragment(trimmed);
      } catch {
        fileName = url;
      }
    }
    const link = document.createElement("a");
    link.download = fileName;
    let blob;
    if (isBase64) {
      const bytes = Common2.Base64.decode(buffer.join(""));
      blob = new Blob([bytes], { type: "application/gzip" });
    } else {
      blob = new Blob(buffer, { type: "text/plain" });
    }
    const blobUrl = URL.createObjectURL(blob);
    link.href = blobUrl;
    link.click();
    URL.revokeObjectURL(blobUrl);
  }
  sendMessageToBackend(_message) {
  }
  recordCountHistogram(histogramName, sample, min, exclusiveMax, bucketSize) {
    if (this.recordedCountHistograms.length >= MAX_RECORDED_HISTOGRAMS_SIZE) {
      this.recordedCountHistograms.shift();
    }
    this.recordedCountHistograms.push({ histogramName, sample, min, exclusiveMax, bucketSize });
  }
  recordEnumeratedHistogram(actionName, actionCode, _bucketSize) {
    if (this.recordedEnumeratedHistograms.length >= MAX_RECORDED_HISTOGRAMS_SIZE) {
      this.recordedEnumeratedHistograms.shift();
    }
    this.recordedEnumeratedHistograms.push({ actionName, actionCode });
  }
  recordPerformanceHistogram(histogramName, duration) {
    if (this.recordedPerformanceHistograms.length >= MAX_RECORDED_HISTOGRAMS_SIZE) {
      this.recordedPerformanceHistograms.shift();
    }
    this.recordedPerformanceHistograms.push({ histogramName, duration });
  }
  recordPerformanceHistogramMedium(histogramName, duration) {
    if (this.recordedPerformanceHistograms.length >= MAX_RECORDED_HISTOGRAMS_SIZE) {
      this.recordedPerformanceHistograms.shift();
    }
    this.recordedPerformanceHistograms.push({ histogramName, duration });
  }
  recordUserMetricsAction(_umaName) {
  }
  recordNewBadgeUsage(_featureName) {
  }
  connectAutomaticFileSystem(_fileSystemPath, _fileSystemUUID, _addIfMissing, callback) {
    queueMicrotask(() => callback({ success: false }));
  }
  disconnectAutomaticFileSystem(_fileSystemPath) {
  }
  requestFileSystems() {
    this.events.dispatchEventToListeners(Events.FileSystemsLoaded, []);
  }
  addFileSystem(_type) {
    const onFileSystem = (fs) => {
      this.#fileSystem = fs;
      const fileSystem = {
        fileSystemName: "sandboxedRequestedFileSystem",
        fileSystemPath: OVERRIDES_FILE_SYSTEM_PATH,
        rootURL: "filesystem:devtools://devtools/isolated/",
        type: "overrides"
      };
      this.events.dispatchEventToListeners(Events.FileSystemAdded, { fileSystem });
    };
    window.webkitRequestFileSystem(window.TEMPORARY, 1024 * 1024, onFileSystem);
  }
  removeFileSystem(_fileSystemPath) {
    const removalCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isDirectory) {
          entry.removeRecursively(() => {
          });
        } else if (entry.isFile) {
          entry.remove(() => {
          });
        }
      });
    };
    if (this.#fileSystem) {
      this.#fileSystem.root.createReader().readEntries(removalCallback);
    }
    this.#fileSystem = null;
    this.events.dispatchEventToListeners(Events.FileSystemRemoved, OVERRIDES_FILE_SYSTEM_PATH);
  }
  isolatedFileSystem(_fileSystemId, _registeredName) {
    return this.#fileSystem;
  }
  loadNetworkResource(url, _headers, streamId, callback) {
    fetch(url).then(async (result) => {
      const respBuffer = await result.arrayBuffer();
      const text = await Common2.Gzip.arrayBufferToString(respBuffer);
      return text;
    }).then(function(text) {
      streamWrite(streamId, text);
      callback({
        statusCode: 200
      });
    }).catch(function() {
      callback({
        statusCode: 404
      });
    });
  }
  registerPreference(_name, _options) {
  }
  getPreferences(callback) {
    const prefs = {};
    for (const name in window.localStorage) {
      prefs[name] = window.localStorage[name];
    }
    callback(prefs);
  }
  getPreference(name, callback) {
    callback(window.localStorage[name]);
  }
  setPreference(name, value) {
    window.localStorage[name] = value;
  }
  removePreference(name) {
    delete window.localStorage[name];
  }
  clearPreferences() {
    window.localStorage.clear();
  }
  getSyncInformation(callback) {
    if ("getSyncInformationForTesting" in globalThis) {
      return callback(globalThis.getSyncInformationForTesting());
    }
    callback({
      isSyncActive: false,
      arePreferencesSynced: false
    });
  }
  getHostConfig(callback) {
    const hostConfigForHostedMode = {
      devToolsVeLogging: {
        enabled: true
      },
      devToolsFlexibleLayout: {
        verticalDrawerEnabled: true
      }
    };
    if ("hostConfigForTesting" in globalThis) {
      const { hostConfigForTesting } = globalThis;
      for (const key of Object.keys(hostConfigForTesting)) {
        const mergeEntry = (key2) => {
          if (typeof hostConfigForHostedMode[key2] === "object" && typeof hostConfigForTesting[key2] === "object") {
            hostConfigForHostedMode[key2] = { ...hostConfigForHostedMode[key2], ...hostConfigForTesting[key2] };
          } else {
            hostConfigForHostedMode[key2] = hostConfigForTesting[key2] ?? hostConfigForHostedMode[key2];
          }
        };
        mergeEntry(key);
      }
    }
    callback(hostConfigForHostedMode);
  }
  upgradeDraggedFileSystemPermissions(_fileSystem) {
  }
  indexPath(_requestId, _fileSystemPath, _excludedFolders) {
  }
  stopIndexing(_requestId) {
  }
  searchInPath(_requestId, _fileSystemPath, _query) {
  }
  zoomFactor() {
    return 1;
  }
  zoomIn() {
  }
  zoomOut() {
  }
  resetZoom() {
  }
  setWhitelistedShortcuts(_shortcuts) {
  }
  setEyeDropperActive(_active) {
  }
  showCertificateViewer(_certChain) {
  }
  reattach(_callback) {
  }
  readyForTest() {
  }
  connectionReady() {
  }
  setOpenNewWindowForPopups(_value) {
  }
  setDevicesDiscoveryConfig(_config) {
  }
  setDevicesUpdatesEnabled(_enabled) {
  }
  openRemotePage(_browserId, _url) {
  }
  openNodeFrontend() {
  }
  showContextMenuAtPoint(_x, _y, _items, _document) {
    throw new Error("Soft context menu should be used");
  }
  /**
   * Think of **Hosted mode** as "non-embedded" mode; you can see a devtools frontend URL as the tab's URL. It's an atypical way that DevTools is run.
   * Whereas in **Non-hosted** (aka "embedded"), DevTools is embedded and fully dockable. It's the common way DevTools is run.
   *
   * **Hosted mode** == we're using the `InspectorFrontendHostStub`. impl. (@see `InspectorFrontendHostStub` class comment)
   * Whereas with **non-hosted** mode, native `DevToolsEmbedderMessageDispatcher` is used for CDP and more.  `globalThis.DevToolsAPI` is present.
   *
   * Relationships to other signals:
   * - _Connection_: Hosted-ness does not indicate whether the frontend is _connected to a valid CDP target_.
   * - _Dockability_: Being _"dockable"_ (aka `canDock`) is typically aligned but technically orthogonal.
   * - _URL scheme_: If the main frame's URL scheme is `devtools://`, it's non-hosted.
   *
   *  | Example case                                | Mode           | Example devtools                                                              |
   *  | :------------------------------------------ | :------------- | :---------------------------------------------------------------------------- |
   *  | tab URL: `devtools://…`                     | **NOT Hosted** | `devtools://devtools/bundled/devtools_app.html?targetType=tab&...`            |
   *  | tab URL: `devtools://…?ws=…`                | **NOT Hosted** | `devtools://devtools/bundled/devtools_app.html?ws=localhost:9228/...`         |
   *  | tab URL: `devtools://…` but no connection   | **NOT Hosted** | `devtools://devtools/bundled/trace_app.html`                                  |
   *  | tab URL: `https://…` but no connection      | **Hosted**     | `https://chrome-devtools-frontend.appspot.com/serve_rev/@.../trace_app.html`  |
   *  | tab URL: `http://…?ws=` (connected)         | **Hosted**     | `http://localhost:9222/devtools/inspector.html?ws=localhost:9222/...`         |
   */
  isHostedMode() {
    return true;
  }
  setAddExtensionCallback(_callback) {
  }
  async initialTargetId() {
    return null;
  }
  doAidaConversation(_request, _streamId, callback) {
    callback({
      error: "Not implemented"
    });
  }
  registerAidaClientEvent(_request, callback) {
    callback({
      error: "Not implemented"
    });
  }
  aidaCodeComplete(_request, callback) {
    callback({
      error: "Not implemented"
    });
  }
  dispatchHttpRequest(_request, callback) {
    callback({ error: "Not implemented" });
  }
  recordImpression(_event) {
  }
  recordResize(_event) {
  }
  recordClick(_event) {
  }
  recordHover(_event) {
  }
  recordDrag(_event) {
  }
  recordChange(_event) {
  }
  recordKeyDown(_event) {
  }
  recordSettingAccess(_event) {
  }
  recordFunctionCall(_event) {
  }
  setChromeFlag(_flagName, _value) {
  }
  requestRestart() {
  }
};

// gen/front_end/core/host/InspectorFrontendHost.js
var InspectorFrontendHostInstance;
var InspectorFrontendAPIImpl = class {
  constructor() {
    for (const descriptor of EventDescriptors) {
      this[descriptor[0]] = this.dispatch.bind(this, descriptor[0], descriptor[1], descriptor[2]);
    }
  }
  dispatch(name, signature, _runOnceLoaded, ...params) {
    if (signature.length < 2) {
      try {
        InspectorFrontendHostInstance.events.dispatchEventToListeners(name, params[0]);
      } catch (error) {
        console.error(error + " " + error.stack);
      }
      return;
    }
    const data = {};
    for (let i = 0; i < signature.length; ++i) {
      data[signature[i]] = params[i];
    }
    try {
      InspectorFrontendHostInstance.events.dispatchEventToListeners(name, data);
    } catch (error) {
      console.error(error + " " + error.stack);
    }
  }
  streamWrite(id, chunk) {
    streamWrite(id, chunk);
  }
};
function installInspectorFrontendHost(instance) {
  globalThis.InspectorFrontendHost = InspectorFrontendHostInstance = instance;
  if (!(instance instanceof InspectorFrontendHostStub)) {
    const proto = InspectorFrontendHostStub.prototype;
    for (const name of Object.getOwnPropertyNames(proto)) {
      const stub = proto[name];
      if (typeof stub !== "function" || InspectorFrontendHostInstance[name]) {
        continue;
      }
      console.error(`Incompatible embedder: method Host.InspectorFrontendHost.${name} is missing. Using stub instead.`);
      InspectorFrontendHostInstance[name] = stub;
    }
  }
  InspectorFrontendHostInstance.events = new Common3.ObjectWrapper.ObjectWrapper();
}
(function() {
  installInspectorFrontendHost(globalThis.InspectorFrontendHost ?? new InspectorFrontendHostStub());
  globalThis.InspectorFrontendAPI = new InspectorFrontendAPIImpl();
})();
function isUnderTest(prefs) {
  if (Root.Runtime.Runtime.queryParam("test")) {
    return true;
  }
  if (prefs) {
    return prefs["isUnderTest"] === "true";
  }
  return Common3.Settings.Settings.hasInstance() && // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
  Common3.Settings.Settings.instance().createSetting("isUnderTest", false).get();
}

// gen/front_end/core/host/DispatchHttpRequestClient.js
var ErrorType;
(function(ErrorType2) {
  ErrorType2["HTTP_RESPONSE_UNAVAILABLE"] = "HTTP_RESPONSE_UNAVAILABLE";
  ErrorType2["NOT_FOUND"] = "NOT_FOUND";
  ErrorType2["ABORT"] = "ABORT";
})(ErrorType || (ErrorType = {}));
var DispatchHttpRequestError = class extends Error {
  type;
  response;
  constructor(type, response, options) {
    super(void 0, options);
    this.type = type;
    this.response = response;
  }
};
async function makeHttpRequest(request, options) {
  const signal = options?.signal;
  if (signal?.aborted) {
    throw new DispatchHttpRequestError(ErrorType.ABORT);
  }
  const response = await new Promise((resolve, reject) => {
    const onAbort = () => {
      reject(new DispatchHttpRequestError(ErrorType.ABORT));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    InspectorFrontendHostInstance.dispatchHttpRequest(request, (result) => {
      signal?.removeEventListener("abort", onAbort);
      resolve(result);
    });
  });
  debugLog2({ request, response });
  if (response.statusCode === 404) {
    throw new DispatchHttpRequestError(ErrorType.NOT_FOUND, response);
  }
  if ("response" in response && response.statusCode === 200) {
    if (request.streamId && !response.response) {
      return null;
    }
    try {
      return JSON.parse(response.response);
    } catch (err) {
      throw new DispatchHttpRequestError(ErrorType.HTTP_RESPONSE_UNAVAILABLE, response, { cause: err });
    }
  }
  throw new DispatchHttpRequestError(ErrorType.HTTP_RESPONSE_UNAVAILABLE, response);
}
function isDebugMode() {
  return Boolean(Platform3.HostRuntime.HOST_RUNTIME.getLocalStorage()?.getItem("debugDispatchHttpRequestEnabled"));
}
function debugLog2(...log) {
  if (!isDebugMode()) {
    return;
  }
  console.log("debugLog", ...log);
}
function setDebugDispatchHttpRequestEnabled(enabled) {
  const localStorage = Platform3.HostRuntime.HOST_RUNTIME.getLocalStorage();
  if (enabled) {
    localStorage?.setItem("debugDispatchHttpRequestEnabled", "true");
  } else {
    localStorage?.removeItem("debugDispatchHttpRequestEnabled");
  }
}
globalThis.setDebugDispatchHttpRequestEnabled = setDebugDispatchHttpRequestEnabled;

// gen/front_end/core/host/GcaClient.js
var GcaClient_exports = {};
__export(GcaClient_exports, {
  GcaClient: () => GcaClient
});
import * as Root2 from "./../root/root.js";
var SERVICE_NAME = "gcaService";
var ENDPOINTS = {
  CONTENT: "/v1beta:generateContent",
  SEND_TELEMETRY: "/v1beta:sendTelemetry",
  STREAM_CONTENT: "/v1beta:streamGenerateContent"
};
var GcaClient = class {
  enabled() {
    return Root2.Runtime.hostConfig.devToolsUseGcaApi?.enabled;
  }
  async conversationRequest(request, streamId, options) {
    try {
      const gcaRequest = aidaDoConversationRequestToGcaRequest(request);
      const response = await makeHttpRequest({
        service: SERVICE_NAME,
        path: ENDPOINTS.STREAM_CONTENT,
        method: "POST",
        body: JSON.stringify(gcaRequest),
        streamId
      }, options);
      debugLog("GCA conversation request succeeded:", JSON.stringify(request), JSON.stringify(response));
    } catch (err) {
      debugLog("GCA request failed:", JSON.stringify(request), err);
      throw err;
    }
  }
  registerClientEvent(clientEvent) {
    const gcaEvent = aidaEventToGcaTelemetryRequest(clientEvent);
    const response = makeHttpRequest({
      service: SERVICE_NAME,
      path: ENDPOINTS.SEND_TELEMETRY,
      method: "POST",
      body: JSON.stringify(gcaEvent)
    });
    return response.then((result) => {
      debugLog("GCA register event succeeded:", JSON.stringify(gcaEvent), JSON.stringify(result));
      return {};
    }, (err) => {
      debugLog("GCA register event failed:", JSON.stringify(gcaEvent), err);
      return { error: JSON.stringify(err) };
    });
  }
  async completeCode(request) {
    const gcaRequest = aidaCompletionRequestToGcaRequest(request);
    const result = await this.#requestContent(gcaRequest);
    return gcaResponseToAidaCompletionResponse(result);
  }
  async generateCode(request, options) {
    const gcaRequest = aidaGenerateCodeRequestToGcaRequest(request);
    const result = await this.#requestContent(gcaRequest, options);
    return gcaResponseToAidaGenerateCodeResponse(result);
  }
  async #requestContent(request, options) {
    try {
      const response = await makeHttpRequest({
        service: SERVICE_NAME,
        path: ENDPOINTS.CONTENT,
        method: "POST",
        body: JSON.stringify(request)
      }, options);
      debugLog("GCA request succeeded:", JSON.stringify(request), JSON.stringify(response));
      return response;
    } catch (err) {
      debugLog("GCA request failed:", JSON.stringify(request), err);
      throw err;
    }
  }
};

// gen/front_end/core/host/AidaClient.js
var CLIENT_NAME = "CHROME_DEVTOOLS";
var SERVICE_NAME2 = "aidaService";
var CODE_CHUNK_SEPARATOR = (lang = "") => "\n`````" + lang + "\n";
var AidaLanguageToMarkdown = {
  [
    "CPP"
    /* AidaInferenceLanguage.CPP */
  ]: "cpp",
  [
    "PYTHON"
    /* AidaInferenceLanguage.PYTHON */
  ]: "py",
  [
    "KOTLIN"
    /* AidaInferenceLanguage.KOTLIN */
  ]: "kt",
  [
    "JAVA"
    /* AidaInferenceLanguage.JAVA */
  ]: "java",
  [
    "JAVASCRIPT"
    /* AidaInferenceLanguage.JAVASCRIPT */
  ]: "js",
  [
    "GO"
    /* AidaInferenceLanguage.GO */
  ]: "go",
  [
    "TYPESCRIPT"
    /* AidaInferenceLanguage.TYPESCRIPT */
  ]: "ts",
  [
    "HTML"
    /* AidaInferenceLanguage.HTML */
  ]: "html",
  [
    "BASH"
    /* AidaInferenceLanguage.BASH */
  ]: "sh",
  [
    "CSS"
    /* AidaInferenceLanguage.CSS */
  ]: "css",
  [
    "DART"
    /* AidaInferenceLanguage.DART */
  ]: "dart",
  [
    "JSON"
    /* AidaInferenceLanguage.JSON */
  ]: "json",
  [
    "MARKDOWN"
    /* AidaInferenceLanguage.MARKDOWN */
  ]: "md",
  [
    "VUE"
    /* AidaInferenceLanguage.VUE */
  ]: "vue",
  [
    "XML"
    /* AidaInferenceLanguage.XML */
  ]: "xml",
  [
    "UNKNOWN"
    /* AidaInferenceLanguage.UNKNOWN */
  ]: "unknown"
};
var AidaClientError = class extends Error {
  name = "AidaClientError";
};
var AidaUnknownError = class extends AidaClientError {
  name = "AidaUnknownError";
};
var AidaAbortError = class extends AidaClientError {
  name = "AidaAbortError";
};
var AidaBlockError = class extends AidaClientError {
  name = "AidaBlockError";
};
var AidaQuotaError = class extends AidaClientError {
  name = "AidaQuotaError";
};
var AidaPayloadTooLargeError = class extends AidaClientError {
  name = "AidaPayloadTooLargeError";
};
var AidaPermissionDeniedError = class extends AidaClientError {
  name = "AidaPermissionDeniedError";
};
var AidaTimeoutError = class extends AidaClientError {
  name = "AidaTimeoutError";
};
var AidaInvalidJsonResponseError = class extends AidaClientError {
  name = "AidaInvalidJsonResponseError";
};
var AidaClient = class {
  // Delegate client
  #gcaClient = new GcaClient();
  static buildConsoleInsightsRequest(input) {
    const disallowLogging = Root3.Runtime.hostConfig.aidaAvailability?.disallowLogging ?? true;
    const chromeVersion = Root3.Runtime.getChromeVersion();
    if (!chromeVersion) {
      throw new Error("Cannot determine Chrome version");
    }
    const request = {
      current_message: { parts: [{ text: input }], role: Role.USER },
      client: CLIENT_NAME,
      functionality_type: FunctionalityType.EXPLAIN_ERROR,
      client_feature: ClientFeature.CHROME_CONSOLE_INSIGHTS,
      metadata: {
        disable_user_content_logging: disallowLogging,
        client_version: chromeVersion
      }
    };
    let temperature = -1;
    let modelId;
    if (Root3.Runtime.hostConfig.devToolsConsoleInsights?.enabled) {
      temperature = Root3.Runtime.hostConfig.devToolsConsoleInsights.temperature ?? -1;
      modelId = Root3.Runtime.hostConfig.devToolsConsoleInsights.modelId;
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
    if (!Platform4.HostRuntime.HOST_RUNTIME.getOnLine()) {
      return "no-internet";
    }
    const syncInfo = await new Promise((resolve) => InspectorFrontendHostInstance.getSyncInformation((syncInfo2) => resolve(syncInfo2)));
    if (!syncInfo.accountEmail) {
      return "no-account-email";
    }
    if (syncInfo.isSyncPaused) {
      return "sync-is-paused";
    }
    return "available";
  }
  async *doConversation(request, options) {
    if (!InspectorFrontendHostInstance.dispatchHttpRequest) {
      throw new Error("dispatchHttpRequest is not available");
    }
    if (options?.signal?.aborted) {
      throw new AidaAbortError();
    }
    if (Root3.Runtime.hostConfig.devToolsGeminiRebranding?.enabled) {
      request.metadata.disable_user_content_logging = true;
    }
    let abortListener;
    let streamId;
    try {
      const stream = (() => {
        let { promise, resolve, reject } = Promise.withResolvers();
        promise.catch(() => {
        });
        abortListener = () => {
          reject(new AidaAbortError());
        };
        options?.signal?.addEventListener("abort", abortListener, { once: true });
        return {
          write: async (data) => {
            resolve(data);
            ({ promise, resolve, reject } = Promise.withResolvers());
            promise.catch(() => {
            });
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
      streamId = bindOutputStream(stream);
      let response;
      if (this.#gcaClient.enabled()) {
        response = this.#gcaClient.conversationRequest(request, streamId, options);
      } else {
        response = makeHttpRequest({
          service: SERVICE_NAME2,
          path: "/v1/aida:doConversation",
          method: "POST",
          body: JSON.stringify(request),
          streamId
        }, options);
      }
      response.then(() => {
        void stream.close();
      }, (err) => {
        debugLog("doConversation failed with error:", JSON.stringify(err));
        stream.fail(mapError(err));
      });
      yield* this.#handleResponseStream(stream);
    } finally {
      if (options?.signal && abortListener) {
        options.signal.removeEventListener("abort", abortListener);
      }
      if (streamId !== void 0) {
        discardOutputStream(streamId);
      }
    }
  }
  async *#handleResponseStream(stream) {
    let chunk;
    const text = [];
    let inCodeChunk = false;
    const functionCalls = [];
    let metadata = { rpcGlobalId: 0 };
    while (chunk = await stream.read()) {
      debugLog("doConversation stream chunk:", chunk);
      let textUpdated = false;
      const results = this.#parseAndTranslate(chunk);
      for (const result of results) {
        if (result.metadata) {
          metadata = result.metadata;
          if (metadata?.attributionMetadata?.attributionAction === RecitationAction.BLOCK) {
            throw new AidaBlockError();
          }
        }
        if (result.textChunk) {
          if (inCodeChunk) {
            text.push(CODE_CHUNK_SEPARATOR());
            inCodeChunk = false;
          }
          text.push(result.textChunk.text);
          textUpdated = true;
        } else if (result.codeChunk) {
          if (!inCodeChunk) {
            const language = AidaLanguageToMarkdown[result.codeChunk.inferenceLanguage] ?? "";
            text.push(CODE_CHUNK_SEPARATOR(language));
            inCodeChunk = true;
          }
          text.push(result.codeChunk.code);
          textUpdated = true;
        } else if (result.functionCallChunk) {
          functionCalls.push({
            name: result.functionCallChunk.functionCall.name,
            args: result.functionCallChunk.functionCall.args,
            thoughtSignature: result.functionCallChunk.functionCall.thoughtSignature
          });
        } else if ("error" in result) {
          throw mapError(result.error);
        } else {
          throw new Error(`Unknown chunk result ${JSON.stringify(result)}`);
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
  #parseAndTranslate(chunk) {
    const results = this.#parseStreamChunk(chunk);
    if (this.#gcaClient.enabled()) {
      return results.flatMap(gcaChunkResponseToAidaChunkResponse);
    }
    return results;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #parseStreamChunk(chunk) {
    if (!chunk.length) {
      return [];
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
    try {
      return JSON.parse(chunk);
    } catch (error) {
      throw new Error("Cannot parse chunk: " + chunk, { cause: error });
    }
  }
  registerClientEvent(clientEvent) {
    if (Root3.Runtime.hostConfig.devToolsGeminiRebranding?.enabled) {
      clientEvent.disable_user_content_logging = true;
    }
    if (this.#gcaClient.enabled()) {
      return this.#gcaClient.registerClientEvent(clientEvent);
    }
    const { promise, resolve } = Promise.withResolvers();
    InspectorFrontendHostInstance.registerAidaClientEvent(JSON.stringify({
      client: CLIENT_NAME,
      event_time: (/* @__PURE__ */ new Date()).toISOString(),
      ...clientEvent
    }), resolve);
    return promise;
  }
  async completeCode(request) {
    if (!InspectorFrontendHostInstance.aidaCodeComplete) {
      throw new Error("aidaCodeComplete is not available");
    }
    if (Root3.Runtime.hostConfig.devToolsGeminiRebranding?.enabled) {
      request.metadata.disable_user_content_logging = true;
    }
    if (this.#gcaClient.enabled()) {
      try {
        return await this.#gcaClient.completeCode(request);
      } catch (err) {
        throw mapError(err);
      }
    }
    const { promise, resolve } = Promise.withResolvers();
    InspectorFrontendHostInstance.aidaCodeComplete(JSON.stringify(request), resolve);
    const completeCodeResult = await promise;
    if (completeCodeResult.error) {
      throw mapError(completeCodeResult.error, completeCodeResult.detail);
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
  async generateCode(request, options) {
    if (Root3.Runtime.hostConfig.devToolsGeminiRebranding?.enabled) {
      request.metadata.disable_user_content_logging = true;
    }
    if (this.#gcaClient.enabled()) {
      try {
        return await this.#gcaClient.generateCode(request, options);
      } catch (err) {
        throw mapError(err);
      }
    }
    try {
      const response = await makeHttpRequest({
        service: SERVICE_NAME2,
        path: "/v1/aida:generateCode",
        method: "POST",
        body: JSON.stringify(request)
      }, options);
      return response;
    } catch (err) {
      throw mapError(err);
    }
  }
};
function convertToUserTierEnum(userTier) {
  if (userTier) {
    switch (userTier) {
      case "TESTERS":
        return UserTier.TESTERS;
      case "BETA":
        return UserTier.BETA;
      case "PUBLIC":
        return UserTier.PUBLIC;
    }
  }
  return UserTier.PUBLIC;
}
function getClientFeatureName(feature) {
  const name = ClientFeature[feature];
  if (typeof name !== "string") {
    throw new Error(`Invalid ClientFeature: ${feature}`);
  }
  return name;
}
var HostConfigTracker = class _HostConfigTracker extends Common4.ObjectWrapper.ObjectWrapper {
  #pollTimer;
  #aidaAvailability;
  get aidaAvailability() {
    return this.#aidaAvailability;
  }
  static instance({ forceNew } = { forceNew: false }) {
    if (!Root3.DevToolsContext.globalInstance().has(_HostConfigTracker) || forceNew) {
      Root3.DevToolsContext.globalInstance().set(_HostConfigTracker, new _HostConfigTracker());
    }
    return Root3.DevToolsContext.globalInstance().get(_HostConfigTracker);
  }
  dispose() {
    clearTimeout(this.#pollTimer);
    this.listeners = void 0;
  }
  static removeInstance() {
    if (Root3.DevToolsContext.globalInstance().has(_HostConfigTracker)) {
      Root3.DevToolsContext.globalInstance().get(_HostConfigTracker).dispose();
      Root3.DevToolsContext.globalInstance().delete(_HostConfigTracker);
    }
  }
  addEventListener(eventType, listener) {
    const isFirst = !this.hasEventListeners(eventType);
    const eventDescriptor = super.addEventListener(eventType, listener);
    if (isFirst) {
      clearTimeout(this.#pollTimer);
      void this.pollAidaAvailability();
    }
    return eventDescriptor;
  }
  removeEventListener(eventType, listener) {
    super.removeEventListener(eventType, listener);
    if (!this.hasEventListeners(eventType)) {
      clearTimeout(this.#pollTimer);
    }
  }
  async pollAidaAvailability() {
    this.#pollTimer = setTimeout(() => this.pollAidaAvailability(), 2e3);
    const currentAidaAvailability = await AidaClient.checkAccessPreconditions();
    if (currentAidaAvailability !== this.#aidaAvailability) {
      this.#aidaAvailability = currentAidaAvailability;
      const config = await new Promise((resolve) => InspectorFrontendHostInstance.getHostConfig(resolve));
      Object.assign(Root3.Runtime.hostConfig, config);
      this.dispatchEventToListeners("aidaAvailabilityChanged", currentAidaAvailability);
    }
  }
};
function isQuotaError(...inputs) {
  return inputs.some((input) => input?.toLowerCase().includes("quota"));
}
function isPayloadTooLargeError(...inputs) {
  return inputs.some((input) => input?.toLowerCase().includes("payload size exceeds the limit"));
}
function mapError(err, detail) {
  if (err instanceof AidaClientError) {
    return err;
  }
  if (err instanceof DispatchHttpRequestError) {
    if (err.type === ErrorType.ABORT) {
      return new AidaAbortError();
    }
    const response = err.response;
    if (response) {
      if (response.statusCode === 429) {
        return new AidaQuotaError("Server responded: quota exceeded");
      }
      if (response.statusCode === 403) {
        return new AidaPermissionDeniedError("Server responded: permission denied");
      }
      if ("netErrorName" in response && response.netErrorName === "net::ERR_TIMED_OUT") {
        return new AidaTimeoutError("AIDA request timed out");
      }
      if ("error" in response && response.error) {
        return mapError(response.error, response.detail);
      }
      if (response.statusCode === 200 && err.type === ErrorType.HTTP_RESPONSE_UNAVAILABLE) {
        return new AidaInvalidJsonResponseError("Server responded with invalid JSON", { cause: err });
      }
      if (response.statusCode !== 200) {
        return new AidaUnknownError(`Request failed: ${JSON.stringify(response)}`);
      }
    }
  }
  if (typeof err === "string") {
    if (isQuotaError(err, detail)) {
      return new AidaQuotaError(`Cannot send request: ${err}${detail ? ` ${detail}` : ""}`);
    }
    if (isPayloadTooLargeError(err, detail)) {
      return new AidaPayloadTooLargeError(`Cannot send request: ${err}${detail ? ` ${detail}` : ""}`);
    }
    return new AidaUnknownError(`Cannot send request: ${err}${detail ? ` ${detail}` : ""}`);
  }
  if (err instanceof Error) {
    return new AidaUnknownError(err.message, { cause: err });
  }
  return new AidaUnknownError(String(err));
}

// gen/front_end/core/host/GdpClient.js
var GdpClient_exports = {};
__export(GdpClient_exports, {
  EligibilityStatus: () => EligibilityStatus,
  EmailPreference: () => EmailPreference,
  GOOGLE_DEVELOPER_PROGRAM_PROFILE_LINK: () => GOOGLE_DEVELOPER_PROGRAM_PROFILE_LINK,
  GdpClient: () => GdpClient,
  SubscriptionStatus: () => SubscriptionStatus,
  SubscriptionTier: () => SubscriptionTier,
  getGdpProfilesEnterprisePolicy: () => getGdpProfilesEnterprisePolicy,
  isBadgesEnabled: () => isBadgesEnabled,
  isGdpProfilesAvailable: () => isGdpProfilesAvailable,
  isStarterBadgeEnabled: () => isStarterBadgeEnabled
});
import * as Root4 from "./../root/root.js";
var SubscriptionStatus;
(function(SubscriptionStatus2) {
  SubscriptionStatus2["ENABLED"] = "SUBSCRIPTION_STATE_ENABLED";
  SubscriptionStatus2["PENDING"] = "SUBSCRIPTION_STATE_PENDING";
  SubscriptionStatus2["CANCELED"] = "SUBSCRIPTION_STATE_CANCELED";
  SubscriptionStatus2["REFUNDED"] = "SUBSCRIPTION_STATE_REFUNDED";
  SubscriptionStatus2["AWAITING_FIX"] = "SUBSCRIPTION_STATE_AWAITING_FIX";
  SubscriptionStatus2["ON_HOLD"] = "SUBSCRIPTION_STATE_ACCOUNT_ON_HOLD";
})(SubscriptionStatus || (SubscriptionStatus = {}));
var SubscriptionTier;
(function(SubscriptionTier2) {
  SubscriptionTier2["PREMIUM_ANNUAL"] = "SUBSCRIPTION_TIER_PREMIUM_ANNUAL";
  SubscriptionTier2["PREMIUM_MONTHLY"] = "SUBSCRIPTION_TIER_PREMIUM_MONTHLY";
  SubscriptionTier2["PRO_ANNUAL"] = "SUBSCRIPTION_TIER_PRO_ANNUAL";
  SubscriptionTier2["PRO_MONTHLY"] = "SUBSCRIPTION_TIER_PRO_MONTHLY";
})(SubscriptionTier || (SubscriptionTier = {}));
var EligibilityStatus;
(function(EligibilityStatus2) {
  EligibilityStatus2["ELIGIBLE"] = "ELIGIBLE";
  EligibilityStatus2["NOT_ELIGIBLE"] = "NOT_ELIGIBLE";
})(EligibilityStatus || (EligibilityStatus = {}));
var EmailPreference;
(function(EmailPreference2) {
  EmailPreference2["ENABLED"] = "ENABLED";
  EmailPreference2["DISABLED"] = "DISABLED";
})(EmailPreference || (EmailPreference = {}));
function normalizeBadgeName(name) {
  return name.replace(/profiles\/[^/]+\/awards\//, "profiles/me/awards/");
}
var GOOGLE_DEVELOPER_PROGRAM_PROFILE_LINK = "https://developers.google.com/profile/u/me";
var ORIGIN_APPLICATION_NAME = "APPLICATION_CHROME_DEVTOOLS";
async function makeHttpRequest2(request) {
  if (!isGdpProfilesAvailable()) {
    throw new DispatchHttpRequestError(ErrorType.HTTP_RESPONSE_UNAVAILABLE);
  }
  const response = await makeHttpRequest(request);
  return response;
}
var SERVICE_NAME3 = "gdpService";
var GdpClient = class _GdpClient {
  #cachedProfilePromise;
  #cachedEligibilityPromise;
  static instance({ forceNew } = { forceNew: false }) {
    if (!Root4.DevToolsContext.globalInstance().has(_GdpClient) || forceNew) {
      Root4.DevToolsContext.globalInstance().set(_GdpClient, new _GdpClient());
    }
    return Root4.DevToolsContext.globalInstance().get(_GdpClient);
  }
  static removeInstance() {
    Root4.DevToolsContext.globalInstance().delete(_GdpClient);
  }
  /**
   * Fetches the user's GDP profile and eligibility status.
   *
   * It first attempts to fetch the profile. If the profile is not found
   * (a `NOT_FOUND` error), this is handled gracefully by treating the profile
   * as `null` and then proceeding to check for eligibility.
   *
   * @returns A promise that resolves with an object containing the `profile`
   * and `isEligible` status, or `null` if an unexpected error occurs.
   */
  async getProfile() {
    try {
      const profile = await this.#getProfile();
      return {
        profile,
        isEligible: true
      };
    } catch (err) {
      if (err instanceof DispatchHttpRequestError && err.type === ErrorType.HTTP_RESPONSE_UNAVAILABLE) {
        return null;
      }
    }
    try {
      const checkEligibilityResponse = await this.#checkEligibility();
      return {
        profile: null,
        isEligible: checkEligibilityResponse.createProfile === EligibilityStatus.ELIGIBLE
      };
    } catch {
      return null;
    }
  }
  async #getProfile() {
    if (this.#cachedProfilePromise) {
      return await this.#cachedProfilePromise;
    }
    this.#cachedProfilePromise = makeHttpRequest2({
      service: SERVICE_NAME3,
      path: "/v1beta1/profile:get",
      method: "GET"
    }).then((profile) => {
      this.#cachedEligibilityPromise = Promise.resolve({ createProfile: EligibilityStatus.ELIGIBLE });
      return profile;
    });
    return await this.#cachedProfilePromise;
  }
  async #checkEligibility() {
    if (this.#cachedEligibilityPromise) {
      return await this.#cachedEligibilityPromise;
    }
    this.#cachedEligibilityPromise = makeHttpRequest2({ service: SERVICE_NAME3, path: "/v1beta1/eligibility:check", method: "GET" });
    return await this.#cachedEligibilityPromise;
  }
  /**
   * @returns null if the request fails, the awarded badge names otherwise.
   */
  async getAwardedBadgeNames({ names }) {
    try {
      const response = await makeHttpRequest2({
        service: SERVICE_NAME3,
        path: "/v1beta1/profiles/me/awards:batchGet",
        method: "GET",
        queryParams: {
          allowMissing: "true",
          names
        }
      });
      return new Set(response.awards?.map((award) => normalizeBadgeName(award.name)) ?? []);
    } catch {
      return null;
    }
  }
  async createProfile({ user, emailPreference }) {
    try {
      const response = await makeHttpRequest2({
        service: SERVICE_NAME3,
        path: "/v1beta1/profiles",
        method: "POST",
        body: JSON.stringify({
          user,
          newsletter_email: emailPreference,
          creation_origin: {
            origin_application: ORIGIN_APPLICATION_NAME
          }
        })
      });
      this.#clearCache();
      return response;
    } catch {
      return null;
    }
  }
  #clearCache() {
    this.#cachedProfilePromise = void 0;
    this.#cachedEligibilityPromise = void 0;
  }
  async createAward({ name }) {
    try {
      const response = await makeHttpRequest2({
        service: SERVICE_NAME3,
        path: "/v1beta1/profiles/me/awards",
        method: "POST",
        body: JSON.stringify({
          awardingUri: "devtools://devtools",
          name
        })
      });
      return response;
    } catch {
      return null;
    }
  }
};
function isGdpProfilesAvailable() {
  const isBaseFeatureEnabled = Boolean(Root4.Runtime.hostConfig.devToolsGdpProfiles?.enabled);
  const isBrandedBuild = Boolean(Root4.Runtime.hostConfig.devToolsGdpProfilesAvailability?.enabled);
  const isOffTheRecordProfile = Root4.Runtime.hostConfig.isOffTheRecord;
  const isDisabledByEnterprisePolicy = getGdpProfilesEnterprisePolicy() === Root4.Runtime.GdpProfilesEnterprisePolicyValue.DISABLED;
  return isBaseFeatureEnabled && isBrandedBuild && !isOffTheRecordProfile && !isDisabledByEnterprisePolicy;
}
function getGdpProfilesEnterprisePolicy() {
  return Root4.Runtime.hostConfig.devToolsGdpProfilesAvailability?.enterprisePolicyValue ?? Root4.Runtime.GdpProfilesEnterprisePolicyValue.DISABLED;
}
function isBadgesEnabled() {
  const isBadgesEnabledByEnterprisePolicy = getGdpProfilesEnterprisePolicy() === Root4.Runtime.GdpProfilesEnterprisePolicyValue.ENABLED;
  const isBadgesEnabledByFeatureFlag = Boolean(Root4.Runtime.hostConfig.devToolsGdpProfiles?.badgesEnabled);
  return isBadgesEnabledByEnterprisePolicy && isBadgesEnabledByFeatureFlag;
}
function isStarterBadgeEnabled() {
  return Boolean(Root4.Runtime.hostConfig.devToolsGdpProfiles?.starterBadgeEnabled);
}

// gen/front_end/core/host/Platform.js
var Platform_exports = {};
__export(Platform_exports, {
  fontFamily: () => fontFamily,
  isMac: () => isMac,
  isWin: () => isWin,
  platform: () => platform,
  setFontFamilyForTests: () => setFontFamilyForTests,
  setPlatformForTests: () => setPlatformForTests
});
var _platform;
function platform() {
  if (!_platform) {
    _platform = InspectorFrontendHostInstance.platform();
  }
  return _platform;
}
var _isMac;
function isMac() {
  if (typeof _isMac === "undefined") {
    _isMac = platform() === "mac";
  }
  return _isMac;
}
var _isWin;
function isWin() {
  if (typeof _isWin === "undefined") {
    _isWin = platform() === "windows";
  }
  return _isWin;
}
function setPlatformForTests(platform2) {
  _platform = platform2;
  _isMac = void 0;
  _isWin = void 0;
}
var _fontFamily;
function fontFamily() {
  if (_fontFamily) {
    return _fontFamily;
  }
  switch (platform()) {
    case "linux":
      _fontFamily = "Roboto, Ubuntu, Arial, sans-serif";
      break;
    case "mac":
      _fontFamily = "'Lucida Grande', sans-serif";
      break;
    case "windows":
      _fontFamily = "'Segoe UI', Tahoma, sans-serif";
      break;
  }
  return _fontFamily;
}
function setFontFamilyForTests(family) {
  _fontFamily = family;
}

// gen/front_end/core/host/UserMetrics.js
var UserMetrics_exports = {};
__export(UserMetrics_exports, {
  Action: () => Action2,
  AnimationsPlaybackRate: () => AnimationsPlaybackRate2,
  BadgeType: () => BadgeType2,
  BuiltInAiAvailability: () => BuiltInAiAvailability2,
  DeveloperResourceLoaded: () => DeveloperResourceLoaded2,
  DeveloperResourceScheme: () => DeveloperResourceScheme2,
  DevtoolsExperiments: () => DevtoolsExperiments2,
  IssueCreated: () => IssueCreated2,
  IssueExpanded: () => IssueExpanded2,
  IssueOpener: () => IssueOpener2,
  IssueResourceOpened: () => IssueResourceOpened2,
  KeybindSetSettings: () => KeybindSetSettings2,
  KeyboardShortcutAction: () => KeyboardShortcutAction2,
  Language: () => Language3,
  LighthouseCategoryUsed: () => LighthouseCategoryUsed2,
  LighthouseModeRun: () => LighthouseModeRun2,
  ManifestSectionCodes: () => ManifestSectionCodes2,
  MediaTypes: () => MediaTypes2,
  PanelCodes: () => PanelCodes2,
  RecordingAssertion: () => RecordingAssertion2,
  RecordingCodeToggled: () => RecordingCodeToggled2,
  RecordingCopiedToClipboard: () => RecordingCopiedToClipboard2,
  RecordingEdited: () => RecordingEdited2,
  RecordingExported: () => RecordingExported2,
  RecordingReplayFinished: () => RecordingReplayFinished2,
  RecordingReplaySpeed: () => RecordingReplaySpeed2,
  RecordingReplayStarted: () => RecordingReplayStarted2,
  RecordingToggled: () => RecordingToggled2,
  ResendRequestType: () => ResendRequestType2,
  SwatchType: () => SwatchType2,
  SyncSetting: () => SyncSetting2,
  TimelineNavigationSetting: () => TimelineNavigationSetting2,
  UserMetrics: () => UserMetrics,
  resendRequestType: () => resendRequestType
});
import * as Common5 from "./../common/common.js";

// gen/front_end/core/host/UserMetricsEnums.js
var Action;
(function(Action3) {
  Action3[Action3["WindowDocked"] = 1] = "WindowDocked";
  Action3[Action3["WindowUndocked"] = 2] = "WindowUndocked";
  Action3[Action3["ScriptsBreakpointSet"] = 3] = "ScriptsBreakpointSet";
  Action3[Action3["TimelineStarted"] = 4] = "TimelineStarted";
  Action3[Action3["ProfilesCPUProfileTaken"] = 5] = "ProfilesCPUProfileTaken";
  Action3[Action3["ProfilesHeapProfileTaken"] = 6] = "ProfilesHeapProfileTaken";
  Action3[Action3["ConsoleEvaluated"] = 8] = "ConsoleEvaluated";
  Action3[Action3["FileSavedInWorkspace"] = 9] = "FileSavedInWorkspace";
  Action3[Action3["DeviceModeEnabled"] = 10] = "DeviceModeEnabled";
  Action3[Action3["AnimationsPlaybackRateChanged"] = 11] = "AnimationsPlaybackRateChanged";
  Action3[Action3["RevisionApplied"] = 12] = "RevisionApplied";
  Action3[Action3["FileSystemDirectoryContentReceived"] = 13] = "FileSystemDirectoryContentReceived";
  Action3[Action3["StyleRuleEdited"] = 14] = "StyleRuleEdited";
  Action3[Action3["CommandEvaluatedInConsolePanel"] = 15] = "CommandEvaluatedInConsolePanel";
  Action3[Action3["DOMPropertiesExpanded"] = 16] = "DOMPropertiesExpanded";
  Action3[Action3["ResizedViewInResponsiveMode"] = 17] = "ResizedViewInResponsiveMode";
  Action3[Action3["TimelinePageReloadStarted"] = 18] = "TimelinePageReloadStarted";
  Action3[Action3["ConnectToNodeJSFromFrontend"] = 19] = "ConnectToNodeJSFromFrontend";
  Action3[Action3["ConnectToNodeJSDirectly"] = 20] = "ConnectToNodeJSDirectly";
  Action3[Action3["CpuThrottlingEnabled"] = 21] = "CpuThrottlingEnabled";
  Action3[Action3["CpuProfileNodeFocused"] = 22] = "CpuProfileNodeFocused";
  Action3[Action3["CpuProfileNodeExcluded"] = 23] = "CpuProfileNodeExcluded";
  Action3[Action3["SelectFileFromFilePicker"] = 24] = "SelectFileFromFilePicker";
  Action3[Action3["SelectCommandFromCommandMenu"] = 25] = "SelectCommandFromCommandMenu";
  Action3[Action3["ChangeInspectedNodeInElementsPanel"] = 26] = "ChangeInspectedNodeInElementsPanel";
  Action3[Action3["StyleRuleCopied"] = 27] = "StyleRuleCopied";
  Action3[Action3["CoverageStarted"] = 28] = "CoverageStarted";
  Action3[Action3["LighthouseStarted"] = 29] = "LighthouseStarted";
  Action3[Action3["LighthouseFinished"] = 30] = "LighthouseFinished";
  Action3[Action3["ShowedThirdPartyBadges"] = 31] = "ShowedThirdPartyBadges";
  Action3[Action3["LighthouseViewTrace"] = 32] = "LighthouseViewTrace";
  Action3[Action3["FilmStripStartedRecording"] = 33] = "FilmStripStartedRecording";
  Action3[Action3["CoverageReportFiltered"] = 34] = "CoverageReportFiltered";
  Action3[Action3["CoverageStartedPerBlock"] = 35] = "CoverageStartedPerBlock";
  Action3[Action3["SettingsOpenedFromGear-deprecated"] = 36] = "SettingsOpenedFromGear-deprecated";
  Action3[Action3["SettingsOpenedFromMenu-deprecated"] = 37] = "SettingsOpenedFromMenu-deprecated";
  Action3[Action3["SettingsOpenedFromCommandMenu-deprecated"] = 38] = "SettingsOpenedFromCommandMenu-deprecated";
  Action3[Action3["TabMovedToDrawer"] = 39] = "TabMovedToDrawer";
  Action3[Action3["TabMovedToMainPanel"] = 40] = "TabMovedToMainPanel";
  Action3[Action3["CaptureCssOverviewClicked"] = 41] = "CaptureCssOverviewClicked";
  Action3[Action3["VirtualAuthenticatorEnvironmentEnabled"] = 42] = "VirtualAuthenticatorEnvironmentEnabled";
  Action3[Action3["SourceOrderViewActivated"] = 43] = "SourceOrderViewActivated";
  Action3[Action3["UserShortcutAdded"] = 44] = "UserShortcutAdded";
  Action3[Action3["ShortcutRemoved"] = 45] = "ShortcutRemoved";
  Action3[Action3["ShortcutModified"] = 46] = "ShortcutModified";
  Action3[Action3["CustomPropertyLinkClicked"] = 47] = "CustomPropertyLinkClicked";
  Action3[Action3["CustomPropertyEdited"] = 48] = "CustomPropertyEdited";
  Action3[Action3["ServiceWorkerNetworkRequestClicked"] = 49] = "ServiceWorkerNetworkRequestClicked";
  Action3[Action3["ServiceWorkerNetworkRequestClosedQuickly"] = 50] = "ServiceWorkerNetworkRequestClosedQuickly";
  Action3[Action3["NetworkPanelServiceWorkerRespondWith"] = 51] = "NetworkPanelServiceWorkerRespondWith";
  Action3[Action3["NetworkPanelCopyValue"] = 52] = "NetworkPanelCopyValue";
  Action3[Action3["ConsoleSidebarOpened"] = 53] = "ConsoleSidebarOpened";
  Action3[Action3["PerfPanelTraceImported"] = 54] = "PerfPanelTraceImported";
  Action3[Action3["PerfPanelTraceExported"] = 55] = "PerfPanelTraceExported";
  Action3[Action3["StackFrameRestarted"] = 56] = "StackFrameRestarted";
  Action3[Action3["CaptureTestProtocolClicked"] = 57] = "CaptureTestProtocolClicked";
  Action3[Action3["BreakpointRemovedFromRemoveButton"] = 58] = "BreakpointRemovedFromRemoveButton";
  Action3[Action3["BreakpointGroupExpandedStateChanged"] = 59] = "BreakpointGroupExpandedStateChanged";
  Action3[Action3["HeaderOverrideFileCreated"] = 60] = "HeaderOverrideFileCreated";
  Action3[Action3["HeaderOverrideEnableEditingClicked"] = 61] = "HeaderOverrideEnableEditingClicked";
  Action3[Action3["HeaderOverrideHeaderAdded"] = 62] = "HeaderOverrideHeaderAdded";
  Action3[Action3["HeaderOverrideHeaderEdited"] = 63] = "HeaderOverrideHeaderEdited";
  Action3[Action3["HeaderOverrideHeaderRemoved"] = 64] = "HeaderOverrideHeaderRemoved";
  Action3[Action3["HeaderOverrideHeadersFileEdited"] = 65] = "HeaderOverrideHeadersFileEdited";
  Action3[Action3["PersistenceNetworkOverridesEnabled"] = 66] = "PersistenceNetworkOverridesEnabled";
  Action3[Action3["PersistenceNetworkOverridesDisabled"] = 67] = "PersistenceNetworkOverridesDisabled";
  Action3[Action3["BreakpointRemovedFromContextMenu"] = 68] = "BreakpointRemovedFromContextMenu";
  Action3[Action3["BreakpointsInFileRemovedFromRemoveButton"] = 69] = "BreakpointsInFileRemovedFromRemoveButton";
  Action3[Action3["BreakpointsInFileRemovedFromContextMenu"] = 70] = "BreakpointsInFileRemovedFromContextMenu";
  Action3[Action3["BreakpointsInFileCheckboxToggled"] = 71] = "BreakpointsInFileCheckboxToggled";
  Action3[Action3["BreakpointsInFileEnabledDisabledFromContextMenu"] = 72] = "BreakpointsInFileEnabledDisabledFromContextMenu";
  Action3[Action3["BreakpointConditionEditedFromSidebar"] = 73] = "BreakpointConditionEditedFromSidebar";
  Action3[Action3["WorkspaceTabAddFolder"] = 74] = "WorkspaceTabAddFolder";
  Action3[Action3["WorkspaceTabRemoveFolder"] = 75] = "WorkspaceTabRemoveFolder";
  Action3[Action3["OverrideTabAddFolder"] = 76] = "OverrideTabAddFolder";
  Action3[Action3["OverrideTabRemoveFolder"] = 77] = "OverrideTabRemoveFolder";
  Action3[Action3["WorkspaceSourceSelected"] = 78] = "WorkspaceSourceSelected";
  Action3[Action3["OverridesSourceSelected"] = 79] = "OverridesSourceSelected";
  Action3[Action3["StyleSheetInitiatorLinkClicked"] = 80] = "StyleSheetInitiatorLinkClicked";
  Action3[Action3["BreakpointRemovedFromGutterContextMenu"] = 81] = "BreakpointRemovedFromGutterContextMenu";
  Action3[Action3["BreakpointRemovedFromGutterToggle"] = 82] = "BreakpointRemovedFromGutterToggle";
  Action3[Action3["StylePropertyInsideKeyframeEdited"] = 83] = "StylePropertyInsideKeyframeEdited";
  Action3[Action3["OverrideContentFromSourcesContextMenu"] = 84] = "OverrideContentFromSourcesContextMenu";
  Action3[Action3["OverrideContentFromNetworkContextMenu"] = 85] = "OverrideContentFromNetworkContextMenu";
  Action3[Action3["OverrideScript"] = 86] = "OverrideScript";
  Action3[Action3["OverrideStyleSheet"] = 87] = "OverrideStyleSheet";
  Action3[Action3["OverrideDocument"] = 88] = "OverrideDocument";
  Action3[Action3["OverrideFetchXHR"] = 89] = "OverrideFetchXHR";
  Action3[Action3["OverrideImage"] = 90] = "OverrideImage";
  Action3[Action3["OverrideFont"] = 91] = "OverrideFont";
  Action3[Action3["OverrideContentContextMenuSetup"] = 92] = "OverrideContentContextMenuSetup";
  Action3[Action3["OverrideContentContextMenuAbandonSetup"] = 93] = "OverrideContentContextMenuAbandonSetup";
  Action3[Action3["OverrideContentContextMenuActivateDisabled"] = 94] = "OverrideContentContextMenuActivateDisabled";
  Action3[Action3["OverrideContentContextMenuOpenExistingFile"] = 95] = "OverrideContentContextMenuOpenExistingFile";
  Action3[Action3["OverrideContentContextMenuSaveNewFile"] = 96] = "OverrideContentContextMenuSaveNewFile";
  Action3[Action3["ShowAllOverridesFromSourcesContextMenu"] = 97] = "ShowAllOverridesFromSourcesContextMenu";
  Action3[Action3["ShowAllOverridesFromNetworkContextMenu"] = 98] = "ShowAllOverridesFromNetworkContextMenu";
  Action3[Action3["AnimationGroupsCleared"] = 99] = "AnimationGroupsCleared";
  Action3[Action3["AnimationsPaused"] = 100] = "AnimationsPaused";
  Action3[Action3["AnimationsResumed"] = 101] = "AnimationsResumed";
  Action3[Action3["AnimatedNodeDescriptionClicked"] = 102] = "AnimatedNodeDescriptionClicked";
  Action3[Action3["AnimationGroupScrubbed"] = 103] = "AnimationGroupScrubbed";
  Action3[Action3["AnimationGroupReplayed"] = 104] = "AnimationGroupReplayed";
  Action3[Action3["OverrideTabDeleteFolderContextMenu"] = 105] = "OverrideTabDeleteFolderContextMenu";
  Action3[Action3["WorkspaceDropFolder"] = 107] = "WorkspaceDropFolder";
  Action3[Action3["WorkspaceSelectFolder"] = 108] = "WorkspaceSelectFolder";
  Action3[Action3["OverrideContentContextMenuSourceMappedWarning"] = 109] = "OverrideContentContextMenuSourceMappedWarning";
  Action3[Action3["OverrideContentContextMenuRedirectToDeployed"] = 110] = "OverrideContentContextMenuRedirectToDeployed";
  Action3[Action3["NewStyleRuleAdded"] = 111] = "NewStyleRuleAdded";
  Action3[Action3["TraceExpanded"] = 112] = "TraceExpanded";
  Action3[Action3["InsightConsoleMessageShown"] = 113] = "InsightConsoleMessageShown";
  Action3[Action3["InsightRequestedViaContextMenu"] = 114] = "InsightRequestedViaContextMenu";
  Action3[Action3["InsightRequestedViaHoverButton"] = 115] = "InsightRequestedViaHoverButton";
  Action3[Action3["InsightRatedPositive"] = 117] = "InsightRatedPositive";
  Action3[Action3["InsightRatedNegative"] = 118] = "InsightRatedNegative";
  Action3[Action3["InsightClosed"] = 119] = "InsightClosed";
  Action3[Action3["InsightErrored"] = 120] = "InsightErrored";
  Action3[Action3["InsightHoverButtonShown"] = 121] = "InsightHoverButtonShown";
  Action3[Action3["SelfXssWarningConsoleMessageShown"] = 122] = "SelfXssWarningConsoleMessageShown";
  Action3[Action3["SelfXssWarningDialogShown"] = 123] = "SelfXssWarningDialogShown";
  Action3[Action3["SelfXssAllowPastingInConsole"] = 124] = "SelfXssAllowPastingInConsole";
  Action3[Action3["SelfXssAllowPastingInDialog"] = 125] = "SelfXssAllowPastingInDialog";
  Action3[Action3["ToggleEmulateFocusedPageFromStylesPaneOn"] = 126] = "ToggleEmulateFocusedPageFromStylesPaneOn";
  Action3[Action3["ToggleEmulateFocusedPageFromStylesPaneOff"] = 127] = "ToggleEmulateFocusedPageFromStylesPaneOff";
  Action3[Action3["ToggleEmulateFocusedPageFromRenderingTab"] = 128] = "ToggleEmulateFocusedPageFromRenderingTab";
  Action3[Action3["ToggleEmulateFocusedPageFromCommandMenu"] = 129] = "ToggleEmulateFocusedPageFromCommandMenu";
  Action3[Action3["InsightGenerated"] = 130] = "InsightGenerated";
  Action3[Action3["InsightErroredApi"] = 131] = "InsightErroredApi";
  Action3[Action3["InsightErroredMarkdown"] = 132] = "InsightErroredMarkdown";
  Action3[Action3["ToggleShowWebVitals"] = 133] = "ToggleShowWebVitals";
  Action3[Action3["InsightErroredPermissionDenied"] = 134] = "InsightErroredPermissionDenied";
  Action3[Action3["InsightErroredCannotSend"] = 135] = "InsightErroredCannotSend";
  Action3[Action3["InsightErroredRequestFailed"] = 136] = "InsightErroredRequestFailed";
  Action3[Action3["InsightErroredCannotParseChunk"] = 137] = "InsightErroredCannotParseChunk";
  Action3[Action3["InsightErroredUnknownChunk"] = 138] = "InsightErroredUnknownChunk";
  Action3[Action3["InsightErroredOther"] = 139] = "InsightErroredOther";
  Action3[Action3["AutofillReceived"] = 140] = "AutofillReceived";
  Action3[Action3["AutofillReceivedAndTabAutoOpened"] = 141] = "AutofillReceivedAndTabAutoOpened";
  Action3[Action3["AnimationGroupSelected"] = 142] = "AnimationGroupSelected";
  Action3[Action3["ScrollDrivenAnimationGroupSelected"] = 143] = "ScrollDrivenAnimationGroupSelected";
  Action3[Action3["ScrollDrivenAnimationGroupScrubbed"] = 144] = "ScrollDrivenAnimationGroupScrubbed";
  Action3[Action3["AiAssistanceOpenedFromElementsPanel"] = 145] = "AiAssistanceOpenedFromElementsPanel";
  Action3[Action3["AiAssistanceOpenedFromStylesTab"] = 146] = "AiAssistanceOpenedFromStylesTab";
  Action3[Action3["ConsoleFilterByContext"] = 147] = "ConsoleFilterByContext";
  Action3[Action3["ConsoleFilterBySource"] = 148] = "ConsoleFilterBySource";
  Action3[Action3["ConsoleFilterByUrl"] = 149] = "ConsoleFilterByUrl";
  Action3[Action3["InsightConsentReminderShown"] = 150] = "InsightConsentReminderShown";
  Action3[Action3["InsightConsentReminderCanceled"] = 151] = "InsightConsentReminderCanceled";
  Action3[Action3["InsightConsentReminderConfirmed"] = 152] = "InsightConsentReminderConfirmed";
  Action3[Action3["InsightsOnboardingShown"] = 153] = "InsightsOnboardingShown";
  Action3[Action3["InsightsOnboardingCanceledOnPage1"] = 154] = "InsightsOnboardingCanceledOnPage1";
  Action3[Action3["InsightsOnboardingCanceledOnPage2"] = 155] = "InsightsOnboardingCanceledOnPage2";
  Action3[Action3["InsightsOnboardingConfirmed"] = 156] = "InsightsOnboardingConfirmed";
  Action3[Action3["InsightsOnboardingNextPage"] = 157] = "InsightsOnboardingNextPage";
  Action3[Action3["InsightsOnboardingPrevPage"] = 158] = "InsightsOnboardingPrevPage";
  Action3[Action3["InsightsOnboardingFeatureDisabled"] = 159] = "InsightsOnboardingFeatureDisabled";
  Action3[Action3["InsightsOptInTeaserShown"] = 160] = "InsightsOptInTeaserShown";
  Action3[Action3["InsightsOptInTeaserSettingsLinkClicked"] = 161] = "InsightsOptInTeaserSettingsLinkClicked";
  Action3[Action3["InsightsOptInTeaserConfirmedInSettings"] = 162] = "InsightsOptInTeaserConfirmedInSettings";
  Action3[Action3["InsightsReminderTeaserShown"] = 163] = "InsightsReminderTeaserShown";
  Action3[Action3["InsightsReminderTeaserConfirmed"] = 164] = "InsightsReminderTeaserConfirmed";
  Action3[Action3["InsightsReminderTeaserCanceled"] = 165] = "InsightsReminderTeaserCanceled";
  Action3[Action3["InsightsReminderTeaserSettingsLinkClicked"] = 166] = "InsightsReminderTeaserSettingsLinkClicked";
  Action3[Action3["InsightsReminderTeaserAbortedInSettings"] = 167] = "InsightsReminderTeaserAbortedInSettings";
  Action3[Action3["GeneratingInsightWithoutDisclaimer"] = 168] = "GeneratingInsightWithoutDisclaimer";
  Action3[Action3["AiAssistanceOpenedFromElementsPanelFloatingButton"] = 169] = "AiAssistanceOpenedFromElementsPanelFloatingButton";
  Action3[Action3["AiAssistanceOpenedFromNetworkPanel"] = 170] = "AiAssistanceOpenedFromNetworkPanel";
  Action3[Action3["AiAssistanceOpenedFromSourcesPanel"] = 171] = "AiAssistanceOpenedFromSourcesPanel";
  Action3[Action3["AiAssistanceOpenedFromSourcesPanelFloatingButton"] = 172] = "AiAssistanceOpenedFromSourcesPanelFloatingButton";
  Action3[Action3["AiAssistanceOpenedFromPerformancePanelCallTree"] = 173] = "AiAssistanceOpenedFromPerformancePanelCallTree";
  Action3[Action3["AiAssistanceOpenedFromNetworkPanelFloatingButton"] = 174] = "AiAssistanceOpenedFromNetworkPanelFloatingButton";
  Action3[Action3["AiAssistancePanelOpened"] = 175] = "AiAssistancePanelOpened";
  Action3[Action3["AiAssistanceQuerySubmitted"] = 176] = "AiAssistanceQuerySubmitted";
  Action3[Action3["AiAssistanceAnswerReceived"] = 177] = "AiAssistanceAnswerReceived";
  Action3[Action3["AiAssistanceDynamicSuggestionClicked"] = 178] = "AiAssistanceDynamicSuggestionClicked";
  Action3[Action3["AiAssistanceSideEffectConfirmed"] = 179] = "AiAssistanceSideEffectConfirmed";
  Action3[Action3["AiAssistanceSideEffectRejected"] = 180] = "AiAssistanceSideEffectRejected";
  Action3[Action3["AiAssistanceError"] = 181] = "AiAssistanceError";
  Action3[Action3["AiCodeCompletionResponseServedFromCache"] = 184] = "AiCodeCompletionResponseServedFromCache";
  Action3[Action3["AiCodeCompletionRequestTriggered"] = 185] = "AiCodeCompletionRequestTriggered";
  Action3[Action3["AiCodeCompletionSuggestionDisplayed"] = 186] = "AiCodeCompletionSuggestionDisplayed";
  Action3[Action3["AiCodeCompletionSuggestionAccepted"] = 187] = "AiCodeCompletionSuggestionAccepted";
  Action3[Action3["AiCodeCompletionError"] = 188] = "AiCodeCompletionError";
  Action3[Action3["AttributeLinkClicked"] = 189] = "AttributeLinkClicked";
  Action3[Action3["InsightRequestedViaTeaser"] = 190] = "InsightRequestedViaTeaser";
  Action3[Action3["InsightTeaserGenerationStarted"] = 191] = "InsightTeaserGenerationStarted";
  Action3[Action3["InsightTeaserGenerationCompleted"] = 192] = "InsightTeaserGenerationCompleted";
  Action3[Action3["InsightTeaserGenerationAborted"] = 193] = "InsightTeaserGenerationAborted";
  Action3[Action3["InsightTeaserGenerationErrored"] = 194] = "InsightTeaserGenerationErrored";
  Action3[Action3["AiCodeGenerationSuggestionDisplayed"] = 195] = "AiCodeGenerationSuggestionDisplayed";
  Action3[Action3["AiCodeGenerationSuggestionAccepted"] = 196] = "AiCodeGenerationSuggestionAccepted";
  Action3[Action3["InsightTeaserModelDownloadStarted"] = 197] = "InsightTeaserModelDownloadStarted";
  Action3[Action3["InsightTeaserModelDownloadCompleted"] = 198] = "InsightTeaserModelDownloadCompleted";
  Action3[Action3["AiCodeGenerationError"] = 199] = "AiCodeGenerationError";
  Action3[Action3["AiCodeGenerationRequestTriggered"] = 200] = "AiCodeGenerationRequestTriggered";
  Action3[Action3["AiCodeCompletionRequestTriggeredFromConsole"] = 201] = "AiCodeCompletionRequestTriggeredFromConsole";
  Action3[Action3["AiCodeCompletionRequestTriggeredFromSources"] = 202] = "AiCodeCompletionRequestTriggeredFromSources";
  Action3[Action3["AiCodeCompletionRequestTriggeredFromStyles"] = 203] = "AiCodeCompletionRequestTriggeredFromStyles";
  Action3[Action3["AiCodeGenerationRequestTriggeredFromConsole"] = 204] = "AiCodeGenerationRequestTriggeredFromConsole";
  Action3[Action3["AiCodeGenerationRequestTriggeredFromSources"] = 205] = "AiCodeGenerationRequestTriggeredFromSources";
  Action3[Action3["AiCodeCompletionFreCompletedFromConsole"] = 206] = "AiCodeCompletionFreCompletedFromConsole";
  Action3[Action3["AiCodeCompletionFreCompletedFromSources"] = 207] = "AiCodeCompletionFreCompletedFromSources";
  Action3[Action3["AiAssistanceOpenedFromApplicationPanelFloatingButton"] = 208] = "AiAssistanceOpenedFromApplicationPanelFloatingButton";
  Action3[Action3["AiAssistanceOpenedFromApplicationPanel"] = 209] = "AiAssistanceOpenedFromApplicationPanel";
  Action3[Action3["MAX_VALUE"] = 210] = "MAX_VALUE";
})(Action || (Action = {}));
var PanelCodes;
(function(PanelCodes3) {
  PanelCodes3[PanelCodes3["elements"] = 1] = "elements";
  PanelCodes3[PanelCodes3["resources"] = 2] = "resources";
  PanelCodes3[PanelCodes3["network"] = 3] = "network";
  PanelCodes3[PanelCodes3["sources"] = 4] = "sources";
  PanelCodes3[PanelCodes3["timeline"] = 5] = "timeline";
  PanelCodes3[PanelCodes3["heap-profiler"] = 6] = "heap-profiler";
  PanelCodes3[PanelCodes3["console"] = 8] = "console";
  PanelCodes3[PanelCodes3["layers"] = 9] = "layers";
  PanelCodes3[PanelCodes3["console-view"] = 10] = "console-view";
  PanelCodes3[PanelCodes3["animations"] = 11] = "animations";
  PanelCodes3[PanelCodes3["network.config"] = 12] = "network.config";
  PanelCodes3[PanelCodes3["rendering"] = 13] = "rendering";
  PanelCodes3[PanelCodes3["sensors"] = 14] = "sensors";
  PanelCodes3[PanelCodes3["sources.search"] = 15] = "sources.search";
  PanelCodes3[PanelCodes3["security"] = 16] = "security";
  PanelCodes3[PanelCodes3["js-profiler"] = 17] = "js-profiler";
  PanelCodes3[PanelCodes3["lighthouse"] = 18] = "lighthouse";
  PanelCodes3[PanelCodes3["coverage"] = 19] = "coverage";
  PanelCodes3[PanelCodes3["protocol-monitor"] = 20] = "protocol-monitor";
  PanelCodes3[PanelCodes3["remote-devices"] = 21] = "remote-devices";
  PanelCodes3[PanelCodes3["web-audio"] = 22] = "web-audio";
  PanelCodes3[PanelCodes3["changes.changes"] = 23] = "changes.changes";
  PanelCodes3[PanelCodes3["performance.monitor"] = 24] = "performance.monitor";
  PanelCodes3[PanelCodes3["release-note"] = 25] = "release-note";
  PanelCodes3[PanelCodes3["sources.quick"] = 27] = "sources.quick";
  PanelCodes3[PanelCodes3["network.blocked-urls"] = 28] = "network.blocked-urls";
  PanelCodes3[PanelCodes3["settings-preferences"] = 29] = "settings-preferences";
  PanelCodes3[PanelCodes3["settings-workspace"] = 30] = "settings-workspace";
  PanelCodes3[PanelCodes3["settings-experiments"] = 31] = "settings-experiments";
  PanelCodes3[PanelCodes3["settings-blackbox"] = 32] = "settings-blackbox";
  PanelCodes3[PanelCodes3["settings-devices"] = 33] = "settings-devices";
  PanelCodes3[PanelCodes3["settings-throttling-conditions"] = 34] = "settings-throttling-conditions";
  PanelCodes3[PanelCodes3["settings-emulation-locations"] = 35] = "settings-emulation-locations";
  PanelCodes3[PanelCodes3["settings-shortcuts"] = 36] = "settings-shortcuts";
  PanelCodes3[PanelCodes3["issues-pane"] = 37] = "issues-pane";
  PanelCodes3[PanelCodes3["settings-keybinds"] = 38] = "settings-keybinds";
  PanelCodes3[PanelCodes3["cssoverview"] = 39] = "cssoverview";
  PanelCodes3[PanelCodes3["chrome-recorder"] = 40] = "chrome-recorder";
  PanelCodes3[PanelCodes3["trust-tokens"] = 41] = "trust-tokens";
  PanelCodes3[PanelCodes3["reporting-api"] = 42] = "reporting-api";
  PanelCodes3[PanelCodes3["interest-groups"] = 43] = "interest-groups";
  PanelCodes3[PanelCodes3["back-forward-cache"] = 44] = "back-forward-cache";
  PanelCodes3[PanelCodes3["service-worker-cache"] = 45] = "service-worker-cache";
  PanelCodes3[PanelCodes3["background-service-background-fetch"] = 46] = "background-service-background-fetch";
  PanelCodes3[PanelCodes3["background-service-background-sync"] = 47] = "background-service-background-sync";
  PanelCodes3[PanelCodes3["background-service-push-messaging"] = 48] = "background-service-push-messaging";
  PanelCodes3[PanelCodes3["background-service-notifications"] = 49] = "background-service-notifications";
  PanelCodes3[PanelCodes3["background-service-payment-handler"] = 50] = "background-service-payment-handler";
  PanelCodes3[PanelCodes3["background-service-periodic-background-sync"] = 51] = "background-service-periodic-background-sync";
  PanelCodes3[PanelCodes3["service-workers"] = 52] = "service-workers";
  PanelCodes3[PanelCodes3["app-manifest"] = 53] = "app-manifest";
  PanelCodes3[PanelCodes3["storage"] = 54] = "storage";
  PanelCodes3[PanelCodes3["cookies"] = 55] = "cookies";
  PanelCodes3[PanelCodes3["frame-details"] = 56] = "frame-details";
  PanelCodes3[PanelCodes3["frame-resource"] = 57] = "frame-resource";
  PanelCodes3[PanelCodes3["frame-window"] = 58] = "frame-window";
  PanelCodes3[PanelCodes3["frame-worker"] = 59] = "frame-worker";
  PanelCodes3[PanelCodes3["dom-storage"] = 60] = "dom-storage";
  PanelCodes3[PanelCodes3["indexed-db"] = 61] = "indexed-db";
  PanelCodes3[PanelCodes3["web-sql"] = 62] = "web-sql";
  PanelCodes3[PanelCodes3["performance-insights"] = 63] = "performance-insights";
  PanelCodes3[PanelCodes3["preloading"] = 64] = "preloading";
  PanelCodes3[PanelCodes3["bounce-tracking-mitigations"] = 65] = "bounce-tracking-mitigations";
  PanelCodes3[PanelCodes3["developer-resources"] = 66] = "developer-resources";
  PanelCodes3[PanelCodes3["autofill-view"] = 67] = "autofill-view";
  PanelCodes3[PanelCodes3["freestyler"] = 68] = "freestyler";
  PanelCodes3[PanelCodes3["ads"] = 69] = "ads";
  PanelCodes3[PanelCodes3["MAX_VALUE"] = 70] = "MAX_VALUE";
})(PanelCodes || (PanelCodes = {}));
var MediaTypes;
(function(MediaTypes3) {
  MediaTypes3[MediaTypes3["Unknown"] = 0] = "Unknown";
  MediaTypes3[MediaTypes3["text/css"] = 2] = "text/css";
  MediaTypes3[MediaTypes3["text/html"] = 3] = "text/html";
  MediaTypes3[MediaTypes3["application/xml"] = 4] = "application/xml";
  MediaTypes3[MediaTypes3["application/wasm"] = 5] = "application/wasm";
  MediaTypes3[MediaTypes3["application/manifest+json"] = 6] = "application/manifest+json";
  MediaTypes3[MediaTypes3["application/x-aspx"] = 7] = "application/x-aspx";
  MediaTypes3[MediaTypes3["application/jsp"] = 8] = "application/jsp";
  MediaTypes3[MediaTypes3["text/x-c++src"] = 9] = "text/x-c++src";
  MediaTypes3[MediaTypes3["text/x-coffeescript"] = 10] = "text/x-coffeescript";
  MediaTypes3[MediaTypes3["application/vnd.dart"] = 11] = "application/vnd.dart";
  MediaTypes3[MediaTypes3["text/typescript"] = 12] = "text/typescript";
  MediaTypes3[MediaTypes3["text/typescript-jsx"] = 13] = "text/typescript-jsx";
  MediaTypes3[MediaTypes3["application/json"] = 14] = "application/json";
  MediaTypes3[MediaTypes3["text/x-csharp"] = 15] = "text/x-csharp";
  MediaTypes3[MediaTypes3["text/x-java"] = 16] = "text/x-java";
  MediaTypes3[MediaTypes3["text/x-less"] = 17] = "text/x-less";
  MediaTypes3[MediaTypes3["application/x-httpd-php"] = 18] = "application/x-httpd-php";
  MediaTypes3[MediaTypes3["text/x-python"] = 19] = "text/x-python";
  MediaTypes3[MediaTypes3["text/x-sh"] = 20] = "text/x-sh";
  MediaTypes3[MediaTypes3["text/x-gss"] = 21] = "text/x-gss";
  MediaTypes3[MediaTypes3["text/x-sass"] = 22] = "text/x-sass";
  MediaTypes3[MediaTypes3["text/x-scss"] = 23] = "text/x-scss";
  MediaTypes3[MediaTypes3["text/markdown"] = 24] = "text/markdown";
  MediaTypes3[MediaTypes3["text/x-clojure"] = 25] = "text/x-clojure";
  MediaTypes3[MediaTypes3["text/jsx"] = 26] = "text/jsx";
  MediaTypes3[MediaTypes3["text/x-go"] = 27] = "text/x-go";
  MediaTypes3[MediaTypes3["text/x-kotlin"] = 28] = "text/x-kotlin";
  MediaTypes3[MediaTypes3["text/x-scala"] = 29] = "text/x-scala";
  MediaTypes3[MediaTypes3["text/x.svelte"] = 30] = "text/x.svelte";
  MediaTypes3[MediaTypes3["text/javascript+plain"] = 31] = "text/javascript+plain";
  MediaTypes3[MediaTypes3["text/javascript+minified"] = 32] = "text/javascript+minified";
  MediaTypes3[MediaTypes3["text/javascript+sourcemapped"] = 33] = "text/javascript+sourcemapped";
  MediaTypes3[MediaTypes3["text/x.angular"] = 34] = "text/x.angular";
  MediaTypes3[MediaTypes3["text/x.vue"] = 35] = "text/x.vue";
  MediaTypes3[MediaTypes3["text/javascript+snippet"] = 36] = "text/javascript+snippet";
  MediaTypes3[MediaTypes3["text/javascript+eval"] = 37] = "text/javascript+eval";
  MediaTypes3[MediaTypes3["MAX_VALUE"] = 38] = "MAX_VALUE";
})(MediaTypes || (MediaTypes = {}));
var KeybindSetSettings;
(function(KeybindSetSettings3) {
  KeybindSetSettings3[KeybindSetSettings3["devToolsDefault"] = 0] = "devToolsDefault";
  KeybindSetSettings3[KeybindSetSettings3["vsCode"] = 1] = "vsCode";
  KeybindSetSettings3[KeybindSetSettings3["MAX_VALUE"] = 2] = "MAX_VALUE";
})(KeybindSetSettings || (KeybindSetSettings = {}));
var KeyboardShortcutAction;
(function(KeyboardShortcutAction3) {
  KeyboardShortcutAction3[KeyboardShortcutAction3["OtherShortcut"] = 0] = "OtherShortcut";
  KeyboardShortcutAction3[KeyboardShortcutAction3["quick-open.show-command-menu"] = 1] = "quick-open.show-command-menu";
  KeyboardShortcutAction3[KeyboardShortcutAction3["console.clear"] = 2] = "console.clear";
  KeyboardShortcutAction3[KeyboardShortcutAction3["console.toggle"] = 3] = "console.toggle";
  KeyboardShortcutAction3[KeyboardShortcutAction3["debugger.step"] = 4] = "debugger.step";
  KeyboardShortcutAction3[KeyboardShortcutAction3["debugger.step-into"] = 5] = "debugger.step-into";
  KeyboardShortcutAction3[KeyboardShortcutAction3["debugger.step-out"] = 6] = "debugger.step-out";
  KeyboardShortcutAction3[KeyboardShortcutAction3["debugger.step-over"] = 7] = "debugger.step-over";
  KeyboardShortcutAction3[KeyboardShortcutAction3["debugger.toggle-breakpoint"] = 8] = "debugger.toggle-breakpoint";
  KeyboardShortcutAction3[KeyboardShortcutAction3["debugger.toggle-breakpoint-enabled"] = 9] = "debugger.toggle-breakpoint-enabled";
  KeyboardShortcutAction3[KeyboardShortcutAction3["debugger.toggle-pause"] = 10] = "debugger.toggle-pause";
  KeyboardShortcutAction3[KeyboardShortcutAction3["elements.edit-as-html"] = 11] = "elements.edit-as-html";
  KeyboardShortcutAction3[KeyboardShortcutAction3["elements.hide-element"] = 12] = "elements.hide-element";
  KeyboardShortcutAction3[KeyboardShortcutAction3["elements.redo"] = 13] = "elements.redo";
  KeyboardShortcutAction3[KeyboardShortcutAction3["elements.toggle-element-search"] = 14] = "elements.toggle-element-search";
  KeyboardShortcutAction3[KeyboardShortcutAction3["elements.undo"] = 15] = "elements.undo";
  KeyboardShortcutAction3[KeyboardShortcutAction3["main.search-in-panel.find"] = 16] = "main.search-in-panel.find";
  KeyboardShortcutAction3[KeyboardShortcutAction3["main.toggle-drawer"] = 17] = "main.toggle-drawer";
  KeyboardShortcutAction3[KeyboardShortcutAction3["network.hide-request-details"] = 18] = "network.hide-request-details";
  KeyboardShortcutAction3[KeyboardShortcutAction3["network.search"] = 19] = "network.search";
  KeyboardShortcutAction3[KeyboardShortcutAction3["network.toggle-recording"] = 20] = "network.toggle-recording";
  KeyboardShortcutAction3[KeyboardShortcutAction3["quick-open.show"] = 21] = "quick-open.show";
  KeyboardShortcutAction3[KeyboardShortcutAction3["settings.show"] = 22] = "settings.show";
  KeyboardShortcutAction3[KeyboardShortcutAction3["sources.search"] = 23] = "sources.search";
  KeyboardShortcutAction3[KeyboardShortcutAction3["background-service.toggle-recording"] = 24] = "background-service.toggle-recording";
  KeyboardShortcutAction3[KeyboardShortcutAction3["components.collect-garbage"] = 25] = "components.collect-garbage";
  KeyboardShortcutAction3[KeyboardShortcutAction3["console.clear.history"] = 26] = "console.clear.history";
  KeyboardShortcutAction3[KeyboardShortcutAction3["console.create-pin"] = 27] = "console.create-pin";
  KeyboardShortcutAction3[KeyboardShortcutAction3["coverage.start-with-reload"] = 28] = "coverage.start-with-reload";
  KeyboardShortcutAction3[KeyboardShortcutAction3["coverage.toggle-recording"] = 29] = "coverage.toggle-recording";
  KeyboardShortcutAction3[KeyboardShortcutAction3["debugger.breakpoint-input-window"] = 30] = "debugger.breakpoint-input-window";
  KeyboardShortcutAction3[KeyboardShortcutAction3["debugger.evaluate-selection"] = 31] = "debugger.evaluate-selection";
  KeyboardShortcutAction3[KeyboardShortcutAction3["debugger.next-call-frame"] = 32] = "debugger.next-call-frame";
  KeyboardShortcutAction3[KeyboardShortcutAction3["debugger.previous-call-frame"] = 33] = "debugger.previous-call-frame";
  KeyboardShortcutAction3[KeyboardShortcutAction3["debugger.run-snippet"] = 34] = "debugger.run-snippet";
  KeyboardShortcutAction3[KeyboardShortcutAction3["debugger.toggle-breakpoints-active"] = 35] = "debugger.toggle-breakpoints-active";
  KeyboardShortcutAction3[KeyboardShortcutAction3["elements.capture-area-screenshot"] = 36] = "elements.capture-area-screenshot";
  KeyboardShortcutAction3[KeyboardShortcutAction3["emulation.capture-full-height-screenshot"] = 37] = "emulation.capture-full-height-screenshot";
  KeyboardShortcutAction3[KeyboardShortcutAction3["emulation.capture-node-screenshot"] = 38] = "emulation.capture-node-screenshot";
  KeyboardShortcutAction3[KeyboardShortcutAction3["emulation.capture-screenshot"] = 39] = "emulation.capture-screenshot";
  KeyboardShortcutAction3[KeyboardShortcutAction3["emulation.show-sensors"] = 40] = "emulation.show-sensors";
  KeyboardShortcutAction3[KeyboardShortcutAction3["emulation.toggle-device-mode"] = 41] = "emulation.toggle-device-mode";
  KeyboardShortcutAction3[KeyboardShortcutAction3["help.release-notes"] = 42] = "help.release-notes";
  KeyboardShortcutAction3[KeyboardShortcutAction3["help.report-issue"] = 43] = "help.report-issue";
  KeyboardShortcutAction3[KeyboardShortcutAction3["input.start-replaying"] = 44] = "input.start-replaying";
  KeyboardShortcutAction3[KeyboardShortcutAction3["input.toggle-pause"] = 45] = "input.toggle-pause";
  KeyboardShortcutAction3[KeyboardShortcutAction3["input.toggle-recording"] = 46] = "input.toggle-recording";
  KeyboardShortcutAction3[KeyboardShortcutAction3["inspector-main.focus-debuggee"] = 47] = "inspector-main.focus-debuggee";
  KeyboardShortcutAction3[KeyboardShortcutAction3["inspector-main.hard-reload"] = 48] = "inspector-main.hard-reload";
  KeyboardShortcutAction3[KeyboardShortcutAction3["inspector-main.reload"] = 49] = "inspector-main.reload";
  KeyboardShortcutAction3[KeyboardShortcutAction3["main.debug-reload"] = 52] = "main.debug-reload";
  KeyboardShortcutAction3[KeyboardShortcutAction3["main.next-tab"] = 53] = "main.next-tab";
  KeyboardShortcutAction3[KeyboardShortcutAction3["main.previous-tab"] = 54] = "main.previous-tab";
  KeyboardShortcutAction3[KeyboardShortcutAction3["main.search-in-panel.cancel"] = 55] = "main.search-in-panel.cancel";
  KeyboardShortcutAction3[KeyboardShortcutAction3["main.search-in-panel.find-next"] = 56] = "main.search-in-panel.find-next";
  KeyboardShortcutAction3[KeyboardShortcutAction3["main.search-in-panel.find-previous"] = 57] = "main.search-in-panel.find-previous";
  KeyboardShortcutAction3[KeyboardShortcutAction3["main.toggle-dock"] = 58] = "main.toggle-dock";
  KeyboardShortcutAction3[KeyboardShortcutAction3["main.zoom-in"] = 59] = "main.zoom-in";
  KeyboardShortcutAction3[KeyboardShortcutAction3["main.zoom-out"] = 60] = "main.zoom-out";
  KeyboardShortcutAction3[KeyboardShortcutAction3["main.zoom-reset"] = 61] = "main.zoom-reset";
  KeyboardShortcutAction3[KeyboardShortcutAction3["network-conditions.network-low-end-mobile"] = 62] = "network-conditions.network-low-end-mobile";
  KeyboardShortcutAction3[KeyboardShortcutAction3["network-conditions.network-mid-tier-mobile"] = 63] = "network-conditions.network-mid-tier-mobile";
  KeyboardShortcutAction3[KeyboardShortcutAction3["network-conditions.network-offline"] = 64] = "network-conditions.network-offline";
  KeyboardShortcutAction3[KeyboardShortcutAction3["network-conditions.network-online"] = 65] = "network-conditions.network-online";
  KeyboardShortcutAction3[KeyboardShortcutAction3["profiler.heap-toggle-recording"] = 66] = "profiler.heap-toggle-recording";
  KeyboardShortcutAction3[KeyboardShortcutAction3["profiler.js-toggle-recording"] = 67] = "profiler.js-toggle-recording";
  KeyboardShortcutAction3[KeyboardShortcutAction3["resources.clear"] = 68] = "resources.clear";
  KeyboardShortcutAction3[KeyboardShortcutAction3["settings.documentation"] = 69] = "settings.documentation";
  KeyboardShortcutAction3[KeyboardShortcutAction3["settings.shortcuts"] = 70] = "settings.shortcuts";
  KeyboardShortcutAction3[KeyboardShortcutAction3["sources.add-folder-to-workspace"] = 71] = "sources.add-folder-to-workspace";
  KeyboardShortcutAction3[KeyboardShortcutAction3["sources.add-to-watch"] = 72] = "sources.add-to-watch";
  KeyboardShortcutAction3[KeyboardShortcutAction3["sources.close-all"] = 73] = "sources.close-all";
  KeyboardShortcutAction3[KeyboardShortcutAction3["sources.close-editor-tab"] = 74] = "sources.close-editor-tab";
  KeyboardShortcutAction3[KeyboardShortcutAction3["sources.create-snippet"] = 75] = "sources.create-snippet";
  KeyboardShortcutAction3[KeyboardShortcutAction3["sources.go-to-line"] = 76] = "sources.go-to-line";
  KeyboardShortcutAction3[KeyboardShortcutAction3["sources.go-to-member"] = 77] = "sources.go-to-member";
  KeyboardShortcutAction3[KeyboardShortcutAction3["sources.jump-to-next-location"] = 78] = "sources.jump-to-next-location";
  KeyboardShortcutAction3[KeyboardShortcutAction3["sources.jump-to-previous-location"] = 79] = "sources.jump-to-previous-location";
  KeyboardShortcutAction3[KeyboardShortcutAction3["sources.rename"] = 80] = "sources.rename";
  KeyboardShortcutAction3[KeyboardShortcutAction3["sources.save"] = 81] = "sources.save";
  KeyboardShortcutAction3[KeyboardShortcutAction3["sources.save-all"] = 82] = "sources.save-all";
  KeyboardShortcutAction3[KeyboardShortcutAction3["sources.switch-file"] = 83] = "sources.switch-file";
  KeyboardShortcutAction3[KeyboardShortcutAction3["timeline.jump-to-next-frame"] = 84] = "timeline.jump-to-next-frame";
  KeyboardShortcutAction3[KeyboardShortcutAction3["timeline.jump-to-previous-frame"] = 85] = "timeline.jump-to-previous-frame";
  KeyboardShortcutAction3[KeyboardShortcutAction3["timeline.load-from-file"] = 86] = "timeline.load-from-file";
  KeyboardShortcutAction3[KeyboardShortcutAction3["timeline.next-recording"] = 87] = "timeline.next-recording";
  KeyboardShortcutAction3[KeyboardShortcutAction3["timeline.previous-recording"] = 88] = "timeline.previous-recording";
  KeyboardShortcutAction3[KeyboardShortcutAction3["timeline.record-reload"] = 89] = "timeline.record-reload";
  KeyboardShortcutAction3[KeyboardShortcutAction3["timeline.save-to-file"] = 90] = "timeline.save-to-file";
  KeyboardShortcutAction3[KeyboardShortcutAction3["timeline.show-history"] = 91] = "timeline.show-history";
  KeyboardShortcutAction3[KeyboardShortcutAction3["timeline.toggle-recording"] = 92] = "timeline.toggle-recording";
  KeyboardShortcutAction3[KeyboardShortcutAction3["sources.increment-css"] = 93] = "sources.increment-css";
  KeyboardShortcutAction3[KeyboardShortcutAction3["sources.increment-css-by-ten"] = 94] = "sources.increment-css-by-ten";
  KeyboardShortcutAction3[KeyboardShortcutAction3["sources.decrement-css"] = 95] = "sources.decrement-css";
  KeyboardShortcutAction3[KeyboardShortcutAction3["sources.decrement-css-by-ten"] = 96] = "sources.decrement-css-by-ten";
  KeyboardShortcutAction3[KeyboardShortcutAction3["layers.reset-view"] = 97] = "layers.reset-view";
  KeyboardShortcutAction3[KeyboardShortcutAction3["layers.pan-mode"] = 98] = "layers.pan-mode";
  KeyboardShortcutAction3[KeyboardShortcutAction3["layers.rotate-mode"] = 99] = "layers.rotate-mode";
  KeyboardShortcutAction3[KeyboardShortcutAction3["layers.zoom-in"] = 100] = "layers.zoom-in";
  KeyboardShortcutAction3[KeyboardShortcutAction3["layers.zoom-out"] = 101] = "layers.zoom-out";
  KeyboardShortcutAction3[KeyboardShortcutAction3["layers.up"] = 102] = "layers.up";
  KeyboardShortcutAction3[KeyboardShortcutAction3["layers.down"] = 103] = "layers.down";
  KeyboardShortcutAction3[KeyboardShortcutAction3["layers.left"] = 104] = "layers.left";
  KeyboardShortcutAction3[KeyboardShortcutAction3["layers.right"] = 105] = "layers.right";
  KeyboardShortcutAction3[KeyboardShortcutAction3["help.report-translation-issue"] = 106] = "help.report-translation-issue";
  KeyboardShortcutAction3[KeyboardShortcutAction3["rendering.toggle-prefers-color-scheme"] = 107] = "rendering.toggle-prefers-color-scheme";
  KeyboardShortcutAction3[KeyboardShortcutAction3["chrome-recorder.start-recording"] = 108] = "chrome-recorder.start-recording";
  KeyboardShortcutAction3[KeyboardShortcutAction3["chrome-recorder.replay-recording"] = 109] = "chrome-recorder.replay-recording";
  KeyboardShortcutAction3[KeyboardShortcutAction3["chrome-recorder.toggle-code-view"] = 110] = "chrome-recorder.toggle-code-view";
  KeyboardShortcutAction3[KeyboardShortcutAction3["chrome-recorder.copy-recording-or-step"] = 111] = "chrome-recorder.copy-recording-or-step";
  KeyboardShortcutAction3[KeyboardShortcutAction3["elements.new-style-rule"] = 114] = "elements.new-style-rule";
  KeyboardShortcutAction3[KeyboardShortcutAction3["elements.refresh-event-listeners"] = 115] = "elements.refresh-event-listeners";
  KeyboardShortcutAction3[KeyboardShortcutAction3["coverage.clear"] = 116] = "coverage.clear";
  KeyboardShortcutAction3[KeyboardShortcutAction3["coverage.export"] = 117] = "coverage.export";
  KeyboardShortcutAction3[KeyboardShortcutAction3["timeline.dim-third-parties"] = 118] = "timeline.dim-third-parties";
  KeyboardShortcutAction3[KeyboardShortcutAction3["main.toggle-drawer-orientation"] = 119] = "main.toggle-drawer-orientation";
  KeyboardShortcutAction3[KeyboardShortcutAction3["MAX_VALUE"] = 120] = "MAX_VALUE";
})(KeyboardShortcutAction || (KeyboardShortcutAction = {}));
var IssueOpener;
(function(IssueOpener3) {
  IssueOpener3[IssueOpener3["CONSOLE_INFO_BAR"] = 0] = "CONSOLE_INFO_BAR";
  IssueOpener3[IssueOpener3["LEARN_MORE_LINK_COEP"] = 1] = "LEARN_MORE_LINK_COEP";
  IssueOpener3[IssueOpener3["STATUS_BAR_ISSUES_COUNTER"] = 2] = "STATUS_BAR_ISSUES_COUNTER";
  IssueOpener3[IssueOpener3["HAMBURGER_MENU"] = 3] = "HAMBURGER_MENU";
  IssueOpener3[IssueOpener3["ADORNER"] = 4] = "ADORNER";
  IssueOpener3[IssueOpener3["COMMAND_MENU"] = 5] = "COMMAND_MENU";
  IssueOpener3[IssueOpener3["MORE_TOOLS_MENU"] = 6] = "MORE_TOOLS_MENU";
  IssueOpener3[IssueOpener3["MAX_VALUE"] = 7] = "MAX_VALUE";
})(IssueOpener || (IssueOpener = {}));
var DevtoolsExperiments;
(function(DevtoolsExperiments3) {
  DevtoolsExperiments3[DevtoolsExperiments3["protocol-monitor"] = 13] = "protocol-monitor";
  DevtoolsExperiments3[DevtoolsExperiments3["instrumentation-breakpoints"] = 61] = "instrumentation-breakpoints";
  DevtoolsExperiments3[DevtoolsExperiments3["durable-messages"] = 110] = "durable-messages";
  DevtoolsExperiments3[DevtoolsExperiments3["jpeg-xl"] = 111] = "jpeg-xl";
  DevtoolsExperiments3[DevtoolsExperiments3["plus-button"] = 112] = "plus-button";
  DevtoolsExperiments3[DevtoolsExperiments3["MAX_VALUE"] = 113] = "MAX_VALUE";
})(DevtoolsExperiments || (DevtoolsExperiments = {}));
var IssueExpanded;
(function(IssueExpanded3) {
  IssueExpanded3[IssueExpanded3["CrossOriginEmbedderPolicy"] = 0] = "CrossOriginEmbedderPolicy";
  IssueExpanded3[IssueExpanded3["MixedContent"] = 1] = "MixedContent";
  IssueExpanded3[IssueExpanded3["SameSiteCookie"] = 2] = "SameSiteCookie";
  IssueExpanded3[IssueExpanded3["HeavyAd"] = 3] = "HeavyAd";
  IssueExpanded3[IssueExpanded3["ContentSecurityPolicy"] = 4] = "ContentSecurityPolicy";
  IssueExpanded3[IssueExpanded3["Other"] = 5] = "Other";
  IssueExpanded3[IssueExpanded3["Generic"] = 6] = "Generic";
  IssueExpanded3[IssueExpanded3["ThirdPartyPhaseoutCookie"] = 7] = "ThirdPartyPhaseoutCookie";
  IssueExpanded3[IssueExpanded3["GenericCookie"] = 8] = "GenericCookie";
  IssueExpanded3[IssueExpanded3["MAX_VALUE"] = 9] = "MAX_VALUE";
})(IssueExpanded || (IssueExpanded = {}));
var IssueResourceOpened;
(function(IssueResourceOpened3) {
  IssueResourceOpened3[IssueResourceOpened3["CrossOriginEmbedderPolicyRequest"] = 0] = "CrossOriginEmbedderPolicyRequest";
  IssueResourceOpened3[IssueResourceOpened3["CrossOriginEmbedderPolicyElement"] = 1] = "CrossOriginEmbedderPolicyElement";
  IssueResourceOpened3[IssueResourceOpened3["MixedContentRequest"] = 2] = "MixedContentRequest";
  IssueResourceOpened3[IssueResourceOpened3["SameSiteCookieCookie"] = 3] = "SameSiteCookieCookie";
  IssueResourceOpened3[IssueResourceOpened3["SameSiteCookieRequest"] = 4] = "SameSiteCookieRequest";
  IssueResourceOpened3[IssueResourceOpened3["HeavyAdElement"] = 5] = "HeavyAdElement";
  IssueResourceOpened3[IssueResourceOpened3["ContentSecurityPolicyDirective"] = 6] = "ContentSecurityPolicyDirective";
  IssueResourceOpened3[IssueResourceOpened3["ContentSecurityPolicyElement"] = 7] = "ContentSecurityPolicyElement";
  IssueResourceOpened3[IssueResourceOpened3["MAX_VALUE"] = 13] = "MAX_VALUE";
})(IssueResourceOpened || (IssueResourceOpened = {}));
var IssueCreated;
(function(IssueCreated3) {
  IssueCreated3[IssueCreated3["MixedContentIssue"] = 0] = "MixedContentIssue";
  IssueCreated3[IssueCreated3["ContentSecurityPolicyIssue::kInlineViolation"] = 1] = "ContentSecurityPolicyIssue::kInlineViolation";
  IssueCreated3[IssueCreated3["ContentSecurityPolicyIssue::kEvalViolation"] = 2] = "ContentSecurityPolicyIssue::kEvalViolation";
  IssueCreated3[IssueCreated3["ContentSecurityPolicyIssue::kURLViolation"] = 3] = "ContentSecurityPolicyIssue::kURLViolation";
  IssueCreated3[IssueCreated3["ContentSecurityPolicyIssue::kTrustedTypesSinkViolation"] = 4] = "ContentSecurityPolicyIssue::kTrustedTypesSinkViolation";
  IssueCreated3[IssueCreated3["ContentSecurityPolicyIssue::kTrustedTypesPolicyViolation"] = 5] = "ContentSecurityPolicyIssue::kTrustedTypesPolicyViolation";
  IssueCreated3[IssueCreated3["HeavyAdIssue::NetworkTotalLimit"] = 6] = "HeavyAdIssue::NetworkTotalLimit";
  IssueCreated3[IssueCreated3["HeavyAdIssue::CpuTotalLimit"] = 7] = "HeavyAdIssue::CpuTotalLimit";
  IssueCreated3[IssueCreated3["HeavyAdIssue::CpuPeakLimit"] = 8] = "HeavyAdIssue::CpuPeakLimit";
  IssueCreated3[IssueCreated3["CrossOriginEmbedderPolicyIssue::CoepFrameResourceNeedsCoepHeader"] = 9] = "CrossOriginEmbedderPolicyIssue::CoepFrameResourceNeedsCoepHeader";
  IssueCreated3[IssueCreated3["CrossOriginEmbedderPolicyIssue::CoopSandboxedIFrameCannotNavigateToCoopPage"] = 10] = "CrossOriginEmbedderPolicyIssue::CoopSandboxedIFrameCannotNavigateToCoopPage";
  IssueCreated3[IssueCreated3["CrossOriginEmbedderPolicyIssue::CorpNotSameOrigin"] = 11] = "CrossOriginEmbedderPolicyIssue::CorpNotSameOrigin";
  IssueCreated3[IssueCreated3["CrossOriginEmbedderPolicyIssue::CorpNotSameOriginAfterDefaultedToSameOriginByCoep"] = 12] = "CrossOriginEmbedderPolicyIssue::CorpNotSameOriginAfterDefaultedToSameOriginByCoep";
  IssueCreated3[IssueCreated3["CrossOriginEmbedderPolicyIssue::CorpNotSameSite"] = 13] = "CrossOriginEmbedderPolicyIssue::CorpNotSameSite";
  IssueCreated3[IssueCreated3["CookieIssue::ExcludeSameSiteNoneInsecure::ReadCookie"] = 14] = "CookieIssue::ExcludeSameSiteNoneInsecure::ReadCookie";
  IssueCreated3[IssueCreated3["CookieIssue::ExcludeSameSiteNoneInsecure::SetCookie"] = 15] = "CookieIssue::ExcludeSameSiteNoneInsecure::SetCookie";
  IssueCreated3[IssueCreated3["CookieIssue::WarnSameSiteNoneInsecure::ReadCookie"] = 16] = "CookieIssue::WarnSameSiteNoneInsecure::ReadCookie";
  IssueCreated3[IssueCreated3["CookieIssue::WarnSameSiteNoneInsecure::SetCookie"] = 17] = "CookieIssue::WarnSameSiteNoneInsecure::SetCookie";
  IssueCreated3[IssueCreated3["CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::ReadCookie"] = 30] = "CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::ReadCookie";
  IssueCreated3[IssueCreated3["CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::SetCookie"] = 31] = "CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::SetCookie";
  IssueCreated3[IssueCreated3["CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::ReadCookie"] = 32] = "CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::ReadCookie";
  IssueCreated3[IssueCreated3["CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::SetCookie"] = 33] = "CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::SetCookie";
  IssueCreated3[IssueCreated3["CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::ReadCookie"] = 34] = "CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::ReadCookie";
  IssueCreated3[IssueCreated3["CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::SetCookie"] = 35] = "CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::SetCookie";
  IssueCreated3[IssueCreated3["SharedArrayBufferIssue::TransferIssue"] = 36] = "SharedArrayBufferIssue::TransferIssue";
  IssueCreated3[IssueCreated3["SharedArrayBufferIssue::CreationIssue"] = 37] = "SharedArrayBufferIssue::CreationIssue";
  IssueCreated3[IssueCreated3["CorsIssue::InsecureLocalNetwork"] = 42] = "CorsIssue::InsecureLocalNetwork";
  IssueCreated3[IssueCreated3["CorsIssue::InvalidHeaders"] = 44] = "CorsIssue::InvalidHeaders";
  IssueCreated3[IssueCreated3["CorsIssue::WildcardOriginWithCredentials"] = 45] = "CorsIssue::WildcardOriginWithCredentials";
  IssueCreated3[IssueCreated3["CorsIssue::PreflightResponseInvalid"] = 46] = "CorsIssue::PreflightResponseInvalid";
  IssueCreated3[IssueCreated3["CorsIssue::OriginMismatch"] = 47] = "CorsIssue::OriginMismatch";
  IssueCreated3[IssueCreated3["CorsIssue::AllowCredentialsRequired"] = 48] = "CorsIssue::AllowCredentialsRequired";
  IssueCreated3[IssueCreated3["CorsIssue::MethodDisallowedByPreflightResponse"] = 49] = "CorsIssue::MethodDisallowedByPreflightResponse";
  IssueCreated3[IssueCreated3["CorsIssue::HeaderDisallowedByPreflightResponse"] = 50] = "CorsIssue::HeaderDisallowedByPreflightResponse";
  IssueCreated3[IssueCreated3["CorsIssue::RedirectContainsCredentials"] = 51] = "CorsIssue::RedirectContainsCredentials";
  IssueCreated3[IssueCreated3["CorsIssue::DisallowedByMode"] = 52] = "CorsIssue::DisallowedByMode";
  IssueCreated3[IssueCreated3["CorsIssue::CorsDisabledScheme"] = 53] = "CorsIssue::CorsDisabledScheme";
  IssueCreated3[IssueCreated3["CorsIssue::PreflightMissingAllowExternal"] = 54] = "CorsIssue::PreflightMissingAllowExternal";
  IssueCreated3[IssueCreated3["CorsIssue::PreflightInvalidAllowExternal"] = 55] = "CorsIssue::PreflightInvalidAllowExternal";
  IssueCreated3[IssueCreated3["CorsIssue::NoCorsRedirectModeNotFollow"] = 57] = "CorsIssue::NoCorsRedirectModeNotFollow";
  IssueCreated3[IssueCreated3["QuirksModeIssue::QuirksMode"] = 58] = "QuirksModeIssue::QuirksMode";
  IssueCreated3[IssueCreated3["QuirksModeIssue::LimitedQuirksMode"] = 59] = "QuirksModeIssue::LimitedQuirksMode";
  IssueCreated3[IssueCreated3["DeprecationIssue"] = 60] = "DeprecationIssue";
  IssueCreated3[IssueCreated3["ClientHintIssue::MetaTagAllowListInvalidOrigin"] = 61] = "ClientHintIssue::MetaTagAllowListInvalidOrigin";
  IssueCreated3[IssueCreated3["ClientHintIssue::MetaTagModifiedHTML"] = 62] = "ClientHintIssue::MetaTagModifiedHTML";
  IssueCreated3[IssueCreated3["GenericIssue::CrossOriginPortalPostMessageError"] = 64] = "GenericIssue::CrossOriginPortalPostMessageError";
  IssueCreated3[IssueCreated3["GenericIssue::FormLabelForNameError"] = 65] = "GenericIssue::FormLabelForNameError";
  IssueCreated3[IssueCreated3["GenericIssue::FormDuplicateIdForInputError"] = 66] = "GenericIssue::FormDuplicateIdForInputError";
  IssueCreated3[IssueCreated3["GenericIssue::FormInputWithNoLabelError"] = 67] = "GenericIssue::FormInputWithNoLabelError";
  IssueCreated3[IssueCreated3["GenericIssue::FormAutocompleteAttributeEmptyError"] = 68] = "GenericIssue::FormAutocompleteAttributeEmptyError";
  IssueCreated3[IssueCreated3["GenericIssue::FormEmptyIdAndNameAttributesForInputError"] = 69] = "GenericIssue::FormEmptyIdAndNameAttributesForInputError";
  IssueCreated3[IssueCreated3["GenericIssue::FormAriaLabelledByToNonExistingIdError"] = 70] = "GenericIssue::FormAriaLabelledByToNonExistingIdError";
  IssueCreated3[IssueCreated3["GenericIssue::FormInputAssignedAutocompleteValueToIdOrNameAttributeError"] = 71] = "GenericIssue::FormInputAssignedAutocompleteValueToIdOrNameAttributeError";
  IssueCreated3[IssueCreated3["GenericIssue::FormLabelHasNeitherForNorNestedInputError"] = 72] = "GenericIssue::FormLabelHasNeitherForNorNestedInputError";
  IssueCreated3[IssueCreated3["GenericIssue::FormLabelForMatchesNonExistingIdError"] = 73] = "GenericIssue::FormLabelForMatchesNonExistingIdError";
  IssueCreated3[IssueCreated3["GenericIssue::FormHasPasswordFieldWithoutUsernameFieldError"] = 74] = "GenericIssue::FormHasPasswordFieldWithoutUsernameFieldError";
  IssueCreated3[IssueCreated3["GenericIssue::FormInputHasWrongButWellIntendedAutocompleteValueError"] = 75] = "GenericIssue::FormInputHasWrongButWellIntendedAutocompleteValueError";
  IssueCreated3[IssueCreated3["StylesheetLoadingIssue::LateImportRule"] = 76] = "StylesheetLoadingIssue::LateImportRule";
  IssueCreated3[IssueCreated3["StylesheetLoadingIssue::RequestFailed"] = 77] = "StylesheetLoadingIssue::RequestFailed";
  IssueCreated3[IssueCreated3["CookieIssue::WarnThirdPartyPhaseout::ReadCookie"] = 82] = "CookieIssue::WarnThirdPartyPhaseout::ReadCookie";
  IssueCreated3[IssueCreated3["CookieIssue::WarnThirdPartyPhaseout::SetCookie"] = 83] = "CookieIssue::WarnThirdPartyPhaseout::SetCookie";
  IssueCreated3[IssueCreated3["CookieIssue::ExcludeThirdPartyPhaseout::ReadCookie"] = 84] = "CookieIssue::ExcludeThirdPartyPhaseout::ReadCookie";
  IssueCreated3[IssueCreated3["CookieIssue::ExcludeThirdPartyPhaseout::SetCookie"] = 85] = "CookieIssue::ExcludeThirdPartyPhaseout::SetCookie";
  IssueCreated3[IssueCreated3["ElementAccessibilityIssue::DisallowedSelectChild"] = 86] = "ElementAccessibilityIssue::DisallowedSelectChild";
  IssueCreated3[IssueCreated3["ElementAccessibilityIssue::DisallowedOptGroupChild"] = 87] = "ElementAccessibilityIssue::DisallowedOptGroupChild";
  IssueCreated3[IssueCreated3["ElementAccessibilityIssue::NonPhrasingContentOptionChild"] = 88] = "ElementAccessibilityIssue::NonPhrasingContentOptionChild";
  IssueCreated3[IssueCreated3["ElementAccessibilityIssue::InteractiveContentOptionChild"] = 89] = "ElementAccessibilityIssue::InteractiveContentOptionChild";
  IssueCreated3[IssueCreated3["ElementAccessibilityIssue::InteractiveContentLegendChild"] = 90] = "ElementAccessibilityIssue::InteractiveContentLegendChild";
  IssueCreated3[IssueCreated3["SRIMessageSignatureIssue::MissingSignatureHeader"] = 91] = "SRIMessageSignatureIssue::MissingSignatureHeader";
  IssueCreated3[IssueCreated3["SRIMessageSignatureIssue::MissingSignatureInputHeader"] = 92] = "SRIMessageSignatureIssue::MissingSignatureInputHeader";
  IssueCreated3[IssueCreated3["SRIMessageSignatureIssue::InvalidSignatureHeader"] = 93] = "SRIMessageSignatureIssue::InvalidSignatureHeader";
  IssueCreated3[IssueCreated3["SRIMessageSignatureIssue::InvalidSignatureInputHeader"] = 94] = "SRIMessageSignatureIssue::InvalidSignatureInputHeader";
  IssueCreated3[IssueCreated3["SRIMessageSignatureIssue::SignatureHeaderValueIsNotByteSequence"] = 95] = "SRIMessageSignatureIssue::SignatureHeaderValueIsNotByteSequence";
  IssueCreated3[IssueCreated3["SRIMessageSignatureIssue::SignatureHeaderValueIsParameterized"] = 96] = "SRIMessageSignatureIssue::SignatureHeaderValueIsParameterized";
  IssueCreated3[IssueCreated3["SRIMessageSignatureIssue::SignatureHeaderValueIsIncorrectLength"] = 97] = "SRIMessageSignatureIssue::SignatureHeaderValueIsIncorrectLength";
  IssueCreated3[IssueCreated3["SRIMessageSignatureIssue::SignatureInputHeaderMissingLabel"] = 98] = "SRIMessageSignatureIssue::SignatureInputHeaderMissingLabel";
  IssueCreated3[IssueCreated3["SRIMessageSignatureIssue::SignatureInputHeaderValueNotInnerList"] = 99] = "SRIMessageSignatureIssue::SignatureInputHeaderValueNotInnerList";
  IssueCreated3[IssueCreated3["SRIMessageSignatureIssue::SignatureInputHeaderValueMissingComponents"] = 100] = "SRIMessageSignatureIssue::SignatureInputHeaderValueMissingComponents";
  IssueCreated3[IssueCreated3["SRIMessageSignatureIssue::SignatureInputHeaderInvalidComponentType"] = 101] = "SRIMessageSignatureIssue::SignatureInputHeaderInvalidComponentType";
  IssueCreated3[IssueCreated3["SRIMessageSignatureIssue::SignatureInputHeaderInvalidComponentName"] = 102] = "SRIMessageSignatureIssue::SignatureInputHeaderInvalidComponentName";
  IssueCreated3[IssueCreated3["SRIMessageSignatureIssue::SignatureInputHeaderInvalidHeaderComponentParameter"] = 103] = "SRIMessageSignatureIssue::SignatureInputHeaderInvalidHeaderComponentParameter";
  IssueCreated3[IssueCreated3["SRIMessageSignatureIssue::SignatureInputHeaderInvalidDerivedComponentParameter"] = 104] = "SRIMessageSignatureIssue::SignatureInputHeaderInvalidDerivedComponentParameter";
  IssueCreated3[IssueCreated3["SRIMessageSignatureIssue::SignatureInputHeaderKeyIdLength"] = 105] = "SRIMessageSignatureIssue::SignatureInputHeaderKeyIdLength";
  IssueCreated3[IssueCreated3["SRIMessageSignatureIssue::SignatureInputHeaderInvalidParameter"] = 106] = "SRIMessageSignatureIssue::SignatureInputHeaderInvalidParameter";
  IssueCreated3[IssueCreated3["SRIMessageSignatureIssue::SignatureInputHeaderMissingRequiredParameters"] = 107] = "SRIMessageSignatureIssue::SignatureInputHeaderMissingRequiredParameters";
  IssueCreated3[IssueCreated3["SRIMessageSignatureIssue::ValidationFailedSignatureExpired"] = 108] = "SRIMessageSignatureIssue::ValidationFailedSignatureExpired";
  IssueCreated3[IssueCreated3["SRIMessageSignatureIssue::ValidationFailedInvalidLength"] = 109] = "SRIMessageSignatureIssue::ValidationFailedInvalidLength";
  IssueCreated3[IssueCreated3["SRIMessageSignatureIssue::ValidationFailedSignatureMismatch"] = 110] = "SRIMessageSignatureIssue::ValidationFailedSignatureMismatch";
  IssueCreated3[IssueCreated3["CorsIssue::LocalNetworkAccessPermissionDenied"] = 111] = "CorsIssue::LocalNetworkAccessPermissionDenied";
  IssueCreated3[IssueCreated3["SRIMessageSignatureIssue::ValidationFailedIntegrityMismatch"] = 112] = "SRIMessageSignatureIssue::ValidationFailedIntegrityMismatch";
  IssueCreated3[IssueCreated3["ElementAccessibilityIssue::InteractiveContentSummaryDescendant"] = 113] = "ElementAccessibilityIssue::InteractiveContentSummaryDescendant";
  IssueCreated3[IssueCreated3["CorsIssue::InvalidLocalNetworkAccess"] = 114] = "CorsIssue::InvalidLocalNetworkAccess";
  IssueCreated3[IssueCreated3["MAX_VALUE"] = 115] = "MAX_VALUE";
})(IssueCreated || (IssueCreated = {}));
var DeveloperResourceLoaded;
(function(DeveloperResourceLoaded3) {
  DeveloperResourceLoaded3[DeveloperResourceLoaded3["LOAD_THROUGH_PAGE_VIA_TARGET"] = 0] = "LOAD_THROUGH_PAGE_VIA_TARGET";
  DeveloperResourceLoaded3[DeveloperResourceLoaded3["LOAD_THROUGH_PAGE_FAILURE"] = 2] = "LOAD_THROUGH_PAGE_FAILURE";
  DeveloperResourceLoaded3[DeveloperResourceLoaded3["LOAD_THROUGH_PAGE_FALLBACK"] = 3] = "LOAD_THROUGH_PAGE_FALLBACK";
  DeveloperResourceLoaded3[DeveloperResourceLoaded3["FALLBACK_AFTER_FAILURE"] = 4] = "FALLBACK_AFTER_FAILURE";
  DeveloperResourceLoaded3[DeveloperResourceLoaded3["FALLBACK_PER_OVERRIDE"] = 5] = "FALLBACK_PER_OVERRIDE";
  DeveloperResourceLoaded3[DeveloperResourceLoaded3["FALLBACK_PER_PROTOCOL"] = 6] = "FALLBACK_PER_PROTOCOL";
  DeveloperResourceLoaded3[DeveloperResourceLoaded3["FALLBACK_FAILURE"] = 7] = "FALLBACK_FAILURE";
  DeveloperResourceLoaded3[DeveloperResourceLoaded3["MAX_VALUE"] = 8] = "MAX_VALUE";
})(DeveloperResourceLoaded || (DeveloperResourceLoaded = {}));
var DeveloperResourceScheme;
(function(DeveloperResourceScheme3) {
  DeveloperResourceScheme3[DeveloperResourceScheme3["OTHER"] = 0] = "OTHER";
  DeveloperResourceScheme3[DeveloperResourceScheme3["UKNOWN"] = 1] = "UKNOWN";
  DeveloperResourceScheme3[DeveloperResourceScheme3["HTTP"] = 2] = "HTTP";
  DeveloperResourceScheme3[DeveloperResourceScheme3["HTTPS"] = 3] = "HTTPS";
  DeveloperResourceScheme3[DeveloperResourceScheme3["HTTP_LOCALHOST"] = 4] = "HTTP_LOCALHOST";
  DeveloperResourceScheme3[DeveloperResourceScheme3["HTTPS_LOCALHOST"] = 5] = "HTTPS_LOCALHOST";
  DeveloperResourceScheme3[DeveloperResourceScheme3["DATA"] = 6] = "DATA";
  DeveloperResourceScheme3[DeveloperResourceScheme3["FILE"] = 7] = "FILE";
  DeveloperResourceScheme3[DeveloperResourceScheme3["BLOB"] = 8] = "BLOB";
  DeveloperResourceScheme3[DeveloperResourceScheme3["MAX_VALUE"] = 9] = "MAX_VALUE";
})(DeveloperResourceScheme || (DeveloperResourceScheme = {}));
var Language2;
(function(Language4) {
  Language4[Language4["af"] = 1] = "af";
  Language4[Language4["am"] = 2] = "am";
  Language4[Language4["ar"] = 3] = "ar";
  Language4[Language4["as"] = 4] = "as";
  Language4[Language4["az"] = 5] = "az";
  Language4[Language4["be"] = 6] = "be";
  Language4[Language4["bg"] = 7] = "bg";
  Language4[Language4["bn"] = 8] = "bn";
  Language4[Language4["bs"] = 9] = "bs";
  Language4[Language4["ca"] = 10] = "ca";
  Language4[Language4["cs"] = 11] = "cs";
  Language4[Language4["cy"] = 12] = "cy";
  Language4[Language4["da"] = 13] = "da";
  Language4[Language4["de"] = 14] = "de";
  Language4[Language4["el"] = 15] = "el";
  Language4[Language4["en-GB"] = 16] = "en-GB";
  Language4[Language4["en-US"] = 17] = "en-US";
  Language4[Language4["es-419"] = 18] = "es-419";
  Language4[Language4["es"] = 19] = "es";
  Language4[Language4["et"] = 20] = "et";
  Language4[Language4["eu"] = 21] = "eu";
  Language4[Language4["fa"] = 22] = "fa";
  Language4[Language4["fi"] = 23] = "fi";
  Language4[Language4["fil"] = 24] = "fil";
  Language4[Language4["fr-CA"] = 25] = "fr-CA";
  Language4[Language4["fr"] = 26] = "fr";
  Language4[Language4["gl"] = 27] = "gl";
  Language4[Language4["gu"] = 28] = "gu";
  Language4[Language4["he"] = 29] = "he";
  Language4[Language4["hi"] = 30] = "hi";
  Language4[Language4["hr"] = 31] = "hr";
  Language4[Language4["hu"] = 32] = "hu";
  Language4[Language4["hy"] = 33] = "hy";
  Language4[Language4["id"] = 34] = "id";
  Language4[Language4["is"] = 35] = "is";
  Language4[Language4["it"] = 36] = "it";
  Language4[Language4["ja"] = 37] = "ja";
  Language4[Language4["ka"] = 38] = "ka";
  Language4[Language4["kk"] = 39] = "kk";
  Language4[Language4["km"] = 40] = "km";
  Language4[Language4["kn"] = 41] = "kn";
  Language4[Language4["ko"] = 42] = "ko";
  Language4[Language4["ky"] = 43] = "ky";
  Language4[Language4["lo"] = 44] = "lo";
  Language4[Language4["lt"] = 45] = "lt";
  Language4[Language4["lv"] = 46] = "lv";
  Language4[Language4["mk"] = 47] = "mk";
  Language4[Language4["ml"] = 48] = "ml";
  Language4[Language4["mn"] = 49] = "mn";
  Language4[Language4["mr"] = 50] = "mr";
  Language4[Language4["ms"] = 51] = "ms";
  Language4[Language4["my"] = 52] = "my";
  Language4[Language4["ne"] = 53] = "ne";
  Language4[Language4["nl"] = 54] = "nl";
  Language4[Language4["no"] = 55] = "no";
  Language4[Language4["or"] = 56] = "or";
  Language4[Language4["pa"] = 57] = "pa";
  Language4[Language4["pl"] = 58] = "pl";
  Language4[Language4["pt-PT"] = 59] = "pt-PT";
  Language4[Language4["pt"] = 60] = "pt";
  Language4[Language4["ro"] = 61] = "ro";
  Language4[Language4["ru"] = 62] = "ru";
  Language4[Language4["si"] = 63] = "si";
  Language4[Language4["sk"] = 64] = "sk";
  Language4[Language4["sl"] = 65] = "sl";
  Language4[Language4["sq"] = 66] = "sq";
  Language4[Language4["sr-Latn"] = 67] = "sr-Latn";
  Language4[Language4["sr"] = 68] = "sr";
  Language4[Language4["sv"] = 69] = "sv";
  Language4[Language4["sw"] = 70] = "sw";
  Language4[Language4["ta"] = 71] = "ta";
  Language4[Language4["te"] = 72] = "te";
  Language4[Language4["th"] = 73] = "th";
  Language4[Language4["tr"] = 74] = "tr";
  Language4[Language4["uk"] = 75] = "uk";
  Language4[Language4["ur"] = 76] = "ur";
  Language4[Language4["uz"] = 77] = "uz";
  Language4[Language4["vi"] = 78] = "vi";
  Language4[Language4["zh"] = 79] = "zh";
  Language4[Language4["zh-HK"] = 80] = "zh-HK";
  Language4[Language4["zh-TW"] = 81] = "zh-TW";
  Language4[Language4["zu"] = 82] = "zu";
  Language4[Language4["MAX_VALUE"] = 83] = "MAX_VALUE";
})(Language2 || (Language2 = {}));
var SyncSetting;
(function(SyncSetting3) {
  SyncSetting3[SyncSetting3["CHROME_SYNC_DISABLED"] = 1] = "CHROME_SYNC_DISABLED";
  SyncSetting3[SyncSetting3["CHROME_SYNC_SETTINGS_DISABLED"] = 2] = "CHROME_SYNC_SETTINGS_DISABLED";
  SyncSetting3[SyncSetting3["DEVTOOLS_SYNC_SETTING_DISABLED"] = 3] = "DEVTOOLS_SYNC_SETTING_DISABLED";
  SyncSetting3[SyncSetting3["DEVTOOLS_SYNC_SETTING_ENABLED"] = 4] = "DEVTOOLS_SYNC_SETTING_ENABLED";
  SyncSetting3[SyncSetting3["MAX_VALUE"] = 5] = "MAX_VALUE";
})(SyncSetting || (SyncSetting = {}));
var RecordingToggled;
(function(RecordingToggled3) {
  RecordingToggled3[RecordingToggled3["RECORDING_STARTED"] = 1] = "RECORDING_STARTED";
  RecordingToggled3[RecordingToggled3["RECORDING_FINISHED"] = 2] = "RECORDING_FINISHED";
  RecordingToggled3[RecordingToggled3["MAX_VALUE"] = 3] = "MAX_VALUE";
})(RecordingToggled || (RecordingToggled = {}));
var RecordingAssertion;
(function(RecordingAssertion3) {
  RecordingAssertion3[RecordingAssertion3["ASSERTION_ADDED"] = 1] = "ASSERTION_ADDED";
  RecordingAssertion3[RecordingAssertion3["PROPERTY_ASSERTION_EDITED"] = 2] = "PROPERTY_ASSERTION_EDITED";
  RecordingAssertion3[RecordingAssertion3["ATTRIBUTE_ASSERTION_EDITED"] = 3] = "ATTRIBUTE_ASSERTION_EDITED";
  RecordingAssertion3[RecordingAssertion3["MAX_VALUE"] = 4] = "MAX_VALUE";
})(RecordingAssertion || (RecordingAssertion = {}));
var RecordingReplayFinished;
(function(RecordingReplayFinished3) {
  RecordingReplayFinished3[RecordingReplayFinished3["SUCCESS"] = 1] = "SUCCESS";
  RecordingReplayFinished3[RecordingReplayFinished3["TIMEOUT_ERROR_SELECTORS"] = 2] = "TIMEOUT_ERROR_SELECTORS";
  RecordingReplayFinished3[RecordingReplayFinished3["TIMEOUT_ERROR_TARGET"] = 3] = "TIMEOUT_ERROR_TARGET";
  RecordingReplayFinished3[RecordingReplayFinished3["OTHER_ERROR"] = 4] = "OTHER_ERROR";
  RecordingReplayFinished3[RecordingReplayFinished3["MAX_VALUE"] = 5] = "MAX_VALUE";
})(RecordingReplayFinished || (RecordingReplayFinished = {}));
var RecordingReplaySpeed;
(function(RecordingReplaySpeed3) {
  RecordingReplaySpeed3[RecordingReplaySpeed3["NORMAL"] = 1] = "NORMAL";
  RecordingReplaySpeed3[RecordingReplaySpeed3["SLOW"] = 2] = "SLOW";
  RecordingReplaySpeed3[RecordingReplaySpeed3["VERY_SLOW"] = 3] = "VERY_SLOW";
  RecordingReplaySpeed3[RecordingReplaySpeed3["EXTREMELY_SLOW"] = 4] = "EXTREMELY_SLOW";
  RecordingReplaySpeed3[RecordingReplaySpeed3["MAX_VALUE"] = 5] = "MAX_VALUE";
})(RecordingReplaySpeed || (RecordingReplaySpeed = {}));
var RecordingReplayStarted;
(function(RecordingReplayStarted3) {
  RecordingReplayStarted3[RecordingReplayStarted3["REPLAY_ONLY"] = 1] = "REPLAY_ONLY";
  RecordingReplayStarted3[RecordingReplayStarted3["REPLAY_WITH_PERFORMANCE_TRACING"] = 2] = "REPLAY_WITH_PERFORMANCE_TRACING";
  RecordingReplayStarted3[RecordingReplayStarted3["REPLAY_VIA_EXTENSION"] = 3] = "REPLAY_VIA_EXTENSION";
  RecordingReplayStarted3[RecordingReplayStarted3["MAX_VALUE"] = 4] = "MAX_VALUE";
})(RecordingReplayStarted || (RecordingReplayStarted = {}));
var RecordingEdited;
(function(RecordingEdited3) {
  RecordingEdited3[RecordingEdited3["SELECTOR_PICKER_USED"] = 1] = "SELECTOR_PICKER_USED";
  RecordingEdited3[RecordingEdited3["STEP_ADDED"] = 2] = "STEP_ADDED";
  RecordingEdited3[RecordingEdited3["STEP_REMOVED"] = 3] = "STEP_REMOVED";
  RecordingEdited3[RecordingEdited3["SELECTOR_ADDED"] = 4] = "SELECTOR_ADDED";
  RecordingEdited3[RecordingEdited3["SELECTOR_REMOVED"] = 5] = "SELECTOR_REMOVED";
  RecordingEdited3[RecordingEdited3["SELECTOR_PART_ADDED"] = 6] = "SELECTOR_PART_ADDED";
  RecordingEdited3[RecordingEdited3["SELECTOR_PART_EDITED"] = 7] = "SELECTOR_PART_EDITED";
  RecordingEdited3[RecordingEdited3["SELECTOR_PART_REMOVED"] = 8] = "SELECTOR_PART_REMOVED";
  RecordingEdited3[RecordingEdited3["TYPE_CHANGED"] = 9] = "TYPE_CHANGED";
  RecordingEdited3[RecordingEdited3["OTHER_EDITING"] = 10] = "OTHER_EDITING";
  RecordingEdited3[RecordingEdited3["MAX_VALUE"] = 11] = "MAX_VALUE";
})(RecordingEdited || (RecordingEdited = {}));
var RecordingExported;
(function(RecordingExported3) {
  RecordingExported3[RecordingExported3["TO_PUPPETEER"] = 1] = "TO_PUPPETEER";
  RecordingExported3[RecordingExported3["TO_JSON"] = 2] = "TO_JSON";
  RecordingExported3[RecordingExported3["TO_PUPPETEER_REPLAY"] = 3] = "TO_PUPPETEER_REPLAY";
  RecordingExported3[RecordingExported3["TO_EXTENSION"] = 4] = "TO_EXTENSION";
  RecordingExported3[RecordingExported3["TO_LIGHTHOUSE"] = 5] = "TO_LIGHTHOUSE";
  RecordingExported3[RecordingExported3["MAX_VALUE"] = 6] = "MAX_VALUE";
})(RecordingExported || (RecordingExported = {}));
var RecordingCodeToggled;
(function(RecordingCodeToggled3) {
  RecordingCodeToggled3[RecordingCodeToggled3["CODE_SHOWN"] = 1] = "CODE_SHOWN";
  RecordingCodeToggled3[RecordingCodeToggled3["CODE_HIDDEN"] = 2] = "CODE_HIDDEN";
  RecordingCodeToggled3[RecordingCodeToggled3["MAX_VALUE"] = 3] = "MAX_VALUE";
})(RecordingCodeToggled || (RecordingCodeToggled = {}));
var RecordingCopiedToClipboard;
(function(RecordingCopiedToClipboard3) {
  RecordingCopiedToClipboard3[RecordingCopiedToClipboard3["COPIED_RECORDING_WITH_PUPPETEER"] = 1] = "COPIED_RECORDING_WITH_PUPPETEER";
  RecordingCopiedToClipboard3[RecordingCopiedToClipboard3["COPIED_RECORDING_WITH_JSON"] = 2] = "COPIED_RECORDING_WITH_JSON";
  RecordingCopiedToClipboard3[RecordingCopiedToClipboard3["COPIED_RECORDING_WITH_REPLAY"] = 3] = "COPIED_RECORDING_WITH_REPLAY";
  RecordingCopiedToClipboard3[RecordingCopiedToClipboard3["COPIED_RECORDING_WITH_EXTENSION"] = 4] = "COPIED_RECORDING_WITH_EXTENSION";
  RecordingCopiedToClipboard3[RecordingCopiedToClipboard3["COPIED_STEP_WITH_PUPPETEER"] = 5] = "COPIED_STEP_WITH_PUPPETEER";
  RecordingCopiedToClipboard3[RecordingCopiedToClipboard3["COPIED_STEP_WITH_JSON"] = 6] = "COPIED_STEP_WITH_JSON";
  RecordingCopiedToClipboard3[RecordingCopiedToClipboard3["COPIED_STEP_WITH_REPLAY"] = 7] = "COPIED_STEP_WITH_REPLAY";
  RecordingCopiedToClipboard3[RecordingCopiedToClipboard3["COPIED_STEP_WITH_EXTENSION"] = 8] = "COPIED_STEP_WITH_EXTENSION";
  RecordingCopiedToClipboard3[RecordingCopiedToClipboard3["MAX_VALUE"] = 9] = "MAX_VALUE";
})(RecordingCopiedToClipboard || (RecordingCopiedToClipboard = {}));
var ManifestSectionCodes;
(function(ManifestSectionCodes3) {
  ManifestSectionCodes3[ManifestSectionCodes3["OtherSection"] = 0] = "OtherSection";
  ManifestSectionCodes3[ManifestSectionCodes3["Identity"] = 1] = "Identity";
  ManifestSectionCodes3[ManifestSectionCodes3["Presentation"] = 2] = "Presentation";
  ManifestSectionCodes3[ManifestSectionCodes3["Protocol Handlers"] = 3] = "Protocol Handlers";
  ManifestSectionCodes3[ManifestSectionCodes3["Icons"] = 4] = "Icons";
  ManifestSectionCodes3[ManifestSectionCodes3["Window Controls Overlay"] = 5] = "Window Controls Overlay";
  ManifestSectionCodes3[ManifestSectionCodes3["MAX_VALUE"] = 6] = "MAX_VALUE";
})(ManifestSectionCodes || (ManifestSectionCodes = {}));
var LighthouseModeRun;
(function(LighthouseModeRun3) {
  LighthouseModeRun3[LighthouseModeRun3["NAVIGATION"] = 0] = "NAVIGATION";
  LighthouseModeRun3[LighthouseModeRun3["TIMESPAN"] = 1] = "TIMESPAN";
  LighthouseModeRun3[LighthouseModeRun3["SNAPSHOT"] = 2] = "SNAPSHOT";
  LighthouseModeRun3[LighthouseModeRun3["LEGACY_NAVIGATION"] = 3] = "LEGACY_NAVIGATION";
  LighthouseModeRun3[LighthouseModeRun3["MAX_VALUE"] = 4] = "MAX_VALUE";
})(LighthouseModeRun || (LighthouseModeRun = {}));
var LighthouseCategoryUsed;
(function(LighthouseCategoryUsed3) {
  LighthouseCategoryUsed3[LighthouseCategoryUsed3["PERFORMANCE"] = 0] = "PERFORMANCE";
  LighthouseCategoryUsed3[LighthouseCategoryUsed3["ACCESSIBILITY"] = 1] = "ACCESSIBILITY";
  LighthouseCategoryUsed3[LighthouseCategoryUsed3["BEST_PRACTICES"] = 2] = "BEST_PRACTICES";
  LighthouseCategoryUsed3[LighthouseCategoryUsed3["SEO"] = 3] = "SEO";
  LighthouseCategoryUsed3[LighthouseCategoryUsed3["PWA"] = 4] = "PWA";
  LighthouseCategoryUsed3[LighthouseCategoryUsed3["PUB_ADS"] = 5] = "PUB_ADS";
  LighthouseCategoryUsed3[LighthouseCategoryUsed3["AGENTIC_BROWSING"] = 6] = "AGENTIC_BROWSING";
  LighthouseCategoryUsed3[LighthouseCategoryUsed3["MAX_VALUE"] = 7] = "MAX_VALUE";
})(LighthouseCategoryUsed || (LighthouseCategoryUsed = {}));
var SwatchType;
(function(SwatchType3) {
  SwatchType3[SwatchType3["VAR_LINK"] = 0] = "VAR_LINK";
  SwatchType3[SwatchType3["ANIMATION_NAME_LINK"] = 1] = "ANIMATION_NAME_LINK";
  SwatchType3[SwatchType3["COLOR"] = 2] = "COLOR";
  SwatchType3[SwatchType3["ANIMATION_TIMING"] = 3] = "ANIMATION_TIMING";
  SwatchType3[SwatchType3["SHADOW"] = 4] = "SHADOW";
  SwatchType3[SwatchType3["GRID"] = 5] = "GRID";
  SwatchType3[SwatchType3["FLEX"] = 6] = "FLEX";
  SwatchType3[SwatchType3["ANGLE"] = 7] = "ANGLE";
  SwatchType3[SwatchType3["LENGTH"] = 8] = "LENGTH";
  SwatchType3[SwatchType3["POSITION_TRY_LINK"] = 10] = "POSITION_TRY_LINK";
  SwatchType3[SwatchType3["ATTR_LINK"] = 11] = "ATTR_LINK";
  SwatchType3[SwatchType3["GRID_LANES"] = 12] = "GRID_LANES";
  SwatchType3[SwatchType3["MAX_VALUE"] = 13] = "MAX_VALUE";
})(SwatchType || (SwatchType = {}));
var BadgeType;
(function(BadgeType3) {
  BadgeType3[BadgeType3["GRID"] = 0] = "GRID";
  BadgeType3[BadgeType3["SUBGRID"] = 1] = "SUBGRID";
  BadgeType3[BadgeType3["FLEX"] = 2] = "FLEX";
  BadgeType3[BadgeType3["AD"] = 3] = "AD";
  BadgeType3[BadgeType3["SCROLL_SNAP"] = 4] = "SCROLL_SNAP";
  BadgeType3[BadgeType3["CONTAINER"] = 5] = "CONTAINER";
  BadgeType3[BadgeType3["SLOT"] = 6] = "SLOT";
  BadgeType3[BadgeType3["TOP_LAYER"] = 7] = "TOP_LAYER";
  BadgeType3[BadgeType3["REVEAL"] = 8] = "REVEAL";
  BadgeType3[BadgeType3["MAX_VALUE"] = 9] = "MAX_VALUE";
})(BadgeType || (BadgeType = {}));
var AnimationsPlaybackRate;
(function(AnimationsPlaybackRate3) {
  AnimationsPlaybackRate3[AnimationsPlaybackRate3["PERCENT_100"] = 0] = "PERCENT_100";
  AnimationsPlaybackRate3[AnimationsPlaybackRate3["PERCENT_25"] = 1] = "PERCENT_25";
  AnimationsPlaybackRate3[AnimationsPlaybackRate3["PERCENT_10"] = 2] = "PERCENT_10";
  AnimationsPlaybackRate3[AnimationsPlaybackRate3["OTHER"] = 3] = "OTHER";
  AnimationsPlaybackRate3[AnimationsPlaybackRate3["MAX_VALUE"] = 4] = "MAX_VALUE";
})(AnimationsPlaybackRate || (AnimationsPlaybackRate = {}));
var TimelineNavigationSetting;
(function(TimelineNavigationSetting3) {
  TimelineNavigationSetting3[TimelineNavigationSetting3["CLASSIC_AT_SESSION_FIRST_TRACE"] = 0] = "CLASSIC_AT_SESSION_FIRST_TRACE";
  TimelineNavigationSetting3[TimelineNavigationSetting3["MODERN_AT_SESSION_FIRST_TRACE"] = 1] = "MODERN_AT_SESSION_FIRST_TRACE";
  TimelineNavigationSetting3[TimelineNavigationSetting3["SWITCHED_TO_CLASSIC"] = 2] = "SWITCHED_TO_CLASSIC";
  TimelineNavigationSetting3[TimelineNavigationSetting3["SWITCHED_TO_MODERN"] = 3] = "SWITCHED_TO_MODERN";
  TimelineNavigationSetting3[TimelineNavigationSetting3["MAX_VALUE"] = 4] = "MAX_VALUE";
})(TimelineNavigationSetting || (TimelineNavigationSetting = {}));
var BuiltInAiAvailability;
(function(BuiltInAiAvailability3) {
  BuiltInAiAvailability3[BuiltInAiAvailability3["UNAVAILABLE_HAS_GPU"] = 0] = "UNAVAILABLE_HAS_GPU";
  BuiltInAiAvailability3[BuiltInAiAvailability3["DOWNLOADABLE_HAS_GPU"] = 1] = "DOWNLOADABLE_HAS_GPU";
  BuiltInAiAvailability3[BuiltInAiAvailability3["DOWNLOADING_HAS_GPU"] = 2] = "DOWNLOADING_HAS_GPU";
  BuiltInAiAvailability3[BuiltInAiAvailability3["AVAILABLE_HAS_GPU"] = 3] = "AVAILABLE_HAS_GPU";
  BuiltInAiAvailability3[BuiltInAiAvailability3["DISABLED_HAS_GPU"] = 4] = "DISABLED_HAS_GPU";
  BuiltInAiAvailability3[BuiltInAiAvailability3["UNAVAILABLE_NO_GPU"] = 5] = "UNAVAILABLE_NO_GPU";
  BuiltInAiAvailability3[BuiltInAiAvailability3["DOWNLOADABLE_NO_GPU"] = 6] = "DOWNLOADABLE_NO_GPU";
  BuiltInAiAvailability3[BuiltInAiAvailability3["DOWNLOADING_NO_GPU"] = 7] = "DOWNLOADING_NO_GPU";
  BuiltInAiAvailability3[BuiltInAiAvailability3["AVAILABLE_NO_GPU"] = 8] = "AVAILABLE_NO_GPU";
  BuiltInAiAvailability3[BuiltInAiAvailability3["DISABLED_NO_GPU"] = 9] = "DISABLED_NO_GPU";
  BuiltInAiAvailability3[BuiltInAiAvailability3["MAX_VALUE"] = 10] = "MAX_VALUE";
})(BuiltInAiAvailability || (BuiltInAiAvailability = {}));
var ResendRequestType;
(function(ResendRequestType3) {
  ResendRequestType3[ResendRequestType3["XHR"] = 0] = "XHR";
  ResendRequestType3[ResendRequestType3["FETCH"] = 1] = "FETCH";
  ResendRequestType3[ResendRequestType3["SCRIPT"] = 2] = "SCRIPT";
  ResendRequestType3[ResendRequestType3["STYLESHEET"] = 3] = "STYLESHEET";
  ResendRequestType3[ResendRequestType3["IMAGE"] = 4] = "IMAGE";
  ResendRequestType3[ResendRequestType3["MEDIA"] = 5] = "MEDIA";
  ResendRequestType3[ResendRequestType3["FONT"] = 6] = "FONT";
  ResendRequestType3[ResendRequestType3["WASM"] = 7] = "WASM";
  ResendRequestType3[ResendRequestType3["MANIFEST"] = 8] = "MANIFEST";
  ResendRequestType3[ResendRequestType3["TEXT_TRACK"] = 9] = "TEXT_TRACK";
  ResendRequestType3[ResendRequestType3["SOURCE_MAP_SCRIPT"] = 10] = "SOURCE_MAP_SCRIPT";
  ResendRequestType3[ResendRequestType3["SOURCE_MAP_STYLE_SHEET"] = 11] = "SOURCE_MAP_STYLE_SHEET";
  ResendRequestType3[ResendRequestType3["DOCUMENT"] = 12] = "DOCUMENT";
  ResendRequestType3[ResendRequestType3["PREFETCH"] = 13] = "PREFETCH";
  ResendRequestType3[ResendRequestType3["PING"] = 14] = "PING";
  ResendRequestType3[ResendRequestType3["OTHER"] = 15] = "OTHER";
  ResendRequestType3[ResendRequestType3["MAX_VALUE"] = 16] = "MAX_VALUE";
})(ResendRequestType || (ResendRequestType = {}));

// gen/front_end/core/host/UserMetrics.js
var UserMetrics = class {
  sourcesPanelFileDebugged(mediaType) {
    const code = mediaType && MediaTypes2[mediaType] || MediaTypes2.Unknown;
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.SourcesPanelFileDebugged", code, MediaTypes2.MAX_VALUE);
  }
  sourcesPanelFileOpened(mediaType) {
    const code = mediaType && MediaTypes2[mediaType] || MediaTypes2.Unknown;
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.SourcesPanelFileOpened", code, MediaTypes2.MAX_VALUE);
  }
  networkPanelResponsePreviewOpened(mediaType) {
    const code = mediaType && MediaTypes2[mediaType] || MediaTypes2.Unknown;
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.NetworkPanelResponsePreviewOpened", code, MediaTypes2.MAX_VALUE);
  }
  actionTaken(action) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.ActionTaken", action, Action2.MAX_VALUE);
  }
  resendRequest(resourceType) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.ResendRequest", resourceType, ResendRequestType2.MAX_VALUE);
  }
  keybindSetSettingChanged(keybindSet) {
    const value = KeybindSetSettings2[keybindSet] || 0;
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.KeybindSetSettingChanged", value, KeybindSetSettings2.MAX_VALUE);
  }
  keyboardShortcutFired(actionId) {
    const action = KeyboardShortcutAction2[actionId] || KeyboardShortcutAction2.OtherShortcut;
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.KeyboardShortcutFired", action, KeyboardShortcutAction2.MAX_VALUE);
  }
  issuesPanelOpenedFrom(issueOpener) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.IssuesPanelOpenedFrom", issueOpener, IssueOpener2.MAX_VALUE);
  }
  issuesPanelIssueExpanded(issueExpandedCategory) {
    if (issueExpandedCategory === void 0) {
      return;
    }
    const issueExpanded = IssueExpanded2[issueExpandedCategory];
    if (issueExpanded === void 0) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.IssuesPanelIssueExpanded", issueExpanded, IssueExpanded2.MAX_VALUE);
  }
  issuesPanelResourceOpened(issueCategory, type) {
    const key = issueCategory + type;
    const value = IssueResourceOpened2[key];
    if (value === void 0) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.IssuesPanelResourceOpened", value, IssueResourceOpened2.MAX_VALUE);
  }
  issueCreated(code) {
    const issueCreated = IssueCreated2[code];
    if (issueCreated === void 0) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.IssueCreated", issueCreated, IssueCreated2.MAX_VALUE);
  }
  experimentEnabledAtLaunch(experimentId) {
    const experiment = DevtoolsExperiments2[experimentId];
    if (experiment === void 0) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.ExperimentEnabledAtLaunch", experiment, DevtoolsExperiments2.MAX_VALUE);
  }
  navigationSettingAtFirstTimelineLoad(state) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.TimelineNavigationSettingState", state, TimelineNavigationSetting2.MAX_VALUE);
  }
  experimentDisabledAtLaunch(experimentId) {
    const experiment = DevtoolsExperiments2[experimentId];
    if (experiment === void 0) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.ExperimentDisabledAtLaunch", experiment, DevtoolsExperiments2.MAX_VALUE);
  }
  experimentChanged(experimentId, isEnabled) {
    const experiment = DevtoolsExperiments2[experimentId];
    if (experiment === void 0) {
      return;
    }
    const actionName = isEnabled ? "DevTools.ExperimentEnabled" : "DevTools.ExperimentDisabled";
    InspectorFrontendHostInstance.recordEnumeratedHistogram(actionName, experiment, DevtoolsExperiments2.MAX_VALUE);
  }
  developerResourceLoaded(developerResourceLoaded) {
    if (developerResourceLoaded >= DeveloperResourceLoaded2.MAX_VALUE) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.DeveloperResourceLoaded", developerResourceLoaded, DeveloperResourceLoaded2.MAX_VALUE);
  }
  developerResourceScheme(developerResourceScheme) {
    if (developerResourceScheme >= DeveloperResourceScheme2.MAX_VALUE) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.DeveloperResourceScheme", developerResourceScheme, DeveloperResourceScheme2.MAX_VALUE);
  }
  language(language) {
    const languageCode = Language3[language];
    if (languageCode === void 0) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.Language", languageCode, Language3.MAX_VALUE);
  }
  syncSetting(devtoolsSyncSettingEnabled) {
    InspectorFrontendHostInstance.getSyncInformation((syncInfo) => {
      let settingValue = SyncSetting2.CHROME_SYNC_DISABLED;
      if (syncInfo.isSyncActive && !syncInfo.arePreferencesSynced) {
        settingValue = SyncSetting2.CHROME_SYNC_SETTINGS_DISABLED;
      } else if (syncInfo.isSyncActive && syncInfo.arePreferencesSynced) {
        settingValue = devtoolsSyncSettingEnabled ? SyncSetting2.DEVTOOLS_SYNC_SETTING_ENABLED : SyncSetting2.DEVTOOLS_SYNC_SETTING_DISABLED;
      }
      InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.SyncSetting", settingValue, SyncSetting2.MAX_VALUE);
    });
  }
  recordingToggled(value) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.RecordingToggled", value, RecordingToggled2.MAX_VALUE);
  }
  recordingReplayFinished(value) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.RecordingReplayFinished", value, RecordingReplayFinished2.MAX_VALUE);
  }
  recordingReplayStarted(value) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.RecordingReplayStarted", value, RecordingReplayStarted2.MAX_VALUE);
  }
  lighthouseModeRun(type) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.LighthouseModeRun", type, LighthouseModeRun2.MAX_VALUE);
  }
  lighthouseCategoryUsed(type) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.LighthouseCategoryUsed", type, LighthouseCategoryUsed2.MAX_VALUE);
  }
  swatchActivated(swatch) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.SwatchActivated", swatch, SwatchType2.MAX_VALUE);
  }
  workspacesPopulated(wallClockTimeInMilliseconds) {
    InspectorFrontendHostInstance.recordPerformanceHistogram("DevTools.Workspaces.PopulateWallClocktime", wallClockTimeInMilliseconds);
  }
  visualLoggingProcessingDone(timeInMilliseconds) {
    InspectorFrontendHostInstance.recordPerformanceHistogram("DevTools.VisualLogging.ProcessingTime", timeInMilliseconds);
  }
  freestylerQueryLength(numberOfCharacters) {
    InspectorFrontendHostInstance.recordCountHistogram("DevTools.Freestyler.QueryLength", numberOfCharacters, 0, 1e5, 100);
  }
  freestylerEvalResponseSize(bytes) {
    InspectorFrontendHostInstance.recordCountHistogram("DevTools.Freestyler.EvalResponseSize", bytes, 0, 1e5, 100);
  }
  builtInAiAvailability(availability) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.BuiltInAiAvailability", availability, BuiltInAiAvailability2.MAX_VALUE);
  }
  consoleInsightTeaserGenerated(timeInMilliseconds) {
    InspectorFrontendHostInstance.recordPerformanceHistogram("DevTools.Insights.TeaserGenerationTime", timeInMilliseconds);
  }
  consoleInsightTeaserGeneratedMedium(timeInMilliseconds) {
    InspectorFrontendHostInstance.recordPerformanceHistogramMedium("DevTools.Insights.TeaserGenerationTimeMedium", timeInMilliseconds);
  }
  consoleInsightTeaserFirstChunkGenerated(timeInMilliseconds) {
    InspectorFrontendHostInstance.recordPerformanceHistogram("DevTools.Insights.TeaserFirstChunkGenerationTime", timeInMilliseconds);
  }
  consoleInsightTeaserFirstChunkGeneratedMedium(timeInMilliseconds) {
    InspectorFrontendHostInstance.recordPerformanceHistogramMedium("DevTools.Insights.TeaserFirstChunkGenerationTimeMedium", timeInMilliseconds);
  }
  consoleInsightTeaserChunkToEndMedium(timeInMilliseconds) {
    InspectorFrontendHostInstance.recordPerformanceHistogramMedium("DevTools.Insights.TeaserChunkToEndMedium", timeInMilliseconds);
  }
  consoleInsightTeaserAbortedAfterFirstCharacter(timeInMilliseconds) {
    InspectorFrontendHostInstance.recordPerformanceHistogram("DevTools.Insights.TeaserAfterFirstCharacterAbortionTime", timeInMilliseconds);
  }
  consoleInsightTeaserAbortedBeforeFirstCharacter(timeInMilliseconds) {
    InspectorFrontendHostInstance.recordPerformanceHistogram("DevTools.Insights.TeaserBeforeFirstCharacterAbortionTime", timeInMilliseconds);
  }
  consoleInsightLongTeaserGenerated(timeInMilliseconds) {
    InspectorFrontendHostInstance.recordPerformanceHistogram("DevTools.Insights.LongTeaserGenerationTime", timeInMilliseconds);
  }
  consoleInsightShortTeaserGenerated(timeInMilliseconds) {
    InspectorFrontendHostInstance.recordPerformanceHistogram("DevTools.Insights.ShortTeaserGenerationTime", timeInMilliseconds);
  }
};
function createDynamicEnumProxy(enumName, fallbackEnum) {
  return new Proxy(fallbackEnum, {
    get(_target, prop) {
      if (typeof prop === "symbol") {
        return Reflect.get(fallbackEnum, prop);
      }
      const metrics = (
        // eslint-disable-next-line @typescript-eslint/naming-convention
        globalThis.DevToolsMetrics
      );
      const enumObj = metrics && metrics[enumName];
      if (enumObj && prop in enumObj) {
        return enumObj[prop];
      }
      if (typeof prop === "string" && /^\d+$/.test(prop)) {
        const value = Number(prop);
        for (const [key, val] of Object.entries(enumObj || {})) {
          if (val === value) {
            return key;
          }
        }
      }
      return Reflect.get(fallbackEnum, prop);
    },
    has(_target, prop) {
      const metrics = (
        // eslint-disable-next-line @typescript-eslint/naming-convention
        globalThis.DevToolsMetrics
      );
      const enumObj = metrics && metrics[enumName];
      if (enumObj && prop in enumObj) {
        return true;
      }
      if (typeof prop === "string" && /^\d+$/.test(prop)) {
        return Object.values(enumObj || {}).includes(Number(prop));
      }
      return Reflect.has(fallbackEnum, prop);
    },
    ownKeys(_target) {
      const metrics = (
        // eslint-disable-next-line @typescript-eslint/naming-convention
        globalThis.DevToolsMetrics
      );
      const enumObj = metrics && metrics[enumName];
      return enumObj ? Reflect.ownKeys(enumObj) : Reflect.ownKeys(fallbackEnum);
    },
    getOwnPropertyDescriptor(_target, prop) {
      const metrics = (
        // eslint-disable-next-line @typescript-eslint/naming-convention
        globalThis.DevToolsMetrics
      );
      const enumObj = metrics && metrics[enumName];
      if (!enumObj) {
        return Reflect.getOwnPropertyDescriptor(fallbackEnum, prop);
      }
      return Reflect.getOwnPropertyDescriptor(enumObj, prop);
    }
  });
}
var Action2 = createDynamicEnumProxy("Action", Action);
var PanelCodes2 = createDynamicEnumProxy("PanelCodes", PanelCodes);
var MediaTypes2 = createDynamicEnumProxy("MediaTypes", MediaTypes);
var KeybindSetSettings2 = createDynamicEnumProxy("KeybindSetSettings", KeybindSetSettings);
var KeyboardShortcutAction2 = createDynamicEnumProxy("KeyboardShortcutAction", KeyboardShortcutAction);
var IssueOpener2 = createDynamicEnumProxy("IssueOpener", IssueOpener);
var DevtoolsExperiments2 = createDynamicEnumProxy("DevtoolsExperiments", DevtoolsExperiments);
var IssueExpanded2 = createDynamicEnumProxy("IssueExpanded", IssueExpanded);
var IssueResourceOpened2 = createDynamicEnumProxy("IssueResourceOpened", IssueResourceOpened);
var IssueCreated2 = createDynamicEnumProxy("IssueCreated", IssueCreated);
var DeveloperResourceLoaded2 = createDynamicEnumProxy("DeveloperResourceLoaded", DeveloperResourceLoaded);
var DeveloperResourceScheme2 = createDynamicEnumProxy("DeveloperResourceScheme", DeveloperResourceScheme);
var Language3 = createDynamicEnumProxy("Language", Language2);
var SyncSetting2 = createDynamicEnumProxy("SyncSetting", SyncSetting);
var RecordingToggled2 = createDynamicEnumProxy("RecordingToggled", RecordingToggled);
var RecordingAssertion2 = createDynamicEnumProxy("RecordingAssertion", RecordingAssertion);
var RecordingReplayFinished2 = createDynamicEnumProxy("RecordingReplayFinished", RecordingReplayFinished);
var RecordingReplaySpeed2 = createDynamicEnumProxy("RecordingReplaySpeed", RecordingReplaySpeed);
var RecordingReplayStarted2 = createDynamicEnumProxy("RecordingReplayStarted", RecordingReplayStarted);
var RecordingEdited2 = createDynamicEnumProxy("RecordingEdited", RecordingEdited);
var RecordingExported2 = createDynamicEnumProxy("RecordingExported", RecordingExported);
var RecordingCodeToggled2 = createDynamicEnumProxy("RecordingCodeToggled", RecordingCodeToggled);
var RecordingCopiedToClipboard2 = createDynamicEnumProxy("RecordingCopiedToClipboard", RecordingCopiedToClipboard);
var ManifestSectionCodes2 = createDynamicEnumProxy("ManifestSectionCodes", ManifestSectionCodes);
var LighthouseModeRun2 = createDynamicEnumProxy("LighthouseModeRun", LighthouseModeRun);
var LighthouseCategoryUsed2 = createDynamicEnumProxy("LighthouseCategoryUsed", LighthouseCategoryUsed);
var SwatchType2 = createDynamicEnumProxy("SwatchType", SwatchType);
var BadgeType2 = createDynamicEnumProxy("BadgeType", BadgeType);
var AnimationsPlaybackRate2 = createDynamicEnumProxy("AnimationsPlaybackRate", AnimationsPlaybackRate);
var TimelineNavigationSetting2 = createDynamicEnumProxy("TimelineNavigationSetting", TimelineNavigationSetting);
var BuiltInAiAvailability2 = createDynamicEnumProxy("BuiltInAiAvailability", BuiltInAiAvailability);
var ResendRequestType2 = createDynamicEnumProxy("ResendRequestType", ResendRequestType);
var resendRequestTypeMap = /* @__PURE__ */ new Map([
  [Common5.ResourceType.resourceTypes.XHR, "XHR"],
  [Common5.ResourceType.resourceTypes.Fetch, "FETCH"],
  [Common5.ResourceType.resourceTypes.Script, "SCRIPT"],
  [Common5.ResourceType.resourceTypes.Stylesheet, "STYLESHEET"],
  [Common5.ResourceType.resourceTypes.Image, "IMAGE"],
  [Common5.ResourceType.resourceTypes.Media, "MEDIA"],
  [Common5.ResourceType.resourceTypes.Font, "FONT"],
  [Common5.ResourceType.resourceTypes.Wasm, "WASM"],
  [Common5.ResourceType.resourceTypes.Manifest, "MANIFEST"],
  [Common5.ResourceType.resourceTypes.TextTrack, "TEXT_TRACK"],
  [Common5.ResourceType.resourceTypes.SourceMapScript, "SOURCE_MAP_SCRIPT"],
  [Common5.ResourceType.resourceTypes.SourceMapStyleSheet, "SOURCE_MAP_STYLE_SHEET"],
  [Common5.ResourceType.resourceTypes.Document, "DOCUMENT"],
  [Common5.ResourceType.resourceTypes.Prefetch, "PREFETCH"],
  [Common5.ResourceType.resourceTypes.Ping, "PING"]
]);
function resendRequestType(resourceType) {
  const key = resendRequestTypeMap.get(resourceType);
  return (key ? ResendRequestType2[key] : void 0) ?? ResendRequestType2.OTHER;
}

// gen/front_end/core/host/host.prebundle.js
var userMetrics = new UserMetrics();
export {
  AidaClient_exports as AidaClient,
  AidaGcaTranslation_exports as AidaGcaTranslation,
  DispatchHttpRequestClient_exports as DispatchHttpRequestClient,
  GcaClient_exports as GcaClient,
  GcaTypes_exports as GcaTypes,
  GdpClient_exports as GdpClient,
  InspectorFrontendHost_exports as InspectorFrontendHost,
  InspectorFrontendHostAPI_exports as InspectorFrontendHostAPI,
  Platform_exports as Platform,
  ResourceLoader_exports as ResourceLoader,
  UserMetrics_exports as UserMetrics,
  userMetrics
};
//# sourceMappingURL=host.js.map
