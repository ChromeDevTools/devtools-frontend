// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
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

  function seedThreads(commentManager: CommentManager.CommentManager.CommentManager) {
    const t1 = commentManager.createCommentThread(
        {
          vePath: 'Panel: elements > Pane: styles > a.o-text-cta--small',
          textSignature: 'a.o-text-cta--small',
        },
        'Left align this button with H2 and use the primary pink colour for the button.',
    );
    t1.save();
    const t2 = commentManager.createCommentThread(
        {
          vePath: 'Panel: elements > Pane: styles > img.wp-image-1448',
          textSignature: 'img.wp-image-1448',
        },
        'Add an animation to the hero image.',
    );
    t2.save();
    const t3 = commentManager.createCommentThread(
        {
          vePath: 'Panel: elements > Pane: styles > div.c-scrolling-list_ft...',
          textSignature: 'div.c-scrolling-list_ft...',
        },
        'Remove the animation from H1.',
    );
    t3.save();
    return [t1, t2, t3];
  }

  it('initializes with empty threads list if no threads exist', async () => {
    const {view, commentManager} = await createWidget();

    assert.lengthOf(view.input.threads, 0);
    assert.lengthOf(commentManager.getCommentThreads(), 0);
  });

  it('deletes a comment thread when delete button is clicked', async () => {
    const commentManager = new CommentManager.CommentManager.CommentManager();
    const [t1] = seedThreads(commentManager);
    const {view} = await createWidget(commentManager);

    view.input.onDeleteThread(t1.id);
    const updatedInput = await view.nextInput;

    assert.lengthOf(updatedInput.threads, 2);
    assert.isUndefined(commentManager.getCommentThread(t1.id));
  });

  it('clears all comments when clear button is clicked', async () => {
    const commentManager = new CommentManager.CommentManager.CommentManager();
    seedThreads(commentManager);
    const {view} = await createWidget(commentManager);

    assert.lengthOf(view.input.threads, 3);
    view.input.onClearAll();
    const updatedInput = await view.nextInput;

    assert.lengthOf(updatedInput.threads, 0);
    assert.lengthOf(commentManager.getCommentThreads(), 0);
  });

  it('does not display draft comment threads in the drawer', async () => {
    const {view, commentManager} = await createWidget();

    // Create a draft thread (such as created by ChangeTracker)
    commentManager.createCommentThread(
        {
          vePath: 'Panel: elements > Tree: elements > TreeItem',
          textSignature: 'div.deleted',
          node: {backendNodeId: 101, targetId: 'main'},
        },
    );

    // Create an active thread
    const activeThread = commentManager.createCommentThread(
        {
          vePath: 'Panel: elements > Tree: elements > TreeItem',
          textSignature: 'div.active',
          node: {backendNodeId: 102, targetId: 'main'},
        },
        'Active comment',
    );
    activeThread.save();

    const updatedInput = await view.nextInput;
    assert.lengthOf(updatedInput.threads, 1);
    assert.strictEqual(updatedInput.threads[0].thread.id, activeThread.id);
  });

  it('reveals the comment thread when clicked', async () => {
    const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal').resolves();
    const commentManager = new CommentManager.CommentManager.CommentManager();
    const [t1] = seedThreads(commentManager);
    const {view} = await createWidget(commentManager);

    view.input.onThreadClick(t1);

    sinon.assert.calledOnceWithExactly(revealStub, t1, false);
  });

  it('sends all active threads to agent when send to agent button is clicked', async () => {
    const commentManager = new CommentManager.CommentManager.CommentManager();
    const [t1, t2] = seedThreads(commentManager);
    const {view} = await createWidget(commentManager);

    assert.strictEqual(t1.status, 'ACTIVE');
    assert.strictEqual(t2.status, 'ACTIVE');

    view.input.onSendToAgent();
    await view.nextInput;

    assert.strictEqual(t1.status, 'SENT_TO_AGENT');
    assert.strictEqual(t2.status, 'SENT_TO_AGENT');
  });
});

describeWithEnvironment('CommentsPane DEFAULT_VIEW', () => {
  function renderView(inputOverrides: Partial<Parameters<typeof DEFAULT_VIEW>[0]> = {}): HTMLElement {
    const target = document.createElement('div');
    target.style.width = '360px';
    target.style.height = '480px';

    DEFAULT_VIEW(
        {
          threads: [],
          onClearAll: () => {},
          onThreadClick: () => {},
          onDeleteThread: () => {},
          onSendToAgent: () => {},
          ...inputOverrides,
        },
        undefined,
        target,
    );

    return target;
  }

  function createMockThread(
      index: number,
      selectorText: string,
      commentText: string,
      options: Partial<Comments.CommentsPane.ThreadViewData> = {},
      ): Comments.CommentsPane.ThreadViewData {
    const thread = new CommentManager.CommentThread.CommentThread({
      anchor: {
        vePath: `Panel: elements > ${selectorText}`,
        textSignature: selectorText,
      },
      comments: [{author: 'DEVELOPER', text: commentText, timestamp: 0}],
    });
    return {
      thread,
      title: {text: selectorText},
      commentText,
      ...options,
    };
  }

  it('renders the empty state', async () => {
    const target = renderView({threads: []});
    renderElementIntoDOM(target, {includeCommonStyles: true});
    await assertScreenshot('comments/comments_pane_empty.png');
  });

  it('renders comments list with various thread states', async () => {
    const threads: Comments.CommentsPane.ThreadViewData[] = [
      createMockThread(
          1,
          'a.o-text-cta--small',
          'Left align this button with H2 and use the primary pink colour for the button.',
          ),
      createMockThread(
          2,
          'div.c-scrolling-list',
          'Remove the animation from H1.',
          ),
      createMockThread(
          3,
          'span.sub-header',
          'Updated font weight.',
          ),
    ];

    const target = renderView({threads});
    renderElementIntoDOM(target, {includeCommonStyles: true});
    await assertScreenshot('comments/comments_pane_list.png');
  });

  it('does not trigger thread selection when pressing Enter or Space on the delete button', () => {
    const onThreadClick = sinon.spy();

    const mockThreadData = createMockThread(1, 'a.button', 'Test comment');
    const target = renderView({
      threads: [mockThreadData],
      onThreadClick,
    });

    renderElementIntoDOM(target);
    const deleteButton = target.querySelector('.comment-thread-item devtools-button') as HTMLElement;
    assert.isNotNull(deleteButton);

    for (const key of ['Enter', ' ']) {
      const keydownEvent = new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true});
      deleteButton.dispatchEvent(keydownEvent);
      assert.isFalse(keydownEvent.defaultPrevented);
    }

    sinon.assert.notCalled(onThreadClick);

    const threadItem = target.querySelector('.comment-thread-item') as HTMLElement;
    threadItem.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true, cancelable: true}));
    sinon.assert.calledOnceWithExactly(onThreadClick, mockThreadData.thread);
  });
});
