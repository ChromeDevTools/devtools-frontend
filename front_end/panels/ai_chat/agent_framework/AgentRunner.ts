// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { enhancePromptWithPageContext } from '../core/PageInfoManager.js';
import { UnifiedLLMClient, type UnifiedLLMResponse, type ParsedLLMAction } from '../core/UnifiedLLMClient.js';
import type { Tool } from '../tools/Tools.js';
import { ChatMessageEntity, type ChatMessage, type ModelChatMessage, type ToolResultMessage } from '../ui/ChatView.js';
import { createLogger } from '../core/Logger.js';

const logger = createLogger('AgentRunner');

import { ConfigurableAgentTool, ToolRegistry, HandoffTrigger, type ConfigurableAgentArgs, type ConfigurableAgentResult, type AgentRunTerminationReason, type HandoffConfig /* , HandoffContextTransform, ContextFilterRegistry*/ } from './ConfigurableAgentTool.js';

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
 * Type guard for checking if an object is a ConfigurableAgentResult
 */
function isConfigurableAgentResult(obj: any): obj is ConfigurableAgentResult {
  return typeof obj === 'object' && obj !== null && typeof obj.success === 'boolean';
}

/**
 * Runs the core agent execution loop
 */
export class AgentRunner {
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
    llmToolArgs?: ConfigurableAgentArgs // Specific args if triggered by LLM tool call
  ): Promise<ConfigurableAgentResult> {
    const targetAgentName = handoffConfig.targetAgentName;
    const targetAgentTool = ToolRegistry.getRegisteredTool(targetAgentName);

    if (!(targetAgentTool instanceof ConfigurableAgentTool)) {
      const errorMsg = `Handoff target '${targetAgentName}' not found or is not a ConfigurableAgentTool.`;
      logger.error(`${errorMsg}`);
      // Use the default error creator from the initiating agent's context
      return defaultCreateErrorResult(errorMsg, currentMessages, 'error');
    }

    logger.info(`Initiating handoff from ${executingAgent.name} to ${targetAgentTool.name} (Trigger: ${handoffConfig.trigger || 'llm_tool_call'})`);

    let handoffMessages: ChatMessage[] = []; // Initialize handoff messages
    const targetConfig = targetAgentTool.config;

    // Determine the messages to hand off based on includeToolResults
    if (handoffConfig.includeToolResults && handoffConfig.includeToolResults.length > 0) {
      // Filter messages: keep user messages, final answers, and only tool calls/results for specified tools
      logger.info('Filtering messages for handoff to ${targetAgentTool.name} based on includeToolResults.');
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
      logger.info('Passing full message history for handoff to ${targetAgentTool.name}.');
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

    logger.info('Executing handoff target agent: ${targetAgentTool.name} with ${handoffMessages.length} messages.');
    const handoffResult = await AgentRunner.run(
        handoffMessages,
        targetAgentArgs, // Use determined args
        targetRunnerConfig, // Pass the constructed config
        targetRunnerHooks,  // Pass the constructed hooks
        targetAgentTool // Target agent is now the executing agent
    );

    logger.info('Handoff target agent ${targetAgentTool.name} finished. Result success: ${handoffResult.success}');

    // Check if the target agent is configured to *include* intermediate steps
    if (targetAgentTool instanceof ConfigurableAgentTool && targetAgentTool.config.includeIntermediateStepsOnReturn === true) {
      // Combine message history if the target agent requests it
      logger.info('Including intermediateSteps from ${targetAgentTool.name} based on its config.');
      const combinedIntermediateSteps = [
          ...currentMessages, // History *before* the recursive call
          ...(handoffResult.intermediateSteps || []) // History *from* the recursive call (should exist if flag is true)
      ];
      // Return the result from the target agent, but with combined history
      return {
          ...handoffResult,
          intermediateSteps: combinedIntermediateSteps,
          terminationReason: handoffResult.terminationReason || 'handed_off',
      };
    }
    // Otherwise (default), omit the target's intermediate steps
    logger.info('Omitting intermediateSteps from ${targetAgentTool.name} based on its config (default or flag set to false).');
    // Return result from target, ensuring intermediateSteps are omitted
    const finalResult = {
      ...handoffResult,
      terminationReason: handoffResult.terminationReason || 'handed_off',
    };
    // Explicitly delete intermediateSteps if they somehow exist on handoffResult (shouldn't due to target config)
    delete finalResult.intermediateSteps;
    return finalResult;

  }

  static async run(
    initialMessages: ChatMessage[],
    args: ConfigurableAgentArgs,
    config: AgentRunnerConfig,
    hooks: AgentRunnerHooks,
    executingAgent: ConfigurableAgentTool | null
  ): Promise<ConfigurableAgentResult> {
    const agentName = executingAgent?.name || 'Unknown';
    logger.info('Starting execution loop for agent: ${agentName}');
    const { apiKey, modelName, systemPrompt, tools, maxIterations, temperature } = config;
    const { prepareInitialMessages, createSuccessResult, createErrorResult } = hooks;

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

    let iteration = 0; // Initialize iteration counter

    for (iteration = 0; iteration < maxIterations; iteration++) {
      logger.info('${agentName} Iteration ${iteration + 1}/${maxIterations}');

      // Prepare prompt and call LLM
      const iterationInfo = `
## Current Progress
- You are currently on step ${iteration + 1} of ${maxIterations} maximum steps.
- Focus on making meaningful progress with each step.`;

      // Enhance system prompt with iteration info and page context
      // This includes updating the accessibility tree inside enhancePromptWithPageContext
      const currentSystemPrompt = await enhancePromptWithPageContext(systemPrompt + iterationInfo);

      let llmResponse: UnifiedLLMResponse;
      try {
        logger.info('${agentName} Calling LLM with ${messages.length} messages');
        llmResponse = await UnifiedLLMClient.callLLMWithMessages(
          apiKey,
          modelName,
          messages,
          {
            tools: toolSchemas,
            systemPrompt: currentSystemPrompt,
            temperature: temperature ?? 0,
          }
        );
      } catch (error: any) {
        logger.error(`${agentName} LLM call failed:`, error);
        const errorMsg = `LLM call failed: ${error.message || String(error)}`;
        // Add system error message to history
        const systemErrorMessage: ToolResultMessage = {
            entity: ChatMessageEntity.TOOL_RESULT,
            toolName: 'system_error',
            resultText: errorMsg,
            isError: true,
            error: errorMsg,
        };
        messages.push(systemErrorMessage);
        // Use error hook with 'error' reason
        return createErrorResult(errorMsg, messages, 'error');
      }

      // Parse LLM response
      const parsedAction = UnifiedLLMClient.parseResponse(llmResponse);

      // Process parsed action
      try {
        let newModelMessage: ModelChatMessage;

        if (parsedAction.type === 'tool_call') {
          const { name: toolName, args: toolArgs } = parsedAction;
          const toolCallId = crypto.randomUUID(); // Generate unique ID for OpenAI format
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
          logger.info('${agentName} LLM requested tool: ${toolName}');

          // Execute tool
          const toolToExecute = toolMap.get(toolName);
          if (!toolToExecute) {
            throw new Error(`Agent requested unknown tool: ${toolName}`);
          }

          let toolResultText: string;
          let toolIsError = false;
          let toolResultData: any = null;

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

              // Use the shared handoff execution logic, passing LLM's toolArgs
              const handoffResult = await AgentRunner.executeHandoff(
                  messages, // Pass current message history
                  toolArgs as ConfigurableAgentArgs, // <= LLM's toolArgs are the 'originalArgs' for this handoff context
                  handoffConfig,
                  executingAgent!, // executingAgent must exist if handoff config was found
                  apiKey, modelName, maxIterations, temperature ?? 0,
                  createSuccessResult, createErrorResult,
                  toolArgs as ConfigurableAgentArgs // <= Pass LLM's toolArgs explicitly as llmToolArgs
              );

              // LLM tool handoff replaces the current agent's execution entirely
              return handoffResult;

          }
          if (!toolToExecute) { // Regular tool, but not found
              throw new Error(`Agent requested unknown tool: ${toolName}`);
          } else {
            // *** Regular tool execution ***
             try {
              logger.info('${agentName} Executing tool: ${toolToExecute.name} with args:', toolArgs);
              toolResultData = await toolToExecute.execute(toolArgs as any);
              toolResultText = typeof toolResultData === 'string' ? toolResultData : JSON.stringify(toolResultData, null, 2);

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
             } catch (err: any) {
              logger.error(`${agentName} Error executing tool ${toolToExecute.name}:`, err);
              toolResultText = `Error during tool execution: ${err.message || String(err)}`;
              toolIsError = true;
              toolResultData = { error: toolResultText }; // Store error in data
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
            ...(toolResultData && { resultData: toolResultData }) // Include structured result data
          };
          messages.push(toolResultMessage);
          logger.info('${agentName} Tool ${toolName} execution result added. Error: ${toolIsError}');

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
          logger.info('${agentName} LLM provided final answer.');
          // Exit loop and return success with 'final_answer' reason
          return createSuccessResult(answer, messages, 'final_answer');

        } else {
          throw new Error(parsedAction.error);
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
        // Use error hook with 'error' reason
        return createErrorResult(errorMsg, messages, 'error');
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
                createSuccessResult, createErrorResult
            );
            return handoffResult; // Return the result from the handoff target
        }
    }

    // If no max_iterations handoff is configured, return the standard error
    logger.warn(`${agentName} No 'max_iterations' handoff configured. Returning error.`);
    return createErrorResult(`Agent reached maximum iterations (${maxIterations})`, messages, 'max_iterations');
  }
}
