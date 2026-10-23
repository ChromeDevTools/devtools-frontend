// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/spinners/spinners.js';
import '../../ui/components/tooltips/tooltips.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as CommonPanels from '../common/common.js';

import commentsPaneStyles from './commentsPane.css.js';

const {html, render, Directives: {repeat}} = Lit;
const {widget} = UI.Widget;
const {computeCommentTitle} = CommonPanels.CommentThreadWidget;
type Title = CommonPanels.CommentThreadWidget.Title;

const UIStrings = {
  /**
   * @description Tooltip text for clearing all comments.
   */
  clearComments: 'Clear all comments',
  /**
   * @description Text displayed when there are no queued comments to show in the queued tab of the Comments panel.
   */
  noQueuedComments: 'No queued comments. Add comments on elements in DevTools to send to your AI coding agent.',
  /**
   * @description Text displayed when there are no sent comments to show in the sent tab of the Comments panel.
   */
  noSentComments: 'No sent comments. Send comments to your AI coding agent to see them here.',
  /**
   * @description Tooltip and aria-label for deleting a comment thread.
   */
  deleteComment: 'Delete comment',
  /**
   * @description Button text for sending comments to the agent.
   */
  sendToAgent: 'Send to Agent',
  /**
   * @description Status text shown next to a spinner when a comment thread is being processed by the agent.
   */
  working: 'Working',
  /**
   * @description Button text shown on resolved comment threads to view the agent response.
   */
  seeResponse: 'See response',
  /**
   * @description Tab label for queued comments in the comments drawer.
   */
  queued: 'Queued',
  /**
   * @description Tab label for sent and resolved comments in the comments drawer.
   */
  sent: 'Sent',
} as const;

const UIStringsNotTranslate = {
  /**
   * @description Disclaimer text in the comments pane info tooltip.
   */
  inputDisclaimer:
      'Comment strings, DOM hierarchy snippets, tracked CSS and DOM changes, Visual Element (VE) paths and signatures, and tracked presenter changes are sent to the connected third-party agent to assist with debugging and code updates',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/comments/CommentsPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const lockedString = i18n.i18n.lockedString;

export type Tab = 'queued'|'sent';

export interface ThreadViewData {
  thread: CommentManager.CommentManager.CommentThread;
  title: Title;
  commentText: string;
}

export interface ViewInput {
  activeTab: Tab;
  threads: ThreadViewData[];
  onTabSelect: (tab: Tab) => void;
  onClearAll: () => void;
  onThreadClick: (thread: CommentManager.CommentManager.CommentThread) => void;
  onDeleteThread: (threadId: string) => void;
  onSendToAgent: () => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

function renderThreadStatus(
    thread: CommentManager.CommentManager.CommentThread,
    onDeleteThread: (threadId: string) => void,
    ): Lit.LitTemplate {
  // clang-format off
  switch (thread.status) {
    case 'SENT_TO_AGENT':
      return html`
        <div class="thread-status-working">
          <devtools-spinner></devtools-spinner>
          <span>${i18nString(UIStrings.working)}</span>
        </div>
      `;
    case 'RESOLVED':
      return html`
        <devtools-button
          .data=${{
            variant: Buttons.Button.Variant.TEXT,
            jslogContext: 'comments-see-response',
          } as Buttons.Button.ButtonData}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
            }
          }}
        >${i18nString(UIStrings.seeResponse)}</devtools-button>
      `;
    case 'ACTIVE':
      return html`
        <devtools-button
          .data=${{
            variant: Buttons.Button.Variant.ICON,
            iconName: 'bin',
            title: i18nString(UIStrings.deleteComment),
            jslogContext: 'delete',
          } as Buttons.Button.ButtonData}
          @click=${(e: Event) => {
            e.stopPropagation();
            onDeleteThread(thread.id);
          }}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
            }
          }}
        ></devtools-button>
      `;
    default:
      return Lit.nothing;
  }
  // clang-format on
}

export const DEFAULT_VIEW: View = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  const isQueued = input.activeTab === 'queued';
  const isSent = input.activeTab === 'sent';
  // clang-format off
  render(html`
    <style>${commentsPaneStyles}</style>
    <div class="comments-container" role="region" aria-label="Comments" jslog=${VisualLogging.panel('comments').track({resize: true})}>
      <div class="comments-toolbar" role="toolbar" jslog=${VisualLogging.toolbar('comments-drawer')}>
        <div class="toolbar-left" role="tablist">
          <button
            class="tab-button ${isQueued ? 'active' : ''}"
            role="tab"
            aria-selected=${isQueued}
            @click=${() => input.onTabSelect('queued')}
            jslog=${VisualLogging.sectionHeader('queued').track({ click: true })}>
            ${i18nString(UIStrings.queued)}
          </button>
          <button
            class="tab-button ${isSent ? 'active' : ''}"
            role="tab"
            aria-selected=${isSent}
            @click=${() => input.onTabSelect('sent')}
            jslog=${VisualLogging.sectionHeader('sent').track({ click: true })}>
            ${i18nString(UIStrings.sent)}
          </button>
        </div>
        <button
          class="toolbar-button"
          title=${i18nString(UIStrings.clearComments)}
          aria-label=${i18nString(UIStrings.clearComments)}
          @click=${input.onClearAll}
          jslog=${VisualLogging.action('clear-comments').track({ click: true })}>
          <devtools-icon name="clear"></devtools-icon>
        </button>
      </div>

      ${input.threads.length === 0 ? html`
        <div class="comments-empty-state">
          <p>${isQueued ? i18nString(UIStrings.noQueuedComments) : i18nString(UIStrings.noSentComments)}</p>
        </div>
      ` : html`
        <ul class="comments-list" role="list">
          ${repeat(
            input.threads,
            item => item.thread.id,
            item => html`
              <li
                class="comment-thread-item"
                role="listitem"
                tabindex="0"
                @click=${() => input.onThreadClick(item.thread)}
                @keydown=${(e: KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    input.onThreadClick(item.thread);
                  }
                }}
                jslog=${VisualLogging.item('comment-thread').track({ click: true })}>
                <div class="comment-pin-badge" aria-hidden="true"></div>
                <span class="anchor-chip">
                  ${'node' in item.title ?
                    widget(CommonPanels.DOMLinkifier.DOMNodeLink, { node: item.title.node, options: { preventKeyboardFocus: true } }) :
                    html`<span class="anchor-chip-text">${item.title.text}</span>`}
                </span>
                <div class="comment-text">${item.commentText}</div>
                ${renderThreadStatus(item.thread, input.onDeleteThread)}
              </li>
            `,
          )}
        </ul>
      `}

      ${isQueued ? html`
        <div class="comments-footer">
          <devtools-icon
            class="info-icon"
            name="info"
            aria-label="Info"
            aria-details="comments-pane-info-tooltip"
            tabindex="0"
          ></devtools-icon>
          <devtools-tooltip
            id="comments-pane-info-tooltip"
            variant="rich"
          >
            <div class="info-tooltip-container">
              ${lockedString(UIStringsNotTranslate.inputDisclaimer)}
            </div>
          </devtools-tooltip>
          <button
            class="send-agent-button"
            ?disabled=${input.threads.length === 0}
            @click=${input.onSendToAgent}
            jslog=${VisualLogging.action('comments-send-to-agent').track({ click: true })}>
            ${i18nString(UIStrings.sendToAgent)}
          </button>
        </div>
      ` : Lit.nothing}
    </div>
  `, target);
  // clang-format on
};

export class CommentsPane extends UI.Widget.Widget {
  static override readonly INJECT: readonly[typeof CommentManager.CommentManager.CommentManager,
  ] =
      [
        CommentManager.CommentManager.CommentManager,
      ] as const;

  readonly #view: View;
  readonly #commentManager: CommentManager.CommentManager.CommentManager;

  readonly #cachedTitles = new Map<string, Title>();
  #activeTab: Tab = 'queued';

  constructor(
      element?: HTMLElement,
      [commentManager]: UI.Widget.WidgetDependencies<typeof CommentsPane> =
          [
            new CommentManager.CommentManager.CommentManager(),
          ],
      view: View = DEFAULT_VIEW,
  ) {
    super(element);
    this.#view = view;
    this.#commentManager = commentManager;
  }

  #onThreadsChanged = (): void => {
    this.requestUpdate();
  };

  override wasShown(): void {
    super.wasShown();
    this.#commentManager.addEventListener(
        CommentManager.CommentManager.Events.COMMENT_THREADS_CHANGED,
        this.#onThreadsChanged,
        this,
    );
    this.requestUpdate();
  }

  override willHide(): void {
    this.#commentManager.removeEventListener(
        CommentManager.CommentManager.Events.COMMENT_THREADS_CHANGED,
        this.#onThreadsChanged,
        this,
    );
    super.willHide();
  }

  #handleTabSelect = (tab: Tab): void => {
    if (this.#activeTab === tab) {
      return;
    }
    this.#activeTab = tab;
    this.requestUpdate();
  };

  #handleClearAll = (): void => {
    this.#cachedTitles.clear();
    this.#commentManager.clear();
    this.requestUpdate();
  };

  #handleThreadClick = (thread: CommentManager.CommentManager.CommentThread): void => {
    void Common.Revealer.reveal(thread);
  };

  #handleDeleteThread = (threadId: string): void => {
    this.#cachedTitles.delete(threadId);
    this.#commentManager.removeCommentThread(threadId);
    this.requestUpdate();
  };

  #handleSendToAgent = (): void => {
    this.#commentManager.sendQueuedThreads();
  };

  override async performUpdate(signal?: AbortSignal): Promise<void> {
    let rawThreads: CommentManager.CommentManager.CommentThread[];
    if (this.#activeTab === 'queued') {
      rawThreads = this.#commentManager.getCommentThreads().filter(thread => thread.status === 'ACTIVE');
    } else {
      rawThreads = this.#commentManager.getCommentThreads().filter(thread => thread.status === 'SENT_TO_AGENT' ||
                                                                       thread.status === 'RESOLVED');
    }

    const threadViewData = await Promise.all(
        rawThreads.map(async thread => {
          let title = this.#cachedTitles.get(thread.id);
          if (!title) {
            title = await computeCommentTitle(thread.anchor);
            this.#cachedTitles.set(thread.id, title);
          }
          return {
            thread,
            title,
            commentText: thread.comments[0]?.text ?? '',
          };
        }),
    );

    if (signal?.aborted) {
      return;
    }

    const viewInput: ViewInput = {
      activeTab: this.#activeTab,
      threads: threadViewData,
      onTabSelect: this.#handleTabSelect,
      onClearAll: this.#handleClearAll,
      onThreadClick: this.#handleThreadClick,
      onDeleteThread: this.#handleDeleteThread,
      onSendToAgent: this.#handleSendToAgent,
    };

    this.#view(viewInput, undefined, this.contentElement);
  }
}
