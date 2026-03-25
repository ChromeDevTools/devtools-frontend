// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as AIDA from './AidaClient.js';
import * as GCA from './GcaTypes.js';

type AidaRequest = AIDA.DoConversationRequest|AIDA.CompletionRequest|AIDA.GenerateCodeRequest;

function createBaseGcaRequest(request: AidaRequest, contents: GCA.Content[]): GCA.GenerateContentRequest {
  const gcaRequest: GCA.GenerateContentRequest = {contents};
  mapCommonAidaRequestFields(request, gcaRequest);
  buildLabels(request, gcaRequest);

  if ('preamble' in request && request.preamble) {
    gcaRequest.systemInstruction = {
      role: 'user',
      parts: [{text: request.preamble}],
    };
  }

  return gcaRequest;
}

export function aidaDoConversationRequestToGcaRequest(request: AIDA.DoConversationRequest): GCA.GenerateContentRequest {
  const contents: GCA.Content[] = [];

  if (request.historical_contexts) {
    contents.push(...request.historical_contexts.map(convertAidaContentToGcaContent));
  }
  contents.push(convertAidaContentToGcaContent(request.current_message));

  const gcaRequest = createBaseGcaRequest(request, contents);

  if (request.function_declarations) {
    gcaRequest.tools = [{
      functionDeclarations: request.function_declarations.map(fd => ({
                                                                name: fd.name,
                                                                description: fd.description,
                                                                parameters: convertAidaParamToGcaSchema(fd.parameters),
                                                              })),
    }];
  }

  return gcaRequest;
}

function mapCommonAidaRequestFields(aidaRequest: AidaRequest, gcaRequest: GCA.GenerateContentRequest): void {
  if (aidaRequest.options?.model_id) {
    gcaRequest.model = aidaRequest.options.model_id;
  }
  if (aidaRequest.metadata.string_session_id) {
    gcaRequest.sessionId = aidaRequest.metadata.string_session_id;
  }
  if (aidaRequest.options?.temperature !== undefined) {
    gcaRequest.generationConfig = {
      ...gcaRequest.generationConfig,
      temperature: aidaRequest.options.temperature,
    };
  }
}

export function gcaResponseToAidaDoConversationResponse(response: GCA.GenerateContentResponse):
    AIDA.DoConversationResponse {
  const candidate = response.candidates[0];
  const functionCalls: AIDA.AidaFunctionCallResponse[] = [];

  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.functionCall) {
        functionCalls.push({
          name: part.functionCall.name,
          args: part.functionCall.args || {},
        });
      }
    }
  }

  return {
    explanation: extractTextFromGcaParts(candidate?.content?.parts),
    metadata: {
      rpcGlobalId: response.responseId,
    },
    functionCalls: functionCalls.length > 0 ?
        (functionCalls as [AIDA.AidaFunctionCallResponse, ...AIDA.AidaFunctionCallResponse[]]) :
        undefined,
    completed: true,
  };
}

function extractTextFromGcaParts(parts: GCA.Part[]|undefined): string {
  if (!parts) {
    return '';
  }
  return parts.map(p => p.text || '').join('');
}

export function aidaEventToGcaTelemetryRequest(clientEvent: AIDA.AidaRegisterClientEvent): GCA.SendTelemetryRequest {
  const feedbackMetrics: GCA.FeedbackMetric[] = [];
  const responseId = String(clientEvent.corresponding_aida_rpc_global_id);
  const eventTime = new Date().toISOString();

  if (clientEvent.do_conversation_client_event) {
    const feedback = clientEvent.do_conversation_client_event.user_feedback;
    if (feedback.sentiment) {
      let interaction: GCA.InteractionType = GCA.InteractionType.INTERACTION_TYPE_UNSPECIFIED;
      if (feedback.sentiment === AIDA.Rating.POSITIVE) {
        interaction = GCA.InteractionType.THUMBS_UP;
      } else if (feedback.sentiment === AIDA.Rating.NEGATIVE) {
        interaction = GCA.InteractionType.THUMBS_DOWN;
      }
      feedbackMetrics.push({
        eventTime,
        responseId,
        suggestionInteraction: {interaction},
      });
    }
  }

  feedbackMetrics.push(
      ...convertCodeTelemetry(clientEvent.complete_code_client_event, GCA.Method.COMPLETE_CODE, responseId, eventTime));
  feedbackMetrics.push(
      ...convertCodeTelemetry(clientEvent.generate_code_client_event, GCA.Method.GENERATE_CODE, responseId, eventTime));

  return {feedbackMetrics};
}

/* eslint-disable @typescript-eslint/naming-convention */
function convertCodeTelemetry(
    event: {user_acceptance?: AIDA.UserAcceptance, user_impression?: AIDA.UserImpression}|undefined, method: GCA.Method,
    responseId: string, eventTime: string): GCA.FeedbackMetric[] {
  if (!event) {
    return [];
  }
  if ('user_impression' in event && event.user_impression) {
    const impression = event.user_impression;
    return [{
      eventTime,
      responseId,
      suggestionOffered: {
        method,
        status: GCA.SuggestionStatus.NO_ERROR,
        responseLatency: `${impression.latency.duration.seconds + impression.latency.duration.nanos / 1e9}s`,
      },
    }];
  }
  if ('user_acceptance' in event && event.user_acceptance) {
    const acceptance = event.user_acceptance;
    return [{
      eventTime,
      responseId,
      suggestionInteraction: {
        interaction: GCA.InteractionType.ACCEPT,
        candidateIndex: acceptance.sample.sample_id,
      },
    }];
  }
  return [];
}
/* eslint-enable @typescript-eslint/naming-convention */

export function aidaCompletionRequestToGcaRequest(request: AIDA.CompletionRequest): GCA.GenerateContentRequest {
  const contents: GCA.Content[] = [
    {
      role: 'user',
      parts: [{text: request.prefix + (request.suffix || '')}],
    },
  ];

  const gcaRequest = createBaseGcaRequest(request, contents);

  if (request.options?.stop_sequences) {
    gcaRequest.generationConfig = {
      ...gcaRequest.generationConfig,
      stopSequences: request.options.stop_sequences,
    };
  }

  if (request.additional_files) {
    gcaRequest.aicode = {
      experience: 'completion',
      files: request.additional_files.map(f => ({
                                            fileUri: f.path,
                                            inclusionReason: [AidaReasonToGcaInclusionReason[f.included_reason]],
                                          })),
    };
  }

  return gcaRequest;
}

/* eslint-disable @typescript-eslint/naming-convention */
function buildLabels(request: AidaRequest, gcaRequest: GCA.GenerateContentRequest): void {
  const labels: Record<string, string> = {};
  if (request.client) {
    labels['client'] = request.client;
  }
  if ('functionality_type' in request && request.functionality_type !== undefined) {
    labels['functionality_type'] = AIDA.FunctionalityType[request.functionality_type];
  }
  if ('client_feature' in request && request.client_feature !== undefined) {
    labels['client_feature'] = AIDA.ClientFeature[request.client_feature];
  }
  if ('last_user_action' in request && request.last_user_action !== undefined) {
    labels['last_user_action'] = AIDA.EditType[request.last_user_action];
  }
  if ('use_case' in request && request.use_case !== undefined) {
    labels['use_case'] = AIDA.UseCase[request.use_case];
  }
  const options = request.options as {
    inference_language?: string,
    expect_code_output?: boolean,
  } | undefined;
  if (options?.inference_language) {
    labels['inference_language'] = options.inference_language;
  }
  if (options?.expect_code_output !== undefined) {
    labels['expect_code_output'] = String(options.expect_code_output);
  }

  if (Object.keys(labels).length > 0) {
    gcaRequest.labels = labels;
  }
}
/* eslint-enable @typescript-eslint/naming-convention */

const AidaReasonToGcaInclusionReason: Record<AIDA.Reason, GCA.InclusionReason> = {
  [AIDA.Reason.UNKNOWN]: GCA.InclusionReason.INCLUSION_REASON_UNSPECIFIED,
  [AIDA.Reason.CURRENTLY_OPEN]: GCA.InclusionReason.OPEN,
  // Intentional mapping due to type mismatch
  // TODO(liviurau): find a way to validate this mapping
  [AIDA.Reason.RECENTLY_OPENED]: GCA.InclusionReason.RECENTLY_CLOSED,
  [AIDA.Reason.RECENTLY_EDITED]: GCA.InclusionReason.RECENTLY_EDITED,
  [AIDA.Reason.COLOCATED]: GCA.InclusionReason.COLOCATED,
  [AIDA.Reason.RELATED_FILE]: GCA.InclusionReason.RELATED,
};

export function gcaResponseToAidaCompletionResponse(response: GCA.GenerateContentResponse): AIDA.CompletionResponse {
  const {samples, metadata} = gcaResponseToAidaSamplesAndMetadata(response);
  return {
    generatedSamples: samples,
    metadata,
  };
}

function gcaResponseToAidaSamplesAndMetadata(response: GCA.GenerateContentResponse): {
  samples: AIDA.GenerationSample[],
  metadata: AIDA.ResponseMetadata,
} {
  return {
    samples: response.candidates.map(gcaCandidateToAidaGenerationSample),
    metadata: {
      rpcGlobalId: response.responseId,
    },
  };
}

export function aidaGenerateCodeRequestToGcaRequest(request: AIDA.GenerateCodeRequest): GCA.GenerateContentRequest {
  const gcaRequest = createBaseGcaRequest(request, [convertAidaContentToGcaContent(request.current_message)]);

  if (request.context_files) {
    gcaRequest.aicode = {
      experience: 'generate_code',
      files: request.context_files.map(f => ({
                                         fileUri: f.path,
                                         programmingLanguage: f.programming_language,
                                       })),
    };
  }

  return gcaRequest;
}

export function gcaResponseToAidaGenerateCodeResponse(response: GCA.GenerateContentResponse):
    AIDA.GenerateCodeResponse {
  return gcaResponseToAidaSamplesAndMetadata(response);
}

function gcaCandidateToAidaGenerationSample(candidate: GCA.Candidate): AIDA.GenerationSample {
  const generationSample: AIDA.GenerationSample = {
    generationString: extractTextFromGcaParts(candidate.content?.parts),
    score: 0,
    sampleId: candidate.index,
  };
  if (candidate.citationMetadata) {
    generationSample.attributionMetadata = {
      attributionAction: AIDA.RecitationAction.CITE,
      citations: candidate.citationMetadata.citations.map(c => ({
                                                            startIndex: c.startIndex,
                                                            endIndex: c.endIndex,
                                                            uri: c.uri,
                                                          })),
    };
  }
  return generationSample;
}

function convertAidaContentToGcaContent(content: AIDA.Content): GCA.Content {
  // TODO(liviurau): decide how to map AIDA.Role.SYSTEM
  // currently it will default to 'user'
  let role: GCA.Role = 'user';

  if (content.role === AIDA.Role.MODEL) {
    role = 'model';
  }
  return {
    role,
    parts: content.parts.map(convertAidaPartToGcaPart),
  };
}

function convertAidaPartToGcaPart(part: AIDA.Part): GCA.Part {
  if ('text' in part) {
    return {text: part.text};
  }
  if ('functionCall' in part) {
    return {
      functionCall: {
        name: part.functionCall.name,
        args: part.functionCall.args,
      },
    };
  }
  if ('functionResponse' in part) {
    const fResponse: Record<string, unknown> = {};
    if ('result' in part.functionResponse.response) {
      fResponse.output = part.functionResponse.response['result'];
    } else if ('output' in part.functionResponse.response) {
      fResponse.output = part.functionResponse.response['output'];
    } else if (!('error' in part.functionResponse.response)) {
      fResponse.output = part.functionResponse.response;
    }
    if ('error' in part.functionResponse.response) {
      fResponse.error = part.functionResponse.response['error'];
    }
    return {
      functionResponse: {
        name: part.functionResponse.name,
        response: fResponse,
      },
    };
  }
  if ('inlineData' in part) {
    return {
      inlineData: {
        mimeType: part.inlineData.mimeType,
        data: part.inlineData.data,
      },
    };
  }
  return {};
}

type FunctionParam<T extends string|number|symbol = string> =
    AIDA.FunctionObjectParam<T>|AIDA.FunctionArrayParam|AIDA.FunctionPrimitiveParams;

function convertAidaParamToGcaSchema<T extends string|number|symbol = string>(param: FunctionParam<T>): GCA.Schema {
  const schema: GCA.Schema = {
    type: param.type as unknown as GCA.Type,
    description: param.description,
  };
  if (param.nullable) {
    schema.nullable = param.nullable;
  }

  if (param.type === AIDA.ParametersTypes.ARRAY && param.items) {
    schema.items = convertAidaParamToGcaSchema(param.items);
  } else if (param.type === AIDA.ParametersTypes.OBJECT && param.properties) {
    schema.properties = {};
    for (const [key, value] of Object.entries(param.properties)) {
      schema.properties[key] = convertAidaParamToGcaSchema(value as FunctionParam);
    }
    schema.required = param.required.map(r => r.toString());
  }

  return schema;
}
