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

// Add model options constant
const MODEL_OPTIONS = [
  {value: 'o4-mini-2025-04-16', label: 'O4 Mini'},
  {value: 'gpt-4.1-mini-2025-04-14', label: 'GPT-4.1 Mini'},
  {value: 'gpt-4.1-nano-2025-04-14', label: 'GPT-4.1 Nano'},
  {value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1'},
];

// Model selector localStorage key
const MODEL_SELECTION_KEY = 'ai_chat_model_selection';

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
  apiKeyLabel: 'API Key',
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
  #hasApiKey = false; // Add flag to track if we have an API key
  #settingsButton: HTMLElement | null = null; // Reference to the settings button

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
    
    // Check if model selection is stored in localStorage
    const storedModel = localStorage.getItem(MODEL_SELECTION_KEY);
    if (storedModel && MODEL_OPTIONS.some(option => option.value === storedModel)) {
      this.#selectedModel = storedModel;
    }
    
    // Initialize the agent service
    this.#initializeAgentService();
    
    // Initial update to render toolbar and chat
    this.performUpdate(); 
  }

  /**
   * Initialize the agent service
   */
  #initializeAgentService(): void {
    // Try to load API key from local storage
    const storedApiKey = localStorage.getItem('ai_chat_api_key');
    if (storedApiKey) {
      this.#hasApiKey = true;
      this.#agentService.initialize(storedApiKey, this.#selectedModel)
        .catch(error => {
           console.error('Failed to initialize AgentService on load:', error);
           this.#hasApiKey = false;
           this.performUpdate(); // Update UI to reflect failure
        });
    } else {
      this.#hasApiKey = false;
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

  #handleModelChanged(model: string): void {
    this.#selectedModel = model;
    localStorage.setItem(MODEL_SELECTION_KEY, model);
    
    // Reinitialize the agent service with the new model
    // Get API key from local storage
    const storedApiKey = localStorage.getItem('ai_chat_api_key');
    if (storedApiKey) {
      this.#agentService.initialize(storedApiKey, this.#selectedModel)
        .catch(error => {
          console.error('Failed to reinitialize AgentService with new model:', error);
        });
    }
  }

  // Public method to send a message (passed to ChatView)
  async sendMessage(text: string, imageInput?: ImageInputData): Promise<void> {
    if (!text.trim() || this.#isProcessing || !this.#hasApiKey) {
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
    if (!this.#hasApiKey && !this.#settingsButton) {
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
    } else if (this.#hasApiKey && this.#settingsButton) {
      // Remove the highlight if we now have an API key
      this.#settingsButton.classList.remove('settings-highlight');
      this.#settingsButton = null;
    }

    // Get a custom placeholder text based on API key status
    const inputPlaceholder = this.#hasApiKey ? 
      i18nString(UIStrings.inputPlaceholder) : 
      'Please add your API key in Settings to begin';

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
        selectedAgentType: this.#selectedAgentType,
        isModelSelectorDisabled: this.#isProcessing,
        // Add API key related props
        isInputDisabled: !this.#hasApiKey,
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
        <li>GPT-4.1 Mini - Good for general coding assistance</li>
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
    
    // Title with DevTools styling
    const titleContainer = document.createElement('div');
    titleContainer.classList.add('settings-header');
    
    const title = document.createElement('h2');
    title.textContent = i18nString(UIStrings.settings);
    title.classList.add('settings-title');
    titleContainer.appendChild(title);
    
    content.appendChild(titleContainer);

    // API Key section
    const apiKeySection = document.createElement('div');
    apiKeySection.classList.add('settings-section');
    
    const apiKeyLabel = document.createElement('div');
    apiKeyLabel.textContent = i18nString(UIStrings.apiKeyLabel);
    apiKeyLabel.classList.add('settings-label');
    apiKeySection.appendChild(apiKeyLabel);

    // Add hint text about API key requirement
    const apiKeyHint = document.createElement('div');
    apiKeyHint.textContent = 'An OpenAI API key is required to use this assistant';
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
    saveButton.addEventListener('click', () => {
      const newApiKey = apiKeyInput.value;
      
      if (!newApiKey) {
        // Clear API key if the field is empty
        localStorage.removeItem('ai_chat_api_key');
        this.#hasApiKey = false;
        apiKeyStatus.textContent = 'API key cleared successfully';
        apiKeyStatus.style.backgroundColor = 'var(--color-accent-green-background)';
        apiKeyStatus.style.color = 'var(--color-accent-green)';
        apiKeyStatus.style.display = 'block';
        
        // Force an update to refresh the UI
        this.performUpdate();
        
        setTimeout(() => dialog.hide(), 1500);
        return;
      }
      
      // Save to localStorage
      localStorage.setItem('ai_chat_api_key', newApiKey);
      
      // Re-initialize the agent service with the new key and current model
      this.#agentService.initialize(newApiKey, this.#selectedModel)
        .then(() => {
          console.log('AgentService initialized with new API key.');
          this.#hasApiKey = true; // Set flag to true on success
          apiKeyStatus.textContent = 'API key saved successfully';
          apiKeyStatus.style.backgroundColor = 'var(--color-accent-green-background)';
          apiKeyStatus.style.color = 'var(--color-accent-green)';
          apiKeyStatus.style.display = 'block';
          
          // Force an update to refresh the UI with the new API key state
          this.performUpdate();
          
          setTimeout(() => dialog.hide(), 1500);
        })
        .catch(error => {
          console.error('Failed to initialize AgentService after API key change:', error);
          this.#hasApiKey = false; // Ensure flag is false on failure
          
          apiKeyStatus.textContent = 'Error: ' + error.message;
          apiKeyStatus.style.backgroundColor = 'var(--color-accent-red-background)';
          apiKeyStatus.style.color = 'var(--color-accent-red)';
          apiKeyStatus.style.display = 'block';
          UI.ARIAUtils.alert('Failed to initialize with the new API key: ' + error.message);
        });
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
