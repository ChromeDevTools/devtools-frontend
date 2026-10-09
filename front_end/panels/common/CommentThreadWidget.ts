// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/tooltips/tooltips.js';

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Input from '../../ui/components/input/input.js';
import * as MarkdownView from '../../ui/components/markdown_view/markdown_view.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import commentThreadWidgetStyles from './commentThreadWidget.css.js';
import {DOMNodeLink} from './DOMLinkifier.js';

const {html, render, Directives: {createRef, ref}} = Lit;
const {widget} = UI.Widget;

const UIStrings = {
  /**
   * @description Text next to the checkmark in the comment thread header indicating that comments have been sent to
   * the agent.
   */
  sent: 'Sent',
  /**
   * @description Tooltip and accessible label for the icon button in the comment thread header that deletes a queued
   * comment (a comment saved locally but not yet sent to the agent).
   */
  deleteQueuedComment: 'Delete queued comment',
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
  sendToAgent: 'Send to agent',
  /**
   * @description Label of the submit button while the Cmd (Mac) or Ctrl (Windows/Linux) key is held. Clicking it
   * saves the comment locally so that it is sent to the agent together with the next comment, instead of immediately.
   */
  queueComment: 'Queue comment',
  /**
   * @description aria-label for the comment text area.
   */
  commentInputAriaLabel: 'Comment input',
} as const;

const UIStringsNotTranslate = {
  /**
   * @description Disclaimer text in the comment thread info tooltip.
   */
  inputDisclaimer:
      'Comment strings, DOM hierarchy snippets, tracked CSS and DOM changes, Visual Element (VE) paths and signatures, and tracked presenter changes are sent to the connected third-party agent to assist with debugging and code updates',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/common/CommentThreadWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const lockedString = i18n.i18n.lockedString;

/**
 * Either the DOM node the thread is anchored to, or a plain text label for anchors that are not
 * DOM nodes (e.g. network requests).
 */
export type Title = {
  node: SDK.DOMModel.DOMNode,
}|{text: string};

export interface ViewInput {
  title: Title;
  comments: CommentManager.CommentManager.Comment[];
  commentText: string;
  /** Whether Cmd (Mac) or Ctrl (other platforms) is currently held, switching submit to "queue". */
  isQueueModifierPressed: boolean;
  textAreaRef: Lit.Directives.Ref<HTMLTextAreaElement>;
  status: CommentManager.CommentManager.CommentThreadStatus;
  onAddComment: (text: string) => void;
  onQueueComment: (text: string) => void;
  onCommentTextChange: (event: Event) => void;
  onDeleteQueuedComment: () => void;
  /** Reports Cmd (Mac) / Ctrl (other platforms) state while typing in the textarea. */
  onQueueModifierChange: (pressed: boolean) => void;
}

export type ViewOutput = undefined;

export const DEFAULT_VIEW = (input: ViewInput, _output: ViewOutput, target: HTMLElement): void => {
  const hasComment = input.comments.length > 0;
  const buttonText =
      input.isQueueModifierPressed ? i18nString(UIStrings.queueComment) : i18nString(UIStrings.sendToAgent);

  const submit = (queue: boolean): void => {
    if (queue) {
      input.onQueueComment(input.commentText);
    } else {
      input.onAddComment(input.commentText);
    }
  };

  // clang-format off
  const renderHeaderStatus = (): Lit.LitTemplate => {
    if (!hasComment) {
      return Lit.nothing;
    }

    switch (input.status) {
      case 'SENT_TO_AGENT':
        // clang-format off
        return html`
          <div class="sent-status">
            <devtools-icon
              class="check-icon"
              name="checkmark"
              aria-label=${i18nString(UIStrings.sentCheckmark)}>
            </devtools-icon>
            <span>${i18nString(UIStrings.sent)}</span>
          </div>
        `;
        // clang-format on
      case 'ACTIVE':
        // clang-format off
        return html`
          <devtools-button
            class="delete-button"
            aria-label=${i18nString(UIStrings.deleteQueuedComment)}
            .iconName=${'bin'}
            .variant=${Buttons.Button.Variant.ICON}
            .size=${Buttons.Button.Size.SMALL}
            .title=${i18nString(UIStrings.deleteQueuedComment)}
            @click=${input.onDeleteQueuedComment}
          ></devtools-button>
        `;
        // clang-format on
      default:
        return Lit.nothing;
    }
  };

  // clang-format off
  render(html`
    <style>${Input.textInputStyles}${commentThreadWidgetStyles}</style>
    <div
      class="comment-thread-widget ${hasComment ? 'submitted' : ''}"
      jslog=${VisualLogging.popover('comment-thread')}>
      <div class="header">
        <span class="selected-item">
          ${'node' in input.title ?
            widget(DOMNodeLink, {node: input.title.node}) :
            html`<span class="selected-item-text">${input.title.text}</span>`}
        </span>
        <div class="header-actions">
          ${renderHeaderStatus()}
        </div>
      </div>

      ${hasComment ? html`
        ${input.comments.map(comment => comment.author === 'DEVELOPER' ? html`
          <div class="comment-text">
            ${comment.text}
          </div>
        ` : html`
          <div class="agent-response">
            <div class="elbow"></div>
            <div class="response-content">
              <div class="response-header">${i18nString(UIStrings.response)}</div>
              ${MarkdownView.MarkdownView.renderTextAsMarkdown(
                comment.text,
                new MarkdownView.MarkdownView.MarkdownInsightRenderer(),
              )}
            </div>
          </div>
        `)}
      ` : Lit.nothing}

      ${!hasComment ? html`
        <textarea
          ${ref(input.textAreaRef)}
          class="devtools-text-input input"
          rows="1"
          aria-label=${i18nString(UIStrings.commentInputAriaLabel)}
          .value=${input.commentText}
          @input=${input.onCommentTextChange}
          @keydown=${(event: KeyboardEvent) => {
            const queueModifier = UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event);
            input.onQueueModifierChange(queueModifier);
            if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
              event.preventDefault();
              submit(queueModifier);
            }
          }}
          @keyup=${(event: KeyboardEvent) =>
            input.onQueueModifierChange(UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event))}
          @blur=${() => input.onQueueModifierChange(false)}
          jslog=${VisualLogging.textField('comments-input').track({keydown: 'Enter'})}
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
            </div>
          </devtools-tooltip>
          <devtools-button
            aria-label=${buttonText}
            .disabled=${!input.commentText.trim()}
            @mousedown=${(event: MouseEvent) => {
              event.preventDefault();
            }}
            @click=${(event: MouseEvent) => submit(
              input.isQueueModifierPressed || UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event),
            )}
            jslog=${VisualLogging.action('comments-send-to-agent').track({click: true})}>
            ${buttonText}
          </devtools-button>
        </div>
      ` : Lit.nothing}
    </div>
  `, target);
  // clang-format on
};

type View = typeof DEFAULT_VIEW;

export class CommentThreadWidget extends UI.Widget.Widget {
  title: Title = {text: ''};
  #comments: CommentManager.CommentManager.Comment[] = [];
  #commentText = '';
  #status: CommentManager.CommentManager.CommentThreadStatus = 'DRAFT';
  #isQueueModifierPressed = false;
  #textAreaRef = createRef<HTMLTextAreaElement>();
  #view: View;
  onAddComment?: (text: string) => void;
  onQueueComment?: (text: string) => void;
  onDeleteQueuedComment?: () => void;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.#textAreaRef.value?.focus({preventScroll: true});
    });
  }

  override willHide(): void {
    this.#isQueueModifierPressed = false;
    super.willHide();
  }

  set comments(comments: CommentManager.CommentManager.Comment[]) {
    this.#comments = comments;
    this.requestUpdate();
  }

  set status(commentStatus: CommentManager.CommentManager.CommentThreadStatus) {
    this.#status = commentStatus;
    this.requestUpdate();
  }

  #handleQueueModifierChange = (pressed: boolean): void => {
    if (this.#isQueueModifierPressed !== pressed) {
      this.#isQueueModifierPressed = pressed;
      this.requestUpdate();
    }
  };

  #submit(text: string, callback: ((text: string) => void)|undefined): void {
    const commentText = text.trim();
    if (commentText && callback) {
      callback(commentText);
      this.#commentText = '';
      this.requestUpdate();
    }
  }

  #handleAddComment = (text: string): void => {
    this.#submit(text, this.onAddComment);
  };

  #handleQueueComment = (text: string): void => {
    this.#submit(text, this.onQueueComment);
  };

  #handleDeleteQueuedComment = (): void => {
    this.onDeleteQueuedComment?.();
  };

  #handleCommentTextChange = (event: Event): void => {
    const input = event.target as HTMLTextAreaElement;
    this.#commentText = input.value;
    this.requestUpdate();
  };

  override performUpdate(): void {
    const viewInput: ViewInput = {
      title: this.title,
      comments: this.#comments,
      commentText: this.#commentText,
      isQueueModifierPressed: this.#isQueueModifierPressed,
      textAreaRef: this.#textAreaRef,
      status: this.#status,
      onAddComment: this.#handleAddComment,
      onQueueComment: this.#handleQueueComment,
      onCommentTextChange: this.#handleCommentTextChange,
      onDeleteQueuedComment: this.#handleDeleteQueuedComment,
      onQueueModifierChange: this.#handleQueueModifierChange,
    };
    this.#view(viewInput, undefined, this.contentElement);
  }
}

export async function computeCommentTitle(
    anchor: CommentManager.CommentManager.CommentAnchorSignature,
    ): Promise<Title> {
  if (anchor.node) {
    const target = SDK.TargetManager.TargetManager.instance().targetById(anchor.node.targetId);
    if (target) {
      const deferredNode = new SDK.DOMModel.DeferredDOMNode(
          target,
          anchor.node.backendNodeId as Protocol.DOM.BackendNodeId,
      );
      const node = await deferredNode.resolvePromise();
      if (node) {
        return {node};
      }
    }
  }

  if (anchor.networkRequestId) {
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    const request = target?.model(SDK.NetworkManager.NetworkManager)?.requestForId(anchor.networkRequestId);
    if (request) {
      return {text: request.name()};
    }
  }

  return {text: anchor.textSignature || ''};
}
