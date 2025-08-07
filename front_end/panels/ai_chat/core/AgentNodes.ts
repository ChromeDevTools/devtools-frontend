// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { getTools } from '../tools/Tools.js';
import { ChatMessageEntity, type ModelChatMessage, type ToolResultMessage, type ChatMessage, type AgentSessionMessage } from '../ui/ChatView.js';
import { ConfigurableAgentTool } from '../agent_framework/ConfigurableAgentTool.js';

import { LLMClient } from '../LLM/LLMClient.js';
import type { LLMMessage } from '../LLM/LLMTypes.js';
import { AIChatPanel } from '../ui/AIChatPanel.js';
import { createSystemPromptAsync, getAgentToolsFromState } from './GraphHelpers.js';
import { createLogger } from './Logger.js';
import type { AgentState } from './State.js';
import type { Runnable } from './Types.js';
import { AgentErrorHandler } from './AgentErrorHandler.js';
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
            tools: getAgentToolsFromState(state).map(t => t.name),
            lastMessage: state.messages.length > 0 ? {
              entity: state.messages[state.messages.length - 1].entity,
              content: JSON.stringify(state.messages[state.messages.length - 1]).substring(0, 500)
            } : null
          }
        }, tracingContext.traceId);

        // Update tracing context with current generation ID
        tracingContext.currentGenerationId = generationId;
      }

      try {
        const llm = LLMClient.getInstance();
        
        // Get provider for the specific model
        const provider = AIChatPanel.getProviderForModel(this.modelName);
        
        // Get tools for the current agent type
        const tools = getAgentToolsFromState(state);
        
        // Convert ChatMessage[] to LLMMessage[]
        const llmMessages = this.convertChatMessagesToLLMMessages(state.messages);
        
        // Create error handler for retry logic
        const errorHandler = AgentErrorHandler.createErrorHandler({
          continueOnError: true,
          agentName: `AgentNode-${this.modelName}`,
          availableTools: tools.map(t => t.name)
        });
        
        // Execute LLM call with retry logic
        const retryResult = await errorHandler.executeWithRetry(
          async () => {
            // Call LLM
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
            const parsed = llm.parseResponse(response);
            
            // Return both response and parsed action
            return { response, parsedAction: parsed };
          },
          // Validation function - check if parsing was successful
          (result) => result.parsedAction.type !== 'error',
          // Retry configuration
          {
            maxRetries: 5,
            baseDelayMs: 1000,
            maxDelayMs: 5000,
            backoffMultiplier: 2
          }
        );
        
        // Handle retry result
        if (!retryResult.success) {
          throw new Error(`Failed after ${retryResult.attemptsMade} attempts: ${retryResult.error}`);
        }
        
        const { response, parsedAction } = retryResult.result!;

        // Update generation observation with output
        if (generationId && tracingContext?.traceId) {
          // Extract token usage from rawResponse if available
          const rawUsage = response.rawResponse?.usage;
          const usage = rawUsage ? {
            promptTokens: rawUsage.prompt_tokens || rawUsage.input_tokens || 0,
            completionTokens: rawUsage.completion_tokens || rawUsage.output_tokens || 0,
            totalTokens: rawUsage.total_tokens || 0
          } : undefined;

          await this.tracingProvider.updateObservation(generationId, {
            endTime: new Date(),
            output: parsedAction,
            ...(usage && { usage })
          });
        }

        // Directly create the ModelChatMessage object
        let newModelMessage: ModelChatMessage;
        if (parsedAction.type === 'tool_call') {
          const toolCallId = crypto.randomUUID(); // Generate unique ID for OpenAI format
          
          // Create tool-call event observation
          const tracingContext = state.context?.tracingContext;
          if (tracingContext?.traceId) {
            const toolCallObservationId = `tool-call-${parsedAction.name}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            await this.tracingProvider.createObservation({
              id: toolCallObservationId,
              name: `Tool Call Decision: ${parsedAction.name}`,
              type: 'event',
              startTime: new Date(),
              parentObservationId: tracingContext.currentGenerationId || tracingContext.parentObservationId,
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
            
            // Update tracing context with tool call observation ID for tool execution
            tracingContext.currentToolCallId = toolCallObservationId;
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
          await this.tracingProvider.updateObservation(generationId, {
            endTime: new Date(),
            error: error instanceof Error ? error.message : String(error)
          });
        }
        
        throw error;
      }
    }

    resetCallCount(): void {
      logger.debug(`Resetting call count from ${this.callCount} to 0`);
      this.callCount = 0;
    }

    /**
     * Sanitizes tool result data for text representation by removing fields
     * that shouldn't be sent to the LLM (imageData, success, etc.)
     */
    private sanitizeToolResultForText(toolResultData: any): any {
      if (typeof toolResultData !== 'object' || toolResultData === null) {
        return toolResultData;
      }

      // Create a shallow copy
      const sanitized = { ...toolResultData };

      // Remove fields that shouldn't be sent to LLM
      const fieldsToRemove = [
        'imageData',    // Prevents token waste from base64 strings
        'success',      // LLM should infer success from error presence
        'dataUrl',      // Legacy image field if any
        'agentSession', // Avoid sending session data to LLM
      ];

      fieldsToRemove.forEach(field => {
        if (sanitized.hasOwnProperty(field)) {
          delete sanitized[field];
        }
      });

      return sanitized;
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
            let content = msg.resultText;
            
            // Try to parse and sanitize if it's JSON (structured tool result)
            if (typeof msg.resultText === 'string') {
              try {
                const parsed = JSON.parse(msg.resultText);
                const sanitized = this.sanitizeToolResultForText(parsed);
                content = JSON.stringify(sanitized);
              } catch {
                // Not JSON, use as-is (simple string tool result)
                content = msg.resultText;
              }
            } else if (typeof msg.resultText === 'object' && msg.resultText !== null) {
              // Already an object, sanitize directly
              const sanitized = this.sanitizeToolResultForText(msg.resultText);
              content = JSON.stringify(sanitized);
            }
            
            llmMessages.push({
              role: 'tool',
              content: String(content),
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
      
      // Initialize messages array with current state
      const messages = [...state.messages];

      const selectedTool = this.toolMap.get(toolName);
      if (!selectedTool) {
        throw new Error(`Tool ${toolName} not found`);
      }

      // Create span for tool execution
      const tracingContext = state.context?.tracingContext;
      let spanId: string | undefined;
      const spanStartTime = new Date();
      const isConfigurableAgent = selectedTool instanceof ConfigurableAgentTool;

      console.log(`[HIERARCHICAL_TRACING] ToolExecutorNode: Creating span for ${toolName}:`, {
        hasTracingContext: !!tracingContext,
        traceId: tracingContext?.traceId,
        currentToolCallId: tracingContext?.currentToolCallId,
        parentObservationId: tracingContext?.parentObservationId,
        toolName,
        toolCallId,
        isConfigurableAgent,
        executionLevel: isConfigurableAgent ? 'agentrunner' : 'tool'
      });

      if (tracingContext?.traceId) {
        spanId = `tool-exec-${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        // Tool execution should be a span since it has duration
        try {
          await this.tracingProvider.createObservation({
            id: spanId,
            name: isConfigurableAgent ? `Agent Execution: ${toolName}` : `Tool Execution: ${toolName}`,
            type: 'span',
            startTime: spanStartTime,
            parentObservationId: tracingContext.currentToolCallId || tracingContext.parentObservationId,
            input: toolArgs,
            metadata: {
              toolName,
              toolCallId,
              phase: 'execution',
              executionLevel: isConfigurableAgent ? 'agentrunner' : 'tool',
              source: 'ToolExecutorNode',
              isConfigurableAgent
            }
          }, tracingContext.traceId);
          console.log(`[HIERARCHICAL_TRACING] ToolExecutorNode: Successfully created span:`, {
            spanId,
            toolName,
            isConfigurableAgent,
            spanName: isConfigurableAgent ? `Agent Execution: ${toolName}` : `Tool Execution: ${toolName}`
          });
        } catch (error) {
          console.error(`[HIERARCHICAL_TRACING] ToolExecutorNode: Failed to create span:`, error);
        }
      } else {
        console.log(`[HIERARCHICAL_TRACING] ToolExecutorNode: No tracing context or traceId available`);
      }

      try {

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
        
        // Create enhanced tracing context for ConfigurableAgentTool execution
        let executionContext = tracingContext || null;
        if (isConfigurableAgent && tracingContext && spanId) {
          executionContext = {
            ...tracingContext,
            currentAgentSpanId: spanId,
            parentObservationId: spanId, // Agent span becomes parent for AgentRunner operations
            executionLevel: 'agentrunner' as const,
            agentContext: {
              agentName: toolName,
              agentType: toolName,
              iterationCount: 0
            }
          };
          console.log(`[HIERARCHICAL_TRACING] ToolExecutorNode: Created enhanced tracing context for agent:`, {
            agentSpanId: spanId,
            agentName: toolName,
            executionLevel: executionContext.executionLevel,
            parentObservationId: executionContext.parentObservationId,
            currentAgentSpanId: executionContext.currentAgentSpanId
          });
        }  
              
        const result = await withTracingContext(executionContext, async () => {
          console.log(`[TOOL EXECUTION PATH 1] Inside withTracingContext for tool: ${toolName}`);
          return await selectedTool.execute(toolArgs as any);
        });
        console.log(`[TOOL EXECUTION PATH 1] ToolExecutorNode completed tool: ${toolName}`);

        // Check if result contains agentSession (ConfigurableAgentTool result)
        if (selectedTool instanceof ConfigurableAgentTool && result && typeof result === 'object' && 'agentSession' in result) {
          const agentSession = result.agentSession as any;
          console.log(`[AGENT SESSION] Captured agent session from ${toolName}:`, agentSession);
          
          // Log detailed session information
          console.log(`[AGENT SESSION] Session Details:`, {
            sessionId: agentSession.sessionId,
            agentName: agentSession.agentName,
            status: agentSession.status,
            messageCount: agentSession.messages?.length || 0,
            messages: agentSession.messages,
            nestedSessionCount: agentSession.nestedSessions?.length || 0,
            nestedSessions: agentSession.nestedSessions,
            tools: agentSession.tools,
            iterationCount: agentSession.iterationCount,
            maxIterations: agentSession.maxIterations,
            terminationReason: agentSession.terminationReason
          });
          
          // Log tool calls specifically
          if (agentSession.messages) {
            const toolCalls = agentSession.messages.filter((msg: any) => msg.type === 'tool_call');
            const toolResults = agentSession.messages.filter((msg: any) => msg.type === 'tool_result');
            console.log(`[AGENT SESSION] Tool Analysis:`, {
              totalMessages: agentSession.messages.length,
              toolCallCount: toolCalls.length,
              toolResultCount: toolResults.length,
              toolCalls: toolCalls,
              toolResults: toolResults,
              messageTypes: agentSession.messages.map((msg: any) => ({ type: msg.type, id: msg.id }))
            });
          }
          
          // Create AgentSessionMessage for UI rendering
          const agentSessionMessage: AgentSessionMessage = {
            entity: ChatMessageEntity.AGENT_SESSION,
            agentSession: result.agentSession as any,
            summary: `Agent ${toolName} execution completed`
          };
          
          console.log(`[AGENT SESSION] Created AgentSessionMessage:`, {
            sessionId: (result.agentSession as any).sessionId,
            agentName: (result.agentSession as any).agentName,
            status: (result.agentSession as any).status
          });
          
          // Add the AgentSessionMessage to the state immediately after tool result
          messages.push(agentSessionMessage);
        }

        // Special handling for ConfigurableAgentTool results
        if (selectedTool instanceof ConfigurableAgentTool && result && typeof result === 'object' && 'output' in result) {
          // For ConfigurableAgentTool, only send the output field to the LLM
          const agentResult = result as any; // Cast to any to access ConfigurableAgentResult properties
          resultText = agentResult.output || (agentResult.error ? `Error: ${agentResult.error}` : 'No output');
          console.log(`[AGENT SESSION] Filtered ConfigurableAgentTool result for LLM:`, {
            toolName,
            originalResult: result,
            filteredResult: resultText
          });
        } else if (toolName === 'finalize_with_critique') {
          logger.debug('ToolExecutorNode: finalize_with_critique result:', result);
          // Make sure the result is properly stringified
          resultText = typeof result === 'string' ? result : JSON.stringify(result);
        } else {
          resultText = JSON.stringify(result, null, 2);
        }

        isError = (typeof result === 'object' && result !== null && 'error' in result);

        // Complete the span with success
        if (spanId && tracingContext?.traceId) {
          try {
            const completionMetadata = {
              toolName,
              toolCallId,
              phase: 'completed',
              duration: Date.now() - spanStartTime.getTime(),
              success: !isError,
              executionLevel: isConfigurableAgent ? 'agentrunner' : 'tool',
              source: 'ToolExecutorNode',
              isConfigurableAgent,
              ...(isConfigurableAgent && {
                agentName: toolName,
                agentType: toolName,
                resultType: result && typeof result === 'object' && 'agentSession' in result ? 'agent_result' : 'unknown'
              })
            };

            await this.tracingProvider.updateObservation(spanId, {
              endTime: new Date(),
              output: isConfigurableAgent && result && typeof result === 'object' && 'output' in result 
                ? (result as any).output 
                : result,
              metadata: completionMetadata
            });
            console.log(`[HIERARCHICAL_TRACING] ToolExecutorNode: Successfully completed span:`, {
              spanId,
              toolName,
              success: !isError,
              isConfigurableAgent,
              duration: Date.now() - spanStartTime.getTime()
            });
          } catch (error) {
            console.error(`[HIERARCHICAL_TRACING] ToolExecutorNode: Failed to complete span:`, error);
          }
        }

      } catch (err) {
        resultText = `Error during tool execution: ${err instanceof Error ? err.message : String(err)}`;
        logger.error(resultText, { tool: toolName, args: toolArgs });
        isError = true;

        // Complete the span with error
        if (spanId && tracingContext?.traceId) {
          try {
            const errorMetadata = {
              toolName,
              toolCallId,
              phase: 'error',
              duration: Date.now() - spanStartTime.getTime(),
              success: false,
              executionLevel: isConfigurableAgent ? 'agentrunner' : 'tool',
              source: 'ToolExecutorNode',
              isConfigurableAgent,
              ...(isConfigurableAgent && {
                agentName: toolName,
                agentType: toolName
              })
            };

            await this.tracingProvider.updateObservation(spanId, {
              endTime: new Date(),
              error: err instanceof Error ? err.message : String(err),
              metadata: errorMetadata
            });
            console.log(`[HIERARCHICAL_TRACING] ToolExecutorNode: Successfully completed span with error:`, {
              spanId,
              toolName,
              error: err instanceof Error ? err.message : String(err),
              isConfigurableAgent
            });
          } catch (error) {
            console.error(`[HIERARCHICAL_TRACING] ToolExecutorNode: Failed to complete span with error:`, error);
          }
        }
      }

      // Create the NEW ToolResultMessage
      const toolResultMessage: ToolResultMessage = {
        entity: ChatMessageEntity.TOOL_RESULT,
        toolName,
        resultText,
        isError,
        toolCallId, // Link back to the tool call for OpenAI format
        ...(isError && { error: resultText }),
        // Mark if this is from a ConfigurableAgentTool
        ...(selectedTool instanceof ConfigurableAgentTool && { isFromConfigurableAgent: true })
      };

      logger.debug('ToolExecutorNode: Adding tool result message with toolCallId:', { toolCallId, toolResultMessage });

      // Add the result message to the final messages array
      messages.push(toolResultMessage);
      
      // Add the result message to the state
      const newState = {
        ...state,
        messages: [...messages],
        error: isError ? resultText : undefined,
      };
      
      console.log(`[AGENT SESSION] Returning state with ${newState.messages.length} messages`);
      
      return newState;
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
