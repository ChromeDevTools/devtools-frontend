// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as Host from '../../../core/host/host.js';

import {AgentService, Events as AgentEvents} from '../core/AgentService.js';
import { LiteLLMClient } from '../core/LiteLLMClient.js';
import {
  type ChatMessage,
  ChatMessageEntity,
  ChatView,
  type ImageInputData,
  type ModelChatMessage,
  State as ChatViewState,
} from './ChatView.js';
import chatViewStyles from './chatView.css.js';

const {html} = Lit;

// Model type definition
interface ModelOption {
  value: string;
  label: string;
  type: 'openai' | 'litellm';
}

// Add model options constant - these are the default OpenAI models
const DEFAULT_OPENAI_MODELS: ModelOption[] = [
  {value: 'o4-mini-2025-04-16', label: 'O4 Mini', type: 'openai'},
  {value: 'gpt-4.1-mini-2025-04-14', label: 'GPT-4.1 Mini', type: 'openai'},
  {value: 'gpt-4.1-nano-2025-04-14', label: 'GPT-4.1 Nano', type: 'openai'},
  {value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1', type: 'openai'},
];

// This will hold the current active model options
let MODEL_OPTIONS: ModelOption[] = [...DEFAULT_OPENAI_MODELS];

// Model selector localStorage keys
const MODEL_SELECTION_KEY = 'ai_chat_model_selection';
const MINI_MODEL_STORAGE_KEY = 'ai_chat_mini_model';
const NANO_MODEL_STORAGE_KEY = 'ai_chat_nano_model';
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
   *@description The title of the AI Chat panel
   */
  aiChatPanel: 'AI Assistant',
  /**
   * @description Default text shown in the chat input
   */
  inputPlaceholder: 'Ask AI Assistant...',
  /**
   * @description Default text shown in the chat input if the current target doesn't support AI
   */
  inputPlaceholderUnsupported: 'This target does not support AI Assistant',
  /**
   * @description Label for the text input for the chat UI
   */
  chatInputLabel: 'Chat input',
  /**
   *@description Disclaimer for the AI Chat panel
   */
  disclaimer: 'Experimental AI capabilities in DevTools may display inaccurate information.',
  /**
   * @description Error message shown when the agent failed to initialize
   */
  initializationError: 'Could not initialize the AI Assistant',
  /**
   * @description Error message shown when the message sending failed
   */
  messageSendingError: 'Could not send the message',
  /**
   * @description Label for model selector dropdown
   */
  modelSelector: 'Select model',
  /**
   * @description Label for API key input
   */
  apiKeyLabel: 'OpenAI API Key',
  /**
   * @description Save button text
   */
  saveButton: 'Save',
  /**
   * @description Title for the browsing history section
   */
  browsingHistory: 'Browsing History',
  /**
   * @description Button text for clearing browsing history
   */
  clearHistory: 'Clear Browsing History',
  /**
   * @description Success message when history is cleared
   */
  historyCleared: 'Browsing history cleared successfully',
  /**
   * @description Label for LiteLLM endpoint
   */
  litellmEndpointLabel: 'LiteLLM Endpoint',
  /**
   * @description Hint for LiteLLM endpoint
   */
  litellmEndpointHint: 'Enter the URL for your LiteLLM server (e.g., http://localhost:4000 or https://your-litellm-server.com)',
  /**
   * @description Title for model size selection section
   */
  modelSizeSelectionTitle: 'Model Size Selection',
  /**
   * @description Hint text for model size selection
   */
  modelSizeSelectionHint: 'Select different model sizes for different agent types and tools',
  /**
   * @description Label for mini model selection
   */
  miniModelLabel: 'Mini Model',
  /**
   * @description Description for mini model usage
   */
  miniModelDescription: 'Used for fast operations, tools, and sub-tasks',
  /**
   * @description Default option text for mini model
   */
  miniModelDefault: 'Use default (main model)',
  /**
   * @description Label for nano model selection
   */
  nanoModelLabel: 'Nano Model',
  /**
   * @description Description for nano model usage
   */
  nanoModelDescription: 'Used for very fast operations and simple tasks',
  /**
   * @description Default option text for nano model
   */
  nanoModelDefault: 'Use default (mini model or main model)',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/ai_chat/AIChatPanel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface ToolbarViewInput {
  onNewChatClick: () => void;
  onHistoryClick: (event: MouseEvent) => void;
  onDeleteClick: () => void;
  onHelpClick: () => void;
  onSettingsClick: () => void;
  isDeleteHistoryButtonVisible: boolean;
  isCenteredView: boolean;
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
  
  static readonly panelName = 'ai-chat';

  // TODO: Move messages to a separate state object
  #messages: ChatMessage[] = [];
  #chatView: ChatView;
  #toolbarContainer: HTMLDivElement;
  #chatViewContainer: HTMLDivElement;
  #isTextInputEmpty = true;
  #agentService = AgentService.getInstance();
  #isProcessing = false;
  #imageInput?: ImageInputData;
  #selectedAgentType: string | null = null;
  #selectedModel: string = MODEL_OPTIONS[0].value; // Default to first model
  #miniModel = ''; // Mini model selection
  #nanoModel = ''; // Nano model selection
  #canSendMessages = false; // Add flag to track if we can send messages (has required credentials)
  #settingsButton: HTMLElement | null = null; // Reference to the settings button
  #liteLLMApiKey: string | null = null; // LiteLLM API key
  #liteLLMEndpoint: string | null = null; // LiteLLM endpoint
  #apiKey: string | null = null; // Regular API key

  async #fetchLiteLLMModels(apiKey: string | null, endpoint?: string): Promise<{models: ModelOption[], hadWildcard: boolean}> {
    try {
      // Always fetch fresh models from LiteLLM
      const models = await LiteLLMClient.fetchModels(apiKey, endpoint);
      
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
      
      // Don't add placeholder if we have any real models
      return { models: litellmModels, hadWildcard };
    } catch (error) {
      console.error('Failed to fetch LiteLLM models:', error);
      // Return empty array on error - no default models
      return { models: [], hadWildcard: false };
    }
  }

  // Centralized method to update MODEL_OPTIONS with all models
  #updateModelOptions(litellmModels: ModelOption[], hadWildcard: boolean = false): void {
    const savedCustomModels = JSON.parse(localStorage.getItem('ai_chat_custom_models') || '[]');
    
    // Check if we have an OpenAI API key
    const hasOpenAIKey = Boolean(localStorage.getItem('ai_chat_api_key'));
    
    // Only include OpenAI models if we have an API key
    const openaiModels = hasOpenAIKey ? 
      DEFAULT_OPENAI_MODELS : 
      [];
    
    // Keep custom models
    const customModels = savedCustomModels.map((model: string) => ({
      value: model,
      label: `LiteLLM: ${model}`,
      type: 'litellm' as const
    }));
    
    // Combine all models
    MODEL_OPTIONS = [...openaiModels, ...customModels, ...litellmModels];
    
    // Only add placeholder if no custom models and only wildcard returned
    if (hadWildcard && litellmModels.length === 0 && customModels.length === 0) {
      MODEL_OPTIONS.push({
        value: '_placeholder_add_custom',
        label: 'LiteLLM: Please add custom models in settings',
        type: 'litellm' as const
      });
    }
    
    // Save MODEL_OPTIONS to localStorage for Graph to access
    localStorage.setItem('ai_chat_model_options', JSON.stringify(MODEL_OPTIONS));
  }

  // Helper to refresh LiteLLM models if endpoint is configured
  async #refreshLiteLLMModels(): Promise<void> {
    const liteLLMApiKey = localStorage.getItem(LITELLM_API_KEY_STORAGE_KEY);
    const endpoint = localStorage.getItem(LITELLM_ENDPOINT_KEY);
    
    if (endpoint) {
      try {
        const { models: litellmModels, hadWildcard } = await this.#fetchLiteLLMModels(liteLLMApiKey, endpoint);
        this.#updateModelOptions(litellmModels, hadWildcard);
        this.performUpdate();
      } catch (error) {
        console.error('Failed to refresh LiteLLM models:', error);
        // Clear LiteLLM models on error
        this.#updateModelOptions([], false);
        this.performUpdate();
      }
    } else {
      // Clear LiteLLM models if no endpoint
      this.#updateModelOptions([], false);
      this.performUpdate();
    }
  }

  // Helper to determine model type and status
  #getModelStatus(modelValue: string): { isLiteLLM: boolean; isPlaceholder: boolean } {
    const modelOption = MODEL_OPTIONS.find(opt => opt.value === modelValue);
    return {
      isLiteLLM: Boolean(modelOption?.type === 'litellm'),
      isPlaceholder: Boolean(modelOption?.value === '_placeholder_add_custom'),
    };
  }

  async #fetchLiteLLMModelsOnLoad(): Promise<void> {
    // Initial model options update in case there's no OpenAI key
    this.#updateModelOptions([], false);
    
    // Then fetch LiteLLM models
    await this.#refreshLiteLLMModels();
  }

  constructor() {
    super(AIChatPanel.panelName);
    // Use the panel's element directly for styling/logging context
    this.element.classList.add('ai-chat-panel'); 
    this.element.setAttribute('jslog', `${VisualLogging.pane('ai-chat')}`);
    
    // Register CSS styles
    this.registerRequiredCSS(chatViewStyles);
    
    // Set flex layout for the content element
    this.contentElement.style.display = 'flex';
    this.contentElement.style.flexDirection = 'column';
    this.contentElement.style.height = '100%'; // Ensure it takes full height

    // Create container for the toolbar
    this.#toolbarContainer = document.createElement('div');
    this.#toolbarContainer.style.position = 'sticky';
    this.#toolbarContainer.style.top = '0';
    this.#toolbarContainer.style.zIndex = '1';
    this.#toolbarContainer.style.backgroundColor = 'var(--color-background)';
    this.#toolbarContainer.style.borderBottom = '1px solid var(--color-details-hairline)';
    this.contentElement.appendChild(this.#toolbarContainer);

    // Create container for the chat view
    this.#chatViewContainer = document.createElement('div');
    this.#chatViewContainer.classList.add('chat-view-wrapper'); 
    this.#chatViewContainer.style.flexGrow = '1'; 
    this.#chatViewContainer.style.overflow = 'auto'; 
    this.#chatViewContainer.style.display = 'flex';
    this.#chatViewContainer.style.flexDirection = 'column';
    this.contentElement.appendChild(this.#chatViewContainer);

    // Create ChatView and append it to its container
    this.#chatView = new ChatView();
    this.#chatView.style.flexGrow = '1';
    this.#chatView.style.overflow = 'auto';
    this.#chatViewContainer.appendChild(this.#chatView);
    
    // Add welcome message
    this.#messages.push({
      entity: ChatMessageEntity.MODEL,
      action: 'final',
      answer: i18nString(UIStrings.welcomeMessage),
      isFinalAnswer: true,
    });
    
    // Load API keys from localStorage first
    this.#apiKey = localStorage.getItem('ai_chat_api_key');
    this.#liteLLMApiKey = localStorage.getItem(LITELLM_API_KEY_STORAGE_KEY);
    this.#liteLLMEndpoint = localStorage.getItem(LITELLM_ENDPOINT_KEY);
    
    // Check if model selection is stored in localStorage
    const storedModel = localStorage.getItem(MODEL_SELECTION_KEY);
    if (storedModel && MODEL_OPTIONS.some(option => option.value === storedModel)) {
      this.#selectedModel = storedModel;
    } else {
      // If stored model is now filtered out, select the first available model
      if (MODEL_OPTIONS.length > 0) {
        this.#selectedModel = MODEL_OPTIONS[0].value;
      }
    }
    
    // Check for saved mini model
    const storedMiniModel = localStorage.getItem(MINI_MODEL_STORAGE_KEY);
    if (storedMiniModel && MODEL_OPTIONS.some(option => option.value === storedMiniModel)) {
      this.#miniModel = storedMiniModel;
    }

    // Check for saved nano model  
    const storedNanoModel = localStorage.getItem(NANO_MODEL_STORAGE_KEY);
    if (storedNanoModel && MODEL_OPTIONS.some(option => option.value === storedNanoModel)) {
      this.#nanoModel = storedNanoModel;
    }
    
    // Load custom models on startup
    const savedCustomModels = JSON.parse(localStorage.getItem('ai_chat_custom_models') || '[]');
    if (savedCustomModels.length > 0) {
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
    
    // Initialize the agent service
    this.#initializeAgentService();
    
    // Initial update to render toolbar and chat
    this.performUpdate(); 
    
    // Fetch LiteLLM models on first load
    this.#fetchLiteLLMModelsOnLoad();
  }
  
  getSelectedModel(): string {
    return this.#selectedModel;
  }

  /**
   * Initialize the agent service
   */
  #initializeAgentService(): void {
    // Determine which API key to use based on the selected model
    const { isLiteLLM, isPlaceholder } = this.#getModelStatus(this.#selectedModel);
    const apiKey = isLiteLLM ?
      (localStorage.getItem(LITELLM_API_KEY_STORAGE_KEY) || localStorage.getItem('ai_chat_api_key') || null) :
      localStorage.getItem('ai_chat_api_key');
    
    // Don't initialize if placeholder is selected
    if (isPlaceholder) {
      this.#canSendMessages = false;
    } else if (isLiteLLM) {
      // For LiteLLM models, always allow usage (API key is optional)
      // But we need an endpoint configured
      const hasLiteLLMEndpoint = Boolean(localStorage.getItem(LITELLM_ENDPOINT_KEY));
      this.#canSendMessages = hasLiteLLMEndpoint;
      
      if (hasLiteLLMEndpoint) {
        this.#agentService.initialize(apiKey, this.#selectedModel)
          .catch(error => {
             console.error('Failed to initialize AgentService on load:', error);
             this.#canSendMessages = false;
             this.performUpdate(); // Update UI to reflect failure
          });
      }
    } else {
      // For OpenAI models, API key is required
      this.#canSendMessages = Boolean(apiKey);
      if (apiKey) {
        this.#agentService.initialize(apiKey, this.#selectedModel)
          .catch(error => {
             console.error('Failed to initialize AgentService on load:', error);
             this.#canSendMessages = false;
             this.performUpdate(); // Update UI to reflect failure
          });
      }
    }
    // Listen for agent service events
    this.#agentService.addEventListener(AgentEvents.MESSAGES_CHANGED, this.#handleMessagesChanged.bind(this));
  }

  /**
   * Handle messages changed event from the agent service
   */
  #handleMessagesChanged(event: Common.EventTarget.EventTargetEvent<ChatMessage[]>): void {
    const messages = event.data;
    this.#messages = [...messages];
    
    // Only set isProcessing to false if the last message is a final answer from the model
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && 
        lastMessage.entity === ChatMessageEntity.MODEL && 
        lastMessage.action === 'final' && 
        lastMessage.isFinalAnswer) {
      this.#isProcessing = false;
    }
    
    this.performUpdate();
  }

  async #handleModelChanged(model: string): Promise<void> {
    this.#selectedModel = model;
    localStorage.setItem(MODEL_SELECTION_KEY, model);
    
    // Refresh models when model changes
    await this.#refreshLiteLLMModels();
    
    // Reinitialize the agent service with the appropriate API key
    const { isLiteLLM, isPlaceholder } = this.#getModelStatus(model);
    const apiKeyToUse = isLiteLLM ? 
      (localStorage.getItem(LITELLM_API_KEY_STORAGE_KEY) || localStorage.getItem('ai_chat_api_key') || null) :
      localStorage.getItem('ai_chat_api_key');
    
    // Don't initialize if placeholder is selected
    if (isPlaceholder) {
      this.#canSendMessages = false;
      this.performUpdate();
    } else if (isLiteLLM) {
      // For LiteLLM models, check for endpoint instead of API key
      const hasLiteLLMEndpoint = Boolean(localStorage.getItem(LITELLM_ENDPOINT_KEY));
      this.#canSendMessages = hasLiteLLMEndpoint;
      
      if (hasLiteLLMEndpoint) {
        this.#agentService.initialize(apiKeyToUse, this.#selectedModel)
          .catch(error => {
            console.error('Failed to reinitialize AgentService with new model:', error);
            this.#canSendMessages = false;
            this.performUpdate();
          });
      } else {
        this.performUpdate();
      }
    } else {
      // For OpenAI models, API key is required
      this.#canSendMessages = Boolean(apiKeyToUse);
      if (apiKeyToUse) {
        this.#agentService.initialize(apiKeyToUse, this.#selectedModel)
          .catch(error => {
            console.error('Failed to reinitialize AgentService with new model:', error);
            this.#canSendMessages = false;
            this.performUpdate();
          });
      } else {
        this.performUpdate();
      }
    }
  }

  // Public method to send a message (passed to ChatView)
  async sendMessage(text: string, imageInput?: ImageInputData): Promise<void> {
    if (!text.trim() || this.#isProcessing || !this.#canSendMessages) {
      return;
    }

    this.#isProcessing = true;
    this.#isTextInputEmpty = true;
    this.#imageInput = undefined;
    this.performUpdate();

    try {
      // Pass the selected agent type to the agent service
      await this.#agentService.sendMessage(text, imageInput, this.#selectedAgentType);
      // Reset the agent type after sending the message? Or keep it?
      // Let's keep it for now, assuming it modifies the agent's mode.
      // this.#selectedAgentType = null;
      // MESSAGES_CHANGED event will update state
    } catch (error) {
      console.error('Failed to send message:', error);
      this.#isProcessing = false;
      const errorMessage: ModelChatMessage = {
        entity: ChatMessageEntity.MODEL,
        action: 'final', 
        error: error instanceof Error ? error.message : String(error),
        answer: error instanceof Error ? error.message : String(error),
        isFinalAnswer: true, 
      };
      this.#messages.push(errorMessage as ChatMessage);
      this.performUpdate();
    } 
  }

  override wasShown(): void {
    this.performUpdate();
    this.#chatView?.focus();
  }

  override willHide(): void {
    // Clean up any resources when panel is hidden
  }

  override performUpdate(): void {
    // Determine if we're in centered view mode
    const isCenteredView = this.#chatView?.isCenteredView ?? false;
    
    // Render the toolbar into its dedicated container
    Lit.render(toolbarView({
        onNewChatClick: this.#onNewChatClick.bind(this),
        onHistoryClick: this.#onHistoryClick.bind(this),
        onDeleteClick: this.#onDeleteClick.bind(this),
        onHelpClick: this.#onHelpClick.bind(this),
        onSettingsClick: this.#onSettingsClick.bind(this),
        isDeleteHistoryButtonVisible: this.#messages.length > 1,
        isCenteredView: isCenteredView,
    }), this.#toolbarContainer, { host: this }); // Render into toolbar container

    // If we need to highlight the settings button when no API key is set
    if (!this.#canSendMessages && !this.#settingsButton) {
      // Try to find the settings button after rendering
      this.#settingsButton = this.#toolbarContainer.querySelector('.ai-chat-right-toolbar devtools-button[title="Settings"]');
      
      // Add pulsating animation to draw attention to settings
      if (this.#settingsButton) {
        // Add CSS animation to make it glow/pulse
        this.#settingsButton.classList.add('settings-highlight');
        
        // Add the style to the document head instead of trying to append to shadow root
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

    // Get a custom placeholder text based on API key status and model type
    let inputPlaceholder: string;
    if (this.#canSendMessages) {
      inputPlaceholder = i18nString(UIStrings.inputPlaceholder);
    } else {
      const { isLiteLLM } = this.#getModelStatus(this.#selectedModel);
      if (isLiteLLM) {
        inputPlaceholder = 'Please configure your LiteLLM endpoint in Settings to begin';
      } else {
        inputPlaceholder = 'Please add your OpenAI API key in Settings to begin';
      }
    }

    // Update chat view data
    if (this.#chatView) { 
      this.#chatView.data = {
        onPromptSelected: this.#handlePromptSelected.bind(this),
        messages: this.#messages,
        onSendMessage: this.sendMessage.bind(this), 
        state: this.#isProcessing ? ChatViewState.LOADING : ChatViewState.IDLE,
        isTextInputEmpty: this.#isTextInputEmpty,
        imageInput: this.#imageInput,
        // Pass model selection data to ChatView
        modelOptions: MODEL_OPTIONS,
        selectedModel: this.#selectedModel,
        onModelChanged: this.#handleModelChanged.bind(this),
        onModelSelectorFocus: this.#refreshLiteLLMModels.bind(this),
        selectedAgentType: this.#selectedAgentType,
        isModelSelectorDisabled: this.#isProcessing,
        // Add API key related props
        isInputDisabled: !this.#canSendMessages,
        inputPlaceholder: inputPlaceholder,
      };
    }
  }

  #handlePromptSelected(promptType: string): void {
    console.log('Prompt selected in AIChatPanel:', promptType);
    this.#selectedAgentType = promptType;
  }

  #onNewChatClick(): void {
    this.#agentService.clearConversation();
    this.#messages = this.#agentService.getMessages(); 
    this.#isProcessing = false;
    this.#selectedAgentType = null; // Reset selected agent type
    this.performUpdate();
    UI.ARIAUtils.alert(i18nString(UIStrings.newChatCreated));
  }

  #onHistoryClick(_event: MouseEvent): void {
    // Implementation needed
  }

  #onDeleteClick(): void {
    this.#onNewChatClick();
    UI.ARIAUtils.alert(i18nString(UIStrings.chatDeleted));
  }

  #onHelpClick(): void {
    // Create a help dialog
    const dialog = new UI.Dialog.Dialog();
    dialog.setDimmed(true);
    dialog.setOutsideClickCallback(() => dialog.hide());
    dialog.contentElement.classList.add('help-dialog');

    const content = document.createElement('div');
    content.classList.add('help-content');
    
    // Title
    const title = document.createElement('h2');
    title.textContent = 'AI Assistant Help';
    title.classList.add('help-title');
    content.appendChild(title);

    // Help content
    const helpText = document.createElement('div');
    helpText.classList.add('help-text');
    
    helpText.innerHTML = `
      <h3>Getting Started</h3>
      <p>To use AI Assistant, you need to provide an OpenAI API key in the Settings.</p>
      
      <h3>Available Models</h3>
      <p>AI Assistant supports several OpenAI models:</p>
      <ul>
        <li>O4 Mini - Balanced performance for most tasks</li>
        <li>GPT-4.1 Mini - Good for general tasks</li>
        <li>GPT-4.1 Nano - Fastest response times</li>
        <li>GPT-4.1 - Best quality for complex tasks</li>
      </ul>
      
      <h3>Common Tasks</h3>
      <ul>
        <li><strong>New Chat</strong> - Start a fresh conversation</li>
        <li><strong>Delete Chat</strong> - Remove the current conversation</li>
        <li><strong>History</strong> - View previous conversations</li>
        <li><strong>Settings</strong> - Configure your API key and preferences</li>
      </ul>
      
      <h3>Troubleshooting</h3>
      <p>If you encounter issues:</p>
      <ul>
        <li>Verify your API key is valid and has sufficient credits</li>
        <li>Check your internet connection</li>
        <li>Try a different model for your specific task</li>
      </ul>
    `;
    
    content.appendChild(helpText);

    // Close button at the bottom
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.classList.add('help-button');
    closeButton.addEventListener('click', () => dialog.hide());
    
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('help-footer');
    buttonContainer.appendChild(closeButton);
    content.appendChild(buttonContainer);

    dialog.contentElement.appendChild(content);
    
    // Add style
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .help-dialog {
        color: var(--color-text-primary);
        background-color: var(--color-background);
      }
      
      .help-content {
        padding: 16px;
        width: 500px;
        max-width: 100%;
        max-height: 80vh;
        overflow-y: auto;
      }
      
      .help-title {
        font-size: 16px;
        font-weight: normal;
        margin: 0 0 16px 0;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--color-details-hairline);
      }
      
      .help-text {
        font-size: 13px;
        line-height: 1.5;
      }
      
      .help-text h3 {
        font-size: 14px;
        font-weight: medium;
        margin: 16px 0 8px 0;
      }
      
      .help-text p, .help-text ul {
        margin: 8px 0;
      }
      
      .help-text ul {
        padding-left: 24px;
      }
      
      .help-footer {
        display: flex;
        justify-content: flex-end;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--color-details-hairline);
      }
      
      .help-button {
        padding: 6px 16px;
        border-radius: 4px;
        font-size: 13px;
        border: 1px solid var(--color-details-hairline);
        background-color: var(--color-background-elevation-1);
        color: var(--color-text-primary);
        cursor: pointer;
      }
      
      .help-button:hover {
        background-color: var(--color-background-elevation-2);
      }
    `;
    dialog.contentElement.appendChild(styleElement);
    
    dialog.show();
  }

  #onSettingsClick(): void {
    // Create a settings dialog
    const dialog = new UI.Dialog.Dialog();
    dialog.setDimmed(true);
    dialog.setOutsideClickCallback(() => dialog.hide());
    dialog.contentElement.classList.add('settings-dialog');

    const content = document.createElement('div');
    content.classList.add('settings-content');
    content.style.overflowY = 'auto';
    content.style.maxHeight = '70vh';
    
    // Title with DevTools styling
    const titleContainer = document.createElement('div');
    titleContainer.classList.add('settings-header');
    
    const title = document.createElement('h2');
    title.textContent = i18nString(UIStrings.settings);
    title.classList.add('settings-title');
    titleContainer.appendChild(title);
    
    content.appendChild(titleContainer);

    // LiteLLM Configuration section (moved to the top)
    const liteLLMSection = document.createElement('div');
    liteLLMSection.classList.add('settings-section');
    
    const liteLLMTitle = document.createElement('h3');
    liteLLMTitle.textContent = 'LiteLLM Configuration';
    liteLLMTitle.classList.add('settings-subtitle');
    liteLLMSection.appendChild(liteLLMTitle);
    
    // LiteLLM API Key input
    const liteLLMApiKeyLabel = document.createElement('div');
    liteLLMApiKeyLabel.textContent = 'LiteLLM API Key';
    liteLLMApiKeyLabel.classList.add('settings-label');
    liteLLMSection.appendChild(liteLLMApiKeyLabel);
    
    const liteLLMApiKeyHint = document.createElement('div');
    liteLLMApiKeyHint.textContent = 'Your LiteLLM API key for authentication (optional)';
    liteLLMApiKeyHint.classList.add('settings-hint');
    liteLLMApiKeyHint.style.fontSize = '12px';
    liteLLMApiKeyHint.style.color = 'var(--color-text-secondary)';
    liteLLMApiKeyHint.style.marginBottom = '8px';
    liteLLMSection.appendChild(liteLLMApiKeyHint);
    
    const liteLLMApiKeyInput = document.createElement('input');
    liteLLMApiKeyInput.type = 'password';
    liteLLMApiKeyInput.classList.add('settings-input');
    liteLLMApiKeyInput.classList.add('litellm-api-key-input');
    liteLLMApiKeyInput.placeholder = 'Enter your LiteLLM API key';
    const savedLiteLLMApiKey = localStorage.getItem(LITELLM_API_KEY_STORAGE_KEY) || '';
    liteLLMApiKeyInput.value = savedLiteLLMApiKey;
    liteLLMSection.appendChild(liteLLMApiKeyInput);
    
    // LiteLLM endpoint input
    const liteLLMEndpointLabel = document.createElement('div');
    liteLLMEndpointLabel.textContent = i18nString(UIStrings.litellmEndpointLabel);
    liteLLMEndpointLabel.classList.add('settings-label');
    liteLLMSection.appendChild(liteLLMEndpointLabel);
    
    const liteLLMEndpointHint = document.createElement('div');
    liteLLMEndpointHint.textContent = i18nString(UIStrings.litellmEndpointHint);
    liteLLMEndpointHint.classList.add('settings-hint');
    liteLLMEndpointHint.style.fontSize = '12px';
    liteLLMEndpointHint.style.color = 'var(--color-text-secondary)';
    liteLLMEndpointHint.style.marginBottom = '8px';
    liteLLMSection.appendChild(liteLLMEndpointHint);
    
    const liteLLMEndpointInput = document.createElement('input');
    liteLLMEndpointInput.type = 'text';
    liteLLMEndpointInput.classList.add('settings-input');
    liteLLMEndpointInput.classList.add('litellm-endpoint-input');
    liteLLMEndpointInput.placeholder = 'http://localhost:4000';
    const savedLiteLLMEndpoint = localStorage.getItem(LITELLM_ENDPOINT_KEY) || '';
    liteLLMEndpointInput.value = savedLiteLLMEndpoint;
    liteLLMSection.appendChild(liteLLMEndpointInput);
    
    // Add "Fetch Models" button for LiteLLM
    const fetchModelsContainer = document.createElement('div');
    fetchModelsContainer.style.marginTop = '8px';
    fetchModelsContainer.style.display = 'flex';
    fetchModelsContainer.style.alignItems = 'center';
    fetchModelsContainer.style.gap = '8px';
    
    const fetchModelsButton = document.createElement('button');
    fetchModelsButton.textContent = 'Fetch LiteLLM Models';
    fetchModelsButton.classList.add('settings-button', 'fetch-models-button');
    fetchModelsButton.style.fontSize = '12px';
    fetchModelsButton.style.padding = '4px 8px';
    
    // Disable fetch button if endpoint is empty
    const updateFetchButtonState = () => {
      fetchModelsButton.disabled = !liteLLMEndpointInput.value.trim();
    };
    
    liteLLMEndpointInput.addEventListener('input', updateFetchButtonState);
    updateFetchButtonState(); // Initial state
    
    const fetchModelsStatus = document.createElement('div');
    fetchModelsStatus.classList.add('settings-status');
    fetchModelsStatus.style.display = 'none';
    fetchModelsStatus.style.marginTop = '0';
    
    fetchModelsButton.addEventListener('click', async () => {
      fetchModelsButton.disabled = true;
      fetchModelsStatus.textContent = 'Fetching models...';
      fetchModelsStatus.style.display = 'block';
      fetchModelsStatus.style.backgroundColor = 'var(--color-accent-blue-background)';
      fetchModelsStatus.style.color = 'var(--color-accent-blue)';
      
      try {
        const endpoint = liteLLMEndpointInput.value;
        const liteLLMApiKey = liteLLMApiKeyInput.value || localStorage.getItem(LITELLM_API_KEY_STORAGE_KEY) || '';
        
        const { models: litellmModels, hadWildcard } = await this.#fetchLiteLLMModels(liteLLMApiKey, endpoint || undefined);
        this.#updateModelOptions(litellmModels, hadWildcard);
        
        const savedCustomModels = JSON.parse(localStorage.getItem('ai_chat_custom_models') || '[]');
        const actualModelCount = litellmModels.length;
        const hasCustomModels = savedCustomModels.length > 0;
        
        if (hadWildcard && actualModelCount === 0 && !hasCustomModels) {
          fetchModelsStatus.textContent = 'LiteLLM proxy returned wildcard model only. Please add custom models below.';
          fetchModelsStatus.style.backgroundColor = 'var(--color-accent-orange-background)';
          fetchModelsStatus.style.color = 'var(--color-accent-orange)';
        } else if (hadWildcard && actualModelCount === 0) {
          // Only wildcard was returned but we have custom models
          fetchModelsStatus.textContent = 'Fetched wildcard model (custom models available)';
          fetchModelsStatus.style.backgroundColor = 'var(--color-accent-green-background)';
          fetchModelsStatus.style.color = 'var(--color-accent-green)';
        } else if (hadWildcard) {
          // Wildcard plus other models
          fetchModelsStatus.textContent = `Fetched ${actualModelCount} models plus wildcard`;
          fetchModelsStatus.style.backgroundColor = 'var(--color-accent-green-background)';
          fetchModelsStatus.style.color = 'var(--color-accent-green)';
        } else {
          // No wildcard, just regular models
          fetchModelsStatus.textContent = `Fetched ${actualModelCount} models`;
          fetchModelsStatus.style.backgroundColor = 'var(--color-accent-green-background)';
          fetchModelsStatus.style.color = 'var(--color-accent-green)';
        }
        
        // Update the dropdown
        this.performUpdate();
      } catch (error) {
        console.error('Failed to fetch models:', error);
        fetchModelsStatus.textContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        fetchModelsStatus.style.backgroundColor = 'var(--color-accent-red-background)';
        fetchModelsStatus.style.color = 'var(--color-accent-red)';
      } finally {
        updateFetchButtonState();
        setTimeout(() => {
          fetchModelsStatus.style.display = 'none';
        }, 3000);
      }
    });
    
    fetchModelsContainer.appendChild(fetchModelsButton);
    fetchModelsContainer.appendChild(fetchModelsStatus);
    liteLLMSection.appendChild(fetchModelsContainer);
    
    // Custom model section with array support
    const customModelSection = document.createElement('div');
    customModelSection.style.marginTop = '16px';
    
    const customModelLabel = document.createElement('div');
    customModelLabel.textContent = 'Custom Models';
    customModelLabel.classList.add('settings-label');
    customModelSection.appendChild(customModelLabel);
    
    const customModelHint = document.createElement('div');
    customModelHint.textContent = 'Add custom models one at a time. Test each model before adding.';
    customModelHint.classList.add('settings-hint');
    customModelHint.style.fontSize = '12px';
    customModelHint.style.color = 'var(--color-text-secondary)';
    customModelHint.style.marginBottom = '8px';
    customModelSection.appendChild(customModelHint);
    
    // Current custom models list
    const customModelsList = document.createElement('div');
    customModelsList.classList.add('custom-models-list');
    customModelsList.style.marginBottom = '8px';
    
    // Load saved custom models
    const savedCustomModels = JSON.parse(localStorage.getItem('ai_chat_custom_models') || '[]');
    
    const updateCustomModelsList = () => {
      customModelsList.innerHTML = '';
      savedCustomModels.forEach((model: string, index: number) => {
        const modelItem = document.createElement('div');
        modelItem.style.display = 'flex';
        modelItem.style.alignItems = 'center';
        modelItem.style.gap = '8px';
        modelItem.style.marginBottom = '4px';
        
        const modelText = document.createElement('span');
        modelText.textContent = model;
        modelText.style.flex = '1';
        
        // Test button
        const testButton = document.createElement('button');
        testButton.textContent = 'Test';
        testButton.classList.add('settings-button');
        testButton.style.fontSize = '12px';
        testButton.style.padding = '2px 8px';
        
        // Status element for test results
        const testStatus = document.createElement('span');
        testStatus.style.fontSize = '12px';
        testStatus.style.marginLeft = '4px';
        testStatus.style.display = 'none';
        
        testButton.addEventListener('click', async () => {
          testButton.disabled = true;
          testStatus.textContent = 'Testing...';
          testStatus.style.color = 'var(--color-accent-blue)';
          testStatus.style.display = 'inline';
          
          try {
            const endpoint = liteLLMEndpointInput.value;
            const liteLLMApiKey = liteLLMApiKeyInput.value || localStorage.getItem(LITELLM_API_KEY_STORAGE_KEY) || '';
            
            if (!endpoint) {
              throw new Error('LiteLLM endpoint is required to test model');
            }
            
            const result = await LiteLLMClient.testConnection(liteLLMApiKey, model, endpoint);
            
            if (result.success) {
              testStatus.textContent = '✓';
              testStatus.style.color = 'var(--color-accent-green)';
            } else {
              testStatus.textContent = '✗';
              testStatus.style.color = 'var(--color-accent-red)';
              testStatus.title = result.message; // Show error on hover
            }
          } catch (error) {
            testStatus.textContent = '✗';
            testStatus.style.color = 'var(--color-accent-red)';
            testStatus.title = error instanceof Error ? error.message : 'Unknown error';
          } finally {
            testButton.disabled = false;
            setTimeout(() => {
              testStatus.style.display = 'none';
            }, 5000);
          }
        });
        
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.classList.add('settings-button');
        removeButton.style.fontSize = '12px';
        removeButton.style.padding = '2px 8px';
        removeButton.addEventListener('click', () => {
          savedCustomModels.splice(index, 1);
          localStorage.setItem('ai_chat_custom_models', JSON.stringify(savedCustomModels));
          updateCustomModelsList();
          
          // Update MODEL_OPTIONS to remove the deleted model
          MODEL_OPTIONS = MODEL_OPTIONS.filter(opt => opt.value !== model);
          localStorage.setItem('ai_chat_model_options', JSON.stringify(MODEL_OPTIONS));
          this.performUpdate();
        });
        
        modelItem.appendChild(modelText);
        modelItem.appendChild(testButton);
        modelItem.appendChild(testStatus);
        modelItem.appendChild(removeButton);
        customModelsList.appendChild(modelItem);
      });
    };
    
    updateCustomModelsList();
    customModelSection.appendChild(customModelsList);
    
    // New model input with test and add
    const newModelContainer = document.createElement('div');
    newModelContainer.style.display = 'flex';
    newModelContainer.style.gap = '8px';
    newModelContainer.style.alignItems = 'center';
    
    const customModelInput = document.createElement('input');
    customModelInput.type = 'text';
    customModelInput.classList.add('settings-input');
    customModelInput.placeholder = 'Enter model name (e.g., gpt-4)';
    customModelInput.style.flex = '1';
    
    // Reset test passed state when input changes
    customModelInput.addEventListener('input', () => {
      testPassed = false;
      modelTestStatus.style.display = 'none';
    });
    
    const testModelButton = document.createElement('button');
    testModelButton.textContent = 'Test';
    testModelButton.classList.add('settings-button');
    testModelButton.style.fontSize = '12px';
    testModelButton.style.padding = '4px 12px';
    
    const addModelButton = document.createElement('button');
    addModelButton.textContent = 'Add';
    addModelButton.classList.add('settings-button', 'save-button');
    addModelButton.style.fontSize = '12px';
    addModelButton.style.padding = '4px 12px';
    
    const modelTestStatus = document.createElement('div');
    modelTestStatus.classList.add('settings-status');
    modelTestStatus.style.display = 'none';
    modelTestStatus.style.marginTop = '8px';
    
    let testPassed = false;
    
    testModelButton.addEventListener('click', async () => {
      const modelName = customModelInput.value.trim();
      if (!modelName) {
        modelTestStatus.textContent = 'Please enter a model name';
        modelTestStatus.style.backgroundColor = 'var(--color-accent-red-background)';
        modelTestStatus.style.color = 'var(--color-accent-red)';
        modelTestStatus.style.display = 'block';
        return;
      }
      
      testModelButton.disabled = true;
      modelTestStatus.textContent = 'Testing model...';
      modelTestStatus.style.backgroundColor = 'var(--color-accent-blue-background)';
      modelTestStatus.style.color = 'var(--color-accent-blue)';
      modelTestStatus.style.display = 'block';
      
      try {
        const endpoint = liteLLMEndpointInput.value;
        const liteLLMApiKey = liteLLMApiKeyInput.value || localStorage.getItem(LITELLM_API_KEY_STORAGE_KEY) || '';
        
        if (!endpoint) {
          throw new Error('LiteLLM endpoint is required to test model');
        }
        
        const result = await LiteLLMClient.testConnection(liteLLMApiKey, modelName, endpoint);
        
        if (result.success) {
          modelTestStatus.textContent = `Test passed: ${result.message}`;
          modelTestStatus.style.backgroundColor = 'var(--color-accent-green-background)';
          modelTestStatus.style.color = 'var(--color-accent-green)';
          testPassed = true;
        } else {
          modelTestStatus.textContent = `Test failed: ${result.message}`;
          modelTestStatus.style.backgroundColor = 'var(--color-accent-red-background)';
          modelTestStatus.style.color = 'var(--color-accent-red)';
          testPassed = false;
        }
      } catch (error) {
        modelTestStatus.textContent = `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        modelTestStatus.style.backgroundColor = 'var(--color-accent-red-background)';
        modelTestStatus.style.color = 'var(--color-accent-red)';
        testPassed = false;
      } finally {
        testModelButton.disabled = false;
      }
    });
    
    addModelButton.addEventListener('click', async () => {
      const modelName = customModelInput.value.trim();
      
      if (!modelName) {
        modelTestStatus.textContent = 'Please enter a model name';
        modelTestStatus.style.backgroundColor = 'var(--color-accent-red-background)';
        modelTestStatus.style.color = 'var(--color-accent-red)';
        modelTestStatus.style.display = 'block';
        return;
      }
      
      // If not tested yet, test it first
      if (!testPassed) {
        testModelButton.disabled = true;
        addModelButton.disabled = true;
        modelTestStatus.textContent = 'Testing model...';
        modelTestStatus.style.backgroundColor = 'var(--color-accent-blue-background)';
        modelTestStatus.style.color = 'var(--color-accent-blue)';
        modelTestStatus.style.display = 'block';
        
        try {
          const endpoint = liteLLMEndpointInput.value;
          const liteLLMApiKey = liteLLMApiKeyInput.value || localStorage.getItem(LITELLM_API_KEY_STORAGE_KEY) || '';
          
          if (!endpoint) {
            throw new Error('LiteLLM endpoint is required to test model');
          }
          
          const result = await LiteLLMClient.testConnection(liteLLMApiKey, modelName, endpoint);
          
          if (result.success) {
            modelTestStatus.textContent = `Test passed: ${result.message}`;
            modelTestStatus.style.backgroundColor = 'var(--color-accent-green-background)';
            modelTestStatus.style.color = 'var(--color-accent-green)';
            testPassed = true;
          } else {
            modelTestStatus.textContent = `Test failed: ${result.message}`;
            modelTestStatus.style.backgroundColor = 'var(--color-accent-red-background)';
            modelTestStatus.style.color = 'var(--color-accent-red)';
            testPassed = false;
            testModelButton.disabled = false;
            addModelButton.disabled = false;
            return;
          }
        } catch (error) {
          modelTestStatus.textContent = `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`;
          modelTestStatus.style.backgroundColor = 'var(--color-accent-red-background)';
          modelTestStatus.style.color = 'var(--color-accent-red)';
          testPassed = false;
          testModelButton.disabled = false;
          addModelButton.disabled = false;
          return;
        }
        
        testModelButton.disabled = false;
      }
      
      // If test passed, add the model
      if (testPassed && !savedCustomModels.includes(modelName)) {
        savedCustomModels.push(modelName);
        localStorage.setItem('ai_chat_custom_models', JSON.stringify(savedCustomModels));
        
        // Add to MODEL_OPTIONS
        const newOption = {
          value: modelName,
          label: `LiteLLM: ${modelName}`,
          type: 'litellm' as const
        };
        MODEL_OPTIONS.push(newOption);
        localStorage.setItem('ai_chat_model_options', JSON.stringify(MODEL_OPTIONS));
        
        updateCustomModelsList();
        this.performUpdate();
        customModelInput.value = '';
        testPassed = false;
        modelTestStatus.style.display = 'none';
      } else if (savedCustomModels.includes(modelName)) {
        modelTestStatus.textContent = 'Model already exists';
        modelTestStatus.style.backgroundColor = 'var(--color-accent-orange-background)';
        modelTestStatus.style.color = 'var(--color-accent-orange)';
        modelTestStatus.style.display = 'block';
      }
    });
    
    newModelContainer.appendChild(customModelInput);
    newModelContainer.appendChild(testModelButton);
    newModelContainer.appendChild(addModelButton);
    
    customModelSection.appendChild(newModelContainer);
    customModelSection.appendChild(modelTestStatus);
    
    liteLLMSection.appendChild(customModelSection);
    content.appendChild(liteLLMSection);

    // API Key section
    const apiKeySection = document.createElement('div');
    apiKeySection.classList.add('settings-section');
    
    const apiKeyLabel = document.createElement('div');
    apiKeyLabel.textContent = i18nString(UIStrings.apiKeyLabel);
    apiKeyLabel.classList.add('settings-label');
    apiKeySection.appendChild(apiKeyLabel);

    // Add hint text about API key requirement
    const apiKeyHint = document.createElement('div');
    apiKeyHint.textContent = 'An OpenAI API key is required for OpenAI models (GPT-4.1, O4 Mini, etc.)';
    apiKeyHint.classList.add('settings-hint');
    apiKeyHint.style.fontSize = '12px';
    apiKeyHint.style.color = 'var(--color-text-secondary)';
    apiKeyHint.style.marginBottom = '8px';
    apiKeySection.appendChild(apiKeyHint);

    const apiKeyInput = document.createElement('input');
    apiKeyInput.type = 'password';
    apiKeyInput.classList.add('settings-input');
    apiKeyInput.placeholder = 'Enter your OpenAI API key';
    // Load the saved API key from localStorage
    const savedApiKey = localStorage.getItem('ai_chat_api_key') || '';
    apiKeyInput.value = savedApiKey;
    apiKeySection.appendChild(apiKeyInput);
    
    // Status message for API key validation
    const apiKeyStatus = document.createElement('div');
    apiKeyStatus.classList.add('settings-status');
    apiKeyStatus.style.display = 'none';
    apiKeySection.appendChild(apiKeyStatus);
    
    content.appendChild(apiKeySection);

    // Browsing History section
    const historySection = document.createElement('div');
    historySection.classList.add('settings-section');
    
    const historyTitle = document.createElement('h3');
    historyTitle.textContent = i18nString(UIStrings.browsingHistory);
    historyTitle.classList.add('settings-subtitle');
    historySection.appendChild(historyTitle);

    const historyDescription = document.createElement('p');
    historyDescription.textContent = 'Your browsing history is stored locally to enable search by domains and keywords.';
    historyDescription.classList.add('settings-description');
    historySection.appendChild(historyDescription);

    // Status message element (initially hidden)
    const statusMessage = document.createElement('div');
    statusMessage.classList.add('settings-status');
    statusMessage.style.display = 'none';
    statusMessage.textContent = i18nString(UIStrings.historyCleared);
    historySection.appendChild(statusMessage);
    
    // Clear history button
    const clearHistoryButton = document.createElement('button');
    clearHistoryButton.textContent = i18nString(UIStrings.clearHistory);
    clearHistoryButton.classList.add('settings-button', 'clear-button');
    
    clearHistoryButton.addEventListener('click', async () => {
      try {
        // Import the VisitHistoryManager from its dedicated file
        const { VisitHistoryManager } = await import('../tools/VisitHistoryManager.js');
        await VisitHistoryManager.getInstance().clearHistory();
        
        // Show success message
        statusMessage.style.display = 'block';
        
        // Hide message after 3 seconds
        setTimeout(() => {
          statusMessage.style.display = 'none';
        }, 3000);
      } catch (error) {
        console.error('Error clearing browsing history:', error);
      }
    });
    historySection.appendChild(clearHistoryButton);
    content.appendChild(historySection);

    // Add disclaimer section
    const disclaimerSection = document.createElement('div');
    disclaimerSection.classList.add('settings-section', 'disclaimer-section');
    
    const disclaimerTitle = document.createElement('h3');
    disclaimerTitle.textContent = 'Important Notice';
    disclaimerTitle.classList.add('settings-subtitle');
    disclaimerSection.appendChild(disclaimerTitle);

    const disclaimerText = document.createElement('div');
    disclaimerText.classList.add('settings-disclaimer');
    disclaimerText.innerHTML = `
      <p style="color: var(--color-accent-orange); margin-bottom: 8px;">
        <strong>Alpha Version:</strong> This is an alpha version of the Browser Operator - AI Assistant feature.
      </p>
      <p style="margin-bottom: 8px;">
        <strong>Data Sharing:</strong> When using this feature, your browser data and conversation content will be sent to the AI model for processing.
      </p>
      <p style="margin-bottom: 8px;">
        <strong>Model Support:</strong> We currently support OpenAI models, with plans to add support for additional AI models in future updates.
      </p>
      <p style="font-size: 12px; color: var(--color-text-secondary);">
        By using this feature, you acknowledge that your data will be processed according to OpenAI's privacy policy and terms of service.
      </p>
    `;
    disclaimerSection.appendChild(disclaimerText);
    content.appendChild(disclaimerSection);

    // Model Selection Section
    const modelSelectionSection = document.createElement('div');
    modelSelectionSection.classList.add('settings-section');
    modelSelectionSection.style.marginTop = '24px';
    
    const modelSelectionTitle = document.createElement('h3');
    modelSelectionTitle.textContent = i18nString(UIStrings.modelSizeSelectionTitle);
    modelSelectionTitle.classList.add('settings-subtitle');
    modelSelectionSection.appendChild(modelSelectionTitle);
    
    const modelSelectionHint = document.createElement('div');
    modelSelectionHint.textContent = i18nString(UIStrings.modelSizeSelectionHint);
    modelSelectionHint.classList.add('settings-hint');
    modelSelectionHint.style.fontSize = '12px';
    modelSelectionHint.style.color = 'var(--color-text-secondary)';
    modelSelectionHint.style.marginBottom = '16px';
    modelSelectionSection.appendChild(modelSelectionHint);
    
    // Mini Model Selection
    const miniModelContainer = document.createElement('div');
    miniModelContainer.style.marginBottom = '16px';
    
    const miniModelLabel = document.createElement('div');
    miniModelLabel.textContent = i18nString(UIStrings.miniModelLabel);
    miniModelLabel.classList.add('settings-label');
    miniModelContainer.appendChild(miniModelLabel);
    
    const miniModelDescription = document.createElement('div');
    miniModelDescription.textContent = i18nString(UIStrings.miniModelDescription);
    miniModelDescription.classList.add('settings-hint');
    miniModelDescription.style.fontSize = '11px';
    miniModelDescription.style.color = 'var(--color-text-secondary)';
    miniModelDescription.style.marginBottom = '8px';
    miniModelContainer.appendChild(miniModelDescription);
    
    const miniModelSelect = document.createElement('select');
    miniModelSelect.classList.add('settings-input');
    miniModelSelect.style.width = '100%';
    
    // Add default option
    const miniDefaultOption = document.createElement('option');
    miniDefaultOption.value = '';
    miniDefaultOption.textContent = i18nString(UIStrings.miniModelDefault);
    miniModelSelect.appendChild(miniDefaultOption);
    
    // Add model options
    MODEL_OPTIONS.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      if (option.value === this.#miniModel) {
        optionElement.selected = true;
      }
      miniModelSelect.appendChild(optionElement);
    });
    
    miniModelContainer.appendChild(miniModelSelect);
    modelSelectionSection.appendChild(miniModelContainer);
    
    // Nano Model Selection
    const nanoModelContainer = document.createElement('div');
    nanoModelContainer.style.marginBottom = '16px';
    
    const nanoModelLabel = document.createElement('div');
    nanoModelLabel.textContent = i18nString(UIStrings.nanoModelLabel);
    nanoModelLabel.classList.add('settings-label');
    nanoModelContainer.appendChild(nanoModelLabel);
    
    const nanoModelDescription = document.createElement('div');
    nanoModelDescription.textContent = i18nString(UIStrings.nanoModelDescription);
    nanoModelDescription.classList.add('settings-hint');
    nanoModelDescription.style.fontSize = '11px';
    nanoModelDescription.style.color = 'var(--color-text-secondary)';
    nanoModelDescription.style.marginBottom = '8px';
    nanoModelContainer.appendChild(nanoModelDescription);
    
    const nanoModelSelect = document.createElement('select');
    nanoModelSelect.classList.add('settings-input');
    nanoModelSelect.style.width = '100%';
    
    // Add default option
    const nanoDefaultOption = document.createElement('option');
    nanoDefaultOption.value = '';
    nanoDefaultOption.textContent = i18nString(UIStrings.nanoModelDefault);
    nanoModelSelect.appendChild(nanoDefaultOption);
    
    // Add model options
    MODEL_OPTIONS.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      if (option.value === this.#nanoModel) {
        optionElement.selected = true;
      }
      nanoModelSelect.appendChild(optionElement);
    });
    
    nanoModelContainer.appendChild(nanoModelSelect);
    modelSelectionSection.appendChild(nanoModelContainer);
    
    content.appendChild(modelSelectionSection);

    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('settings-footer');
    content.appendChild(buttonContainer);

    // Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.classList.add('settings-button', 'cancel-button');
    cancelButton.addEventListener('click', () => dialog.hide());
    buttonContainer.appendChild(cancelButton);

    // Save button
    const saveButton = document.createElement('button');
    saveButton.textContent = i18nString(UIStrings.saveButton);
    saveButton.classList.add('settings-button', 'save-button');
    saveButton.addEventListener('click', async () => {
      // Save OpenAI API key
      const newApiKey = apiKeyInput.value.trim();
      if (newApiKey) {
        localStorage.setItem('ai_chat_api_key', newApiKey);
      } else {
        localStorage.removeItem('ai_chat_api_key');
      }
      
      // Save or remove LiteLLM API key
      const liteLLMApiKeyValue = liteLLMApiKeyInput.value.trim();
      if (liteLLMApiKeyValue) {
        localStorage.setItem(LITELLM_API_KEY_STORAGE_KEY, liteLLMApiKeyValue);
      } else {
        localStorage.removeItem(LITELLM_API_KEY_STORAGE_KEY);
      }
      
      // Save or remove LiteLLM endpoint
      const liteLLMEndpointValue = liteLLMEndpointInput.value.trim();
      if (liteLLMEndpointValue) {
        localStorage.setItem(LITELLM_ENDPOINT_KEY, liteLLMEndpointValue);
      } else {
        localStorage.removeItem(LITELLM_ENDPOINT_KEY);
      }
      
      // Save Mini Model selection  
      const miniModelValue = miniModelSelect.value;
      if (miniModelValue) {
        this.#miniModel = miniModelValue;
        localStorage.setItem(MINI_MODEL_STORAGE_KEY, miniModelValue);
      } else {
        this.#miniModel = '';
        localStorage.removeItem(MINI_MODEL_STORAGE_KEY);
      }
      
      // Save Nano Model selection
      const nanoModelValue = nanoModelSelect.value;
      if (nanoModelValue) {
        this.#nanoModel = nanoModelValue;
        localStorage.setItem(NANO_MODEL_STORAGE_KEY, nanoModelValue);
      } else {
        this.#nanoModel = '';
        localStorage.removeItem(NANO_MODEL_STORAGE_KEY);
      }
      
      // Update MODEL_OPTIONS after saving to reflect API key changes
      this.#updateModelOptions([], false);
      
      // Refresh LiteLLM models if endpoint exists (or clear them if removed)
      await this.#refreshLiteLLMModels();
      
      // Validate selected model is still available
      if (!MODEL_OPTIONS.some(opt => opt.value === this.#selectedModel)) {
        if (MODEL_OPTIONS.length > 0) {
          this.#selectedModel = MODEL_OPTIONS[0].value;
          localStorage.setItem(MODEL_SELECTION_KEY, this.#selectedModel);
        }
      }
      
      // Determine which API key to use based on the selected model
      const { isLiteLLM, isPlaceholder } = this.#getModelStatus(this.#selectedModel);
      const apiKeyToUse = isLiteLLM ? 
        (liteLLMApiKeyValue || newApiKey || null) : 
        newApiKey;
      
      // For OpenAI models, API key is required
      if (!isLiteLLM && !newApiKey) {
        // Clear everything if no API key is available for OpenAI models
        this.#canSendMessages = false;
        apiKeyStatus.textContent = 'API key is required for OpenAI models';
        apiKeyStatus.style.backgroundColor = 'var(--color-accent-orange-background)';
        apiKeyStatus.style.color = 'var(--color-accent-orange)';
        apiKeyStatus.style.display = 'block';
        
        this.performUpdate();
        
        setTimeout(() => dialog.hide(), 1500);
        return;
      }
      
      // For LiteLLM models, endpoint is required
      if (isLiteLLM && !liteLLMEndpointValue) {
        this.#canSendMessages = false;
        apiKeyStatus.textContent = 'LiteLLM endpoint is required for LiteLLM models';
        apiKeyStatus.style.backgroundColor = 'var(--color-accent-orange-background)';
        apiKeyStatus.style.color = 'var(--color-accent-orange)';
        apiKeyStatus.style.display = 'block';
        
        this.performUpdate();
        
        setTimeout(() => dialog.hide(), 1500);
        return;
      }
      
      // Don't initialize if placeholder is selected
      if (isPlaceholder) {
        this.#canSendMessages = false;
        apiKeyStatus.textContent = 'Please select a valid model or add a custom model';
        apiKeyStatus.style.backgroundColor = 'var(--color-accent-orange-background)';
        apiKeyStatus.style.color = 'var(--color-accent-orange)';
        apiKeyStatus.style.display = 'block';
        
        this.performUpdate();
        
        setTimeout(() => dialog.hide(), 1500);
        return;
      }
      
      // Re-initialize the agent service with the appropriate key
      let shouldInitialize = false;
      if (isLiteLLM) {
        this.#canSendMessages = Boolean(liteLLMEndpointValue);
        shouldInitialize = Boolean(liteLLMEndpointValue);
      } else {
        this.#canSendMessages = Boolean(newApiKey);
        shouldInitialize = Boolean(newApiKey);
      }
      
      if (shouldInitialize) {
        this.#agentService.initialize(apiKeyToUse, this.#selectedModel)
          .then(() => {
            console.log('AgentService initialized with API key.');
            this.#canSendMessages = true;
            apiKeyStatus.textContent = 'Settings saved successfully';
            apiKeyStatus.style.backgroundColor = 'var(--color-accent-green-background)';
            apiKeyStatus.style.color = 'var(--color-accent-green)';
            apiKeyStatus.style.display = 'block';
            
            this.performUpdate();
            
            setTimeout(() => dialog.hide(), 1500);
          })
          .catch(error => {
            console.error('Failed to initialize AgentService:', error);
            this.#canSendMessages = false;
            
            apiKeyStatus.textContent = 'Error: ' + error.message;
            apiKeyStatus.style.backgroundColor = 'var(--color-accent-red-background)';
            apiKeyStatus.style.color = 'var(--color-accent-red)';
            apiKeyStatus.style.display = 'block';
            UI.ARIAUtils.alert('Failed to initialize with the API key: ' + error.message);
          });
      } else {
        this.performUpdate();
        setTimeout(() => dialog.hide(), 1500);
      }
    });
    buttonContainer.appendChild(saveButton);

    dialog.contentElement.appendChild(content);
    
    // Add a style element with settings dialog styles
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .settings-dialog {
        color: var(--color-text-primary);
        background-color: var(--color-background);
      }
      
      .settings-content {
        padding: 16px;
        width: 450px;
        max-width: 100%;
      }
      
      .settings-header {
        margin-bottom: 16px;
        border-bottom: 1px solid var(--color-details-hairline);
        padding-bottom: 8px;
      }
      
      .settings-title {
        font-size: 16px;
        font-weight: normal;
        margin: 0;
      }
      
      .settings-subtitle {
        font-size: 14px;
        font-weight: normal;
        margin: 0 0 8px 0;
      }
      
      .settings-section {
        margin-bottom: 16px;
      }
      
      .settings-label {
        margin-bottom: 4px;
        font-weight: medium;
      }
      
      .settings-description {
        font-size: 12px;
        color: var(--color-text-secondary);
        margin: 4px 0 8px 0;
      }
      
      .settings-input, .settings-select {
        width: 100%;
        padding: 6px 8px;
        border-radius: 4px;
        border: 1px solid var(--color-details-hairline);
        background-color: var(--color-background-elevation-1);
        color: var(--color-text-primary);
        font-size: 13px;
        margin-top: 4px;
        box-sizing: border-box;
      }
      
      .settings-input:focus, .settings-select:focus {
        outline: none;
        border-color: var(--color-primary);
      }
      
      .settings-status {
        margin-top: 8px;
        padding: 6px;
        background-color: var(--color-accent-green-background);
        color: var(--color-accent-green);
        border-radius: 4px;
        font-size: 12px;
      }
      
      .settings-footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid var(--color-details-hairline);
      }
      
      .settings-button {
        padding: 6px 16px;
        border-radius: 4px;
        font-size: 13px;
        border: 1px solid var(--color-details-hairline);
        background-color: var(--color-background-elevation-1);
        color: var(--color-text-primary);
        cursor: pointer;
      }
      
      .settings-button:hover {
        background-color: var(--color-background-elevation-2);
      }
      
      .save-button {
        background-color: var(--color-primary);
        color: white;
        border-color: var(--color-primary);
      }
      
      .save-button:hover {
        background-color: var(--color-primary-variant);
      }
      
      .clear-button {
        margin-top: 8px;
      }
      
      .disclaimer-section {
        background-color: var(--color-background-elevation-1);
        border-radius: 4px;
        padding: 12px;
        margin-top: 16px;
        border: 1px solid var(--color-details-hairline);
      }
      
      .settings-disclaimer p {
        margin: 0;
        line-height: 1.4;
      }
      
      .settings-disclaimer strong {
        font-weight: 500;
      }
    `;
    dialog.contentElement.appendChild(styleElement);
    
    dialog.show();
  }

  override markAsRoot(): void {
    super.markAsRoot();
    if (this.contentElement) { 
        UI.ARIAUtils.markAsTree(this.contentElement);
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
