// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { enhancePromptWithPageContext } from '../core/PageInfoManager.js';
import { LLMClient } from '../LLM/LLMClient.js';
import type { LLMResponse, LLMMessage } from '../LLM/LLMTypes.js';
import type { Tool } from '../tools/Tools.js';
import { AIChatPanel } from '../ui/AIChatPanel.js';
import { ChatMessageEntity, type ChatMessage, type ModelChatMessage, type ToolResultMessage } from '../ui/ChatView.js';
import { createLogger } from '../core/Logger.js';
import { createTracingProvider, getCurrentTracingContext } from '../tracing/TracingConfig.js';
import type { AgentSession, AgentMessage } from './AgentSessionTypes.js';
import { AgentErrorHandler } from '../core/AgentErrorHandler.js';

const logger = createLogger('AgentRunner');

import { ConfigurableAgentTool, ToolRegistry, type ConfigurableAgentArgs, type ConfigurableAgentResult, type AgentRunTerminationReason, type HandoffConfig /* , HandoffContextTransform, ContextFilterRegistry*/ } from './ConfigurableAgentTool.js';

/**
 * Configuration for the AgentRunner
 */
export interface AgentRunnerConfig {
  apiKey: string;
  modelName: string;
  systemPrompt: string;
  tools: Array<Tool<any, any>>;
  maxIterations: number;
  temperature?: number;
}

/**
 * Hooks for customizing AgentRunner behavior
 */
export interface AgentRunnerHooks {
  /** Function to potentially modify messages before the first LLM call */
  prepareInitialMessages?: (messages: ChatMessage[]) => ChatMessage[];
  /** Function to create a success result */
  createSuccessResult: (output: string, intermediateSteps: ChatMessage[], reason: AgentRunTerminationReason) => ConfigurableAgentResult;
  /** Function to create an error result */
  createErrorResult: (error: string, intermediateSteps: ChatMessage[], reason: AgentRunTerminationReason) => ConfigurableAgentResult;
}


/**
 * Runs the core agent execution loop
 */
export class AgentRunner {
  private static currentSession: AgentSession | null = null;

  /**
   * Add a message to the current session
   */
  private static addSessionMessage(message: Partial<AgentMessage>): void {
    if (!this.currentSession) {
      return;
    }

    const fullMessage: AgentMessage = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...message
    } as AgentMessage;

    this.currentSession.messages.push(fullMessage);
  }
  /**
   * Helper function to convert ChatMessage[] to LLMMessage[]
   */
  private static convertToLLMMessages(messages: ChatMessage[]): LLMMessage[] {
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
        const modelMsg = msg as ModelChatMessage;
        if (modelMsg.action === 'final' && modelMsg.answer) {
          llmMessages.push({
            role: 'assistant',
            content: modelMsg.answer,
          });
        } else if (modelMsg.action === 'tool' && modelMsg.toolCallId) {
          // Tool call message
          llmMessages.push({
            role: 'assistant',
            content: undefined,
            tool_calls: [{
              id: modelMsg.toolCallId,
              type: 'function',
              function: {
                name: modelMsg.toolName || '',
                arguments: JSON.stringify(modelMsg.toolArgs || {}),
              }
            }],
          });
        }
      } else if (msg.entity === ChatMessageEntity.TOOL_RESULT) {
        // Tool result message
        const toolResult = msg as ToolResultMessage;
        if (toolResult.toolCallId && toolResult.resultText) {

          // Check if tool result includes image data
          const hasImageData = toolResult.imageData && typeof toolResult.imageData === 'string';

          if (hasImageData) {
            // Create multimodal content (text + image)
            llmMessages.push({
              role: 'tool',
              content: [
                {
                  type: 'text',
                  text: toolResult.resultText
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: toolResult.imageData!,  // Safe to use ! since we checked hasImageData
                    detail: 'high' // Use high detail for tool-generated images
                  }
                }
              ],
              tool_call_id: toolResult.toolCallId,
            });
          } else {
            // Text-only behavior for tools without images
            let content = toolResult.resultText;

            // Append summary if present
            if (toolResult.summary) {
              content = content + '\n\n' + toolResult.summary;
            }

            llmMessages.push({
              role: 'tool',
              content: content,
              tool_call_id: toolResult.toolCallId,
            });
          }
        }
      }
    }

    return llmMessages;
  }

  /**
   * Sanitizes tool result data for text representation by removing fields
   * that shouldn't be sent to the LLM (imageData, success, etc.)
   */
  private static sanitizeToolResultForText(toolResultData: any): any {
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

  // Helper function to execute the handoff logic (to avoid duplication)
  private static async executeHandoff(
    currentMessages: ChatMessage[],
    originalArgs: ConfigurableAgentArgs,
    handoffConfig: HandoffConfig,
    executingAgent: ConfigurableAgentTool,
    apiKey: string,
    defaultModelName: string,
    defaultMaxIterations: number,
    defaultTemperature: number,
    defaultCreateSuccessResult: AgentRunnerHooks['createSuccessResult'],
    defaultCreateErrorResult: AgentRunnerHooks['createErrorResult'],
    llmToolArgs?: ConfigurableAgentArgs, // Specific args if triggered by LLM tool call
    parentSession?: AgentSession // For natural nesting
  ): Promise<ConfigurableAgentResult & { agentSession: AgentSession }> {
    const targetAgentName = handoffConfig.targetAgentName;
    const targetAgentTool = ToolRegistry.getRegisteredTool(targetAgentName);

    if (!(targetAgentTool instanceof ConfigurableAgentTool)) {
      const errorMsg = `Handoff target '${targetAgentName}' not found or is not a ConfigurableAgentTool.`;
      logger.error(`${errorMsg}`);
      // Create a minimal session for the error case
      const errorSession: AgentSession = {
        agentName: targetAgentName,
        sessionId: crypto.randomUUID(),
        status: 'error',
        startTime: new Date(),
        endTime: new Date(),
        messages: [],
        nestedSessions: [],
        tools: [],
        terminationReason: 'error'
      };
      // Use the default error creator from the initiating agent's context
      return { ...defaultCreateErrorResult(errorMsg, currentMessages, 'error'), agentSession: errorSession };
    }

    logger.info(`Initiating handoff from ${executingAgent.name} to ${targetAgentTool.name} (Trigger: ${handoffConfig.trigger || 'llm_tool_call'})`);

    let handoffMessages: ChatMessage[] = []; // Initialize handoff messages
    const targetConfig = targetAgentTool.config;

    // Determine the messages to hand off based on includeToolResults
    if (handoffConfig.includeToolResults && handoffConfig.includeToolResults.length > 0) {
      // Filter messages: keep user messages, final answers, and only tool calls/results for specified tools
      logger.info(`Filtering messages for handoff to ${targetAgentTool.name} based on includeToolResults.`);
      handoffMessages = currentMessages.filter(message => {
        if (message.entity === ChatMessageEntity.USER) {
          return true; // Always include user messages
        }
        if (message.entity === ChatMessageEntity.MODEL) {
          const modelMsg = message as ModelChatMessage;
          if (modelMsg.action === 'final') {
            return true; // Always include final answers
          }
          if (modelMsg.action === 'tool' && modelMsg.toolName) {
            return handoffConfig.includeToolResults!.includes(modelMsg.toolName); // Include tool calls for specified tools
          }
        }
        if (message.entity === ChatMessageEntity.TOOL_RESULT) {
          const toolResult = message as ToolResultMessage;
          return !toolResult.isError && toolResult.toolName && handoffConfig.includeToolResults!.includes(toolResult.toolName); // Include tool results for specified tools
        }
        return false; // Exclude other message types
      });
    } else {
      // No filter specified: pass the entire message history
      logger.info(`Passing full message history for handoff to ${targetAgentTool.name}.`);
      handoffMessages = [...currentMessages];
    }

    // Enhance the target agent's system prompt with page context
    const enhancedSystemPrompt = await enhancePromptWithPageContext(targetConfig.systemPrompt);

    // Construct Runner Config & Hooks for the target agent
    const targetRunnerConfig: AgentRunnerConfig = {
      apiKey,
      modelName: typeof targetConfig.modelName === 'function'
        ? targetConfig.modelName()
        : (targetConfig.modelName || defaultModelName),
      systemPrompt: enhancedSystemPrompt,
      tools: targetConfig.tools
              .map(toolName => ToolRegistry.getRegisteredTool(toolName))
              .filter((tool): tool is Tool<any, any> => tool !== null),
      maxIterations: targetConfig.maxIterations || defaultMaxIterations,
      temperature: targetConfig.temperature ?? defaultTemperature,
    };
    const targetRunnerHooks: AgentRunnerHooks = {
      prepareInitialMessages: undefined, // History already formed by transform or passthrough
      createSuccessResult: targetConfig.createSuccessResult
          ? (out, steps, reason) => targetConfig.createSuccessResult!(out, steps, reason, targetConfig)
          : defaultCreateSuccessResult, // Fallback to original runner's hook creator
      createErrorResult: targetConfig.createErrorResult
          ? (err, steps, reason) => targetConfig.createErrorResult!(err, steps, reason, targetConfig)
          : defaultCreateErrorResult, // Fallback to original runner's hook creator
    };

    // Determine args for the target agent: use llmToolArgs if provided, otherwise originalArgs
    const targetAgentArgs = llmToolArgs ?? originalArgs;

    logger.info(`Executing handoff target agent: ${targetAgentTool.name} with ${handoffMessages.length} messages.`);
    const handoffResult = await AgentRunner.run(
        handoffMessages,
        targetAgentArgs, // Use determined args
        targetRunnerConfig, // Pass the constructed config
        targetRunnerHooks,  // Pass the constructed hooks
        targetAgentTool, // Target agent is now the executing agent
        parentSession // Pass parent session for natural nesting
    );

    // Extract the result and session
    const { agentSession: childSession, ...actualResult } = handoffResult;

    // Add child session to parent's nested sessions (natural nesting)
    if (parentSession) {
      parentSession.nestedSessions.push(childSession);
    }

    logger.info(`Handoff target agent ${targetAgentTool.name} finished. Result success: ${actualResult.success}`);

    // Check if the target agent is configured to *include* intermediate steps
    if (targetAgentTool instanceof ConfigurableAgentTool && targetAgentTool.config.includeIntermediateStepsOnReturn === true) {
      // Combine message history if the target agent requests it
      logger.info(`Including intermediateSteps from ${targetAgentTool.name} based on its config.`);
      const combinedIntermediateSteps = [
          ...currentMessages, // History *before* the recursive call
          ...(actualResult.intermediateSteps || []) // History *from* the recursive call (should exist if flag is true)
      ];
      // Return the result from the target agent, but with combined history
      return {
          ...actualResult,
          intermediateSteps: combinedIntermediateSteps,
          terminationReason: actualResult.terminationReason || 'handed_off',
          agentSession: childSession
      };
    }
    // Otherwise (default), omit the target's intermediate steps
    logger.info(`Omitting intermediateSteps from ${targetAgentTool.name} based on its config (default or flag set to false).`);
    // Return result from target, ensuring intermediateSteps are omitted
    const finalResult = {
      ...actualResult,
      terminationReason: actualResult.terminationReason || 'handed_off',
      agentSession: childSession
    };
    // Explicitly delete intermediateSteps if they somehow exist on actualResult (shouldn't due to target config)
    delete finalResult.intermediateSteps;
    return finalResult;

  }

  static async run(
    initialMessages: ChatMessage[],
    args: ConfigurableAgentArgs,
    config: AgentRunnerConfig,
    hooks: AgentRunnerHooks,
    executingAgent: ConfigurableAgentTool | null,
    parentSession?: AgentSession // For natural nesting
  ): Promise<ConfigurableAgentResult & { agentSession: AgentSession }> {
    const agentName = executingAgent?.name || 'Unknown';
    logger.info('Starting execution loop for agent: ${agentName}');
    const { apiKey, modelName, systemPrompt, tools, maxIterations, temperature } = config;
    const { prepareInitialMessages, createSuccessResult, createErrorResult } = hooks;


    // Create session when agent starts (natural timing)
    const agentSession: AgentSession = {
      agentName,
      agentQuery: args.query,
      agentReasoning: args.reasoning,
      agentDisplayName: executingAgent?.config?.ui?.displayName || agentName,
      agentDescription: executingAgent?.config?.description,
      sessionId: crypto.randomUUID(),
      parentSessionId: parentSession?.sessionId,
      status: 'running',
      startTime: new Date(),
      messages: [],
      nestedSessions: [], // Child sessions nest here naturally
      tools: config.tools.map(t => t.name),
      config: executingAgent?.config,
      maxIterations,
      modelUsed: modelName,
      iterationCount: 0
    };

    this.currentSession = agentSession;

    let messages = [...initialMessages];

    // Prepare initial messages if hook provided
    if (prepareInitialMessages) {
      messages = prepareInitialMessages(messages);
    }

    const toolMap = new Map(tools.map(tool => [tool.name, tool]));
    const toolSchemas = tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.schema
      }
    }));

    // Create centralized error handler
    const errorHandler = AgentErrorHandler.createErrorHandler({
      continueOnError: true,
      agentName,
      availableTools: Array.from(toolMap.keys()),
      session: agentSession
    });

    // Add handoff tools based on the executing agent's config
    if (executingAgent?.config.handoffs) {
        // Iterate over the configured handoffs
        for (const handoffConfig of executingAgent.config.handoffs) {
            // Only add handoffs triggered by LLM tool calls to the schema
            if (!handoffConfig.trigger || handoffConfig.trigger === 'llm_tool_call') {
                const targetAgentName = handoffConfig.targetAgentName;
                const targetTool = ToolRegistry.getRegisteredTool(targetAgentName);
                if (targetTool instanceof ConfigurableAgentTool) {
                    const handoffToolName = `handoff_to_${targetAgentName}`;
                    toolSchemas.push({
                      type: 'function',
                      function: {
                        name: handoffToolName,
                        description: `Handoff the current task to the specialized agent: ${targetAgentName}. Use this agent when the task requires ${targetAgentName}'s capabilities. Agent Description: ${targetTool.description}`,
                        parameters: targetTool.schema // Use target agent's input schema
                      }
                    });
                     // Add a mapping for the handoff tool 'name' to the actual target tool instance
                     // This allows us to find the target agent later when this tool is called.
                    toolMap.set(handoffToolName, targetTool);
                    logger.info('Added LLM handoff tool schema: ${handoffToolName}');
                } else {
                  logger.warn(`Configured LLM handoff target '${targetAgentName}' not found or is not a ConfigurableAgentTool.`);
                }
            }
        }
    }

    // Capture initial reasoning from args if provided
    if (args.reasoning) {
      const reasoningText = Array.isArray(args.reasoning) ? args.reasoning.join(' ') : args.reasoning;
      this.addSessionMessage({
        type: 'reasoning',
        content: {
          type: 'reasoning',
          text: reasoningText
        }
      });
    }

    let iteration = 0; // Initialize iteration counter

    for (iteration = 0; iteration < maxIterations; iteration++) {
      // Update session iteration count
      if (this.currentSession) {
        this.currentSession.iterationCount = iteration + 1;
      }
      logger.info(`${agentName} Iteration ${iteration + 1}/${maxIterations}`);

      // Prepare prompt and call LLM
      const iterationInfo = `
## Current Progress
- You are currently on step ${iteration + 1} of ${maxIterations} maximum steps.
- Focus on making meaningful progress with each step.`;

      // Enhance system prompt with iteration info and page context
      // This includes updating the accessibility tree inside enhancePromptWithPageContext
      const currentSystemPrompt = await enhancePromptWithPageContext(systemPrompt + iterationInfo);

      let llmResponse: LLMResponse;
      let generationId: string | undefined; // Declare in iteration scope for tool call access

      try {
        logger.info(`${agentName} Calling LLM with ${messages.length} messages`);

        // Get enhanced tracing context for AgentRunner LLM generation
        const tracingContext = getCurrentTracingContext();
        const tracingProvider = createTracingProvider();
        const generationStartTime = new Date();

        console.log(`[HIERARCHICAL_TRACING] AgentRunner: Starting LLM generation for ${agentName}:`, {
          hasTracingContext: !!tracingContext,
          traceId: tracingContext?.traceId,
          currentAgentSpanId: tracingContext?.currentAgentSpanId,
          parentObservationId: tracingContext?.parentObservationId,
          executionLevel: tracingContext?.executionLevel,
          iteration: iteration + 1
        });

        // Create generation observation for AgentRunner LLM call
        if (tracingContext?.traceId) {
          generationId = `gen-agentrunner-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          await tracingProvider.createObservation({
            id: generationId,
            name: `AgentRunner LLM Generation`,
            type: 'generation',
            startTime: generationStartTime,
            parentObservationId: tracingContext.currentAgentSpanId || tracingContext.parentObservationId,
            model: modelName,
            modelParameters: {
              temperature: temperature ?? 0,
              provider: AIChatPanel.getProviderForModel(modelName)
            },
            input: {
              systemPrompt: currentSystemPrompt.substring(0, 500) + '...', // Truncate for tracing
              messages: messages.length,
              tools: tools.map(t => t.name),
              iteration: iteration + 1
            },
            metadata: {
              executionLevel: 'agentrunner',
              source: 'AgentRunner',
              agentName,
              iteration: iteration + 1,
              maxIterations,
              phase: 'llm_generation'
            }
          }, tracingContext.traceId);

          console.log(`[HIERARCHICAL_TRACING] AgentRunner: Created LLM generation:`, {
            generationId,
            agentName,
            iteration: iteration + 1,
            parentObservationId: tracingContext.currentAgentSpanId || tracingContext.parentObservationId,
            modelName
          });
          logger.info(`${agentName} Created AgentRunner LLM generation trace: ${generationId}`);
        }

        const llm = LLMClient.getInstance();
        const provider = AIChatPanel.getProviderForModel(modelName);
        const llmMessages = AgentRunner.convertToLLMMessages(messages);

        llmResponse = await llm.call({
          provider,
          model: modelName,
          messages: llmMessages,
          systemPrompt: currentSystemPrompt,
          tools: toolSchemas,
          temperature: temperature ?? 0,
        });

        // Complete the generation observation
        if (generationId && tracingContext?.traceId) {
          // Extract token usage from rawResponse if available
          const rawUsage = llmResponse.rawResponse?.usage;
          const usage = rawUsage ? {
            promptTokens: rawUsage.prompt_tokens || rawUsage.input_tokens || 0,
            completionTokens: rawUsage.completion_tokens || rawUsage.output_tokens || 0,
            totalTokens: rawUsage.total_tokens || 0
          } : undefined;

          await tracingProvider.updateObservation(generationId, {
            endTime: new Date(),
            output: {
              type: 'llm_response',
              hasToolCalls: llmResponse.reasoning?.summary ? true : false,
              responseLength: JSON.stringify(llmResponse).length
            },
            ...(usage && { usage }),
            metadata: {
              executionLevel: 'agentrunner',
              source: 'AgentRunner',
              agentName,
              iteration: iteration + 1,
              phase: 'completed',
              duration: Date.now() - generationStartTime.getTime()
            }
          });

          console.log(`[HIERARCHICAL_TRACING] AgentRunner: Completed LLM generation:`, {
            generationId,
            agentName,
            iteration: iteration + 1,
            duration: Date.now() - generationStartTime.getTime()
          });
        }
      } catch (error: any) {
        logger.error(`${agentName} LLM call failed:`, error);
        const errorMsg = `LLM call failed: ${error.message || String(error)}`;

        // Complete generation observation with error
        const tracingContext = getCurrentTracingContext();
        const tracingProvider = createTracingProvider();
        if (generationId && tracingContext?.traceId) {
          await tracingProvider.updateObservation(generationId, {
            endTime: new Date(),
            error: error.message || String(error),
            metadata: {
              executionLevel: 'agentrunner',
              source: 'AgentRunner',
              agentName,
              iteration: iteration + 1,
              phase: 'error'
            }
          });
        }

        // Add system error message to history
        const systemErrorMessage: ToolResultMessage = {
            entity: ChatMessageEntity.TOOL_RESULT,
            toolName: 'system_error',
            resultText: errorMsg,
            isError: true,
            error: errorMsg,
        };
        messages.push(systemErrorMessage);

        // Generate summary of error scenario
        const errorSummary = await this.summarizeAgentProgress(messages, maxIterations, agentName, modelName, 'error');

        // Complete session with error
        agentSession.status = 'error';
        agentSession.endTime = new Date();
        agentSession.terminationReason = 'error';

        // Use error hook with structured summary
        const result = createErrorResult(errorMsg, messages, 'error');
        result.summary = {
          type: 'error',
          content: errorSummary
        };
        return { ...result, agentSession };
      }

      // Parse LLM response
      const llm = LLMClient.getInstance();
      const parsedAction = llm.parseResponse(llmResponse);

      // Process parsed action
      try {
        let newModelMessage: ModelChatMessage;
        let toolCallObservationId: string | undefined; // Declare in action scope for tool execution access

        if (parsedAction.type === 'tool_call') {
          const { name: toolName, args: toolArgs } = parsedAction;
          const toolCallId = crypto.randomUUID(); // Generate unique ID for OpenAI format

          // Create tool call decision event for AgentRunner
          const tracingContext = getCurrentTracingContext();
          const tracingProvider = createTracingProvider();

          if (tracingContext?.traceId) {
            toolCallObservationId = `tool-call-agentrunner-${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            await tracingProvider.createObservation({
              id: toolCallObservationId,
              name: `AgentRunner Tool Call Decision: ${toolName}`,
              type: 'event',
              startTime: new Date(),
              parentObservationId: generationId || tracingContext.currentAgentSpanId || tracingContext.parentObservationId,
              input: {
                toolName,
                toolArgs,
                toolCallId,
                reasoning: llmResponse.reasoning?.summary
              },
              metadata: {
                executionLevel: 'agentrunner',
                source: 'AgentRunner',
                agentName,
                iteration: iteration + 1,
                toolCallId,
                phase: 'tool_call_decision'
              }
            }, tracingContext.traceId);

            console.log(`[HIERARCHICAL_TRACING] AgentRunner: Created tool call decision:`, {
              toolCallObservationId,
              toolName,
              agentName,
              iteration: iteration + 1,
              parentObservationId: generationId || tracingContext.currentAgentSpanId || tracingContext.parentObservationId
            });

            logger.info(`${agentName} Created AgentRunner tool call decision: ${toolCallObservationId} for ${toolName}`);
          }

          newModelMessage = {
            entity: ChatMessageEntity.MODEL,
            action: 'tool',
            toolName,
            toolArgs,
            toolCallId, // Add for linking with tool response
            isFinalAnswer: false,
            reasoning: llmResponse.reasoning?.summary,
          };
          messages.push(newModelMessage);

          // Add tool call to current session
          this.addSessionMessage({
            type: 'tool_call',
            content: {
              type: 'tool_call',
              toolName,
              toolArgs,
              toolCallId,
              reasoning: Array.isArray(llmResponse.reasoning?.summary)
                ? llmResponse.reasoning.summary.join(' ')
                : (llmResponse.reasoning?.summary || undefined)
            }
          });
          logger.info(`${agentName} LLM requested tool: ${toolName}`);

          // Execute tool
          const toolToExecute = toolMap.get(toolName);
          if (!toolToExecute) {
            const result = errorHandler.handleUnknownTool(toolName, toolCallId);
            if (result.shouldContinue && result.errorMessage) {
              messages.push(result.errorMessage);
              if (result.sessionMessage) {
                errorHandler.addSessionMessage(result.sessionMessage);
              }
              continue; // Continue to next iteration
            }
            // If not continuing, this would throw an error (but our config sets continueOnError: true)
            continue; // Ensure we don't proceed with undefined tool
          }

          let toolResultText: string = '';
          let toolIsError = false;
          let toolResultData: any = null;
          let imageData: string | undefined;

          // *** Check if it's an LLM-triggered handoff tool call ***
          if (toolName.startsWith('handoff_to_') && toolToExecute instanceof ConfigurableAgentTool) {
              const targetAgentTool = toolToExecute; // Already resolved via toolMap
              // Find the corresponding handoff config (must be llm_tool_call trigger)
              const handoffConfig = executingAgent?.config.handoffs?.find(h =>
                  h.targetAgentName === targetAgentTool.name &&
                  (!h.trigger || h.trigger === 'llm_tool_call')
              );

              if (!handoffConfig) {
                  throw new Error(`Internal error: No matching 'llm_tool_call' handoff config found for ${toolName}`);
              }

              // Add handoff message to current session
              const nestedSessionId = crypto.randomUUID();
              this.addSessionMessage({
                type: 'handoff',
                content: {
                  type: 'handoff',
                  targetAgent: targetAgentTool.name,
                  reason: `Handing off to ${targetAgentTool.name}`,
                  context: toolArgs as Record<string, any>,
                  nestedSessionId
                }
              });

              // Use the shared handoff execution logic, passing LLM's toolArgs and current session
              const handoffResult = await AgentRunner.executeHandoff(
                  messages, // Pass current message history
                  toolArgs as ConfigurableAgentArgs, // <= LLM's toolArgs are the 'originalArgs' for this handoff context
                  handoffConfig,
                  executingAgent!, // executingAgent must exist if handoff config was found
                  apiKey, modelName, maxIterations, temperature ?? 0,
                  createSuccessResult, createErrorResult,
                  toolArgs as ConfigurableAgentArgs, // <= Pass LLM's toolArgs explicitly as llmToolArgs
                  this.currentSession // Pass current session for natural nesting
              );

              // LLM tool handoff replaces the current agent's execution entirely
              // Complete current session and return result with session
              agentSession.status = 'completed';
              agentSession.endTime = new Date();
              agentSession.terminationReason = 'handed_off';

              return { ...handoffResult, agentSession };

          } else if (toolToExecute) {
            // *** Regular tool execution ***

            // Create tool execution span
            const tracingContext = getCurrentTracingContext();
            const tracingProvider = createTracingProvider();
            let toolSpanId: string | undefined;
            const toolStartTime = new Date();

            if (tracingContext?.traceId) {
              toolSpanId = `tool-exec-agentrunner-${toolName}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
              try {
                await tracingProvider.createObservation({
                  id: toolSpanId,
                  name: `AgentRunner Tool Execution: ${toolName}`,
                  type: 'span',
                  startTime: toolStartTime,
                  parentObservationId: toolCallObservationId || tracingContext.currentToolCallId || tracingContext.parentObservationId,
                  input: toolArgs,
                  metadata: {
                    executionLevel: 'agentrunner',
                    source: 'AgentRunner',
                    agentName,
                    toolName,
                    toolCallId,
                    iteration: iteration + 1,
                    phase: 'tool_execution',
                    parentToolCallDecision: toolCallObservationId
                  }
                }, tracingContext.traceId);
                console.log(`[HIERARCHICAL_TRACING] AgentRunner: Created tool execution span:`, {
                  toolSpanId,
                  toolName,
                  agentName,
                  iteration: iteration + 1,
                  parentObservationId: toolCallObservationId || tracingContext.currentToolCallId || tracingContext.parentObservationId
                });
                logger.info(`${agentName} Created AgentRunner tool execution span: ${toolSpanId} for ${toolName}`);
              } catch (tracingError) {
                logger.warn(`${agentName} Failed to create AgentRunner tool execution span:`, tracingError);
              }
            }

             try {
              logger.info(`${agentName} Executing tool: ${toolToExecute.name} with args:`, toolArgs);
              toolResultData = await toolToExecute.execute(toolArgs as any);

              // Extract image data if present (before sanitization)
              if (typeof toolResultData === 'object' && toolResultData !== null) {
                imageData = toolResultData.imageData;
              }

              // Create sanitized data for text representation (exclude imageData to avoid token waste)
              const sanitizedData = this.sanitizeToolResultForText(toolResultData);

              // Special handling for ConfigurableAgentResult
              if (typeof toolResultData === 'object' && toolResultData !== null &&
                  'success' in toolResultData && ('output' in toolResultData || 'error' in toolResultData)) {
                // This is a ConfigurableAgentResult from another agent
                toolResultText = toolResultData.success
                  ? (toolResultData.output || 'Agent completed successfully')
                  : (toolResultData.error || 'Agent failed');
              } else {
                // Regular tool result
                toolResultText = typeof toolResultData === 'string' ? toolResultData : JSON.stringify(sanitizedData, null, 2);
              }

              // Check if the result object indicates an error explicitly
              if (typeof toolResultData === 'object' && toolResultData !== null) {
                 if (toolResultData.hasOwnProperty('error') && !!toolResultData.error) {
                    toolIsError = true;
                    // Use the error message from the result object if available
                    toolResultText = toolResultData.error || toolResultText;
                 } else if (toolResultData.hasOwnProperty('success') && toolResultData.success === false) {
                    toolIsError = true;
                     // Try to find an error message field, fallback to stringified object
                    toolResultText = toolResultData.error || toolResultData.message || toolResultText;
                 }
              }

              // Complete tool execution span with success
              if (toolSpanId && tracingContext?.traceId) {
                try {
                  await tracingProvider.updateObservation(toolSpanId, {
                    endTime: new Date(),
                    output: toolResultData,
                    metadata: {
                      executionLevel: 'agentrunner',
                      source: 'AgentRunner',
                      agentName,
                      toolName,
                      toolCallId,
                      iteration: iteration + 1,
                      phase: 'completed',
                      duration: Date.now() - toolStartTime.getTime(),
                      success: !toolIsError,
                      parentToolCallDecision: toolCallObservationId
                    }
                  });
                  console.log(`[HIERARCHICAL_TRACING] AgentRunner: Completed tool execution span:`, {
                    toolSpanId,
                    toolName,
                    agentName,
                    success: !toolIsError,
                    duration: Date.now() - toolStartTime.getTime()
                  });
                  logger.info(`${agentName} Completed AgentRunner tool execution span: ${toolSpanId}`);
                } catch (tracingError) {
                  logger.warn(`${agentName} Failed to complete AgentRunner tool execution span:`, tracingError);
                }
              }

             } catch (err: any) {
              logger.error(`${agentName} Error executing tool ${toolToExecute.name}:`, err);
              toolResultText = `Error during tool execution: ${err.message || String(err)}`;
              toolIsError = true;
              toolResultData = { error: toolResultText }; // Store error in data

              // Complete tool execution span with error
              if (toolSpanId && tracingContext?.traceId) {
                try {
                  await tracingProvider.updateObservation(toolSpanId, {
                    endTime: new Date(),
                    error: err.message || String(err),
                    metadata: {
                      executionLevel: 'agentrunner',
                      source: 'AgentRunner',
                      agentName,
                      toolName,
                      toolCallId,
                      iteration: iteration + 1,
                      phase: 'error',
                      duration: Date.now() - toolStartTime.getTime(),
                      success: false,
                      parentToolCallDecision: toolCallObservationId
                    }
                  });
                  logger.info(`${agentName} Completed AgentRunner tool execution span with error: ${toolSpanId}`);
                } catch (tracingError) {
                  logger.warn(`${agentName} Failed to complete AgentRunner tool execution span with error:`, tracingError);
                }
              }
             }
          }

          // Add tool result message
          const toolResultMessage: ToolResultMessage = {
            entity: ChatMessageEntity.TOOL_RESULT,
            toolName,
            resultText: toolResultText,
            isError: toolIsError,
            toolCallId, // Link back to the tool call for OpenAI format
            ...(toolIsError && { error: toolResultText }), // Include raw error message if error occurred
            ...(toolResultData && { resultData: toolResultData }), // Include structured result data
            ...(imageData && { imageData: imageData }) // Include image data for multimodal LLM responses
          };

          // Extract structured summary if this is from a ConfigurableAgentResult
          if (typeof toolResultData === 'object' && toolResultData !== null &&
              'success' in toolResultData && toolResultData.summary) {
            // Use the structured summary directly
            toolResultMessage.summary = toolResultData.summary.content;
          }

          messages.push(toolResultMessage);

          // Add tool result to current session
          this.addSessionMessage({
            type: 'tool_result',
            content: {
              type: 'tool_result',
              toolCallId,
              toolName,
              success: !toolIsError,
              result: toolResultData,
              error: toolIsError ? toolResultText : undefined
            }
          });
          logger.info(`${agentName} Tool ${toolName} execution result added. Error: ${toolIsError}`);

        } else if (parsedAction.type === 'final_answer') {
          const { answer } = parsedAction;
          newModelMessage = {
            entity: ChatMessageEntity.MODEL,
            action: 'final',
            answer,
            isFinalAnswer: true,
            reasoning: llmResponse.reasoning?.summary,
          };
          messages.push(newModelMessage);

          // Add final answer to current session
          this.addSessionMessage({
            type: 'final_answer',
            content: {
              type: 'final_answer',
              answer,
              summary: Array.isArray(llmResponse.reasoning?.summary)
                ? llmResponse.reasoning.summary.join(' ')
                : (llmResponse.reasoning?.summary || undefined)
            }
          });

          logger.info(`${agentName} LLM provided final answer.`);

          // Generate summary of successful completion
          const completionSummary = await this.summarizeAgentProgress(messages, maxIterations, agentName, modelName, 'final_answer');

          // Complete session naturally
          agentSession.status = 'completed';
          agentSession.endTime = new Date();
          agentSession.terminationReason = 'final_answer';

          // Exit loop and return success with structured summary
          const result = createSuccessResult(answer, messages, 'final_answer');
          result.summary = {
            type: 'completion',
            content: completionSummary
          };
          return { ...result, agentSession };

        } else if (parsedAction.type === 'error') {
          const result = errorHandler.handleParsingError(parsedAction.error);
          if (result.shouldContinue && result.errorMessage) {
            messages.push(result.errorMessage);
            if (result.sessionMessage) {
              errorHandler.addSessionMessage(result.sessionMessage);
            }
            continue; // Continue to next iteration so the LLM can try again
          }
        } else {
          // Unknown parsed action type
          throw new Error(`Unknown parsed action type: ${(parsedAction as any).type}`);
        }

      } catch (error: any) {
        logger.error(`${agentName} Error processing LLM response or executing tool:`, error);
        const errorMsg = `Agent loop error: ${error.message || String(error)}`;
         // Add system error message to history
        const systemErrorMessage: ToolResultMessage = {
            entity: ChatMessageEntity.TOOL_RESULT,
            toolName: 'system_error',
            resultText: errorMsg,
            isError: true,
            error: errorMsg,
        };
        messages.push(systemErrorMessage);

        // Generate summary of error scenario
        const errorSummary = await this.summarizeAgentProgress(messages, maxIterations, agentName, modelName, 'error');

        // Complete session with error
        agentSession.status = 'error';
        agentSession.endTime = new Date();
        agentSession.terminationReason = 'error';

        // Use error hook with structured summary
        const result = createErrorResult(errorMsg, messages, 'error');
        result.summary = {
          type: 'error',
          content: errorSummary
        };
        return { ...result, agentSession };
      }
    }

    // Max iterations reached - Check for 'max_iterations' handoff trigger
    logger.warn(`${agentName} Reached max iterations (${maxIterations}) without completion.`);

    if (executingAgent?.config.handoffs) {
        const maxIterHandoffConfig = executingAgent.config.handoffs.find(h => h.trigger === 'max_iterations');

        if (maxIterHandoffConfig) {
            logger.info(`${agentName} Found 'max_iterations' handoff config. Initiating handoff to ${maxIterHandoffConfig.targetAgentName}.`);

            // Use the shared handoff execution logic
            // Pass the original `args` received by *this* agent runner instance. No llmToolArgs here.
            const handoffResult = await AgentRunner.executeHandoff(
                messages, // Pass the final message history from the loop
                args,     // Pass the original args of the *current* agent as 'originalArgs'
                maxIterHandoffConfig,
                executingAgent,
                apiKey, modelName, maxIterations, temperature ?? 0,
                createSuccessResult, createErrorResult,
                undefined, // No llmToolArgs for max iterations handoff
                this.currentSession // Pass current session for natural nesting
            );
            // Extract the result and session
            const { agentSession: childSession, ...actualResult } = handoffResult;

            // Add child session to current session's nested sessions (natural nesting)
            if (this.currentSession) {
              this.currentSession.nestedSessions.push(childSession);
            }

            // Complete current session and return result with session
            agentSession.status = 'completed';
            agentSession.endTime = new Date();
            agentSession.terminationReason = 'handed_off';

            return { ...actualResult, agentSession }; // Return the result from the handoff target
        }
    }

    // If no max_iterations handoff is configured, return the standard error
    logger.warn(`${agentName} No 'max_iterations' handoff configured. Returning error.`);

    // Complete session with max iterations error
    agentSession.status = 'error';
    agentSession.endTime = new Date();
    agentSession.terminationReason = 'max_iterations';

    // Generate summary of agent progress instead of generic error message
    const progressSummary = await this.summarizeAgentProgress(messages, maxIterations, agentName, modelName);
    const result = createErrorResult('Agent reached maximum iterations', messages, 'max_iterations');
    result.summary = {
      type: 'timeout',
      content: progressSummary
    };
    return { ...result, agentSession };
  }

  /**
   * Uses LLM to generate a meaningful summary when agent completes execution.
   * Leverages KV-cache by sending all existing messages plus a summary request.
   */
  private static async summarizeAgentProgress(
    messages: ChatMessage[],
    maxIterations: number,
    agentName: string,
    modelName: string,
    completionType: 'final_answer' | 'max_iterations' | 'error' = 'max_iterations'
  ): Promise<string> {
    logger.info(`Generating summary for agent "${agentName}" with completion type: ${completionType}`);
    try {
      // Use existing convertToLLMMessages method for consistency
      const llmMessages = this.convertToLLMMessages(messages);

      // Add system message at the beginning for better context
      llmMessages.unshift({
        role: 'system',
        content: `You are an expert AI agent analyzer specializing in understanding multi-agent workflows and execution patterns. Your task is to analyze agent conversations that have reached their iteration limits and generate actionable summaries.

Key guidelines:
- Focus on extracting the core user intent and what the agent was trying to accomplish
- Identify patterns of progress, loops, or stuck behaviors
- Highlight key decisions the agent made and tools it used
- Assess whether the agent was making meaningful progress toward the goal
- Provide specific, actionable insights that would help a calling agent decide next steps
- Be concise but comprehensive in your analysis
- Consider the context of web automation, data extraction, and multi-agent coordination`
      });

      // Generate completion-specific summary prompt
      let summaryPrompt: string;
      switch (completionType) {
        case 'final_answer':
          summaryPrompt = `Please analyze the entire conversation above and provide a concise summary that includes:

1. **User Request**: What the user originally asked for
2. **Agent Decisions**: Key decisions and actions the agent took to accomplish the task
3. **Final Outcome**: What the agent accomplished`;
          break;

        case 'error':
          summaryPrompt = `1. **User Request**: What the user originally asked for
2. **Agent Decisions**: Key decisions and actions the agent took before the error
3. **Error Context**: What the agent was attempting when the error occurred`;
          break;

        case 'max_iterations':
        default:
          summaryPrompt = `The agent "${agentName}" has reached its maximum iteration limit of ${maxIterations}.

Please analyze the entire conversation above and provide a concise summary that includes:

1. **User Request**: What the user originally asked for
2. **Agent Decisions**: Key decisions and actions the agent took
3. **Final State**: What the agent was doing when it timed out
4. **Progress Assessment**: Whether the agent was making progress or stuck

Format your response as a clear, informative summary that would help a calling agent understand what happened and decide next steps.`;
          break;
      }

      // Add final user message requesting summary
      llmMessages.push({
        role: 'user',
        content: summaryPrompt
      });

      // Use existing LLM infrastructure
      const llm = LLMClient.getInstance();
      const provider = AIChatPanel.getProviderForModel(modelName);

      const response = await llm.call({
        provider,
        model: modelName,
        messages: llmMessages,
        systemPrompt: '', // Empty string instead of undefined
        // Omit tools parameter entirely to avoid tool_choice conflicts
        temperature: 0.1 // Lower temperature for more consistent summaries
      });

      logger.info(`Generated summary for agent "${agentName}":`, response.text || 'No summary generated.');
      return response.text || 'No summary generated.';

    } catch (error) {
      logger.error('Failed to generate agent progress summary:', error);
      // Fallback to simple message if LLM summary fails
      return `Agent ${agentName} reached maximum iterations (${maxIterations}). Summary generation failed.`;
    }
  }
}
