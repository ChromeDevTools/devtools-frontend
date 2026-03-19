// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {AidaClient, AidaGcaTranslation, GcaTypes} from './host.js';

const DEFAULT_CLIENT = 'CHROME_DEVTOOLS';
const DEFAULT_METADATA: AidaClient.RequestMetadata = {
  disable_user_content_logging: false,
  client_version: '1.2.3.4',
};

function createAidaDoConversationRequest(overrides: Partial<AidaClient.DoConversationRequest> = {}):
    AidaClient.DoConversationRequest {
  const {metadata, ...otherOverrides} = overrides;
  return {
    current_message: {parts: [{text: 'Hello'}], role: AidaClient.Role.USER},
    client: DEFAULT_CLIENT,
    metadata: {...DEFAULT_METADATA, ...metadata},
    ...otherOverrides,
  };
}

function createGcaRequest(overrides: Partial<GcaTypes.GenerateContentRequest> = {}): GcaTypes.GenerateContentRequest {
  const {labels, ...otherOverrides} = overrides;
  return {
    contents: [{role: 'user', parts: [{text: 'Hello'}]}],
    ...otherOverrides,
    labels: {client: DEFAULT_CLIENT, ...labels},
  };
}

function createGcaResponse(overrides: Partial<GcaTypes.GenerateContentResponse> = {}):
    GcaTypes.GenerateContentResponse {
  return {
    candidates: [{
      index: 0,
      content: {role: 'model', parts: [{text: 'Hello there!'}]},
      finish_reason: GcaTypes.FinishReason.STOP,
      safety_ratings: [],
      citation_metadata: {citations: []},
      grounding_metadata: {},
      aicode_output: {contents: []},
    }],
    prompt_feedback:
        {block_reason: GcaTypes.BlockReason.BLOCKED_REASON_UNSPECIFIED, safety_ratings: [], block_reason_message: ''},
    usage_metadata: {
      prompt_token_count: 0,
      candidates_token_count: 0,
      total_token_count: 0,
      thoughts_token_count: 0,
      cached_content_token_count: 0,
    },
    model_version: 'test-model',
    response_id: 'response-123',
    ...overrides,
  };
}
function createAidaEvent(overrides: Partial<AidaClient.AidaRegisterClientEvent> = {}):
    AidaClient.AidaRegisterClientEvent {
  return {
    corresponding_aida_rpc_global_id: '123',
    disable_user_content_logging: false,
    ...overrides,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function describeCommonRequestFields(
    aidaRequestFactory: (overrides: any) => any,
    translateFn: (req: any) => GcaTypes.GenerateContentRequest,
) {
  describe('common fields', () => {
    it('maps common options and metadata', () => {
      const aidaRequest = aidaRequestFactory({
        options: {temperature: 0.5, model_id: 'test-model'},
        metadata: {string_session_id: 'session-123'},
      });
      const result = translateFn(aidaRequest);
      assert.strictEqual(result.model, 'test-model');
      assert.strictEqual(result.session_id, 'session-123');
      assert.strictEqual(result.generation_config?.temperature, 0.5);
    });

    it('maps client and feature labels', () => {
      const aidaRequest = aidaRequestFactory({
        functionality_type: AidaClient.FunctionalityType.EXPLAIN_ERROR,
        client_feature: AidaClient.ClientFeature.CHROME_CONSOLE_INSIGHTS,
      });
      const result = translateFn(aidaRequest);
      assert.strictEqual(result.labels?.['client'], DEFAULT_CLIENT);
      assert.strictEqual(result.labels?.['functionality_type'], 'EXPLAIN_ERROR');
      assert.strictEqual(result.labels?.['client_feature'], 'CHROME_CONSOLE_INSIGHTS');
    });
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

describe('AidaGcaTranslation', () => {
  describe('AIDA DoConversationRequest to GCA GenerateContentRequest', () => {
    describeCommonRequestFields(
        createAidaDoConversationRequest, AidaGcaTranslation.aidaDoConversationRequestToGcaRequest);

    it('translates a basic request', () => {
      assert.deepEqual(
          AidaGcaTranslation.aidaDoConversationRequestToGcaRequest(createAidaDoConversationRequest()),
          createGcaRequest());
    });

    it('translates a request with preamble and options', () => {
      const aidaRequest = createAidaDoConversationRequest({
        preamble: 'You are an AI assistant',
        options: {temperature: 0.5, model_id: 'test-model'},
      });

      const expectedGcaRequest = createGcaRequest({
        model: 'test-model',
        system_instruction: {role: 'user', parts: [{text: 'You are an AI assistant'}]},
        generation_config: {temperature: 0.5},
      });

      assert.deepEqual(AidaGcaTranslation.aidaDoConversationRequestToGcaRequest(aidaRequest), expectedGcaRequest);
    });

    it('translates a request with historical contexts', () => {
      const aidaRequest = createAidaDoConversationRequest({
        historical_contexts: [
          {parts: [{text: 'Hello'}], role: AidaClient.Role.USER},
          {parts: [{text: 'Hi there!'}], role: AidaClient.Role.MODEL},
        ],
        current_message: {parts: [{text: 'How are you?'}], role: AidaClient.Role.USER},
      });

      const expectedGcaRequest = createGcaRequest({
        contents: [
          {role: 'user', parts: [{text: 'Hello'}]},
          {role: 'model', parts: [{text: 'Hi there!'}]},
          {role: 'user', parts: [{text: 'How are you?'}]},
        ],
      });

      assert.deepEqual(AidaGcaTranslation.aidaDoConversationRequestToGcaRequest(aidaRequest), expectedGcaRequest);
    });

    it('translates a request with function declarations', () => {
      const aidaRequest = createAidaDoConversationRequest({
        function_declarations: [{
          name: 'my_func',
          description: 'A description',
          parameters: {
            type: AidaClient.ParametersTypes.OBJECT,
            description: 'Params',
            properties: {arg1: {type: AidaClient.ParametersTypes.STRING, description: 'An arg'}},
            required: ['arg1'],
          },
        }],
      });

      const expectedGcaRequest = createGcaRequest({
        tools: [{
          function_declarations: [{
            name: 'my_func',
            description: 'A description',
            parameters: {
              type: GcaTypes.Type.OBJECT,
              description: 'Params',
              properties: {arg1: {type: GcaTypes.Type.STRING, description: 'An arg'}},
              required: ['arg1'],
            },
          }],
        }],
      });

      assert.deepEqual(AidaGcaTranslation.aidaDoConversationRequestToGcaRequest(aidaRequest), expectedGcaRequest);
    });
  });

  describe('GCA GenerateContentResponse to AIDA DoConversationResponse', () => {
    it('translates a basic response', () => {
      assert.deepEqual(AidaGcaTranslation.gcaResponseToAidaDoConversationResponse(createGcaResponse()), {
        explanation: 'Hello there!',
        metadata: {rpcGlobalId: 'response-123'},
        functionCalls: undefined,
        completed: true,
      });
    });

    it('translates a response with function calls', () => {
      const gcaResponse = createGcaResponse({
        candidates: [{
          index: 0,
          content: {
            role: 'model',
            parts: [
              {text: 'I am calling a function.'},
              {function_call: {name: 'my_func', args: {arg1: 'val1'}}},
            ],
          },
          finish_reason: GcaTypes.FinishReason.STOP,
          safety_ratings: [],
          citation_metadata: {citations: []},
          grounding_metadata: {},
          aicode_output: {contents: []},
        }],
      });

      assert.deepEqual(AidaGcaTranslation.gcaResponseToAidaDoConversationResponse(gcaResponse), {
        explanation: 'I am calling a function.',
        metadata: {rpcGlobalId: 'response-123'},
        functionCalls: [{name: 'my_func', args: {arg1: 'val1'}}],
        completed: true,
      });
    });
  });

  describe('convert Aida parts to GCA parts', () => {
    it('translates function response part', () => {
      const aidaRequest = createAidaDoConversationRequest({
        current_message: {
          parts: [
            {functionResponse: {name: 'my_func1', response: {result: 'ok'}}},
            {functionResponse: {name: 'my_func2', response: {output: 'abcd'}}},
            {functionResponse: {name: 'my_func3', response: {error: 'error'}}},
            {functionResponse: {name: 'my_func4', response: {somethingElse: 'zxy'}}},
          ],
          role: AidaClient.Role.USER,
        },
      });

      const gcaRequest = AidaGcaTranslation.aidaDoConversationRequestToGcaRequest(aidaRequest);
      assert.deepEqual(gcaRequest.contents[0].parts, [
        {function_response: {name: 'my_func1', response: {output: 'ok'}}},
        {function_response: {name: 'my_func2', response: {output: 'abcd'}}},
        {function_response: {name: 'my_func3', response: {error: 'error'}}},
        {function_response: {name: 'my_func4', response: {output: {somethingElse: 'zxy'}}}},
      ]);
    });

    it('translates inline data part', () => {
      const aidaRequest = createAidaDoConversationRequest({
        current_message: {
          parts: [{inlineData: {mimeType: 'image/png', data: 'base64data'}}],
          role: AidaClient.Role.USER,
        },
      });

      const gcaRequest = AidaGcaTranslation.aidaDoConversationRequestToGcaRequest(aidaRequest);
      assert.deepEqual(gcaRequest.contents[0].parts?.[0], {
        inline_data: {mime_type: 'image/png', data: 'base64data'},
      });
    });
  });

  describe('AidaClientEvent to GCA TelemetryRequest', () => {
    const telemetryCases = [
      {
        name: 'translates positive sentiment feedback',
        event: {do_conversation_client_event: {user_feedback: {sentiment: AidaClient.Rating.POSITIVE}}},
        expectedMetric: {suggestion_interaction: {interaction: GcaTypes.InteractionType.THUMBS_UP}},
      },
      {
        name: 'translates negative sentiment feedback',
        event: {do_conversation_client_event: {user_feedback: {sentiment: AidaClient.Rating.NEGATIVE}}},
        expectedMetric: {suggestion_interaction: {interaction: GcaTypes.InteractionType.THUMBS_DOWN}},
      },
      {
        name: 'translates code completion impression',
        event: {
          complete_code_client_event: {
            user_impression: {
              sample: {sample_id: 1},
              latency: {duration: {seconds: 1, nanos: 500000000}},
            },
          },
        },
        expectedMetric: {
          suggestion_offered: {
            method: GcaTypes.Method.COMPLETE_CODE,
            status: GcaTypes.SuggestionStatus.NO_ERROR,
            response_latency: '1.5s',
          },
        },
      },
      {
        name: 'translates code completion acceptance',
        event: {complete_code_client_event: {user_acceptance: {sample: {sample_id: 5}}}},
        expectedMetric: {suggestion_interaction: {interaction: GcaTypes.InteractionType.ACCEPT, candidate_index: 5}},
      },
      {
        name: 'translates code generation impression',
        event: {
          generate_code_client_event: {
            user_impression: {
              sample: {sample_id: 1},
              latency: {duration: {seconds: 2, nanos: 0}},
            },
          },
        },
        expectedMetric: {
          suggestion_offered: {
            method: GcaTypes.Method.GENERATE_CODE,
            status: GcaTypes.SuggestionStatus.NO_ERROR,
            response_latency: '2s',
          },
        },
      },
    ];

    for (const {name, event, expectedMetric} of telemetryCases) {
      it(name, () => {
        const clientEvent = createAidaEvent(event);
        const telemetryRequest = AidaGcaTranslation.aidaEventToGcaTelemetryRequest(clientEvent);
        assert.lengthOf(telemetryRequest.feedback_metrics, 1);
        assert.strictEqual(telemetryRequest.feedback_metrics[0].response_id, '123');
        if (expectedMetric.suggestion_interaction) {
          assert.deepEqual(
              telemetryRequest.feedback_metrics[0].suggestion_interaction, expectedMetric.suggestion_interaction);
        }
        if (expectedMetric.suggestion_offered) {
          assert.deepEqual(telemetryRequest.feedback_metrics[0].suggestion_offered, expectedMetric.suggestion_offered);
        }
      });
    }

    it('returns empty metrics when no event is present', () => {
      const telemetryRequest = AidaGcaTranslation.aidaEventToGcaTelemetryRequest(createAidaEvent());
      assert.lengthOf(telemetryRequest.feedback_metrics, 0);
    });

    it('handles conversation event without sentiment', () => {
      const telemetryRequest = AidaGcaTranslation.aidaEventToGcaTelemetryRequest(
          createAidaEvent({do_conversation_client_event: {user_feedback: {}}}));
      assert.lengthOf(telemetryRequest.feedback_metrics, 0);
    });
  });

  function createAidaCompletionRequest(overrides: Partial<AidaClient.CompletionRequest> = {}):
      AidaClient.CompletionRequest {
    const {metadata, ...otherOverrides} = overrides;
    return {
      client: DEFAULT_CLIENT,
      prefix: 'function foo() {',
      suffix: '}',
      metadata: {...DEFAULT_METADATA, ...metadata},
      ...otherOverrides,
    };
  }

  describe('AIDA CompletionRequest to GCA GenerateContentRequest', () => {
    describeCommonRequestFields(createAidaCompletionRequest, AidaGcaTranslation.aidaCompletionRequestToGcaRequest);

    it('translates a basic completion request', () => {
      assert.deepEqual(
          AidaGcaTranslation.aidaCompletionRequestToGcaRequest(createAidaCompletionRequest()),
          createGcaRequest({contents: [{role: 'user', parts: [{text: 'function foo() {}'}]}]}));
    });

    it('translates a completion request with options and additional files', () => {
      const aidaRequest = createAidaCompletionRequest({
        prefix: 'console.log(',
        suffix: undefined,
        options: {
          temperature: 0,
          model_id: 'code-model',
          inference_language: AidaClient.AidaInferenceLanguage.JAVASCRIPT,
          stop_sequences: ['\n'],
        },
        metadata: {...DEFAULT_METADATA, string_session_id: 'session-456'},
        last_user_action: AidaClient.EditType.ADD,
        additional_files: [
          {path: 'utils.js', content: 'export const log = () => {}', included_reason: AidaClient.Reason.CURRENTLY_OPEN}
        ],
      });

      const expectedGcaRequest = createGcaRequest({
        contents: [{role: 'user', parts: [{text: 'console.log('}]}],

        model: 'code-model',
        session_id: 'session-456',
        generation_config: {stop_sequences: ['\n'], temperature: 0},
        labels: {client: DEFAULT_CLIENT, last_user_action: 'ADD', inference_language: 'JAVASCRIPT'},
        aicode: {
          experience: 'completion',
          files: [{file_uri: 'utils.js', inclusion_reason: [GcaTypes.InclusionReason.OPEN]}],
        },
      });

      assert.deepEqual(AidaGcaTranslation.aidaCompletionRequestToGcaRequest(aidaRequest), expectedGcaRequest);
    });
  });

  describe('GCA GenerateContentResponse to AIDA CompletionResponse', () => {
    it('translates a basic completion response', () => {
      const gcaResponse = createGcaResponse({
        model_version: 'code-model',
        response_id: 'response-456',
        candidates: [{
          index: 0,
          content: {role: 'model', parts: [{text: '"hello")'}]},
          finish_reason: GcaTypes.FinishReason.STOP,
          safety_ratings: [],
          citation_metadata: {citations: []},
          grounding_metadata: {},
          aicode_output: {contents: []},
        }],
      });

      assert.deepEqual(AidaGcaTranslation.gcaResponseToAidaCompletionResponse(gcaResponse), {
        generatedSamples: [{
          generationString: '"hello")',
          score: 0,
          sampleId: 0,
          attributionMetadata: {attributionAction: AidaClient.RecitationAction.CITE, citations: []}
        }],
        metadata: {rpcGlobalId: 'response-456'},
      });
    });
  });

  function createAidaGenerateCodeRequest(overrides: Partial<AidaClient.GenerateCodeRequest> = {}):
      AidaClient.GenerateCodeRequest {
    const {metadata, ...otherOverrides} = overrides;
    return {
      client: DEFAULT_CLIENT,
      preamble: 'Generate a function',
      current_message: {parts: [{text: 'that adds two numbers'}], role: AidaClient.Role.USER},
      use_case: AidaClient.UseCase.CODE_GENERATION,
      metadata: {...DEFAULT_METADATA, ...metadata},
      ...otherOverrides,
    };
  }

  describe('AIDA GenerateCodeRequest to GCA GenerateContentRequest', () => {
    describeCommonRequestFields(createAidaGenerateCodeRequest, AidaGcaTranslation.aidaGenerateCodeRequestToGcaRequest);

    it('translates a basic generate code request', () => {
      assert.deepEqual(AidaGcaTranslation.aidaGenerateCodeRequestToGcaRequest(createAidaGenerateCodeRequest()), {
        contents: [{role: 'user', parts: [{text: 'that adds two numbers'}]}],
        system_instruction: {role: 'user', parts: [{text: 'Generate a function'}]},
        labels: {client: DEFAULT_CLIENT, use_case: 'CODE_GENERATION'},
      });
    });

    it('translates a generate code request with options and context files', () => {
      const aidaRequest = createAidaGenerateCodeRequest({
        preamble: 'Help me with this',
        current_message: {parts: [{text: 'fix the bug'}], role: AidaClient.Role.USER},
        options: {
          temperature: 0.7,
          model_id: 'gen-model',
          inference_language: AidaClient.AidaInferenceLanguage.TYPESCRIPT,
          expect_code_output: true,
        },
        client_feature: AidaClient.ClientFeature.CHROME_FILE_AGENT,
        metadata: {...DEFAULT_METADATA, string_session_id: 'session-789'},
        context_files: [{
          path: 'app.ts',
          full_content: 'console.log("bug")',
          programming_language: AidaClient.AidaInferenceLanguage.TYPESCRIPT
        }],
      });

      const expectedGcaRequest = createGcaRequest({
        contents: [{role: 'user', parts: [{text: 'fix the bug'}]}],
        system_instruction: {role: 'user', parts: [{text: 'Help me with this'}]},
        model: 'gen-model',
        session_id: 'session-789',
        generation_config: {temperature: 0.7},
        labels: {
          client: DEFAULT_CLIENT,
          use_case: 'CODE_GENERATION',
          inference_language: 'TYPESCRIPT',
          expect_code_output: 'true',
          client_feature: 'CHROME_FILE_AGENT',
        },
        aicode: {
          experience: 'generate_code',
          files: [{file_uri: 'app.ts', programming_language: 'TYPESCRIPT'}],
        },
      });

      assert.deepEqual(AidaGcaTranslation.aidaGenerateCodeRequestToGcaRequest(aidaRequest), expectedGcaRequest);
    });
  });

  describe('GCA GenerateContentResponse to AIDA GenerateCodeResponse', () => {
    it('translates a basic generate code response', () => {
      const gcaResponse = createGcaResponse({
        model_version: 'gen-model',
        response_id: 'response-789',
        candidates: [{
          index: 0,
          content: {role: 'model', parts: [{text: 'const add = (a, b) => a + b;'}]},
          finish_reason: GcaTypes.FinishReason.STOP,
          safety_ratings: [],
          citation_metadata: {citations: []},
          grounding_metadata: {},
          aicode_output: {contents: []},
        }],
      });

      assert.deepEqual(AidaGcaTranslation.gcaResponseToAidaGenerateCodeResponse(gcaResponse), {
        samples: [{
          generationString: 'const add = (a, b) => a + b;',
          score: 0,
          sampleId: 0,
          attributionMetadata: {attributionAction: AidaClient.RecitationAction.CITE, citations: []},
        }],
        metadata: {rpcGlobalId: 'response-789'},
      });
    });
  });
});
