// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';

import {
  CommentOverlayManager,
  Events as CommentOverlayManagerEvents,
  type HighlightRectData,
  type HoverHighlightData,
  type PendingHighlightRectData,
  type PendingPinPositionData,
  type PinPositionData,
} from './CommentOverlayManager.js';
import commentsOverlayStyles from './commentsOverlay.css.js';
import {CommentThreadWidget} from './CommentThreadWidget.js';

const {
  html,
  render,
  nothing,
  Directives: {repeat, styleMap},
} = Lit;

export type ViewHighlightRectData = HighlightRectData|PendingHighlightRectData;

export interface ViewInput {
  pins: PinPositionData[];
  pendingPin: PendingPinPositionData|null;
  highlights: ViewHighlightRectData[];
  hoverHighlight: HoverHighlightData|null;
  commentMode: boolean;
  onPinClick: (threadId: string) => void;
  activeThread: CommentManager.CommentManager.CommentThread|null;
  activePin: PinPositionData|PendingPinPositionData|null;
  activeTargetKey: unknown;
  onAddComment: (text: string) => void;
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
          data-comment-id=${('id' in h && h.id) || nothing}
          style=${styleMap({
            top: `${h.top}px`,
            left: `${h.left}px`,
            width: `${h.width}px`,
            height: `${h.height}px`,
          })}>
        </div>
      ` : nothing)}
      ${input.pendingPin && input.pendingPin.visible ? html`
        <div
          class="comment-pin"
          style=${styleMap({
            top: `${input.pendingPin.top}px`,
            left: `${input.pendingPin.left}px`,
          })}>
          <div class="comment-cursor">${input.pendingPin.index}</div>
        </div>
      ` : nothing}
      ${input.pins.map(p => p.visible ? html`
        <div
          class="comment-pin"
          data-comment-id=${p.id}
          style=${styleMap({
            top: `${p.top}px`,
            left: `${p.left}px`,
          })}
          @click=${() => input.onPinClick(p.id)}>
          <div class="comment-cursor">${p.index}</div>
        </div>
      ` : nothing)}
      ${input.activePin ? repeat(
        [{pin: input.activePin, key: input.activeTargetKey}],
        item => item.key,
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
              comments: input.activeThread ? [...input.activeThread.comments] : [],
              onAddComment: input.onAddComment,
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
  #commentOverlayManager: CommentOverlayManager;
  #activeThreadId: string|null = null;

  constructor(
      element: HTMLElement|undefined,
      [commentManager]: UI.Widget.WidgetDependencies<typeof CommentsOverlayWidget>,
      view: View = DEFAULT_VIEW,
  ) {
    super(element, {useShadowDom: false});
    this.#view = view;
    this.#commentManager = commentManager;
    this.#commentOverlayManager = new CommentOverlayManager(
        this.#commentManager,
    );
  }

  setOverlayManagerForTest(overlayManager: CommentOverlayManager): void {
    this.#commentOverlayManager = overlayManager;
  }

  override wasShown(): void {
    super.wasShown();
    this.#commentOverlayManager.start();
    this.#commentOverlayManager.addEventListener(
        CommentOverlayManagerEvents.POSITIONS_UPDATED,
        this.#onStateChanged,
        this,
    );
    this.#commentOverlayManager.addEventListener(
        CommentOverlayManagerEvents.HOVER_HIGHLIGHT_CHANGED,
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

    this.requestUpdate();
  }

  override willHide(): void {
    this.#commentOverlayManager.stop();
    this.#commentOverlayManager.removeEventListener(
        CommentOverlayManagerEvents.POSITIONS_UPDATED,
        this.#onStateChanged,
        this,
    );
    this.#commentOverlayManager.removeEventListener(
        CommentOverlayManagerEvents.HOVER_HIGHLIGHT_CHANGED,
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

    super.willHide();
  }

  #onCommentModeChanged(
      event: Common.EventTarget.EventTargetEvent<
          CommentManager.CommentManager.EventTypes[CommentManager.CommentManager.Events.COMMENT_MODE_CHANGED]>,
      ): void {
    const isModeActive = event.data;
    const action = UI.ActionRegistry.ActionRegistry.instance().getAction(
        'comments.toggle-comment-mode',
    );
    action?.setToggled(isModeActive);
    this.requestUpdate();
  }

  #onStateChanged(): void {
    if (this.#commentOverlayManager.getPendingDraft()) {
      this.#activeThreadId = null;
    }
    this.requestUpdate();
  }

  #handlePinClick = (threadId: string): void => {
    this.#commentOverlayManager.clearPendingAnchor();
    if (this.#activeThreadId === threadId) {
      this.#activeThreadId = null;
    } else {
      this.#activeThreadId = threadId;
    }
    this.requestUpdate();
  };

  override performUpdate(): void {
    const pins = this.#commentOverlayManager.getPinPositions();
    const draft = this.#commentOverlayManager.getPendingDraft();
    const pendingPin = draft?.pin ?? null;
    const highlights: ViewHighlightRectData[] = [
      ...this.#commentOverlayManager.getHighlightRects(),
    ];

    if (draft?.highlight) {
      highlights.push(draft.highlight);
    }

    let activePin: PinPositionData|PendingPinPositionData|null = null;
    let activeThread: CommentManager.CommentManager.CommentThread|null = null;
    if (pendingPin) {
      activePin = pendingPin;
    } else if (this.#activeThreadId) {
      activePin = pins.find(p => p.id === this.#activeThreadId) ?? null;
      activeThread = this.#commentManager.getCommentThread(this.#activeThreadId) ?? null;
    }

    const viewInput: ViewInput = {
      pins,
      pendingPin,
      highlights,
      hoverHighlight: this.#commentOverlayManager.getHoverHighlight(),
      commentMode: this.#commentManager.isCommentMode(),
      onPinClick: this.#handlePinClick,
      activeThread,
      activePin,
      activeTargetKey: draft ?? activeThread,
      onAddComment: (text: string) => {
        const pendingDraft = this.#commentOverlayManager.getPendingDraft();

        if (pendingDraft) {
          this.#commentOverlayManager.createComment(pendingDraft.element, text, {pendingDraft});
        }
      },
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
}
