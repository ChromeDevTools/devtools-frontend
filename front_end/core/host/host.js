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
  debugLog: () => debugLog
});
import * as Common4 from "./../common/common.js";
import * as Root3 from "./../root/root.js";

// gen/front_end/core/host/AidaClientTypes.js
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
  if (!Boolean(localStorage.getItem("debugAiServicesEnabled"))) {
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
    debugLog("Translation succeded:", JSON.stringify(request), JSON.stringify(gcaRequest));
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
        functionCalls.push({
          name: part.functionCall.name,
          args: part.functionCall.args || {}
        });
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
      inclusionReason: [AidaReasonToGcaInclusionReason[f.included_reason]]
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
    gcaRequest.labels = labels;
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
    return {
      functionCall: {
        name: part.functionCall.name,
        args: part.functionCall.args
      }
    };
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
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const metadata = {
      rpcGlobalId: response.responseId
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
      if (part.text) {
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
import * as Platform from "./../platform/platform.js";

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
   * @description Name of an error category used in error messages
   */
  systemError: "System error",
  /**
   * @description Name of an error category used in error messages
   */
  connectionError: "Connection error",
  /**
   * @description Name of an error category used in error messages
   */
  certificateError: "Certificate error",
  /**
   * @description Name of an error category used in error messages
   */
  httpError: "HTTP error",
  /**
   * @description Name of an error category used in error messages
   */
  cacheError: "Cache error",
  /**
   * @description Name of an error category used in error messages
   */
  signedExchangeError: "Signed Exchange error",
  /**
   * @description Name of an error category used in error messages
   */
  ftpError: "FTP error",
  /**
   * @description Name of an error category used in error messages
   */
  certificateManagerError: "Certificate manager error",
  /**
   * @description Name of an error category used in error messages
   */
  dnsResolverError: "DNS resolver error",
  /**
   * @description Name of an error category used in error messages
   */
  unknownError: "Unknown error",
  /**
   * @description Phrase used in error messages that carry a network error name
   * @example {404} PH1
   * @example {net::ERR_INSUFFICIENT_RESOURCES} PH2
   */
  httpErrorStatusCodeSS: "HTTP error: status code {PH1}, {PH2}",
  /**
   * @description Name of an error category used in error messages
   */
  invalidUrl: "Invalid URL",
  /**
   * @description Name of an error category used in error messages
   */
  decodingDataUrlFailed: "Decoding Data URL failed"
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
  void _boundStreams[id].close();
  delete _boundStreams[id];
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
   * @description Document title in Inspector Frontend Host of the DevTools window
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
    window.setTimeout(callback, 0);
  }
  showSurvey(_trigger, callback) {
    window.setTimeout(() => callback({ surveyShown: false }), 0);
  }
  canShowSurvey(_trigger, callback) {
    window.setTimeout(() => callback({ canShowSurvey: false }), 0);
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
        const trimmed = Platform.StringUtilities.trimURL(url);
        fileName = Platform.StringUtilities.removeURLFragment(trimmed);
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
  return Common3.Settings.Settings.hasInstance() && Common3.Settings.Settings.instance().createSetting("isUnderTest", false).get();
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
  return Boolean(localStorage.getItem("debugDispatchHttpRequestEnabled"));
}
function debugLog2(...log) {
  if (!isDebugMode()) {
    return;
  }
  console.log("debugLog", ...log);
}
function setDebugDispatchHttpRequestEnabled(enabled) {
  if (enabled) {
    localStorage.setItem("debugDispatchHttpRequestEnabled", "true");
  } else {
    localStorage.removeItem("debugDispatchHttpRequestEnabled");
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
    const aidaResult = result ? gcaResponseToAidaCompletionResponse(result) : null;
    return aidaResult;
  }
  async generateCode(request, options) {
    const gcaRequest = aidaGenerateCodeRequestToGcaRequest(request);
    const result = await this.#requestContent(gcaRequest, options);
    return result ? gcaResponseToAidaGenerateCodeResponse(result) : null;
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
      return null;
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
var AidaAbortError = class extends Error {
};
var AidaBlockError = class extends Error {
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
    if (!navigator.onLine) {
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
    if (Root3.Runtime.hostConfig.devToolsGeminiRebranding?.enabled) {
      request.metadata.disable_user_content_logging = true;
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
      if (err instanceof DispatchHttpRequestError && err.response) {
        const result = err.response;
        if (result.statusCode === 403) {
          stream.fail(new Error("Server responded: permission denied"));
          return;
        }
        if ("error" in result && result.error) {
          stream.fail(new Error(`Cannot send request: ${result.error} ${result.detail || ""}`));
          return;
        }
        if ("netErrorName" in result && result.netErrorName === "net::ERR_TIMED_OUT") {
          stream.fail(new Error("doAidaConversation timed out"));
          return;
        }
        if (result.statusCode !== 200) {
          stream.fail(new Error(`Request failed: ${JSON.stringify(result)}`));
          return;
        }
      }
      stream.fail(err);
    });
    await (yield* this.#handleResponseStream(stream));
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
      return await this.#gcaClient.completeCode(request);
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
  async generateCode(request, options) {
    if (Root3.Runtime.hostConfig.devToolsGeminiRebranding?.enabled) {
      request.metadata.disable_user_content_logging = true;
    }
    if (this.#gcaClient.enabled()) {
      return await this.#gcaClient.generateCode(request, options);
    }
    const response = await makeHttpRequest({
      service: SERVICE_NAME2,
      path: "/v1/aida:generateCode",
      method: "POST",
      body: JSON.stringify(request)
    }, options);
    return response;
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
var hostConfigTrackerInstance;
var HostConfigTracker = class _HostConfigTracker extends Common4.ObjectWrapper.ObjectWrapper {
  #pollTimer;
  #aidaAvailability;
  constructor() {
    super();
  }
  static instance() {
    if (!hostConfigTrackerInstance) {
      hostConfigTrackerInstance = new _HostConfigTracker();
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
      Object.assign(Root3.Runtime.hostConfig, config);
      this.dispatchEventToListeners(
        "aidaAvailabilityChanged"
        /* Events.AIDA_AVAILABILITY_CHANGED */
      );
    }
  }
};

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
var gdpClientInstance = null;
var GdpClient = class _GdpClient {
  #cachedProfilePromise;
  #cachedEligibilityPromise;
  constructor() {
  }
  static instance({ forceNew } = { forceNew: false }) {
    if (!gdpClientInstance || forceNew) {
      gdpClientInstance = new _GdpClient();
    }
    return gdpClientInstance;
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
  isCustomDevtoolsFrontend: () => isCustomDevtoolsFrontend,
  isMac: () => isMac,
  isWin: () => isWin,
  platform: () => platform,
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
var _isCustomDevtoolsFrontend;
function isCustomDevtoolsFrontend() {
  if (typeof _isCustomDevtoolsFrontend === "undefined") {
    _isCustomDevtoolsFrontend = window.location.toString().startsWith("devtools://devtools/custom/");
  }
  return _isCustomDevtoolsFrontend;
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

// gen/front_end/core/host/UserMetrics.js
var UserMetrics_exports = {};
__export(UserMetrics_exports, {
  Action: () => Action,
  DevtoolsExperiments: () => DevtoolsExperiments,
  IssueCreated: () => IssueCreated,
  IssueExpanded: () => IssueExpanded,
  IssueResourceOpened: () => IssueResourceOpened,
  KeybindSetSettings: () => KeybindSetSettings,
  KeyboardShortcutAction: () => KeyboardShortcutAction,
  Language: () => Language2,
  ManifestSectionCodes: () => ManifestSectionCodes,
  MediaTypes: () => MediaTypes,
  PanelCodes: () => PanelCodes,
  UserMetrics: () => UserMetrics
});
var UserMetrics = class {
  #panelChangedSinceLaunch;
  #firedLaunchHistogram;
  #launchPanelName;
  constructor() {
    this.#panelChangedSinceLaunch = false;
    this.#firedLaunchHistogram = false;
    this.#launchPanelName = "";
  }
  panelShown(panelName, isLaunching) {
    const code = PanelCodes[panelName] || 0;
    InspectorFrontendHostInstance.recordEnumeratedHistogram("DevTools.PanelShown", code, PanelCodes.MAX_VALUE);
    InspectorFrontendHostInstance.recordUserMetricsAction("DevTools_PanelShown_" + panelName);
    if (!isLaunching) {
      this.#panelChangedSinceLaunch = true;
    }
  }
  settingsPanelShown(settingsViewId) {
    this.panelShown("settings-" + settingsViewId);
  }
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
  panelLoaded(panelName, histogramName) {
    if (this.#firedLaunchHistogram || panelName !== this.#launchPanelName) {
      return;
    }
    this.#firedLaunchHistogram = true;
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        performance.mark(histogramName);
        if (this.#panelChangedSinceLaunch) {
          return;
        }
        InspectorFrontendHostInstance.recordPerformanceHistogram(histogramName, performance.now());
      }, 0);
    });
  }
  setLaunchPanel(panelName) {
    this.#launchPanelName = panelName;
  }
  performanceTraceLoad(measure) {
    InspectorFrontendHostInstance.recordPerformanceHistogram("DevTools.TraceLoad", measure.duration);
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
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      "DevTools.IssuesPanelOpenedFrom",
      issueOpener,
      6
      /* IssueOpener.MAX_VALUE */
    );
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
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      "DevTools.TimelineNavigationSettingState",
      state,
      4
      /* TimelineNavigationSetting.MAX_VALUE */
    );
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
    if (developerResourceLoaded >= 8) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      "DevTools.DeveloperResourceLoaded",
      developerResourceLoaded,
      8
      /* DeveloperResourceLoaded.MAX_VALUE */
    );
  }
  developerResourceScheme(developerResourceScheme) {
    if (developerResourceScheme >= 9) {
      return;
    }
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      "DevTools.DeveloperResourceScheme",
      developerResourceScheme,
      9
      /* DeveloperResourceScheme.MAX_VALUE */
    );
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
      let settingValue = 1;
      if (syncInfo.isSyncActive && !syncInfo.arePreferencesSynced) {
        settingValue = 2;
      } else if (syncInfo.isSyncActive && syncInfo.arePreferencesSynced) {
        settingValue = devtoolsSyncSettingEnabled ? 4 : 3;
      }
      InspectorFrontendHostInstance.recordEnumeratedHistogram(
        "DevTools.SyncSetting",
        settingValue,
        5
        /* SyncSetting.MAX_VALUE */
      );
    });
  }
  recordingToggled(value) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      "DevTools.RecordingToggled",
      value,
      3
      /* RecordingToggled.MAX_VALUE */
    );
  }
  recordingReplayFinished(value) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      "DevTools.RecordingReplayFinished",
      value,
      5
      /* RecordingReplayFinished.MAX_VALUE */
    );
  }
  recordingReplayStarted(value) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      "DevTools.RecordingReplayStarted",
      value,
      4
      /* RecordingReplayStarted.MAX_VALUE */
    );
  }
  lighthouseModeRun(type) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      "DevTools.LighthouseModeRun",
      type,
      4
      /* LighthouseModeRun.MAX_VALUE */
    );
  }
  lighthouseCategoryUsed(type) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      "DevTools.LighthouseCategoryUsed",
      type,
      6
      /* LighthouseCategoryUsed.MAX_VALUE */
    );
  }
  swatchActivated(swatch) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      "DevTools.SwatchActivated",
      swatch,
      13
      /* SwatchType.MAX_VALUE */
    );
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
  performanceAINetworkSummaryResponseSize(bytes) {
    InspectorFrontendHostInstance.recordCountHistogram("DevTools.PerformanceAI.NetworkSummaryResponseSize", bytes, 0, 1e5, 100);
  }
  performanceAINetworkRequestDetailResponseSize(bytes) {
    InspectorFrontendHostInstance.recordCountHistogram("DevTools.PerformanceAI.NetworkRequestDetailResponseSize", bytes, 0, 1e5, 100);
  }
  performanceAIMainThreadActivityResponseSize(bytes) {
    InspectorFrontendHostInstance.recordCountHistogram("DevTools.PerformanceAI.MainThreadActivityResponseSize", bytes, 0, 1e5, 100);
  }
  builtInAiAvailability(availability) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      "DevTools.BuiltInAiAvailability",
      availability,
      10
      /* BuiltInAiAvailability.MAX_VALUE */
    );
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
  extensionEvalTarget(target) {
    InspectorFrontendHostInstance.recordEnumeratedHistogram(
      "DevTools.ExtensionEvalTarget",
      target,
      3
      /* ExtensionEvalTarget.MAX_VALUE */
    );
  }
};
var Action;
(function(Action2) {
  Action2[Action2["WindowDocked"] = 1] = "WindowDocked";
  Action2[Action2["WindowUndocked"] = 2] = "WindowUndocked";
  Action2[Action2["ScriptsBreakpointSet"] = 3] = "ScriptsBreakpointSet";
  Action2[Action2["TimelineStarted"] = 4] = "TimelineStarted";
  Action2[Action2["ProfilesCPUProfileTaken"] = 5] = "ProfilesCPUProfileTaken";
  Action2[Action2["ProfilesHeapProfileTaken"] = 6] = "ProfilesHeapProfileTaken";
  Action2[Action2["ConsoleEvaluated"] = 8] = "ConsoleEvaluated";
  Action2[Action2["FileSavedInWorkspace"] = 9] = "FileSavedInWorkspace";
  Action2[Action2["DeviceModeEnabled"] = 10] = "DeviceModeEnabled";
  Action2[Action2["AnimationsPlaybackRateChanged"] = 11] = "AnimationsPlaybackRateChanged";
  Action2[Action2["RevisionApplied"] = 12] = "RevisionApplied";
  Action2[Action2["FileSystemDirectoryContentReceived"] = 13] = "FileSystemDirectoryContentReceived";
  Action2[Action2["StyleRuleEdited"] = 14] = "StyleRuleEdited";
  Action2[Action2["CommandEvaluatedInConsolePanel"] = 15] = "CommandEvaluatedInConsolePanel";
  Action2[Action2["DOMPropertiesExpanded"] = 16] = "DOMPropertiesExpanded";
  Action2[Action2["ResizedViewInResponsiveMode"] = 17] = "ResizedViewInResponsiveMode";
  Action2[Action2["TimelinePageReloadStarted"] = 18] = "TimelinePageReloadStarted";
  Action2[Action2["ConnectToNodeJSFromFrontend"] = 19] = "ConnectToNodeJSFromFrontend";
  Action2[Action2["ConnectToNodeJSDirectly"] = 20] = "ConnectToNodeJSDirectly";
  Action2[Action2["CpuThrottlingEnabled"] = 21] = "CpuThrottlingEnabled";
  Action2[Action2["CpuProfileNodeFocused"] = 22] = "CpuProfileNodeFocused";
  Action2[Action2["CpuProfileNodeExcluded"] = 23] = "CpuProfileNodeExcluded";
  Action2[Action2["SelectFileFromFilePicker"] = 24] = "SelectFileFromFilePicker";
  Action2[Action2["SelectCommandFromCommandMenu"] = 25] = "SelectCommandFromCommandMenu";
  Action2[Action2["ChangeInspectedNodeInElementsPanel"] = 26] = "ChangeInspectedNodeInElementsPanel";
  Action2[Action2["StyleRuleCopied"] = 27] = "StyleRuleCopied";
  Action2[Action2["CoverageStarted"] = 28] = "CoverageStarted";
  Action2[Action2["LighthouseStarted"] = 29] = "LighthouseStarted";
  Action2[Action2["LighthouseFinished"] = 30] = "LighthouseFinished";
  Action2[Action2["ShowedThirdPartyBadges"] = 31] = "ShowedThirdPartyBadges";
  Action2[Action2["LighthouseViewTrace"] = 32] = "LighthouseViewTrace";
  Action2[Action2["FilmStripStartedRecording"] = 33] = "FilmStripStartedRecording";
  Action2[Action2["CoverageReportFiltered"] = 34] = "CoverageReportFiltered";
  Action2[Action2["CoverageStartedPerBlock"] = 35] = "CoverageStartedPerBlock";
  Action2[Action2["SettingsOpenedFromGear-deprecated"] = 36] = "SettingsOpenedFromGear-deprecated";
  Action2[Action2["SettingsOpenedFromMenu-deprecated"] = 37] = "SettingsOpenedFromMenu-deprecated";
  Action2[Action2["SettingsOpenedFromCommandMenu-deprecated"] = 38] = "SettingsOpenedFromCommandMenu-deprecated";
  Action2[Action2["TabMovedToDrawer"] = 39] = "TabMovedToDrawer";
  Action2[Action2["TabMovedToMainPanel"] = 40] = "TabMovedToMainPanel";
  Action2[Action2["CaptureCssOverviewClicked"] = 41] = "CaptureCssOverviewClicked";
  Action2[Action2["VirtualAuthenticatorEnvironmentEnabled"] = 42] = "VirtualAuthenticatorEnvironmentEnabled";
  Action2[Action2["SourceOrderViewActivated"] = 43] = "SourceOrderViewActivated";
  Action2[Action2["UserShortcutAdded"] = 44] = "UserShortcutAdded";
  Action2[Action2["ShortcutRemoved"] = 45] = "ShortcutRemoved";
  Action2[Action2["ShortcutModified"] = 46] = "ShortcutModified";
  Action2[Action2["CustomPropertyLinkClicked"] = 47] = "CustomPropertyLinkClicked";
  Action2[Action2["CustomPropertyEdited"] = 48] = "CustomPropertyEdited";
  Action2[Action2["ServiceWorkerNetworkRequestClicked"] = 49] = "ServiceWorkerNetworkRequestClicked";
  Action2[Action2["ServiceWorkerNetworkRequestClosedQuickly"] = 50] = "ServiceWorkerNetworkRequestClosedQuickly";
  Action2[Action2["NetworkPanelServiceWorkerRespondWith"] = 51] = "NetworkPanelServiceWorkerRespondWith";
  Action2[Action2["NetworkPanelCopyValue"] = 52] = "NetworkPanelCopyValue";
  Action2[Action2["ConsoleSidebarOpened"] = 53] = "ConsoleSidebarOpened";
  Action2[Action2["PerfPanelTraceImported"] = 54] = "PerfPanelTraceImported";
  Action2[Action2["PerfPanelTraceExported"] = 55] = "PerfPanelTraceExported";
  Action2[Action2["StackFrameRestarted"] = 56] = "StackFrameRestarted";
  Action2[Action2["CaptureTestProtocolClicked"] = 57] = "CaptureTestProtocolClicked";
  Action2[Action2["BreakpointRemovedFromRemoveButton"] = 58] = "BreakpointRemovedFromRemoveButton";
  Action2[Action2["BreakpointGroupExpandedStateChanged"] = 59] = "BreakpointGroupExpandedStateChanged";
  Action2[Action2["HeaderOverrideFileCreated"] = 60] = "HeaderOverrideFileCreated";
  Action2[Action2["HeaderOverrideEnableEditingClicked"] = 61] = "HeaderOverrideEnableEditingClicked";
  Action2[Action2["HeaderOverrideHeaderAdded"] = 62] = "HeaderOverrideHeaderAdded";
  Action2[Action2["HeaderOverrideHeaderEdited"] = 63] = "HeaderOverrideHeaderEdited";
  Action2[Action2["HeaderOverrideHeaderRemoved"] = 64] = "HeaderOverrideHeaderRemoved";
  Action2[Action2["HeaderOverrideHeadersFileEdited"] = 65] = "HeaderOverrideHeadersFileEdited";
  Action2[Action2["PersistenceNetworkOverridesEnabled"] = 66] = "PersistenceNetworkOverridesEnabled";
  Action2[Action2["PersistenceNetworkOverridesDisabled"] = 67] = "PersistenceNetworkOverridesDisabled";
  Action2[Action2["BreakpointRemovedFromContextMenu"] = 68] = "BreakpointRemovedFromContextMenu";
  Action2[Action2["BreakpointsInFileRemovedFromRemoveButton"] = 69] = "BreakpointsInFileRemovedFromRemoveButton";
  Action2[Action2["BreakpointsInFileRemovedFromContextMenu"] = 70] = "BreakpointsInFileRemovedFromContextMenu";
  Action2[Action2["BreakpointsInFileCheckboxToggled"] = 71] = "BreakpointsInFileCheckboxToggled";
  Action2[Action2["BreakpointsInFileEnabledDisabledFromContextMenu"] = 72] = "BreakpointsInFileEnabledDisabledFromContextMenu";
  Action2[Action2["BreakpointConditionEditedFromSidebar"] = 73] = "BreakpointConditionEditedFromSidebar";
  Action2[Action2["WorkspaceTabAddFolder"] = 74] = "WorkspaceTabAddFolder";
  Action2[Action2["WorkspaceTabRemoveFolder"] = 75] = "WorkspaceTabRemoveFolder";
  Action2[Action2["OverrideTabAddFolder"] = 76] = "OverrideTabAddFolder";
  Action2[Action2["OverrideTabRemoveFolder"] = 77] = "OverrideTabRemoveFolder";
  Action2[Action2["WorkspaceSourceSelected"] = 78] = "WorkspaceSourceSelected";
  Action2[Action2["OverridesSourceSelected"] = 79] = "OverridesSourceSelected";
  Action2[Action2["StyleSheetInitiatorLinkClicked"] = 80] = "StyleSheetInitiatorLinkClicked";
  Action2[Action2["BreakpointRemovedFromGutterContextMenu"] = 81] = "BreakpointRemovedFromGutterContextMenu";
  Action2[Action2["BreakpointRemovedFromGutterToggle"] = 82] = "BreakpointRemovedFromGutterToggle";
  Action2[Action2["StylePropertyInsideKeyframeEdited"] = 83] = "StylePropertyInsideKeyframeEdited";
  Action2[Action2["OverrideContentFromSourcesContextMenu"] = 84] = "OverrideContentFromSourcesContextMenu";
  Action2[Action2["OverrideContentFromNetworkContextMenu"] = 85] = "OverrideContentFromNetworkContextMenu";
  Action2[Action2["OverrideScript"] = 86] = "OverrideScript";
  Action2[Action2["OverrideStyleSheet"] = 87] = "OverrideStyleSheet";
  Action2[Action2["OverrideDocument"] = 88] = "OverrideDocument";
  Action2[Action2["OverrideFetchXHR"] = 89] = "OverrideFetchXHR";
  Action2[Action2["OverrideImage"] = 90] = "OverrideImage";
  Action2[Action2["OverrideFont"] = 91] = "OverrideFont";
  Action2[Action2["OverrideContentContextMenuSetup"] = 92] = "OverrideContentContextMenuSetup";
  Action2[Action2["OverrideContentContextMenuAbandonSetup"] = 93] = "OverrideContentContextMenuAbandonSetup";
  Action2[Action2["OverrideContentContextMenuActivateDisabled"] = 94] = "OverrideContentContextMenuActivateDisabled";
  Action2[Action2["OverrideContentContextMenuOpenExistingFile"] = 95] = "OverrideContentContextMenuOpenExistingFile";
  Action2[Action2["OverrideContentContextMenuSaveNewFile"] = 96] = "OverrideContentContextMenuSaveNewFile";
  Action2[Action2["ShowAllOverridesFromSourcesContextMenu"] = 97] = "ShowAllOverridesFromSourcesContextMenu";
  Action2[Action2["ShowAllOverridesFromNetworkContextMenu"] = 98] = "ShowAllOverridesFromNetworkContextMenu";
  Action2[Action2["AnimationGroupsCleared"] = 99] = "AnimationGroupsCleared";
  Action2[Action2["AnimationsPaused"] = 100] = "AnimationsPaused";
  Action2[Action2["AnimationsResumed"] = 101] = "AnimationsResumed";
  Action2[Action2["AnimatedNodeDescriptionClicked"] = 102] = "AnimatedNodeDescriptionClicked";
  Action2[Action2["AnimationGroupScrubbed"] = 103] = "AnimationGroupScrubbed";
  Action2[Action2["AnimationGroupReplayed"] = 104] = "AnimationGroupReplayed";
  Action2[Action2["OverrideTabDeleteFolderContextMenu"] = 105] = "OverrideTabDeleteFolderContextMenu";
  Action2[Action2["WorkspaceDropFolder"] = 107] = "WorkspaceDropFolder";
  Action2[Action2["WorkspaceSelectFolder"] = 108] = "WorkspaceSelectFolder";
  Action2[Action2["OverrideContentContextMenuSourceMappedWarning"] = 109] = "OverrideContentContextMenuSourceMappedWarning";
  Action2[Action2["OverrideContentContextMenuRedirectToDeployed"] = 110] = "OverrideContentContextMenuRedirectToDeployed";
  Action2[Action2["NewStyleRuleAdded"] = 111] = "NewStyleRuleAdded";
  Action2[Action2["TraceExpanded"] = 112] = "TraceExpanded";
  Action2[Action2["InsightConsoleMessageShown"] = 113] = "InsightConsoleMessageShown";
  Action2[Action2["InsightRequestedViaContextMenu"] = 114] = "InsightRequestedViaContextMenu";
  Action2[Action2["InsightRequestedViaHoverButton"] = 115] = "InsightRequestedViaHoverButton";
  Action2[Action2["InsightRatedPositive"] = 117] = "InsightRatedPositive";
  Action2[Action2["InsightRatedNegative"] = 118] = "InsightRatedNegative";
  Action2[Action2["InsightClosed"] = 119] = "InsightClosed";
  Action2[Action2["InsightErrored"] = 120] = "InsightErrored";
  Action2[Action2["InsightHoverButtonShown"] = 121] = "InsightHoverButtonShown";
  Action2[Action2["SelfXssWarningConsoleMessageShown"] = 122] = "SelfXssWarningConsoleMessageShown";
  Action2[Action2["SelfXssWarningDialogShown"] = 123] = "SelfXssWarningDialogShown";
  Action2[Action2["SelfXssAllowPastingInConsole"] = 124] = "SelfXssAllowPastingInConsole";
  Action2[Action2["SelfXssAllowPastingInDialog"] = 125] = "SelfXssAllowPastingInDialog";
  Action2[Action2["ToggleEmulateFocusedPageFromStylesPaneOn"] = 126] = "ToggleEmulateFocusedPageFromStylesPaneOn";
  Action2[Action2["ToggleEmulateFocusedPageFromStylesPaneOff"] = 127] = "ToggleEmulateFocusedPageFromStylesPaneOff";
  Action2[Action2["ToggleEmulateFocusedPageFromRenderingTab"] = 128] = "ToggleEmulateFocusedPageFromRenderingTab";
  Action2[Action2["ToggleEmulateFocusedPageFromCommandMenu"] = 129] = "ToggleEmulateFocusedPageFromCommandMenu";
  Action2[Action2["InsightGenerated"] = 130] = "InsightGenerated";
  Action2[Action2["InsightErroredApi"] = 131] = "InsightErroredApi";
  Action2[Action2["InsightErroredMarkdown"] = 132] = "InsightErroredMarkdown";
  Action2[Action2["ToggleShowWebVitals"] = 133] = "ToggleShowWebVitals";
  Action2[Action2["InsightErroredPermissionDenied"] = 134] = "InsightErroredPermissionDenied";
  Action2[Action2["InsightErroredCannotSend"] = 135] = "InsightErroredCannotSend";
  Action2[Action2["InsightErroredRequestFailed"] = 136] = "InsightErroredRequestFailed";
  Action2[Action2["InsightErroredCannotParseChunk"] = 137] = "InsightErroredCannotParseChunk";
  Action2[Action2["InsightErroredUnknownChunk"] = 138] = "InsightErroredUnknownChunk";
  Action2[Action2["InsightErroredOther"] = 139] = "InsightErroredOther";
  Action2[Action2["AutofillReceived"] = 140] = "AutofillReceived";
  Action2[Action2["AutofillReceivedAndTabAutoOpened"] = 141] = "AutofillReceivedAndTabAutoOpened";
  Action2[Action2["AnimationGroupSelected"] = 142] = "AnimationGroupSelected";
  Action2[Action2["ScrollDrivenAnimationGroupSelected"] = 143] = "ScrollDrivenAnimationGroupSelected";
  Action2[Action2["ScrollDrivenAnimationGroupScrubbed"] = 144] = "ScrollDrivenAnimationGroupScrubbed";
  Action2[Action2["AiAssistanceOpenedFromElementsPanel"] = 145] = "AiAssistanceOpenedFromElementsPanel";
  Action2[Action2["AiAssistanceOpenedFromStylesTab"] = 146] = "AiAssistanceOpenedFromStylesTab";
  Action2[Action2["ConsoleFilterByContext"] = 147] = "ConsoleFilterByContext";
  Action2[Action2["ConsoleFilterBySource"] = 148] = "ConsoleFilterBySource";
  Action2[Action2["ConsoleFilterByUrl"] = 149] = "ConsoleFilterByUrl";
  Action2[Action2["InsightConsentReminderShown"] = 150] = "InsightConsentReminderShown";
  Action2[Action2["InsightConsentReminderCanceled"] = 151] = "InsightConsentReminderCanceled";
  Action2[Action2["InsightConsentReminderConfirmed"] = 152] = "InsightConsentReminderConfirmed";
  Action2[Action2["InsightsOnboardingShown"] = 153] = "InsightsOnboardingShown";
  Action2[Action2["InsightsOnboardingCanceledOnPage1"] = 154] = "InsightsOnboardingCanceledOnPage1";
  Action2[Action2["InsightsOnboardingCanceledOnPage2"] = 155] = "InsightsOnboardingCanceledOnPage2";
  Action2[Action2["InsightsOnboardingConfirmed"] = 156] = "InsightsOnboardingConfirmed";
  Action2[Action2["InsightsOnboardingNextPage"] = 157] = "InsightsOnboardingNextPage";
  Action2[Action2["InsightsOnboardingPrevPage"] = 158] = "InsightsOnboardingPrevPage";
  Action2[Action2["InsightsOnboardingFeatureDisabled"] = 159] = "InsightsOnboardingFeatureDisabled";
  Action2[Action2["InsightsOptInTeaserShown"] = 160] = "InsightsOptInTeaserShown";
  Action2[Action2["InsightsOptInTeaserSettingsLinkClicked"] = 161] = "InsightsOptInTeaserSettingsLinkClicked";
  Action2[Action2["InsightsOptInTeaserConfirmedInSettings"] = 162] = "InsightsOptInTeaserConfirmedInSettings";
  Action2[Action2["InsightsReminderTeaserShown"] = 163] = "InsightsReminderTeaserShown";
  Action2[Action2["InsightsReminderTeaserConfirmed"] = 164] = "InsightsReminderTeaserConfirmed";
  Action2[Action2["InsightsReminderTeaserCanceled"] = 165] = "InsightsReminderTeaserCanceled";
  Action2[Action2["InsightsReminderTeaserSettingsLinkClicked"] = 166] = "InsightsReminderTeaserSettingsLinkClicked";
  Action2[Action2["InsightsReminderTeaserAbortedInSettings"] = 167] = "InsightsReminderTeaserAbortedInSettings";
  Action2[Action2["GeneratingInsightWithoutDisclaimer"] = 168] = "GeneratingInsightWithoutDisclaimer";
  Action2[Action2["AiAssistanceOpenedFromElementsPanelFloatingButton"] = 169] = "AiAssistanceOpenedFromElementsPanelFloatingButton";
  Action2[Action2["AiAssistanceOpenedFromNetworkPanel"] = 170] = "AiAssistanceOpenedFromNetworkPanel";
  Action2[Action2["AiAssistanceOpenedFromSourcesPanel"] = 171] = "AiAssistanceOpenedFromSourcesPanel";
  Action2[Action2["AiAssistanceOpenedFromSourcesPanelFloatingButton"] = 172] = "AiAssistanceOpenedFromSourcesPanelFloatingButton";
  Action2[Action2["AiAssistanceOpenedFromPerformancePanelCallTree"] = 173] = "AiAssistanceOpenedFromPerformancePanelCallTree";
  Action2[Action2["AiAssistanceOpenedFromNetworkPanelFloatingButton"] = 174] = "AiAssistanceOpenedFromNetworkPanelFloatingButton";
  Action2[Action2["AiAssistancePanelOpened"] = 175] = "AiAssistancePanelOpened";
  Action2[Action2["AiAssistanceQuerySubmitted"] = 176] = "AiAssistanceQuerySubmitted";
  Action2[Action2["AiAssistanceAnswerReceived"] = 177] = "AiAssistanceAnswerReceived";
  Action2[Action2["AiAssistanceDynamicSuggestionClicked"] = 178] = "AiAssistanceDynamicSuggestionClicked";
  Action2[Action2["AiAssistanceSideEffectConfirmed"] = 179] = "AiAssistanceSideEffectConfirmed";
  Action2[Action2["AiAssistanceSideEffectRejected"] = 180] = "AiAssistanceSideEffectRejected";
  Action2[Action2["AiAssistanceError"] = 181] = "AiAssistanceError";
  Action2[Action2["AiCodeCompletionResponseServedFromCache"] = 184] = "AiCodeCompletionResponseServedFromCache";
  Action2[Action2["AiCodeCompletionRequestTriggered"] = 185] = "AiCodeCompletionRequestTriggered";
  Action2[Action2["AiCodeCompletionSuggestionDisplayed"] = 186] = "AiCodeCompletionSuggestionDisplayed";
  Action2[Action2["AiCodeCompletionSuggestionAccepted"] = 187] = "AiCodeCompletionSuggestionAccepted";
  Action2[Action2["AiCodeCompletionError"] = 188] = "AiCodeCompletionError";
  Action2[Action2["AttributeLinkClicked"] = 189] = "AttributeLinkClicked";
  Action2[Action2["InsightRequestedViaTeaser"] = 190] = "InsightRequestedViaTeaser";
  Action2[Action2["InsightTeaserGenerationStarted"] = 191] = "InsightTeaserGenerationStarted";
  Action2[Action2["InsightTeaserGenerationCompleted"] = 192] = "InsightTeaserGenerationCompleted";
  Action2[Action2["InsightTeaserGenerationAborted"] = 193] = "InsightTeaserGenerationAborted";
  Action2[Action2["InsightTeaserGenerationErrored"] = 194] = "InsightTeaserGenerationErrored";
  Action2[Action2["AiCodeGenerationSuggestionDisplayed"] = 195] = "AiCodeGenerationSuggestionDisplayed";
  Action2[Action2["AiCodeGenerationSuggestionAccepted"] = 196] = "AiCodeGenerationSuggestionAccepted";
  Action2[Action2["InsightTeaserModelDownloadStarted"] = 197] = "InsightTeaserModelDownloadStarted";
  Action2[Action2["InsightTeaserModelDownloadCompleted"] = 198] = "InsightTeaserModelDownloadCompleted";
  Action2[Action2["AiCodeGenerationError"] = 199] = "AiCodeGenerationError";
  Action2[Action2["AiCodeGenerationRequestTriggered"] = 200] = "AiCodeGenerationRequestTriggered";
  Action2[Action2["MAX_VALUE"] = 201] = "MAX_VALUE";
})(Action || (Action = {}));
var PanelCodes;
(function(PanelCodes2) {
  PanelCodes2[PanelCodes2["elements"] = 1] = "elements";
  PanelCodes2[PanelCodes2["resources"] = 2] = "resources";
  PanelCodes2[PanelCodes2["network"] = 3] = "network";
  PanelCodes2[PanelCodes2["sources"] = 4] = "sources";
  PanelCodes2[PanelCodes2["timeline"] = 5] = "timeline";
  PanelCodes2[PanelCodes2["heap-profiler"] = 6] = "heap-profiler";
  PanelCodes2[PanelCodes2["console"] = 8] = "console";
  PanelCodes2[PanelCodes2["layers"] = 9] = "layers";
  PanelCodes2[PanelCodes2["console-view"] = 10] = "console-view";
  PanelCodes2[PanelCodes2["animations"] = 11] = "animations";
  PanelCodes2[PanelCodes2["network.config"] = 12] = "network.config";
  PanelCodes2[PanelCodes2["rendering"] = 13] = "rendering";
  PanelCodes2[PanelCodes2["sensors"] = 14] = "sensors";
  PanelCodes2[PanelCodes2["sources.search"] = 15] = "sources.search";
  PanelCodes2[PanelCodes2["security"] = 16] = "security";
  PanelCodes2[PanelCodes2["js-profiler"] = 17] = "js-profiler";
  PanelCodes2[PanelCodes2["lighthouse"] = 18] = "lighthouse";
  PanelCodes2[PanelCodes2["coverage"] = 19] = "coverage";
  PanelCodes2[PanelCodes2["protocol-monitor"] = 20] = "protocol-monitor";
  PanelCodes2[PanelCodes2["remote-devices"] = 21] = "remote-devices";
  PanelCodes2[PanelCodes2["web-audio"] = 22] = "web-audio";
  PanelCodes2[PanelCodes2["changes.changes"] = 23] = "changes.changes";
  PanelCodes2[PanelCodes2["performance.monitor"] = 24] = "performance.monitor";
  PanelCodes2[PanelCodes2["release-note"] = 25] = "release-note";
  PanelCodes2[PanelCodes2["live-heap-profile"] = 26] = "live-heap-profile";
  PanelCodes2[PanelCodes2["sources.quick"] = 27] = "sources.quick";
  PanelCodes2[PanelCodes2["network.blocked-urls"] = 28] = "network.blocked-urls";
  PanelCodes2[PanelCodes2["settings-preferences"] = 29] = "settings-preferences";
  PanelCodes2[PanelCodes2["settings-workspace"] = 30] = "settings-workspace";
  PanelCodes2[PanelCodes2["settings-experiments"] = 31] = "settings-experiments";
  PanelCodes2[PanelCodes2["settings-blackbox"] = 32] = "settings-blackbox";
  PanelCodes2[PanelCodes2["settings-devices"] = 33] = "settings-devices";
  PanelCodes2[PanelCodes2["settings-throttling-conditions"] = 34] = "settings-throttling-conditions";
  PanelCodes2[PanelCodes2["settings-emulation-locations"] = 35] = "settings-emulation-locations";
  PanelCodes2[PanelCodes2["settings-shortcuts"] = 36] = "settings-shortcuts";
  PanelCodes2[PanelCodes2["issues-pane"] = 37] = "issues-pane";
  PanelCodes2[PanelCodes2["settings-keybinds"] = 38] = "settings-keybinds";
  PanelCodes2[PanelCodes2["cssoverview"] = 39] = "cssoverview";
  PanelCodes2[PanelCodes2["chrome-recorder"] = 40] = "chrome-recorder";
  PanelCodes2[PanelCodes2["trust-tokens"] = 41] = "trust-tokens";
  PanelCodes2[PanelCodes2["reporting-api"] = 42] = "reporting-api";
  PanelCodes2[PanelCodes2["interest-groups"] = 43] = "interest-groups";
  PanelCodes2[PanelCodes2["back-forward-cache"] = 44] = "back-forward-cache";
  PanelCodes2[PanelCodes2["service-worker-cache"] = 45] = "service-worker-cache";
  PanelCodes2[PanelCodes2["background-service-background-fetch"] = 46] = "background-service-background-fetch";
  PanelCodes2[PanelCodes2["background-service-background-sync"] = 47] = "background-service-background-sync";
  PanelCodes2[PanelCodes2["background-service-push-messaging"] = 48] = "background-service-push-messaging";
  PanelCodes2[PanelCodes2["background-service-notifications"] = 49] = "background-service-notifications";
  PanelCodes2[PanelCodes2["background-service-payment-handler"] = 50] = "background-service-payment-handler";
  PanelCodes2[PanelCodes2["background-service-periodic-background-sync"] = 51] = "background-service-periodic-background-sync";
  PanelCodes2[PanelCodes2["service-workers"] = 52] = "service-workers";
  PanelCodes2[PanelCodes2["app-manifest"] = 53] = "app-manifest";
  PanelCodes2[PanelCodes2["storage"] = 54] = "storage";
  PanelCodes2[PanelCodes2["cookies"] = 55] = "cookies";
  PanelCodes2[PanelCodes2["frame-details"] = 56] = "frame-details";
  PanelCodes2[PanelCodes2["frame-resource"] = 57] = "frame-resource";
  PanelCodes2[PanelCodes2["frame-window"] = 58] = "frame-window";
  PanelCodes2[PanelCodes2["frame-worker"] = 59] = "frame-worker";
  PanelCodes2[PanelCodes2["dom-storage"] = 60] = "dom-storage";
  PanelCodes2[PanelCodes2["indexed-db"] = 61] = "indexed-db";
  PanelCodes2[PanelCodes2["web-sql"] = 62] = "web-sql";
  PanelCodes2[PanelCodes2["performance-insights"] = 63] = "performance-insights";
  PanelCodes2[PanelCodes2["preloading"] = 64] = "preloading";
  PanelCodes2[PanelCodes2["bounce-tracking-mitigations"] = 65] = "bounce-tracking-mitigations";
  PanelCodes2[PanelCodes2["developer-resources"] = 66] = "developer-resources";
  PanelCodes2[PanelCodes2["autofill-view"] = 67] = "autofill-view";
  PanelCodes2[PanelCodes2["freestyler"] = 68] = "freestyler";
  PanelCodes2[PanelCodes2["MAX_VALUE"] = 69] = "MAX_VALUE";
})(PanelCodes || (PanelCodes = {}));
var MediaTypes;
(function(MediaTypes2) {
  MediaTypes2[MediaTypes2["Unknown"] = 0] = "Unknown";
  MediaTypes2[MediaTypes2["text/css"] = 2] = "text/css";
  MediaTypes2[MediaTypes2["text/html"] = 3] = "text/html";
  MediaTypes2[MediaTypes2["application/xml"] = 4] = "application/xml";
  MediaTypes2[MediaTypes2["application/wasm"] = 5] = "application/wasm";
  MediaTypes2[MediaTypes2["application/manifest+json"] = 6] = "application/manifest+json";
  MediaTypes2[MediaTypes2["application/x-aspx"] = 7] = "application/x-aspx";
  MediaTypes2[MediaTypes2["application/jsp"] = 8] = "application/jsp";
  MediaTypes2[MediaTypes2["text/x-c++src"] = 9] = "text/x-c++src";
  MediaTypes2[MediaTypes2["text/x-coffeescript"] = 10] = "text/x-coffeescript";
  MediaTypes2[MediaTypes2["application/vnd.dart"] = 11] = "application/vnd.dart";
  MediaTypes2[MediaTypes2["text/typescript"] = 12] = "text/typescript";
  MediaTypes2[MediaTypes2["text/typescript-jsx"] = 13] = "text/typescript-jsx";
  MediaTypes2[MediaTypes2["application/json"] = 14] = "application/json";
  MediaTypes2[MediaTypes2["text/x-csharp"] = 15] = "text/x-csharp";
  MediaTypes2[MediaTypes2["text/x-java"] = 16] = "text/x-java";
  MediaTypes2[MediaTypes2["text/x-less"] = 17] = "text/x-less";
  MediaTypes2[MediaTypes2["application/x-httpd-php"] = 18] = "application/x-httpd-php";
  MediaTypes2[MediaTypes2["text/x-python"] = 19] = "text/x-python";
  MediaTypes2[MediaTypes2["text/x-sh"] = 20] = "text/x-sh";
  MediaTypes2[MediaTypes2["text/x-gss"] = 21] = "text/x-gss";
  MediaTypes2[MediaTypes2["text/x-sass"] = 22] = "text/x-sass";
  MediaTypes2[MediaTypes2["text/x-scss"] = 23] = "text/x-scss";
  MediaTypes2[MediaTypes2["text/markdown"] = 24] = "text/markdown";
  MediaTypes2[MediaTypes2["text/x-clojure"] = 25] = "text/x-clojure";
  MediaTypes2[MediaTypes2["text/jsx"] = 26] = "text/jsx";
  MediaTypes2[MediaTypes2["text/x-go"] = 27] = "text/x-go";
  MediaTypes2[MediaTypes2["text/x-kotlin"] = 28] = "text/x-kotlin";
  MediaTypes2[MediaTypes2["text/x-scala"] = 29] = "text/x-scala";
  MediaTypes2[MediaTypes2["text/x.svelte"] = 30] = "text/x.svelte";
  MediaTypes2[MediaTypes2["text/javascript+plain"] = 31] = "text/javascript+plain";
  MediaTypes2[MediaTypes2["text/javascript+minified"] = 32] = "text/javascript+minified";
  MediaTypes2[MediaTypes2["text/javascript+sourcemapped"] = 33] = "text/javascript+sourcemapped";
  MediaTypes2[MediaTypes2["text/x.angular"] = 34] = "text/x.angular";
  MediaTypes2[MediaTypes2["text/x.vue"] = 35] = "text/x.vue";
  MediaTypes2[MediaTypes2["text/javascript+snippet"] = 36] = "text/javascript+snippet";
  MediaTypes2[MediaTypes2["text/javascript+eval"] = 37] = "text/javascript+eval";
  MediaTypes2[MediaTypes2["MAX_VALUE"] = 38] = "MAX_VALUE";
})(MediaTypes || (MediaTypes = {}));
var KeybindSetSettings;
(function(KeybindSetSettings2) {
  KeybindSetSettings2[KeybindSetSettings2["devToolsDefault"] = 0] = "devToolsDefault";
  KeybindSetSettings2[KeybindSetSettings2["vsCode"] = 1] = "vsCode";
  KeybindSetSettings2[KeybindSetSettings2["MAX_VALUE"] = 2] = "MAX_VALUE";
})(KeybindSetSettings || (KeybindSetSettings = {}));
var KeyboardShortcutAction;
(function(KeyboardShortcutAction2) {
  KeyboardShortcutAction2[KeyboardShortcutAction2["OtherShortcut"] = 0] = "OtherShortcut";
  KeyboardShortcutAction2[KeyboardShortcutAction2["quick-open.show-command-menu"] = 1] = "quick-open.show-command-menu";
  KeyboardShortcutAction2[KeyboardShortcutAction2["console.clear"] = 2] = "console.clear";
  KeyboardShortcutAction2[KeyboardShortcutAction2["console.toggle"] = 3] = "console.toggle";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.step"] = 4] = "debugger.step";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.step-into"] = 5] = "debugger.step-into";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.step-out"] = 6] = "debugger.step-out";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.step-over"] = 7] = "debugger.step-over";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.toggle-breakpoint"] = 8] = "debugger.toggle-breakpoint";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.toggle-breakpoint-enabled"] = 9] = "debugger.toggle-breakpoint-enabled";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.toggle-pause"] = 10] = "debugger.toggle-pause";
  KeyboardShortcutAction2[KeyboardShortcutAction2["elements.edit-as-html"] = 11] = "elements.edit-as-html";
  KeyboardShortcutAction2[KeyboardShortcutAction2["elements.hide-element"] = 12] = "elements.hide-element";
  KeyboardShortcutAction2[KeyboardShortcutAction2["elements.redo"] = 13] = "elements.redo";
  KeyboardShortcutAction2[KeyboardShortcutAction2["elements.toggle-element-search"] = 14] = "elements.toggle-element-search";
  KeyboardShortcutAction2[KeyboardShortcutAction2["elements.undo"] = 15] = "elements.undo";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.search-in-panel.find"] = 16] = "main.search-in-panel.find";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.toggle-drawer"] = 17] = "main.toggle-drawer";
  KeyboardShortcutAction2[KeyboardShortcutAction2["network.hide-request-details"] = 18] = "network.hide-request-details";
  KeyboardShortcutAction2[KeyboardShortcutAction2["network.search"] = 19] = "network.search";
  KeyboardShortcutAction2[KeyboardShortcutAction2["network.toggle-recording"] = 20] = "network.toggle-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["quick-open.show"] = 21] = "quick-open.show";
  KeyboardShortcutAction2[KeyboardShortcutAction2["settings.show"] = 22] = "settings.show";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.search"] = 23] = "sources.search";
  KeyboardShortcutAction2[KeyboardShortcutAction2["background-service.toggle-recording"] = 24] = "background-service.toggle-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["components.collect-garbage"] = 25] = "components.collect-garbage";
  KeyboardShortcutAction2[KeyboardShortcutAction2["console.clear.history"] = 26] = "console.clear.history";
  KeyboardShortcutAction2[KeyboardShortcutAction2["console.create-pin"] = 27] = "console.create-pin";
  KeyboardShortcutAction2[KeyboardShortcutAction2["coverage.start-with-reload"] = 28] = "coverage.start-with-reload";
  KeyboardShortcutAction2[KeyboardShortcutAction2["coverage.toggle-recording"] = 29] = "coverage.toggle-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.breakpoint-input-window"] = 30] = "debugger.breakpoint-input-window";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.evaluate-selection"] = 31] = "debugger.evaluate-selection";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.next-call-frame"] = 32] = "debugger.next-call-frame";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.previous-call-frame"] = 33] = "debugger.previous-call-frame";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.run-snippet"] = 34] = "debugger.run-snippet";
  KeyboardShortcutAction2[KeyboardShortcutAction2["debugger.toggle-breakpoints-active"] = 35] = "debugger.toggle-breakpoints-active";
  KeyboardShortcutAction2[KeyboardShortcutAction2["elements.capture-area-screenshot"] = 36] = "elements.capture-area-screenshot";
  KeyboardShortcutAction2[KeyboardShortcutAction2["emulation.capture-full-height-screenshot"] = 37] = "emulation.capture-full-height-screenshot";
  KeyboardShortcutAction2[KeyboardShortcutAction2["emulation.capture-node-screenshot"] = 38] = "emulation.capture-node-screenshot";
  KeyboardShortcutAction2[KeyboardShortcutAction2["emulation.capture-screenshot"] = 39] = "emulation.capture-screenshot";
  KeyboardShortcutAction2[KeyboardShortcutAction2["emulation.show-sensors"] = 40] = "emulation.show-sensors";
  KeyboardShortcutAction2[KeyboardShortcutAction2["emulation.toggle-device-mode"] = 41] = "emulation.toggle-device-mode";
  KeyboardShortcutAction2[KeyboardShortcutAction2["help.release-notes"] = 42] = "help.release-notes";
  KeyboardShortcutAction2[KeyboardShortcutAction2["help.report-issue"] = 43] = "help.report-issue";
  KeyboardShortcutAction2[KeyboardShortcutAction2["input.start-replaying"] = 44] = "input.start-replaying";
  KeyboardShortcutAction2[KeyboardShortcutAction2["input.toggle-pause"] = 45] = "input.toggle-pause";
  KeyboardShortcutAction2[KeyboardShortcutAction2["input.toggle-recording"] = 46] = "input.toggle-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["inspector-main.focus-debuggee"] = 47] = "inspector-main.focus-debuggee";
  KeyboardShortcutAction2[KeyboardShortcutAction2["inspector-main.hard-reload"] = 48] = "inspector-main.hard-reload";
  KeyboardShortcutAction2[KeyboardShortcutAction2["inspector-main.reload"] = 49] = "inspector-main.reload";
  KeyboardShortcutAction2[KeyboardShortcutAction2["live-heap-profile.start-with-reload"] = 50] = "live-heap-profile.start-with-reload";
  KeyboardShortcutAction2[KeyboardShortcutAction2["live-heap-profile.toggle-recording"] = 51] = "live-heap-profile.toggle-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.debug-reload"] = 52] = "main.debug-reload";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.next-tab"] = 53] = "main.next-tab";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.previous-tab"] = 54] = "main.previous-tab";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.search-in-panel.cancel"] = 55] = "main.search-in-panel.cancel";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.search-in-panel.find-next"] = 56] = "main.search-in-panel.find-next";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.search-in-panel.find-previous"] = 57] = "main.search-in-panel.find-previous";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.toggle-dock"] = 58] = "main.toggle-dock";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.zoom-in"] = 59] = "main.zoom-in";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.zoom-out"] = 60] = "main.zoom-out";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.zoom-reset"] = 61] = "main.zoom-reset";
  KeyboardShortcutAction2[KeyboardShortcutAction2["network-conditions.network-low-end-mobile"] = 62] = "network-conditions.network-low-end-mobile";
  KeyboardShortcutAction2[KeyboardShortcutAction2["network-conditions.network-mid-tier-mobile"] = 63] = "network-conditions.network-mid-tier-mobile";
  KeyboardShortcutAction2[KeyboardShortcutAction2["network-conditions.network-offline"] = 64] = "network-conditions.network-offline";
  KeyboardShortcutAction2[KeyboardShortcutAction2["network-conditions.network-online"] = 65] = "network-conditions.network-online";
  KeyboardShortcutAction2[KeyboardShortcutAction2["profiler.heap-toggle-recording"] = 66] = "profiler.heap-toggle-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["profiler.js-toggle-recording"] = 67] = "profiler.js-toggle-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["resources.clear"] = 68] = "resources.clear";
  KeyboardShortcutAction2[KeyboardShortcutAction2["settings.documentation"] = 69] = "settings.documentation";
  KeyboardShortcutAction2[KeyboardShortcutAction2["settings.shortcuts"] = 70] = "settings.shortcuts";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.add-folder-to-workspace"] = 71] = "sources.add-folder-to-workspace";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.add-to-watch"] = 72] = "sources.add-to-watch";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.close-all"] = 73] = "sources.close-all";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.close-editor-tab"] = 74] = "sources.close-editor-tab";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.create-snippet"] = 75] = "sources.create-snippet";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.go-to-line"] = 76] = "sources.go-to-line";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.go-to-member"] = 77] = "sources.go-to-member";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.jump-to-next-location"] = 78] = "sources.jump-to-next-location";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.jump-to-previous-location"] = 79] = "sources.jump-to-previous-location";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.rename"] = 80] = "sources.rename";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.save"] = 81] = "sources.save";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.save-all"] = 82] = "sources.save-all";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.switch-file"] = 83] = "sources.switch-file";
  KeyboardShortcutAction2[KeyboardShortcutAction2["timeline.jump-to-next-frame"] = 84] = "timeline.jump-to-next-frame";
  KeyboardShortcutAction2[KeyboardShortcutAction2["timeline.jump-to-previous-frame"] = 85] = "timeline.jump-to-previous-frame";
  KeyboardShortcutAction2[KeyboardShortcutAction2["timeline.load-from-file"] = 86] = "timeline.load-from-file";
  KeyboardShortcutAction2[KeyboardShortcutAction2["timeline.next-recording"] = 87] = "timeline.next-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["timeline.previous-recording"] = 88] = "timeline.previous-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["timeline.record-reload"] = 89] = "timeline.record-reload";
  KeyboardShortcutAction2[KeyboardShortcutAction2["timeline.save-to-file"] = 90] = "timeline.save-to-file";
  KeyboardShortcutAction2[KeyboardShortcutAction2["timeline.show-history"] = 91] = "timeline.show-history";
  KeyboardShortcutAction2[KeyboardShortcutAction2["timeline.toggle-recording"] = 92] = "timeline.toggle-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.increment-css"] = 93] = "sources.increment-css";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.increment-css-by-ten"] = 94] = "sources.increment-css-by-ten";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.decrement-css"] = 95] = "sources.decrement-css";
  KeyboardShortcutAction2[KeyboardShortcutAction2["sources.decrement-css-by-ten"] = 96] = "sources.decrement-css-by-ten";
  KeyboardShortcutAction2[KeyboardShortcutAction2["layers.reset-view"] = 97] = "layers.reset-view";
  KeyboardShortcutAction2[KeyboardShortcutAction2["layers.pan-mode"] = 98] = "layers.pan-mode";
  KeyboardShortcutAction2[KeyboardShortcutAction2["layers.rotate-mode"] = 99] = "layers.rotate-mode";
  KeyboardShortcutAction2[KeyboardShortcutAction2["layers.zoom-in"] = 100] = "layers.zoom-in";
  KeyboardShortcutAction2[KeyboardShortcutAction2["layers.zoom-out"] = 101] = "layers.zoom-out";
  KeyboardShortcutAction2[KeyboardShortcutAction2["layers.up"] = 102] = "layers.up";
  KeyboardShortcutAction2[KeyboardShortcutAction2["layers.down"] = 103] = "layers.down";
  KeyboardShortcutAction2[KeyboardShortcutAction2["layers.left"] = 104] = "layers.left";
  KeyboardShortcutAction2[KeyboardShortcutAction2["layers.right"] = 105] = "layers.right";
  KeyboardShortcutAction2[KeyboardShortcutAction2["help.report-translation-issue"] = 106] = "help.report-translation-issue";
  KeyboardShortcutAction2[KeyboardShortcutAction2["rendering.toggle-prefers-color-scheme"] = 107] = "rendering.toggle-prefers-color-scheme";
  KeyboardShortcutAction2[KeyboardShortcutAction2["chrome-recorder.start-recording"] = 108] = "chrome-recorder.start-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["chrome-recorder.replay-recording"] = 109] = "chrome-recorder.replay-recording";
  KeyboardShortcutAction2[KeyboardShortcutAction2["chrome-recorder.toggle-code-view"] = 110] = "chrome-recorder.toggle-code-view";
  KeyboardShortcutAction2[KeyboardShortcutAction2["chrome-recorder.copy-recording-or-step"] = 111] = "chrome-recorder.copy-recording-or-step";
  KeyboardShortcutAction2[KeyboardShortcutAction2["elements.new-style-rule"] = 114] = "elements.new-style-rule";
  KeyboardShortcutAction2[KeyboardShortcutAction2["elements.refresh-event-listeners"] = 115] = "elements.refresh-event-listeners";
  KeyboardShortcutAction2[KeyboardShortcutAction2["coverage.clear"] = 116] = "coverage.clear";
  KeyboardShortcutAction2[KeyboardShortcutAction2["coverage.export"] = 117] = "coverage.export";
  KeyboardShortcutAction2[KeyboardShortcutAction2["timeline.dim-third-parties"] = 118] = "timeline.dim-third-parties";
  KeyboardShortcutAction2[KeyboardShortcutAction2["main.toggle-drawer-orientation"] = 119] = "main.toggle-drawer-orientation";
  KeyboardShortcutAction2[KeyboardShortcutAction2["MAX_VALUE"] = 120] = "MAX_VALUE";
})(KeyboardShortcutAction || (KeyboardShortcutAction = {}));
var DevtoolsExperiments;
(function(DevtoolsExperiments2) {
  DevtoolsExperiments2[DevtoolsExperiments2["capture-node-creation-stacks"] = 1] = "capture-node-creation-stacks";
  DevtoolsExperiments2[DevtoolsExperiments2["live-heap-profile"] = 11] = "live-heap-profile";
  DevtoolsExperiments2[DevtoolsExperiments2["protocol-monitor"] = 13] = "protocol-monitor";
  DevtoolsExperiments2[DevtoolsExperiments2["sampling-heap-profiler-timeline"] = 17] = "sampling-heap-profiler-timeline";
  DevtoolsExperiments2[DevtoolsExperiments2["timeline-invalidation-tracking"] = 26] = "timeline-invalidation-tracking";
  DevtoolsExperiments2[DevtoolsExperiments2["timeline-show-all-events"] = 27] = "timeline-show-all-events";
  DevtoolsExperiments2[DevtoolsExperiments2["apca"] = 39] = "apca";
  DevtoolsExperiments2[DevtoolsExperiments2["font-editor"] = 41] = "font-editor";
  DevtoolsExperiments2[DevtoolsExperiments2["instrumentation-breakpoints"] = 61] = "instrumentation-breakpoints";
  DevtoolsExperiments2[DevtoolsExperiments2["use-source-map-scopes"] = 76] = "use-source-map-scopes";
  DevtoolsExperiments2[DevtoolsExperiments2["timeline-debug-mode"] = 93] = "timeline-debug-mode";
  DevtoolsExperiments2[DevtoolsExperiments2["durable-messages"] = 110] = "durable-messages";
  DevtoolsExperiments2[DevtoolsExperiments2["jpeg-xl"] = 111] = "jpeg-xl";
  DevtoolsExperiments2[DevtoolsExperiments2["MAX_VALUE"] = 112] = "MAX_VALUE";
})(DevtoolsExperiments || (DevtoolsExperiments = {}));
var IssueExpanded;
(function(IssueExpanded2) {
  IssueExpanded2[IssueExpanded2["CrossOriginEmbedderPolicy"] = 0] = "CrossOriginEmbedderPolicy";
  IssueExpanded2[IssueExpanded2["MixedContent"] = 1] = "MixedContent";
  IssueExpanded2[IssueExpanded2["SameSiteCookie"] = 2] = "SameSiteCookie";
  IssueExpanded2[IssueExpanded2["HeavyAd"] = 3] = "HeavyAd";
  IssueExpanded2[IssueExpanded2["ContentSecurityPolicy"] = 4] = "ContentSecurityPolicy";
  IssueExpanded2[IssueExpanded2["Other"] = 5] = "Other";
  IssueExpanded2[IssueExpanded2["Generic"] = 6] = "Generic";
  IssueExpanded2[IssueExpanded2["ThirdPartyPhaseoutCookie"] = 7] = "ThirdPartyPhaseoutCookie";
  IssueExpanded2[IssueExpanded2["GenericCookie"] = 8] = "GenericCookie";
  IssueExpanded2[IssueExpanded2["MAX_VALUE"] = 9] = "MAX_VALUE";
})(IssueExpanded || (IssueExpanded = {}));
var IssueResourceOpened;
(function(IssueResourceOpened2) {
  IssueResourceOpened2[IssueResourceOpened2["CrossOriginEmbedderPolicyRequest"] = 0] = "CrossOriginEmbedderPolicyRequest";
  IssueResourceOpened2[IssueResourceOpened2["CrossOriginEmbedderPolicyElement"] = 1] = "CrossOriginEmbedderPolicyElement";
  IssueResourceOpened2[IssueResourceOpened2["MixedContentRequest"] = 2] = "MixedContentRequest";
  IssueResourceOpened2[IssueResourceOpened2["SameSiteCookieCookie"] = 3] = "SameSiteCookieCookie";
  IssueResourceOpened2[IssueResourceOpened2["SameSiteCookieRequest"] = 4] = "SameSiteCookieRequest";
  IssueResourceOpened2[IssueResourceOpened2["HeavyAdElement"] = 5] = "HeavyAdElement";
  IssueResourceOpened2[IssueResourceOpened2["ContentSecurityPolicyDirective"] = 6] = "ContentSecurityPolicyDirective";
  IssueResourceOpened2[IssueResourceOpened2["ContentSecurityPolicyElement"] = 7] = "ContentSecurityPolicyElement";
  IssueResourceOpened2[IssueResourceOpened2["MAX_VALUE"] = 13] = "MAX_VALUE";
})(IssueResourceOpened || (IssueResourceOpened = {}));
var IssueCreated;
(function(IssueCreated2) {
  IssueCreated2[IssueCreated2["MixedContentIssue"] = 0] = "MixedContentIssue";
  IssueCreated2[IssueCreated2["ContentSecurityPolicyIssue::kInlineViolation"] = 1] = "ContentSecurityPolicyIssue::kInlineViolation";
  IssueCreated2[IssueCreated2["ContentSecurityPolicyIssue::kEvalViolation"] = 2] = "ContentSecurityPolicyIssue::kEvalViolation";
  IssueCreated2[IssueCreated2["ContentSecurityPolicyIssue::kURLViolation"] = 3] = "ContentSecurityPolicyIssue::kURLViolation";
  IssueCreated2[IssueCreated2["ContentSecurityPolicyIssue::kTrustedTypesSinkViolation"] = 4] = "ContentSecurityPolicyIssue::kTrustedTypesSinkViolation";
  IssueCreated2[IssueCreated2["ContentSecurityPolicyIssue::kTrustedTypesPolicyViolation"] = 5] = "ContentSecurityPolicyIssue::kTrustedTypesPolicyViolation";
  IssueCreated2[IssueCreated2["HeavyAdIssue::NetworkTotalLimit"] = 6] = "HeavyAdIssue::NetworkTotalLimit";
  IssueCreated2[IssueCreated2["HeavyAdIssue::CpuTotalLimit"] = 7] = "HeavyAdIssue::CpuTotalLimit";
  IssueCreated2[IssueCreated2["HeavyAdIssue::CpuPeakLimit"] = 8] = "HeavyAdIssue::CpuPeakLimit";
  IssueCreated2[IssueCreated2["CrossOriginEmbedderPolicyIssue::CoepFrameResourceNeedsCoepHeader"] = 9] = "CrossOriginEmbedderPolicyIssue::CoepFrameResourceNeedsCoepHeader";
  IssueCreated2[IssueCreated2["CrossOriginEmbedderPolicyIssue::CoopSandboxedIFrameCannotNavigateToCoopPage"] = 10] = "CrossOriginEmbedderPolicyIssue::CoopSandboxedIFrameCannotNavigateToCoopPage";
  IssueCreated2[IssueCreated2["CrossOriginEmbedderPolicyIssue::CorpNotSameOrigin"] = 11] = "CrossOriginEmbedderPolicyIssue::CorpNotSameOrigin";
  IssueCreated2[IssueCreated2["CrossOriginEmbedderPolicyIssue::CorpNotSameOriginAfterDefaultedToSameOriginByCoep"] = 12] = "CrossOriginEmbedderPolicyIssue::CorpNotSameOriginAfterDefaultedToSameOriginByCoep";
  IssueCreated2[IssueCreated2["CrossOriginEmbedderPolicyIssue::CorpNotSameSite"] = 13] = "CrossOriginEmbedderPolicyIssue::CorpNotSameSite";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeSameSiteNoneInsecure::ReadCookie"] = 14] = "CookieIssue::ExcludeSameSiteNoneInsecure::ReadCookie";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeSameSiteNoneInsecure::SetCookie"] = 15] = "CookieIssue::ExcludeSameSiteNoneInsecure::SetCookie";
  IssueCreated2[IssueCreated2["CookieIssue::WarnSameSiteNoneInsecure::ReadCookie"] = 16] = "CookieIssue::WarnSameSiteNoneInsecure::ReadCookie";
  IssueCreated2[IssueCreated2["CookieIssue::WarnSameSiteNoneInsecure::SetCookie"] = 17] = "CookieIssue::WarnSameSiteNoneInsecure::SetCookie";
  IssueCreated2[IssueCreated2["CookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Secure"] = 18] = "CookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Secure";
  IssueCreated2[IssueCreated2["CookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Insecure"] = 19] = "CookieIssue::WarnSameSiteStrictLaxDowngradeStrict::Insecure";
  IssueCreated2[IssueCreated2["CookieIssue::WarnCrossDowngrade::ReadCookie::Secure"] = 20] = "CookieIssue::WarnCrossDowngrade::ReadCookie::Secure";
  IssueCreated2[IssueCreated2["CookieIssue::WarnCrossDowngrade::ReadCookie::Insecure"] = 21] = "CookieIssue::WarnCrossDowngrade::ReadCookie::Insecure";
  IssueCreated2[IssueCreated2["CookieIssue::WarnCrossDowngrade::SetCookie::Secure"] = 22] = "CookieIssue::WarnCrossDowngrade::SetCookie::Secure";
  IssueCreated2[IssueCreated2["CookieIssue::WarnCrossDowngrade::SetCookie::Insecure"] = 23] = "CookieIssue::WarnCrossDowngrade::SetCookie::Insecure";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeNavigationContextDowngrade::Secure"] = 24] = "CookieIssue::ExcludeNavigationContextDowngrade::Secure";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeNavigationContextDowngrade::Insecure"] = 25] = "CookieIssue::ExcludeNavigationContextDowngrade::Insecure";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeContextDowngrade::ReadCookie::Secure"] = 26] = "CookieIssue::ExcludeContextDowngrade::ReadCookie::Secure";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeContextDowngrade::ReadCookie::Insecure"] = 27] = "CookieIssue::ExcludeContextDowngrade::ReadCookie::Insecure";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeContextDowngrade::SetCookie::Secure"] = 28] = "CookieIssue::ExcludeContextDowngrade::SetCookie::Secure";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeContextDowngrade::SetCookie::Insecure"] = 29] = "CookieIssue::ExcludeContextDowngrade::SetCookie::Insecure";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::ReadCookie"] = 30] = "CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::ReadCookie";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::SetCookie"] = 31] = "CookieIssue::ExcludeSameSiteUnspecifiedTreatedAsLax::SetCookie";
  IssueCreated2[IssueCreated2["CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::ReadCookie"] = 32] = "CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::ReadCookie";
  IssueCreated2[IssueCreated2["CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::SetCookie"] = 33] = "CookieIssue::WarnSameSiteUnspecifiedLaxAllowUnsafe::SetCookie";
  IssueCreated2[IssueCreated2["CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::ReadCookie"] = 34] = "CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::ReadCookie";
  IssueCreated2[IssueCreated2["CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::SetCookie"] = 35] = "CookieIssue::WarnSameSiteUnspecifiedCrossSiteContext::SetCookie";
  IssueCreated2[IssueCreated2["SharedArrayBufferIssue::TransferIssue"] = 36] = "SharedArrayBufferIssue::TransferIssue";
  IssueCreated2[IssueCreated2["SharedArrayBufferIssue::CreationIssue"] = 37] = "SharedArrayBufferIssue::CreationIssue";
  IssueCreated2[IssueCreated2["CorsIssue::InsecureLocalNetwork"] = 42] = "CorsIssue::InsecureLocalNetwork";
  IssueCreated2[IssueCreated2["CorsIssue::InvalidHeaders"] = 44] = "CorsIssue::InvalidHeaders";
  IssueCreated2[IssueCreated2["CorsIssue::WildcardOriginWithCredentials"] = 45] = "CorsIssue::WildcardOriginWithCredentials";
  IssueCreated2[IssueCreated2["CorsIssue::PreflightResponseInvalid"] = 46] = "CorsIssue::PreflightResponseInvalid";
  IssueCreated2[IssueCreated2["CorsIssue::OriginMismatch"] = 47] = "CorsIssue::OriginMismatch";
  IssueCreated2[IssueCreated2["CorsIssue::AllowCredentialsRequired"] = 48] = "CorsIssue::AllowCredentialsRequired";
  IssueCreated2[IssueCreated2["CorsIssue::MethodDisallowedByPreflightResponse"] = 49] = "CorsIssue::MethodDisallowedByPreflightResponse";
  IssueCreated2[IssueCreated2["CorsIssue::HeaderDisallowedByPreflightResponse"] = 50] = "CorsIssue::HeaderDisallowedByPreflightResponse";
  IssueCreated2[IssueCreated2["CorsIssue::RedirectContainsCredentials"] = 51] = "CorsIssue::RedirectContainsCredentials";
  IssueCreated2[IssueCreated2["CorsIssue::DisallowedByMode"] = 52] = "CorsIssue::DisallowedByMode";
  IssueCreated2[IssueCreated2["CorsIssue::CorsDisabledScheme"] = 53] = "CorsIssue::CorsDisabledScheme";
  IssueCreated2[IssueCreated2["CorsIssue::PreflightMissingAllowExternal"] = 54] = "CorsIssue::PreflightMissingAllowExternal";
  IssueCreated2[IssueCreated2["CorsIssue::PreflightInvalidAllowExternal"] = 55] = "CorsIssue::PreflightInvalidAllowExternal";
  IssueCreated2[IssueCreated2["CorsIssue::NoCorsRedirectModeNotFollow"] = 57] = "CorsIssue::NoCorsRedirectModeNotFollow";
  IssueCreated2[IssueCreated2["QuirksModeIssue::QuirksMode"] = 58] = "QuirksModeIssue::QuirksMode";
  IssueCreated2[IssueCreated2["QuirksModeIssue::LimitedQuirksMode"] = 59] = "QuirksModeIssue::LimitedQuirksMode";
  IssueCreated2[IssueCreated2["DeprecationIssue"] = 60] = "DeprecationIssue";
  IssueCreated2[IssueCreated2["ClientHintIssue::MetaTagAllowListInvalidOrigin"] = 61] = "ClientHintIssue::MetaTagAllowListInvalidOrigin";
  IssueCreated2[IssueCreated2["ClientHintIssue::MetaTagModifiedHTML"] = 62] = "ClientHintIssue::MetaTagModifiedHTML";
  IssueCreated2[IssueCreated2["GenericIssue::CrossOriginPortalPostMessageError"] = 64] = "GenericIssue::CrossOriginPortalPostMessageError";
  IssueCreated2[IssueCreated2["GenericIssue::FormLabelForNameError"] = 65] = "GenericIssue::FormLabelForNameError";
  IssueCreated2[IssueCreated2["GenericIssue::FormDuplicateIdForInputError"] = 66] = "GenericIssue::FormDuplicateIdForInputError";
  IssueCreated2[IssueCreated2["GenericIssue::FormInputWithNoLabelError"] = 67] = "GenericIssue::FormInputWithNoLabelError";
  IssueCreated2[IssueCreated2["GenericIssue::FormAutocompleteAttributeEmptyError"] = 68] = "GenericIssue::FormAutocompleteAttributeEmptyError";
  IssueCreated2[IssueCreated2["GenericIssue::FormEmptyIdAndNameAttributesForInputError"] = 69] = "GenericIssue::FormEmptyIdAndNameAttributesForInputError";
  IssueCreated2[IssueCreated2["GenericIssue::FormAriaLabelledByToNonExistingIdError"] = 70] = "GenericIssue::FormAriaLabelledByToNonExistingIdError";
  IssueCreated2[IssueCreated2["GenericIssue::FormInputAssignedAutocompleteValueToIdOrNameAttributeError"] = 71] = "GenericIssue::FormInputAssignedAutocompleteValueToIdOrNameAttributeError";
  IssueCreated2[IssueCreated2["GenericIssue::FormLabelHasNeitherForNorNestedInputError"] = 72] = "GenericIssue::FormLabelHasNeitherForNorNestedInputError";
  IssueCreated2[IssueCreated2["GenericIssue::FormLabelForMatchesNonExistingIdError"] = 73] = "GenericIssue::FormLabelForMatchesNonExistingIdError";
  IssueCreated2[IssueCreated2["GenericIssue::FormHasPasswordFieldWithoutUsernameFieldError"] = 74] = "GenericIssue::FormHasPasswordFieldWithoutUsernameFieldError";
  IssueCreated2[IssueCreated2["GenericIssue::FormInputHasWrongButWellIntendedAutocompleteValueError"] = 75] = "GenericIssue::FormInputHasWrongButWellIntendedAutocompleteValueError";
  IssueCreated2[IssueCreated2["StylesheetLoadingIssue::LateImportRule"] = 76] = "StylesheetLoadingIssue::LateImportRule";
  IssueCreated2[IssueCreated2["StylesheetLoadingIssue::RequestFailed"] = 77] = "StylesheetLoadingIssue::RequestFailed";
  IssueCreated2[IssueCreated2["CookieIssue::WarnThirdPartyPhaseout::ReadCookie"] = 82] = "CookieIssue::WarnThirdPartyPhaseout::ReadCookie";
  IssueCreated2[IssueCreated2["CookieIssue::WarnThirdPartyPhaseout::SetCookie"] = 83] = "CookieIssue::WarnThirdPartyPhaseout::SetCookie";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeThirdPartyPhaseout::ReadCookie"] = 84] = "CookieIssue::ExcludeThirdPartyPhaseout::ReadCookie";
  IssueCreated2[IssueCreated2["CookieIssue::ExcludeThirdPartyPhaseout::SetCookie"] = 85] = "CookieIssue::ExcludeThirdPartyPhaseout::SetCookie";
  IssueCreated2[IssueCreated2["ElementAccessibilityIssue::DisallowedSelectChild"] = 86] = "ElementAccessibilityIssue::DisallowedSelectChild";
  IssueCreated2[IssueCreated2["ElementAccessibilityIssue::DisallowedOptGroupChild"] = 87] = "ElementAccessibilityIssue::DisallowedOptGroupChild";
  IssueCreated2[IssueCreated2["ElementAccessibilityIssue::NonPhrasingContentOptionChild"] = 88] = "ElementAccessibilityIssue::NonPhrasingContentOptionChild";
  IssueCreated2[IssueCreated2["ElementAccessibilityIssue::InteractiveContentOptionChild"] = 89] = "ElementAccessibilityIssue::InteractiveContentOptionChild";
  IssueCreated2[IssueCreated2["ElementAccessibilityIssue::InteractiveContentLegendChild"] = 90] = "ElementAccessibilityIssue::InteractiveContentLegendChild";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::MissingSignatureHeader"] = 91] = "SRIMessageSignatureIssue::MissingSignatureHeader";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::MissingSignatureInputHeader"] = 92] = "SRIMessageSignatureIssue::MissingSignatureInputHeader";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::InvalidSignatureHeader"] = 93] = "SRIMessageSignatureIssue::InvalidSignatureHeader";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::InvalidSignatureInputHeader"] = 94] = "SRIMessageSignatureIssue::InvalidSignatureInputHeader";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureHeaderValueIsNotByteSequence"] = 95] = "SRIMessageSignatureIssue::SignatureHeaderValueIsNotByteSequence";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureHeaderValueIsParameterized"] = 96] = "SRIMessageSignatureIssue::SignatureHeaderValueIsParameterized";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureHeaderValueIsIncorrectLength"] = 97] = "SRIMessageSignatureIssue::SignatureHeaderValueIsIncorrectLength";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureInputHeaderMissingLabel"] = 98] = "SRIMessageSignatureIssue::SignatureInputHeaderMissingLabel";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureInputHeaderValueNotInnerList"] = 99] = "SRIMessageSignatureIssue::SignatureInputHeaderValueNotInnerList";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureInputHeaderValueMissingComponents"] = 100] = "SRIMessageSignatureIssue::SignatureInputHeaderValueMissingComponents";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureInputHeaderInvalidComponentType"] = 101] = "SRIMessageSignatureIssue::SignatureInputHeaderInvalidComponentType";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureInputHeaderInvalidComponentName"] = 102] = "SRIMessageSignatureIssue::SignatureInputHeaderInvalidComponentName";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureInputHeaderInvalidHeaderComponentParameter"] = 103] = "SRIMessageSignatureIssue::SignatureInputHeaderInvalidHeaderComponentParameter";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureInputHeaderInvalidDerivedComponentParameter"] = 104] = "SRIMessageSignatureIssue::SignatureInputHeaderInvalidDerivedComponentParameter";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureInputHeaderKeyIdLength"] = 105] = "SRIMessageSignatureIssue::SignatureInputHeaderKeyIdLength";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureInputHeaderInvalidParameter"] = 106] = "SRIMessageSignatureIssue::SignatureInputHeaderInvalidParameter";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::SignatureInputHeaderMissingRequiredParameters"] = 107] = "SRIMessageSignatureIssue::SignatureInputHeaderMissingRequiredParameters";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::ValidationFailedSignatureExpired"] = 108] = "SRIMessageSignatureIssue::ValidationFailedSignatureExpired";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::ValidationFailedInvalidLength"] = 109] = "SRIMessageSignatureIssue::ValidationFailedInvalidLength";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::ValidationFailedSignatureMismatch"] = 110] = "SRIMessageSignatureIssue::ValidationFailedSignatureMismatch";
  IssueCreated2[IssueCreated2["CorsIssue::LocalNetworkAccessPermissionDenied"] = 111] = "CorsIssue::LocalNetworkAccessPermissionDenied";
  IssueCreated2[IssueCreated2["SRIMessageSignatureIssue::ValidationFailedIntegrityMismatch"] = 112] = "SRIMessageSignatureIssue::ValidationFailedIntegrityMismatch";
  IssueCreated2[IssueCreated2["ElementAccessibilityIssue::InteractiveContentSummaryDescendant"] = 113] = "ElementAccessibilityIssue::InteractiveContentSummaryDescendant";
  IssueCreated2[IssueCreated2["CorsIssue::InvalidLocalNetworkAccess"] = 114] = "CorsIssue::InvalidLocalNetworkAccess";
  IssueCreated2[IssueCreated2["MAX_VALUE"] = 115] = "MAX_VALUE";
})(IssueCreated || (IssueCreated = {}));
var Language2;
(function(Language3) {
  Language3[Language3["af"] = 1] = "af";
  Language3[Language3["am"] = 2] = "am";
  Language3[Language3["ar"] = 3] = "ar";
  Language3[Language3["as"] = 4] = "as";
  Language3[Language3["az"] = 5] = "az";
  Language3[Language3["be"] = 6] = "be";
  Language3[Language3["bg"] = 7] = "bg";
  Language3[Language3["bn"] = 8] = "bn";
  Language3[Language3["bs"] = 9] = "bs";
  Language3[Language3["ca"] = 10] = "ca";
  Language3[Language3["cs"] = 11] = "cs";
  Language3[Language3["cy"] = 12] = "cy";
  Language3[Language3["da"] = 13] = "da";
  Language3[Language3["de"] = 14] = "de";
  Language3[Language3["el"] = 15] = "el";
  Language3[Language3["en-GB"] = 16] = "en-GB";
  Language3[Language3["en-US"] = 17] = "en-US";
  Language3[Language3["es-419"] = 18] = "es-419";
  Language3[Language3["es"] = 19] = "es";
  Language3[Language3["et"] = 20] = "et";
  Language3[Language3["eu"] = 21] = "eu";
  Language3[Language3["fa"] = 22] = "fa";
  Language3[Language3["fi"] = 23] = "fi";
  Language3[Language3["fil"] = 24] = "fil";
  Language3[Language3["fr-CA"] = 25] = "fr-CA";
  Language3[Language3["fr"] = 26] = "fr";
  Language3[Language3["gl"] = 27] = "gl";
  Language3[Language3["gu"] = 28] = "gu";
  Language3[Language3["he"] = 29] = "he";
  Language3[Language3["hi"] = 30] = "hi";
  Language3[Language3["hr"] = 31] = "hr";
  Language3[Language3["hu"] = 32] = "hu";
  Language3[Language3["hy"] = 33] = "hy";
  Language3[Language3["id"] = 34] = "id";
  Language3[Language3["is"] = 35] = "is";
  Language3[Language3["it"] = 36] = "it";
  Language3[Language3["ja"] = 37] = "ja";
  Language3[Language3["ka"] = 38] = "ka";
  Language3[Language3["kk"] = 39] = "kk";
  Language3[Language3["km"] = 40] = "km";
  Language3[Language3["kn"] = 41] = "kn";
  Language3[Language3["ko"] = 42] = "ko";
  Language3[Language3["ky"] = 43] = "ky";
  Language3[Language3["lo"] = 44] = "lo";
  Language3[Language3["lt"] = 45] = "lt";
  Language3[Language3["lv"] = 46] = "lv";
  Language3[Language3["mk"] = 47] = "mk";
  Language3[Language3["ml"] = 48] = "ml";
  Language3[Language3["mn"] = 49] = "mn";
  Language3[Language3["mr"] = 50] = "mr";
  Language3[Language3["ms"] = 51] = "ms";
  Language3[Language3["my"] = 52] = "my";
  Language3[Language3["ne"] = 53] = "ne";
  Language3[Language3["nl"] = 54] = "nl";
  Language3[Language3["no"] = 55] = "no";
  Language3[Language3["or"] = 56] = "or";
  Language3[Language3["pa"] = 57] = "pa";
  Language3[Language3["pl"] = 58] = "pl";
  Language3[Language3["pt-PT"] = 59] = "pt-PT";
  Language3[Language3["pt"] = 60] = "pt";
  Language3[Language3["ro"] = 61] = "ro";
  Language3[Language3["ru"] = 62] = "ru";
  Language3[Language3["si"] = 63] = "si";
  Language3[Language3["sk"] = 64] = "sk";
  Language3[Language3["sl"] = 65] = "sl";
  Language3[Language3["sq"] = 66] = "sq";
  Language3[Language3["sr-Latn"] = 67] = "sr-Latn";
  Language3[Language3["sr"] = 68] = "sr";
  Language3[Language3["sv"] = 69] = "sv";
  Language3[Language3["sw"] = 70] = "sw";
  Language3[Language3["ta"] = 71] = "ta";
  Language3[Language3["te"] = 72] = "te";
  Language3[Language3["th"] = 73] = "th";
  Language3[Language3["tr"] = 74] = "tr";
  Language3[Language3["uk"] = 75] = "uk";
  Language3[Language3["ur"] = 76] = "ur";
  Language3[Language3["uz"] = 77] = "uz";
  Language3[Language3["vi"] = 78] = "vi";
  Language3[Language3["zh"] = 79] = "zh";
  Language3[Language3["zh-HK"] = 80] = "zh-HK";
  Language3[Language3["zh-TW"] = 81] = "zh-TW";
  Language3[Language3["zu"] = 82] = "zu";
  Language3[Language3["MAX_VALUE"] = 83] = "MAX_VALUE";
})(Language2 || (Language2 = {}));
var ManifestSectionCodes;
(function(ManifestSectionCodes2) {
  ManifestSectionCodes2[ManifestSectionCodes2["OtherSection"] = 0] = "OtherSection";
  ManifestSectionCodes2[ManifestSectionCodes2["Identity"] = 1] = "Identity";
  ManifestSectionCodes2[ManifestSectionCodes2["Presentation"] = 2] = "Presentation";
  ManifestSectionCodes2[ManifestSectionCodes2["Protocol Handlers"] = 3] = "Protocol Handlers";
  ManifestSectionCodes2[ManifestSectionCodes2["Icons"] = 4] = "Icons";
  ManifestSectionCodes2[ManifestSectionCodes2["Window Controls Overlay"] = 5] = "Window Controls Overlay";
  ManifestSectionCodes2[ManifestSectionCodes2["MAX_VALUE"] = 6] = "MAX_VALUE";
})(ManifestSectionCodes || (ManifestSectionCodes = {}));

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
