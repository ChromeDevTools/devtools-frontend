// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { AgentService } from '../core/AgentService.js';
import type { Tool } from '../tools/Tools.js';
import { AIChatPanel } from '../ui/AIChatPanel.js';
import { ChatMessageEntity, type ChatMessage } from '../ui/ChatView.js';
import { createLogger } from '../core/Logger.js';
import { getCurrentTracingContext } from '../tracing/TracingConfig.js';
import type { AgentSession } from './AgentSessionTypes.js';

const logger = createLogger('ConfigurableAgentTool');

import { AgentRunner, type AgentRunnerConfig, type AgentRunnerHooks } from './AgentRunner.js';

/**
 * Defines the possible reasons an agent run might terminate.
 */
export type AgentRunTerminationReason = 'final_answer' | 'max_iterations' | 'error' | 'custom_exit' | 'handed_off';

/**
 * Defines the possible triggers for a handoff.
 */
export type HandoffTrigger = 'llm_tool_call' | 'max_iterations';

/**
 * Configuration for a specific handoff target.
 */
export interface HandoffConfig {
  /**
   * The registered name of the agent to hand off to.
   */
  targetAgentName: string;

  /**
   * The condition that triggers this handoff. Defaults to 'llm_tool_call'.
   */
  trigger?: HandoffTrigger;

  /**
   * Optional array of tool names. If specified, only the results from these tools
   * in the sending agent's history will be collected and potentially passed to the
   * target agent as handoff messages.
   */
  includeToolResults?: string[];

  // TODO: Add toolNameOverride, toolDescriptionOverride, transitionalMessage later
}

/**
 * UI display configuration for an agent
 */
export interface AgentUIConfig {
  /**
   * Display name for the agent (human-readable)
   */
  displayName?: string;

  /**
   * Avatar/icon for the agent (emoji or icon class)
   */
  avatar?: string;

  /**
   * Primary color for the agent (hex code)
   */
  color?: string;

  /**
   * Background color for the agent (hex code)
   */
  backgroundColor?: string;
}

/**
 * JSON configuration for an agent tool
 */
export interface AgentToolConfig {
  /**
   * Name of the agent tool
   */
  name: string;

  /**
   * Description of the agent tool
   */
  description: string;

  /**
   * System prompt for the agent
   */
  systemPrompt: string;

  /**
   * Tool names to make available to the agent
   */
  tools: string[];

  /**
   * Defines potential handoffs to other agents.
   * Handoffs triggered by 'llm_tool_call' are presented as tools to the LLM.
   * Handoffs triggered by 'max_iterations' are executed automatically if the agent hits the limit.
   */
  handoffs?: HandoffConfig[];

  /**
   * Maximum iterations for the agent loop
   */
  maxIterations?: number;

  /**
   * Model name to use for the agent. Can be a string or a function that returns a string.
   */
  modelName?: string | (() => string);

  /**
   * Temperature for the agent
   */
  temperature?: number;

  /**
   * Schema for the agent tool arguments
   */
  schema: {
    type: string,
    properties: Record<string, unknown>,
    required?: string[],
  };

  /**
   * UI display configuration for the agent
   */
  ui?: AgentUIConfig;

  /**
   * Custom initialization function name
   */
  init?: (agent: ConfigurableAgentTool) => void;

  /**
   * Custom message preparation function name
   */
  prepareMessages?: (args: ConfigurableAgentArgs, config: AgentToolConfig) => ChatMessage[];

  /**
   * Custom success result creation function name
   */
  createSuccessResult?: (output: string, intermediateSteps: ChatMessage[], reason: AgentRunTerminationReason, config: AgentToolConfig) => ConfigurableAgentResult;

  /**
   * Custom error result creation function name
   */
  createErrorResult?: (error: string, intermediateSteps: ChatMessage[], reason: AgentRunTerminationReason, config: AgentToolConfig) => ConfigurableAgentResult;

  /**
   * If true, the agent WILL include intermediateSteps in its final returned result
   * (both success and error results). Defaults to false (steps are omitted).
   */
  includeIntermediateStepsOnReturn?: boolean;
}

/**
 * Registry of tool factory functions
 */
export class ToolRegistry {
  private static toolFactories = new Map<string, () => Tool<any, any>>();
  private static registeredTools = new Map<string, Tool<any, any>>(); // Store instances

  /**
   * Register a tool factory and create/store an instance
   */
  static registerToolFactory(name: string, factory: () => Tool<any, any>): void {
    if (this.toolFactories.has(name)) {
        logger.warn(`Tool factory already registered for: ${name}. Overwriting.`);
    }
    if (this.registeredTools.has(name)) {
        logger.warn(`Tool instance already registered for: ${name}. Overwriting.`);
    }
    this.toolFactories.set(name, factory);
    // Create and store the instance immediately upon registration
    try {
        const instance = factory();
        this.registeredTools.set(name, instance);
        logger.info('Registered and instantiated tool: ${name}');
    } catch (error) {
        logger.error(`Failed to instantiate tool '${name}' during registration:`, error);
        // Remove the factory entry if instantiation fails
        this.toolFactories.delete(name);
    }
  }

  /**
   * Get a tool instance by name
   */
  static getToolInstance(name: string): Tool<any, any> | null {
    const factory = this.toolFactories.get(name);
    return factory ? factory() : null;
  }

  /**
   * Get a pre-registered tool instance by name
   */
  static getRegisteredTool(name: string): Tool<any, any> | null {
    const instance = this.registeredTools.get(name);
    if (!instance) {
        // Don't fallback, require pre-registration for handoffs
        // logger.warn(`No registered instance found for tool: ${name}.`);
        return null;
    }
    return instance;
  }
}

/**
 * Arguments for the ConfigurableAgentTool
 */
export interface ConfigurableAgentArgs extends Record<string, unknown> {
  /**
   * Original query or input
   */
  query: string;

  /**
   * Reasoning for invocation
   */
  reasoning: string;

  /**
   * Additional arguments based on schema
   */
  [key: string]: unknown;
}

/**
 * Result from the ConfigurableAgentTool
 */
export interface ConfigurableAgentResult {
  /**
   * Whether the execution was successful
   */
  success: boolean;

  /**
   * Final output if successful
   */
  output?: string;

  /**
   * Error message if unsuccessful
   */
  error?: string;

  /**
   * Intermediate steps for debugging
   */
  intermediateSteps?: ChatMessage[];

  /**
   * Termination reason for the agent run
   */
  terminationReason: AgentRunTerminationReason;

  /**
   * Structured summary of agent execution
   */
  summary?: {
    /**
     * Type of completion
     */
    type: 'completion' | 'error' | 'timeout';
    
    /**
     * Formatted summary text
     */
    content: string;
  };
}

/**
 * An agent tool that can be configured via JSON
 */
export class ConfigurableAgentTool implements Tool<ConfigurableAgentArgs, ConfigurableAgentResult> {
  name: string;
  description: string;
  config: AgentToolConfig;
  schema: {
    type: string,
    properties: Record<string, unknown>,
    required?: string[],
  };

  constructor(config: AgentToolConfig) {
    this.name = config.name;
    this.description = config.description;
    this.config = config;
    this.schema = config.schema;

    // Validate that required fields are present
    if (!config.systemPrompt) {
      throw new Error(`ConfigurableAgentTool: systemPrompt is required for ${config.name}`);
    }

    // Call custom init function directly if provided
    if (config.init) {
      config.init(this);
    }
  }

  /**
   * Get the tool instances for this agent
   */
  private getToolInstances(): Array<Tool<any, any>> {
    return this.config.tools
      .map(toolName => ToolRegistry.getToolInstance(toolName))
      .filter((tool): tool is Tool<any, any> => tool !== null);
  }

  /**
   * Prepare initial messages for the agent
   */
  private prepareInitialMessages(args: ConfigurableAgentArgs): ChatMessage[] {
    // Use custom message preparation function directly if provided
    if (this.config.prepareMessages) {
      return this.config.prepareMessages(args, this.config);
    }

    // Default implementation
    return [{
      entity: ChatMessageEntity.USER,
      text: args.query,
    }];
  }

  /**
   * Create a success result
   */
  private createSuccessResult(output: string, intermediateSteps: ChatMessage[], reason: AgentRunTerminationReason): ConfigurableAgentResult {
    // Use custom success result creation function directly
    if (this.config.createSuccessResult) {
      return this.config.createSuccessResult(output, intermediateSteps, reason, this.config);
    }

    // Default implementation
    const result: ConfigurableAgentResult = {
      success: true,
      output,
      terminationReason: reason
    };

    // Only include steps if the flag is explicitly true
    if (this.config.includeIntermediateStepsOnReturn === true) {
        result.intermediateSteps = intermediateSteps;
    }

    return result;
  }

  /**
   * Create an error result
   */
  private createErrorResult(error: string, intermediateSteps: ChatMessage[], reason: AgentRunTerminationReason): ConfigurableAgentResult {
    // Use custom error result creation function directly
    if (this.config.createErrorResult) {
      return this.config.createErrorResult(error, intermediateSteps, reason, this.config);
    }

    // Default implementation
    const result: ConfigurableAgentResult = {
      success: false,
      error,
      terminationReason: reason
    };

    // Only include steps if the flag is explicitly true
    if (this.config.includeIntermediateStepsOnReturn === true) {
        result.intermediateSteps = intermediateSteps;
    }

    return result;
  }

  /**
   * Execute the agent
   */
  async execute(args: ConfigurableAgentArgs): Promise<ConfigurableAgentResult & { agentSession: AgentSession }> {
    logger.info(`Executing ${this.name} via AgentRunner with args:`, args);

    // Get current tracing context for debugging
    const tracingContext = getCurrentTracingContext();
    const agentService = AgentService.getInstance();
    const apiKey = agentService.getApiKey();

    if (!apiKey) {
      const errorResult = this.createErrorResult(`API key not configured for ${this.name}`, [], 'error');
      // Create minimal error session
      const errorSession: AgentSession = {
        agentName: this.name,
        agentQuery: args.query,
        agentReasoning: args.reasoning,
        sessionId: crypto.randomUUID(),
        status: 'error',
        startTime: new Date(),
        endTime: new Date(),
        messages: [],
        nestedSessions: [],
        tools: [],
        terminationReason: 'error'
      };
      return { ...errorResult, agentSession: errorSession };
    }

    // Initialize
    const maxIterations = this.config.maxIterations || 10;
    const modelName = typeof this.config.modelName === 'function'
      ? this.config.modelName()
      : (this.config.modelName || AIChatPanel.instance().getSelectedModel());
    const temperature = this.config.temperature ?? 0;

    const systemPrompt = this.config.systemPrompt;
    const tools = this.getToolInstances();

    // Prepare initial messages
    const internalMessages = this.prepareInitialMessages(args);

    // Prepare runner config and hooks
    const runnerConfig: AgentRunnerConfig = {
      apiKey,
      modelName,
      systemPrompt,
      tools,
      maxIterations,
      temperature,
    };

    const runnerHooks: AgentRunnerHooks = {
      prepareInitialMessages: undefined, // initial messages already prepared above
      createSuccessResult: this.config.createSuccessResult
        ? (out, steps, reason) => this.config.createSuccessResult!(out, steps, reason, this.config)
        : (out, steps, reason) => this.createSuccessResult(out, steps, reason),
      createErrorResult: this.config.createErrorResult
        ? (err, steps, reason) => this.config.createErrorResult!(err, steps, reason, this.config)
        : (err, steps, reason) => this.createErrorResult(err, steps, reason),
    };

    // Run the agent
    const result = await AgentRunner.run(
      internalMessages,
      args,
      runnerConfig,
      runnerHooks,
      this // Pass the current agent instance as executingAgent
    );

    // Return the direct result from the runner (including agentSession)
    return result;
  }
}
