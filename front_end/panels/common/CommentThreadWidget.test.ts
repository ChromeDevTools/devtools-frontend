// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import type * as CommentManager from '../../models/comment_manager/comment_manager.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as Lit from '../../ui/lit/lit.js';

import * as PanelCommon from './common.js';

const {DEFAULT_VIEW, CommentThreadWidget} = PanelCommon.CommentThreadWidget;

describeWithEnvironment('CommentThreadWidget DEFAULT_VIEW', () => {
  function renderView(inputOverrides: Partial<Parameters<typeof DEFAULT_VIEW>[0]> = {}): HTMLElement {
    const target = document.createElement('div');
    target.style.width = '288px';

    DEFAULT_VIEW(
        {
          title: {text: 'div#container.grid'},
          comments: [],
          commentText: '',
          textAreaRef: Lit.Directives.createRef(),
          onAddComment: () => {},
          onCommentTextChange: () => {},
          onClose: () => {},
          ...inputOverrides,
        },
        undefined,
        target,
    );

    return target;
  }

  it('renders the empty draft state', async () => {
    const target = renderView();
    renderElementIntoDOM(target, {includeCommonStyles: true});
    await assertScreenshot('comments/comment_thread_widget_draft.png');
  });

  it('renders the draft state with text entered', async () => {
    const target = renderView({commentText: 'A comment from dev'});
    renderElementIntoDOM(target, {includeCommonStyles: true});
    await assertScreenshot('comments/comment_thread_widget_draft_with_text.png');
  });

  it('renders a submitted developer comment', async () => {
    const comments: CommentManager.CommentManager.Comment[] = [
      {author: 'DEVELOPER', text: 'Align this to the grid', timestamp: 0},
    ];
    const target = renderView({comments});
    renderElementIntoDOM(target, {includeCommonStyles: true});
    await assertScreenshot('comments/comment_thread_widget_submitted.png');
  });

  it('renders a developer comment with an agent response', async () => {
    const comments: CommentManager.CommentManager.Comment[] = [
      {author: 'DEVELOPER', text: 'Align this to the grid', timestamp: 0},
      {
        author: 'AGENT',
        text: 'Updated the rule to use `margin: 8px;`',
        timestamp: 1,
      },
    ];
    const target = renderView({comments});
    renderElementIntoDOM(target, {includeCommonStyles: true});
    await assertScreenshot('comments/comment_thread_widget_agent_response.png');
  });

  it('calls onClose when clicking the close button in both draft and submitted states', () => {
    const onCloseDraft = sinon.spy();
    const draftTarget = renderView({onClose: onCloseDraft});
    renderElementIntoDOM(draftTarget);

    const draftCloseButton = draftTarget.querySelector('.close-button') as HTMLElement;
    assert.isNotNull(draftCloseButton);
    draftCloseButton.click();
    sinon.assert.calledOnce(onCloseDraft);
    draftTarget.remove();

    const onCloseSubmitted = sinon.spy();
    const comments: CommentManager.CommentManager.Comment[] = [
      {author: 'DEVELOPER', text: 'Align this to the grid', timestamp: 0},
    ];
    const submittedTarget = renderView({comments, onClose: onCloseSubmitted});
    renderElementIntoDOM(submittedTarget);

    const submittedCloseButton = submittedTarget.querySelector('.close-button') as HTMLElement;
    assert.isNotNull(submittedCloseButton);
    submittedCloseButton.click();
    sinon.assert.calledOnce(onCloseSubmitted);
  });

  it('keeps sent status and close button within widget bounds when title is long', () => {
    const comments: CommentManager.CommentManager.Comment[] = [
      {author: 'DEVELOPER', text: 'Align this to the grid', timestamp: 0},
    ];
    const target = renderView({
      title: {text: 'div#very-long-container-id.class-one.class-two.class-three.class-four'},
      comments,
    });
    renderElementIntoDOM(target, {includeCommonStyles: true});

    const widgetEl = target.querySelector('.comment-thread-widget') as HTMLElement;
    const sentStatusEl = target.querySelector('.sent-status') as HTMLElement;
    const closeButtonEl = target.querySelector('.close-button') as HTMLElement;
    assert.isNotNull(widgetEl);
    assert.isNotNull(sentStatusEl);
    assert.isNotNull(closeButtonEl);

    const widgetRect = widgetEl.getBoundingClientRect();
    const sentRect = sentStatusEl.getBoundingClientRect();
    const closeRect = closeButtonEl.getBoundingClientRect();

    assert.isAtMost(sentRect.right, widgetRect.right);
    assert.isAtMost(closeRect.right, widgetRect.right);
  });
});

describeWithEnvironment('CommentThreadWidget presenter', () => {
  it('passes title and comments to view input and handles comment submission', async () => {
    const view = createViewFunctionStub(CommentThreadWidget);
    const widget = new CommentThreadWidget(undefined, view);
    const onAddComment = sinon.spy();
    widget.onAddComment = onAddComment;

    const comments: CommentManager.CommentManager.Comment[] = [
      {author: 'DEVELOPER', text: 'First comment', timestamp: 0},
    ];
    widget.title = {text: 'div#header'};
    widget.comments = comments;
    widget.performUpdate();

    assert.deepEqual(view.input.title, {text: 'div#header'});
    assert.deepEqual(view.input.comments, comments);

    view.input.onCommentTextChange({target: {value: '  hello  '}} as unknown as Event);
    await widget.updateComplete;
    assert.strictEqual(view.input.commentText, '  hello  ');

    view.input.onAddComment('   ');
    sinon.assert.notCalled(onAddComment);

    view.input.onAddComment(view.input.commentText);
    await widget.updateComplete;
    sinon.assert.calledOnceWithExactly(onAddComment, 'hello');
    assert.strictEqual(view.input.commentText, '');
  });

  it('focuses the textarea when shown', async () => {
    const view = createViewFunctionStub(CommentThreadWidget);
    const widget = new CommentThreadWidget(undefined, view);
    widget.performUpdate();

    const mockTextArea = document.createElement('textarea');
    const focusSpy = sinon.spy(mockTextArea, 'focus');
    assert.isDefined(view.input.textAreaRef);
    (view.input.textAreaRef as {value: HTMLTextAreaElement}).value = mockTextArea;

    widget.wasShown();
    await widget.updateComplete;

    sinon.assert.calledOnceWithExactly(focusSpy, {preventScroll: true});
  });
});
