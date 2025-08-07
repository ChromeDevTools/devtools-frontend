// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as UI from '../../../ui/legacy/legacy.js';
import {
  type ChatMessage,
  ChatMessageEntity,
  type ImageInputData,
  type ModelChatMessage
} from '../ui/ChatView.js';

import {createAgentGraph} from './Graph.js';
import { createLogger } from './Logger.js';
import {type AgentState, createInitialState, createUserMessage} from './State.js';
import type {CompiledGraph} from './Types.js';
import { LLMClient } from '../LLM/LLMClient.js';
import { createTracingProvider, getCurrentTracingContext } from '../tracing/TracingConfig.js';
import type { TracingProvider, TracingContext } from '../tracing/TracingProvider.js';

const logger = createLogger('AgentService');

/**
 * Events dispatched by the agent service
 */
export enum Events {
  MESSAGES_CHANGED = 'messages-changed',
}

/**
 * Service for interacting with the orchestrator agent
 */
export class AgentService extends Common.ObjectWrapper.ObjectWrapper<{
  [Events.MESSAGES_CHANGED]: ChatMessage[],
}> {
  static instance: AgentService;

  #state: AgentState = createInitialState();
  #graph?: CompiledGraph;
  #apiKey: string|null = null;
  #isInitialized = false;
  #runningGraphStatePromise?: AsyncGenerator<AgentState, AgentState, void>;
  #tracingProvider!: TracingProvider;
  #sessionId: string;

  constructor() {
    super();
    
    // Initialize tracing
    this.#sessionId = this.generateSessionId();
    this.#initializeTracing();

    // Initialize with a welcome message
    this.#state = createInitialState();
    this.#state.messages.push({
      entity: ChatMessageEntity.MODEL,
      action: 'final',
      answer: i18nString(UIStrings.welcomeMessage),
      isFinalAnswer: true,
    });
  }

  /**
   * Gets the singleton instance of the agent service
   */
  static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService();
    }
    return AgentService.instance;
  }

  /**
   * Gets the API key currently configured for the agent
   */
  getApiKey(): string | null {
    return this.#apiKey;
  }

  /**
   * Initializes the LLM client with provider configurations
   */
  async #initializeLLMClient(): Promise<void> {
    const llm = LLMClient.getInstance();
    
    // Get configuration from localStorage
    const provider = localStorage.getItem('ai_chat_provider') || 'openai';
    const openaiKey = localStorage.getItem('ai_chat_api_key') || '';
    const litellmKey = localStorage.getItem('ai_chat_litellm_api_key') || '';
    const litellmEndpoint = localStorage.getItem('ai_chat_litellm_endpoint') || '';
    const groqKey = localStorage.getItem('ai_chat_groq_api_key') || '';
    const openrouterKey = localStorage.getItem('ai_chat_openrouter_api_key') || '';
    
    const providers = [];
    
    // Only add the selected provider
    if (provider === 'openai' && openaiKey) {
      providers.push({ 
        provider: 'openai' as const, 
        apiKey: openaiKey 
      });
    }
      
    if (provider === 'litellm' && litellmEndpoint) {
      providers.push({ 
        provider: 'litellm' as const, 
        apiKey: litellmKey, // Can be empty for some LiteLLM endpoints
        providerURL: litellmEndpoint 
      });
    }
      
    if (provider === 'groq' && groqKey) {
      providers.push({ 
        provider: 'groq' as const, 
        apiKey: groqKey 
      });
    }
      
    if (provider === 'openrouter' && openrouterKey) {
      providers.push({ 
        provider: 'openrouter' as const, 
        apiKey: openrouterKey 
      });
    }
    
    if (providers.length === 0) {
      let errorMessage = 'OpenAI API key is required for this configuration';
      if (provider === 'litellm') {
        errorMessage = 'LiteLLM endpoint is required for this configuration';
      } else if (provider === 'groq') {
        errorMessage = 'Groq API key is required for this configuration';
      } else if (provider === 'openrouter') {
        errorMessage = 'OpenRouter API key is required for this configuration';
      }
      throw new Error(errorMessage);
    }
    
    await llm.initialize({ providers });
    logger.info('LLM client initialized successfully', {
      selectedProvider: provider,
      providersRegistered: providers.map(p => p.provider),
      providersCount: providers.length
    });
  }

  /**
   * Initializes the agent with the given API key
   */
  async initialize(apiKey: string | null, modelName?: string): Promise<void> {
    try {
      this.#apiKey = apiKey;

      if (!modelName) {
        throw new Error('Model name is required for initialization');
      }
      
      // Initialize LLM client first
      await this.#initializeLLMClient();
      
      // Check if the configuration requires an API key
      const requiresApiKey = this.#doesCurrentConfigRequireApiKey();
      
      // If API key is required but not provided, throw error
      if (requiresApiKey && !apiKey) {
        const provider = localStorage.getItem('ai_chat_provider') || 'openai';
        let providerName = 'OpenAI';
        if (provider === 'litellm') {
          providerName = 'LiteLLM';
        } else if (provider === 'groq') {
          providerName = 'Groq';
        } else if (provider === 'openrouter') {
          providerName = 'OpenRouter';
        }
        throw new Error(`${providerName} API key is required for this configuration`);
      }

      // Will throw error if OpenAI model is used without API key
      this.#graph = createAgentGraph(apiKey, modelName);

      this.#isInitialized = true;
    } catch (error) {
      logger.error('Failed to initialize agent:', error);
      // Pass through specific errors
      if (error instanceof Error && 
          (error.message.includes('API key is required') || 
           error.message.includes('endpoint is required'))) {
        throw error;
      }
      throw new Error(i18nString(UIStrings.agentInitFailed));
    }
  }

  /**
   * Checks if the agent is initialized
   */
  isInitialized(): boolean {
    return this.#isInitialized;
  }

  /**
   * Gets the current state of the agent
   */
  getState(): AgentState {
    return this.#state;
  }

  /**
   * Gets the messages from the agent
   */
  getMessages(): ChatMessage[] {
    return this.#state.messages;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Generate a unique trace ID
   */
  private generateTraceId(): string {
    return `trace-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Initialize or reinitialize the tracing provider
   */
  async #initializeTracing(): Promise<void> {
    this.#tracingProvider = createTracingProvider();
    
    try {
      await this.#tracingProvider.initialize();
      await this.#tracingProvider.createSession(this.#sessionId, {
        source: 'devtools-ai-chat',
        startTime: new Date().toISOString()
      });
      logger.info('Tracing initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize tracing', error);
    }
  }

  /**
   * Refresh the tracing provider (called when configuration changes)
   */
  async refreshTracingProvider(): Promise<void> {
    logger.info('Refreshing tracing provider due to configuration change');
    await this.#initializeTracing();
  }

  /**
   * Sends a message to the AI agent
   */
  async sendMessage(text: string, imageInput?: ImageInputData, selectedAgentType?: string | null): Promise<ChatMessage> {
    // Check if the current configuration requires an API key
    const requiresApiKey = this.#doesCurrentConfigRequireApiKey();
    
    if (requiresApiKey && !this.#apiKey) {
      throw new Error('API key not set. Please set the API key in settings.');
    }

    if (!text.trim()) {
      throw new Error('Empty message. Please enter some text.');
    }

    // Create a user message
    const userMessage = createUserMessage(text, imageInput);

    // Add it to our message history
    this.#state.messages.push(userMessage);

    // Notify listeners of message update
    this.dispatchEventToListeners(Events.MESSAGES_CHANGED, [...this.#state.messages]);

    // Get the user's current context (URL and title)
    const currentPageUrl = await this.#getCurrentPageUrl();
    const currentPageTitle = await this.#getCurrentPageTitle();

    // Check if there's an existing tracing context (e.g., from evaluation)
    const existingContext = getCurrentTracingContext() as TracingContext | null;
    
    let traceId: string;
    let parentObservationId: string | undefined;
    
    if (existingContext?.traceId) {
      // Use the existing trace from evaluation context
      traceId = existingContext.traceId;
      parentObservationId = existingContext.parentObservationId;
      
      logger.debug('Using existing trace context from evaluation', {
        traceId,
        sessionId: existingContext.sessionId,
        parentObservationId,
        tracingEnabled: this.#tracingProvider.isEnabled()
      });
    } else {
      // Create a new trace for this interaction
      traceId = this.generateTraceId();
      
      logger.debug('Creating new trace for user message', {
        traceId,
        sessionId: this.#sessionId,
        tracingEnabled: this.#tracingProvider.isEnabled()
      });
      
      await this.#tracingProvider.createTrace(
        traceId,
        this.#sessionId,
        'User Message',
        { text, imageInput },
        {
          selectedAgentType,
          currentPageUrl,
          currentPageTitle
        },
        undefined, // userId
        [selectedAgentType || 'default'].filter(Boolean)
      );
    }

    console.warn('Trace context for user message', {
      traceId,
      sessionId: existingContext?.sessionId || this.#sessionId,
      selectedAgentType,
      currentPageUrl,
      currentPageTitle,
      messageCount: this.#state.messages.length,
      isExistingTrace: !!existingContext
    });

    // Create user input event
    await this.#tracingProvider.createObservation({
      id: `event-user-input-${Date.now()}`,
      name: 'User Input Received',
      type: 'event',
      startTime: new Date(),
      input: { 
        text, 
        hasImage: !!imageInput,
        messageLength: text.length,
        currentUrl: currentPageUrl
      },
      metadata: {
        selectedAgentType,
        currentPageUrl,
        currentPageTitle,
        messageCount: this.#state.messages.length,
        isEvaluationContext: !!existingContext
      },
      ...(parentObservationId && { parentObservationId })
    }, traceId);
    
    try {
      // Create initial state for this run
      const state: AgentState = {
        messages: this.#state.messages,
        context: {
          tracingContext: {
            sessionId: existingContext?.sessionId || this.#sessionId,
            traceId,
            parentObservationId: parentObservationId
          }
        },
        selectedAgentType: selectedAgentType ?? null, // Set the agent type for this run
        currentPageUrl,
        currentPageTitle,
      };

      console.warn('Going to invoke graph', {
        traceId,
        sessionId: this.#sessionId,
        currentPageUrl,
        currentPageTitle,
        messageCount: this.#state.messages.length
      });

      // Run the agent graph on the state
      console.warn('[AGENT SERVICE DEBUG] About to invoke graph with state:', {
        traceId,
        messagesCount: state.messages.length,
        hasTracingContext: !!state.context?.tracingContext
      });
      this.#runningGraphStatePromise = this.#graph?.invoke(state);

      // Wait for the result
      if (!this.#runningGraphStatePromise) {
        throw new Error('Agent graph not initialized. Please try again.');
      }

      // Iterate through the generator and update UI after each step
      for await (const currentState of this.#runningGraphStatePromise) {
        // Update our messages with the messages from the current step
        this.#state.messages = currentState.messages;

        // Notify listeners of message update immediately
        this.dispatchEventToListeners(Events.MESSAGES_CHANGED, [...this.#state.messages]);
      }

      // Check if the last message is an error (it might have been added in the loop)
      const finalMessage = this.#state.messages[this.#state.messages.length - 1];
      if (!finalMessage) {
          throw new Error('No state returned from agent. Please try again.');
      }

      // Create success completion event
      await this.#tracingProvider.createObservation({
        id: `event-completion-${Date.now()}`,
        name: 'Agent Response Complete',
        type: 'event',
        startTime: new Date(),
        output: {
          messageType: finalMessage.entity,
          action: 'action' in finalMessage ? finalMessage.action : 'unknown',
          isFinalAnswer: 'isFinalAnswer' in finalMessage ? finalMessage.isFinalAnswer : false
        },
        metadata: {
          totalMessages: this.#state.messages.length,
          responseType: 'success'
        }
      }, traceId);

      // Wait a moment for all async tracing operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Only finalize trace if we created a new one (not using existing evaluation trace)
      if (!existingContext) {
        await this.#tracingProvider.finalizeTrace(
          traceId,
          finalMessage,
          { status: 'success' }
        );
      }

      // Return the most recent message (could be final answer, tool call, or error)
      return finalMessage;

    } catch (error) {
      logger.error('Error running agent:', error);

      // Create an error message from the model
      const errorMessage: ModelChatMessage = {
        entity: ChatMessageEntity.MODEL,
        action: 'final',
        answer: error instanceof Error ? error.message : String(error),
        isFinalAnswer: true,
        error: error instanceof Error ? error.message : String(error),
      };

      // Add it to our message history
      this.#state.messages.push(errorMessage);

      // Notify listeners of message update
      this.dispatchEventToListeners(Events.MESSAGES_CHANGED, [...this.#state.messages]);

      // Create error completion event
      await this.#tracingProvider.createObservation({
        id: `event-error-${Date.now()}`,
        name: 'Agent Error',
        type: 'event',
        startTime: new Date(),
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          totalMessages: this.#state.messages.length,
          responseType: 'error'
        }
      }, traceId);

      // Only finalize trace if we created a new one (not using existing evaluation trace)
      if (!existingContext) {
        await this.#tracingProvider.finalizeTrace(
          traceId,
          errorMessage,
          { status: 'error', error: error instanceof Error ? error.message : String(error) }
        );
      }

      return errorMessage;
    }
  }

  /**
   * Clears the conversation history
   */
  clearConversation(): void {
    // Create a fresh state
    this.#state = createInitialState();

    // Add welcome message
    this.#state.messages.push({
      entity: ChatMessageEntity.MODEL,
      action: 'final',
      answer: i18nString(UIStrings.welcomeMessage),
      isFinalAnswer: true,
    });

    // Notify listeners that messages have changed
    this.dispatchEventToListeners(Events.MESSAGES_CHANGED, [...this.#state.messages]);
  }

  /**
   * Sets the API key for the agent and re-initializes the graph
   * @param apiKey The new API key
   */
  setApiKey(apiKey: string): void {
    this.#apiKey = apiKey;
    this.#isInitialized = false; // Force re-initialization on next message
  }

  /**
   * Gets the current page URL from the target
   */
  async #getCurrentPageUrl(): Promise<string> {
    let pageUrl = '';
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (target) {
      try {
        const urlResult = await target.runtimeAgent().invoke_evaluate({
          expression: 'window.location.href',
          returnByValue: true
        });

        if (urlResult.result && !urlResult.exceptionDetails) {
          pageUrl = urlResult.result.value || '';
        }
      } catch (error) {
        logger.error('Error fetching page URL:', error);
      }
    }
    return pageUrl;
  }

  /**
   * Gets the current page title from the target
   */
  async #getCurrentPageTitle(): Promise<string> {
    let pageTitle = '';
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (target) {
      try {
        const titleResult = await target.runtimeAgent().invoke_evaluate({
          expression: 'document.title',
          returnByValue: true
        });

        if (titleResult.result && !titleResult.exceptionDetails) {
          pageTitle = titleResult.result.value || '';
        }
      } catch (error) {
        logger.error('Error fetching page title:', error);
      }
    }
    return pageTitle;
  }
  
  /**
   * Helper to determine if the current configuration requires an API key
   * LiteLLM with an endpoint doesn't require an API key, other providers do
   */
  #doesCurrentConfigRequireApiKey(): boolean {
    try {
      // Check the selected provider
      const selectedProvider = localStorage.getItem('ai_chat_provider') || 'openai';
      
      // OpenAI provider always requires an API key
      if (selectedProvider === 'openai') {
        return true;
      }
      
      // Groq provider always requires an API key
      if (selectedProvider === 'groq') {
        return true;
      }
      
      // OpenRouter provider always requires an API key
      if (selectedProvider === 'openrouter') {
        return true;
      }
      
      // For LiteLLM, only require API key if no endpoint is configured
      if (selectedProvider === 'litellm') {
        const hasLiteLLMEndpoint = Boolean(localStorage.getItem('ai_chat_litellm_endpoint'));
        // If we have an endpoint, API key is optional
        return !hasLiteLLMEndpoint;
      }
      
      // Default to requiring API key for any unknown provider
      return true;
    } catch (error) {
      logger.error('Error checking if API key is required:', error);
      // Default to requiring API key in case of errors
      return true;
    }
  }
}

// Define UI strings object to manage i18n strings
const UIStrings = {
  /**
   * @description Welcome message for empty conversation
   */
  welcomeMessage: 'Hello! I\'m your AI assistant. How can I help you today?',
  /**
   * @description Error message when the agent fails to initialize
   */
  agentInitFailed: 'Failed to initialize agent.',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/ai_chat/core/AgentService.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// Register as a module
Common.Revealer.registerRevealer({
  contextTypes() {
    return [AgentService];
  },
  async loadRevealer() {
    return {
      reveal: async(agentService: AgentService): Promise<void> => {
        if (!(agentService instanceof AgentService)) {
          return;
        }
        // Reveal the AI Chat panel
        await UI.ViewManager.ViewManager.instance().showView('ai-chat');
      }
    };
  }
});
