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
(function(Language3) {
  Language3[Language3["LANGUAGE_UNSPECIFIED"] = 0] = "LANGUAGE_UNSPECIFIED";
  Language3[Language3["PYTHON"] = 1] = "PYTHON";
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
  Action: () => Action,
  AnimationsPlaybackRate: () => AnimationsPlaybackRate,
  BadgeType: () => BadgeType,
  BuiltInAiAvailability: () => BuiltInAiAvailability,
  DeveloperResourceLoaded: () => DeveloperResourceLoaded,
  DeveloperResourceScheme: () => DeveloperResourceScheme,
  DevtoolsExperiments: () => DevtoolsExperiments,
  IssueCreated: () => IssueCreated,
  IssueExpanded: () => IssueExpanded,
  IssueOpener: () => IssueOpener,
  IssueResourceOpened: () => IssueResourceOpened,
  KeybindSetSettings: () => KeybindSetSettings,
  KeyboardShortcutAction: () => KeyboardShortcutAction,
  Language: () => Language2,
  LighthouseCategoryUsed: () => LighthouseCategoryUsed,
  LighthouseModeRun: () => LighthouseModeRun,
  ManifestSectionCodes: () => ManifestSectionCodes,
  MediaTypes: () => MediaTypes,
  PanelCodes: () => PanelCodes,
  RecordingAssertion: () => RecordingAssertion,
  RecordingCodeToggled: () => RecordingCodeToggled,
  RecordingCopiedToClipboard: () => RecordingCopiedToClipboard,
  RecordingEdited: () => RecordingEdited,
  RecordingExported: () => RecordingExported,
  RecordingReplayFinished: () => RecordingReplayFinished,
  RecordingReplaySpeed: () => RecordingReplaySpeed,
  RecordingReplayStarted: () => RecordingReplayStarted,
  RecordingToggled: () => RecordingToggled,
  ResendRequestType: () => ResendRequestType,
  SwatchType: () => SwatchType,
  SyncSetting: () => SyncSetting,
  TimelineNavigationSetting: () => TimelineNavigationSetting,
  UserMetrics: () => UserMetrics,
  resendRequestType: () => resendRequestType
});
import * as Common5 from "./../common/common.js";
var UserMetrics = class {
  sourcesPanelFileDebugged(mediaType) {
    const code = mediaType && MediaTypes[mediaType] || MediaTypes.Unknown;
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.SourcesPanelFileDebugged", code, MediaTypes.MAX_VALUE);
  }
  sourcesPanelFileOpened(mediaType) {
    const code = mediaType && MediaTypes[mediaType] || MediaTypes.Unknown;
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.SourcesPanelFileOpened", code, MediaTypes.MAX_VALUE);
  }
  networkPanelResponsePreviewOpened(mediaType) {
    const code = mediaType && MediaTypes[mediaType] || MediaTypes.Unknown;
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.NetworkPanelResponsePreviewOpened", code, MediaTypes.MAX_VALUE);
  }
  actionTaken(action) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.ActionTaken", action, Action.MAX_VALUE);
  }
  resendRequest(resourceType) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.ResendRequest", resourceType, ResendRequestType.MAX_VALUE);
  }
  keybindSetSettingChanged(keybindSet) {
    const value = KeybindSetSettings[keybindSet] || 0;
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.KeybindSetSettingChanged", value, KeybindSetSettings.MAX_VALUE);
  }
  keyboardShortcutFired(actionId) {
    const action = KeyboardShortcutAction[actionId] || KeyboardShortcutAction.OtherShortcut;
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.KeyboardShortcutFired", action, KeyboardShortcutAction.MAX_VALUE);
  }
  issuesPanelOpenedFrom(issueOpener) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.IssuesPanelOpenedFrom", issueOpener, IssueOpener.MAX_VALUE);
  }
  issuesPanelIssueExpanded(issueExpandedCategory) {
    if (issueExpandedCategory === void 0) {
      return;
    }
    const issueExpanded = IssueExpanded[issueExpandedCategory];
    if (issueExpanded === void 0) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.IssuesPanelIssueExpanded", issueExpanded, IssueExpanded.MAX_VALUE);
  }
  issuesPanelResourceOpened(issueCategory, type) {
    const key = issueCategory + type;
    const value = IssueResourceOpened[key];
    if (value === void 0) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.IssuesPanelResourceOpened", value, IssueResourceOpened.MAX_VALUE);
  }
  issueCreated(code) {
    const issueCreated = IssueCreated[code];
    if (issueCreated === void 0) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.IssueCreated", issueCreated, IssueCreated.MAX_VALUE);
  }
  experimentEnabledAtLaunch(experimentId) {
    const experiment = DevtoolsExperiments[experimentId];
    if (experiment === void 0) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.ExperimentEnabledAtLaunch", experiment, DevtoolsExperiments.MAX_VALUE);
  }
  navigationSettingAtFirstTimelineLoad(state) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.TimelineNavigationSettingState", state, TimelineNavigationSetting.MAX_VALUE);
  }
  experimentDisabledAtLaunch(experimentId) {
    const experiment = DevtoolsExperiments[experimentId];
    if (experiment === void 0) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.ExperimentDisabledAtLaunch", experiment, DevtoolsExperiments.MAX_VALUE);
  }
  experimentChanged(experimentId, isEnabled) {
    const experiment = DevtoolsExperiments[experimentId];
    if (experiment === void 0) {
      return;
    }
    const actionName = isEnabled ? "DevTools.ExperimentEnabled" : "DevTools.ExperimentDisabled";
    InspectorFrontendHostInstance.recordEnumeratedHistogram(actionName, experiment, DevtoolsExperiments.MAX_VALUE);
  }
  developerResourceLoaded(developerResourceLoaded) {
    if (developerResourceLoaded >= DeveloperResourceLoaded.MAX_VALUE) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.DeveloperResourceLoaded", developerResourceLoaded, DeveloperResourceLoaded.MAX_VALUE);
  }
  developerResourceScheme(developerResourceScheme) {
    if (developerResourceScheme >= DeveloperResourceScheme.MAX_VALUE) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.DeveloperResourceScheme", developerResourceScheme, DeveloperResourceScheme.MAX_VALUE);
  }
  language(language) {
    const languageCode = Language2[language];
    if (languageCode === void 0) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.Language", languageCode, Language2.MAX_VALUE);
  }
  syncSetting(devtoolsSyncSettingEnabled) {
    InspectorFrontendHostInstance.getSyncInformation((syncInfo) => {
      let settingValue = SyncSetting.CHROME_SYNC_DISABLED;
      if (syncInfo.isSyncActive && !syncInfo.arePreferencesSynced) {
        settingValue = SyncSetting.CHROME_SYNC_SETTINGS_DISABLED;
      } else if (syncInfo.isSyncActive && syncInfo.arePreferencesSynced) {
        settingValue = devtoolsSyncSettingEnabled ? SyncSetting.DEVTOOLS_SYNC_SETTING_ENABLED : SyncSetting.DEVTOOLS_SYNC_SETTING_DISABLED;
      }
      InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.SyncSetting", settingValue, SyncSetting.MAX_VALUE);
    });
  }
  recordingToggled(value) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.RecordingToggled", value, RecordingToggled.MAX_VALUE);
  }
  recordingReplayFinished(value) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.RecordingReplayFinished", value, RecordingReplayFinished.MAX_VALUE);
  }
  recordingReplayStarted(value) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.RecordingReplayStarted", value, RecordingReplayStarted.MAX_VALUE);
  }
  lighthouseModeRun(type) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.LighthouseModeRun", type, LighthouseModeRun.MAX_VALUE);
  }
  lighthouseCategoryUsed(type) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.LighthouseCategoryUsed", type, LighthouseCategoryUsed.MAX_VALUE);
  }
  swatchActivated(swatch) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.SwatchActivated", swatch, SwatchType.MAX_VALUE);
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
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.BuiltInAiAvailability", availability, BuiltInAiAvailability.MAX_VALUE);
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
function createDynamicEnumProxy(enumName) {
  return new Proxy({}, {
    get(_target, prop) {
      if (typeof prop === "symbol") {
        return Reflect.get(_target, prop);
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
      return void 0;
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
      return false;
    },
    ownKeys(_target) {
      const metrics = (
        // eslint-disable-next-line @typescript-eslint/naming-convention
        globalThis.DevToolsMetrics
      );
      const enumObj = metrics && metrics[enumName];
      return enumObj ? Reflect.ownKeys(enumObj) : [];
    },
    getOwnPropertyDescriptor(_target, prop) {
      const metrics = (
        // eslint-disable-next-line @typescript-eslint/naming-convention
        globalThis.DevToolsMetrics
      );
      const enumObj = metrics && metrics[enumName];
      if (!enumObj) {
        return void 0;
      }
      return Reflect.getOwnPropertyDescriptor(enumObj, prop);
    }
  });
}
var Action = createDynamicEnumProxy("Action");
var PanelCodes = createDynamicEnumProxy("PanelCodes");
var MediaTypes = createDynamicEnumProxy("MediaTypes");
var KeybindSetSettings = createDynamicEnumProxy("KeybindSetSettings");
var KeyboardShortcutAction = createDynamicEnumProxy("KeyboardShortcutAction");
var IssueOpener = createDynamicEnumProxy("IssueOpener");
var DevtoolsExperiments = createDynamicEnumProxy("DevtoolsExperiments");
var IssueExpanded = createDynamicEnumProxy("IssueExpanded");
var IssueResourceOpened = createDynamicEnumProxy("IssueResourceOpened");
var IssueCreated = createDynamicEnumProxy("IssueCreated");
var DeveloperResourceLoaded = createDynamicEnumProxy("DeveloperResourceLoaded");
var DeveloperResourceScheme = createDynamicEnumProxy("DeveloperResourceScheme");
var Language2 = createDynamicEnumProxy("Language");
var SyncSetting = createDynamicEnumProxy("SyncSetting");
var RecordingToggled = createDynamicEnumProxy("RecordingToggled");
var RecordingAssertion = createDynamicEnumProxy("RecordingAssertion");
var RecordingReplayFinished = createDynamicEnumProxy("RecordingReplayFinished");
var RecordingReplaySpeed = createDynamicEnumProxy("RecordingReplaySpeed");
var RecordingReplayStarted = createDynamicEnumProxy("RecordingReplayStarted");
var RecordingEdited = createDynamicEnumProxy("RecordingEdited");
var RecordingExported = createDynamicEnumProxy("RecordingExported");
var RecordingCodeToggled = createDynamicEnumProxy("RecordingCodeToggled");
var RecordingCopiedToClipboard = createDynamicEnumProxy("RecordingCopiedToClipboard");
var ManifestSectionCodes = createDynamicEnumProxy("ManifestSectionCodes");
var LighthouseModeRun = createDynamicEnumProxy("LighthouseModeRun");
var LighthouseCategoryUsed = createDynamicEnumProxy("LighthouseCategoryUsed");
var SwatchType = createDynamicEnumProxy("SwatchType");
var BadgeType = createDynamicEnumProxy("BadgeType");
var AnimationsPlaybackRate = createDynamicEnumProxy("AnimationsPlaybackRate");
var TimelineNavigationSetting = createDynamicEnumProxy("TimelineNavigationSetting");
var BuiltInAiAvailability = createDynamicEnumProxy("BuiltInAiAvailability");
var ResendRequestType = createDynamicEnumProxy("ResendRequestType");
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
  return (key ? ResendRequestType[key] : void 0) ?? ResendRequestType.OTHER;
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
