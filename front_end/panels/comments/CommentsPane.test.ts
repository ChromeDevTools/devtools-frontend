// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Comments from './comments.js';

const {CommentsPane} = Comments;
const {DEFAULT_VIEW} = CommentsPane;

describeWithEnvironment('CommentsPane', () => {
  async function createWidget(
      commentManager = new CommentManager.CommentManager.CommentManager(),
  ) {
    const view = createViewFunctionStub(CommentsPane.CommentsPane);
    const widget = new CommentsPane.CommentsPane(undefined, [commentManager], view);
    widget.wasShown();
    await view.nextInput;
    return {view, widget, commentManager};
  }

  it('clears all comments when clear button is clicked', async () => {
    const commentManager = new CommentManager.CommentManager.CommentManager();
    const thread = commentManager.createCommentThread(
        {
          vePath: 'Panel: elements > Pane: styles > a.o-text-cta--small',
          textSignature: 'a.o-text-cta--small',
        },
        'Test comment',
    );
    thread.save();
    const {view} = await createWidget(commentManager);

    assert.lengthOf(commentManager.getCommentThreads(), 1);
    view.input.onClearAll();
    await view.nextInput;

    assert.lengthOf(commentManager.getCommentThreads(), 0);
  });
});

describeWithEnvironment('CommentsPane DEFAULT_VIEW', () => {
  function renderView(inputOverrides: Partial<Parameters<typeof DEFAULT_VIEW>[0]> = {}): HTMLElement {
    const target = document.createElement('div');
    target.style.width = '360px';
    target.style.height = '480px';

    DEFAULT_VIEW(
        {
          onClearAll: () => {},
          onSendToAgent: () => {},
          ...inputOverrides,
        },
        undefined,
        target,
    );

    return target;
  }

  it('renders the empty state', async () => {
    const target = renderView();
    renderElementIntoDOM(target, {includeCommonStyles: true});
    await assertScreenshot('comments/comments_pane_empty.png');
  });
});
