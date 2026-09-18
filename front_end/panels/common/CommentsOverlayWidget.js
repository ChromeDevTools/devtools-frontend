// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Root from '../../core/root/root.js';
import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as Comments from '../../ui/comments/comments.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import commentsOverlayStyles from './commentsOverlay.css.js';
import { CommentThreadWidget } from './CommentThreadWidget.js';
const { html, render, nothing, Directives: { repeat, styleMap }, } = Lit;
const POPUP_MARGIN = 8;
const PIN_HEIGHT = 30;
const POPUP_WIDTH = 288;
const POPUP_HEIGHT = 220;
const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    <style>${commentsOverlayStyles}</style>
    <div class="comments-overlay-container">
      ${input.hoverHighlight && input.hoverHighlight.visible ? html `
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
      ${input.highlights.map(h => h.visible ? html `
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
      ${input.pins.map(p => p.visible ? html `
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
      ${input.activePin && input.activeThread ? repeat([{ pin: input.activePin, thread: input.activeThread }], item => item.thread.id, item => html `
          <div
            class="comment-popup-widget"
            style=${styleMap({
        top: `${Math.min(Math.max(POPUP_MARGIN, item.pin.top + PIN_HEIGHT), Math.max(POPUP_MARGIN, target.clientHeight - POPUP_HEIGHT))}px`,
        left: `${Math.min(Math.max(POPUP_MARGIN, item.pin.left), Math.max(POPUP_MARGIN, target.clientWidth - POPUP_WIDTH - POPUP_MARGIN))}px`,
    })}>
            ${UI.Widget.widget(CommentThreadWidget, {
        comments: [...item.thread.comments],
        onAddComment: input.onAddComment,
    })}
          </div>
        `) : nothing}
    </div>
  `, target);
    // clang-format on
};
export class CommentsOverlayWidget extends UI.Widget.Widget {
    static INJECT = [CommentManager.CommentManager.CommentManager];
    #view;
    #commentManager;
    #commentOverlayManager;
    #activeThreadId = null;
    constructor(element, [commentManager], view = DEFAULT_VIEW) {
        super(element, { useShadowDom: false });
        this.#view = view;
        this.#commentManager = commentManager;
        this.#commentOverlayManager = new Comments.CommentOverlayManager.CommentOverlayManager(this.#commentManager);
    }
    setOverlayManagerForTest(overlayManager) {
        this.#commentOverlayManager = overlayManager;
    }
    wasShown() {
        super.wasShown();
        this.#commentOverlayManager.start();
        this.#commentOverlayManager.addEventListener("PositionsUpdated" /* Comments.CommentOverlayManager.Events.POSITIONS_UPDATED */, this.#onStateChanged, this);
        this.#commentOverlayManager.addEventListener("HoverHighlightChanged" /* Comments.CommentOverlayManager.Events.HOVER_HIGHLIGHT_CHANGED */, this.#onStateChanged, this);
        this.#commentManager.addEventListener("CommentThreadsChanged" /* CommentManager.CommentManager.Events.COMMENT_THREADS_CHANGED */, this.#onStateChanged, this);
        this.#commentManager.addEventListener("CommentModeChanged" /* CommentManager.CommentManager.Events.COMMENT_MODE_CHANGED */, this.#onCommentModeChanged, this);
        this.requestUpdate();
    }
    willHide() {
        this.#commentOverlayManager.stop();
        this.#commentOverlayManager.removeEventListener("PositionsUpdated" /* Comments.CommentOverlayManager.Events.POSITIONS_UPDATED */, this.#onStateChanged, this);
        this.#commentOverlayManager.removeEventListener("HoverHighlightChanged" /* Comments.CommentOverlayManager.Events.HOVER_HIGHLIGHT_CHANGED */, this.#onStateChanged, this);
        this.#commentManager.removeEventListener("CommentThreadsChanged" /* CommentManager.CommentManager.Events.COMMENT_THREADS_CHANGED */, this.#onStateChanged, this);
        this.#commentManager.removeEventListener("CommentModeChanged" /* CommentManager.CommentManager.Events.COMMENT_MODE_CHANGED */, this.#onCommentModeChanged, this);
        super.willHide();
    }
    #onCommentModeChanged(event) {
        const isModeActive = event.data;
        if (!isModeActive) {
            this.#activeThreadId = null;
        }
        const action = UI.ActionRegistry.ActionRegistry.instance().getAction('comments.toggle-comment-mode');
        action?.setToggled(isModeActive);
        this.requestUpdate();
    }
    #onStateChanged() {
        const draftThread = this.#commentManager.getCommentThreads().find(t => t.status === 'DRAFT');
        if (draftThread) {
            this.#activeThreadId = draftThread.id;
        }
        else if (this.#activeThreadId && !this.#commentManager.getCommentThread(this.#activeThreadId)) {
            this.#activeThreadId = null;
        }
        this.requestUpdate();
    }
    #handlePinClick = (threadId) => {
        const thread = this.#commentManager.getCommentThread(threadId);
        if (this.#activeThreadId === threadId) {
            if (thread?.status === 'DRAFT') {
                this.#commentOverlayManager.clearDraftThreads();
            }
            this.#activeThreadId = null;
        }
        else {
            this.#commentOverlayManager.clearDraftThreads();
            this.#activeThreadId = threadId;
        }
        this.requestUpdate();
    };
    performUpdate() {
        const pins = this.#commentOverlayManager.getPinPositions();
        const highlights = this.#commentOverlayManager.getHighlightRects();
        let activePin = null;
        let activeThread = null;
        if (this.#activeThreadId) {
            activePin = pins.find(p => p.id === this.#activeThreadId) ?? null;
            activeThread = this.#commentManager.getCommentThread(this.#activeThreadId) ?? null;
        }
        const viewInput = {
            pins,
            highlights,
            hoverHighlight: this.#commentOverlayManager.getHoverHighlight(),
            commentMode: this.#commentManager.isCommentMode(),
            onPinClick: this.#handlePinClick,
            activeThread,
            activePin,
            onAddComment: (text) => {
                activeThread?.save(text);
            },
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
}
let widgetInstance = null;
export class ActionDelegate {
    #commentManager;
    constructor(commentManager) {
        this.#commentManager = commentManager ??
            Root.DevToolsContext.globalInstance().get(CommentManager.CommentManager.CommentManager);
    }
    handleAction(_context, actionId) {
        if (actionId === 'comments.toggle-comment-mode') {
            if (!widgetInstance) {
                widgetInstance = new CommentsOverlayWidget(undefined, [this.#commentManager]);
                widgetInstance.markAsRoot();
                widgetInstance.show(document.body);
            }
            this.#commentManager.setCommentMode(!this.#commentManager.isCommentMode());
            return true;
        }
        return false;
    }
    static resetForTest() {
        if (widgetInstance) {
            widgetInstance.detach();
            widgetInstance = null;
        }
    }
}
//# sourceMappingURL=CommentsOverlayWidget.js.map