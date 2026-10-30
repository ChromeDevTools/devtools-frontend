// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as Comments from '../../ui/comments/comments.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import commentsOverlayStyles from './commentsOverlay.css.js';
import { CommentThreadWidget, computeCommentTitle } from './CommentThreadWidget.js';
const UIStrings = {
    /**
     * @description Context menu item that creates a comment anchored to the right-clicked part of the DevTools UI.
     */
    addComment: 'Add comment',
};
const str_ = i18n.i18n.registerUIStrings('panels/common/CommentsOverlayWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { html, render, nothing, Directives: { classMap, repeat, styleMap }, } = Lit;
const POPUP_MARGIN = 8;
const PIN_HEIGHT = 30;
const POPUP_WIDTH = 288;
const POPUP_HEIGHT = 220;
const AUTO_CLOSE_DELAY_MS = 2000;
const COMMENTS_VIEW_ID = 'comments';
const DEFAULT_VIEW = (input, _output, target) => {
    const popupPosition = input.activePin ?? input.fallbackPosition;
    // clang-format off
    render(html `
    <style>${commentsOverlayStyles}</style>
    <div class="comments-overlay-container">
      ${input.hoverHighlight && input.hoverHighlight.visible ? html `
        <div
          class="comment-hover-highlight"
          style=${styleMap({
        transform: `translate3d(${input.hoverHighlight.left}px, ${input.hoverHighlight.top}px, 0)`,
        width: `${input.hoverHighlight.width}px`,
        height: `${input.hoverHighlight.height}px`,
    })}>
        </div>
      ` : nothing}
      ${input.activeHighlight?.visible && input.activeThread ? html `
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
      ${repeat(input.pins.filter(p => p.visible), p => p.id, p => html `
          <div
            class="comment-pin"
            aria-hidden="true"
            style=${styleMap({
        transform: `translate3d(${p.left}px, ${p.top}px, 0)`,
    })}
            @click=${() => input.onPinClick(p.id)}>
            <div class="comment-cursor"></div>
          </div>
        `)}
      ${popupPosition && input.activeThread ? repeat([{ position: popupPosition, thread: input.activeThread }], item => item.thread.id, item => {
        // Clamp horizontal position so the popup stays within the viewport with POPUP_MARGIN padding.
        const popupLeft = Math.min(Math.max(POPUP_MARGIN, item.position.left), Math.max(POPUP_MARGIN, target.clientWidth - POPUP_WIDTH - POPUP_MARGIN));
        // When anchored to a pin (`activePin`), place the popup below the pin (`top + PIN_HEIGHT`).
        // When unanchored (`fallbackPosition` from a drawer row), place the anchor point just above
        // the row (`top - POPUP_MARGIN`) and shift the popup up by its own height via `translateY(-100%)`.
        const topOffset = input.activePin ? item.position.top + PIN_HEIGHT : item.position.top - POPUP_MARGIN;
        const maxTop = target.clientHeight - (input.activePin ? POPUP_HEIGHT : POPUP_MARGIN);
        const popupTop = Math.min(Math.max(POPUP_MARGIN, topOffset), Math.max(POPUP_MARGIN, maxTop));
        return html `
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
            elementRemoved: item.thread.isOrphaned,
        })}
            </div>
          `;
    }) : nothing}
    </div>
  `, target);
    // clang-format on
};
function isEventInsidePopupOrPin(event) {
    const composedTarget = event.composedPath()[0];
    const target = composedTarget instanceof Element ? composedTarget : event.target;
    return target instanceof Element &&
        Boolean(Comments.CommentAnchorResolver.closestAcrossShadow(target, '.comment-popup-widget, .comment-pin'));
}
export class CommentsOverlayWidget extends UI.Widget.Widget {
    static INJECT = [CommentManager.CommentManager.CommentManager];
    #view;
    #commentManager;
    #commentOverlayManager;
    #activeThreadId = null;
    #fallbackPosition = null;
    #closeTimeoutId = null;
    #cachedTitle = { text: '' };
    #cachedTitleAnchor = null;
    #setActiveThreadId(threadId) {
        this.#fallbackPosition = null;
        if (this.#activeThreadId !== threadId) {
            this.#clearCloseTimeout();
            this.#activeThreadId = threadId;
            if (threadId && this.isShowing()) {
                document.documentElement.addEventListener('keydown', this.#onKeyDown);
                document.documentElement.addEventListener('click', this.#onClickOutside, { capture: true });
            }
            else {
                document.documentElement.removeEventListener('keydown', this.#onKeyDown);
                document.documentElement.removeEventListener('click', this.#onClickOutside, { capture: true });
            }
            this.#markActiveThreadResponseSeen();
        }
    }
    /**
     * The open thread shows the agent response, so the developer has seen it.
     */
    #markActiveThreadResponseSeen() {
        if (!this.#activeThreadId) {
            return;
        }
        this.#commentManager.getCommentThread(this.#activeThreadId)?.markResponseSeen();
    }
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
        this.#commentOverlayManager.addEventListener("PositionsUpdated" /* Comments.CommentOverlayManager.Events.POSITIONS_UPDATED */, this.#onPositionsUpdated, this);
        this.#commentOverlayManager.addEventListener("HoverHighlightChanged" /* Comments.CommentOverlayManager.Events.HOVER_HIGHLIGHT_CHANGED */, this.#onHoverHighlightChanged, this);
        this.#commentManager.addEventListener("CommentThreadsChanged" /* CommentManager.CommentManager.Events.COMMENT_THREADS_CHANGED */, this.#onStateChanged, this);
        this.#commentManager.addEventListener("CommentModeChanged" /* CommentManager.CommentManager.Events.COMMENT_MODE_CHANGED */, this.#onCommentModeChanged, this);
        this.#commentManager.addEventListener("AgentAttachedChanged" /* CommentManager.CommentManager.Events.AGENT_ATTACHED_CHANGED */, this.#onAgentAttachedChanged, this);
        if (this.#activeThreadId) {
            document.documentElement.addEventListener('keydown', this.#onKeyDown);
            document.documentElement.addEventListener('click', this.#onClickOutside, { capture: true });
        }
        this.requestUpdate();
    }
    willHide() {
        this.#clearCloseTimeout();
        document.documentElement.removeEventListener('keydown', this.#onKeyDown);
        document.documentElement.removeEventListener('click', this.#onClickOutside, { capture: true });
        this.#commentOverlayManager.stop();
        this.#commentOverlayManager.removeEventListener("PositionsUpdated" /* Comments.CommentOverlayManager.Events.POSITIONS_UPDATED */, this.#onPositionsUpdated, this);
        this.#commentOverlayManager.removeEventListener("HoverHighlightChanged" /* Comments.CommentOverlayManager.Events.HOVER_HIGHLIGHT_CHANGED */, this.#onHoverHighlightChanged, this);
        this.#commentManager.removeEventListener("CommentThreadsChanged" /* CommentManager.CommentManager.Events.COMMENT_THREADS_CHANGED */, this.#onStateChanged, this);
        this.#commentManager.removeEventListener("CommentModeChanged" /* CommentManager.CommentManager.Events.COMMENT_MODE_CHANGED */, this.#onCommentModeChanged, this);
        this.#commentManager.removeEventListener("AgentAttachedChanged" /* CommentManager.CommentManager.Events.AGENT_ATTACHED_CHANGED */, this.#onAgentAttachedChanged, this);
        super.willHide();
    }
    #clearCloseTimeout() {
        if (this.#closeTimeoutId !== null) {
            window.clearTimeout(this.#closeTimeoutId);
            this.#closeTimeoutId = null;
        }
    }
    #onAgentAttachedChanged(event) {
        if (!event.data) {
            this.#setActiveThreadId(null);
        }
        this.requestUpdate();
    }
    #onCommentModeChanged(event) {
        const isModeActive = event.data;
        if (!isModeActive) {
            this.#setActiveThreadId(null);
        }
        const action = UI.ActionRegistry.ActionRegistry.instance().getAction('comments.toggle-comment-mode');
        action?.setToggled(isModeActive);
        this.requestUpdate();
    }
    #syncActiveThreadFromManager() {
        const draftThread = this.#commentManager.getCommentThreads().find(t => t.status === 'DRAFT');
        if (draftThread) {
            this.#setActiveThreadId(draftThread.id);
        }
        else if (this.#activeThreadId && !this.#commentManager.getCommentThread(this.#activeThreadId)) {
            this.#setActiveThreadId(null);
        }
    }
    #onPositionsUpdated(event) {
        this.#syncActiveThreadFromManager();
        if (event.data.isRealtimeSync && this.isShowing() && this.#trySynchronousRender()) {
            return;
        }
        this.requestUpdate();
    }
    #onHoverHighlightChanged() {
        this.#syncActiveThreadFromManager();
        if (this.isShowing() && this.#trySynchronousRender()) {
            return;
        }
        this.requestUpdate();
    }
    #onStateChanged() {
        this.#syncActiveThreadFromManager();
        // The agent may respond while the thread is open.
        this.#markActiveThreadResponseSeen();
        this.requestUpdate();
    }
    #trySynchronousRender() {
        if (!this.#commentManager.isAgentAttached()) {
            this.#renderDisconnectedView();
            return true;
        }
        const activeThread = this.#activeThreadId ? this.#commentManager.getCommentThread(this.#activeThreadId) ?? null : null;
        const anchor = activeThread?.anchor ?? null;
        if (anchor === null) {
            this.#cachedTitleAnchor = null;
            this.#cachedTitle = { text: '' };
            this.#renderWithTitle(activeThread, this.#cachedTitle);
            return true;
        }
        if (anchor === this.#cachedTitleAnchor) {
            this.#renderWithTitle(activeThread, this.#cachedTitle);
            return true;
        }
        return false;
    }
    async #getOrComputeTitle(anchor) {
        if (anchor === this.#cachedTitleAnchor) {
            return this.#cachedTitle;
        }
        const title = anchor ? await computeCommentTitle(anchor) : { text: '' };
        this.#cachedTitleAnchor = anchor;
        this.#cachedTitle = title;
        return title;
    }
    #handlePinClick = (threadId) => {
        if (this.#activeThreadId === threadId) {
            this.#handleCloseCommentThread();
            return;
        }
        this.#commentOverlayManager.clearDraftThreads();
        this.#setActiveThreadId(threadId);
        this.requestUpdate();
    };
    #handleCloseCommentThread = () => {
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
    #onKeyDown = (event) => {
        if (this.#activeThreadId && event.key === 'Escape' && !event.isComposing) {
            event.consume(true);
            this.#handleCloseCommentThread();
        }
    };
    #onClickOutside = (event) => {
        if (!this.#activeThreadId || isEventInsidePopupOrPin(event)) {
            return;
        }
        this.#handleCloseCommentThread();
    };
    #renderDisconnectedView() {
        this.#view({
            pins: [],
            activeHighlight: null,
            hoverHighlight: null,
            commentMode: false,
            onPinClick: this.#handlePinClick,
            activeThread: null,
            activePin: null,
            title: { text: '' },
            onAddComment: () => { },
            onDeleteQueuedComment: () => { },
            onQueueComment: () => { },
            onSaveEdit: () => { },
            onStartEdit: () => { },
        }, undefined, this.contentElement);
    }
    #renderWithTitle(activeThread, title) {
        const pins = this.#commentOverlayManager.getPinPositions();
        const activePin = this.#activeThreadId ? pins.find(p => p.id === this.#activeThreadId) ?? null : null;
        const activeHighlight = this.#activeThreadId ? this.#commentOverlayManager.getHighlight(this.#activeThreadId) ?? null : null;
        const viewInput = {
            pins,
            activeHighlight,
            hoverHighlight: this.#commentOverlayManager.getHoverHighlight(),
            commentMode: this.#commentManager.isCommentMode(),
            onPinClick: this.#handlePinClick,
            activeThread,
            activePin,
            fallbackPosition: this.#fallbackPosition,
            title,
            onAddComment: (text) => {
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
            onQueueComment: (text) => {
                if (!activeThread) {
                    return;
                }
                activeThread.save(text);
                this.#scheduleAutoClose(activeThread.id);
            },
            onSaveEdit: (text) => {
                if (!activeThread) {
                    return;
                }
                activeThread.editComment(text);
            },
            onStartEdit: () => this.#clearCloseTimeout(),
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
    #scheduleAutoClose(threadId) {
        this.#clearCloseTimeout();
        this.#closeTimeoutId = window.setTimeout(() => {
            this.#closeTimeoutId = null;
            if (this.#activeThreadId === threadId) {
                this.#setActiveThreadId(null);
                this.requestUpdate();
            }
        }, AUTO_CLOSE_DELAY_MS);
    }
    async performUpdate(signal) {
        if (!this.#commentManager.isAgentAttached()) {
            this.#renderDisconnectedView();
            return;
        }
        const activeThread = this.#activeThreadId ? this.#commentManager.getCommentThread(this.#activeThreadId) ?? null : null;
        const anchor = activeThread?.anchor ?? null;
        let title;
        if (anchor === null) {
            this.#cachedTitleAnchor = null;
            this.#cachedTitle = { text: '' };
            title = this.#cachedTitle;
        }
        else if (anchor === this.#cachedTitleAnchor) {
            title = this.#cachedTitle;
        }
        else {
            title = await this.#getOrComputeTitle(anchor);
            signal?.throwIfAborted();
        }
        this.#renderWithTitle(activeThread, title);
    }
    openThread(threadId, fallbackPosition) {
        this.#clearCloseTimeout();
        this.#commentOverlayManager.clearDraftThreads();
        this.#setActiveThreadId(threadId);
        this.#fallbackPosition = fallbackPosition ?? null;
        this.requestUpdate();
    }
    /**
     * Opens a draft comment anchored to `element`. Comment mode must already be
     * active.
     * @returns whether a draft comment was created.
     */
    addCommentAt(element, coordinates) {
        return this.#commentOverlayManager.handleElementClick(element, coordinates);
    }
}
let widgetInstance = null;
function getOrCreateOverlayWidget(commentManager) {
    if (!widgetInstance) {
        const cm = commentManager ??
            Root.DevToolsContext.globalInstance().get(CommentManager.CommentManager.CommentManager);
        widgetInstance = new CommentsOverlayWidget(undefined, [cm]);
        widgetInstance.markAsRoot();
        widgetInstance.show(document.body);
    }
    return widgetInstance;
}
export class ThreadRevealer {
    async reveal({ thread, position }) {
        const panelId = Comments.CommentAnchorResolver.extractPanelId(thread.anchor.vePath);
        if (panelId && UI.InspectorView.InspectorView.instance().hasPanel(panelId)) {
            await UI.InspectorView.InspectorView.instance().showPanel(panelId);
        }
        const element = Comments.CommentAnchorResolver.rematchCommentAnchor(thread);
        thread.setOrphaned(!element);
        if (element) {
            element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
        }
        const overlay = getOrCreateOverlayWidget();
        overlay.openThread(thread.id, position);
    }
}
/**
 * When entering comment mode with the drawer open, add the Comments tab to
 * the drawer without selecting it or moving focus away from the page being
 * commented on. When leaving comment mode, always open the drawer on the
 * Comments tab, as checking the responses is the likely next step.
 */
function revealCommentsDrawerView(enteringCommentMode) {
    const viewManager = UI.ViewManager.ViewManager.instance();
    if (!viewManager.hasView(COMMENTS_VIEW_ID)) {
        return;
    }
    if (enteringCommentMode) {
        if (!UI.InspectorView.InspectorView.maybeGetInspectorViewInstance()?.drawerVisible()) {
            return;
        }
        void viewManager.resolveLocation(viewManager.locationNameForViewId(COMMENTS_VIEW_ID)).then(location => {
            return location?.showView(viewManager.view(COMMENTS_VIEW_ID), undefined, false, 
            /* omitFocus */ true, /* shouldSelectTab */ false);
        });
        return;
    }
    void viewManager.showView(COMMENTS_VIEW_ID, /* userGesture */ true);
}
/**
 * Single entry point for comment mode changes requested by the user (toolbar
 * toggle, shortcut, context menu): shows the overlay, updates the mode and
 * reveals the Comments drawer tab. Changes not initiated by the user, such as
 * the agent detaching, go directly through `CommentManager` and leave the
 * drawer alone. The toggle button follows the mode in
 * `CommentsOverlayWidget#onCommentModeChanged`.
 */
function setCommentModeByUser(commentManager, active) {
    getOrCreateOverlayWidget(commentManager);
    if (commentManager.isCommentMode() !== active) {
        commentManager.setCommentMode(active);
        revealCommentsDrawerView(active);
    }
}
export class ActionDelegate {
    #commentManager;
    constructor(commentManager) {
        this.#commentManager = commentManager ??
            Root.DevToolsContext.globalInstance().get(CommentManager.CommentManager.CommentManager);
    }
    handleAction(_context, actionId) {
        if (actionId === 'comments.toggle-comment-mode') {
            if (!this.#commentManager.isAgentAttached()) {
                return false;
            }
            setCommentModeByUser(this.#commentManager, !this.#commentManager.isCommentMode());
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
/**
 * Menus that already have the "Add comment" item. A menu can have several
 * `Node` targets, for example when a DataGrid row also appends its link
 * element, and the provider is called once per target. The first target is
 * the deepest element under the cursor, so only that one adds the item.
 */
const menusWithAddComment = new WeakSet();
/**
 * Adds an "Add comment" item to the context menu of commentable regions while
 * the comment mode toggle is available. Choosing it turns comment mode on and
 * opens a draft comment on the right-clicked region.
 */
export class ContextMenuProvider {
    appendApplicableItems(event, contextMenu, target) {
        if (menusWithAddComment.has(contextMenu) || !Root.Runtime.hostConfig.devToolsComments?.enabled ||
            !(target instanceof HTMLElement) || !(event instanceof MouseEvent)) {
            return;
        }
        const commentManager = UI.Widget.lookupUniverseForElement(target)?.commentManager;
        const coordinates = { clientX: event.clientX, clientY: event.clientY };
        if (!commentManager?.isAgentAttached() ||
            !Comments.CommentAnchorResolver.resolveCommentAnchorElement(target, coordinates)) {
            return;
        }
        menusWithAddComment.add(contextMenu);
        contextMenu.annotationSection().appendItem(i18nString(UIStrings.addComment), () => {
            setCommentModeByUser(commentManager, true);
            getOrCreateOverlayWidget(commentManager).addCommentAt(target, coordinates);
        }, { jslogContext: 'add-comment' });
    }
}
export class ButtonProvider {
    #button;
    #commentManager;
    constructor(commentManager) {
        this.#commentManager = commentManager ??
            Root.DevToolsContext.globalInstance().get(CommentManager.CommentManager.CommentManager);
        const action = UI.ActionRegistry.ActionRegistry.instance().getAction('comments.toggle-comment-mode');
        action.setEnabled(this.#commentManager.isAgentAttached());
        this.#button = UI.Toolbar.Toolbar.createActionButton(action);
        this.#button.setVisible(this.#commentManager.isAgentAttached());
        this.#commentManager.addEventListener("AgentAttachedChanged" /* CommentManager.CommentManager.Events.AGENT_ATTACHED_CHANGED */, event => {
            action.setEnabled(event.data);
            this.#button.setVisible(event.data);
        });
    }
    item() {
        return this.#button;
    }
}
//# sourceMappingURL=CommentsOverlayWidget.js.map