// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as AIDA from './AidaClient.js';
import * as GCA from './GcaTypes.js';
function createBaseGcaRequest(request, contents) {
    const gcaRequest = { contents };
    mapCommonAidaRequestFields(request, gcaRequest);
    buildLabels(request, gcaRequest);
    if ('preamble' in request && request.preamble) {
        gcaRequest.system_instruction = {
            role: 'user',
            parts: [{ text: request.preamble }],
        };
    }
    return gcaRequest;
}
export function aidaDoConversationRequestToGcaRequest(request) {
    const contents = [];
    if (request.historical_contexts) {
        contents.push(...request.historical_contexts.map(convertAidaContentToGcaContent));
    }
    contents.push(convertAidaContentToGcaContent(request.current_message));
    const gcaRequest = createBaseGcaRequest(request, contents);
    if (request.function_declarations) {
        gcaRequest.tools = [{
                function_declarations: request.function_declarations.map(fd => ({
                    name: fd.name,
                    description: fd.description,
                    parameters: convertAidaParamToGcaSchema(fd.parameters),
                })),
            }];
    }
    return gcaRequest;
}
function mapCommonAidaRequestFields(aidaRequest, gcaRequest) {
    if (aidaRequest.options?.model_id) {
        gcaRequest.model = aidaRequest.options.model_id;
    }
    if (aidaRequest.metadata.string_session_id) {
        gcaRequest.session_id = aidaRequest.metadata.string_session_id;
    }
    if (aidaRequest.options?.temperature !== undefined) {
        gcaRequest.generation_config = {
            ...gcaRequest.generation_config,
            temperature: aidaRequest.options.temperature,
        };
    }
}
export function gcaResponseToAidaDoConversationResponse(response) {
    const candidate = response.candidates[0];
    const functionCalls = [];
    if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
            if (part.function_call) {
                functionCalls.push({
                    name: part.function_call.name,
                    args: part.function_call.args || {},
                });
            }
        }
    }
    return {
        explanation: extractTextFromGcaParts(candidate?.content?.parts),
        metadata: {
            rpcGlobalId: response.response_id,
        },
        functionCalls: functionCalls.length > 0 ?
            functionCalls :
            undefined,
        completed: true,
    };
}
function extractTextFromGcaParts(parts) {
    if (!parts) {
        return '';
    }
    return parts.map(p => p.text || '').join('');
}
export function aidaEventToGcaTelemetryRequest(clientEvent) {
    const feedbackMetrics = [];
    const responseId = String(clientEvent.corresponding_aida_rpc_global_id);
    const eventTime = new Date().toISOString();
    if (clientEvent.do_conversation_client_event) {
        const feedback = clientEvent.do_conversation_client_event.user_feedback;
        if (feedback.sentiment) {
            let interaction = GCA.InteractionType.INTERACTION_TYPE_UNSPECIFIED;
            if (feedback.sentiment === "POSITIVE" /* AIDA.Rating.POSITIVE */) {
                interaction = GCA.InteractionType.THUMBS_UP;
            }
            else if (feedback.sentiment === "NEGATIVE" /* AIDA.Rating.NEGATIVE */) {
                interaction = GCA.InteractionType.THUMBS_DOWN;
            }
            feedbackMetrics.push({
                event_time: eventTime,
                response_id: responseId,
                suggestion_interaction: { interaction },
            });
        }
    }
    feedbackMetrics.push(...convertCodeTelemetry(clientEvent.complete_code_client_event, GCA.Method.COMPLETE_CODE, responseId, eventTime));
    feedbackMetrics.push(...convertCodeTelemetry(clientEvent.generate_code_client_event, GCA.Method.GENERATE_CODE, responseId, eventTime));
    return { feedback_metrics: feedbackMetrics };
}
/* eslint-disable @typescript-eslint/naming-convention */
function convertCodeTelemetry(event, method, responseId, eventTime) {
    if (!event) {
        return [];
    }
    if ('user_impression' in event && event.user_impression) {
        const impression = event.user_impression;
        return [{
                event_time: eventTime,
                response_id: responseId,
                suggestion_offered: {
                    method,
                    status: GCA.SuggestionStatus.NO_ERROR,
                    response_latency: `${impression.latency.duration.seconds + impression.latency.duration.nanos / 1e9}s`,
                },
            }];
    }
    if ('user_acceptance' in event && event.user_acceptance) {
        const acceptance = event.user_acceptance;
        return [{
                event_time: eventTime,
                response_id: responseId,
                suggestion_interaction: {
                    interaction: GCA.InteractionType.ACCEPT,
                    candidate_index: acceptance.sample.sample_id,
                },
            }];
    }
    return [];
}
/* eslint-enable @typescript-eslint/naming-convention */
export function aidaCompletionRequestToGcaRequest(request) {
    const contents = [
        {
            role: 'user',
            parts: [{ text: request.prefix + (request.suffix || '') }],
        },
    ];
    const gcaRequest = createBaseGcaRequest(request, contents);
    if (request.options?.stop_sequences) {
        gcaRequest.generation_config = {
            ...gcaRequest.generation_config,
            stop_sequences: request.options.stop_sequences,
        };
    }
    if (request.additional_files) {
        gcaRequest.aicode = {
            experience: 'completion',
            files: request.additional_files.map(f => ({
                file_uri: f.path,
                inclusion_reason: [AidaReasonToGcaInclusionReason[f.included_reason]],
            })),
        };
    }
    return gcaRequest;
}
/* eslint-disable @typescript-eslint/naming-convention */
function buildLabels(request, gcaRequest) {
    const labels = {};
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
    const options = request.options;
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
const AidaReasonToGcaInclusionReason = {
    [AIDA.Reason.UNKNOWN]: GCA.InclusionReason.INCLUSION_REASON_UNSPECIFIED,
    [AIDA.Reason.CURRENTLY_OPEN]: GCA.InclusionReason.OPEN,
    // Intentional mapping due to type mismatch
    // TODO(liviurau): find a way to validate this mapping
    [AIDA.Reason.RECENTLY_OPENED]: GCA.InclusionReason.RECENTLY_CLOSED,
    [AIDA.Reason.RECENTLY_EDITED]: GCA.InclusionReason.RECENTLY_EDITED,
    [AIDA.Reason.COLOCATED]: GCA.InclusionReason.COLOCATED,
    [AIDA.Reason.RELATED_FILE]: GCA.InclusionReason.RELATED,
};
export function gcaResponseToAidaCompletionResponse(response) {
    const { samples, metadata } = gcaResponseToAidaSamplesAndMetadata(response);
    return {
        generatedSamples: samples,
        metadata,
    };
}
function gcaResponseToAidaSamplesAndMetadata(response) {
    return {
        samples: response.candidates.map(gcaCandidateToAidaGenerationSample),
        metadata: {
            rpcGlobalId: response.response_id,
        },
    };
}
export function aidaGenerateCodeRequestToGcaRequest(request) {
    const gcaRequest = createBaseGcaRequest(request, [convertAidaContentToGcaContent(request.current_message)]);
    if (request.context_files) {
        gcaRequest.aicode = {
            experience: 'generate_code',
            files: request.context_files.map(f => ({
                file_uri: f.path,
                programming_language: f.programming_language,
            })),
        };
    }
    return gcaRequest;
}
export function gcaResponseToAidaGenerateCodeResponse(response) {
    return gcaResponseToAidaSamplesAndMetadata(response);
}
function gcaCandidateToAidaGenerationSample(candidate) {
    const generationSample = {
        generationString: extractTextFromGcaParts(candidate.content?.parts),
        score: 0,
        sampleId: candidate.index,
    };
    if (candidate.citation_metadata) {
        generationSample.attributionMetadata = {
            attributionAction: AIDA.RecitationAction.CITE,
            citations: candidate.citation_metadata.citations.map(c => ({
                startIndex: c.start_index,
                endIndex: c.end_index,
                uri: c.uri,
            })),
        };
    }
    return generationSample;
}
function convertAidaContentToGcaContent(content) {
    // TODO(liviurau): decide how to map AIDA.Role.SYSTEM
    // currently it will default to 'user'
    let role = 'user';
    if (content.role === AIDA.Role.MODEL) {
        role = 'model';
    }
    return {
        role,
        parts: content.parts.map(convertAidaPartToGcaPart),
    };
}
function convertAidaPartToGcaPart(part) {
    if ('text' in part) {
        return { text: part.text };
    }
    if ('functionCall' in part) {
        return {
            function_call: {
                name: part.functionCall.name,
                args: part.functionCall.args,
            },
        };
    }
    if ('functionResponse' in part) {
        const fResponse = {};
        if ('result' in part.functionResponse.response) {
            fResponse.output = part.functionResponse.response['result'];
        }
        else if ('output' in part.functionResponse.response) {
            fResponse.output = part.functionResponse.response['output'];
        }
        else if (!('error' in part.functionResponse.response)) {
            fResponse.output = part.functionResponse.response;
        }
        if ('error' in part.functionResponse.response) {
            fResponse.error = part.functionResponse.response['error'];
        }
        return {
            function_response: {
                name: part.functionResponse.name,
                response: fResponse,
            },
        };
    }
    if ('inlineData' in part) {
        return {
            inline_data: {
                mime_type: part.inlineData.mimeType,
                data: part.inlineData.data,
            },
        };
    }
    return {};
}
function convertAidaParamToGcaSchema(param) {
    const schema = {
        type: param.type,
        description: param.description,
    };
    if (param.nullable) {
        schema.nullable = param.nullable;
    }
    if (param.type === 5 /* AIDA.ParametersTypes.ARRAY */ && param.items) {
        schema.items = convertAidaParamToGcaSchema(param.items);
    }
    else if (param.type === 6 /* AIDA.ParametersTypes.OBJECT */ && param.properties) {
        schema.properties = {};
        for (const [key, value] of Object.entries(param.properties)) {
            schema.properties[key] = convertAidaParamToGcaSchema(value);
        }
        schema.required = param.required.map(r => r.toString());
    }
    return schema;
}
//# sourceMappingURL=AidaGcaTranslation.js.map