// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import {
  assertScreenshot,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Comments from './comments.js';

const {CommentsStatusBarPill, DEFAULT_VIEW} = Comments.CommentsStatusBarPill;

describeWithEnvironment('CommentsStatusBarPill', () => {
  async function createWidget() {
    const view = createViewFunctionStub(CommentsStatusBarPill);
    const commentManager = new CommentManager.CommentManager.CommentManager();
    const widget = new CommentsStatusBarPill(undefined, [commentManager], view);

    widget.wasShown();
    await view.nextInput;

    return {commentManager, view, widget};
  }

  it('renders with initial state', async () => {
    const {view} = await createWidget();
    assert.isNotNull(view.input);
    assert.deepEqual(view.input.threads, []);
  });

  it('updates threads on COMMENT_THREADS_CHANGED while shown', async () => {
    const {commentManager, view} = await createWidget();

    commentManager.createCommentThread(
        {} as CommentManager.CommentManager.CommentAnchorSignature,
        'test',
    );

    const input = await view.nextInput;
    assert.lengthOf(input.threads, 1);
  });

  it('unsubscribes from commentManager on willHide', async () => {
    const {commentManager, widget} = await createWidget();

    const removeListenerSpy = sinon.spy(commentManager, 'removeEventListener');
    widget.willHide();

    sinon.assert.calledWith(
        removeListenerSpy,
        CommentManager.CommentManager.Events.COMMENT_THREADS_CHANGED,
    );
  });
});

describe('DEFAULT_VIEW', () => {
  function renderView(inputOverrides: Partial<Parameters<typeof DEFAULT_VIEW>[0]> = {}): HTMLElement {
    const target = document.createElement('div');
    renderElementIntoDOM(target, {includeCommonStyles: true});

    DEFAULT_VIEW(
        {
          threads: [
            {
              id: '1',
              comments: [],
              anchor: {} as CommentManager.CommentManager.CommentAnchorSignature,
              status: 'ACTIVE',
            },
            {
              id: '2',
              comments: [],
              anchor: {} as CommentManager.CommentManager.CommentAnchorSignature,
              status: 'ACTIVE',
            },
          ],
          onPillClick: () => {},
          disabled: false,
          ...inputOverrides,
        },
        undefined,
        target,
    );

    return target;
  }

  it('renders the status bar with thread count', async () => {
    renderView();
    await assertScreenshot('status_bar/status_bar.png');
  });

  it('renders disabled state', async () => {
    renderView({disabled: true});
    await assertScreenshot('status_bar/status_bar_disabled.png');
  });
});
