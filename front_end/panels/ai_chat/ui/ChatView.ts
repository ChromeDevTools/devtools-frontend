// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Marked from '../../../third_party/marked/marked.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as BaseOrchestratorAgent from '../core/BaseOrchestratorAgent.js';
import { TIMING_CONSTANTS, CONTENT_THRESHOLDS, ERROR_MESSAGES, REGEX_PATTERNS } from '../core/Constants.js';
import { PromptEditDialog } from './PromptEditDialog.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Host from '../../../core/host/host.js';
import * as Platform from '../../../core/platform/platform.js';
import { createLogger } from '../core/Logger.js';
import type { AgentSession, AgentMessage, ToolCallMessage as AgentToolCallMessage, ToolResultMessage as AgentToolResultMessage } from '../agent_framework/AgentSessionTypes.js';
import { getAgentUIConfig } from '../agent_framework/AgentSessionTypes.js';
import { VersionChecker, type VersionInfo } from '../core/VersionChecker.js';

const logger = createLogger('ChatView');

import chatViewStyles from './chatView.css.js';

const {html, Decorators} = Lit;
const {customElement} = Decorators;

// A simplified version of the MarkdownRenderer with code block support
class MarkdownRenderer extends MarkdownView.MarkdownView.MarkdownInsightRenderer {
  override templateForToken(token: Marked.Marked.MarkedToken): Lit.TemplateResult|null {
    if (token.type === 'code') {
      const lines = (token.text).split('\n');
      if (lines[0]?.trim() === 'css') {
        token.lang = 'css';
        token.text = lines.slice(1).join('\n');
      }
    }

    return super.templateForToken(token);
  }
}

// Enhanced MarkdownRenderer for deep-research responses with table of contents
class DeepResearchMarkdownRenderer extends MarkdownView.MarkdownView.MarkdownInsightRenderer {
  private tocItems: Array<{level: number, text: string, id: string}> = [];
  
  override templateForToken(token: Marked.Marked.MarkedToken): Lit.TemplateResult|null {
    if (token.type === 'heading') {
      // Generate ID for heading
      const headingText = this.extractTextFromTokens((token.tokens || []) as Marked.Marked.MarkedToken[]);
      const id = this.generateHeadingId(headingText);
      
      // Add to TOC
      this.tocItems.push({
        level: (token as any).depth,
        text: headingText,
        id: id
      });
      
      // Create heading with ID
      const headingTag = `h${(token as any).depth}`;
      // Use renderToken to render the content
      const content = super.renderToken(token);
      return html`<div id="${id}" class="deep-research-heading-wrapper">${content}</div>`;
    }

    if (token.type === 'code') {
      const lines = (token.text).split('\n');
      if (lines[0]?.trim() === 'css') {
        token.lang = 'css';
        token.text = lines.slice(1).join('\n');
      }
    }

    return super.templateForToken(token);
  }
  
  private extractTextFromTokens(tokens: Marked.Marked.MarkedToken[]): string {
    return tokens.map(token => {
      if (token.type === 'text') {
        return token.text;
      }
      return token.raw || '';
    }).join('');
  }
  
  private generateHeadingId(text: string): string {
    return text.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }
  
  getTocItems(): Array<{level: number, text: string, id: string}> {
    return this.tocItems;
  }
  
  clearToc(): void {
    this.tocItems = [];
  }
}

// Function to render text as markdown
function renderMarkdown(text: string, markdownRenderer: MarkdownRenderer, onOpenTableInViewer?: (markdownContent: string) => void): Lit.TemplateResult {
  let tokens: Marked.Marked.MarkedToken[] = [];
  try {
    tokens = Marked.Marked.lexer(text) as Marked.Marked.MarkedToken[];
    for (const token of tokens) {
      // Try to render all the tokens to make sure that
      // they all have a template defined for them. If there
      // isn't any template defined for a token, we'll fallback
      // to rendering the text as plain text instead of markdown.
      markdownRenderer.renderToken(token);
    }
  } catch {
    // The tokens were not parsed correctly or
    // one of the tokens are not supported, so we
    // continue to render this as text.
    return html`${text}`;
  }

  return html`<devtools-markdown-view
    .data=${{tokens, renderer: markdownRenderer, onOpenTableInViewer} as MarkdownView.MarkdownView.MarkdownViewData}>
  </devtools-markdown-view>`;
}

// Types for the ChatView component

// Define possible entities for chat messages
export enum ChatMessageEntity {
  USER = 'user',
  MODEL = 'model',
  TOOL_RESULT = 'tool_result',
  AGENT_SESSION = 'agent_session',
}

// Base structure for all chat messages
export interface BaseChatMessage {
  entity: ChatMessageEntity;
  error?: string;
}

// Represents a message sent by the user
export interface UserChatMessage extends BaseChatMessage {
  entity: ChatMessageEntity.USER;
  text: string;
  imageInput?: ImageInputData;
}

// Represents a message generated by the AI model
// This now directly contains the agent's action details
export interface ModelChatMessage extends BaseChatMessage {
  entity: ChatMessageEntity.MODEL;
  // Type of action the model decided on
  action: 'tool' | 'final';
  // Tool details (only relevant if action is 'tool')
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  // Final answer (only relevant if action is 'final')
  answer?: string;
  // Indicates if this message concludes the agent's turn (set if action is 'final')
  isFinalAnswer: boolean;
  // Reasoning summary from the model
  reasoning?: string[] | null;
  // Tool call ID for linking with tool responses (OpenAI format)
  toolCallId?: string;
  // REMOVED steps?: Step[];
}

// Represents the result of a tool execution
export interface ToolResultMessage extends BaseChatMessage {
    entity: ChatMessageEntity.TOOL_RESULT;
    toolName: string;
    resultText: string;
    isError: boolean;
    // Add optional structured data field
    resultData?: any;
    // Tool call ID for linking to assistant tool call (OpenAI format)
    toolCallId?: string;
    // Mark if this is from a ConfigurableAgentTool
    isFromConfigurableAgent?: boolean;
    // Base64 image data URL for multimodal LLM responses
    imageData?: string;
    // Optional summary for agent tool completions
    summary?: string;
}

// Represents an agent session execution
export interface AgentSessionMessage extends BaseChatMessage {
    entity: ChatMessageEntity.AGENT_SESSION;
    agentSession: AgentSession;
    // Link to the user message that triggered this execution
    triggerMessageId?: string;
    // Summary for quick display
    summary?: string;
}

// Union type representing any possible chat message
export type ChatMessage =
    UserChatMessage|ModelChatMessage|ToolResultMessage|AgentSessionMessage;

// Defines the structure of an image input
export interface ImageInputData {
  url: string;
  bytesBase64: string;
}

// Structure for enhanced responses (e.g., markdown, code blocks)
// This might be less relevant now if answers are plain text
export interface EnhancedResponse {
  type: 'markdown' | 'code';
  content: string;
}

// REMOVED Step interface entirely

export enum State {
  IDLE = 'idle',
  LOADING = 'loading',
  ERROR = 'error',
}

export interface Props {
  messages: ChatMessage[];
  onSendMessage: (text: string, imageInput?: ImageInputData) => void;
  onPromptSelected: (promptType: string | null) => void;
  state: State;
  isTextInputEmpty: boolean;
  imageInput?: ImageInputData;
  onImageInputClear?: () => void;
  onImageInputChange?: (imageInput: ImageInputData) => void;
  // Add model selection properties
  modelOptions?: Array<{value: string, label: string}>;
  selectedModel?: string;
  onModelChanged?: (model: string) => void;
  onModelSelectorFocus?: () => void;
  selectedAgentType?: string | null;
  isModelSelectorDisabled?: boolean;
  // Add API key related properties
  isInputDisabled?: boolean;
  inputPlaceholder?: string;
  // Add OAuth login related properties
  showOAuthLogin?: boolean;
  onOAuthLogin?: () => void;
}

@customElement('devtools-chat-view')
export class ChatView extends HTMLElement {
  static readonly litTagName = Lit.StaticHtml.literal`devtools-chat-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);

  #messages: ChatMessage[] = [];
  #state: State = State.IDLE;
  #agentViewMode: 'simplified' | 'enhanced' = 'simplified';
  #isTextInputEmpty = true;
  #imageInput?: ImageInputData;
  #onSendMessage?: (text: string, imageInput?: ImageInputData) => void;
  #onImageInputClear?: () => void;
  #onPromptSelected?: (promptType: string | null) => void;
  #textInputElement?: HTMLTextAreaElement;
  #markdownRenderer = new MarkdownRenderer();
  #isFirstMessageView = true; // Track if we're in the centered first-message view
  #selectedPromptType?: string | null; // Track the currently selected prompt type
  #handlePromptButtonClickBound: (event: Event) => void = () => {}; // Initialize with empty function, will be properly set in connectedCallback
  // Add model selection properties
  #modelOptions?: Array<{value: string, label: string}>;
  #selectedModel?: string;
  #onModelChanged?: (model: string) => void;
  #onModelSelectorFocus?: () => void;
  #selectedAgentType?: string | null;
  #isModelSelectorDisabled = false;

  // Add scroll-related properties
  #messagesContainerElement?: HTMLElement;
  #messagesContainerResizeObserver = new ResizeObserver(() => this.#handleMessagesContainerResize());
  #pinScrollToBottom = true;

  // Add properties for input disabled state and placeholder
  #isInputDisabled = false;
  #inputPlaceholder = '';
  
  // Add OAuth login properties
  #showOAuthLogin = false;
  #onOAuthLogin?: () => void;
  
  // Add state tracking for AI Assistant operations
  #aiAssistantStates = new Map<string, 'pending' | 'opened' | 'failed'>();
  #lastProcessedMessageKey: string | null = null;

  // Add model selector state for searchable dropdown
  #isModelDropdownOpen = false;
  #modelSearchQuery = '';
  #highlightedOptionIndex = 0;
  #dropdownPosition: 'above' | 'below' = 'below';
  
  // Add version info state
  #versionInfo: VersionInfo | null = null;
  #isVersionBannerDismissed = false;

  connectedCallback(): void {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(chatViewStyles);
    this.#shadow.adoptedStyleSheets = [sheet];

    // Initialize the prompt button click handler
    this.#updatePromptButtonClickHandler();

    // Observe the messages container for size changes if it exists
    if (this.#messagesContainerElement) {
      this.#messagesContainerResizeObserver.observe(this.#messagesContainerElement);
    }
    
    // Check for updates when component is connected
    this.#checkForUpdates();

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  disconnectedCallback(): void {
    // Cleanup resize observer
    this.#messagesContainerResizeObserver.disconnect();
    
    // Clear state maps to prevent memory leaks
    this.#aiAssistantStates.clear();
  }


  /**
   * Set the agent view mode for simplified/enhanced toggle
   */
  setAgentViewMode(mode: 'simplified' | 'enhanced'): void {
    this.#agentViewMode = mode;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
    this.#lastProcessedMessageKey = null;
  }

  /**
   * Check if a message is part of an agent session
   */
  #isPartOfAgentSession(message: ChatMessage): boolean {
    // Check if there's an AgentSessionMessage in the current messages
    const hasAgentSession = this.#messages.some(msg => msg.entity === ChatMessageEntity.AGENT_SESSION);
    console.log('[DEBUG] hasAgentSession:', hasAgentSession);
    
    if (!hasAgentSession) {
      return false;
    }
    
    // For ModelChatMessage tool calls, check if they're from ConfigurableAgentTool
    if (message.entity === ChatMessageEntity.MODEL) {
      const modelMsg = message as ModelChatMessage;
      if (modelMsg.action === 'tool' && modelMsg.toolName) {
        console.log('[DEBUG] Checking tool:', modelMsg.toolName, 'callId:', modelMsg.toolCallId);
        // Check if there's a corresponding tool result that's from ConfigurableAgentTool
        const toolResultIndex = this.#messages.findIndex((msg) => 
          msg.entity === ChatMessageEntity.TOOL_RESULT && 
          (msg as ToolResultMessage).toolName === modelMsg.toolName &&
          (msg as ToolResultMessage).toolCallId === modelMsg.toolCallId
        );
        
        console.log('[DEBUG] Found tool result index:', toolResultIndex);
        if (toolResultIndex !== -1) {
          const toolResult = this.#messages[toolResultIndex] as ToolResultMessage;
          console.log('[DEBUG] Tool result isFromConfigurableAgent:', toolResult.isFromConfigurableAgent);
          return toolResult.isFromConfigurableAgent === true;
        }
      }
    }
    
    return false;
  }

  // Add method to scroll to bottom
  #scrollToBottom(): void {
    if (!this.#messagesContainerElement) {
      return;
    }

    this.#messagesContainerElement.scrollTop = this.#messagesContainerElement.scrollHeight;
  }

  // Add method to handle resizing of messages container
  #handleMessagesContainerResize(): void {
    if (!this.#pinScrollToBottom) {
      return;
    }

    if (!this.#messagesContainerElement) {
      return;
    }

    this.#scrollToBottom();
  }

  // Add method to handle scroll events
  #handleScroll = (event: Event): void => {
    if (!event.target || !(event.target instanceof HTMLElement)) {
      return;
    }

    const container = event.target as HTMLElement;
    const SCROLL_ROUNDING_OFFSET = 1; // Add small offset to handle rounding errors

    // Consider "scrolled to bottom" if within 1px of the bottom
    this.#pinScrollToBottom =
      container.scrollTop + container.clientHeight + SCROLL_ROUNDING_OFFSET >= container.scrollHeight;
  };

  // Add method to handle message container reference
  #handleMessagesContainerRef = (el: Element | undefined): void => {
    // Remove old observer if it exists
    if (this.#messagesContainerElement) {
      this.#messagesContainerResizeObserver.unobserve(this.#messagesContainerElement);
    }

    this.#messagesContainerElement = el as HTMLElement | undefined;

    if (el) {
      this.#messagesContainerResizeObserver.observe(el);
      // Initially scroll to bottom when container is first created
      this.#scrollToBottom();
    } else {
      this.#pinScrollToBottom = true;
    }
  };

  // Helper methods for AI Assistant state management
  #getMessageStateKey(structuredResponse: {reasoning: string, markdownReport: string}): string {
    // Create stable hash from content - Unicode safe
    const content = structuredResponse.reasoning + structuredResponse.markdownReport;
    
    // Unicode-safe hash function using TextEncoder
    const encoder = new TextEncoder();
    const bytes = encoder.encode(content);
    
    let hash = 0;
    for (let i = 0; i < bytes.length; i++) {
      hash = ((hash << 5) - hash) + bytes[i];
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to hex for consistent 8-character length
    const key = Math.abs(hash).toString(16).padStart(8, '0');
    
    return key;
  }

  #getMessageAIAssistantState(messageKey: string): 'pending' | 'opened' | 'failed' | 'not-attempted' {
    return this.#aiAssistantStates.get(messageKey) || 'not-attempted';
  }

  #setMessageAIAssistantState(messageKey: string, state: 'pending' | 'opened' | 'failed'): void {
    this.#aiAssistantStates.set(messageKey, state);
  }


  #isLastStructuredMessage(currentCombinedIndex: number): boolean {
    // We need to work with the combined messages logic to properly identify the last structured message
    // The currentCombinedIndex is from the combined array, but we need to check against the original array
    
    // Recreate the combined messages logic to understand the mapping
    let combinedIndex = 0;
    let lastStructuredCombinedIndex = -1;
    
    for (let originalIndex = 0; originalIndex < this.#messages.length; originalIndex++) {
      const message = this.#messages[originalIndex];
      
      // Keep User messages and Final Model answers
      if (message.entity === ChatMessageEntity.USER ||
          (message.entity === ChatMessageEntity.MODEL && message.action === 'final')) {
        
        // Check if this is a structured final answer
        if (message.entity === ChatMessageEntity.MODEL && message.action === 'final') {
          const structuredResponse = this.#parseStructuredResponse((message as any).answer || '');
          if (structuredResponse) {
            lastStructuredCombinedIndex = combinedIndex;
          }
        }
        
        combinedIndex++;
        continue;
      }

      // Handle Model Tool Call message
      if (message.entity === ChatMessageEntity.MODEL && message.action === 'tool') {
        const nextMessage = this.#messages[originalIndex + 1];
        
        // Check if the next message is the corresponding result
        if (nextMessage && nextMessage.entity === ChatMessageEntity.TOOL_RESULT && nextMessage.toolName === (message as any).toolName) {
          // Combined representation: tool call + result = 1 entry in combined array
          combinedIndex++;
        } else {
          // Tool call is still running (no result yet)
          combinedIndex++;
        }
        continue;
      }

      // Handle Tool Result message - skip if it was combined previously
      if (message.entity === ChatMessageEntity.TOOL_RESULT) {
        const prevMessage = this.#messages[originalIndex - 1];
        // Check if the previous message was the corresponding model call
        if (!(prevMessage && prevMessage.entity === ChatMessageEntity.MODEL && prevMessage.action === 'tool' && prevMessage.toolName === (message as any).toolName)) {
           // Orphaned tool result - add it directly
           combinedIndex++;
        }
        // Otherwise, it was handled by the MODEL case above, so we skip this result message
        continue;
      }

      // Fallback for any unexpected message types
      combinedIndex++;
    }
    
    return lastStructuredCombinedIndex === currentCombinedIndex;
  }


  // Update the prompt button click handler when props/state changes
  #updatePromptButtonClickHandler(): void {
    this.#handlePromptButtonClickBound = BaseOrchestratorAgent.createAgentTypeSelectionHandler(
      this,
      this.#textInputElement,
      this.#onPromptSelected,
      (type: string | null) => {
        this.#selectedPromptType = type;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
      },
      () => this.#selectedPromptType || null,
      (agentType: string) => this.#handlePromptEdit(agentType)
    );
  }

  // Handle prompt editing for agent types
  #handlePromptEdit(agentType: string): void {
    logger.info('Opening prompt editor for agent type:', agentType);
    this.#showPromptEditDialog(agentType);
  }

  // Show prompt edit dialog
  #showPromptEditDialog(agentType: string): void {
    const agentConfig = BaseOrchestratorAgent.AGENT_CONFIGS[agentType];
    if (!agentConfig) {
      logger.error('Agent config not found for type:', agentType);
      return;
    }

    PromptEditDialog.show({
      agentType,
      agentLabel: agentConfig.label,
      currentPrompt: BaseOrchestratorAgent.getAgentPrompt(agentType),
      defaultPrompt: BaseOrchestratorAgent.getDefaultPrompt(agentType),
      hasCustomPrompt: BaseOrchestratorAgent.hasCustomPrompt(agentType),
      onSave: (prompt: string) => {
        try {
          BaseOrchestratorAgent.setCustomPrompt(agentType, prompt);
          // Force re-render to update UI
          void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
        } catch (error) {
          logger.error('Failed to save custom prompt:', error);
          // TODO: Show user notification
        }
      },
      onRestore: () => {
        try {
          BaseOrchestratorAgent.removeCustomPrompt(agentType);
          // Force re-render to update UI
          void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
        } catch (error) {
          logger.error('Failed to restore default prompt:', error);
          // TODO: Show user notification
        }
      },
      onError: (error: Error) => {
        logger.error('Prompt edit error:', error);
        // TODO: Show user notification
      }
    });
  }

  // Public getter to expose the centered view state
  get isCenteredView(): boolean {
    return this.#isFirstMessageView;
  }

  set data(data: Props) {
    const previousMessageCount = this.#messages?.length || 0;
    const willHaveMoreMessages = data.messages?.length > previousMessageCount;
    const wasInputDisabled = this.#isInputDisabled;

    // Handle AI Assistant state cleanup for last-message-only approach
    if (willHaveMoreMessages && this.#messages) {
      // When new messages are added, reset states for previous final messages
      // so that only the last message can attempt to open AI Assistant
      const previousLastFinalIndex = this.#messages.findLastIndex(msg => 
        msg.entity === ChatMessageEntity.MODEL && 
        (msg as ModelChatMessage).action === 'final'
      );
      
      if (previousLastFinalIndex >= 0) {
        const previousLastMessage = this.#messages[previousLastFinalIndex] as ModelChatMessage;
        if (previousLastMessage.answer) {
          const structuredResponse = this.#parseStructuredResponse(previousLastMessage.answer);
          if (structuredResponse) {
            const messageKey = this.#getMessageStateKey(structuredResponse);
            const currentState = this.#getMessageAIAssistantState(messageKey);
            
            // If the previous last message was pending, mark it as failed
            // But keep 'opened' state to preserve successfully opened reports
            if (currentState === 'pending') {
              this.#setMessageAIAssistantState(messageKey, 'failed');
            }
            // If it was 'opened', keep it that way to show button only
          }
        }
      }
    }

    this.#messages = data.messages;
    this.#state = data.state;
    this.#isTextInputEmpty = data.isTextInputEmpty;
    this.#imageInput = data.imageInput;
    this.#onSendMessage = data.onSendMessage;
    this.#onImageInputClear = data.onImageInputClear;
    this.#onPromptSelected = data.onPromptSelected;
    // Add model selection properties
    this.#modelOptions = data.modelOptions;
    this.#selectedModel = data.selectedModel;
    this.#onModelChanged = data.onModelChanged;
    this.#onModelSelectorFocus = data.onModelSelectorFocus;
    this.#selectedAgentType = data.selectedAgentType;
    this.#isModelSelectorDisabled = data.isModelSelectorDisabled || false;

    // Store input disabled state and placeholder
    this.#isInputDisabled = data.isInputDisabled || false;
    this.#inputPlaceholder = data.inputPlaceholder || 'Ask AI Assistant...';
    
    // Store OAuth login state
    this.#showOAuthLogin = data.showOAuthLogin || false;
    this.#onOAuthLogin = data.onOAuthLogin;

    
    // Log the input state changes
    if (wasInputDisabled !== this.#isInputDisabled) {
      logger.info(`Input disabled state changed: ${wasInputDisabled} -> ${this.#isInputDisabled}`);
      
      // If we have a text input element, update its disabled state directly
      if (this.#textInputElement) {
        this.#textInputElement.disabled = this.#isInputDisabled;
        logger.info(`Directly updated textarea disabled state to: ${this.#isInputDisabled}`);
      }
    }

    // Update the selectedPromptType from the passed selectedAgentType if it exists
    if (data.selectedAgentType !== undefined) {
      this.#selectedPromptType = data.selectedAgentType;
    }

    // Check if we should exit the first message view state
    // We're no longer in first message view if there are user messages
    const hasUserMessages = data.messages && Array.isArray(data.messages) ? 
      data.messages.some(msg => msg && msg.entity === ChatMessageEntity.USER) : false;
    this.#isFirstMessageView = !hasUserMessages;

    // Update the prompt button handler with new props
    this.#updatePromptButtonClickHandler();

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);

    // After rendering, scroll to bottom if we have new messages and auto-scroll is enabled
    if (this.#pinScrollToBottom && willHaveMoreMessages) {
      // Give the DOM time to update before scrolling
      setTimeout(() => this.#scrollToBottom(), 0);
    }
  }


  #handleSendMessage(): void {
    // Check if textInputElement, onSendMessage callback, or input is disabled
    if (!this.#textInputElement || !this.#onSendMessage || this.#isInputDisabled) {
      return;
    }

    const text = this.#textInputElement.value.trim();
    if (!text) {
      return;
    }

    // Exit the first message view mode when sending a message
    this.#isFirstMessageView = false;

    // Always scroll to bottom after sending message
    this.#pinScrollToBottom = true;

    this.#onSendMessage(text, this.#imageInput);
    this.#textInputElement.value = '';
    this.#textInputElement.style.height = 'auto';
    this.#isTextInputEmpty = true;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.#handleSendMessage();
    }
  }

  #handleTextInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto'; // Reset height to shrink if needed
    textarea.style.height = `${textarea.scrollHeight}px`;
    
    const newIsEmpty = textarea.value.trim().length === 0;
    
    // Only trigger re-render if empty state actually changed
    if (this.#isTextInputEmpty !== newIsEmpty) {
      this.#isTextInputEmpty = newIsEmpty;
      void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
    } else {
      this.#isTextInputEmpty = newIsEmpty;
    }
  }

  // Render messages based on the combined structure
  #renderMessage(message: ChatMessage | (ModelChatMessage & { resultText?: string, isError?: boolean, resultError?: string, combined?: boolean }) | (ToolResultMessage & { orphaned?: boolean }), combinedIndex?: number ): Lit.TemplateResult {
    try {
      switch (message.entity) {
        case ChatMessageEntity.USER:
          // Render User Message
          return html`
            <div class="message user-message" >
              <div class="message-content">
                <div class="message-text">${renderMarkdown(message.text || '', this.#markdownRenderer, this.#openInAIAssistantViewer.bind(this))}</div>
                ${message.error ? html`<div class="message-error">${message.error}</div>` : Lit.nothing}
              </div>
            </div>
          `;
        case ChatMessageEntity.AGENT_SESSION:
          // Render agent session using existing logic
          {
            const agentSessionMessage = message as AgentSessionMessage;
            console.log('[AGENT SESSION RENDER] Rendering AgentSessionMessage:', agentSessionMessage);
            return this.#renderTaskCompletion(agentSessionMessage.agentSession);
          }
        case ChatMessageEntity.TOOL_RESULT:
          // Should only render if orphaned
          {
             const toolResultMessage = message as (ToolResultMessage & { orphaned?: boolean });
             
             // If this is from a ConfigurableAgentTool, don't render individual cards
             // Let the agent session UI handle it
             if (toolResultMessage.isFromConfigurableAgent) {
               console.log('[UI FILTER] Hiding ConfigurableAgentTool result:', toolResultMessage.toolName);
               return html``;
             }
             
             if (toolResultMessage.orphaned) {
                 return html`
                   <div class="message tool-result-message orphaned ${toolResultMessage.isError ? 'error' : ''}" >
                     <div class="message-content">
                       <div class="tool-status completed">
                           <div class="tool-name-display">
                             Orphaned Result from: ${toolResultMessage.toolName} ${toolResultMessage.isError ? '(Error)' : ''}
                           </div>
                           <pre class="tool-result-raw">${toolResultMessage.resultText}</pre>
                           ${toolResultMessage.error ? html`<div class="message-error">${toolResultMessage.error}</div>` : Lit.nothing}
                       </div>
                     </div>
                   </div>
                 `;
             }
             // If not orphaned, it should have been combined, so render nothing.
             return html``;
          }
        case ChatMessageEntity.MODEL:
          {
            // Cast to the potentially combined type
            const modelMessage = message as (ModelChatMessage & { resultText?: string, isError?: boolean, resultError?: string, combined?: boolean });

            // Hide tool calls that are part of agent sessions
            if (modelMessage.action === 'tool') {
              const isPartOfSession = this.#isPartOfAgentSession(modelMessage);
              console.log('[UI DEBUG] Tool call:', modelMessage.toolName, 'isPartOfAgentSession:', isPartOfSession);
              if (isPartOfSession) {
                console.log('[UI FILTER] Hiding ModelChatMessage tool call from agent session:', modelMessage.toolName);
                return html``;
              }
            }

            // Check if it's a combined message (tool call + result) or just a running tool call / final answer
            const isCombined = modelMessage.combined === true;
            const isRunningTool = modelMessage.action === 'tool' && !isCombined;
            const isFinal = modelMessage.action === 'final';

            // --- Render Final Answer ---
            if (isFinal) {
              // Check if this is a structured response with REASONING and MARKDOWN_REPORT sections
              const structuredResponse = this.#parseStructuredResponse(modelMessage.answer || '');
              
              if (structuredResponse) {
                return this.#renderStructuredResponse(structuredResponse, combinedIndex);
              } else {
                // Regular response - use the old logic
                
                return html`
                  <div class="message model-message final">
                    <div class="message-content">
                      ${modelMessage.answer ?
                        html`
                          <div class="message-text">${renderMarkdown(modelMessage.answer, this.#markdownRenderer, this.#openInAIAssistantViewer.bind(this))}</div>
                          ${Lit.nothing}
                        ` :
                        Lit.nothing
                      }
                    ${modelMessage.reasoning?.length ? html`
                      <div class="reasoning-block">
                        <details class="reasoning-details">
                          <summary class="reasoning-summary">
                            <span class="reasoning-icon">💡</span>
                            <span>Model Reasoning</span>
                          </summary>
                          <div class="reasoning-content">
                            ${modelMessage.reasoning.map(item => html`
                              <div class="reasoning-item">${renderMarkdown(item, this.#markdownRenderer, this.#openInAIAssistantViewer.bind(this))}</div>
                            `)}
                          </div>
                        </details>
                      </div>
                    ` : Lit.nothing}
                    ${modelMessage.error ? html`<div class="message-error">${modelMessage.error}</div>` : Lit.nothing}
                  </div>
                </div>
              `;
              }
            }

            // --- Render Tool Call with Timeline Design ---
            const toolReasoning = modelMessage.toolArgs?.reasoning as string | undefined;
            const resultText = modelMessage.resultText; // Available if combined
            const isResultError = modelMessage.isError ?? false; // Available if combined, default false
            const toolArgs = modelMessage.toolArgs || {};
            const filteredArgs = Object.fromEntries(Object.entries(toolArgs).filter(([key]) => 
              key !== 'reasoning' && key !== 'query' && key !== 'url' && key !== 'objective'
            ));

            // Determine status
            let status = 'running';
            if (isCombined) {
              status = isResultError ? 'error' : 'completed';
            }

            const toolName = modelMessage.toolName || 'unknown_tool';
            const icon = this.#getToolIcon(toolName);
            const descriptionData = this.#getToolDescription(toolName, toolArgs);

            return html`
              <!-- Reasoning (if any) displayed above the timeline -->
              ${toolReasoning ? html`
                <div class="message-text reasoning-text" style="margin-bottom: 8px;">
                  ${renderMarkdown(toolReasoning, this.#markdownRenderer, this.#openInAIAssistantViewer.bind(this))}
                </div>
              ` : Lit.nothing}

              <!-- Timeline Tool Execution -->
              <div class="agent-execution-timeline single-tool">
                <!-- Tool Header -->
                <div class="agent-header">
                  <div class="agent-marker"></div>
                  <div class="agent-title">${descriptionData.action}</div>
                  <div class="agent-divider"></div>
                    <button class="tool-toggle" @click=${(e: Event) => this.#toggleToolResult(e)}>
                      <span class="toggle-icon">▼</span>
                    </button>
                </div>
                
                <div class="timeline-items" style="display: none;">
                  <div class="timeline-item">
                    <div class="tool-line">
                      ${descriptionData.isMultiLine ? html`
                        <div class="tool-summary">
                          <span class="tool-description">
                            <span class="tool-description-indicator">└─</span>
                            <div>${(descriptionData.content as Array<{key: string, value: string}>)[0]?.value || 'multiple parameters'}</div>
                          </span>
                          <span class="tool-status-marker ${status}" title="${status === 'running' ? 'Running' : status === 'completed' ? 'Completed' : status === 'error' ? 'Error' : 'Unknown'}">●</span>
                        </div>
                      ` : html`
                        <span class="tool-description">
                          <span class="tool-description-indicator">└─</span>
                          <div>${descriptionData.content}</div>
                        </span>
                        <span class="tool-status-marker ${status}" title="${status === 'running' ? 'Running' : status === 'completed' ? 'Completed' : status === 'error' ? 'Error' : 'Unknown'}">●</span>
                      `}
                    </div>
                    
                    <!-- Result Block - Integrated within timeline item -->
                    ${isCombined && resultText ? html`
                      <div class="tool-result-integrated ${status}">
                        Response:
                        ${this.#formatJsonWithSyntaxHighlighting(resultText)}
                      </div>
                    ` : Lit.nothing}
                  </div>
                </div>
                
                <!-- Loading spinner for running tools -->
                ${status === 'running' ? html`
                  <div class="tool-loading">
                    <svg class="loading-spinner" width="16" height="16" viewBox="0 0 16 16">
                      <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="30 12" stroke-linecap="round">
                        <animateTransform 
                          attributeName="transform" 
                          attributeType="XML" 
                          type="rotate" 
                          from="0 8 8" 
                          to="360 8 8" 
                          dur="1s" 
                          repeatCount="indefinite" />
                      </circle>
                    </svg>
                  </div>
                ` : Lit.nothing}

                <!-- Error messages -->
                ${modelMessage.error ? html`<div class="message-error tool-error-message">Model Error: ${modelMessage.error}</div>` : Lit.nothing}
              </div>
            `;
          }
        default:
          // Should not happen, but render a fallback
          return html`<div class="message unknown">Unknown message type</div>`;
      }
    } catch (error) {
      logger.error('Error rendering message:', error);
      return html`
        <div class="message model-message error" >
          <div class="message-content">
            <div class="message-error">Failed to render message: ${error instanceof Error ? error.message : String(error)}</div>
          </div>
        </div>
      `;
    }
  }

  #render(): void {
    // clang-format off
    // Check if the last message is a MODEL message indicating a tool is running
    const lastMessage = this.#messages[this.#messages.length - 1];
    const isModelRunningTool = lastMessage?.entity === ChatMessageEntity.MODEL && !lastMessage.isFinalAnswer && lastMessage.toolName;

    // All messages are rendered directly now, including AgentSessionMessage
    let messagesToRender = this.#messages;

    // Combine the tool calling and tool result messages into a single logical unit for rendering
    const combinedMessages = messagesToRender.reduce((acc, message, index, allMessages) => {
      // Keep User messages and Final Model answers
      if (message.entity === ChatMessageEntity.USER ||
          (message.entity === ChatMessageEntity.MODEL && message.action === 'final')) {
        acc.push(message);
        return acc;
      }

      // Handle Model Tool Call message
      if (message.entity === ChatMessageEntity.MODEL && message.action === 'tool') {
        const modelMessage = message as ModelChatMessage;
        const nextMessage = allMessages[index + 1];

        // Check if the next message is the corresponding result
        if (nextMessage && nextMessage.entity === ChatMessageEntity.TOOL_RESULT && nextMessage.toolName === modelMessage.toolName) {
          // Create a combined representation: add result to model message
          // IMPORTANT: Create a new object, don't mutate the original state
          const combinedRepresentation = {
            ...modelMessage, // Copy model call details
            // Add result details directly to this combined object
            resultText: (nextMessage as ToolResultMessage).resultText,
            isError: (nextMessage as ToolResultMessage).isError,
            resultError: (nextMessage as ToolResultMessage).error, // Keep original model error separate if needed
            combined: true, // Add a flag to identify this combined message
          };
          acc.push(combinedRepresentation);
        } else {
          // Tool call is still running (no result yet) or result is missing
          // Add the model message as is (it will render the "running" state)
          acc.push(modelMessage);
        }
        return acc;
      }

      // Handle Tool Result message - skip if it was combined previously
      if (message.entity === ChatMessageEntity.TOOL_RESULT) {
        const prevMessage = allMessages[index - 1];
        // Check if the previous message was the corresponding model call
        if (!(prevMessage && prevMessage.entity === ChatMessageEntity.MODEL && prevMessage.action === 'tool' && prevMessage.toolName === message.toolName)) {
           // Orphaned tool result - add it directly
           logger.warn('Orphaned tool result found:', message);
           acc.push({...message, orphaned: true }); // Add marker for rendering
        }
        // Otherwise, it was handled by the MODEL case above, so we skip this result message
        return acc;
      }

      // Fallback for any unexpected message types (shouldn't happen)
      acc.push(message);
      return acc;

    // Define the type for the accumulator array more accurately
    // Allow ToolResultMessage to potentially have an 'orphaned' flag
    }, [] as Array<ChatMessage | (ModelChatMessage & { resultText?: string, isError?: boolean, resultError?: string, combined?: boolean }) | (ToolResultMessage & { orphaned?: boolean }) >);


    // General loading state (before any model response or after tool result)
    const showGeneralLoading = this.#state === State.LOADING && !isModelRunningTool;

    // Find the last model message with an answer to use for the copy action
    let lastModelAnswer: string | null = null;
    // Loop backwards through messages to find the most recent model answer
    for (let i = this.#messages.length - 1; i >= 0; i--) {
      const msg = this.#messages[i];
      if (msg.entity === ChatMessageEntity.MODEL) {
        const modelMsg = msg as ModelChatMessage;
        if (modelMsg.action === 'final' && modelMsg.answer) {
          lastModelAnswer = modelMsg.answer;
          break;
        }
      }
    }

    // Determine whether to show actions row (not in first message view, not loading, has a model answer)
    const showActionsRow = !this.#isFirstMessageView &&
                          this.#state !== State.LOADING &&
                          lastModelAnswer !== null;

    // Determine which view to render based on the first message state
    if (this.#isFirstMessageView) {
      // Render centered first message view
      const welcomeMessage = this.#messages.length > 0 ? this.#messages[0] : null;

      Lit.render(html`
        <div class="chat-view-container centered-view">
          ${this.#renderVersionBanner()}
          <div class="centered-content">
            ${welcomeMessage ? this.#renderMessage(welcomeMessage, 0) : Lit.nothing}
            
            ${this.#showOAuthLogin ? html`
              <!-- OAuth Login Section -->
              <div class="oauth-login-container">
                <div class="oauth-welcome">
                  <h2>Welcome to Browser Operator</h2>
                  <p>Get started by connecting an AI provider for access to multiple models</p>
                </div>
                
                <div class="oauth-login-section">
                  <div class="provider-options">
                    <button 
                      class="oauth-login-button openrouter" 
                      @click=${this.#handleOAuthLogin.bind(this)}
                      title="Sign in with OpenRouter OAuth"
                    >
                      <div class="oauth-button-content">
                        <svg class="oauth-icon" width="24" height="24" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fill="currentColor" stroke="currentColor" aria-label="OpenRouter Logo">
                          <g clip-path="url(#clip0_205_3)">
                            <path d="M3 248.945C18 248.945 76 236 106 219C136 202 136 202 198 158C276.497 102.293 332 120.945 423 120.945" stroke-width="90"></path>
                            <path d="M511 121.5L357.25 210.268L357.25 32.7324L511 121.5Z"></path>
                            <path d="M0 249C15 249 73 261.945 103 278.945C133 295.945 133 295.945 195 339.945C273.497 395.652 329 377 420 377" stroke-width="90"></path>
                            <path d="M508 376.445L354.25 287.678L354.25 465.213L508 376.445Z"></path>
                          </g>
                          <defs>
                            <clipPath id="clip0_205_3">
                              <rect width="512" height="512" fill="white"></rect>
                            </clipPath>
                          </defs>
                        </svg>
                        <span>Connect via OpenRouter</span>
                      </div>
                    </button>
                    
                    <button 
                      class="oauth-login-button openai" 
                      @click=${this.#handleOpenAISetup.bind(this)}
                      title="Connect with OpenAI API key"
                    >
                      <div class="oauth-button-content">
                        <svg class="oauth-icon" width="28" height="28" viewBox="0 0 156 154" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M59.7325 56.1915V41.6219C59.7325 40.3948 60.1929 39.4741 61.266 38.8613L90.5592 21.9915C94.5469 19.6912 99.3013 18.6181 104.208 18.6181C122.612 18.6181 134.268 32.8813 134.268 48.0637C134.268 49.1369 134.268 50.364 134.114 51.5911L103.748 33.8005C101.908 32.7274 100.067 32.7274 98.2267 33.8005L59.7325 56.1915ZM128.133 112.937V78.1222C128.133 75.9745 127.212 74.441 125.372 73.3678L86.878 50.9768L99.4538 43.7682C100.527 43.1554 101.448 43.1554 102.521 43.7682L131.814 60.6381C140.25 65.5464 145.923 75.9745 145.923 86.0961C145.923 97.7512 139.023 108.487 128.133 112.935V112.937ZM50.6841 82.2638L38.1083 74.9028C37.0351 74.29 36.5748 73.3693 36.5748 72.1422V38.4025C36.5748 21.9929 49.1506 9.5696 66.1744 9.5696C72.6162 9.5696 78.5962 11.7174 83.6585 15.5511L53.4461 33.0352C51.6062 34.1084 50.6855 35.6419 50.6855 37.7897V82.2653L50.6841 82.2638ZM77.7533 97.9066L59.7325 87.785V66.3146L77.7533 56.193L95.7725 66.3146V87.785L77.7533 97.9066ZM89.3321 144.53C82.8903 144.53 76.9103 142.382 71.848 138.549L102.06 121.064C103.9 119.991 104.821 118.458 104.821 116.31V71.8343L117.551 79.1954C118.624 79.8082 119.084 80.7289 119.084 81.956V115.696C119.084 132.105 106.354 144.529 89.3321 144.529V144.53ZM52.9843 110.33L23.6911 93.4601C15.2554 88.5517 9.58181 78.1237 9.58181 68.0021C9.58181 56.193 16.6365 45.611 27.5248 41.163V76.1299C27.5248 78.2776 28.4455 79.8111 30.2854 80.8843L68.6271 103.121L56.0513 110.33C54.9781 110.943 54.0574 110.943 52.9843 110.33ZM51.2983 135.482C33.9681 135.482 21.2384 122.445 21.2384 106.342C21.2384 105.115 21.3923 103.888 21.5448 102.661L51.7572 120.145C53.5971 121.218 55.4385 121.218 57.2784 120.145L95.7725 97.9081V112.478C95.7725 113.705 95.3122 114.625 94.239 115.238L64.9458 132.108C60.9582 134.408 56.2037 135.482 51.2969 135.482H51.2983ZM89.3321 153.731C107.889 153.731 123.378 140.542 126.907 123.058C144.083 118.61 155.126 102.507 155.126 86.0976C155.126 75.3617 150.525 64.9336 142.243 57.4186C143.01 54.1977 143.471 50.9768 143.471 47.7573C143.471 25.8267 125.68 9.41567 105.129 9.41567C100.989 9.41567 97.0011 10.0285 93.0134 11.4095C86.1112 4.66126 76.6024 0.367188 66.1744 0.367188C47.6171 0.367188 32.1282 13.5558 28.5994 31.0399C11.4232 35.4879 0.380859 51.5911 0.380859 68.0006C0.380859 78.7365 4.98133 89.1645 13.2631 96.6795C12.4963 99.9004 12.036 103.121 12.036 106.341C12.036 128.271 29.8265 144.682 50.3777 144.682C54.5178 144.682 58.5055 144.07 62.4931 142.689C69.3938 149.437 78.9026 153.731 89.3321 153.731Z" fill="currentColor"></path>
                        </svg>
                        <span>Connect via OpenAI</span>
                      </div>
                    </button>
                  </div>
                  
                  <div class="oauth-alternative">
                    <p>Or <a href="#" @click=${this.#handleManualSetup.bind(this)} class="manual-setup-link">configure API keys manually</a></p>
                  </div>
                </div>
              </div>
            ` : html`
              <!-- Regular Input Section -->
              <div class="input-container centered" >
                ${this.#imageInput ? html`
                  <div class="image-preview">
                    <img src=${this.#imageInput.url} alt="Image input" /> 
                    <button class="image-remove-button" @click=${() => this.#onImageInputClear && this.#onImageInputClear()}> 
                      <span class="icon">×</span>
                    </button>
                  </div>
                ` : Lit.nothing}
                <div class="input-row">
                  <textarea
                    class="text-input"
                    placeholder=${this.#inputPlaceholder}
                    rows="1"
                    @keydown=${this.#handleKeyDown.bind(this)}
                    @input=${this.#handleTextInput.bind(this)}
                    ?disabled=${this.#isInputDisabled}
                    ${Lit.Directives.ref((el: Element | undefined) => {
                      this.#textInputElement = el as HTMLTextAreaElement;
                    })}
                  ></textarea>
                </div>
                <!-- Prompt Buttons Row -->
                <div class="prompt-buttons-row">
                  ${BaseOrchestratorAgent.renderAgentTypeButtons(this.#selectedPromptType, this.#handlePromptButtonClickBound, true)}

                  <div class="actions-container">
                    ${this.#renderModelSelector()}
                    <button
                      class="send-button ${this.#isTextInputEmpty || this.#isInputDisabled ? 'disabled' : ''}"
                      ?disabled=${this.#isTextInputEmpty || this.#isInputDisabled}
                      @click=${this.#handleSendMessage.bind(this)}
                      title="Send message"
                      aria-label="Send message"
                    >
                    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                      <path
                        fill="none" 
                        stroke="currentColor" 
                        stroke-width="2" 
                        stroke-linecap="round" 
                        stroke-linejoin="round" 
                        d="M29.4,15.1
                          l-8.9-3.5
                          l-3.5-8.9
                          C16.8,2.3,16.4,2,16,2
                          s-0.8,0.3-0.9,0.6
                          l-3.5,8.9
                          l-8.9,3.5
                          C2.3,15.2,2,15.6,2,16
                          s0.3,0.8,0.6,0.9
                          l8.9,3.5
                          l3.5,8.9
                          c0.2,0.4,0.5,0.6,0.9,0.6
                          s0.8-0.3,0.9-0.6
                          l3.5-8.9
                          l8.9-3.5
                          c0.4-0.2,0.6-0.5,0.6-0.9
                          S29.7,15.2,29.4,15.1
                        z" />
                    </svg>
                    </button>
                  </div>
                </div>
              </div>
            `}
          </div>
        </div>
      `, this.#shadow, {host: this});
    } else {
      // Render normal expanded view for conversation
      Lit.render(html`
        <div class="chat-view-container expanded-view">
          ${this.#renderVersionBanner()}
          <div class="messages-container" 
            @scroll=${this.#handleScroll} 
            ${Lit.Directives.ref(this.#handleMessagesContainerRef)}>
            ${combinedMessages?.map((message, combinedIndex) => this.#renderMessage(message, combinedIndex)) || Lit.nothing}

            ${showGeneralLoading ? html`
              <div class="message model-message loading" >
                <div class="message-content">
                  <div class="message-loading">
                    <svg class="loading-spinner" width="16" height="16" viewBox="0 0 16 16">
                      <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="30 12" stroke-linecap="round">
                        <animateTransform 
                          attributeName="transform" 
                          attributeType="XML" 
                          type="rotate" 
                          from="0 8 8" 
                          to="360 8 8" 
                          dur="1s" 
                          repeatCount="indefinite" />
                      </circle>
                    </svg>
                  </div>
                </div>
              </div>
            ` : Lit.nothing}
            
            <!-- Global actions row - only shown when chat is complete -->
            ${showActionsRow ? html`
              <div class="global-actions-container">
                <div class="message-actions-row">
                  <button class="message-action-button" @click=${() => this.#copyToClipboard(lastModelAnswer || '')} title="Copy to clipboard">
                    <svg class="action-icon" viewBox="0 0 24 24" width="16" height="16">
                      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"></path>
                    </svg>
                    <span class="action-tooltip">Copy</span>
                  </button>
                  <button class="message-action-button thumbs-up" title="Helpful">
                    <svg class="action-icon" viewBox="0 0 24 24" width="16" height="16">
                      <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" fill="currentColor"></path>
                    </svg>
                    <span class="action-tooltip">Helpful</span>
                  </button>
                  <button class="message-action-button thumbs-down" title="Not helpful">
                    <svg class="action-icon" viewBox="0 0 24 24" width="16" height="16">
                      <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" fill="currentColor"></path>
                    </svg>
                    <span class="action-tooltip">Not helpful</span>
                  </button>
                  <button class="message-action-button retry" title="Regenerate response">
                    <svg class="action-icon" viewBox="0 0 24 24" width="16" height="16">
                      <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"></path>
                    </svg>
                    <span class="action-tooltip">Retry</span>
                  </button>
                </div>
              </div>
            ` : Lit.nothing}
          </div>
          <div class="input-container" >
            ${this.#imageInput ? html`
              <div class="image-preview">
                <img src=${this.#imageInput.url} alt="Image input" /> 
                <button class="image-remove-button" @click=${() => this.#onImageInputClear && this.#onImageInputClear()}> 
                  <span class="icon">×</span>
                </button>
              </div>
            ` : Lit.nothing}
            <div class="input-row">
              <textarea
                class="text-input"
                placeholder=${this.#inputPlaceholder}
                rows="1"
                @keydown=${this.#handleKeyDown.bind(this)}
                @input=${this.#handleTextInput.bind(this)}
                ?disabled=${this.#isInputDisabled}
                ${Lit.Directives.ref((el: Element | undefined) => {
                  this.#textInputElement = el as HTMLTextAreaElement;
                })}
              ></textarea>
            </div>
              <!-- Prompt Buttons Row -->
              <div class="prompt-buttons-row">
                ${BaseOrchestratorAgent.renderAgentTypeButtons(this.#selectedPromptType, this.#handlePromptButtonClickBound)}
                <div class="actions-container">
                  ${this.#renderModelSelector()}
                  <button
                    class="send-button ${this.#isTextInputEmpty || this.#isInputDisabled ? 'disabled' : ''}"
                    ?disabled=${this.#isTextInputEmpty || this.#isInputDisabled}
                    @click=${this.#handleSendMessage.bind(this)}
                    title="Send message"
                    aria-label="Send message"
                  >
                    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                        <path
                          fill="none" 
                          stroke="currentColor" 
                          stroke-width="2" 
                          stroke-linecap="round" 
                          stroke-linejoin="round" 
                          d="M29.4,15.1
                            l-8.9-3.5
                            l-3.5-8.9
                            C16.8,2.3,16.4,2,16,2
                            s-0.8,0.3-0.9,0.6
                            l-3.5,8.9
                            l-8.9,3.5
                            C2.3,15.2,2,15.6,2,16
                            s0.3,0.8,0.6,0.9
                            l8.9,3.5
                            l3.5,8.9
                            c0.2,0.4,0.5,0.6,0.9,0.6
                            s0.8-0.3,0.9-0.6
                            l3.5-8.9
                            l8.9-3.5
                            c0.4-0.2,0.6-0.5,0.6-0.9
                            S29.7,15.2,29.4,15.1
                          z" />
                      </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `, this.#shadow, {host: this});
    }
    // clang-format on
  }

  // Helper method to format JSON with syntax highlighting
  #formatJsonWithSyntaxHighlighting(jsonString: string): Lit.TemplateResult {
    try {
      if (jsonString.trim().startsWith('{') || jsonString.trim().startsWith('[')) {
        // If it looks like JSON, parse and format it
        const parsed = JSON.parse(jsonString);
        if (parsed != null && parsed.error) {
          // If the parsed JSON has an error field, treat it as an error
          return html`
            <pre class="json-error">
              <span class="error-message">${parsed.error}</span>
            </pre>`;
        }

        // Use the YAML formatter for better readability
        const yamlFormatted = this.#formatValueForDisplay(parsed);
        return html`
          <pre class="json-result">
            ${yamlFormatted}
          </pre>`;
      }

      // If not JSON or parsing fails, return as is
      return html`${jsonString}`;
    } catch (e) {
      // If JSON parsing fails, return original text
      return html`${jsonString}`;
    }
  }

  // Add helper to render model selector
  #renderModelSelector() {
    if (!this.#modelOptions || !this.#modelOptions.length || !this.#selectedModel || !this.#onModelChanged) {
      return '';
    }

    // Check if we need searchable dropdown (20+ options)
    const needsSearch = this.#modelOptions.length > 20;
    
    if (needsSearch) {
      return this.#renderSearchableModelSelector();
    } else {
      return this.#renderSimpleModelSelector();
    }
  }

  #renderSimpleModelSelector() {
    return html`
      <div class="model-selector">
        <select 
          class="model-select"
          .value=${this.#selectedModel}
          ?disabled=${this.#isModelSelectorDisabled} 
          @change=${this.#handleModelChange.bind(this)}
          @focus=${this.#handleModelSelectorFocus.bind(this)}
        >
          ${this.#modelOptions?.map(option => html`
            <option value=${option.value} ?selected=${option.value === this.#selectedModel}>${option.label}</option>
          `)}
        </select>
      </div>
    `;
  }

  #renderSearchableModelSelector() {
    return html`
      <div class="model-selector searchable">
        <button 
          class="model-select-trigger"
          @click=${this.#toggleModelDropdown.bind(this)}
          ?disabled=${this.#isModelSelectorDisabled}
        >
          <span class="selected-model">${this.#getSelectedModelLabel()}</span>
          <span class="dropdown-arrow">${this.#isModelDropdownOpen ? '▲' : '▼'}</span>
        </button>
        
        ${this.#isModelDropdownOpen ? html`
          <div class="model-dropdown ${this.#dropdownPosition}" @click=${(e: Event) => e.stopPropagation()}>
            <input 
              class="model-search"
              type="text"
              placeholder="Search models..."
              @input=${this.#handleModelSearch.bind(this)}
              @keydown=${this.#handleModelSearchKeydown.bind(this)}
              .value=${this.#modelSearchQuery}
              ${Lit.Directives.ref((el: Element | undefined) => {
                if (el) (el as HTMLInputElement).focus();
              })}
            />
            <div class="model-options">
              ${this.#getFilteredModelOptions().map((option, index) => html`
                <div 
                  class="model-option ${option.value === this.#selectedModel ? 'selected' : ''} ${index === this.#highlightedOptionIndex ? 'highlighted' : ''}"
                  @click=${() => this.#selectModel(option.value)}
                  @mouseenter=${() => this.#highlightedOptionIndex = index}
                >
                  ${option.label}
                </div>
              `)}
              ${this.#getFilteredModelOptions().length === 0 ? html`
                <div class="model-option no-results">No matching models found</div>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  #handleModelChange(event: Event): void {
    if (this.#isModelSelectorDisabled) {
      return;
    }
    const selectElement = event.target as HTMLSelectElement;
    const selectedValue = selectElement.value;
    if (this.#onModelChanged) {
      this.#onModelChanged(selectedValue);
    }
  }

  #handleModelSelectorFocus(): void {
    if (this.#onModelSelectorFocus) {
      this.#onModelSelectorFocus();
    }
  }

  // OAuth login handlers
  #handleOAuthLogin(): void {
    if (this.#onOAuthLogin) {
      this.#onOAuthLogin();
    }
  }

  #handleOpenAISetup(event: Event): void {
    event.preventDefault();
    
    // Set the provider to OpenAI in localStorage
    localStorage.setItem('ai_chat_provider', 'openai');
    
    // Navigate to OpenAI API keys page in current window
    window.location.href = 'https://platform.openai.com/settings/organization/api-keys';
    
    // Also dispatch an event to open settings dialog
    this.dispatchEvent(new CustomEvent('manual-setup-requested', {
      bubbles: true,
      detail: { 
        action: 'open-settings',
        provider: 'openai'
      }
    }));
  }

  #handleManualSetup(event: Event): void {
    event.preventDefault();
    // This will trigger opening the settings dialog
    // We can dispatch a custom event that AIChatPanel can listen for
    this.dispatchEvent(new CustomEvent('manual-setup-requested', {
      bubbles: true,
      detail: { action: 'open-settings' }
    }));
  }

  // Helper methods for searchable model selector
  #getSelectedModelLabel(): string {
    const selectedOption = this.#modelOptions?.find(option => option.value === this.#selectedModel);
    return selectedOption?.label || this.#selectedModel || 'Select Model';
  }

  #getFilteredModelOptions(): Array<{value: string, label: string}> {
    if (!this.#modelOptions) return [];
    if (!this.#modelSearchQuery) return this.#modelOptions;
    
    const query = this.#modelSearchQuery.toLowerCase();
    return this.#modelOptions.filter(option => 
      option.label.toLowerCase().includes(query) ||
      option.value.toLowerCase().includes(query)
    );
  }

  #toggleModelDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (this.#isModelSelectorDisabled) return;
    
    this.#isModelDropdownOpen = !this.#isModelDropdownOpen;
    
    if (this.#isModelDropdownOpen) {
      this.#modelSearchQuery = '';
      this.#highlightedOptionIndex = 0;
      
      // Calculate dropdown position
      this.#calculateDropdownPosition(event.currentTarget as HTMLElement);
      
      // Add click outside handler with slight delay to avoid immediate trigger
      setTimeout(() => {
        document.addEventListener('click', this.#handleClickOutside.bind(this), { once: true });
      }, 100);
    }
    
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #calculateDropdownPosition(triggerElement: HTMLElement): void {
    const rect = triggerElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 300; // Max height from CSS
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    // If not enough space below and more space above, show dropdown above
    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      this.#dropdownPosition = 'above';
    } else {
      this.#dropdownPosition = 'below';
    }
  }

  #handleClickOutside(event: Event): void {
    const target = event.target as Element;
    // Check if click is within the model selector or dropdown
    const modelSelector = target.closest('.model-selector.searchable');
    const modelDropdown = target.closest('.model-dropdown');
    
    if (!modelSelector && !modelDropdown) {
      this.#isModelDropdownOpen = false;
      this.#dropdownPosition = 'below'; // Reset position
      void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
    }
  }

  #handleModelSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.#modelSearchQuery = input.value;
    this.#highlightedOptionIndex = 0; // Reset highlight to first item
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #handleModelSearchKeydown(event: KeyboardEvent): void {
    const filteredOptions = this.#getFilteredModelOptions();
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.#highlightedOptionIndex = Math.min(this.#highlightedOptionIndex + 1, filteredOptions.length - 1);
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        this.#highlightedOptionIndex = Math.max(this.#highlightedOptionIndex - 1, 0);
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
        break;
        
      case 'Enter':
        event.preventDefault();
        if (filteredOptions[this.#highlightedOptionIndex]) {
          this.#selectModel(filteredOptions[this.#highlightedOptionIndex].value);
        }
        break;
        
      case 'Escape':
        event.preventDefault();
        this.#isModelDropdownOpen = false;
        this.#dropdownPosition = 'below'; // Reset position
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
        break;
    }
  }

  #selectModel(modelValue: string): void {
    if (this.#onModelChanged) {
      this.#onModelChanged(modelValue);
    }
    this.#isModelDropdownOpen = false;
    this.#modelSearchQuery = '';
    this.#dropdownPosition = 'below'; // Reset position
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  // Add this new method for copying text to clipboard
  #copyToClipboard(text: string): void {
    // Copy to clipboard using the Clipboard API
    navigator.clipboard.writeText(text)
      .then(() => {
        // Show a brief visual feedback by temporarily changing the tooltip text
        const copyButtons = this.shadowRoot?.querySelectorAll('.message-action-button') || [];
        copyButtons.forEach(button => {
          const tooltip = button.querySelector('.action-tooltip');
          if (tooltip) {
            const originalText = tooltip.textContent;
            tooltip.textContent = 'Copied!';
            // Reset after short delay
            setTimeout(() => {
              tooltip.textContent = originalText;
            }, TIMING_CONSTANTS.COPY_FEEDBACK_DURATION);
          }
        });
      })
      .catch(err => {
        logger.error('Failed to copy text: ', err);
      });
  }

  // Method to check for updates
  async #checkForUpdates(): Promise<void> {
    try {
      const versionChecker = VersionChecker.getInstance();
      // Version is now automatically loaded from Version.ts
      
      logger.info('Checking for updates...');
      // Check if we need to clear stale cache due to version change
      const cachedInfo = versionChecker.getCachedVersionInfo();
      if (cachedInfo && cachedInfo.currentVersion !== versionChecker.getCurrentVersion()) {
        logger.info('Clearing cache due to version change');
        versionChecker.clearCache();
      }
      const versionInfo = await versionChecker.checkForUpdates();
      logger.info('Version info received:', versionInfo);
      
      if (versionInfo) {
        logger.info('Update available?', versionInfo.isUpdateAvailable);
        logger.info('Is update dismissed?', versionChecker.isUpdateDismissed(versionInfo.latestVersion));
      }
      
      if (versionInfo && versionInfo.isUpdateAvailable && !versionChecker.isUpdateDismissed(versionInfo.latestVersion)) {
        logger.info('Showing version banner for version:', versionInfo.latestVersion);
        this.#versionInfo = versionInfo;
        this.#isVersionBannerDismissed = false;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
      } else {
        logger.info('Not showing version banner');
      }
    } catch (error) {
      logger.error('Failed to check for updates:', error);
    }
  }

  // Method to dismiss version banner
  #dismissVersionBanner(): void {
    this.#isVersionBannerDismissed = true;
    if (this.#versionInfo) {
      VersionChecker.getInstance().dismissUpdate();
    }
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  // Method to render version banner
  #renderVersionBanner(): Lit.TemplateResult {
    logger.info('Rendering version banner:', {
      versionInfo: this.#versionInfo,
      isUpdateAvailable: this.#versionInfo?.isUpdateAvailable,
      isVersionBannerDismissed: this.#isVersionBannerDismissed,
      messageCount: this.#messages.length
    });
    
    // Hide banner after first message or if dismissed
    if (!this.#versionInfo || !this.#versionInfo.isUpdateAvailable || 
        this.#isVersionBannerDismissed || this.#messages.length > 1) {
      logger.info('Not rendering version banner - conditions not met');
      return html``;
    }
    
    logger.info('Rendering version banner for version:', this.#versionInfo.latestVersion);

    return html`
      <div class="version-banner">
        <div class="version-banner-content">
          <span class="version-banner-icon">🎉</span>
          <span class="version-banner-text">
            New version ${this.#versionInfo.latestVersion} is available!
          </span>
          <a 
            class="version-banner-link" 
            href="${this.#versionInfo.releaseUrl}" 
            target="_blank"
            rel="noopener noreferrer"
          >
            View Release
          </a>
        </div>
        <button 
          class="version-banner-dismiss" 
          @click=${this.#dismissVersionBanner.bind(this)}
          title="Dismiss"
          aria-label="Dismiss update notification"
        >
          ✕
        </button>
      </div>
    `;
  }

  // Method to parse structured response with reasoning and markdown_report XML tags
  #parseStructuredResponse(text: string): {reasoning: string, markdownReport: string} | null {
    try {
      // Look for the XML format with <reasoning> and <markdown_report> tags
      const reasoningMatch = text.match(REGEX_PATTERNS.REASONING_TAG);
      const reportMatch = text.match(REGEX_PATTERNS.MARKDOWN_REPORT_TAG);
      
      if (reasoningMatch && reportMatch) {
        const reasoning = reasoningMatch[1].trim();
        const markdownReport = reportMatch[1].trim();
        
        // Validate extracted content
        if (reasoning && markdownReport && markdownReport.length >= CONTENT_THRESHOLDS.MARKDOWN_REPORT_MIN_LENGTH) {
          return { reasoning, markdownReport };
        }
      }
    } catch (error) {
      logger.error('Failed to parse structured response:', error);
    }
    
    return null;
  }

  // Render structured response with last-message-only auto-processing
  #renderStructuredResponse(structuredResponse: {reasoning: string, markdownReport: string}, combinedIndex?: number): Lit.TemplateResult {
    logger.info('Starting renderStructuredResponse:', {
      combinedIndex,
      hasMessages: Boolean(this.#messages),
      messagesLength: this.#messages?.length,
      lastProcessedKey: this.#lastProcessedMessageKey,
      reasoningPreview: structuredResponse.reasoning.slice(0, 50) + '...'
    });
    
    const messageKey = this.#getMessageStateKey(structuredResponse);
    const isLastMessage = this.#isLastStructuredMessage(combinedIndex || 0);
    
    logger.info('Rendering structured response decision:', {
      messageKey,
      combinedIndex,
      isLastMessage,
      lastProcessedKey: this.#lastProcessedMessageKey,
      shouldAutoProcess: isLastMessage && messageKey !== this.#lastProcessedMessageKey
    });
    
    // Auto-process only last message
    if (isLastMessage && messageKey !== this.#lastProcessedMessageKey) {
      const aiState = this.#getMessageAIAssistantState(messageKey);
      if (aiState === 'not-attempted') {
        // Set to pending immediately for loading state
        logger.info('Setting state to pending and starting AI Assistant for LAST message key:', messageKey);
        this.#setMessageAIAssistantState(messageKey, 'pending');
        this.#attemptAIAssistantOpen(structuredResponse.markdownReport, messageKey);
        this.#lastProcessedMessageKey = messageKey;
      }
    }
    
    const aiState = this.#getMessageAIAssistantState(messageKey);
    return this.#renderStructuredMessage(structuredResponse, messageKey, aiState, isLastMessage);
  }

  // Unified render method for structured response messages
  #renderStructuredMessage(structuredResponse: {reasoning: string, markdownReport: string}, messageKey: string, aiState: 'pending' | 'opened' | 'failed' | 'not-attempted', isLastMessage: boolean): Lit.TemplateResult {
    logger.info('Rendering structured message:', { messageKey, aiState, isLastMessage });
    
    return html`
      <div class="message model-message final">
        <div class="message-content">
          <div class="message-text">${renderMarkdown(structuredResponse.reasoning, this.#markdownRenderer, this.#openInAIAssistantViewer.bind(this))}</div>
          
          ${aiState === 'pending' ? html`
            <!-- Loading state: Use existing loading element -->
            <div class="message-loading">
              <svg class="loading-spinner" width="16" height="16" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="30 12" stroke-linecap="round">
                  <animateTransform 
                    attributeName="transform" 
                    attributeType="XML" 
                    type="rotate" 
                    from="0 8 8" 
                    to="360 8 8" 
                    dur="1s" 
                    repeatCount="indefinite" />
                </circle>
              </svg>
            </div>
          ` : aiState === 'opened' ? html`
            <!-- Success: just button -->
            <div class="deep-research-actions">
              <button 
                class="view-document-btn"
                @click=${() => this.#openInAIAssistantViewer(structuredResponse.markdownReport)}
                title="Open full report in document viewer">
                📄 View Full Report
              </button>
            </div>
          ` : html`
            <!-- Failed or previous messages: inline + button -->
            <div class="inline-markdown-report">
              <div class="inline-report-header">
                <h3>Full Research Report</h3>
              </div>
              <div class="inline-report-content">
                ${renderMarkdown(structuredResponse.markdownReport, this.#markdownRenderer, this.#openInAIAssistantViewer.bind(this))}
              </div>
            </div>
            <div class="deep-research-actions">
              <button 
                class="view-document-btn"
                @click=${() => this.#openInAIAssistantViewer(structuredResponse.markdownReport)}
                title="Open full report in document viewer">
                📄 ${isLastMessage ? '' : 'View Full Report'}
              </button>
            </div>
          `}
        </div>
      </div>
    `;
  }
  
  // Attempt to open AI Assistant for a specific message
  async #attemptAIAssistantOpen(markdownContent: string, messageKey: string): Promise<void> {
    logger.info('ATTEMPTING AI ASSISTANT OPEN:', {
      messageKey,
      contentLength: markdownContent.length,
      contentPreview: markdownContent.slice(0, 200) + '...'
    });
    
    try {
      logger.info('Calling #openInAIAssistantViewer for key:', messageKey);
      await this.#openInAIAssistantViewer(markdownContent);
      
      logger.info('AI Assistant opened successfully, setting state to opened for key:', messageKey);
      this.#setMessageAIAssistantState(messageKey, 'opened');
    } catch (error) {
      logger.warn('AI Assistant navigation failed for key:', { messageKey, error });
      this.#setMessageAIAssistantState(messageKey, 'failed');
    }
    
    // Trigger single re-render after state change
    logger.info('Triggering re-render after AI Assistant state change for key:', messageKey);
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }
  

  // Method to open markdown content in AI Assistant viewer in the same tab
  async #openInAIAssistantViewer(markdownContent: string): Promise<void> {
    // Get the primary page target to navigate the inspected page
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      throw new Error(ERROR_MESSAGES.NO_PRIMARY_TARGET);
    }

    // Get the ResourceTreeModel to navigate the page
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel) {
      throw new Error('No ResourceTreeModel found');
    }

    // Navigate to browser-operator://assistant
    const url = 'browser-operator://assistant' as Platform.DevToolsPath.UrlString;
    const navigationResult = await resourceTreeModel.navigate(url);
    
    if (navigationResult.errorText) {
      throw new Error(`Navigation failed: ${navigationResult.errorText}`);
    }

      // Wait for the page to load, then inject the markdown content
      // Use event-based detection or timeout as fallback
      const injectContent = async (): Promise<void> => {
        const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
        if (!runtimeModel) {
          logger.error('No RuntimeModel found');
          throw new Error('No RuntimeModel found');
        }

        // Escape the markdown content for JavaScript injection
        const escapedContent = JSON.stringify(markdownContent);
        
        // JavaScript to inject - calls the global function we added to AI Assistant
        const injectionScript = `
          (function() {
            console.log('DevTools injecting markdown content...', 'Content length:', ${JSON.stringify(markdownContent.length)});
            console.log('Available global functions:', Object.keys(window).filter(k => k.includes('setDevTools') || k.includes('aiAssistant')));
            
            if (typeof window.setDevToolsMarkdown === 'function') {
              try {
                window.setDevToolsMarkdown(${escapedContent});
                console.log('Successfully called setDevToolsMarkdown function');
                return 'SUCCESS: Content injected via setDevToolsMarkdown function';
              } catch (error) {
                console.error('Error calling setDevToolsMarkdown:', error);
                return 'ERROR: Failed to call setDevToolsMarkdown: ' + error.message;
              }
            } else {
              console.warn('setDevToolsMarkdown function not found, using fallback methods');
              console.log('Available window properties:', Object.keys(window).filter(k => k.includes('DevTools') || k.includes('assistant') || k.includes('ai')));
              
              // Store in sessionStorage
              sessionStorage.setItem('devtools-markdown-content', ${escapedContent});
              console.log('Stored content in sessionStorage');
              
              // Try to trigger app reload
              if (window.aiAssistantApp && typeof window.aiAssistantApp.loadFromSessionStorage === 'function') {
                try {
                  window.aiAssistantApp.loadFromSessionStorage();
                  console.log('Successfully called aiAssistantApp.loadFromSessionStorage');
                  return 'SUCCESS: Content stored and app reloaded';
                } catch (error) {
                  console.error('Error calling loadFromSessionStorage:', error);
                  return 'ERROR: Content stored but failed to reload app: ' + error.message;
                }
              } else {
                console.log('aiAssistantApp not available or loadFromSessionStorage not a function');
                console.log('aiAssistantApp type:', typeof window.aiAssistantApp);
                if (window.aiAssistantApp) {
                  console.log('aiAssistantApp methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.aiAssistantApp)));
                }
                
                // Try to force a page reload as last resort
                try {
                  location.reload();
                  return 'SUCCESS: Content stored, forcing page reload';
                } catch (error) {
                  return 'SUCCESS: Content stored in sessionStorage, but manual refresh may be needed';
                }
              }
            }
          })();
        `;

        try {
          // Get the default execution context and evaluate the script
          const executionContext = runtimeModel.defaultExecutionContext();
          if (!executionContext) {
            logger.error('No execution context available');
            throw new Error('No execution context available');
          }

          const result = await executionContext.evaluate({
            expression: injectionScript,
            objectGroup: 'console',
            includeCommandLineAPI: false,
            silent: false,
            returnByValue: true,
            generatePreview: false
          }, false, false);

          if ('error' in result) {
            logger.error('Evaluation failed:', result.error);
            throw new Error(`Evaluation failed: ${result.error}`);
          }

          if (result.object.value) {
            logger.info('Content injection result:', result.object.value);
            // Check if injection was successful
            if (typeof result.object.value === 'string' && result.object.value.startsWith('ERROR:')) {
              throw new Error(result.object.value);
            }
          } else if (result.exceptionDetails) {
            logger.error('Content injection failed:', result.exceptionDetails.text);
            throw new Error(`Content injection failed: ${result.exceptionDetails.text || 'Unknown error'}`);
          }
        } catch (error) {
          logger.error('Failed to inject content:', error);
          throw error; // Re-throw to propagate to caller
        }
      };
      
      // Try to detect when AI Assistant is ready
      let retries = 0;
      const maxRetries = TIMING_CONSTANTS.AI_ASSISTANT_MAX_RETRIES;
      
      // Return a promise that resolves/rejects based on injection success
      return new Promise<void>((resolve, reject) => {
        const attemptInjection = () => {
          setTimeout(async () => {
            try {
              const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
              if (!runtimeModel) {
                reject(new Error('No RuntimeModel found'));
                return;
              }
              
              const executionContext = runtimeModel.defaultExecutionContext();
              if (!executionContext) {
                reject(new Error('No execution context available'));
                return;
              }
              
              // Check if AI Assistant is ready
              const checkResult = await executionContext.evaluate({
                expression: 'typeof window.setDevToolsMarkdown === "function" || (window.aiAssistantApp && typeof window.aiAssistantApp.loadFromSessionStorage === "function")',
                objectGroup: 'console',
                includeCommandLineAPI: false,
                silent: true,
                returnByValue: true,
                generatePreview: false
              }, false, false);
              
              if (!('error' in checkResult) && checkResult.object.value === true) {
                // AI Assistant is ready
                await injectContent();
                resolve();
              } else if (retries < maxRetries) {
                // Retry with exponential backoff
                retries++;
                attemptInjection();
              } else {
                logger.error('AI Assistant did not load in time');
                // Try to inject anyway as a last resort
                try {
                  await injectContent();
                  resolve();
                } catch (error) {
                  reject(error);
                }
              }
            } catch (error) {
              reject(error);
            }
          }, TIMING_CONSTANTS.AI_ASSISTANT_RETRY_DELAY * Math.pow(2, retries));
        };
        
        attemptInjection();
      });
  }

  /**
   * Toggle between simplified and enhanced agent view
   */
  #toggleAgentView(): void {
    this.#agentViewMode = this.#agentViewMode === 'simplified' ? 'enhanced' : 'simplified';
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  /**
   * Toggle tool details visibility
   */
  #toggleToolDetails(event: Event): void {
    const clickTarget = event.target as HTMLElement;
    const button = clickTarget.closest('.tool-toggle') as HTMLButtonElement;
    if (!button) return;
    
    const container = button.closest('.agent-execution-timeline');
    if (!container) return;
    
    const summary = container.querySelector('.tool-summary') as HTMLElement;
    const details = container.querySelector('.tool-details') as HTMLElement;
    const toggleIcon = button.querySelector('.toggle-icon') as HTMLElement;
    
    if (!details || !toggleIcon) return;
    
    if (details.style.display === 'none') {
      // Show details
      summary.style.display = 'none';
      details.style.display = 'flex';
      toggleIcon.textContent = '▲';
    } else {
      // Hide details
      summary.style.display = 'flex';
      details.style.display = 'none';
      toggleIcon.textContent = '▼';
    }
  }

  /**
   * Toggle tool result visibility
   */
  #toggleToolResult(event: Event): void {
    const clickTarget = event.target as HTMLElement;
    const button = clickTarget.closest('.tool-toggle') as HTMLButtonElement;
    if (!button) return;
    
    const container = button.closest('.agent-execution-timeline');
    if (!container) return;
    
    const result = container.querySelector('.timeline-items') as HTMLElement;
    const toggleIcon = button.querySelector('.toggle-icon') as HTMLElement;
    
    if (!result || !toggleIcon) return;
    
    if (result.style.display === 'none') {
      // Show result
      result.style.display = 'block';
      toggleIcon.textContent = '▲';
    } else {
      // Hide result
      result.style.display = 'none';
      toggleIcon.textContent = '▼';
    }
  }

  /**
   * Toggle agent session details visibility
   */
  #toggleAgentSessionDetails(event: Event): void {
    const clickTarget = event.target as HTMLElement;
    const button = clickTarget.closest('.tool-toggle') as HTMLButtonElement;
    if (!button) return;
    
    const container = button.closest('.agent-session-container');
    if (!container) return;
    
    const timelineItems = container.querySelector('.timeline-items') as HTMLElement;
    const nestedSessions = container.querySelector('.nested-sessions') as HTMLElement;
    const toggleIcon = button.querySelector('.toggle-icon') as HTMLElement;
    
    if (!toggleIcon) return;
    
    if (timelineItems.style.display === 'none') {
      // Show details
      timelineItems.style.display = 'block';
      if (nestedSessions) {
        nestedSessions.style.display = 'block';
      }
      toggleIcon.textContent = '▲';
    } else {
      // Hide details
      timelineItems.style.display = 'none';
      if (nestedSessions) {
        nestedSessions.style.display = 'none';
      }
      toggleIcon.textContent = '▼';
    }
  }

  /**
   * Render task completion with agent sessions using seamless timeline design
   */
  #renderTaskCompletion(agentSession: AgentSession): Lit.TemplateResult {
    if (!agentSession) {
      return html``;
    }

    return html`
      <div class="agent-execution-timeline">
        ${this.#renderAgentSessionTimeline(agentSession)}
      </div>
    `;
  }

  /**
   * Render agent session with timeline design
   */
  #renderAgentSessionTimeline(session: AgentSession, depth: number = 0, visitedSessions: Set<string> = new Set()): Lit.TemplateResult {
    // Prevent infinite recursion with depth limit and visited tracking
    if (depth > 10 || visitedSessions.has(session.sessionId)) {
      return html`<div class="max-depth-reached">Maximum nesting depth reached</div>`;
    }
    
    visitedSessions.add(session.sessionId);
    const uiConfig = getAgentUIConfig(session.agentName, session.config);
    const toolMessages = session.messages.filter(msg => msg.type === 'tool_call');
    const toolResults = session.messages.filter(msg => msg.type === 'tool_result');
    
    return html`
      ${session.agentReasoning ? html`<div class="message">${session.agentReasoning}</div>` : ''}
      <div class="agent-session-container">
        <div class="agent-header">
          <div class="agent-marker"></div>
          <div class="agent-title">${uiConfig.displayName}</div>
          <div class="agent-divider"></div>
          <button class="tool-toggle" @click=${(e: Event) => this.#toggleAgentSessionDetails(e)}>
            <span class="toggle-icon">▼</span>
          </button>
        </div>

        <div class="timeline-items" style="display: none;">
          ${session.agentQuery ? html`
          <div class="timeline-item">
            <div class="tool-line">
              <div class="tool-description-multiline">
                <span class="tool-description-indicator">─</span>
                <span style="margin-left: 4px;">${session.agentQuery}</span>
              </div>
            </div>
          </div>
          ` : ''}
          ${toolMessages.map(toolMsg => {
            const toolContent = toolMsg.content as AgentToolCallMessage;
            const toolResult = toolResults.find(result => {
              const resultContent = result.content as AgentToolResultMessage;
              return resultContent.toolCallId === toolContent.toolCallId;
            });
            return this.#renderTimelineItem(toolMsg, toolResult);
          })}
        </div>
        
        <div class="nested-sessions" style="display: none;">
          ${session.nestedSessions.map(nested => html`
            <div class="handoff-indicator">
              <span class="handoff-arrow">↓</span>
              <span class="handoff-text">Handoff to ${getAgentUIConfig(nested.agentName, nested.config).displayName}</span>
            </div>
            ${this.#renderAgentSessionTimeline(nested, depth + 1, new Set(visitedSessions))}
          `)}
        </div>
      </div>
    `;
  }

  /**
   * Render individual timeline item for tool execution
   */
  #renderTimelineItem(toolMessage: AgentMessage, toolResult: AgentMessage | undefined): Lit.TemplateResult {
    const toolContent = toolMessage.content as AgentToolCallMessage;
    const resultContent = toolResult?.content as AgentToolResultMessage;
    const toolName = toolContent.toolName;
    const toolArgs = toolContent.toolArgs || {};
    
    // Determine status based on tool result
    let status = 'running';
    if (toolResult && resultContent) {
      status = resultContent.success ? 'completed' : 'error';
    }
    
    const icon = this.#getToolIcon(toolName);
    const toolNameDisplay = toolName.replace(/_/g, ' ');
    const descriptionData = this.#getToolDescription(toolName, toolArgs);
    const resultText = resultContent?.result ? JSON.stringify(resultContent.result, null, 2) : '';
    
    if (descriptionData.isMultiLine) {
      // Multi-line format - just the timeline item, no wrapper
      return html`
        <div class="timeline-item">
          <div class="tool-line">
            <div class="tool-description-multiline" style="display: block;">
              <span class="tool-description-indicator">─</span>
              <span style="margin-left: 4px;">${icon}  ${toolNameDisplay}:</span>
              ${(descriptionData.content as Array<{key: string, value: string}>).map(arg => html`
                <div class="tool-arg">
                  <span class="tool-arg-key">${arg.key}:</span>
                  <span class="tool-arg-value">${arg.value}</span>
                </div>
              `)}
            </div>
            <span class="tool-status-marker ${status}" title="${status === 'running' ? 'Running' : status === 'completed' ? 'Completed' : status === 'error' ? 'Error' : 'Unknown'}">●</span>
          </div>
        </div>
      `;
    } else {
      // Single-line format
      return html`
        <div class="timeline-item">
          <div class="tool-line">
            <div class="tool-description-multiline">
              <span class="tool-description-indicator">─</span>
              <span style="margin-left: 4px;">${icon}  ${descriptionData.content}</span>
            </div>
            <span class="tool-status-marker ${status}" title="${status === 'running' ? 'Running' : status === 'completed' ? 'Completed' : status === 'error' ? 'Error' : 'Unknown'}">●</span>
          </div>
        </div>
      `;
    }
  }

  /**
   * Generate task title from agent session
   */
  #generateTaskTitle(agentSession: AgentSession): string {
    if (!agentSession) {
      return 'AI Task Execution';
    }
    
    const totalTools = this.#countTotalTools(agentSession);
    return `Completed task using ${totalTools} tools`;
  }

  /**
   * Count total tools used across all sessions
   */
  #countTotalTools(session: AgentSession): number {
    const sessionTools = session.messages.filter(msg => msg.type === 'tool_call').length;
    const nestedTools = session.nestedSessions.reduce((total, nested) => {
      return total + this.#countTotalTools(nested);
    }, 0);
    return sessionTools + nestedTools;
  }

  /**
   * Render simplified content (current tool list style)
   */
  #renderSimplifiedContent(agentSession: AgentSession): Lit.TemplateResult {
    if (!agentSession) {
      return html``;
    }

    const allToolCalls = this.#flattenToolCalls(agentSession);
    
    return html`
      <div class="simplified-content">
        ${allToolCalls.map(tool => this.#renderSimpleToolItem(tool))}
        <button class="show-more-button" @click=${() => { this.#agentViewMode = 'enhanced'; void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender); }}>
          🔍 Show Agent Details
        </button>
      </div>
    `;
  }

  /**
   * Flatten tool calls from all sessions
   */
  #flattenToolCalls(session: AgentSession): Array<{toolName: string, args: any}> {
    const sessionToolCalls = session.messages
      .filter(msg => msg.type === 'tool_call')
      .map(msg => ({
        toolName: (msg.content as any).toolName,
        args: (msg.content as any).toolArgs
      }));

    const nestedToolCalls = session.nestedSessions.flatMap(nested => 
      this.#flattenToolCalls(nested)
    );

    return [...sessionToolCalls, ...nestedToolCalls];
  }

  /**
   * Render simple tool item (current style)
   */
  #renderSimpleToolItem(tool: {toolName: string, args: any}): Lit.TemplateResult {
    const icon = this.#getToolIcon(tool.toolName);
    const description = this.#getToolDescription(tool.toolName, tool.args);
    
    return html`
      <div class="tool-item">
        <div class="tool-icon">${icon}</div>
        <div class="tool-text">${description}</div>
      </div>
    `;
  }

  /**
   * Get tool icon based on tool name
   */
  #getToolIcon(toolName: string): string {
    if (toolName.includes('search')) return '🔍';
    if (toolName.includes('browse') || toolName.includes('navigate')) return '🌐';
    if (toolName.includes('create') || toolName.includes('write')) return '📝';
    if (toolName.includes('extract') || toolName.includes('analyze')) return '🔬';
    if (toolName.includes('click') || toolName.includes('action')) return '👆';
    return '🔧';
  }

  /**
   * Format value for display - convert objects to YAML-like format
   */
  #formatValueForDisplay(value: any, depth: number = 0): string {
    // Prevent infinite recursion
    if (depth > 10) {
      return '[Max depth reached]';
    }
    
    if (value === null || value === undefined) {
      return String(value);
    }
    
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      if (value.length === 1) return this.#formatValueForDisplay(value[0], depth + 1);
      return value.map(item => `- ${this.#formatValueForDisplay(item, depth + 1)}`).join('\n');
    }
    
    if (typeof value === 'object') {
      // Handle circular references by using try-catch
      try {
        const entries = Object.entries(value);
        if (entries.length === 0) return '{}';
        if (entries.length === 1) {
          const [k, v] = entries[0];
          return `${k}: ${this.#formatValueForDisplay(v, depth + 1)}`;
        }
        return entries.map(([k, v]) => `${k}: ${this.#formatValueForDisplay(v, depth + 1)}`).join('\n');
      } catch (error) {
        return '[Circular reference detected]';
      }
    }
    
    return String(value);
  }

  /**
   * Get tool description from name and args
   */
  #getToolDescription(toolName: string, args: any): { isMultiLine: boolean, content: string | Array<{key: string, value: string}>, action: string } {
    const action = toolName.replace(/_/g, ' ').toLowerCase();
    
    // Filter out common metadata fields
    const filteredArgs = Object.fromEntries(
      Object.entries(args).filter(([key]) => 
        key !== 'reasoning' && key !== 'toolCallId' && key !== 'timestamp'
      )
    );
    
    const argKeys = Object.keys(filteredArgs);
    
    if (argKeys.length === 0) {
      return { isMultiLine: false, content: action, action };
    }
    
    if (argKeys.length === 1) {
      // Single argument - inline format
      const [key, value] = Object.entries(filteredArgs)[0];
      const formattedValue = this.#formatValueForDisplay(value);
      const needsNewline = formattedValue.length > 80;
      return { isMultiLine: false, content: `${action}:${needsNewline ? '\n' : ''}${formattedValue}`, action };
    }
    
    // Multiple arguments - return structured data for multi-line rendering
    // Sort to put 'query' first if it exists
    const sortedKeys = argKeys.sort((a, b) => {
      if (a === 'query') return -1;
      if (b === 'query') return 1;
      return 0;
    });
    
    const argsArray = sortedKeys.map(key => ({
      key,
      value: this.#formatValueForDisplay(filteredArgs[key])
    }));
    
    return { isMultiLine: true, content: argsArray, action };
  }

  /**
   * Render enhanced content (agent-centric view)
   */
  #renderEnhancedContent(agentSession: AgentSession): Lit.TemplateResult {
    if (!agentSession) {
      return html``;
    }

    return html`
      <div class="enhanced-content">
        ${this.#renderAgentSession(agentSession, 0)}
        <button class="show-less-button" @click=${() => { this.#agentViewMode = 'simplified'; void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender); }}>
          ↑ Show Simplified View
        </button>
      </div>
    `;
  }

  /**
   * Render agent session recursively
   */
  #renderAgentSession(session: AgentSession, depth: number): Lit.TemplateResult {
    const uiConfig = getAgentUIConfig(session.agentName, session.config);
    
    return html`
      <div class="agent-session" style="margin-left: ${depth * 20}px">
        ${this.#renderAgentHeader(session, uiConfig)}
        <div class="agent-session-content">
          ${session.reasoning ? this.#renderReasoningBubble(session.reasoning) : Lit.nothing}
          <div class="tool-sequence">
            ${session.messages.map(msg => this.#renderAgentMessage(msg))}
          </div>
          ${session.nestedSessions.map((nested, index) => html`
            ${index === 0 ? this.#renderHandoffIndicator(session.agentName, nested.agentName) : Lit.nothing}
            ${this.#renderAgentSession(nested, depth + 1)}
          `)}
        </div>
      </div>
    `;
  }

  /**
   * Render agent header
   */
  #renderAgentHeader(session: AgentSession, uiConfig: ReturnType<typeof getAgentUIConfig>): Lit.TemplateResult {
    return html`
      <div class="agent-session-header" style="background: ${uiConfig.backgroundColor}; border-left: 4px solid ${uiConfig.color}">
        <div class="agent-avatar" style="background: ${uiConfig.backgroundColor}; color: ${uiConfig.color}">
          ${uiConfig.avatar}
        </div>
        <div class="agent-info">
          <div class="agent-name">${uiConfig.displayName}</div>
          <div class="agent-status">
            <span class="status-badge ${session.status}">${this.#getStatusText(session)}</span>
            <span>${this.#getStatusDescription(session)}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get status text from session
   */
  #getStatusText(session: AgentSession): string {
    switch (session.status) {
      case 'completed': return 'Completed';
      case 'running': return 'Running';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  }

  /**
   * Get status description from session
   */
  #getStatusDescription(session: AgentSession): string {
    const toolCount = session.messages.filter(msg => msg.type === 'tool_call').length;
    if (toolCount === 0) {
      return 'No tools executed';
    }
    return `Executed ${toolCount} tool${toolCount === 1 ? '' : 's'}`;
  }

  /**
   * Render reasoning bubble
   */
  #renderReasoningBubble(reasoning: string): Lit.TemplateResult {
    return html`
      <div class="agent-reasoning">
        ${reasoning}
      </div>
    `;
  }

  /**
   * Render handoff indicator
   */
  #renderHandoffIndicator(fromAgent: string, toAgent: string): Lit.TemplateResult {
    return html`
      <div class="handoff-indicator">
        <div class="handoff-line"></div>
        <div class="handoff-badge">→ Handoff to ${toAgent}</div>
      </div>
    `;
  }

  /**
   * Render agent message
   */
  #renderAgentMessage(message: AgentMessage): Lit.TemplateResult {
    switch (message.type) {
      case 'reasoning':
        return html`<div class="reasoning-message">💭 ${(message.content as any).text}</div>`;
      case 'tool_call':
        return this.#renderToolCall(message);
      case 'tool_result':
        return this.#renderToolResult(message);
      case 'handoff':
        return html``; // Don't render handoff messages as they're handled by the handoff indicator
      case 'final_answer':
        return html`<div class="final-answer-message">🎯 ${(message.content as any).answer}</div>`;
      default:
        return html``;
    }
  }

  /**
   * Render tool call
   */
  #renderToolCall(message: AgentMessage): Lit.TemplateResult {
    const content = message.content as any;
    return html`
      <div class="enterprise-tool success">
        <div class="tool-header">
          <div class="tool-name">${content.toolName}</div>
          <div class="tool-status status-success">✓ Success</div>
        </div>
        <div class="tool-description">${this.#getToolDescription(content.toolName, content.toolArgs)}</div>
        <div class="tool-details">${JSON.stringify(content.toolArgs, null, 2)}</div>
      </div>
    `;
  }

  /**
   * Render tool result
   */
  #renderToolResult(message: AgentMessage): Lit.TemplateResult {
    const content = message.content as any;
    const statusClass = content.success ? 'success' : 'error';
    const statusIcon = content.success ? '✓' : '❌';
    
    return html`
      <div class="tool-result ${statusClass}">
        <div class="tool-result-header">
          ${statusIcon} ${content.toolName} result
        </div>
        ${content.result ? html`
          <div class="tool-result-content">
            ${typeof content.result === 'string' ? content.result : JSON.stringify(content.result, null, 2)}
          </div>
        ` : Lit.nothing}
        ${content.error ? html`<div class="error-text">${content.error}</div>` : Lit.nothing}
      </div>
    `;
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-chat-view': ChatView;
  }
}
