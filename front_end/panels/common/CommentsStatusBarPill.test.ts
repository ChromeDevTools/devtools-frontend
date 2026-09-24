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

  it('sends all saved (ACTIVE) threads to agent when onSendToAgentClick is invoked', async () => {
    const {commentManager, view} = await createWidget();

    const draft = commentManager.createCommentThread(
        {} as CommentManager.CommentManager.CommentAnchorSignature,
        'unsaved draft',
    );
    const saved1 = commentManager.createCommentThread(
        {} as CommentManager.CommentManager.CommentAnchorSignature,
        'saved 1',
    );
    saved1.save();
    const saved2 = commentManager.createCommentThread(
        {} as CommentManager.CommentManager.CommentAnchorSignature,
        'saved 2',
    );
    saved2.save();
    const sent = commentManager.createCommentThread(
        {} as CommentManager.CommentManager.CommentAnchorSignature,
        'already sent',
    );
    sent.sendToAgent();
    await view.nextInput;

    const draftSendSpy = sinon.spy(draft, 'sendToAgent');
    const sentSendSpy = sinon.spy(sent, 'sendToAgent');

    assert.strictEqual(draft.status, 'DRAFT');
    assert.strictEqual(saved1.status, 'ACTIVE');
    assert.strictEqual(saved2.status, 'ACTIVE');
    assert.strictEqual(sent.status, 'SENT_TO_AGENT');

    view.input.onSendToAgentClick?.();
    await view.nextInput;

    assert.strictEqual(draft.status, 'DRAFT');
    assert.strictEqual(saved1.status, 'SENT_TO_AGENT');
    assert.strictEqual(saved2.status, 'SENT_TO_AGENT');
    sinon.assert.notCalled(draftSendSpy);
    sinon.assert.notCalled(sentSendSpy);
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

  function createSavedThread(text = 'Saved comment'): CommentManager.CommentThread.CommentThread {
    const thread = new CommentManager.CommentThread.CommentThread({
      comments: [],
      anchor: {} as CommentManager.CommentManager.CommentAnchorSignature,
    });
    thread.save(text);
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
          onPillClick: () => {},
          disabled: false,
          ...inputOverrides,
        },
        undefined,
        target,
    );

    return target;
  }

  it('renders the button text with thread count, tooltip, and visual logging attribute', () => {
    const target = renderView();
    const button = target.querySelector<HTMLButtonElement>('button.devtools-pill');
    assert.strictEqual(button?.textContent?.trim(), 'Comments (2)');
    assert.strictEqual(button?.title, 'First comment\nSecond comment');
    assert.strictEqual(
        button?.getAttribute('jslog'),
        `${VisualLogging.action('comments-status-bar-pill').track({click: true})}`,
    );
    assert.isNull(target.querySelector('devtools-button'));
  });

  it('renders the "Send to agent (count)" button when there are saved (ACTIVE) threads', () => {
    const onSendToAgentClick = sinon.spy();
    const savedThread1 = createSavedThread();
    const savedThread2 = createSavedThread();
    const sentThread = createSentThread();

    const target = renderView({
      threads: [savedThread1, savedThread2, sentThread],
      onSendToAgentClick,
    });

    const pillButton = target.querySelector('button.devtools-pill');
    assert.strictEqual(pillButton?.textContent?.trim(), 'Comments (3)');

    const sendButton = target.querySelector('devtools-button');
    assert.isNotNull(sendButton);
    assert.strictEqual(sendButton?.textContent?.trim(), 'Send to agent (2)');
    assert.strictEqual(sendButton?.jslogContext, 'comments-send-to-agent');
    assert.isFalse(sendButton?.disabled);

    sendButton?.click();
    sinon.assert.calledOnce(onSendToAgentClick);

    const disabledTarget = renderView({
      threads: [savedThread1],
      disabled: true,
    });
    assert.isTrue(disabledTarget.querySelector('devtools-button')?.disabled);
  });

  it('renders screenshot with thread count', async () => {
    const target = renderView();
    renderElementIntoDOM(target, {includeCommonStyles: true});
    await assertScreenshot('status_bar/status_bar.png');
  });

  it('renders disabled state screenshot', async () => {
    const target = renderView({disabled: true});
    renderElementIntoDOM(target, {includeCommonStyles: true});
    await assertScreenshot('status_bar/status_bar_disabled.png');
  });
});
