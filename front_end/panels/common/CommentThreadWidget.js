// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/tooltips/tooltips.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Input from '../../ui/components/input/input.js';
import * as MarkdownView from '../../ui/components/markdown_view/markdown_view.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import commentThreadWidgetStyles from './commentThreadWidget.css.js';
const { html, render, Directives: { createRef, ref } } = Lit;
const UIStrings = {
    /**
     * @description Link text in the info tooltip for learning more about comments sent to the agent.
     */
    learnMore: 'Learn more',
    /**
     * @description Text next to the checkmark in the comment thread header indicating that comments have been sent to
     * the agent.
     */
    sent: 'Sent',
    /**
     * @description Alt text for the checkmark icon in the comment thread header indicating that comments have been sent
     * to the agent.
     */
    sentCheckmark: 'Sent checkmark',
    /**
     * @description Label for the agent response section in the comment thread.
     */
    response: 'Response:',
    /**
     * @description Label for the aria-label of the add comment button.
     */
    addCommentButton: 'Add comment',
    /**
     * @description aria-label for the comment text area.
     */
    commentInputAriaLabel: 'Comment input',
};
const UIStringsNotTranslate = {
    /**
     * @description Disclaimer text in the comment thread info tooltip.
     */
    inputDisclaimer: 'Comment strings, DOM hierarchy snippets, tracked CSS and DOM changes, Visual Element (VE) paths and signatures, and tracked presenter changes are sent to the connected third-party agent to assist with debugging and code updates.',
};
const str_ = i18n.i18n.registerUIStrings('panels/common/CommentThreadWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const lockedString = i18n.i18n.lockedString;
export const DEFAULT_VIEW = (input, _output, target) => {
    const hasComment = input.comments.length > 0;
    // clang-format off
    render(html `
    <style>${Input.textInputStyles}${commentThreadWidgetStyles}</style>
    <div class="comment-thread-widget ${hasComment ? 'submitted' : ''}">
      <div class="header">
        <span class="selected-item">
          <span class="selected-item-text">${input.title}</span>
        </span>
        ${hasComment ? html `
          <div class="sent-status">
            <devtools-icon
              class="check-icon"
              name="checkmark"
              aria-label=${i18nString(UIStrings.sentCheckmark)}>
            </devtools-icon>
            <span>${i18nString(UIStrings.sent)}</span>
          </div>
        ` : Lit.nothing}
      </div>

      ${hasComment ? html `
        ${input.comments.map(comment => comment.author === 'DEVELOPER' ? html `
          <div class="comment-text">
            ${comment.text}
          </div>
        ` : html `
          <div class="agent-response">
            <div class="elbow"></div>
            <div class="response-content">
              <div class="response-header">${i18nString(UIStrings.response)}</div>
              ${MarkdownView.MarkdownView.renderTextAsMarkdown(comment.text, new MarkdownView.MarkdownView.MarkdownInsightRenderer())}
            </div>
          </div>
        `)}
      ` : Lit.nothing}

      ${!hasComment ? html `
        <textarea
          ${ref(input.textAreaRef)}
          class="devtools-text-input input"
          rows="1"
          aria-label=${i18nString(UIStrings.commentInputAriaLabel)}
          .value=${input.commentText}
          @input=${input.onCommentTextChange}
          @keydown=${(event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
            event.preventDefault();
            input.onAddComment(input.commentText);
        }
    }}
        ></textarea>
        <div class="footer">
          <devtools-icon
            class="info-icon"
            name="info"
            aria-label="Info"
            aria-details="comment-thread-info-tooltip"
            tabindex="0"
          ></devtools-icon>
          <devtools-tooltip
            id="comment-thread-info-tooltip"
            variant="rich"
          >
            <div class="info-tooltip-container">
              ${lockedString(UIStringsNotTranslate.inputDisclaimer)}
              <button
                class="tooltip-link"
                role="link"
                @click=${input.onLearnMoreClick}
              >${i18nString(UIStrings.learnMore)}</button>
            </div>
          </devtools-tooltip>
          <devtools-button
            aria-label=${i18nString(UIStrings.addCommentButton)}
            .disabled=${!input.commentText.trim()}
            @click=${() => input.onAddComment(input.commentText)}>
            ${i18nString(UIStrings.addCommentButton)}
          </devtools-button>
        </div>
      ` : Lit.nothing}
    </div>
  `, target);
    // clang-format on
};
export class CommentThreadWidget extends UI.Widget.Widget {
    title = 'Comment Thread';
    #comments = [];
    #commentText = '';
    #textAreaRef = createRef();
    #view;
    onAddComment;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
        void this.updateComplete.then(() => {
            this.#textAreaRef.value?.focus({ preventScroll: true });
        });
    }
    set comments(comments) {
        this.#comments = comments;
        this.requestUpdate();
    }
    #handleLearnMoreClick = () => {
        // TODO: wire up the learn more click
    };
    #handleAddComment = (text) => {
        const commentText = text.trim();
        if (commentText && this.onAddComment) {
            this.onAddComment(commentText);
            this.#commentText = '';
            this.requestUpdate();
        }
    };
    #handleCommentTextChange = (event) => {
        const input = event.target;
        this.#commentText = input.value;
        this.requestUpdate();
    };
    performUpdate() {
        const viewInput = {
            title: this.title,
            comments: this.#comments,
            commentText: this.#commentText,
            textAreaRef: this.#textAreaRef,
            onLearnMoreClick: this.#handleLearnMoreClick,
            onAddComment: this.#handleAddComment,
            onCommentTextChange: this.#handleCommentTextChange,
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
}
//# sourceMappingURL=CommentThreadWidget.js.map