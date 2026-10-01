// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/tooltips/tooltips.js';

import * as i18n from '../../core/i18n/i18n.js';
import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import commentsPaneStyles from './commentsPane.css.js';

const {html, render} = Lit;

const UIStrings = {
  /**
   * @description Tooltip text for clearing all comments.
   */
  clearComments: 'Clear all comments',
  /**
   * @description Text displayed when there are no comments to show.
   */
  noComments: 'No active comments. Add comments on elements in DevTools to send to your AI coding agent.',
  /**
   * @description Button text for sending comments to the agent.
   */
  sendToAgent: 'Send to Agent',
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

export interface ViewInput {
  onClearAll: () => void;
  onSendToAgent: () => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  // clang-format off
  render(html`
    <style>${commentsPaneStyles}</style>
    <div class="comments-container" role="region" aria-label="Comments" jslog=${VisualLogging.panel('comments').track({resize: true})}>
      <div class="comments-toolbar" role="toolbar" jslog=${VisualLogging.toolbar('comments-drawer')}>
        <div class="toolbar-left">
          <button
            class="toolbar-button"
            title=${i18nString(UIStrings.clearComments)}
            aria-label=${i18nString(UIStrings.clearComments)}
            @click=${input.onClearAll}
            jslog=${VisualLogging.action('clear-comments').track({ click: true })}>
            <devtools-icon name="clear"></devtools-icon>
          </button>
        </div>
      </div>

      <div class="comments-empty-state">
        <p>${i18nString(UIStrings.noComments)}</p>
      </div>

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
          disabled
          @click=${input.onSendToAgent}
          jslog=${VisualLogging.action('send-to-agent').track({ click: true })}>
          ${i18nString(UIStrings.sendToAgent)}
        </button>
      </div>
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

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  #handleClearAll = (): void => {
    this.#commentManager.clear();
    this.requestUpdate();
  };

  #handleSendToAgent = (): void => {
    // TODO: send comments to AI assistant
  };

  override async performUpdate(): Promise<void> {
    const viewInput: ViewInput = {
      onClearAll: this.#handleClearAll,
      onSendToAgent: this.#handleSendToAgent,
    };

    this.#view(viewInput, undefined, this.contentElement);
  }
}
