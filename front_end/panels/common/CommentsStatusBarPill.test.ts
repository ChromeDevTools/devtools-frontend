// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';
import sinon from 'sinon';

import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import {
  assertScreenshot,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as PanelCommon from './common.js';

const {CommentsStatusBarPill, DEFAULT_VIEW} = PanelCommon.CommentsStatusBarPill;

describeWithEnvironment('CommentsStatusBarPill', () => {
  async function createWidget() {
    const view = createViewFunctionStub(CommentsStatusBarPill);
    const commentManager = new CommentManager.CommentManager.CommentManager();
    commentManager.setAgentAttached(true);
    const widget = new CommentsStatusBarPill(undefined, [commentManager], view);

    widget.wasShown();
    await view.nextInput;

    return {commentManager, view, widget};
  }

  it('renders with initial state', async () => {
    const {view} = await createWidget();
    assert.isNotNull(view.input);
    assert.deepEqual(view.input.threads, []);
    assert.strictEqual(view.input.respondedCount, 0);
  });

  it('counts only threads that the agent has responded to', async () => {
    const {commentManager, view} = await createWidget();

    const first = commentManager.createCommentThread(
        {} as CommentManager.CommentManager.CommentAnchorSignature,
        'first',
    );
    const second = commentManager.createCommentThread(
        {} as CommentManager.CommentManager.CommentAnchorSignature,
        'second',
    );
    await view.nextInput;

    first.sendToAgent();
    second.sendToAgent();
    const inputAfterSend = await view.nextInput;
    assert.lengthOf(inputAfterSend.threads, 2);
    assert.strictEqual(inputAfterSend.respondedCount, 0);

    commentManager.resolveCommentThread(first.id, 'Done');
    const inputAfterResolve = await view.nextInput;
    assert.lengthOf(inputAfterResolve.threads, 2);
    assert.strictEqual(inputAfterResolve.respondedCount, 1);
  });

  it('updates threads on COMMENT_THREADS_CHANGED while shown', async () => {
    const {commentManager, view} = await createWidget();

    const thread = commentManager.createCommentThread(
        {} as CommentManager.CommentManager.CommentAnchorSignature,
        'test',
    );

    const input = await view.nextInput;
    assert.deepEqual(input.threads, []);

    thread.save();
    const inputAfterSave = await view.nextInput;
    assert.lengthOf(inputAfterSave.threads, 1);

    commentManager.setAgentAttached(false);
    const inputAfterDetach = await view.nextInput;
    assert.deepEqual(inputAfterDetach.threads, []);
  });

  it('unsubscribes from commentManager on willHide', async () => {
    const {commentManager, widget} = await createWidget();

    const removeListenerSpy = sinon.spy(commentManager, 'removeEventListener');
    widget.willHide();

    sinon.assert.calledWith(
        removeListenerSpy,
        CommentManager.CommentManager.Events.COMMENT_THREADS_CHANGED,
    );
    sinon.assert.calledWith(
        removeListenerSpy,
        CommentManager.CommentManager.Events.AGENT_ATTACHED_CHANGED,
    );
  });
});

describeWithEnvironment('DEFAULT_VIEW', () => {
  function createSentThread(text = 'Sent comment'): CommentManager.CommentThread.CommentThread {
    const thread = new CommentManager.CommentThread.CommentThread({
      comments: [],
      anchor: {} as CommentManager.CommentManager.CommentAnchorSignature,
    });
    thread.sendToAgent(text);
    return thread;
  }

  function renderView(inputOverrides: Partial<Parameters<typeof DEFAULT_VIEW>[0]> = {}): HTMLElement {
    const target = document.createElement('div');

    DEFAULT_VIEW(
        {
          threads: [
            createSentThread('First comment'),
            createSentThread('Second comment'),
          ],
          respondedCount: 0,
          onPillClick: () => {},
          disabled: false,
          ...inputOverrides,
        },
        undefined,
        target,
    );

    return target;
  }

  it('renders the button text without a count, tooltip, and visual logging attribute', () => {
    const target = renderView();
    const button = target.querySelector<HTMLButtonElement>('button.devtools-pill');
    assert.strictEqual(button?.textContent?.trim(), 'Show comments');
    assert.strictEqual(button?.title, 'First comment\nSecond comment');
    assert.strictEqual(
        button?.getAttribute('jslog'),
        `${VisualLogging.action('comments-status-bar-pill').track({click: true})}`,
    );
  });

  it('renders the number of responded threads in the button text', () => {
    const target = renderView({respondedCount: 2});
    const button = target.querySelector<HTMLButtonElement>('button.devtools-pill');
    assert.strictEqual(button?.textContent?.trim(), 'Show comments (2)');
  });

  it('renders nothing when there are no threads', () => {
    const target = renderView({threads: []});
    assert.isNull(target.querySelector('button.devtools-pill'));
  });

  it('renders screenshot with responded count', async () => {
    const target = renderView({respondedCount: 2});
    renderElementIntoDOM(target, {includeCommonStyles: true});
    await assertScreenshot('status_bar/status_bar.png');
  });

  it('renders disabled state screenshot', async () => {
    const target = renderView({disabled: true});
    renderElementIntoDOM(target, {includeCommonStyles: true});
    await assertScreenshot('status_bar/status_bar_disabled.png');
  });
});
