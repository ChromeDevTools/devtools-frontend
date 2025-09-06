// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as BaseOrchestratorAgent from '../core/BaseOrchestratorAgent.js';
import { TIMING_CONSTANTS } from '../core/Constants.js';
import { PromptEditDialog } from './PromptEditDialog.js';
import { MarkdownViewerUtil } from '../common/MarkdownViewerUtil.js';
import { createLogger } from '../core/Logger.js';
import type { AgentSession, ToolCallMessage as AgentToolCallMessage, ToolResultMessage as AgentToolResultMessage } from '../agent_framework/AgentSessionTypes.js';
import { getAgentUIConfig } from '../agent_framework/AgentSessionTypes.js';
import { VersionChecker, type VersionInfo } from '../core/VersionChecker.js';
import { LiveAgentSessionComponent } from './LiveAgentSessionComponent.js';
import { MarkdownRenderer, renderMarkdown } from './markdown/MarkdownRenderers.js';
import { parseStructuredResponse } from '../core/structured_response.js';
import { ToolDescriptionFormatter } from './ToolDescriptionFormatter.js';
import './message/MessageList.js';
import { renderUserMessage } from './message/UserMessage.js';
import { renderModelMessage } from './message/ModelMessage.js';
import { renderToolResultMessage } from './message/ToolResultMessage.js';
import './version/VersionBanner.js';
import { renderGlobalActionsRow } from './message/GlobalActionsRow.js';
import { renderStructuredResponse as renderStructuredResponseUI } from './message/StructuredResponseRender.js';
import './oauth/OAuthConnectPanel.js';
import './input/ChatInput.js';
import './input/InputBar.js';
import './model_selector/ModelSelector.js';
import { combineMessages } from './message/MessageCombiner.js';
import { StructuredResponseController } from './message/StructuredResponseController.js';

// Shared chat types
import type { ChatMessage, ModelChatMessage, ToolResultMessage, AgentSessionMessage, ImageInputData } from '../models/ChatTypes.js';
import { ChatMessageEntity, State } from '../models/ChatTypes.js';

const logger = createLogger('ChatView');

import chatViewStyles from './chatView.css.js';

const {html, Decorators} = Lit;
const {customElement} = Decorators;

// Markdown rendering moved to ui/markdown/MarkdownRenderers.ts

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
  // input is handled by <ai-chat-input>
  #markdownRenderer = new MarkdownRenderer();
  #isFirstMessageView = true; // Track if we're in the centered first-message view
  #selectedPromptType?: string | null; // Track the currently selected prompt type
  // Lightweight instance cache to preserve per-session element state across renders
  #liveSessionComponents = new Map<string, LiveAgentSessionComponent>();
  #handlePromptButtonClickBound: (event: Event) => void = () => {}; // Initialize with empty function, will be properly set in connectedCallback
  // Add model selection properties
  #modelOptions?: Array<{value: string, label: string}>;
  #selectedModel?: string;
  #onModelChanged?: (model: string) => void;
  #onModelSelectorFocus?: () => void;
  #selectedAgentType?: string | null;
  #isModelSelectorDisabled = false;

  // Scroll behavior delegated to <ai-message-list>

  // Add properties for input disabled state and placeholder
  #isInputDisabled = false;
  #inputPlaceholder = '';
  
  // Add OAuth login properties
  #showOAuthLogin = false;
  #onOAuthLogin?: () => void;
  
  // Structured response auto-open controller
  #structuredController = new StructuredResponseController(() => {
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  });
  // Combined messages cache for this render pass
  #combinedMessagesCache: CombinedMessage[] = [];
  // Track agent session IDs that are nested inside other sessions to avoid duplicate top-level rendering
  #nestedChildSessionIds: Set<string> = new Set();
  // Track pending handoff target agent names to suppress interim top-level renders
  #pendingHandoffTargets: Set<string> = new Set();
  // Model selector is rendered via <ai-model-selector>
  
  // Add version info state
  #versionInfo: VersionInfo | null = null;
  #isVersionBannerDismissed = false;

  connectedCallback(): void {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(chatViewStyles);
    this.#shadow.adoptedStyleSheets = [sheet];

    // Initialize the prompt button click handler
    this.#updatePromptButtonClickHandler();

    // Check for updates when component is connected
    this.#checkForUpdates();

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  disconnectedCallback(): void {
    // Nothing to cleanup currently
  }

  // Test-only helper to introspect cached live agent sessions
  // This is used by unit tests to verify pruning behavior and is not used in production code.
  getLiveAgentSessionCountForTesting(): number {
    // Count AGENT_SESSION messages present; used as a proxy for visible sessions
    return this.#messages.filter(m => m.entity === ChatMessageEntity.AGENT_SESSION).length;
  }


  /**
   * Set the agent view mode for simplified/enhanced toggle
   */
  setAgentViewMode(mode: 'simplified' | 'enhanced'): void {
    this.#agentViewMode = mode;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
    this.#structuredController.resetLastProcessed();
  }

  /**
   * Check if a message is part of an agent session
   */
  #isPartOfAgentSession(message: ChatMessage): boolean {
    // Check if there's an AgentSessionMessage in the current messages
    const hasAgentSession = this.#messages.some(msg => msg.entity === ChatMessageEntity.AGENT_SESSION);
    
    if (!hasAgentSession) {
      return false;
    }
    
    // For ModelChatMessage tool calls, check if they're from ConfigurableAgentTool
    if (message.entity === ChatMessageEntity.MODEL) {
      const modelMsg = message as ModelChatMessage;
      if (modelMsg.action === 'tool' && modelMsg.toolName) {
        // Check if there's a corresponding tool result that's from ConfigurableAgentTool
        const toolResultIndex = this.#messages.findIndex((msg) => 
          msg.entity === ChatMessageEntity.TOOL_RESULT && 
          (msg as ToolResultMessage).toolName === modelMsg.toolName &&
          (msg as ToolResultMessage).toolCallId === modelMsg.toolCallId
        );
        if (toolResultIndex !== -1) {
          const toolResult = this.#messages[toolResultIndex] as ToolResultMessage;
          return toolResult.isFromConfigurableAgent === true;
        }
      }
    }
    
    return false;
  }

  // Scroll behavior handled by <ai-message-list>

  #isLastStructuredMessage(currentCombinedIndex: number): boolean {
    const combined = this.#combinedMessagesCache.length ? this.#combinedMessagesCache : combineMessages(this.#messages);
    let lastStructuredIndex = -1;
    for (let i = 0; i < combined.length; i++) {
      const m = combined[i];
      if (m.entity === ChatMessageEntity.MODEL && (m as any).action === 'final') {
        const sr = parseStructuredResponse(((m as any).answer || '') as string);
        if (sr) {
          lastStructuredIndex = i;
        }
      }
    }
    return lastStructuredIndex === currentCombinedIndex;
  }


  // Update the prompt button click handler when props/state changes
  #updatePromptButtonClickHandler(): void {
    this.#handlePromptButtonClickBound = BaseOrchestratorAgent.createAgentTypeSelectionHandler(
      this,
      undefined,
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

    // Inform structured response controller of new messages
    if (willHaveMoreMessages) {
      this.#structuredController.handleNewMessages(this.#messages, data.messages);
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

    // Controller owns session message upserts; no UI sync required

    // Update the prompt button handler with new props
    this.#updatePromptButtonClickHandler();

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);

    // Message list handles pin-to-bottom; no explicit scroll needed here
  }

  // Ensure that for each cached live agent session there is a corresponding
  // AgentSessionMessage in the messages list. This protects against timing
  // gaps where a session has started but upstream state has not yet emitted
  // the AgentSessionMessage, which would otherwise prevent rendering.
  // (Removed) #syncLiveSessionsIntoMessages

  // Upsert an AGENT_SESSION message by sessionId
  #upsertAgentSessionMessage(session: AgentSession): void {
    const idx = this.#messages.findIndex(m => m.entity === ChatMessageEntity.AGENT_SESSION &&
      (m as AgentSessionMessage).agentSession.sessionId === session.sessionId);
    if (idx >= 0) {
      (this.#messages[idx] as AgentSessionMessage).agentSession = session;
    } else {
      const agentSessionMessage: AgentSessionMessage = {
        entity: ChatMessageEntity.AGENT_SESSION,
        agentSession: session,
        summary: `${session.agentName} is executing...`
      };
      this.#messages.push(agentSessionMessage);
    }
  }

  // Event handlers removed: controller owns session updates

  #handleSendMessage(text?: string): void {
    if (!this.#onSendMessage || this.#isInputDisabled) {
      return;
    }
    const value = (text ?? '').trim();
    if (!value) {
      return;
    }

    this.#isFirstMessageView = false;

    this.#onSendMessage(value, this.#imageInput);
    this.#isTextInputEmpty = true;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #handleChatInputSend(event: Event): void {
    const e = event as CustomEvent<{text: string}>;
    this.#handleSendMessage(e.detail?.text);
    // Proactively clear the input bar's field to avoid any stale content
    const bar = this.#shadow.querySelector('ai-input-bar') as any;
    if (bar && typeof bar.clearInput === 'function') {
      bar.clearInput();
    }
  }

  #handleChatInputChange(event: Event): void {
    const e = event as CustomEvent<{value: string}>;
    const newIsEmpty = (e.detail?.value || '').trim().length === 0;
    if (this.#isTextInputEmpty !== newIsEmpty) {
      this.#isTextInputEmpty = newIsEmpty;
      void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
    } else {
      this.#isTextInputEmpty = newIsEmpty;
    }
  }

  // input key handling and autosize handled inside <ai-chat-input>

  // Render messages based on the combined structure
  #renderMessage(message: ChatMessage | (ModelChatMessage & { resultText?: string, isError?: boolean, resultError?: string, combined?: boolean }) | (ToolResultMessage & { orphaned?: boolean }), combinedIndex?: number ): Lit.TemplateResult {
    try {
      switch (message.entity) {
        case ChatMessageEntity.USER:
          // Render User Message via dedicated renderer
          return renderUserMessage(message as any, this.#markdownRenderer);
        case ChatMessageEntity.AGENT_SESSION:
          // Render live session declaratively; Lit preserves element instance by key
          {
            const agentSessionMessage = message as AgentSessionMessage;
            const sid = agentSessionMessage.agentSession.sessionId;
            // If this session is a nested child of another visible session, or a pending handoff target, hide the top-level duplicate
            if (this.#nestedChildSessionIds.has(sid) || this.#pendingHandoffTargets.has(agentSessionMessage.agentSession.agentName)) {
              logger.info('ChatView: suppressing top-level nested agent session', { sid });
              return html``;
            }
            let comp = this.#liveSessionComponents.get(sid);
            if (!comp) {
              comp = new LiveAgentSessionComponent();
              this.#liveSessionComponents.set(sid, comp);
            }
            // Update data on the persistent element instance
            (comp as any).session = agentSessionMessage.agentSession;
            // Ensure top-level sessions render in full variant
            (comp as any).setVariant?.('full');
            // Provide top-level session IDs to suppress inline duplication of nested children
            const topLevelIds = new Set(
              this.#messages
                .filter(m => (m as any).entity === ChatMessageEntity.AGENT_SESSION)
                .map(m => (m as AgentSessionMessage).agentSession.sessionId)
            );
            (comp as any).setSuppressInlineChildIds?.(topLevelIds);
            logger.info('ChatView: rendering top-level agent session', {
              sid,
              topLevelCount: topLevelIds.size,
              nestedChildCount: this.#nestedChildSessionIds.size,
            });
            return html`${comp}`;
          }
        case ChatMessageEntity.TOOL_RESULT:
          {
            const toolResultMessage = message as (ToolResultMessage & { orphaned?: boolean });
            if (toolResultMessage.isFromConfigurableAgent) {
              return html``;
            }
            if (toolResultMessage.orphaned) {
              return renderToolResultMessage(toolResultMessage);
            }
            return html``;
          }
        case ChatMessageEntity.MODEL:
          {
            // Cast to the potentially combined type
            const modelMessage = message as (ModelChatMessage & { resultText?: string, isError?: boolean, resultError?: string, combined?: boolean });

            // Hide tool calls that are part of agent sessions
            if (modelMessage.action === 'tool') {
              const isPartOfSession = this.#isPartOfAgentSession(modelMessage);
              if (isPartOfSession) {
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
              const structuredResponse = parseStructuredResponse(modelMessage.answer || '');
              
              if (structuredResponse) {
                return this.#renderStructuredResponse(structuredResponse, combinedIndex);
              } else {
                // Regular final answer -> delegate to renderer
                return renderModelMessage(modelMessage as any, this.#markdownRenderer);
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
            const icon = ToolDescriptionFormatter.getToolIcon(toolName);
            const descriptionData = ToolDescriptionFormatter.getToolDescription(toolName, toolArgs);

            return html``
            // return html`
            //   <!-- Reasoning (if any) displayed above the timeline -->
            //   ${toolReasoning ? html`
            //     <div class="message-text reasoning-text" style="margin-bottom: 8px;">
            //       ${renderMarkdown(toolReasoning, this.#markdownRenderer, this.#openInAIAssistantViewer.bind(this))}
            //     </div>
            //   ` : Lit.nothing}

            //   <!-- Timeline Tool Execution -->
            //   <div class="agent-execution-timeline single-tool">
            //     <!-- Tool Header -->
            //     <div class="agent-header">
            //       <div class="agent-marker"></div>
            //       <div class="agent-title">${descriptionData.action}</div>
            //       <div class="agent-divider"></div>
            //         <button class="tool-toggle" @click=${(e: Event) => this.#toggleToolResult(e)}>
            //           <span class="toggle-icon">▼</span>
            //         </button>
            //     </div>
                
            //     <div class="timeline-items" style="display: none;">
            //       <div class="timeline-item">
            //         <div class="tool-line">
            //           ${descriptionData.isMultiLine ? html`
            //             <div class="tool-summary">
            //               <span class="tool-description">
            //                 <span class="tool-description-indicator">└─</span>
            //                 <div>${(descriptionData.content as Array<{key: string, value: string}>)[0]?.value || 'multiple parameters'}</div>
            //               </span>
            //               <span class="tool-status-marker ${status}" title="${status === 'running' ? 'Running' : status === 'completed' ? 'Completed' : status === 'error' ? 'Error' : 'Unknown'}">●</span>
            //             </div>
            //           ` : html`
            //             <span class="tool-description">
            //               <span class="tool-description-indicator">└─</span>
            //               <div>${descriptionData.content}</div>
            //             </span>
            //             <span class="tool-status-marker ${status}" title="${status === 'running' ? 'Running' : status === 'completed' ? 'Completed' : status === 'error' ? 'Error' : 'Unknown'}">●</span>
            //           `}
            //         </div>
                    
            //         <!-- Result Block - Integrated within timeline item -->
            //         ${isCombined && resultText ? html`
            //           <div class="tool-result-integrated ${status}">
            //             Response:
            //             ${this.#formatJsonWithSyntaxHighlighting(resultText)}
            //           </div>
            //         ` : Lit.nothing}
            //       </div>
            //     </div>
                
            //     <!-- Loading spinner for running tools -->
            //     ${status === 'running' ? html`
            //       <div class="tool-loading">
            //         <svg class="loading-spinner" width="16" height="16" viewBox="0 0 16 16">
            //           <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="30 12" stroke-linecap="round">
            //             <animateTransform 
            //               attributeName="transform" 
            //               attributeType="XML" 
            //               type="rotate" 
            //               from="0 8 8" 
            //               to="360 8 8" 
            //               dur="1s" 
            //               repeatCount="indefinite" />
            //           </circle>
            //         </svg>
            //       </div>
            //     ` : Lit.nothing}

            //     <!-- Error messages -->
            //     ${modelMessage.error ? html`<div class="message-error tool-error-message">Model Error: ${modelMessage.error}</div>` : Lit.nothing}
            //   </div>
            // `;
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
    const lastIsFinal = lastMessage?.entity === ChatMessageEntity.MODEL && (lastMessage as any).action === 'final';
    // Session-aware loading: keep spinner while any agent session is running,
    // or (for non-agent flows) until we see a final model message.
    const anyAgentRunning = this.#messages.some(m =>
      (m as any).entity === ChatMessageEntity.AGENT_SESSION &&
      ((m as any as AgentSessionMessage).agentSession?.status === 'running')
    );

    // All messages are rendered directly now, including AgentSessionMessage
    let messagesToRender = this.#messages;

    // Build a set of nested child session IDs present in the current message set.
    // Include both nestedSessions[].sessionId and any handoff anchors in messages that
    // have a concrete nestedSessionId (ignore pending-* placeholders). Also build
    // a set of pending handoff target agent names to suppress interim top-level renders.
    this.#nestedChildSessionIds = new Set();
    this.#pendingHandoffTargets = new Set();
    const collectNested = (s: AgentSession | any) => {
      if (!s) return;
      // Record child sessions from nestedSessions
      if (Array.isArray(s.nestedSessions)) {
        for (const child of s.nestedSessions) {
          if (child?.sessionId) {
            this.#nestedChildSessionIds.add(child.sessionId);
          }
          collectNested(child);
        }
      }
      // Record concrete anchors from handoff messages in the timeline (if available)
      if (Array.isArray(s.messages)) {
        for (const msg of s.messages) {
          if (msg?.type === 'handoff') {
            const nestedId = (msg.content as any)?.nestedSessionId;
            if (typeof nestedId === 'string' && !nestedId.startsWith('pending-')) {
              this.#nestedChildSessionIds.add(nestedId);
            } else if (typeof nestedId === 'string' && nestedId.startsWith('pending-')) {
              const targetAgent = (msg.content as any)?.targetAgent as string | undefined;
              if (targetAgent) {
                this.#pendingHandoffTargets.add(targetAgent);
              }
            }
          }
        }
      }
    };
    for (const m of this.#messages) {
      if ((m as any).entity === ChatMessageEntity.AGENT_SESSION) {
        const sess = (m as any as AgentSessionMessage).agentSession;
        collectNested(sess);
      }
    }
    try {
      const topLevelIds = this.#messages
        .filter(m => (m as any).entity === ChatMessageEntity.AGENT_SESSION)
        .map(m => (m as any as AgentSessionMessage).agentSession.sessionId);
      logger.info('ChatView: agent sessions overview', {
        topLevelSessionIds: topLevelIds,
        nestedChildSessionIds: Array.from(this.#nestedChildSessionIds),
        pendingHandoffTargets: Array.from(this.#pendingHandoffTargets),
      });
    } catch {}

    // Combine tool calls and results using helper
    const combinedMessages = combineMessages(messagesToRender) as CombinedMessage[];
    this.#combinedMessagesCache = combinedMessages;


    // General loading state: show while processing unless we have a final model message
    // or (for agent flows) no sessions are running anymore.
    const showGeneralLoading = this.#state === State.LOADING && (anyAgentRunning || !lastIsFinal);

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
              <ai-oauth-connect
                .visible=${true}
                @oauth-login=${this.#handleOAuthLogin.bind(this)}
                @openai-setup=${this.#handleOpenAISetup.bind(this)}
                @manual-setup=${this.#handleManualSetup.bind(this)}
              ></ai-oauth-connect>
            ` : this.#renderInputBar(true)}
          </div>
        </div>
      `, this.#shadow, {host: this});
    } else {
      // Render normal expanded view for conversation
      Lit.render(html`
        <div class="chat-view-container expanded-view">
          ${this.#renderVersionBanner()}
          <ai-message-list .messages=${[]} .state=${this.#state} .agentViewMode=${this.#agentViewMode}>
            ${Lit.Directives.repeat(
              combinedMessages || [],
              (m, i) => this.#messageKey(m, i),
              (m, i) => this.#renderMessage(m, i)
            )}

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
            ${showActionsRow ? renderGlobalActionsRow({
              textToCopy: lastModelAnswer || '',
              onCopy: () => this.#copyToClipboard(lastModelAnswer || ''),
              onThumbsUp: () => this.dispatchEvent(new CustomEvent('feedback', { bubbles: true, detail: { value: 'up' } })),
              onThumbsDown: () => this.dispatchEvent(new CustomEvent('feedback', { bubbles: true, detail: { value: 'down' } })),
              onRetry: () => this.dispatchEvent(new CustomEvent('retry', { bubbles: true }))
            }) : Lit.nothing}
          </ai-message-list>
          ${this.#renderInputBar(false)}
          
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
        const yamlFormatted = ToolDescriptionFormatter.formatValueForDisplay(parsed);
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

  // Render model selector via dedicated component
  #renderModelSelectorInline() {
    if (!this.#modelOptions || !this.#modelOptions.length || !this.#selectedModel || !this.#onModelChanged) {
      return '';
    }
    return html`
      <ai-model-selector
        .options=${this.#modelOptions}
        .selected=${this.#selectedModel}
        .disabled=${this.#isModelSelectorDisabled}
        @change=${(e: CustomEvent) => {
          const value = (e.detail && (e.detail as any).value) as string | undefined;
          if (!value) return;
          if (this.#onModelChanged) {
            this.#onModelChanged(value);
          }
        }}
        @model-selector-focus=${() => {
          if (this.#onModelSelectorFocus) {
            this.#onModelSelectorFocus();
          }
        }}
      ></ai-model-selector>
    `;
  }

  // Render the input bar (DRY across centered and expanded views)
  #renderInputBar(centered: boolean): Lit.TemplateResult {
    return html`
      <ai-input-bar
        .placeholder=${this.#inputPlaceholder}
        .disabled=${this.#isInputDisabled}
        .sendDisabled=${this.#isTextInputEmpty || this.#isInputDisabled}
        .imageInput=${this.#imageInput}
        .modelOptions=${this.#modelOptions}
        .selectedModel=${this.#selectedModel}
        .modelSelectorDisabled=${this.#isModelSelectorDisabled}
        .selectedPromptType=${this.#selectedPromptType}
        .agentButtonsHandler=${this.#handlePromptButtonClickBound}
        .centered=${centered}
        @send=${this.#handleChatInputSend.bind(this)}
        @inputchange=${this.#handleChatInputChange.bind(this)}
        @image-clear=${() => this.#onImageInputClear && this.#onImageInputClear()}
        @model-changed=${(e: Event) => {
          const val = (e as CustomEvent).detail?.value as string | undefined;
          if (val && this.#onModelChanged) this.#onModelChanged(val);
        }}
        @model-selector-focus=${() => this.#onModelSelectorFocus && this.#onModelSelectorFocus()}
      ></ai-input-bar>
    `;
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

  // Model selector behaviors delegated to <ai-model-selector>

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

  // Method to render version banner (delegates to component)
  #renderVersionBanner(): Lit.TemplateResult {
    if (!this.#versionInfo || !this.#versionInfo.isUpdateAvailable || this.#isVersionBannerDismissed || this.#messages.length > 1) {
      return html``;
    }
    return html`<ai-version-banner
      .info=${this.#versionInfo}
      .dismissed=${this.#isVersionBannerDismissed}
      @dismiss=${this.#dismissVersionBanner.bind(this)}
    ></ai-version-banner>`;
  }

  // Method to parse structured response with reasoning and markdown_report XML tags
  // parseStructuredResponse moved to core/structured_response.ts

  // Render structured response with last-message-only auto-processing
  #renderStructuredResponse(structuredResponse: {reasoning: string, markdownReport: string}, combinedIndex?: number): Lit.TemplateResult {
    const { aiState, isLastMessage } = this.#structuredController.computeStateAndMaybeOpen(
      structuredResponse,
      combinedIndex || 0,
      this.#combinedMessagesCache as any
    );
    return renderStructuredResponseUI(structuredResponse, { aiState, isLastMessage }, this.#markdownRenderer);
  }

  // Presentational structured response handled by StructuredResponseRender
  // Auto-open behavior delegated to StructuredResponseController
  /**
   * Toggle between simplified and enhanced agent view
   */
  #toggleAgentView(): void {
    this.#agentViewMode = this.#agentViewMode === 'simplified' ? 'enhanced' : 'simplified';
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  // Stable key for message list rendering to avoid node reuse glitches
  #messageKey(m: CombinedMessage, index: number): string {
    // Agent sessions keyed by sessionId to ensure distinct component instances render
    if ((m as any).entity === ChatMessageEntity.AGENT_SESSION) {
      const sessionId = (m as any).agentSession?.sessionId;
      return sessionId ? `agent:${sessionId}` : `agent:index:${index}`;
    }
    // Model tool calls keyed by toolCallId if present, final answers by index
    if ((m as any).entity === ChatMessageEntity.MODEL) {
      const action = (m as any).action;
      if (action === 'tool') {
        const tId = (m as any).toolCallId;
        return tId ? `model-tool:${tId}` : `model-tool:${(m as any).toolName || 'unknown'}:${index}`;
      }
      return `model:${action}:${index}`;
    }
    // Tool results keyed by toolCallId/name when orphaned
    if ((m as any).entity === ChatMessageEntity.TOOL_RESULT) {
      const tId = (m as any).toolCallId;
      return tId ? `tool-result:${tId}` : `tool-result:${(m as any).toolName || 'unknown'}:${index}`;
    }
    // User and others
    return `msg:${(m as any).entity}:${index}`;
  }

  // (Removed unused #toggleToolDetails; replaced by stateful rendering patterns)

  // Removed direct DOM toggling; use state-driven rendering instead

  // Agent timeline and enhanced views are handled by LiveAgentSessionComponent.
  // The legacy, unused render helpers have been removed from ChatView to reduce duplication.

}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-chat-view': ChatView;
  }
}

// Local type alias for combined messages to improve readability
type CombinedMessage =
  | ChatMessage
  | (ModelChatMessage & { resultText?: string; isError?: boolean; resultError?: string; combined?: boolean })
  | (ToolResultMessage & { orphaned?: boolean });
