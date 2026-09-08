// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as UI from '../legacy/legacy.js';
import * as Lit from '../lit/lit.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

const UIStrings = {
  /**
   * @description Button text for the comments status bar pill showing the number of open comments.
   * @example {2} PH1
   */
  commentsCount: 'Comments ({PH1})',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/comments/CommentsStatusBarPill.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {html, render} = Lit;

export interface ViewInput {
  threads: CommentManager.CommentManager.CommentThread[];
  onPillClick: () => void;
  disabled?: boolean;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  // clang-format off
  render(html`
    ${input.threads.length <= 0 ? Lit.nothing : html`
      <button
        class="devtools-pill"
        ?disabled=${input.disabled}
        @click=${input.onPillClick}
        jslog=${VisualLogging.action('comments-status-bar-pill').track({click: true})}>
        ${i18nString(UIStrings.commentsCount, {PH1: input.threads.length})}
      </button>
    `}
  `, target);
  // clang-format on
};

export class CommentsStatusBarPill extends UI.Widget.Widget {
  static override readonly INJECT: readonly[typeof CommentManager.CommentManager.CommentManager] =
      [CommentManager.CommentManager.CommentManager] as const;

  readonly #view: View;
  readonly #commentManager: CommentManager.CommentManager.CommentManager;

  constructor(
      element: HTMLElement|undefined,
      [commentManager]: UI.Widget.WidgetDependencies<typeof CommentsStatusBarPill>,
      view: View = DEFAULT_VIEW,
  ) {
    super(element);
    this.#view = view;
    this.#commentManager = commentManager;
  }

  #onThreadsChanged(): void {
    this.requestUpdate();
  }

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

  override performUpdate(): void {
    const viewInput: ViewInput = {
      threads: this.#commentManager.getCommentThreads(),
      onPillClick: this.#handlePillClick,
    };
    this.#view(viewInput, undefined, this.contentElement);
  }

  #handlePillClick = (): void => {};
}
