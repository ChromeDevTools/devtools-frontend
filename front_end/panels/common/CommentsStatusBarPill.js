// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import commentsStatusBarPillStyles from './commentsStatusBarPill.css.js';
const UIStrings = {
    /**
     * @description Button text for the comments status bar pill showing the number of open comments.
     * @example {2} PH1
     */
    commentsCount: 'Comments ({PH1})',
    /**
     * @description Button text for sending all draft comments to the agent in the comments status bar pill.
     * @example {2} PH1
     */
    sendToAgentCount: 'Send to agent ({PH1})',
};
const str_ = i18n.i18n.registerUIStrings('panels/common/CommentsStatusBarPill.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { html, render } = Lit;
export const DEFAULT_VIEW = (input, _output, target) => {
    const unsentCount = input.threads.filter(thread => thread.status === 'ACTIVE').length;
    const tooltip = input.threads.flatMap(thread => thread.comments.map(comment => comment.text)).join('\n');
    // clang-format off
    render(html `
    <style>${commentsStatusBarPillStyles}</style>
    ${input.threads.length <= 0 ? Lit.nothing : html `
      <div class="pill-container">
        <button
          class="devtools-pill"
          title=${tooltip}
          ?disabled=${input.disabled}
          @click=${input.onPillClick}
          jslog=${VisualLogging.action('comments-status-bar-pill').track({ click: true })}>
          ${i18nString(UIStrings.commentsCount, { PH1: input.threads.length })}
        </button>
        ${unsentCount > 0 ? html `
          <devtools-button
            .variant=${"primary" /* Buttons.Button.Variant.PRIMARY */}
            .disabled=${Boolean(input.disabled)}
            .jslogContext=${'comments-send-to-agent'}
            @click=${input.onSendToAgentClick}>
            ${i18nString(UIStrings.sendToAgentCount, { PH1: unsentCount })}
          </devtools-button>
        ` : Lit.nothing}
      </div>
    `}
  `, target);
    // clang-format on
};
export class CommentsStatusBarPill extends UI.Widget.Widget {
    static INJECT = [CommentManager.CommentManager.CommentManager];
    #view;
    #commentManager;
    constructor(element, [commentManager], view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
        this.#commentManager = commentManager;
    }
    #onThreadsChanged() {
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        this.#commentManager.addEventListener("CommentThreadsChanged" /* CommentManager.CommentManager.Events.COMMENT_THREADS_CHANGED */, this.#onThreadsChanged, this);
        this.#commentManager.addEventListener("AgentAttachedChanged" /* CommentManager.CommentManager.Events.AGENT_ATTACHED_CHANGED */, this.#onThreadsChanged, this);
        this.requestUpdate();
    }
    willHide() {
        this.#commentManager.removeEventListener("CommentThreadsChanged" /* CommentManager.CommentManager.Events.COMMENT_THREADS_CHANGED */, this.#onThreadsChanged, this);
        this.#commentManager.removeEventListener("AgentAttachedChanged" /* CommentManager.CommentManager.Events.AGENT_ATTACHED_CHANGED */, this.#onThreadsChanged, this);
        super.willHide();
    }
    performUpdate() {
        const viewInput = {
            threads: this.#commentManager.isAgentAttached() ?
                this.#commentManager.getCommentThreads().filter(thread => thread.status !== 'DRAFT') :
                [],
            onPillClick: this.#handlePillClick,
            onSendToAgentClick: this.#handleSendToAgentClick,
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
    #handlePillClick = () => { };
    #handleSendToAgentClick = () => {
        for (const thread of this.#commentManager.getCommentThreads()) {
            if (thread.status === 'ACTIVE') {
                thread.sendToAgent();
            }
        }
    };
}
//# sourceMappingURL=CommentsStatusBarPill.js.map