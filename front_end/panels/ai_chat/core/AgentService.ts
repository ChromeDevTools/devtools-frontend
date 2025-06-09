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

  constructor() {
    super();

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
   * Initializes the agent with the given API key
   */
  async initialize(apiKey: string | null, modelName?: string): Promise<void> {
    try {
      this.#apiKey = apiKey;

      if (!modelName) {
        throw new Error('Model name is required for initialization');
      }
      
      // Check if the configuration requires an API key
      const requiresApiKey = this.#doesCurrentConfigRequireApiKey();
      
      // If API key is required but not provided, throw error
      if (requiresApiKey && !apiKey) {
        const provider = localStorage.getItem('ai_chat_provider') || 'openai';
        throw new Error(`${provider === 'openai' ? 'OpenAI' : 'LiteLLM'} API key is required for this configuration`);
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

    try {
      // Create initial state for this run
      const state: AgentState = {
        messages: this.#state.messages,
        context: {},
        selectedAgentType: selectedAgentType ?? null, // Set the agent type for this run
        currentPageUrl,
        currentPageTitle,
      };

      // Run the agent graph on the state
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
