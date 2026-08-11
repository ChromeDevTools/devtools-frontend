// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';

import {
  type CommentManager,
  Events as CommentManagerEvents,
  type HighlightRectData,
  type HoverHighlightData,
  type PinPositionData,
} from './CommentManager.js';
import commentsOverlayStyles from './commentsOverlay.css.js';

const {html, render, nothing, Directives: {styleMap}} = Lit;

export interface ViewInput {
  pins: PinPositionData[];
  highlights: HighlightRectData[];
  hoverHighlight: HoverHighlightData|null;
  commentMode: boolean;
  onPinClick: (threadId: string) => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

// clang-format off
const DEFAULT_VIEW: View = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
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
          data-comment-id=${h.id}
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
          data-comment-id=${p.id}
          style=${styleMap({
            top: `${p.top}px`,
            left: `${p.left}px`,
          })}
          @click=${() => input.onPinClick(p.id)}>
          💬
        </div>
      ` : nothing)}
    </div>
  `, target);
};
// clang-format on

export class CommentsOverlayWidget extends UI.Widget.Widget {
  readonly #view: View;
  readonly #commentManager: CommentManager;

  constructor(
      commentManager: CommentManager,
      element?: HTMLElement,
      view: View = DEFAULT_VIEW,
  ) {
    super(element);
    this.#view = view;
    this.#commentManager = commentManager;
  }

  override wasShown(): void {
    super.wasShown();
    this.#commentManager.addEventListener(CommentManagerEvents.POSITIONS_UPDATED, this.#onStateChanged, this);
    this.#commentManager.addEventListener(CommentManagerEvents.COMMENT_THREADS_CHANGED, this.#onStateChanged, this);
    this.#commentManager.addEventListener(CommentManagerEvents.COMMENT_MODE_CHANGED, this.#onStateChanged, this);
    this.#commentManager.addEventListener(CommentManagerEvents.HOVER_HIGHLIGHT_CHANGED, this.#onStateChanged, this);
    this.requestUpdate();
  }

  override willHide(): void {
    this.#commentManager.removeEventListener(CommentManagerEvents.POSITIONS_UPDATED, this.#onStateChanged, this);
    this.#commentManager.removeEventListener(CommentManagerEvents.COMMENT_THREADS_CHANGED, this.#onStateChanged, this);
    this.#commentManager.removeEventListener(CommentManagerEvents.COMMENT_MODE_CHANGED, this.#onStateChanged, this);
    this.#commentManager.removeEventListener(CommentManagerEvents.HOVER_HIGHLIGHT_CHANGED, this.#onStateChanged, this);
    super.willHide();
  }

  #onStateChanged(): void {
    this.requestUpdate();
  }

  #handlePinClick = (_threadId: string): void => {};

  override performUpdate(): void {
    const viewInput: ViewInput = {
      pins: this.#commentManager.getPinPositions(),
      highlights: this.#commentManager.getHighlightRects(),
      hoverHighlight: this.#commentManager.getHoverHighlight(),
      commentMode: this.#commentManager.isCommentMode(),
      onPinClick: this.#handlePinClick,
    };
    this.#view(viewInput, undefined, this.contentElement);
  }
}
