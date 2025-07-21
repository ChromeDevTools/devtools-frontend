// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import {AgentService, Events as AgentEvents} from '../core/AgentService.js';
import { LLMClient } from '../LLM/LLMClient.js';
import { LLMProviderRegistry } from '../LLM/LLMProviderRegistry.js';
import { OpenAIProvider } from '../LLM/OpenAIProvider.js';
import { LiteLLMProvider } from '../LLM/LiteLLMProvider.js';
import { GroqProvider } from '../LLM/GroqProvider.js';
import { OpenRouterProvider } from '../LLM/OpenRouterProvider.js';
import { createLogger } from '../core/Logger.js';

const logger = createLogger('AIChatPanel');

/**
 * Storage monitoring utility for debugging credential issues
 */
class StorageMonitor {
  private static instance: StorageMonitor | null = null;
  private originalSetItem: typeof localStorage.setItem;
  private originalRemoveItem: typeof localStorage.removeItem;
  
  private constructor() {
    this.originalSetItem = localStorage.setItem.bind(localStorage);
    this.originalRemoveItem = localStorage.removeItem.bind(localStorage);
    this.setupStorageMonitoring();
  }
  
  static getInstance(): StorageMonitor {
    if (!StorageMonitor.instance) {
      StorageMonitor.instance = new StorageMonitor();
    }
    return StorageMonitor.instance;
  }
  
  private setupStorageMonitoring(): void {
    // Monitor setItem operations
    localStorage.setItem = (key: string, value: string) => {
      if (key.includes('openrouter') || key.includes('ai_chat')) {
        logger.debug(`=== LOCALSTORAGE SET ===`);
        logger.debug(`Key: ${key}`);
        logger.debug(`Value exists: ${!!value}`);
        logger.debug(`Value length: ${value?.length || 0}`);
        logger.debug(`Value preview: ${value?.substring(0, 50) + (value?.length > 50 ? '...' : '') || 'null'}`);
        logger.debug(`Timestamp: ${new Date().toISOString()}`);
      }
      return this.originalSetItem(key, value);
    };
    
    // Monitor removeItem operations
    localStorage.removeItem = (key: string) => {
      if (key.includes('openrouter') || key.includes('ai_chat')) {
        logger.debug(`=== LOCALSTORAGE REMOVE ===`);
        logger.debug(`Key: ${key}`);
        logger.debug(`Timestamp: ${new Date().toISOString()}`);
      }
      return this.originalRemoveItem(key);
    };
  }
  
  restore(): void {
    localStorage.setItem = this.originalSetItem;
    localStorage.removeItem = this.originalRemoveItem;
  }
}

import chatViewStyles from './chatView.css.js';
import {
  type ChatMessage,
  ChatMessageEntity,
  ChatView,
  type ImageInputData,
  type ModelChatMessage,
  State as ChatViewState,
} from './ChatView.js';
import { HelpDialog } from './HelpDialog.js';
import { SettingsDialog, isVectorDBEnabled } from './SettingsDialog.js';
import { EvaluationDialog } from './EvaluationDialog.js';
import * as Snackbars from '../../../ui/components/snackbars/snackbars.js';

const {html} = Lit;

// Model type definition
export interface ModelOption {
  value: string;
  label: string;
  type: 'openai' | 'litellm' | 'groq' | 'openrouter';
}

// Add model options constant - these are the default OpenAI models
const DEFAULT_OPENAI_MODELS: ModelOption[] = [
  {value: 'o4-mini-2025-04-16', label: 'O4 Mini', type: 'openai'},
  {value: 'gpt-4.1-mini-2025-04-14', label: 'GPT-4.1 Mini', type: 'openai'},
  {value: 'gpt-4.1-nano-2025-04-14', label: 'GPT-4.1 Nano', type: 'openai'},
  {value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1', type: 'openai'},
];

// Default model selections for each provider
export const DEFAULT_PROVIDER_MODELS: Record<string, {main: string, mini?: string, nano?: string}> = {
  openai: {
    main: 'gpt-4.1-2025-04-14',
    mini: 'gpt-4.1-mini-2025-04-14',
    nano: 'gpt-4.1-nano-2025-04-14'
  },
  litellm: {
    main: '', // Will use first available model
    mini: '',
    nano: ''
  },
  groq: {
    main: 'meta-llama/llama-4-scout-17b-16e-instruct',
    mini: 'qwen/qwen3-32b',
    nano: 'llama-3.1-8b-instant'
  },
  openrouter: {
    main: 'anthropic/claude-sonnet-4',
    mini: 'google/gemini-2.5-flash',
    nano: 'google/gemini-2.0-flash-001'
  }
};

// This will hold the current active model options
let MODEL_OPTIONS: ModelOption[] = [...DEFAULT_OPENAI_MODELS];

// Model selector localStorage keys
const MODEL_SELECTION_KEY = 'ai_chat_model_selection';
const MINI_MODEL_STORAGE_KEY = 'ai_chat_mini_model';
const NANO_MODEL_STORAGE_KEY = 'ai_chat_nano_model';
// Provider selection key
const PROVIDER_SELECTION_KEY = 'ai_chat_provider';
// LiteLLM configuration keys
const LITELLM_ENDPOINT_KEY = 'ai_chat_litellm_endpoint';
const LITELLM_API_KEY_STORAGE_KEY = 'ai_chat_litellm_api_key';

const UIStrings = {
  /**
   *@description Text for the AI welcome message
   */
  welcomeMessage: 'Hello! I\'m your AI assistant. How can I help you today?',
  /**
   *@description AI chat UI text creating a new chat.
   */
  newChat: 'New chat',
  /**
   *@description AI chat UI tooltip text for the help button.
   */
  help: 'Help',
  /**
   *@description AI chat UI tooltip text for the settings button (gear icon).
   */
  settings: 'Settings',
  /**
   *@description Announcement text for screen readers when a new chat is created.
   */
  newChatCreated: 'New chat created',
  /**
   *@description Announcement text for screen readers when the chat is deleted.
   */
  chatDeleted: 'Chat deleted',
  /**
   *@description AI chat UI text creating selecting a history entry.
   */
  history: 'History',
  /**
   *@description AI chat UI text deleting the current chat session from local history.
   */
  deleteChat: 'Delete local chat',
  /**
   * @description Default text shown in the chat input
   */
  inputPlaceholder: 'Ask a question...',
  /**
   * @description Placeholder when OpenAI API key is missing
   */
  missingOpenAIKey: 'Please add your OpenAI API key in Settings',
  /**
   * @description Placeholder when LiteLLM endpoint is missing
   */
  missingLiteLLMEndpoint: 'Please configure LiteLLM endpoint in Settings',
  /**
   * @description Generic placeholder when provider credentials are missing
   */
  missingProviderCredentials: 'Provider credentials required. Please configure in Settings',
  /**
   * @description Run evaluation tests
   */
  runEvaluationTests: 'Run Evaluation Tests',
  /**
   * @description Bookmark current page
   */
  bookmarkPage: 'Bookmark Page',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/ai_chat/ui/AIChatPanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface ToolbarViewInput {
  onNewChatClick: () => void;
  onHistoryClick: (event: MouseEvent) => void;
  onDeleteClick: () => void;
  onHelpClick: () => void;
  onSettingsClick: () => void;
  onEvaluationTestClick: () => void;
  onBookmarkClick: () => void;
  isDeleteHistoryButtonVisible: boolean;
  isCenteredView: boolean;
  isVectorDBEnabled: boolean;
}

function toolbarView(input: ToolbarViewInput): Lit.LitTemplate {
  // clang-format off
  return html`
    <div class="toolbar-container" role="toolbar" .jslogContext=${VisualLogging.toolbar()} style="display: flex; justify-content: space-between; width: 100%; padding: 0 4px; box-sizing: border-box; margin: 0 0 10px 0;">
      <devtools-toolbar class="ai-chat-left-toolbar" role="presentation">
      <devtools-button
          title=${i18nString(UIStrings.history)}
          aria-label=${i18nString(UIStrings.history)}
          .iconName=${'history'}
          .jslogContext=${'ai-chat.history'}
          .variant=${Buttons.Button.Variant.TOOLBAR}
          @click=${input.onHistoryClick}></devtools-button>
          <div class="toolbar-divider"></div>
        ${!input.isCenteredView ? html`
        <devtools-button
          title=${i18nString(UIStrings.newChat)}
          aria-label=${i18nString(UIStrings.newChat)}
          .iconName=${'plus'}
          .jslogContext=${'ai-chat.new-chat'}
          .variant=${Buttons.Button.Variant.TOOLBAR}
          @click=${input.onNewChatClick}></devtools-button>
        ` : Lit.nothing}
      </devtools-toolbar>
      
      <devtools-toolbar class="ai-chat-right-toolbar" role="presentation">
        <div class="toolbar-divider"></div>
        ${input.isDeleteHistoryButtonVisible
          ? html`<devtools-button
              title=${i18nString(UIStrings.deleteChat)}
              aria-label=${i18nString(UIStrings.deleteChat)}
              .iconName=${'bin'}
              .jslogContext=${'ai-chat.delete'}
              .variant=${Buttons.Button.Variant.TOOLBAR}
              @click=${input.onDeleteClick}></devtools-button>`
          : Lit.nothing}
        <devtools-button
          title=${i18nString(UIStrings.runEvaluationTests)}
          aria-label=${i18nString(UIStrings.runEvaluationTests)}
          .iconName=${'experiment'}
          .jslogContext=${'ai-chat.evaluation-tests'}
          .variant=${Buttons.Button.Variant.TOOLBAR}
          @click=${input.onEvaluationTestClick}></devtools-button>
        ${input.isVectorDBEnabled
          ? html`<devtools-button
              title=${i18nString(UIStrings.bookmarkPage)}
              aria-label=${i18nString(UIStrings.bookmarkPage)}
              .iconName=${'download'}
              .jslogContext=${'ai-chat.bookmark-page'}
              .variant=${Buttons.Button.Variant.TOOLBAR}
              @click=${input.onBookmarkClick}></devtools-button>`
          : Lit.nothing}
        <devtools-button
          title=${i18nString(UIStrings.settings)}
          aria-label=${i18nString(UIStrings.settings)}
          .iconName=${'gear'}
          .jslogContext=${'ai-chat.settings'}
          .variant=${Buttons.Button.Variant.TOOLBAR}
          @click=${input.onSettingsClick}></devtools-button>
        <devtools-button
          title=${i18nString(UIStrings.help)}
          aria-label=${i18nString(UIStrings.help)}
          .iconName=${'help'}
          .jslogContext=${'ai-chat.help'}
          .variant=${Buttons.Button.Variant.TOOLBAR}
          @click=${input.onHelpClick}></devtools-button>
        <devtools-button
            title="Close Chat Window"
            aria-label="Close Chat Window"
            .iconName=${'cross'}
            .jslogContext=${'ai-chat.close-devtools'}
            .variant=${Buttons.Button.Variant.TOOLBAR}
            @click=${() => Host.InspectorFrontendHost.InspectorFrontendHostInstance.closeWindow()}></devtools-button>
      </devtools-toolbar>
    </div>
  `;
  // clang-format on
}


export class AIChatPanel extends UI.Panel.Panel {
  static #instance: AIChatPanel|null = null;

  static instance(): AIChatPanel {
    if (!AIChatPanel.#instance) {
      AIChatPanel.#instance = new AIChatPanel();
    }
    return AIChatPanel.#instance;
  }

  static getMiniModel(): string {
    const instance = AIChatPanel.instance();
    return instance.#miniModel || instance.#selectedModel;
  }

  static getNanoModel(): string {
    const instance = AIChatPanel.instance();
    return instance.#nanoModel || instance.#miniModel || instance.#selectedModel;
  }

  static getNanoModelWithProvider(): { model: string, provider: 'openai' | 'litellm' | 'groq' | 'openrouter' } {
    const modelName = AIChatPanel.getNanoModel();
    const allModelOptions = AIChatPanel.getModelOptions();
    const modelOption = allModelOptions.find(option => option.value === modelName);
    
    return {
      model: modelName,
      provider: (modelOption?.type as 'openai' | 'litellm' | 'groq' | 'openrouter') || 'openai'
    };
  }

  static getMiniModelWithProvider(): { model: string, provider: 'openai' | 'litellm' | 'groq' | 'openrouter' } {
    const modelName = AIChatPanel.getMiniModel();
    const allModelOptions = AIChatPanel.getModelOptions();
    const modelOption = allModelOptions.find(option => option.value === modelName);
    
    return {
      model: modelName,
      provider: (modelOption?.type as 'openai' | 'litellm' | 'groq' | 'openrouter') || 'openai'
    };
  }

  static getProviderForModel(modelName: string): 'openai' | 'litellm' | 'groq' | 'openrouter' {
    const allModelOptions = AIChatPanel.getModelOptions();
    const modelOption = allModelOptions.find(option => option.value === modelName);
    const originalProvider = (modelOption?.type as 'openai' | 'litellm' | 'groq' | 'openrouter') || 'openai';
    
    // Check if the model's original provider is available in the registry
    if (LLMProviderRegistry.hasProvider(originalProvider)) {
      return originalProvider;
    }
    
    // If the original provider isn't available, fall back to the currently selected provider
    const currentProvider = localStorage.getItem(PROVIDER_SELECTION_KEY) || 'openai';
    logger.debug(`Provider ${originalProvider} not available for model ${modelName}, falling back to current provider: ${currentProvider}`);
    return currentProvider as 'openai' | 'litellm' | 'groq' | 'openrouter';
  }
  
  /**
   * Gets all model options or filters by provider
   * @param provider Optional provider to filter by
   * @returns Array of model options
   */
  static getModelOptions(provider?: 'openai' | 'litellm' | 'groq' | 'openrouter'): ModelOption[] {
    // Try to get from all_model_options first (comprehensive list)
    const allModelOptionsStr = localStorage.getItem('ai_chat_all_model_options');
    if (allModelOptionsStr) {
      const allModelOptions = JSON.parse(allModelOptionsStr);
      // If provider is specified, filter by it
      return provider ? allModelOptions.filter((opt: ModelOption) => opt.type === provider) : allModelOptions;
    }
    
    // Fallback to legacy model_options if all_model_options doesn't exist
    const modelOptionsStr = localStorage.getItem('ai_chat_model_options');
    if (modelOptionsStr) {
      const modelOptions = JSON.parse(modelOptionsStr);
      // If we got legacy options, migrate them to all_model_options for future use
      localStorage.setItem('ai_chat_all_model_options', modelOptionsStr);
      // Apply provider filter if needed
      return provider ? modelOptions.filter((opt: ModelOption) => opt.type === provider) : modelOptions;
    }
    
    // If nothing is found, return default OpenAI models
    return provider === 'litellm' ? [] : DEFAULT_OPENAI_MODELS;
  }
  
  /**
   * Updates model options with new provider models
   * @param providerModels Models fetched from any provider (LiteLLM, Groq, etc.)
   * @param hadWildcard Whether LiteLLM returned a wildcard model
   * @returns Updated model options
   */
  static updateModelOptions(providerModels: ModelOption[] = [], hadWildcard = false): ModelOption[] {
    // Get the selected provider (for context, but we store all models regardless)
    const selectedProvider = localStorage.getItem(PROVIDER_SELECTION_KEY) || 'openai';
    
    // Get existing models from localStorage
    const existingAllModels = JSON.parse(localStorage.getItem('ai_chat_all_model_options') || '[]');
    
    // Get existing custom models (if any) - these are for LiteLLM only
    const savedCustomModels = JSON.parse(localStorage.getItem('ai_chat_custom_models') || '[]');
    const customModels = savedCustomModels.map((model: string) => ({
      value: model,
      label: `LiteLLM: ${model}`,
      type: 'litellm' as const
    }));
    
    // Separate existing models by provider type
    const existingOpenAIModels = existingAllModels.filter((m: ModelOption) => m.type === 'openai');
    const existingLiteLLMModels = existingAllModels.filter((m: ModelOption) => m.type === 'litellm');
    const existingGroqModels = existingAllModels.filter((m: ModelOption) => m.type === 'groq');
    const existingOpenRouterModels = existingAllModels.filter((m: ModelOption) => m.type === 'openrouter');
    
    // Update models based on what type of models we're adding
    let updatedOpenAIModels = existingOpenAIModels.length > 0 ? existingOpenAIModels : DEFAULT_OPENAI_MODELS;
    let updatedLiteLLMModels = existingLiteLLMModels;
    let updatedGroqModels = existingGroqModels;
    let updatedOpenRouterModels = existingOpenRouterModels;
    
    // Replace models for the provider type we're updating
    if (providerModels.length > 0) {
      const firstModelType = providerModels[0].type;
      if (firstModelType === 'litellm') {
        updatedLiteLLMModels = [...customModels, ...providerModels];
      } else if (firstModelType === 'groq') {
        updatedGroqModels = providerModels;
      } else if (firstModelType === 'openrouter') {
        updatedOpenRouterModels = providerModels;
      } else if (firstModelType === 'openai') {
        updatedOpenAIModels = providerModels;
      }
    }
    
    // Create the comprehensive model list with all models from all providers
    const allModels = [
      ...updatedOpenAIModels,
      ...updatedLiteLLMModels,
      ...updatedGroqModels,
      ...updatedOpenRouterModels
    ];
    
    // Save the comprehensive list to localStorage
    localStorage.setItem('ai_chat_all_model_options', JSON.stringify(allModels));
    
    // For backwards compatibility, also update the MODEL_OPTIONS variable
    // based on the currently selected provider
    if (selectedProvider === 'openai') {
      MODEL_OPTIONS = updatedOpenAIModels;
    } else if (selectedProvider === 'groq') {
      MODEL_OPTIONS = updatedGroqModels;
      
      // Add placeholder if no Groq models available
      if (MODEL_OPTIONS.length === 0) {
        MODEL_OPTIONS.push({
          value: '_placeholder_no_models',
          label: 'Groq: Please configure API key in settings',
          type: 'groq' as const
        });
      }
    } else if (selectedProvider === 'openrouter') {
      MODEL_OPTIONS = updatedOpenRouterModels;
      
      // Add placeholder if no OpenRouter models available
      if (MODEL_OPTIONS.length === 0) {
        MODEL_OPTIONS.push({
          value: '_placeholder_no_models',
          label: 'OpenRouter: Please configure API key in settings',
          type: 'openrouter' as const
        });
      }
    } else {
      // For LiteLLM provider, include custom models and fetched models
      MODEL_OPTIONS = updatedLiteLLMModels;
      
      // Add placeholder if needed for LiteLLM when we have no models
      if (hadWildcard && MODEL_OPTIONS.length === 0) {
        MODEL_OPTIONS.push({
          value: '_placeholder_add_custom',
          label: 'LiteLLM: Please add custom models in settings',
          type: 'litellm' as const
        });
      }
    }
    
    // Save MODEL_OPTIONS to localStorage for backwards compatibility
    localStorage.setItem('ai_chat_model_options', JSON.stringify(MODEL_OPTIONS));
    
    logger.info('Updated model options:', {
      provider: selectedProvider,
      openaiModels: updatedOpenAIModels.length,
      litellmModels: updatedLiteLLMModels.length,
      groqModels: updatedGroqModels.length,
      openrouterModels: updatedOpenRouterModels.length,
      totalModelOptions: MODEL_OPTIONS.length,
      allModelsLength: allModels.length
    });
    
    return allModels;
  }
  
  /**
   * Adds a custom model to the options
   * @param modelName Name of the model to add
   * @param modelType Type of the model ('openai' or 'litellm')
   * @returns Updated model options
   */
  static addCustomModelOption(modelName: string, modelType: 'openai' | 'litellm' | 'groq' | 'openrouter' = 'litellm'): ModelOption[] {
    // Get existing custom models
    const savedCustomModels = JSON.parse(localStorage.getItem('ai_chat_custom_models') || '[]');
    
    // Check if the model already exists
    if (savedCustomModels.includes(modelName)) {
      logger.info(`Custom model ${modelName} already exists, not adding again`);
      return AIChatPanel.getModelOptions();
    }
    
    // Add the new model to custom models
    savedCustomModels.push(modelName);
    localStorage.setItem('ai_chat_custom_models', JSON.stringify(savedCustomModels));
    
    // Create the model option object
    const newOption: ModelOption = {
      value: modelName,
      label: modelType === 'litellm' ? `LiteLLM: ${modelName}` : 
             modelType === 'groq' ? `Groq: ${modelName}` : 
             modelType === 'openrouter' ? `OpenRouter: ${modelName}` :
             `OpenAI: ${modelName}`,
      type: modelType
    };
    
    // Get all existing model options
    const allModelOptions = AIChatPanel.getModelOptions();
    
    // Add the new option
    const updatedOptions = [...allModelOptions, newOption];
    localStorage.setItem('ai_chat_all_model_options', JSON.stringify(updatedOptions));
    
    // Update MODEL_OPTIONS for backwards compatibility if provider matches
    const currentProvider = localStorage.getItem(PROVIDER_SELECTION_KEY) || 'openai';
    if ((currentProvider === 'openai' && modelType === 'openai') || 
        (currentProvider === 'litellm' && modelType === 'litellm') ||
        (currentProvider === 'groq' && modelType === 'groq')) {
      MODEL_OPTIONS = [...MODEL_OPTIONS, newOption];
      localStorage.setItem('ai_chat_model_options', JSON.stringify(MODEL_OPTIONS));
    }
    
    return updatedOptions;
  }
  
  /**
   * Removes a custom model from the options
   * @param modelName Name of the model to remove
   * @returns Updated model options
   */
  static removeCustomModelOption(modelName: string): ModelOption[] {
    // Get existing custom models
    const savedCustomModels = JSON.parse(localStorage.getItem('ai_chat_custom_models') || '[]');
    
    // Check if the model exists
    if (!savedCustomModels.includes(modelName)) {
      logger.info(`Custom model ${modelName} not found, nothing to remove`);
      return AIChatPanel.getModelOptions();
    }
    
    // Remove the model from custom models
    const updatedCustomModels = savedCustomModels.filter((model: string) => model !== modelName);
    localStorage.setItem('ai_chat_custom_models', JSON.stringify(updatedCustomModels));
    
    // Get all existing model options and remove the specified one
    const allModelOptions = AIChatPanel.getModelOptions();
    const updatedOptions = allModelOptions.filter(option => option.value !== modelName);
    localStorage.setItem('ai_chat_all_model_options', JSON.stringify(updatedOptions));
    
    // Update MODEL_OPTIONS for backwards compatibility
    MODEL_OPTIONS = MODEL_OPTIONS.filter(option => option.value !== modelName);
    localStorage.setItem('ai_chat_model_options', JSON.stringify(MODEL_OPTIONS));
    
    return updatedOptions;
  }

  static readonly panelName = 'ai-chat';

  // TODO: Move messages to a separate state object
  #messages: ChatMessage[] = [];
  #chatView!: ChatView; // Using the definite assignment assertion
  #toolbarContainer!: HTMLDivElement;
  #chatViewContainer!: HTMLDivElement;
  #isTextInputEmpty = true;
  #agentService = AgentService.getInstance();
  #isProcessing = false;
  #imageInput?: ImageInputData;
  #selectedAgentType: string | null = null;
  #selectedModel: string = MODEL_OPTIONS.length > 0 ? MODEL_OPTIONS[0].value : ''; // Default to first model if available
  #miniModel = ''; // Mini model selection
  #nanoModel = ''; // Nano model selection
  #canSendMessages = false; // Add flag to track if we can send messages (has required credentials)
  #settingsButton: HTMLElement | null = null; // Reference to the settings button
  #liteLLMApiKey: string | null = null; // LiteLLM API key
  #liteLLMEndpoint: string | null = null; // LiteLLM endpoint
  #apiKey: string | null = null; // Regular API key

  constructor() {
    super(AIChatPanel.panelName);

    // Initialize storage monitoring for debugging
    StorageMonitor.getInstance();
    
    this.#setupUI();
    this.#setupInitialState();
    this.#setupOAuthEventListeners();
    this.#initializeAgentService();
    this.performUpdate();
    this.#fetchLiteLLMModelsOnLoad();
  }

  /**
   * Sets up the UI components and layout
   */
  #setupUI(): void {
    // Register CSS styles
    this.registerRequiredCSS(chatViewStyles);

    // Set flex layout for the content element to ensure it takes full height
    this.contentElement.style.display = 'flex';
    this.contentElement.style.flexDirection = 'column';
    this.contentElement.style.height = '100%';

    // Create container for the toolbar
    this.#toolbarContainer = document.createElement('div');
    this.contentElement.appendChild(this.#toolbarContainer);

    // Create container for the chat view
    this.#chatViewContainer = document.createElement('div');
    this.#chatViewContainer.style.flex = '1';
    this.#chatViewContainer.style.overflow = 'hidden';
    this.contentElement.appendChild(this.#chatViewContainer);

    // Create ChatView and append it to its container
    this.#chatView = new ChatView();
    this.#chatView.style.flexGrow = '1';
    this.#chatView.style.overflow = 'auto';
    this.#chatViewContainer.appendChild(this.#chatView);
    
    // Add event listener for manual setup requests from ChatView
    this.#chatView.addEventListener('manual-setup-requested', this.#handleManualSetupRequest.bind(this));
  }

  /**
   * Sets up the initial state from localStorage
   */
  #setupInitialState(): void {
    // Load API keys and configurations from localStorage first
    this.#apiKey = localStorage.getItem('ai_chat_api_key');
    this.#liteLLMApiKey = localStorage.getItem(LITELLM_API_KEY_STORAGE_KEY);
    this.#liteLLMEndpoint = localStorage.getItem(LITELLM_ENDPOINT_KEY);
    
    // Load agent type if previously set
    const savedAgentType = localStorage.getItem('ai_chat_agent_type');
    if (savedAgentType) {
      this.#selectedAgentType = savedAgentType;
    }

    this.#setupModelOptions();
    
    // Only add welcome message if credentials are available (no OAuth login needed)
    if (this.#hasAnyProviderCredentials()) {
      this.#messages.push({
        entity: ChatMessageEntity.MODEL,
        action: 'final',
        answer: i18nString(UIStrings.welcomeMessage),
        isFinalAnswer: true,
      });
    }
  }

  /**
   * Sets up model options based on provider and stored preferences
   */
  #setupModelOptions(): void {
    // Get the selected provider
    const selectedProvider = localStorage.getItem(PROVIDER_SELECTION_KEY) || 'openai';
    
    // Initialize MODEL_OPTIONS based on the selected provider
    this.#updateModelOptions([], false);
    
    // Load custom models
    const savedCustomModels = JSON.parse(localStorage.getItem('ai_chat_custom_models') || '[]');
    
    // If we have custom models and using LiteLLM, add them
    if (savedCustomModels.length > 0 && selectedProvider === 'litellm') {
      // Add custom models to MODEL_OPTIONS
      const customOptions = savedCustomModels.map((model: string) => ({
        value: model,
        label: `LiteLLM: ${model}`,
        type: 'litellm' as const
      }));
      MODEL_OPTIONS = [...MODEL_OPTIONS, ...customOptions];

      // Save MODEL_OPTIONS to localStorage
      localStorage.setItem('ai_chat_model_options', JSON.stringify(MODEL_OPTIONS));
    }
    
    this.#loadModelSelections();
  }

  /**
   * Loads model selections from localStorage
   */
  #loadModelSelections(): void {
    // Get the current provider
    const currentProvider = localStorage.getItem(PROVIDER_SELECTION_KEY) || 'openai';
    const providerDefaults = DEFAULT_PROVIDER_MODELS[currentProvider] || DEFAULT_PROVIDER_MODELS.openai;
    
    // Load the selected model
    const storedModel = localStorage.getItem(MODEL_SELECTION_KEY);
    
    if (MODEL_OPTIONS.length === 0) {
      logger.warn('No model options available when loading model selections');
      return;
    }
    
    if (storedModel && MODEL_OPTIONS.some(option => option.value === storedModel)) {
      this.#selectedModel = storedModel;
    } else if (MODEL_OPTIONS.length > 0) {
      // Check if provider default main model is available
      if (providerDefaults.main && MODEL_OPTIONS.some(option => option.value === providerDefaults.main)) {
        this.#selectedModel = providerDefaults.main;
      } else {
        // Otherwise, use the first available model
        this.#selectedModel = MODEL_OPTIONS[0].value;
      }
      localStorage.setItem(MODEL_SELECTION_KEY, this.#selectedModel);
    }
    
    // Load mini model - check that it belongs to current provider
    const storedMiniModel = localStorage.getItem(MINI_MODEL_STORAGE_KEY);
    const storedMiniModelOption = storedMiniModel ? MODEL_OPTIONS.find(option => option.value === storedMiniModel) : null;
    if (storedMiniModelOption && storedMiniModelOption.type === currentProvider && storedMiniModel) {
      this.#miniModel = storedMiniModel;
    } else if (providerDefaults.mini && MODEL_OPTIONS.some(option => option.value === providerDefaults.mini)) {
      // Use provider default mini model if available
      this.#miniModel = providerDefaults.mini;
      localStorage.setItem(MINI_MODEL_STORAGE_KEY, this.#miniModel);
    } else {
      this.#miniModel = '';
      localStorage.removeItem(MINI_MODEL_STORAGE_KEY);
    }

    // Load nano model - check that it belongs to current provider
    const storedNanoModel = localStorage.getItem(NANO_MODEL_STORAGE_KEY);
    const storedNanoModelOption = storedNanoModel ? MODEL_OPTIONS.find(option => option.value === storedNanoModel) : null;
    if (storedNanoModelOption && storedNanoModelOption.type === currentProvider && storedNanoModel) {
      this.#nanoModel = storedNanoModel;
    } else if (providerDefaults.nano && MODEL_OPTIONS.some(option => option.value === providerDefaults.nano)) {
      // Use provider default nano model if available
      this.#nanoModel = providerDefaults.nano;
      localStorage.setItem(NANO_MODEL_STORAGE_KEY, this.#nanoModel);
    } else {
      this.#nanoModel = '';
      localStorage.removeItem(NANO_MODEL_STORAGE_KEY);
    }
    
    logger.info('Loaded model selections:', {
      provider: currentProvider,
      selectedModel: this.#selectedModel,
      miniModel: this.#miniModel,
      nanoModel: this.#nanoModel
    });
  }

  /**
   * Sets up event listeners for OAuth authentication events
   */
  #setupOAuthEventListeners(): void {
    // Listen for OAuth success events
    window.addEventListener('openrouter-oauth-success', () => {
      logger.info('=== OAUTH SUCCESS EVENT RECEIVED IN AICHATPANEL ===');
      logger.info('Timestamp:', new Date().toISOString());
      logger.info('Current localStorage state for OpenRouter:');
      const apiKey = localStorage.getItem('ai_chat_openrouter_api_key');
      const authMethod = localStorage.getItem('openrouter_auth_method');
      logger.info('- API key exists:', !!apiKey);
      logger.info('- API key length:', apiKey?.length || 0);
      logger.info('- Auth method:', authMethod);
      logger.info('Re-initializing agent service after OAuth success...');
      this.#initializeAgentService();
    });
    
    // Listen for OAuth logout events  
    window.addEventListener('openrouter-oauth-logout', () => {
      logger.info('=== OAUTH LOGOUT EVENT RECEIVED IN AICHATPANEL ===');
      logger.info('Re-initializing agent service after OAuth logout...');
      this.#initializeAgentService();
    });

    // Listen for localStorage changes (covers manual API key changes too)
    window.addEventListener('storage', (event) => {
      if (event.key === 'ai_chat_openrouter_api_key' || 
          event.key === 'openrouter_auth_method') {
        logger.info('=== STORAGE CHANGE EVENT FOR OPENROUTER ===');
        logger.info('Changed key:', event.key);
        logger.info('Old value exists:', !!event.oldValue);
        logger.info('New value exists:', !!event.newValue);
        logger.info('New value length:', event.newValue?.length || 0);
        logger.info('Re-initializing agent service after storage change...');
        this.#initializeAgentService();
      }
    });
  }

  getSelectedModel(): string {
    return this.#selectedModel;
  }

  /**
   * Public method to refresh credential validation and agent service
   * Can be called from settings dialog or other components
   */
  refreshCredentials(): void {
    logger.info('=== MANUAL CREDENTIAL REFRESH REQUESTED ===');
    logger.info('Timestamp:', new Date().toISOString());
    logger.info('Current OpenRouter storage state:');
    const apiKey = localStorage.getItem('ai_chat_openrouter_api_key');
    const authMethod = localStorage.getItem('openrouter_auth_method');
    logger.info('- API key exists:', !!apiKey);
    logger.info('- API key length:', apiKey?.length || 0);
    logger.info('- Auth method:', authMethod);
    logger.info('Calling #initializeAgentService()...');
    this.#initializeAgentService();
  }

  /**
   * Fetches LiteLLM models on initial load if needed
   */
  async #fetchLiteLLMModelsOnLoad(): Promise<void> {
    const selectedProvider = localStorage.getItem(PROVIDER_SELECTION_KEY) || 'openai';
    
    // Only fetch LiteLLM models if we're using LiteLLM provider
    if (selectedProvider === 'litellm') {
      await this.#refreshLiteLLMModels();
    } else {
      // Just update model options with empty LiteLLM models
      this.#updateModelOptions([], false);
    }
  }

  /**
   * Refreshes the list of LiteLLM models from the configured endpoint
   */
  async #refreshLiteLLMModels(): Promise<void> {
    const liteLLMApiKey = localStorage.getItem(LITELLM_API_KEY_STORAGE_KEY);
    const endpoint = localStorage.getItem(LITELLM_ENDPOINT_KEY);

    if (!endpoint) {
      logger.info('No LiteLLM endpoint configured, skipping refresh');
      // Update with empty LiteLLM models but keep any custom models
      AIChatPanel.updateModelOptions([], false);
      this.performUpdate();
      return;
    }
    
    try {
      const { models: litellmModels, hadWildcard } = await this.#fetchLiteLLMModels(liteLLMApiKey, endpoint);
      // Use the static method
      AIChatPanel.updateModelOptions(litellmModels, hadWildcard);
      this.performUpdate();
    } catch (error) {
      logger.error('Failed to refresh LiteLLM models:', error);
      // Clear LiteLLM models on error
      AIChatPanel.updateModelOptions([], false);
      this.performUpdate();
    }
  }

  /**
   * Fetches LiteLLM models from the specified endpoint
   * @param apiKey API key to use for the request (optional)
   * @param endpoint The LiteLLM endpoint URL
   * @returns Object containing models and wildcard flag
   */
  async #fetchLiteLLMModels(apiKey: string | null, endpoint?: string): Promise<{models: ModelOption[], hadWildcard: boolean}> {
    try {
      // Only attempt to fetch if an endpoint is provided
      if (!endpoint) {
        logger.info('No LiteLLM endpoint provided, skipping model fetch');
        return { models: [], hadWildcard: false };
      }

      // Always fetch fresh models from LiteLLM
      const models = await LLMClient.fetchLiteLLMModels(apiKey, endpoint);

      // Check if wildcard model exists
      const hadWildcard = models.some(model => model.id === '*');

      // Filter out the wildcard "*" model as it's not a real model
      const filteredModels = models.filter(model => model.id !== '*');

      // Transform the models to the format we need
      const litellmModels = filteredModels.map(model => ({
        value: model.id,  // Store actual model name
        label: `LiteLLM: ${model.id}`,
        type: 'litellm' as const
      }));

      logger.info(`Fetched ${litellmModels.length} LiteLLM models, hadWildcard: ${hadWildcard}`);
      return { models: litellmModels, hadWildcard };
    } catch (error) {
      logger.error('Failed to fetch LiteLLM models:', error);
      // Return empty array on error - no default models
      return { models: [], hadWildcard: false };
    }
  }

  /**
   * Instance method that delegates to the static method to update model options
   * @param litellmModels LiteLLM models to add to options
   * @param hadWildcard Whether LiteLLM returned a wildcard model
   */
  #updateModelOptions(litellmModels: ModelOption[], hadWildcard = false): void {
    // Call the static method
    AIChatPanel.updateModelOptions(litellmModels, hadWildcard);
  }

  /**
   * Refreshes Groq models from the API
   */
  async #refreshGroqModels(): Promise<void> {
    try {
      const groqApiKey = localStorage.getItem('ai_chat_groq_api_key');
      
      if (!groqApiKey) {
        logger.info('No Groq API key configured, skipping model refresh');
        return;
      }
      
      const { models: groqModels } = await this.#fetchGroqModels(groqApiKey);
      this.#updateModelOptions(groqModels, false);
      
      // Update MODEL_OPTIONS to reflect the fetched models
      this.performUpdate();
    } catch (error) {
      logger.error('Failed to refresh Groq models:', error);
      // Clear Groq models on error
      AIChatPanel.updateModelOptions([], false);
      this.performUpdate();
    }
  }

  /**
   * Fetches Groq models from the API
   * @param apiKey API key to use for the request
   * @returns Object containing models
   */
  async #fetchGroqModels(apiKey: string): Promise<{models: ModelOption[]}> {
    try {
      // Fetch models from Groq
      const models = await LLMClient.fetchGroqModels(apiKey);

      // Transform the models to the format we need
      const groqModels = models.map(model => ({
        value: model.id,
        label: `Groq: ${model.id}`,
        type: 'groq' as const
      }));

      logger.info(`Fetched ${groqModels.length} Groq models`);
      return { models: groqModels };
    } catch (error) {
      logger.error('Failed to fetch Groq models:', error);
      // Return empty array on error
      return { models: [] };
    }
  }

  /**
   * Determines the status of the selected model
   * @param modelValue The model value to check
   * @returns Object with isLiteLLM and isPlaceholder flags
   */
  #getModelStatus(modelValue: string): { isLiteLLM: boolean, isPlaceholder: boolean } {
    if (!modelValue) {
      logger.warn('getModelStatus called with empty model value');
      return {
        isLiteLLM: false,
        isPlaceholder: false
      };
    }
    
    const modelOption = MODEL_OPTIONS.find(opt => opt.value === modelValue);
    
    if (!modelOption) {
      logger.warn(`Model ${modelValue} not found in MODEL_OPTIONS`);
    }
    
    return {
      isLiteLLM: Boolean(modelOption?.type === 'litellm'),
      isPlaceholder: Boolean(
        modelOption?.value === '_placeholder_add_custom' || 
        modelOption?.value === '_placeholder_no_models'
      ),
    };
  }

  /**
   * Initialize the agent service based on the current provider and configuration
   */
  #initializeAgentService(): void {
    logger.info("=== INITIALIZING AGENT SERVICE ===");
    logger.info('Timestamp:', new Date().toISOString());
    
    // Get the selected provider and check model status
    const selectedProvider = localStorage.getItem(PROVIDER_SELECTION_KEY) || 'openai';
    logger.info('Selected provider:', selectedProvider);
    logger.info('Selected model:', this.#selectedModel);
    
    const { isPlaceholder } = this.#getModelStatus(this.#selectedModel);
    logger.info('Model is placeholder:', isPlaceholder);
    
    // Don't initialize if the selected model is a placeholder
    if (isPlaceholder) {
      logger.warn('❌ Model is placeholder, cannot initialize agent service');
      this.#setCanSendMessagesState(false, "Selected model is a placeholder");
      return;
    }
    
    // Check credentials based on provider
    logger.info('=== CHECKING CREDENTIALS ===');
    const {canProceed, apiKey} = this.#checkCredentials(selectedProvider);
    logger.info('Credential check result:');
    logger.info('- Can proceed:', canProceed);
    logger.info('- API key exists:', !!apiKey);
    logger.info('- API key length:', apiKey?.length || 0);
    
    // Update state if we can't proceed
    if (!canProceed) {
      logger.error('❌ Cannot proceed - missing required credentials');
      this.#setCanSendMessagesState(false, "Missing required credentials");
      return;
    }
    
    logger.info('✅ Credentials valid, proceeding with agent service initialization');
    
    // Remove any existing listeners to prevent duplicates
    this.#agentService.removeEventListener(AgentEvents.MESSAGES_CHANGED, this.#handleMessagesChanged.bind(this));
    
    // Register for messages changed events
    this.#agentService.addEventListener(AgentEvents.MESSAGES_CHANGED, this.#handleMessagesChanged.bind(this));
    
    // Initialize the agent service
    logger.info('Calling agentService.initialize()...');
    this.#agentService.initialize(apiKey, this.#selectedModel)
      .then(() => {
        logger.info('✅ Agent service initialized successfully');
        this.#setCanSendMessagesState(true, "Agent service initialized successfully");
      })
      .catch(error => {
        logger.error('❌ Failed to initialize AgentService:', error);
        this.#setCanSendMessagesState(false, `Failed to initialize agent service: ${error instanceof Error ? error.message : String(error)}`);
      });
  }
  
  /**
   * Helper to set the canSendMessages state and update UI accordingly
   */
  #setCanSendMessagesState(canSend: boolean, reason: string): void {
    logger.info(`=== SETTING CAN SEND MESSAGES STATE ===`);
    logger.info(`Previous state: ${this.#canSendMessages}`);
    logger.info(`New state: ${canSend}`);
    logger.info(`Reason: ${reason}`);
    logger.info('Timestamp:', new Date().toISOString());
    
    this.#canSendMessages = canSend;
    this.#updateChatViewInputState();
    this.performUpdate();
    
    logger.info(`✅ State updated - canSendMessages is now: ${this.#canSendMessages}`);
  }
  
  /**
   * Check if any provider has valid credentials
   * @returns true if at least one provider has valid credentials
   */
  #hasAnyProviderCredentials(): boolean {
    logger.info('=== CHECKING ALL PROVIDER CREDENTIALS ===');
    const selectedProvider = localStorage.getItem(PROVIDER_SELECTION_KEY) || 'openai';
    logger.info('Currently selected provider:', selectedProvider);
    
    // Check all providers except LiteLLM (unless LiteLLM is selected)
    const providers = ['openai', 'groq', 'openrouter'];
    
    // Only include LiteLLM if it's the selected provider
    if (selectedProvider === 'litellm') {
      providers.push('litellm');
    }
    
    logger.info('Providers to check:', providers);
    
    for (const provider of providers) {
      logger.info(`Checking provider: ${provider}`);
      const validation = LLMClient.validateProviderCredentials(provider);
      logger.info(`Provider ${provider} validation result:`, validation);
      if (validation.isValid) {
        logger.info(`✅ Found valid credentials for provider: ${provider}`);
        return true;
      }
    }
    
    logger.info('❌ No valid credentials found for any provider');
    return false;
  }

  /**
   * Checks if required credentials are available based on provider using provider-specific validation
   * @param provider The selected provider ('openai', 'litellm', 'groq', 'openrouter')
   * @returns Object with canProceed flag and apiKey
   */
  #checkCredentials(provider: string): {canProceed: boolean, apiKey: string | null} {
    logger.info('=== CHECKING CREDENTIALS FOR PROVIDER ===');
    logger.info('Provider:', provider);
    logger.info('Timestamp:', new Date().toISOString());
    
    // Use provider-specific validation
    logger.info('Calling LLMClient.validateProviderCredentials()...');
    const validation = LLMClient.validateProviderCredentials(provider);
    logger.info('Validation result:');
    logger.info('- Is valid:', validation.isValid);
    logger.info('- Message:', validation.message);
    logger.info('- Missing items:', validation.missingItems);
    
    let apiKey: string | null = null;
    
    if (validation.isValid) {
      logger.info('Validation passed, retrieving API key...');
      
      // Get the API key from the provider-specific storage
      try {
        // Create a temporary provider instance to get storage keys
        let tempProvider;
        switch (provider) {
          case 'openai':
            tempProvider = new OpenAIProvider('');
            break;
          case 'litellm':
            tempProvider = new LiteLLMProvider('', '');
            break;
          case 'groq':
            tempProvider = new GroqProvider('');
            break;
          case 'openrouter':
            tempProvider = new OpenRouterProvider('');
            break;
          default:
            logger.warn(`Unknown provider: ${provider}`);
            return {canProceed: false, apiKey: null};
        }
        
        const storageKeys = tempProvider.getCredentialStorageKeys();
        logger.info('Storage keys for provider:');
        logger.info('- API key storage key:', storageKeys.apiKey);
        
        apiKey = localStorage.getItem(storageKeys.apiKey || '') || null;
        logger.info('Retrieved API key:');
        logger.info('- Exists:', !!apiKey);
        logger.info('- Length:', apiKey?.length || 0);
        logger.info('- Prefix:', apiKey?.substring(0, 8) + '...' || 'none');
        
      } catch (error) {
        logger.error(`❌ Failed to get API key for ${provider}:`, error);
        return {canProceed: false, apiKey: null};
      }
    } else {
      logger.warn('❌ Validation failed for provider:', provider);
    }
    
    const result = {canProceed: validation.isValid, apiKey};
    logger.info('=== CREDENTIAL CHECK COMPLETE ===');
    logger.info('Final result:', result);
    
    return result;
  }

  /**
   * Update the ChatView's input state directly without doing a full performUpdate
   * This updates the placeholder text and input state
   */
  #updateChatViewInputState(): void {
    if (!this.#chatView) {
      return;
    }
    
    // Update ChatView data with current input state
    this.#chatView.data = {
      ...this.#chatView.data,
      isInputDisabled: false, // Keep the input field enabled for better UX
      inputPlaceholder: this.#getInputPlaceholderText()
    };
  }

  /**
   * Get the appropriate placeholder text based on configuration status
   */
  #getInputPlaceholderText(): string {
    const selectedProvider = localStorage.getItem(PROVIDER_SELECTION_KEY) || 'openai';
    
    if (this.#canSendMessages) {
      return i18nString(UIStrings.inputPlaceholder);
    } else if (selectedProvider === 'litellm') {
      return i18nString(UIStrings.missingLiteLLMEndpoint);
    } else {
      return i18nString(UIStrings.missingProviderCredentials);
    }
  }

  /**
   * Handle OAuth login request from ChatView
   */
  #handleOAuthLogin(): void {
    logger.info('OAuth login requested from ChatView');
    
    // Import OpenRouterOAuth dynamically if needed and start the OAuth flow
    import('../auth/OpenRouterOAuth.js').then(module => {
      const OpenRouterOAuth = module.OpenRouterOAuth;
      OpenRouterOAuth.startAuthFlow().catch(error => {
        logger.error('OAuth flow failed:', error);
        // Could show user notification here
      });
    }).catch(error => {
      logger.error('Failed to import OpenRouterOAuth:', error);
    });
  }

  /**
   * Handle manual setup request from ChatView
   */
  #handleManualSetupRequest(): void {
    logger.info('Manual setup requested from ChatView');
    this.#onSettingsClick();
  }

  /**
   * Update the settings button highlight based on credentials state
   */
  #updateSettingsButtonHighlight(): void {
    if (!this.#canSendMessages && !this.#settingsButton) {
      // Try to find the settings button after rendering
      this.#settingsButton = this.#toolbarContainer.querySelector('.ai-chat-right-toolbar devtools-button[title="Settings"]');

      // Add pulsating animation to draw attention to settings
      if (this.#settingsButton) {
        // Add CSS animation to make it glow/pulse
        this.#settingsButton.classList.add('settings-highlight');

        // Add the style to the document head if it doesn't exist yet
        const styleId = 'settings-highlight-style';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
            .settings-highlight {
              animation: pulse 2s infinite;
              position: relative;
            }
            
            @keyframes pulse {
              0% {
                box-shadow: 0 0 0 0 rgba(var(--color-primary-rgb), 0.7);
              }
              70% {
                box-shadow: 0 0 0 6px rgba(var(--color-primary-rgb), 0);
              }
              100% {
                box-shadow: 0 0 0 0 rgba(var(--color-primary-rgb), 0);
              }
            }
          `;
          document.head.appendChild(style);
        }
      }
    } else if (this.#canSendMessages && this.#settingsButton) {
      // Remove the highlight if we now have an API key
      this.#settingsButton.classList.remove('settings-highlight');
      this.#settingsButton = null;
    }
  }

  /**
   * Handle messages changed event from the agent service
   */
  #handleMessagesChanged(event: Common.EventTarget.EventTargetEvent<ChatMessage[]>): void {
    const messages = event.data;
    this.#messages = [...messages];

    // Check if we should exit processing state
    this.#updateProcessingState(messages);
    this.performUpdate();
  }
  
  /**
   * Updates processing state based on the latest messages
   */
  #updateProcessingState(messages: ChatMessage[]): void {
    // Only set isProcessing to false if the last message is a final answer from the model
    const lastMessage = messages[messages.length - 1];
    if (lastMessage &&
        lastMessage.entity === ChatMessageEntity.MODEL &&
        lastMessage.action === 'final' &&
        lastMessage.isFinalAnswer) {
      this.#isProcessing = false;
    }
  }

  /**
   * Handles model change from UI and reinitializes the agent service
   * @param model The newly selected model
   */
  async #handleModelChanged(model: string): Promise<void> {
    // Update local state and save to localStorage
    this.#selectedModel = model;
    localStorage.setItem(MODEL_SELECTION_KEY, model);

    // Refresh available models list when using LiteLLM
    const selectedProvider = localStorage.getItem(PROVIDER_SELECTION_KEY) || 'openai';
    if (selectedProvider === 'litellm') {
      await this.#refreshLiteLLMModels();
    }

    // Reinitialize the agent service with the new model
    this.#initializeAgentService();
  }

  /**
   * Public method to send a message (passed to ChatView)
   */
  async sendMessage(text: string, imageInput?: ImageInputData): Promise<void> {
    if (!text.trim() || this.#isProcessing) {
      return;
    }
    
    // If we can't send messages due to missing credentials, add error message and return
    if (!this.#canSendMessages) {
      this.#addUserMessage(text, imageInput);
      this.#addCredentialErrorMessage();
      return;
    }

    // Set processing state
    this.#setProcessingState(true);

    try {  
      // Pass the selected agent type to the agent service
      await this.#agentService.sendMessage(text, imageInput, this.#selectedAgentType);
      // MESSAGES_CHANGED event from the agent service will update with AI response
    } catch (error) {
      this.#handleSendMessageError(error);
    }
  }
  
  /**
   * Adds a user message to the conversation
   */
  #addUserMessage(text: string, imageInput?: ImageInputData): void {
    this.#messages.push({
      entity: ChatMessageEntity.USER,
      text,
      imageInput,
    });
    this.performUpdate();
  }
  
  /**
   * Adds an error message about missing credentials
   */
  #addCredentialErrorMessage(): void {
    const selectedProvider = localStorage.getItem(PROVIDER_SELECTION_KEY) || 'openai';
    
    // Generate provider name safely, with fallback
    const providerName = selectedProvider ? 
      selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1) : 
      'Provider';
    
    // Generic error message that works for any provider
    let errorText = `${providerName} credentials are missing or invalid. Please configure them in Settings.`;
    
    // Special case for LiteLLM which needs endpoint configuration
    if (selectedProvider === 'litellm') {
      errorText = 'LiteLLM endpoint is not configured. Please add endpoint in Settings.';
    }
    
    const errorMessage: ModelChatMessage = {
      entity: ChatMessageEntity.MODEL,
      action: 'final',
      error: errorText,
      isFinalAnswer: true,
    };
    this.#messages.push(errorMessage as ChatMessage);
    this.performUpdate();
  }
  
  /**
   * Sets the processing state for the UI
   */
  #setProcessingState(isProcessing: boolean): void {
    this.#isProcessing = isProcessing;
    this.#isTextInputEmpty = isProcessing ? true : this.#isTextInputEmpty;
    this.#imageInput = isProcessing ? undefined : this.#imageInput;
    this.performUpdate();
  }
  
  /**
   * Handles errors from sending messages
   */
  #handleSendMessageError(error: unknown): void {
    logger.error('Failed to send message:', error);
    this.#setProcessingState(false);
    
    const errorMessage: ModelChatMessage = {
      entity: ChatMessageEntity.MODEL,
      action: 'final',
      error: error instanceof Error ? error.message : String(error),
      isFinalAnswer: true,
    };
    
    this.#messages.push(errorMessage as ChatMessage);
    this.performUpdate();
  }

  override wasShown(): void {
    this.performUpdate();
    this.#chatView?.focus();
  }

  /**
   * Cleanup when panel is hidden
   */
  override willHide(): void {
    // Explicitly remove any event listeners to prevent memory leaks
    this.#agentService.removeEventListener(AgentEvents.MESSAGES_CHANGED, this.#handleMessagesChanged.bind(this));
  }

  /**
   * Updates the UI components with the current state
   */
  override performUpdate(): void {
    this.#updateToolbar();
    this.#updateSettingsButtonHighlight();
    this.#updateChatViewState();
  }
  
  /**
   * Updates the toolbar UI
   */
  #updateToolbar(): void {
    const isCenteredView = this.#chatView?.isCenteredView ?? false;
    
    Lit.render(toolbarView({
      onNewChatClick: this.#onNewChatClick.bind(this),
      onHistoryClick: this.#onHistoryClick.bind(this),
      onDeleteClick: this.#onDeleteClick.bind(this),
      onHelpClick: this.#onHelpClick.bind(this),
      onSettingsClick: this.#onSettingsClick.bind(this),
      onEvaluationTestClick: this.#onEvaluationTestClick.bind(this),
      onBookmarkClick: this.#onBookmarkClick.bind(this),
      isDeleteHistoryButtonVisible: this.#messages.length > 1,
      isCenteredView,
      isVectorDBEnabled: isVectorDBEnabled(),
    }), this.#toolbarContainer, { host: this });
  }
  
  /**
   * Updates the chat view with current state
   */
  #updateChatViewState(): void {
    if (!this.#chatView) {
      return;
    }
    
    try {
      this.#chatView.data = {
        onPromptSelected: this.#handlePromptSelected.bind(this),
        messages: this.#messages,
        onSendMessage: this.sendMessage.bind(this),
        state: this.#isProcessing ? ChatViewState.LOADING : ChatViewState.IDLE,
        isTextInputEmpty: this.#isTextInputEmpty,
        imageInput: this.#imageInput,
        modelOptions: MODEL_OPTIONS,
        selectedModel: this.#selectedModel,
        onModelChanged: this.#handleModelChanged.bind(this),
        onModelSelectorFocus: this.#refreshLiteLLMModels.bind(this),
        selectedAgentType: this.#selectedAgentType,
        isModelSelectorDisabled: this.#isProcessing,
        isInputDisabled: false,
        inputPlaceholder: this.#getInputPlaceholderText(),
        // Add OAuth login state
        showOAuthLogin: (() => {
          const hasCredentials = this.#hasAnyProviderCredentials();
          const showOAuth = !hasCredentials;
          logger.info('=== OAUTH LOGIN UI DECISION ===');
          logger.info('hasAnyProviderCredentials:', hasCredentials);
          logger.info('showOAuthLogin will be set to:', showOAuth);
          return showOAuth;
        })(),
        onOAuthLogin: this.#handleOAuthLogin.bind(this),
      };
    } catch (error) {
      logger.error('Error updating ChatView state:', error);
    }
  }

  /**
   * Handles prompt type selection from ChatView
   * @param promptType The selected prompt type (null means deselected)
   */
  #handlePromptSelected(promptType: string | null): void {
    logger.info('Prompt selected in AIChatPanel:', promptType);
    this.#selectedAgentType = promptType;
    // Save selection for future sessions
    if (promptType) {
      localStorage.setItem('ai_chat_agent_type', promptType);
    } else {
      localStorage.removeItem('ai_chat_agent_type');
    }
  }

  #onNewChatClick(): void {
    this.#agentService.clearConversation();
    this.#messages = this.#agentService.getMessages();
    this.#isProcessing = false;
    this.#selectedAgentType = null; // Reset selected agent type
    this.performUpdate();
    UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.newChatCreated));
  }

  /**
   * Handles history button click
   * @param event Mouse event
   */
  #onHistoryClick(_event: MouseEvent): void {
    // Not yet implemented
    logger.info('History feature not yet implemented');
  }

  #onDeleteClick(): void {
    this.#onNewChatClick();
    UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.chatDeleted));
  }

  #onHelpClick(): void {
    HelpDialog.show();
  }

  /**
   * Handles the settings button click event and shows the settings dialog
   */
  #onSettingsClick(): void {
    SettingsDialog.show(
      this.#selectedModel,
      this.#miniModel,
      this.#nanoModel,
      async () => {
        await this.#handleSettingsChanged();
      },
      this.#fetchLiteLLMModels.bind(this),
      AIChatPanel.updateModelOptions,
      AIChatPanel.getModelOptions,
      AIChatPanel.addCustomModelOption,
      AIChatPanel.removeCustomModelOption
    );
  }
  
  /**
   * Handles the evaluation test button click event and shows the evaluation dialog
   */
  #onEvaluationTestClick(): void {
    EvaluationDialog.show();
  }

  /**
   * Handles the bookmark button click event and bookmarks the current page
   */
  async #onBookmarkClick(): Promise<void> {
    // Show immediate "working" notification that doesn't auto-dismiss
    const workingSnackbar = Snackbars.Snackbar.Snackbar.show({
      message: 'Bookmarking page...',
      closable: true, // Make it closable to prevent auto-dismiss
    });
    workingSnackbar.classList.add('bookmark-notification');
    this.#applyFullWidthSnackbarStyles(workingSnackbar);

    try {
      // Import the BookmarkStoreTool dynamically
      const { BookmarkStoreTool } = await import('../tools/BookmarkStoreTool.js');
      const bookmarkTool = new BookmarkStoreTool();

      // Get current page title for better user feedback
      const currentPageTitle = await this.#getCurrentPageTitle();
      
      // Execute the bookmark tool
      const result = await bookmarkTool.execute({
        reasoning: 'User clicked bookmark button to save current page',
        includeFullContent: true
      });

      // Close the working notification properly by clicking the close button
      const closeButton = workingSnackbar.shadowRoot?.querySelector('.dismiss') as HTMLElement;
      if (closeButton) {
        closeButton.click();
      }

      if (result.success) {
        // Show success snackbar with shorter duration
        const successMessage = result.message || `Successfully bookmarked "${result.title || currentPageTitle}"`;
        const snackbar = Snackbars.Snackbar.Snackbar.show({
          message: successMessage,
          closable: false,
        });
        snackbar.dismissTimeout = 3000; // 3 seconds instead of default 5
        snackbar.classList.add('bookmark-notification'); // Add custom CSS class
        this.#applyFullWidthSnackbarStyles(snackbar); // Apply full-width styles
        logger.info('Page bookmarked successfully', { url: result.url, title: result.title });
      } else {
        // Show error snackbar
        const errorSnackbar = Snackbars.Snackbar.Snackbar.show({
          message: `Failed to bookmark page: ${result.error}`,
          closable: true,
        });
        errorSnackbar.classList.add('bookmark-notification'); // Add custom CSS class
        this.#applyFullWidthSnackbarStyles(errorSnackbar); // Apply full-width styles
        logger.error('Failed to bookmark page', { error: result.error });
      }
    } catch (error: any) {
      // Close the working notification properly by clicking the close button
      const closeButton = workingSnackbar.shadowRoot?.querySelector('.dismiss') as HTMLElement;
      if (closeButton) {
        closeButton.click();
      }
      
      logger.error('Error in bookmark click handler', { error: error.message });
      // Show error snackbar
      const errorSnackbar = Snackbars.Snackbar.Snackbar.show({
        message: `Error bookmarking page: ${error.message}`,
        closable: true,
      });
      errorSnackbar.classList.add('bookmark-notification'); // Add custom CSS class
      this.#applyFullWidthSnackbarStyles(errorSnackbar); // Apply full-width styles
    }
  }

  /**
   * Apply full-width styles to snackbar for bookmark notifications
   */
  #applyFullWidthSnackbarStyles(snackbar: Snackbars.Snackbar.Snackbar): void {
    // Ensure the slideInFromTop animation is available globally
    this.#ensureGlobalSnackbarStyles();
    
    // Position below toolbar
    const toolbarOffset = 25; // Reduced height
    
    // Apply inline styles with !important to force override
    snackbar.style.setProperty('position', 'fixed', 'important');
    snackbar.style.setProperty('top', `${toolbarOffset}px`, 'important');
    snackbar.style.setProperty('left', '0', 'important');
    snackbar.style.setProperty('right', '0', 'important');
    snackbar.style.setProperty('bottom', 'unset', 'important');
    snackbar.style.setProperty('width', '100vw', 'important');
    snackbar.style.setProperty('max-width', 'none', 'important');
    snackbar.style.setProperty('margin', '0', 'important');
    snackbar.style.setProperty('z-index', '10000', 'important');
    
    // Apply styles to the container inside the snackbar
    setTimeout(() => {
      const container = snackbar.shadowRoot?.querySelector('.container') as HTMLElement;
      if (container) {
        container.style.width = '100%';
        container.style.maxWidth = '100%';
        container.style.borderRadius = '0';
        container.style.borderBottom = '1px solid var(--sys-color-divider)';
        container.style.animation = 'slideInFromTop 200ms cubic-bezier(0, 0, 0.3, 1)';
      }
    }, 0);
  }

  /**
   * Ensure global styles for bookmark snackbars are available
   */
  #ensureGlobalSnackbarStyles(): void {
    const styleId = 'bookmark-snackbar-styles';
    if (document.getElementById(styleId)) {
      return; // Already added
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes slideInFromTop {
        from {
          transform: translateY(-100%);
          opacity: 0%;
        }
        to {
          transform: translateY(0);
          opacity: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Get current page title for user feedback
   */
  async #getCurrentPageTitle(): Promise<string> {
    try {
      const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      if (!target) return 'Current Page';

      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      if (!runtimeModel) return 'Current Page';

      const executionContext = runtimeModel.defaultExecutionContext();
      if (!executionContext) return 'Current Page';

      const result = await executionContext.evaluate(
        {
          expression: 'document.title',
          objectGroup: 'temp',
          includeCommandLineAPI: false,
          silent: true,
          returnByValue: true,
          generatePreview: false
        },
        /* userGesture */ false,
        /* awaitPromise */ false
      );

      if ('error' in result) {
        return 'Current Page';
      }

      if (result.object && result.object.value) {
        return result.object.value;
      }
    } catch (error) {
      logger.warn('Failed to get current page title', { error });
    }
    return 'Current Page';
  }
  
  /**
   * Handles changes made in the settings dialog
   */
  async #handleSettingsChanged(): Promise<void> {
    // Get the selected provider
    const prevProvider = localStorage.getItem(PROVIDER_SELECTION_KEY) || 'openai';
    const newProvider = localStorage.getItem(PROVIDER_SELECTION_KEY) || 'openai';
    
    logger.info(`Provider changing from ${prevProvider} to ${newProvider}`);
    
    // Load saved settings
    this.#apiKey = localStorage.getItem('ai_chat_api_key');
    this.#liteLLMApiKey = localStorage.getItem(LITELLM_API_KEY_STORAGE_KEY);
    this.#liteLLMEndpoint = localStorage.getItem(LITELLM_ENDPOINT_KEY);
    
    // Reset model options based on the new provider
    if (newProvider === 'litellm') {
      // First update model options with empty models
      this.#updateModelOptions([], false);
      
      // Then refresh LiteLLM models
      await this.#refreshLiteLLMModels();
    } else if (newProvider === 'groq') {
      // For Groq, update model options and refresh models if API key exists
      this.#updateModelOptions([], false);
      
      const groqApiKey = localStorage.getItem('ai_chat_groq_api_key');
      if (groqApiKey) {
        await this.#refreshGroqModels();
      }
    } else {
      // For OpenAI, just update model options with empty LiteLLM models
      this.#updateModelOptions([], false);
    }
    
    this.#updateModelSelections();
    this.#initializeAgentService();
    // Update toolbar to reflect vector DB enabled state
    this.#updateToolbar();
  }
  
  /**
   * Updates model selections based on updated options
   */
  #updateModelSelections(): void {
    // Get the current provider and its defaults
    const currentProvider = localStorage.getItem(PROVIDER_SELECTION_KEY) || 'openai';
    const providerDefaults = DEFAULT_PROVIDER_MODELS[currentProvider] || DEFAULT_PROVIDER_MODELS.openai;
    
    // Load saved mini/nano models if valid
    const storedMiniModel = localStorage.getItem(MINI_MODEL_STORAGE_KEY);
    const storedNanoModel = localStorage.getItem(NANO_MODEL_STORAGE_KEY);
    
    // Check if mini/nano models are still valid with the new MODEL_OPTIONS AND belong to current provider
    const storedMiniModelOption = storedMiniModel ? MODEL_OPTIONS.find(option => option.value === storedMiniModel) : null;
    if (storedMiniModelOption && storedMiniModelOption.type === currentProvider && storedMiniModel) {
      this.#miniModel = storedMiniModel;
    } else if (providerDefaults.mini && MODEL_OPTIONS.some(option => option.value === providerDefaults.mini)) {
      // Use provider default mini model if available
      this.#miniModel = providerDefaults.mini;
      localStorage.setItem(MINI_MODEL_STORAGE_KEY, this.#miniModel);
    } else {
      this.#miniModel = '';
      localStorage.removeItem(MINI_MODEL_STORAGE_KEY);
    }
    
    const storedNanoModelOption = storedNanoModel ? MODEL_OPTIONS.find(option => option.value === storedNanoModel) : null;
    if (storedNanoModelOption && storedNanoModelOption.type === currentProvider && storedNanoModel) {
      this.#nanoModel = storedNanoModel;
    } else if (providerDefaults.nano && MODEL_OPTIONS.some(option => option.value === providerDefaults.nano)) {
      // Use provider default nano model if available
      this.#nanoModel = providerDefaults.nano;
      localStorage.setItem(NANO_MODEL_STORAGE_KEY, this.#nanoModel);
    } else {
      this.#nanoModel = '';
      localStorage.removeItem(NANO_MODEL_STORAGE_KEY);
    }
    
    // Check if the current selected model is valid for the new provider
    const selectedModelOption = MODEL_OPTIONS.find(opt => opt.value === this.#selectedModel);
    if (!selectedModelOption || selectedModelOption.type !== currentProvider) {
      logger.info(`Selected model ${this.#selectedModel} is not valid for provider ${currentProvider}`);
      
      // Try to use provider default main model first
      if (providerDefaults.main && MODEL_OPTIONS.some(option => option.value === providerDefaults.main)) {
        this.#selectedModel = providerDefaults.main;
      } else if (MODEL_OPTIONS.length > 0) {
        // Otherwise, use the first available model
        this.#selectedModel = MODEL_OPTIONS[0].value;
      }
      localStorage.setItem(MODEL_SELECTION_KEY, this.#selectedModel);
    }
    
    // Log the updated selections
    logger.info('Updated model selections for provider change:', {
      provider: currentProvider,
      selectedModel: this.#selectedModel,
      miniModel: this.#miniModel,
      nanoModel: this.#nanoModel
    });
    
    // Trigger UI update to reflect the new model selections
    this.performUpdate();
  }

  /**
   * Sets up the panel as a root panel
   */
  override markAsRoot(): void {
    super.markAsRoot();
    // Ensure the content element has appropriate accessibility attributes
    if (this.contentElement) {
      this.contentElement.setAttribute('aria-label', 'AI Chat Panel');
      this.contentElement.setAttribute('role', 'region');
    }
  }
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, actionId: string): boolean {
    switch (actionId) {
      case 'ai-chat.toggle':
        void UI.ViewManager.ViewManager.instance().showView('ai-chat');
        return true;
    }
    return false;
  }
}