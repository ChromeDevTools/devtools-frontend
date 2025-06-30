// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { getTools } from '../tools/Tools.js';
import { ChatMessageEntity, type ModelChatMessage, type ToolResultMessage, type ChatMessage } from '../ui/ChatView.js';

import { LLMClient } from '../LLM/LLMClient.js';
import type { LLMMessage } from '../LLM/LLMTypes.js';
import { AIChatPanel } from '../ui/AIChatPanel.js';
import { createSystemPromptAsync, getAgentToolsFromState } from './GraphHelpers.js';
import { createLogger } from './Logger.js';
import type { AgentState } from './State.js';
import type { Runnable } from './Types.js';
import { createTracingProvider, withTracingContext } from '../tracing/TracingConfig.js';
import type { TracingProvider } from '../tracing/TracingProvider.js';

const logger = createLogger('AgentNodes');

export function createAgentNode(modelName: string, temperature: number): Runnable<AgentState, AgentState> {
  const agentNode = new class AgentNode implements Runnable<AgentState, AgentState> {
    private modelName: string;
    private temperature: number;
    private callCount = 0;
    private readonly MAX_CALLS_PER_INTERACTION = 50;
    private tracingProvider: TracingProvider;

    constructor(modelName: string, temperature: number) {
      this.modelName = modelName;
      this.temperature = temperature;
      this.tracingProvider = createTracingProvider();
    }

    async invoke(state: AgentState): Promise<AgentState> {
      console.log('[AGENT NODE DEBUG] AgentNode invoke called, messages count:', state.messages.length);
      logger.debug('AgentNode: Invoked with state. Last message:',
        state.messages.length > 0 ? state.messages[state.messages.length - 1] : 'No messages');

      // Reset call count on new user message
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage?.entity === ChatMessageEntity.USER) {
        this.resetCallCount();
      }

      if (lastMessage?.entity === ChatMessageEntity.TOOL_RESULT && lastMessage?.toolName === 'finalize_with_critique') {
        logger.debug('Found finalize_with_critique tool result:', lastMessage);
        logger.debug('Raw resultText:', lastMessage.resultText);

        try {
          // Parse the result to check if the critique was accepted
          const result = JSON.parse(lastMessage.resultText);

          logger.debug('Finalize with critique parsed result:', result);
          logger.debug('Result properties', { accepted: result.accepted, satisfiesCriteria: result.satisfiesCriteria });

          // Check both accepted and satisfiesCriteria for compatibility
          const isAccepted = result.accepted === true || result.satisfiesCriteria === true;

          logger.debug('isAccepted decision:', isAccepted);

          if (isAccepted) {
            const answerText = result.answer;

            if (answerText) {
              const newModelMessage: ModelChatMessage = {
                entity: ChatMessageEntity.MODEL,
                action: 'final',
                answer: answerText,
                isFinalAnswer: true,
              };

              logger.debug('AgentNode: Created final answer message');

              return {
                ...state,
                messages: [...state.messages, newModelMessage],
                error: undefined,
              };
            }
            logger.warn('Coudnt find the answer');
          } else {
            // If critique rejected, return to agent with feedback
            logger.info('Critique REJECTED the answer - routing back to AGENT');
            logger.info('Critique feedback:', result.feedback || 'Critique rejected the answer without specific feedback');
          }
        } catch (error) {
          logger.error('Error parsing finalize_with_critique result:', error);
        }
      }

      // 1. Create the enhanced system prompt based on the current state (including selected type)
      const systemPrompt = await createSystemPromptAsync(state);

      // 2. Call the LLM with the message array
      this.callCount++;
      
      if (this.callCount > this.MAX_CALLS_PER_INTERACTION) {
        logger.warn('Max calls per interaction reached:', this.callCount);
        throw new Error(`Maximum calls (${this.MAX_CALLS_PER_INTERACTION}) per interaction exceeded. This might be an infinite loop.`);
      }

      logger.debug('Generating response with LLMClient:', {
        modelName: this.modelName,
        callCount: this.callCount,
        messageCount: state.messages.length,
      });

      // Create generation observation for LLM call
      const tracingContext = state.context?.tracingContext;
      let generationId: string | undefined;
      const generationStartTime = new Date();

      if (tracingContext?.traceId) {
        generationId = `gen-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        await this.tracingProvider.createObservation({
          id: generationId,
          name: 'LLM Generation',
          type: 'generation',
          startTime: generationStartTime,
          parentObservationId: tracingContext.parentObservationId,
          model: this.modelName,
          modelParameters: {
            temperature: this.temperature,
            provider: AIChatPanel.getProviderForModel(this.modelName)
          },
          input: {
            systemPrompt: systemPrompt.substring(0, 1000) + '...', // Truncate for tracing
            messages: state.messages.length,
            tools: getAgentToolsFromState(state).map(t => t.name)
          }
        }, tracingContext.traceId);
      }

      try {
        const llm = LLMClient.getInstance();
        
        // Get provider for the specific model
        const provider = AIChatPanel.getProviderForModel(this.modelName);
        
        // Get tools for the current agent type
        const tools = getAgentToolsFromState(state);
        
        // Convert ChatMessage[] to LLMMessage[]
        const llmMessages = this.convertChatMessagesToLLMMessages(state.messages);
        
        // Call LLM with the new API
        const response = await llm.call({
          provider,
          model: this.modelName,
          messages: llmMessages,
          systemPrompt,
          tools: tools.map(tool => ({
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.schema,
            }
          })),
          temperature: this.temperature,
        });

        // Parse the response
        const parsedAction = llm.parseResponse(response);

        // Update generation observation with output
        if (generationId && tracingContext?.traceId) {
          await this.tracingProvider.createObservation({
            id: generationId,
            name: 'LLM Generation', // Include name when updating
            type: 'generation',
            endTime: new Date(),
            output: parsedAction,
            // Note: Usage tracking would need to be extracted from response.rawResponse if needed
          }, tracingContext.traceId);
        }

        // Directly create the ModelChatMessage object
        let newModelMessage: ModelChatMessage;
        if (parsedAction.type === 'tool_call') {
          const toolCallId = crypto.randomUUID(); // Generate unique ID for OpenAI format
          
          // Create tool-call event observation
          const tracingContext = state.context?.tracingContext;
          if (tracingContext?.traceId) {
            await this.tracingProvider.createObservation({
              id: `event-tool-call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: `Tool Call: ${parsedAction.name}`,
              type: 'event',
              startTime: new Date(),
              input: {
                toolName: parsedAction.name,
                toolArgs: parsedAction.args,
                toolCallId,
                reasoning: response.reasoning?.summary
              },
              metadata: {
                llmModel: this.modelName,
                callCount: this.callCount,
                toolCallId,
                phase: 'tool_call_decision',
                provider: AIChatPanel.getProviderForModel(this.modelName)
              }
            }, tracingContext.traceId);
          }
          
          newModelMessage = {
            entity: ChatMessageEntity.MODEL,
            action: 'tool',
            toolName: parsedAction.name,
            toolArgs: parsedAction.args,
            toolCallId, // Add for linking with tool response
            isFinalAnswer: false,
            reasoning: response.reasoning?.summary,
          };

          logger.debug('AgentNode: Created tool message', { toolName: parsedAction.name, toolCallId });
          if (parsedAction.name === 'finalize_with_critique') {
            logger.debug('AgentNode: finalize_with_critique call with args:', JSON.stringify(parsedAction.args));
          }
        } else if (parsedAction.type === 'final_answer') {
          newModelMessage = {
            entity: ChatMessageEntity.MODEL,
            action: 'final',
            answer: parsedAction.answer,
            isFinalAnswer: true,
            reasoning: response.reasoning?.summary,
          };

          logger.debug('AgentNode: Created final answer message');
        } else {
          // Error case
          newModelMessage = {
            entity: ChatMessageEntity.MODEL,
            action: 'final',
            answer: parsedAction.error || 'An error occurred',
            isFinalAnswer: true,
            reasoning: response.reasoning?.summary,
          };

            logger.debug('AgentNode: Created error message');
        }

        logger.debug('New Model Message:', newModelMessage);

        return {
          ...state,
          messages: [...state.messages, newModelMessage],
          error: undefined,
        };
      } catch (error) {
        logger.error('Error generating response:', error);
        
        // Update generation observation with error
        if (generationId && tracingContext?.traceId) {
          await this.tracingProvider.createObservation({
            id: generationId,
            name: 'LLM Generation', // Include name when updating
            type: 'generation',
            endTime: new Date(),
            error: error instanceof Error ? error.message : String(error)
          }, tracingContext.traceId);
        }
        
        throw error;
      }
    }

    resetCallCount(): void {
      logger.debug(`Resetting call count from ${this.callCount} to 0`);
      this.callCount = 0;
    }


    /**
     * Convert ChatMessage[] to LLMMessage[]
     */
    private convertChatMessagesToLLMMessages(messages: ChatMessage[]): LLMMessage[] {
      const llmMessages: LLMMessage[] = [];
      
      for (const msg of messages) {
        if (msg.entity === ChatMessageEntity.USER) {
          // User message
          if ('text' in msg) {
            llmMessages.push({
              role: 'user',
              content: msg.text,
            });
          }
        } else if (msg.entity === ChatMessageEntity.MODEL) {
          // Model message
          if ('answer' in msg && msg.answer) {
            llmMessages.push({
              role: 'assistant',
              content: msg.answer,
            });
          } else if ('action' in msg && msg.action === 'tool' && 'toolName' in msg && 'toolArgs' in msg && 'toolCallId' in msg) {
            // Tool call message - convert from ModelChatMessage structure
            llmMessages.push({
              role: 'assistant',
              content: undefined,
              tool_calls: [{
                id: msg.toolCallId!,
                type: 'function' as const,
                function: {
                  name: msg.toolName!,
                  arguments: JSON.stringify(msg.toolArgs),
                }
              }],
            });
          }
        } else if (msg.entity === ChatMessageEntity.TOOL_RESULT) {
          // Tool result message
          if ('toolCallId' in msg && 'resultText' in msg) {
            llmMessages.push({
              role: 'tool',
              content: String(msg.resultText),
              tool_call_id: msg.toolCallId,
            });
          }
        }
      }
      
      return llmMessages;
    }
  }(modelName, temperature);
  return agentNode;
}

export function createToolExecutorNode(state: AgentState): Runnable<AgentState, AgentState> {
  const tools = getAgentToolsFromState(state); // Adjusted to use getAgentToolsFromState
  const toolMap = new Map<string, ReturnType<typeof getTools>[number]>();
  tools.forEach((tool: ReturnType<typeof getTools>[number]) => toolMap.set(tool.name, tool));

  const toolExecutorNode = new class ToolExecutorNode implements Runnable<AgentState, AgentState> {
    private toolMap: Map<string, ReturnType<typeof getTools>[number]>;
    private tracingProvider: TracingProvider;

    constructor(toolMap: Map<string, ReturnType<typeof getTools>[number]>) {
      this.toolMap = toolMap;
      this.tracingProvider = createTracingProvider();
    }

    async invoke(state: AgentState): Promise<AgentState> {
      const lastMessage = state.messages[state.messages.length - 1];

      // Expect the last message to be the MODEL action requesting the tool
      if (lastMessage?.entity !== ChatMessageEntity.MODEL || lastMessage.action !== 'tool' || !lastMessage.toolName) {
        logger.error('ToolExecutorNode: Expected last message to be a MODEL tool action.', lastMessage);
        return { ...state, error: 'Internal Error: Invalid state for tool execution.' };
      }

      // Get tool details from the ModelChatMessage
      const toolName = lastMessage.toolName;
      const toolArgs = lastMessage.toolArgs || {};
      const toolCallId = lastMessage.toolCallId; // Extract tool call ID for linking
      let resultText: string;
      let isError = false;

      // Create span for tool execution
      const tracingContext = state.context?.tracingContext;
      let spanId: string | undefined;
      const spanStartTime = new Date();

      if (tracingContext?.traceId) {
        spanId = `tool-${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        // Tool execution should be a span since it has duration
        await this.tracingProvider.createObservation({
          id: spanId,
          name: `Tool: ${toolName}`,
          type: 'span',
          startTime: spanStartTime,
          parentObservationId: tracingContext.parentObservationId,
          input: toolArgs,
          metadata: {
            toolName,
            toolCallId,
            phase: 'execution'
          }
        }, tracingContext.traceId);
      }

      try {
        const selectedTool = this.toolMap.get(toolName);
        if (!selectedTool) {
          throw new Error(`Tool ${toolName} not found`);
        }

        // Execute the tool with tracing context, casting toolArgs to any to satisfy the specific tool signature
        logger.info(`Executing tool ${toolName} with tracing context:`, { 
          hasTracingContext: !!tracingContext, 
          traceId: tracingContext?.traceId,
          toolName 
        });
        console.log(`[TRACING DEBUG] Executing tool ${toolName} with tracing context:`, { 
          hasTracingContext: !!tracingContext, 
          traceId: tracingContext?.traceId,
          toolName 
        });
        
        console.log(`[TOOL EXECUTION PATH 1] ToolExecutorNode about to execute tool: ${toolName}`);
        const result = await withTracingContext(tracingContext, async () => {
          console.log(`[TOOL EXECUTION PATH 1] Inside withTracingContext for tool: ${toolName}`);
          return await selectedTool.execute(toolArgs as any);
        });
        console.log(`[TOOL EXECUTION PATH 1] ToolExecutorNode completed tool: ${toolName}`);

        // Special handling for finalize_with_critique tool results to ensure proper format
        if (toolName === 'finalize_with_critique') {
          logger.debug('ToolExecutorNode: finalize_with_critique result:', result);
          // Make sure the result is properly stringified
          resultText = typeof result === 'string' ? result : JSON.stringify(result);
        } else {
          resultText = JSON.stringify(result, null, 2);
        }

        isError = (typeof result === 'object' && result !== null && 'error' in result);

        // Complete the span with success
        if (spanId && tracingContext?.traceId) {
          await this.tracingProvider.createObservation({
            id: `${spanId}-complete`,
            name: `Tool Complete: ${toolName}`,
            type: 'span',
            startTime: new Date(),
            endTime: new Date(),
            parentObservationId: tracingContext.parentObservationId,
            output: result,
            metadata: {
              toolName,
              toolCallId,
              phase: 'complete',
              duration: Date.now() - spanStartTime.getTime(),
              parentSpanId: spanId
            }
          }, tracingContext.traceId);
        }

      } catch (err) {
        resultText = `Error during tool execution: ${err instanceof Error ? err.message : String(err)}`;
        logger.error(resultText, { tool: toolName, args: toolArgs });
        isError = true;

        // Complete the span with error
        if (spanId && tracingContext?.traceId) {
          await this.tracingProvider.createObservation({
            id: `${spanId}-error`,
            name: `Tool Error: ${toolName}`,
            type: 'span',
            startTime: new Date(),
            endTime: new Date(),
            parentObservationId: tracingContext.parentObservationId,
            error: err instanceof Error ? err.message : String(err),
            metadata: {
              toolName,
              toolCallId,
              phase: 'error',
              duration: Date.now() - spanStartTime.getTime(),
              parentSpanId: spanId
            }
          }, tracingContext.traceId);
        }
      }

      // Create the NEW ToolResultMessage
      const toolResultMessage: ToolResultMessage = {
        entity: ChatMessageEntity.TOOL_RESULT,
        toolName,
        resultText,
        isError,
        toolCallId, // Link back to the tool call for OpenAI format
        ...(isError && { error: resultText })
      };

      logger.debug('ToolExecutorNode: Adding tool result message with toolCallId:', { toolCallId, toolResultMessage });

      // Add the result message to the state
      return {
        ...state,
        messages: [...state.messages, toolResultMessage],
        error: isError ? resultText : undefined,
      };
    }
  }(toolMap);
  return toolExecutorNode;
}

export function createFinalNode(): Runnable<AgentState, AgentState> {
  const finalNode = new class FinalNode implements Runnable<AgentState, AgentState> {
    async invoke(state: AgentState): Promise<AgentState> {
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage?.entity !== ChatMessageEntity.MODEL || !lastMessage.isFinalAnswer) {
        logger.warn('FinalNode: Invoked, but last message was not a final MODEL answer as expected.');
      }
      // Node remains simple, just returns state, assuming AgentNode set it correctly.
      return {
        ...state,
        error: undefined, // Clear any errors from previous steps
      };
    }
  }();
  return finalNode;
}
