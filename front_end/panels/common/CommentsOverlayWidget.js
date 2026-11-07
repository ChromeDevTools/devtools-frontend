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
/**
 * Grace period before hiding a hover preview, so the cursor can travel from
 * the pin to the popup without the popup disappearing.
 */
const HOVER_HIDE_DELAY_MS = 150;
const COMMENTS_VIEW_ID = 'comments';
function getPopupItems(input) {
    const items = [];
    const activePosition = input.activePin ?? input.fallbackPosition;
    if (input.activeThread && activePosition) {
        items.push({
            thread: input.activeThread,
            position: activePosition,
            anchoredToPin: Boolean(input.activePin),
            title: input.title,
            actions: input,
            isHoverPreview: false,
        });
    }
    if (input.hoveredThread && input.hoveredPin) {
        items.push({
            thread: input.hoveredThread,
            position: input.hoveredPin,
            anchoredToPin: true,
            title: input.hoveredTitle,
            actions: input.hoveredActions,
            isHoverPreview: true,
        });
    }
    return items;
}
function renderAnchorHighlight(thread, highlight) {
    if (!thread || !highlight?.visible) {
        return nothing;
    }
    // clang-format off
    return html `
    <div
      class=${classMap({
        'comment-anchor-highlight': true,
        resolved: thread.status === 'RESOLVED',
    })}
      style=${styleMap({
        transform: `translate3d(${highlight.left}px, ${highlight.top}px, 0)`,
        width: `${highlight.width}px`,
        height: `${highlight.height}px`,
    })}>
    </div>
  `;
    // clang-format on
}
const DEFAULT_VIEW = (input, _output, target) => {
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
      ${renderAnchorHighlight(input.activeThread, input.activeHighlight)}
      ${renderAnchorHighlight(input.hoveredThread, input.hoveredHighlight)}
      ${repeat(input.pins.filter(p => p.visible), p => p.id, p => html `
          <div
            class="comment-pin"
            aria-hidden="true"
            style=${styleMap({
        transform: `translate3d(${p.left}px, ${p.top}px, 0)`,
    })}
            @click=${() => input.onPinClick(p.id)}
            @mouseenter=${() => input.onPinMouseEnter(p.id)}
            @mouseleave=${input.onPinMouseLeave}>
            <div
              class=${classMap({
        'comment-cursor': true,
        resolved: p.resolved,
    })}>
            </div>
          </div>
        `)}
      ${repeat(getPopupItems(input), 
    // Keyed by thread so that the popup DOM (and focus) is kept when a
    // hover preview becomes the open thread.
    item => item.thread.id, item => {
        // Clamp horizontal position so the popup stays within the viewport with POPUP_MARGIN padding.
        const popupLeft = Math.min(Math.max(POPUP_MARGIN, item.position.left), Math.max(POPUP_MARGIN, target.clientWidth - POPUP_WIDTH - POPUP_MARGIN));
        // When anchored to a pin, place the popup below the pin (`top + PIN_HEIGHT`).
        // When unanchored (`fallbackPosition` from a drawer row), place the anchor point just above
        // the row (`top - POPUP_MARGIN`) and shift the popup up by its own height via `translateY(-100%)`.
        const topOffset = item.anchoredToPin ? item.position.top + PIN_HEIGHT : item.position.top - POPUP_MARGIN;
        const maxTop = target.clientHeight - (item.anchoredToPin ? POPUP_HEIGHT : POPUP_MARGIN);
        const popupTop = Math.min(Math.max(POPUP_MARGIN, topOffset), Math.max(POPUP_MARGIN, maxTop));
        return html `
            <div
              class="comment-popup-widget"
              style=${styleMap({
            transform: `translate3d(${popupLeft}px, ${popupTop}px, 0)${item.anchoredToPin ? '' : ' translateY(-100%)'}`,
        })}
              @mouseenter=${item.isHoverPreview ? input.onPopupMouseEnter : nothing}
              @mouseleave=${item.isHoverPreview ? input.onPopupMouseLeave : nothing}
              @mousedown=${item.isHoverPreview ? input.onPopupInteract : nothing}
              @focusin=${item.isHoverPreview ? input.onPopupInteract : nothing}>
              ${UI.Widget.widget(CommentThreadWidget, {
            title: item.title,
            comments: [...item.thread.comments],
            status: item.thread.status,
            transmitted: item.thread.transmitted,
            onAddComment: item.actions.onAddComment,
            onDeleteQueuedComment: item.actions.onDeleteQueuedComment,
            onQueueComment: item.actions.onQueueComment,
            onSaveEdit: item.actions.onSaveEdit,
            onStartEdit: item.actions.onStartEdit,
            elementRemoved: item.thread.isOrphaned,
        })}
            </div>
          `;
    })}
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
    /**
     * Thread previewed because its pin (or its preview popup) is hovered. Shown
     * next to the open thread; never equal to `#activeThreadId`.
     */
    #hoveredThreadId = null;
    #hoverHideTimeoutId = null;
    #fallbackPosition = null;
    #closeTimeoutId = null;
    #titleCache = new WeakMap();
    #getThread(threadId) {
        return threadId ? this.#commentManager.getCommentThread(threadId) ?? null : null;
    }
    #setActiveThreadId(threadId) {
        this.#fallbackPosition = null;
        if (this.#activeThreadId !== threadId) {
            this.#clearCloseTimeout();
            this.#clearHover();
            this.#activeThreadId = threadId;
            this.#updateDocumentListeners();
            this.#markActiveThreadResponseSeen();
        }
    }
    /**
     * Escape is handled while a thread is open or comment mode is on. The
     * listener is registered in the capture phase so that, in comment mode, the
     * first Escape exits the mode before any panel-level Escape handling (or the
     * drawer toggle) sees it. When neither applies the listener is removed and
     * Escape keeps its default DevTools behavior.
     */
    #updateDocumentListeners() {
        const isShowing = this.isShowing();
        if (isShowing && (this.#activeThreadId || this.#commentManager.isCommentMode())) {
            document.addEventListener('keydown', this.#onKeyDown, { capture: true });
        }
        else {
            document.removeEventListener('keydown', this.#onKeyDown, { capture: true });
        }
        if (isShowing && this.#activeThreadId) {
            document.addEventListener('click', this.#onClickOutside, { capture: true });
        }
        else {
            document.removeEventListener('click', this.#onClickOutside, { capture: true });
        }
    }
    #removeDocumentListeners() {
        document.removeEventListener('keydown', this.#onKeyDown, { capture: true });
        document.removeEventListener('click', this.#onClickOutside, { capture: true });
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
        this.#updateDocumentListeners();
        this.requestUpdate();
    }
    willHide() {
        this.#clearCloseTimeout();
        this.#clearHover();
        this.#commentOverlayManager.removeEventListener("PositionsUpdated" /* Comments.CommentOverlayManager.Events.POSITIONS_UPDATED */, this.#onPositionsUpdated, this);
        this.#commentOverlayManager.removeEventListener("HoverHighlightChanged" /* Comments.CommentOverlayManager.Events.HOVER_HIGHLIGHT_CHANGED */, this.#onHoverHighlightChanged, this);
        this.#commentManager.removeEventListener("CommentThreadsChanged" /* CommentManager.CommentManager.Events.COMMENT_THREADS_CHANGED */, this.#onStateChanged, this);
        this.#commentManager.removeEventListener("CommentModeChanged" /* CommentManager.CommentManager.Events.COMMENT_MODE_CHANGED */, this.#onCommentModeChanged, this);
        this.#commentManager.removeEventListener("AgentAttachedChanged" /* CommentManager.CommentManager.Events.AGENT_ATTACHED_CHANGED */, this.#onAgentAttachedChanged, this);
        this.#commentOverlayManager.stop();
        this.#syncActiveThreadFromManager();
        this.#removeDocumentListeners();
        super.willHide();
    }
    #clearCloseTimeout() {
        if (this.#closeTimeoutId !== null) {
            window.clearTimeout(this.#closeTimeoutId);
            this.#closeTimeoutId = null;
        }
    }
    #clearHoverHideTimeout() {
        if (this.#hoverHideTimeoutId !== null) {
            window.clearTimeout(this.#hoverHideTimeoutId);
            this.#hoverHideTimeoutId = null;
        }
    }
    #clearHover() {
        this.#clearHoverHideTimeout();
        this.#hoveredThreadId = null;
    }
    #handlePinMouseEnter = (threadId) => {
        this.#clearHoverHideTimeout();
        if (threadId === this.#activeThreadId) {
            // The open thread is already shown; drop any preview of another pin.
            if (this.#hoveredThreadId) {
                this.#clearHover();
                this.requestUpdate();
            }
            return;
        }
        if (this.#hoveredThreadId === threadId) {
            return;
        }
        this.#hoveredThreadId = threadId;
        this.requestUpdate();
    };
    #scheduleHoverHide = () => {
        if (!this.#hoveredThreadId) {
            return;
        }
        this.#clearHoverHideTimeout();
        this.#hoverHideTimeoutId = window.setTimeout(() => {
            this.#hoverHideTimeoutId = null;
            this.#hoveredThreadId = null;
            this.requestUpdate();
        }, HOVER_HIDE_DELAY_MS);
    };
    #handlePopupMouseEnter = () => {
        this.#clearHoverHideTimeout();
    };
    #handlePopupInteract = () => {
        if (!this.#hoveredThreadId) {
            return;
        }
        // Never discard an unsent draft by interacting with a preview.
        if (this.#getThread(this.#activeThreadId)?.status === 'DRAFT') {
            return;
        }
        this.#setActiveThreadId(this.#hoveredThreadId);
        this.requestUpdate();
    };
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
        this.#updateDocumentListeners();
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
        const hoveredThread = this.#getThread(this.#hoveredThreadId);
        if (this.#hoveredThreadId && (!hoveredThread || hoveredThread.status === 'RESOLVED')) {
            this.#clearHover();
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
        const activeThread = this.#getThread(this.#activeThreadId);
        const hoveredThread = this.#getThread(this.#hoveredThreadId);
        const title = this.#getCachedTitle(activeThread);
        const hoveredTitle = this.#getCachedTitle(hoveredThread);
        if (!title || !hoveredTitle) {
            return false;
        }
        this.#renderView(activeThread, title, hoveredThread, hoveredTitle);
        return true;
    }
    #getCachedTitle(thread) {
        return thread ? this.#titleCache.get(thread.anchor) : { text: '' };
    }
    async #getOrComputeTitle(thread) {
        const cached = this.#getCachedTitle(thread);
        if (cached || !thread) {
            return cached ?? { text: '' };
        }
        const title = await computeCommentTitle(thread.anchor);
        this.#titleCache.set(thread.anchor, title);
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
    /**
     * Escape priority: an open thread closes first; otherwise, in comment mode,
     * Escape exits comment mode. Open dialogs keep handling their own Escape.
     */
    #onKeyDown = (event) => {
        if (event.key !== 'Escape' || event.isComposing || !UI.KeyboardShortcut.KeyboardShortcut.hasNoModifiers(event) ||
            UI.Dialog.Dialog.hasInstance()) {
            return;
        }
        if (this.#activeThreadId) {
            event.consume(true);
            this.#handleCloseCommentThread();
            return;
        }
        if (this.#commentManager.isCommentMode()) {
            event.consume(true);
            setCommentModeByUser(this.#commentManager, false);
        }
    };
    #onClickOutside = (event) => {
        if (!this.#activeThreadId || isEventInsidePopupOrPin(event)) {
            return;
        }
        this.#handleCloseCommentThread();
    };
    #renderDisconnectedView() {
        const noopActions = {
            onAddComment: () => { },
            onDeleteQueuedComment: () => { },
            onQueueComment: () => { },
            onSaveEdit: () => { },
            onStartEdit: () => { },
        };
        this.#view({
            pins: [],
            activeHighlight: null,
            hoverHighlight: null,
            commentMode: false,
            onPinClick: this.#handlePinClick,
            onPinMouseEnter: this.#handlePinMouseEnter,
            onPinMouseLeave: this.#scheduleHoverHide,
            onPopupMouseEnter: this.#handlePopupMouseEnter,
            onPopupMouseLeave: this.#scheduleHoverHide,
            onPopupInteract: this.#handlePopupInteract,
            activeThread: null,
            activePin: null,
            title: { text: '' },
            hoveredThread: null,
            hoveredPin: null,
            hoveredHighlight: null,
            hoveredTitle: { text: '' },
            hoveredActions: noopActions,
            ...noopActions,
        }, undefined, this.contentElement);
    }
    #createThreadActions(thread) {
        return {
            onAddComment: (text) => {
                if (!thread) {
                    return;
                }
                thread.sendToAgent(text);
                this.#scheduleAutoClose(thread.id);
            },
            onDeleteQueuedComment: () => {
                if (!thread) {
                    return;
                }
                this.#commentOverlayManager.removeCommentThread(thread.id);
            },
            onQueueComment: (text) => {
                if (!thread) {
                    return;
                }
                thread.save(text);
                this.#scheduleAutoClose(thread.id);
            },
            onSaveEdit: (text) => {
                if (!thread) {
                    return;
                }
                thread.editComment(text);
            },
            onStartEdit: () => this.#clearCloseTimeout(),
        };
    }
    #renderView(activeThread, title, hoveredThread, hoveredTitle) {
        const pins = this.#commentOverlayManager.getPinPositions().map(pin => !pin.visible && pin.id === activeThread?.id ? { ...pin, visible: true } : pin);
        const findPin = (thread) => thread ? pins.find(p => p.id === thread.id) ?? null : null;
        const findHighlight = (thread) => thread ? this.#commentOverlayManager.getHighlight(thread.id) ?? null : null;
        const viewInput = {
            pins,
            activeHighlight: findHighlight(activeThread),
            hoverHighlight: this.#commentOverlayManager.getHoverHighlight(),
            commentMode: this.#commentManager.isCommentMode(),
            onPinClick: this.#handlePinClick,
            onPinMouseEnter: this.#handlePinMouseEnter,
            onPinMouseLeave: this.#scheduleHoverHide,
            onPopupMouseEnter: this.#handlePopupMouseEnter,
            onPopupMouseLeave: this.#scheduleHoverHide,
            onPopupInteract: this.#handlePopupInteract,
            activeThread,
            activePin: findPin(activeThread),
            fallbackPosition: this.#fallbackPosition,
            title,
            hoveredThread,
            hoveredPin: findPin(hoveredThread),
            hoveredHighlight: findHighlight(hoveredThread),
            hoveredTitle,
            hoveredActions: this.#createThreadActions(hoveredThread),
            ...this.#createThreadActions(activeThread),
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
        const activeThread = this.#getThread(this.#activeThreadId);
        const hoveredThread = this.#getThread(this.#hoveredThreadId);
        let title = this.#getCachedTitle(activeThread);
        let hoveredTitle = this.#getCachedTitle(hoveredThread);
        if (!title || !hoveredTitle) {
            [title, hoveredTitle] = await Promise.all([
                this.#getOrComputeTitle(activeThread),
                this.#getOrComputeTitle(hoveredThread),
            ]);
            signal?.throwIfAborted();
        }
        this.#renderView(activeThread, title, hoveredThread, hoveredTitle);
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
            await UI.ViewManager.ViewManager.instance().showView(panelId, true, true);
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