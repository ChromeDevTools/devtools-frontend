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

// Function to detect if content should use deep-research rendering
function isDeepResearchContent(text: string): boolean {
  // Require minimum content length
  if (text.length < CONTENT_THRESHOLDS.DEEP_RESEARCH_MIN_LENGTH) {
    return false;
  }
  
  // Check if content contains multiple headings (indicating structured document)
  const headingMatches = text.match(REGEX_PATTERNS.HEADING);
  const hasMultipleHeadings = headingMatches ? headingMatches.length >= CONTENT_THRESHOLDS.DEEP_RESEARCH_MIN_HEADINGS : false;
  
  return hasMultipleHeadings;
}

// Function to render text as markdown
function renderMarkdown(text: string, markdownRenderer: MarkdownRenderer): Lit.TemplateResult {
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
    .data=${{tokens, renderer: markdownRenderer} as MarkdownView.MarkdownView.MarkdownViewData}>
  </devtools-markdown-view>`;
}

// Types for the ChatView component

// Define possible entities for chat messages
export enum ChatMessageEntity {
  USER = 'user',
  MODEL = 'model',
  TOOL_RESULT = 'tool_result',
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
}

// Union type representing any possible chat message
export type ChatMessage =
    UserChatMessage|ModelChatMessage|ToolResultMessage;

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
}

@customElement('devtools-chat-view')
export class ChatView extends HTMLElement {
  static readonly litTagName = Lit.StaticHtml.literal`devtools-chat-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);

  #messages: ChatMessage[] = [];
  #state: State = State.IDLE;
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
  
  // Add state tracking for AI Assistant operations
  #aiAssistantStates = new Map<string, 'pending' | 'opened' | 'failed'>();
  #lastProcessedMessageKey: string | null = null;

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

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  disconnectedCallback(): void {
    // Cleanup resize observer
    this.#messagesContainerResizeObserver.disconnect();
    
    // Clear state maps to prevent memory leaks
    this.#aiAssistantStates.clear();
    this.#lastProcessedMessageKey = null;
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
                <div class="message-text">${renderMarkdown(message.text || '', this.#markdownRenderer)}</div>
                ${message.error ? html`<div class="message-error">${message.error}</div>` : Lit.nothing}
              </div>
            </div>
          `;
        case ChatMessageEntity.TOOL_RESULT:
          // Should only render if orphaned
          {
             const toolResultMessage = message as (ToolResultMessage & { orphaned?: boolean });
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
                const isDeepResearch = isDeepResearchContent(modelMessage.answer || '');
                
                return html`
                  <div class="message model-message final">
                    <div class="message-content">
                      ${modelMessage.answer ?
                        html`
                          <div class="message-text">${renderMarkdown(modelMessage.answer, this.#markdownRenderer)}</div>
                          ${isDeepResearch ? html`
                            <div class="deep-research-actions">
                              <button 
                                class="view-document-btn"
                                @click=${() => this.#openInAIAssistantViewer(modelMessage.answer || '')}
                                title="Open in full document viewer with table of contents">
                                📄 View as Document
                              </button>
                            </div>
                          ` : Lit.nothing}
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
                              <div class="reasoning-item">${renderMarkdown(item, this.#markdownRenderer)}</div>
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

            // --- Render Combined Tool Call + Result OR Running Tool Call (with new styling) ---
            const toolReasoning = modelMessage.toolArgs?.reasoning as string | undefined;
            const resultText = modelMessage.resultText; // Available if combined
            const isResultError = modelMessage.isError ?? false; // Available if combined, default false
            const toolArgs = modelMessage.toolArgs || {};
            const filteredArgs = Object.fromEntries(Object.entries(toolArgs).filter(([key]) => key !== 'reasoning'));

            // Icons for tool status
            const spinnerIcon = html`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="animation: spin 1s linear infinite;"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0z" fill="currentColor"/><path d="M8 0a8 8 0 0 1 8 8h-1.5A6.5 6.5 0 0 0 8 1.5V0z" fill="currentColor"/></svg>`;
            const checkIcon = html`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M13.7071 4.29289C14.0976 4.68342 14.0976 5.31658 13.7071 5.70711L7.70711 11.7071C7.31658 12.0976 6.68342 12.0976 6.29289 11.7071L2.29289 7.70711C1.90237 7.31658 1.90237 6.68342 2.29289 6.29289C2.68342 5.90237 3.31658 5.90237 3.70711 6.29289L7 9.58579L12.2929 4.29289C12.6834 3.90237 13.3166 3.90237 13.7071 4.29289Z" fill="currentColor"/></svg>`;
            const errorIcon = html`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8.78-2.53a.75.75 0 0 0-1.56 0v5.06a.75.75 0 0 0 1.56 0V5.47zm-1.5 7.06a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5z" fill="currentColor"/></svg>`;

            return html`
              <!-- Reasoning (if any) displayed above the block -->
              ${toolReasoning ? html`
                <div class="message-text reasoning-text" style="margin-bottom: 8px;">
                  ${renderMarkdown(toolReasoning, this.#markdownRenderer)}
                </div>
              ` : Lit.nothing}

              <!-- Tool Interaction Block (using details/summary) -->
              <details class="message model-message tool-interaction-details" ?open=${isRunningTool} >
                <!-- Clickable Summary (Styled like Refine Box) -->
                <summary class="tool-call-summary">
                  <!-- Icon -->
                  <span class=${isRunningTool ? 'spinner-icon' : ''}>
                    ${isRunningTool ? spinnerIcon : (isResultError ? errorIcon : checkIcon)}
                  </span>
                  
                  <!-- Text Block (Tool Name + Status) -->
                  <div class="tool-name-container"> 
                    <span class="tool-name">Tool: ${modelMessage.toolName}</span>
                    <span class="tool-status-text">
                      ${isRunningTool ? 'running...' : (isResultError ? 'Error' : 'Completed')}
                    </span>
                  </div>
                </summary>

                <!-- Content inside details (Args + Result Block) -->
                <div class="tool-details-content"> 
                  <!-- Args Section -->
                  <div class="tool-args-container">
                    <div class="tool-args-section">
                      <span class="tool-args-label">Args:</span>
                     ${Object.keys(filteredArgs).length > 0 ? html`
                       <div class="tool-args-value">
                           ${Object.entries(filteredArgs)
                               .map(([key, value]) => html`<div><span class="tool-arg-key">${key}</span>${JSON.stringify(value)}</div>`)
                               .reduce((prev, curr) => html`${prev}${curr}`, html``)
                           }
                       </div>
                     ` : html`<div class="tool-no-args">No arguments</div>`}
                    </div>
                  </div>
                  <!-- Reasoning Section (if available) -->
                  ${modelMessage.reasoning?.length ? html`
                    <div class="reasoning-block">
                      <details class="reasoning-details">
                        <summary class="reasoning-summary">
                          <span class="reasoning-icon">💡</span>
                          <span>Model Reasoning</span>
                        </summary>
                        <div class="reasoning-content">
                          ${modelMessage.reasoning.map(item => html`
                            <div class="reasoning-item">${renderMarkdown(item, this.#markdownRenderer)}</div>
                          `)}
                        </div>
                      </details>
                    </div>
                  ` : Lit.nothing}
                  ${modelMessage.error ? html`<div class="message-error tool-error-message">Model Error: ${modelMessage.error}</div>` : Lit.nothing}

                  <!-- Result Block - Only shown when combined -->
                  ${isCombined ? html`
                    <div class="tool-result-block ${isResultError ? 'error' : 'success'}" >
                      <div class="tool-result-header">
                        ${isResultError ? errorIcon : checkIcon}
                        <span>Result from: ${modelMessage.toolName}</span>
                      </div>
                      <div class="tool-result-content">
                        ${this.#formatJsonWithSyntaxHighlighting(resultText || 'No result content')}
                      </div>
                      ${modelMessage.resultError ? html`<div class="message-error tool-error-message">Tool Error: ${modelMessage.resultError}</div>` : Lit.nothing}
                    </div>
                  ` : Lit.nothing}
                </div>
              </details>
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

    // Combine the tool calling and tool result messages into a single logical unit for rendering
    const combinedMessages = this.#messages.reduce((acc, message, index, allMessages) => {
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
          <div class="centered-content">
            ${welcomeMessage ? this.#renderMessage(welcomeMessage, 0) : Lit.nothing}
            
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
          </div>
        </div>
      `, this.#shadow, {host: this});
    } else {
      // Render normal expanded view for conversation
      Lit.render(html`
        <div class="chat-view-container expanded-view">
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
              <button
                class="send-button ${this.#isTextInputEmpty || this.#isInputDisabled ? 'disabled' : ''}"
                ?disabled=${this.#isTextInputEmpty || this.#isInputDisabled}
                @click=${this.#handleSendMessage.bind(this)}
                title="Send message"
                aria-label="Send message"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
              <!-- Prompt Buttons Row -->
              <div class="prompt-buttons-row">
                ${BaseOrchestratorAgent.renderAgentTypeButtons(this.#selectedPromptType, this.#handlePromptButtonClickBound)}
                <div class="actions-container">
                  ${this.#renderModelSelector()}
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
      // Only process if it looks like JSON
      if (jsonString.trim().startsWith('{') || jsonString.trim().startsWith('[')) {
        const parsed = JSON.parse(jsonString);
        const formatted = JSON.stringify(parsed, null, 2);

        // Replace keys, strings, and booleans with highlighted spans
        const highlighted = formatted
          .replace(/"([^"]+)":/g, '<span class="tool-result-json-key">"$1"</span>:')
          .replace(/"([^"]+)"/g, '<span class="tool-result-json-string">"$1"</span>')
          .replace(/\b(true|false)\b/g, '<span class="tool-result-json-boolean">$1</span>');

        return html`<div .innerHTML=${highlighted}></div>`;
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

    return html`
      <div class="model-selector">
        <select 
          class="model-select"
          .value=${this.#selectedModel}
          ?disabled=${this.#isModelSelectorDisabled} 
          @change=${this.#handleModelChange.bind(this)}
          @focus=${this.#handleModelSelectorFocus.bind(this)}
        >
          ${this.#modelOptions.map(option => html`
            <option value=${option.value} ?selected=${option.value === this.#selectedModel}>${option.label}</option>
          `)}
        </select>
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
          <div class="message-text">${renderMarkdown(structuredResponse.reasoning, this.#markdownRenderer)}</div>
          
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
                ${renderMarkdown(structuredResponse.markdownReport, this.#markdownRenderer)}
              </div>
            </div>
            <div class="deep-research-actions">
              <button 
                class="view-document-btn"
                @click=${() => this.#openInAIAssistantViewer(structuredResponse.markdownReport)}
                title="Open full report in document viewer">
                📄 ${isLastMessage ? 'Try AI Assistant' : 'View Full Report'}
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

    // Navigate to ai-app://assistant
    const url = 'ai-app://assistant' as Platform.DevToolsPath.UrlString;
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

}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-chat-view': ChatView;
  }
}
