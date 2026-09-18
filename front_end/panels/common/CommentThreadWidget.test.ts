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
          title: 'div#container',
          comments: [],
          commentText: '',
          textAreaRef: Lit.Directives.createRef(),
          onAddComment: () => {},
          onCommentTextChange: () => {},
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
    widget.title = 'div#header';
    widget.comments = comments;
    widget.performUpdate();

    assert.strictEqual(view.input.title, 'div#header');
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
