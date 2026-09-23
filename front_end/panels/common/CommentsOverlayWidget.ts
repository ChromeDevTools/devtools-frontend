// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as Comments from '../../ui/comments/comments.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';

import commentsOverlayStyles from './commentsOverlay.css.js';
import {CommentThreadWidget, type Title} from './CommentThreadWidget.js';

const {
  html,
  render,
  nothing,
  Directives: {repeat, styleMap},
} = Lit;

export interface ViewInput {
  pins: Comments.CommentOverlayManager.PinPositionData[];
  highlights: Comments.CommentOverlayManager.HighlightRectData[];
  hoverHighlight: Comments.CommentOverlayManager.HoverHighlightData|null;
  commentMode: boolean;
  onPinClick: (threadId: string) => void;
  activeThread: CommentManager.CommentManager.CommentThread|null;
  activePin: Comments.CommentOverlayManager.PinPositionData|null;
  title: Title;
  onAddComment: (text: string) => void;
  onCloseCommentThread: () => void;
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

const DEFAULT_VIEW: View = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  // clang-format off
  render(html`
    <style>${commentsOverlayStyles}</style>
    <div class="comments-overlay-container">
      ${input.hoverHighlight && input.hoverHighlight.visible ? html`
        <div
          class="comment-hover-highlight"
          style=${styleMap({
            top: `${input.hoverHighlight.top}px`,
            left: `${input.hoverHighlight.left}px`,
            width: `${input.hoverHighlight.width}px`,
            height: `${input.hoverHighlight.height}px`,
          })}>
        </div>
      ` : nothing}
      ${input.highlights.map(h => h.visible ? html`
        <div
          class="comment-anchor-highlight"
          style=${styleMap({
            top: `${h.top}px`,
            left: `${h.left}px`,
            width: `${h.width}px`,
            height: `${h.height}px`,
          })}>
        </div>
      ` : nothing)}
      ${input.pins.map(p => p.visible ? html`
        <div
          class="comment-pin"
          style=${styleMap({
            top: `${p.top}px`,
            left: `${p.left}px`,
          })}
          @click=${() => input.onPinClick(p.id)}>
          <div class="comment-cursor">${p.index}</div>
        </div>
      ` : nothing)}
      ${input.activePin && input.activeThread ? repeat(
        [{pin: input.activePin, thread: input.activeThread}],
        item => item.thread.id,
        item => html`
          <div
            class="comment-popup-widget"
            style=${styleMap({
              top: `${Math.min(
                Math.max(POPUP_MARGIN, item.pin.top + PIN_HEIGHT),
                Math.max(POPUP_MARGIN, target.clientHeight - POPUP_HEIGHT),
              )}px`,
              left: `${Math.min(
                Math.max(POPUP_MARGIN, item.pin.left),
                Math.max(POPUP_MARGIN, target.clientWidth - POPUP_WIDTH - POPUP_MARGIN),
              )}px`,
            })}>
            ${UI.Widget.widget(CommentThreadWidget, {
              title: input.title,
              comments: [...item.thread.comments],
              onAddComment: input.onAddComment,
              onClose: input.onCloseCommentThread,
            })}
          </div>
        `,
      ) : nothing}
    </div>
  `, target);
  // clang-format on
};

export class CommentsOverlayWidget extends UI.Widget.Widget {
  static override readonly INJECT: readonly[typeof CommentManager.CommentManager.CommentManager] =
      [CommentManager.CommentManager.CommentManager] as const;

  readonly #view: View;
  readonly #commentManager: CommentManager.CommentManager.CommentManager;
  #commentOverlayManager: Comments.CommentOverlayManager.CommentOverlayManager;
  #activeThreadId: string|null = null;
  #closeTimeoutId: number|null = null;
  #cachedTitle: Title = {text: ''};
  #cachedTitleAnchor: CommentManager.CommentManager.CommentAnchorSignature|null = null;

  #setActiveThreadId(threadId: string|null): void {
    if (this.#activeThreadId !== threadId) {
      this.#clearCloseTimeout();
      this.#activeThreadId = threadId;
      if (threadId && this.isShowing()) {
        document.documentElement.addEventListener('keydown', this.#onKeyDown);
      } else {
        document.documentElement.removeEventListener('keydown', this.#onKeyDown);
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
        this.#onStateChanged,
        this,
    );
    this.#commentOverlayManager.addEventListener(
        Comments.CommentOverlayManager.Events.HOVER_HIGHLIGHT_CHANGED,
        this.#onStateChanged,
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
    }

    this.requestUpdate();
  }

  override willHide(): void {
    this.#clearCloseTimeout();
    document.documentElement.removeEventListener('keydown', this.#onKeyDown);
    this.#commentOverlayManager.stop();
    this.#commentOverlayManager.removeEventListener(
        Comments.CommentOverlayManager.Events.POSITIONS_UPDATED,
        this.#onStateChanged,
        this,
    );
    this.#commentOverlayManager.removeEventListener(
        Comments.CommentOverlayManager.Events.HOVER_HIGHLIGHT_CHANGED,
        this.#onStateChanged,
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

  #onStateChanged(): void {
    const draftThread = this.#commentManager.getCommentThreads().find(t => t.status === 'DRAFT');
    if (draftThread) {
      this.#setActiveThreadId(draftThread.id);
    } else if (this.#activeThreadId && !this.#commentManager.getCommentThread(this.#activeThreadId)) {
      this.#setActiveThreadId(null);
    }
    this.requestUpdate();
  }

  async #getOrComputeTitle(anchor: CommentManager.CommentManager.CommentAnchorSignature|null): Promise<Title> {
    if (anchor === this.#cachedTitleAnchor) {
      return this.#cachedTitle;
    }
    const title = anchor ? await this.#computeTitle(anchor) : {text: ''};
    this.#cachedTitleAnchor = anchor;
    this.#cachedTitle = title;
    return title;
  }

  async #computeTitle(anchor: CommentManager.CommentManager.CommentAnchorSignature): Promise<Title> {
    if (anchor.node) {
      const target = SDK.TargetManager.TargetManager.instance().targetById(anchor.node.targetId);
      if (target) {
        const deferredNode = new SDK.DOMModel.DeferredDOMNode(
            target,
            anchor.node.backendNodeId as Protocol.DOM.BackendNodeId,
        );
        const node = await deferredNode.resolvePromise();
        if (node) {
          return {node};
        }
      }
    }

    if (anchor.networkRequestId) {
      const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
      const request = target?.model(SDK.NetworkManager.NetworkManager)?.requestForId(anchor.networkRequestId);
      if (request) {
        return {text: request.name()};
      }
    }

    return {text: anchor.textSignature || ''};
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

  override async performUpdate(signal?: AbortSignal): Promise<void> {
    if (!this.#commentManager.isAgentAttached()) {
      this.#view(
          {
            pins: [],
            highlights: [],
            hoverHighlight: null,
            commentMode: false,
            onPinClick: this.#handlePinClick,
            activeThread: null,
            activePin: null,
            title: {text: ''},
            onAddComment: () => {},
            onCloseCommentThread: this.#handleCloseCommentThread,
          },
          undefined,
          this.contentElement,
      );
      return;
    }

    const activeThread =
        this.#activeThreadId ? this.#commentManager.getCommentThread(this.#activeThreadId) ?? null : null;
    const title = await this.#getOrComputeTitle(activeThread?.anchor ?? null);
    signal?.throwIfAborted();

    const pins = this.#commentOverlayManager.getPinPositions();
    const highlights = this.#commentOverlayManager.getHighlightRects();
    const activePin = this.#activeThreadId ? pins.find(p => p.id === this.#activeThreadId) ?? null : null;

    const viewInput: ViewInput = {
      pins,
      highlights,
      hoverHighlight: this.#commentOverlayManager.getHoverHighlight(),
      commentMode: this.#commentManager.isCommentMode(),
      onPinClick: this.#handlePinClick,
      activeThread,
      activePin,
      title,
      onAddComment: (text: string) => {
        if (!activeThread) {
          return;
        }
        activeThread.sendToAgent(text);
        const threadId = activeThread.id;
        this.#clearCloseTimeout();
        this.#closeTimeoutId = window.setTimeout(() => {
          this.#closeTimeoutId = null;
          if (this.#activeThreadId === threadId) {
            this.#setActiveThreadId(null);
            this.requestUpdate();
          }
        }, AUTO_CLOSE_DELAY_MS);
      },
      onCloseCommentThread: this.#handleCloseCommentThread,
    };
    this.#view(viewInput, undefined, this.contentElement);
  }
}

let widgetInstance: CommentsOverlayWidget|null = null;

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
      if (!widgetInstance) {
        widgetInstance = new CommentsOverlayWidget(
            undefined,
            [this.#commentManager],
        );
        widgetInstance.markAsRoot();
        widgetInstance.show(document.body);
      }
      this.#commentManager.setCommentMode(
          !this.#commentManager.isCommentMode(),
      );
      return true;
    }
    return false;
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
