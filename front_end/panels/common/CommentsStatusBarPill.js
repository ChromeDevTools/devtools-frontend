// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import commentsStatusBarPillStyles from './commentsStatusBarPill.css.js';
const UIStrings = {
    /**
     * @description Button text for the comments status bar pill. Clicking it opens the Comments panel.
     */
    viewComments: 'View comments',
    /**
     * @description Button text for the comments status bar pill when the AI agent has responded to some
     * comments and the user has not seen these responses yet. Clicking it opens the Comments panel.
     * @example {2} PH1
     */
    viewCommentsWithCount: 'View comments ({PH1})',
};
const str_ = i18n.i18n.registerUIStrings('panels/common/CommentsStatusBarPill.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { html, render } = Lit;
export const DEFAULT_VIEW = (input, _output, target) => {
    const tooltip = input.threads.flatMap(thread => thread.comments.map(comment => comment.text)).join('\n');
    // clang-format off
    render(html `
    <style>${commentsStatusBarPillStyles}</style>
    ${input.threads.length <= 0 ? Lit.nothing : html `
      <button
        class="devtools-pill"
        title=${tooltip}
        aria-label=${input.unseenResponseCount > 0 ?
        i18nString(UIStrings.viewCommentsWithCount, { PH1: input.unseenResponseCount }) :
        i18nString(UIStrings.viewComments)}
        ?disabled=${input.disabled}
        @click=${input.onPillClick}
        jslog=${VisualLogging.action('comments-status-bar-pill').track({ click: true })}>
        <span>${i18nString(UIStrings.viewComments)}</span>
        ${input.unseenResponseCount > 0 ? html `
          <span class="comments-counter-badge">${input.unseenResponseCount}</span>
        ` : Lit.nothing}
      </button>
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
        const threads = this.#commentManager.isAgentAttached() ?
            this.#commentManager.getCommentThreads().filter(thread => thread.status !== 'DRAFT') :
            [];
        const viewInput = {
            threads,
            unseenResponseCount: threads.filter(thread => thread.status === 'RESOLVED' && !thread.responseSeen).length,
            onPillClick: this.#handlePillClick,
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
    #handlePillClick = () => {
        void UI.ViewManager.ViewManager.instance().showView('comments');
    };
}
//# sourceMappingURL=CommentsStatusBarPill.js.map