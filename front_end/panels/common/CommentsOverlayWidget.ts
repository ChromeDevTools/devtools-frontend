// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as Comments from '../../ui/comments/comments.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';

import commentsOverlayStyles from './commentsOverlay.css.js';
import {CommentThreadWidget, computeCommentTitle, type Title} from './CommentThreadWidget.js';

const {
  html,
  render,
  nothing,
  Directives: {classMap, repeat, styleMap},
} = Lit;

export interface ViewInput {
  pins: Comments.CommentOverlayManager.PinPositionData[];
  /**
   * Highlight of the currently open thread. Null when no thread is open, so
   * only pins are rendered.
   */
  activeHighlight: Comments.CommentOverlayManager.HighlightRectData|null;
  hoverHighlight: Comments.CommentOverlayManager.HoverHighlightData|null;
  commentMode: boolean;
  onPinClick: (threadId: string) => void;
  activeThread: CommentManager.CommentManager.CommentThread|null;
  activePin: Comments.CommentOverlayManager.PinPositionData|null;
  fallbackPosition?: {left: number, top: number}|null;
  title: Title;
  onAddComment: (text: string) => void;
  onDeleteQueuedComment: () => void;
  onQueueComment: (text: string) => void;
  onSaveEdit: (text: string) => void;
  onStartEdit: () => void;
}

export type View = (
    input: ViewInput,
    output: undefined,
    target: HTMLElement,
    ) => void;

const POPUP_MARGIN = 8;
const PIN_HEIGHT = 30;
const POPUP_WIDTH = 288;
const POPUP_HEIGHT = 220;
const AUTO_CLOSE_DELAY_MS = 2000;
const COMMENTS_VIEW_ID = 'comments';

const DEFAULT_VIEW: View = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  const popupPosition = input.activePin ?? input.fallbackPosition;
  // clang-format off
  render(html`
    <style>${commentsOverlayStyles}</style>
    <div class="comments-overlay-container">
      ${input.hoverHighlight && input.hoverHighlight.visible ? html`
        <div
          class="comment-hover-highlight"
          style=${styleMap({
            transform: `translate3d(${input.hoverHighlight.left}px, ${input.hoverHighlight.top}px, 0)`,
            width: `${input.hoverHighlight.width}px`,
            height: `${input.hoverHighlight.height}px`,
          })}>
        </div>
      ` : nothing}
      ${input.activeHighlight?.visible && input.activeThread ? html`
        <div
          class=${classMap({
            'comment-anchor-highlight': true,
            resolved: input.activeThread.status === 'RESOLVED',
          })}
          style=${styleMap({
            transform: `translate3d(${input.activeHighlight.left}px, ${input.activeHighlight.top}px, 0)`,
            width: `${input.activeHighlight.width}px`,
            height: `${input.activeHighlight.height}px`,
          })}>
        </div>
      ` : nothing}
      ${repeat(
        input.pins.filter(p => p.visible),
        p => p.id,
        p => html`
          <div
            class="comment-pin"
            aria-hidden="true"
            style=${styleMap({
              transform: `translate3d(${p.left}px, ${p.top}px, 0)`,
            })}
            @click=${() => input.onPinClick(p.id)}>
            <div class="comment-cursor"></div>
          </div>
        `,
      )}
      ${popupPosition && input.activeThread ? repeat(
        [{position: popupPosition, thread: input.activeThread}],
        item => item.thread.id,
        item => {
          // Clamp horizontal position so the popup stays within the viewport with POPUP_MARGIN padding.
          const popupLeft = Math.min(
            Math.max(POPUP_MARGIN, item.position.left),
            Math.max(POPUP_MARGIN, target.clientWidth - POPUP_WIDTH - POPUP_MARGIN),
          );
          // When anchored to a pin (`activePin`), place the popup below the pin (`top + PIN_HEIGHT`).
          // When unanchored (`fallbackPosition` from a drawer row), place the anchor point just above
          // the row (`top - POPUP_MARGIN`) and shift the popup up by its own height via `translateY(-100%)`.
          const topOffset = input.activePin ? item.position.top + PIN_HEIGHT : item.position.top - POPUP_MARGIN;
          const maxTop = target.clientHeight - (input.activePin ? POPUP_HEIGHT : POPUP_MARGIN);
          const popupTop = Math.min(Math.max(POPUP_MARGIN, topOffset), Math.max(POPUP_MARGIN, maxTop));
          return html`
            <div
              class="comment-popup-widget"
              style=${styleMap({
                transform: `translate3d(${popupLeft}px, ${popupTop}px, 0)${input.activePin ? '' : ' translateY(-100%)'}`,
              })}>
              ${UI.Widget.widget(CommentThreadWidget, {
                title: input.title,
                comments: [...item.thread.comments],
                status: item.thread.status,
                transmitted: item.thread.transmitted,
                onAddComment: input.onAddComment,
                onDeleteQueuedComment: input.onDeleteQueuedComment,
                onQueueComment: input.onQueueComment,
                onSaveEdit: input.onSaveEdit,
                onStartEdit: input.onStartEdit,
              })}
            </div>
          `;
        },
      ) : nothing}
    </div>
  `, target);
  // clang-format on
};

function isEventInsidePopupOrPin(event: Event): boolean {
  const composedTarget = event.composedPath()[0];
  const target = composedTarget instanceof Element ? composedTarget : event.target;
  return target instanceof Element &&
      Boolean(Comments.CommentAnchorResolver.closestAcrossShadow(target, '.comment-popup-widget, .comment-pin'));
}

export class CommentsOverlayWidget extends UI.Widget.Widget {
  static override readonly INJECT: readonly[typeof CommentManager.CommentManager.CommentManager] =
      [CommentManager.CommentManager.CommentManager] as const;

  readonly #view: View;
  readonly #commentManager: CommentManager.CommentManager.CommentManager;
  #commentOverlayManager: Comments.CommentOverlayManager.CommentOverlayManager;
  #activeThreadId: string|null = null;
  #fallbackPosition: {left: number, top: number}|null = null;
  #closeTimeoutId: number|null = null;
  #cachedTitle: Title = {text: ''};
  #cachedTitleAnchor: CommentManager.CommentManager.CommentAnchorSignature|null = null;

  #setActiveThreadId(threadId: string|null): void {
    this.#fallbackPosition = null;
    if (this.#activeThreadId !== threadId) {
      this.#clearCloseTimeout();
      this.#activeThreadId = threadId;
      if (threadId && this.isShowing()) {
        document.documentElement.addEventListener('keydown', this.#onKeyDown);
        document.documentElement.addEventListener('click', this.#onClickOutside, {capture: true});
      } else {
        document.documentElement.removeEventListener('keydown', this.#onKeyDown);
        document.documentElement.removeEventListener('click', this.#onClickOutside, {capture: true});
      }
    }
  }

  constructor(
      element: HTMLElement|undefined,
      [commentManager]: UI.Widget.WidgetDependencies<typeof CommentsOverlayWidget>,
      view: View = DEFAULT_VIEW,
  ) {
    super(element, {useShadowDom: false});
    this.#view = view;
    this.#commentManager = commentManager;
    this.#commentOverlayManager = new Comments.CommentOverlayManager.CommentOverlayManager(
        this.#commentManager,
    );
  }

  setOverlayManagerForTest(overlayManager: Comments.CommentOverlayManager.CommentOverlayManager): void {
    this.#commentOverlayManager = overlayManager;
  }

  override wasShown(): void {
    super.wasShown();
    this.#commentOverlayManager.start();
    this.#commentOverlayManager.addEventListener(
        Comments.CommentOverlayManager.Events.POSITIONS_UPDATED,
        this.#onPositionsUpdated,
        this,
    );
    this.#commentOverlayManager.addEventListener(
        Comments.CommentOverlayManager.Events.HOVER_HIGHLIGHT_CHANGED,
        this.#onHoverHighlightChanged,
        this,
    );

    this.#commentManager.addEventListener(
        CommentManager.CommentManager.Events.COMMENT_THREADS_CHANGED,
        this.#onStateChanged,
        this,
    );
    this.#commentManager.addEventListener(
        CommentManager.CommentManager.Events.COMMENT_MODE_CHANGED,
        this.#onCommentModeChanged,
        this,
    );
    this.#commentManager.addEventListener(
        CommentManager.CommentManager.Events.AGENT_ATTACHED_CHANGED,
        this.#onAgentAttachedChanged,
        this,
    );
    if (this.#activeThreadId) {
      document.documentElement.addEventListener('keydown', this.#onKeyDown);
      document.documentElement.addEventListener('click', this.#onClickOutside, {capture: true});
    }

    this.requestUpdate();
  }

  override willHide(): void {
    this.#clearCloseTimeout();
    document.documentElement.removeEventListener('keydown', this.#onKeyDown);
    document.documentElement.removeEventListener('click', this.#onClickOutside, {capture: true});
    this.#commentOverlayManager.stop();
    this.#commentOverlayManager.removeEventListener(
        Comments.CommentOverlayManager.Events.POSITIONS_UPDATED,
        this.#onPositionsUpdated,
        this,
    );
    this.#commentOverlayManager.removeEventListener(
        Comments.CommentOverlayManager.Events.HOVER_HIGHLIGHT_CHANGED,
        this.#onHoverHighlightChanged,
        this,
    );

    this.#commentManager.removeEventListener(
        CommentManager.CommentManager.Events.COMMENT_THREADS_CHANGED,
        this.#onStateChanged,
        this,
    );
    this.#commentManager.removeEventListener(
        CommentManager.CommentManager.Events.COMMENT_MODE_CHANGED,
        this.#onCommentModeChanged,
        this,
    );
    this.#commentManager.removeEventListener(
        CommentManager.CommentManager.Events.AGENT_ATTACHED_CHANGED,
        this.#onAgentAttachedChanged,
        this,
    );

    super.willHide();
  }

  #clearCloseTimeout(): void {
    if (this.#closeTimeoutId !== null) {
      window.clearTimeout(this.#closeTimeoutId);
      this.#closeTimeoutId = null;
    }
  }

  #onAgentAttachedChanged(
      event: Common.EventTarget.EventTargetEvent<
          CommentManager.CommentManager.EventTypes[CommentManager.CommentManager.Events.AGENT_ATTACHED_CHANGED]>,
      ): void {
    if (!event.data) {
      this.#setActiveThreadId(null);
    }
    this.requestUpdate();
  }

  #onCommentModeChanged(
      event: Common.EventTarget.EventTargetEvent<
          CommentManager.CommentManager.EventTypes[CommentManager.CommentManager.Events.COMMENT_MODE_CHANGED]>,
      ): void {
    const isModeActive = event.data;
    if (!isModeActive) {
      this.#setActiveThreadId(null);
    }
    const action = UI.ActionRegistry.ActionRegistry.instance().getAction(
        'comments.toggle-comment-mode',
    );
    action?.setToggled(isModeActive);
    this.requestUpdate();
  }

  #syncActiveThreadFromManager(): void {
    const draftThread = this.#commentManager.getCommentThreads().find(t => t.status === 'DRAFT');
    if (draftThread) {
      this.#setActiveThreadId(draftThread.id);
    } else if (this.#activeThreadId && !this.#commentManager.getCommentThread(this.#activeThreadId)) {
      this.#setActiveThreadId(null);
    }
  }

  #onPositionsUpdated(
      event: Common.EventTarget.EventTargetEvent<
          Comments.CommentOverlayManager.EventTypes[Comments.CommentOverlayManager.Events.POSITIONS_UPDATED]>,
      ): void {
    this.#syncActiveThreadFromManager();
    if (event.data.isRealtimeSync && this.isShowing() && this.#trySynchronousRender()) {
      return;
    }
    this.requestUpdate();
  }

  #onHoverHighlightChanged(): void {
    this.#syncActiveThreadFromManager();
    if (this.isShowing() && this.#trySynchronousRender()) {
      return;
    }
    this.requestUpdate();
  }

  #onStateChanged(): void {
    this.#syncActiveThreadFromManager();
    this.requestUpdate();
  }

  #trySynchronousRender(): boolean {
    if (!this.#commentManager.isAgentAttached()) {
      this.#renderDisconnectedView();
      return true;
    }
    const activeThread =
        this.#activeThreadId ? this.#commentManager.getCommentThread(this.#activeThreadId) ?? null : null;
    const anchor = activeThread?.anchor ?? null;
    if (anchor === null) {
      this.#cachedTitleAnchor = null;
      this.#cachedTitle = {text: ''};
      this.#renderWithTitle(activeThread, this.#cachedTitle);
      return true;
    }
    if (anchor === this.#cachedTitleAnchor) {
      this.#renderWithTitle(activeThread, this.#cachedTitle);
      return true;
    }
    return false;
  }

  async #getOrComputeTitle(anchor: CommentManager.CommentManager.CommentAnchorSignature|null): Promise<Title> {
    if (anchor === this.#cachedTitleAnchor) {
      return this.#cachedTitle;
    }
    const title = anchor ? await computeCommentTitle(anchor) : {text: ''};
    this.#cachedTitleAnchor = anchor;
    this.#cachedTitle = title;
    return title;
  }

  #handlePinClick = (threadId: string): void => {
    if (this.#activeThreadId === threadId) {
      this.#handleCloseCommentThread();
      return;
    }

    this.#commentOverlayManager.clearDraftThreads();
    this.#setActiveThreadId(threadId);
    this.requestUpdate();
  };

  #handleCloseCommentThread = (): void => {
    if (!this.#activeThreadId) {
      return;
    }
    const thread = this.#commentManager.getCommentThread(this.#activeThreadId);
    if (thread?.status === 'DRAFT') {
      this.#commentOverlayManager.clearDraftThreads();
    }
    this.#setActiveThreadId(null);
    this.requestUpdate();
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    if (this.#activeThreadId && event.key === 'Escape' && !event.isComposing) {
      event.consume(true);
      this.#handleCloseCommentThread();
    }
  };

  #onClickOutside = (event: MouseEvent): void => {
    if (!this.#activeThreadId || isEventInsidePopupOrPin(event)) {
      return;
    }
    this.#handleCloseCommentThread();
  };

  #renderDisconnectedView(): void {
    this.#view(
        {
          pins: [],
          activeHighlight: null,
          hoverHighlight: null,
          commentMode: false,
          onPinClick: this.#handlePinClick,
          activeThread: null,
          activePin: null,
          title: {text: ''},
          onAddComment: () => {},
          onDeleteQueuedComment: () => {},
          onQueueComment: () => {},
          onSaveEdit: () => {},
          onStartEdit: () => {},
        },
        undefined,
        this.contentElement,
    );
  }

  #renderWithTitle(
      activeThread: CommentManager.CommentManager.CommentThread|null,
      title: Title,
      ): void {
    const pins = this.#commentOverlayManager.getPinPositions();
    const activePin = this.#activeThreadId ? pins.find(p => p.id === this.#activeThreadId) ?? null : null;
    const activeHighlight =
        this.#activeThreadId ? this.#commentOverlayManager.getHighlight(this.#activeThreadId) ?? null : null;

    const viewInput: ViewInput = {
      pins,
      activeHighlight,
      hoverHighlight: this.#commentOverlayManager.getHoverHighlight(),
      commentMode: this.#commentManager.isCommentMode(),
      onPinClick: this.#handlePinClick,
      activeThread,
      activePin,
      fallbackPosition: this.#fallbackPosition,
      title,
      onAddComment: (text: string) => {
        if (!activeThread) {
          return;
        }
        activeThread.sendToAgent(text);
        this.#scheduleAutoClose(activeThread.id);
      },
      onDeleteQueuedComment: () => {
        if (!activeThread) {
          return;
        }

        this.#commentOverlayManager.removeCommentThread(activeThread.id);
      },
      onQueueComment: (text: string) => {
        if (!activeThread) {
          return;
        }
        activeThread.save(text);
        this.#scheduleAutoClose(activeThread.id);
      },
      onSaveEdit: (text: string) => {
        if (!activeThread) {
          return;
        }
        activeThread.editComment(text);
      },
      onStartEdit: () => this.#clearCloseTimeout(),
    };
    this.#view(viewInput, undefined, this.contentElement);
  }

  #scheduleAutoClose(threadId: string): void {
    this.#clearCloseTimeout();
    this.#closeTimeoutId = window.setTimeout(() => {
      this.#closeTimeoutId = null;
      if (this.#activeThreadId === threadId) {
        this.#setActiveThreadId(null);
        this.requestUpdate();
      }
    }, AUTO_CLOSE_DELAY_MS);
  }

  override async performUpdate(signal?: AbortSignal): Promise<void> {
    if (!this.#commentManager.isAgentAttached()) {
      this.#renderDisconnectedView();
      return;
    }

    const activeThread =
        this.#activeThreadId ? this.#commentManager.getCommentThread(this.#activeThreadId) ?? null : null;
    const anchor = activeThread?.anchor ?? null;
    let title: Title;
    if (anchor === null) {
      this.#cachedTitleAnchor = null;
      this.#cachedTitle = {text: ''};
      title = this.#cachedTitle;
    } else if (anchor === this.#cachedTitleAnchor) {
      title = this.#cachedTitle;
    } else {
      title = await this.#getOrComputeTitle(anchor);
      signal?.throwIfAborted();
    }

    this.#renderWithTitle(activeThread, title);
  }

  openThread(threadId: string, fallbackPosition?: {left: number, top: number}): void {
    this.#clearCloseTimeout();
    this.#commentOverlayManager.clearDraftThreads();
    this.#setActiveThreadId(threadId);
    this.#fallbackPosition = fallbackPosition ?? null;
    this.requestUpdate();
  }
}

let widgetInstance: CommentsOverlayWidget|null = null;

function getOrCreateOverlayWidget(
    commentManager?: CommentManager.CommentManager.CommentManager,
    ): CommentsOverlayWidget {
  if (!widgetInstance) {
    const cm = commentManager ??
        Root.DevToolsContext.globalInstance().get(
            CommentManager.CommentManager.CommentManager,
        );
    widgetInstance = new CommentsOverlayWidget(undefined, [cm]);
    widgetInstance.markAsRoot();
    widgetInstance.show(document.body);
  }
  return widgetInstance;
}

export class ThreadRevealer implements Common.Revealer.Revealer<CommentManager.CommentThread.RevealableThread> {
  async reveal({thread, position}: CommentManager.CommentThread.RevealableThread): Promise<void> {
    const panelId = Comments.CommentAnchorResolver.extractPanelId(thread.anchor.vePath);
    if (panelId && UI.InspectorView.InspectorView.instance().hasPanel(panelId)) {
      await UI.InspectorView.InspectorView.instance().showPanel(panelId);
    }

    const element = Comments.CommentAnchorResolver.rematchCommentAnchor(thread);
    thread.setOrphaned(!element);
    if (element) {
      element.scrollIntoView({block: 'center', inline: 'nearest', behavior: 'smooth'});
    }

    const overlay = getOrCreateOverlayWidget();
    overlay.openThread(thread.id, position);
  }
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  readonly #commentManager: CommentManager.CommentManager.CommentManager;

  constructor(commentManager?: CommentManager.CommentManager.CommentManager) {
    this.#commentManager = commentManager ??
        Root.DevToolsContext.globalInstance().get(
            CommentManager.CommentManager.CommentManager,
        );
  }

  handleAction(_context: UI.Context.Context, actionId: string): boolean {
    if (actionId === 'comments.toggle-comment-mode') {
      if (!this.#commentManager.isAgentAttached()) {
        return false;
      }
      getOrCreateOverlayWidget(this.#commentManager);
      const enteringCommentMode = !this.#commentManager.isCommentMode();
      this.#commentManager.setCommentMode(enteringCommentMode);
      this.#revealCommentsView(enteringCommentMode);
      return true;
    }
    return false;
  }

  /**
   * When entering comment mode with the drawer open, add the Comments tab to
   * the drawer without selecting it or moving focus away from the page being
   * commented on. When leaving comment mode, always open the drawer on the
   * Comments tab, as checking the responses is the likely next step.
   */
  #revealCommentsView(enteringCommentMode: boolean): void {
    const viewManager = UI.ViewManager.ViewManager.instance();
    if (!viewManager.hasView(COMMENTS_VIEW_ID)) {
      return;
    }
    if (enteringCommentMode) {
      if (!UI.InspectorView.InspectorView.maybeGetInspectorViewInstance()?.drawerVisible()) {
        return;
      }
      void viewManager.resolveLocation(viewManager.locationNameForViewId(COMMENTS_VIEW_ID)).then(location => {
        return location?.showView(viewManager.view(COMMENTS_VIEW_ID), /* insertBefore */ undefined,
                                  /* userGesture */ false,
                                  /* omitFocus */ true, /* shouldSelectTab */ false);
      });
      return;
    }
    void viewManager.showView(COMMENTS_VIEW_ID, /* userGesture */ true);
  }

  static resetForTest(): void {
    if (widgetInstance) {
      widgetInstance.detach();
      widgetInstance = null;
    }
  }
}

export class ButtonProvider implements UI.Toolbar.Provider {
  readonly #button: UI.Toolbar.ToolbarButton;
  readonly #commentManager: CommentManager.CommentManager.CommentManager;

  constructor(commentManager?: CommentManager.CommentManager.CommentManager) {
    this.#commentManager = commentManager ??
        Root.DevToolsContext.globalInstance().get(
            CommentManager.CommentManager.CommentManager,
        );
    const action = UI.ActionRegistry.ActionRegistry.instance().getAction('comments.toggle-comment-mode');
    action.setEnabled(this.#commentManager.isAgentAttached());
    this.#button = UI.Toolbar.Toolbar.createActionButton(action);
    this.#button.setVisible(this.#commentManager.isAgentAttached());
    this.#commentManager.addEventListener(
        CommentManager.CommentManager.Events.AGENT_ATTACHED_CHANGED,
        event => {
          action.setEnabled(event.data);
          this.#button.setVisible(event.data);
        },
    );
  }

  item(): UI.Toolbar.ToolbarItem|null {
    return this.#button;
  }
}
