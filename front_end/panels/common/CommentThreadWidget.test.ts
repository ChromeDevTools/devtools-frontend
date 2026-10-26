// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';
import sinon from 'sinon';

import * as Host from '../../core/host/host.js';
import type * as CommentManager from '../../models/comment_manager/comment_manager.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as Lit from '../../ui/lit/lit.js';

import * as PanelCommon from './common.js';

const {DEFAULT_VIEW, CommentThreadWidget} = PanelCommon.CommentThreadWidget;

/** Cmd on Mac, Ctrl elsewhere — mirrors `KeyboardShortcut.eventHasCtrlEquivalentKey`. */
function queueModifier(): {key: string, metaKey: boolean, ctrlKey: boolean} {
  const isMac = Host.Platform.isMac();
  return {key: isMac ? 'Meta' : 'Control', metaKey: isMac, ctrlKey: !isMac};
}

function renderView(inputOverrides: Partial<Parameters<typeof DEFAULT_VIEW>[0]> = {},
                    target?: HTMLElement): HTMLElement {
  if (!target) {
    target = document.createElement('div');
    target.style.width = '288px';
  }

  DEFAULT_VIEW(
      {
        title: {text: 'div#container.grid'},
        comments: [],
        status: 'SENT_TO_AGENT',
        commentText: '',
        isEditing: false,
        isQueueModifierPressed: false,
        textAreaRef: Lit.Directives.createRef(),
        onAddComment: () => {},
        onDeleteQueuedComment: () => {},
        onCommentTextChange: () => {},
        onQueueComment: () => {},
        onQueueModifierChange: () => {},
        onSetEditMode: () => {},
        onSaveEdit: () => {},
        ...inputOverrides,
      },
      undefined,
      target,
  );

  return target;
}

describeWithEnvironment('CommentThreadWidget DEFAULT_VIEW', () => {
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

  it('renders a queued developer comment', async () => {
    const comments: CommentManager.CommentManager.Comment[] = [
      {author: 'DEVELOPER', text: 'Align this to the grid', timestamp: 0},
    ];
    const target = renderView({comments, status: 'ACTIVE'});
    renderElementIntoDOM(target, {includeCommonStyles: true});
    await assertScreenshot('comments/comment_thread_widget_queued.png');
  });

  it('renders a queued developer comment in editing mode', async () => {
    const comments: CommentManager.CommentManager.Comment[] = [
      {author: 'DEVELOPER', text: 'Align this to the grid', timestamp: 0},
    ];
    const target = renderView({
      comments,
      status: 'ACTIVE',
      isEditing: true,
      commentText: 'Align this to the grid',
    });
    renderElementIntoDOM(target, {includeCommonStyles: true});
    await assertScreenshot('comments/comment_thread_widget_editing.png');
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
    const target = renderView({comments, status: 'RESOLVED'});
    renderElementIntoDOM(target, {includeCommonStyles: true});
    await assertScreenshot('comments/comment_thread_widget_agent_response.png');
  });

  const LONG_AGENT_RESPONSE =
      Array.from({length: 20}, (_, i) => `${i + 1}. Updated rule \`.grid-item-${i + 1}\` to use \`margin: 8px;\``)
          .join('\n');

  it('caps the thread body height and makes it scrollable for long agent responses', () => {
    const comments: CommentManager.CommentManager.Comment[] = [
      {author: 'DEVELOPER', text: 'Align this to the grid', timestamp: 0},
      {author: 'AGENT', text: LONG_AGENT_RESPONSE, timestamp: 1},
    ];
    const target = renderView({comments, status: 'RESOLVED'});
    renderElementIntoDOM(target, {includeCommonStyles: true});

    const threadBody = target.querySelector<HTMLElement>('.thread-body');
    assert.exists(threadBody);
    assert.strictEqual(getComputedStyle(threadBody).overflowY, 'auto');
    assert.isAbove(threadBody.scrollHeight, threadBody.clientHeight);
  });

  it('does not make the thread body scrollable for short agent responses', () => {
    const comments: CommentManager.CommentManager.Comment[] = [
      {author: 'DEVELOPER', text: 'Align this to the grid', timestamp: 0},
      {author: 'AGENT', text: 'Updated the rule to use `margin: 8px;`', timestamp: 1},
    ];
    const target = renderView({comments, status: 'RESOLVED'});
    renderElementIntoDOM(target, {includeCommonStyles: true});

    const threadBody = target.querySelector<HTMLElement>('.thread-body');
    assert.exists(threadBody);
    assert.strictEqual(threadBody.scrollHeight, threadBody.clientHeight);
  });

  it('keeps sent status within widget bounds when title is long', () => {
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
    assert.isNotNull(widgetEl);
    assert.isNotNull(sentStatusEl);

    const widgetRect = widgetEl.getBoundingClientRect();
    const sentRect = sentStatusEl.getBoundingClientRect();

    assert.isAtMost(sentRect.right, widgetRect.right);
  });
});

describeWithEnvironment('CommentThreadWidget header status in DEFAULT_VIEW', () => {
  const comments: CommentManager.CommentManager.Comment[] = [
    {author: 'DEVELOPER', text: 'Queued note', timestamp: 0},
  ];

  it('shows the delete button and no sent status for a queued (ACTIVE) thread', () => {
    const onDeleteQueuedComment = sinon.spy();
    const target = renderView({comments, status: 'ACTIVE', onDeleteQueuedComment});

    assert.isNull(target.querySelector('.sent-status'));
    const deleteButton = target.querySelector<HTMLElement>('.header-actions .delete-button');
    assert.isNotNull(deleteButton);

    deleteButton.click();
    sinon.assert.calledOnce(onDeleteQueuedComment);
  });

  it('shows the sent status and no delete button for a SENT_TO_AGENT thread', () => {
    const target = renderView({comments, status: 'SENT_TO_AGENT'});

    assert.isNotNull(target.querySelector('.sent-status'));
    assert.isNull(target.querySelector('.delete-button'));
  });

  it('renders no header status while the are no comments', () => {
    const target = renderView({status: 'DRAFT'});

    assert.isNull(target.querySelector('.sent-status'));
    assert.isNull(target.querySelector('.delete-button'));
  });
});

describeWithEnvironment('CommentThreadWidget queue interactions in DEFAULT_VIEW', () => {
  it('renders button text as "Send to agent" without the modifier and "Queue comment" with it', () => {
    const target = renderView({commentText: 'some text', isQueueModifierPressed: false});
    const button = target.querySelector<HTMLElement>('.footer devtools-button');
    assert.isNotNull(button);
    assert.strictEqual(button.textContent?.trim(), 'Send to agent');

    renderView({commentText: 'some text', isQueueModifierPressed: true}, target);
    assert.strictEqual(button.textContent?.trim(), 'Queue comment');
  });

  it('calls onQueueComment when Cmd/Ctrl+Enter is pressed in the textarea', () => {
    const onAddComment = sinon.spy();
    const onQueueComment = sinon.spy();
    const target = renderView({commentText: 'my note', onAddComment, onQueueComment});

    const textarea = target.querySelector('textarea');
    assert.isNotNull(textarea);

    const {metaKey, ctrlKey} = queueModifier();
    const event = new KeyboardEvent('keydown', {key: 'Enter', metaKey, ctrlKey, bubbles: true, cancelable: true});
    textarea.dispatchEvent(event);

    sinon.assert.calledOnceWithExactly(onQueueComment, 'my note');
    sinon.assert.notCalled(onAddComment);
    assert.isTrue(event.defaultPrevented);
  });

  it('calls onAddComment when plain Enter is pressed in the textarea', () => {
    const onAddComment = sinon.spy();
    const onQueueComment = sinon.spy();
    const target = renderView({commentText: 'my note', onAddComment, onQueueComment});

    const textarea = target.querySelector('textarea');
    assert.isNotNull(textarea);

    const event = new KeyboardEvent('keydown', {key: 'Enter', bubbles: true, cancelable: true});
    textarea.dispatchEvent(event);

    sinon.assert.calledOnceWithExactly(onAddComment, 'my note');
    sinon.assert.notCalled(onQueueComment);
    assert.isTrue(event.defaultPrevented);
  });

  it('calls onQueueComment when the button is clicked while the modifier is pressed', () => {
    const onAddComment = sinon.spy();
    const onQueueComment = sinon.spy();
    const target = renderView({commentText: 'my note', isQueueModifierPressed: true, onAddComment, onQueueComment});

    const button = target.querySelector<HTMLElement>('.footer devtools-button');
    assert.isNotNull(button);
    button.click();

    sinon.assert.calledOnceWithExactly(onQueueComment, 'my note');
    sinon.assert.notCalled(onAddComment);
  });

  it('calls onAddComment when the button is clicked without the modifier', () => {
    const onAddComment = sinon.spy();
    const onQueueComment = sinon.spy();
    const target = renderView({commentText: 'my note', isQueueModifierPressed: false, onAddComment, onQueueComment});

    const button = target.querySelector<HTMLElement>('.footer devtools-button');
    assert.isNotNull(button);
    button.click();

    sinon.assert.calledOnceWithExactly(onAddComment, 'my note');
    sinon.assert.notCalled(onQueueComment);
  });

  it('keeps focus in the textarea when the submit button is pressed with the mouse', () => {
    const target = renderView({commentText: 'my note'});
    renderElementIntoDOM(target);

    const button = target.querySelector<HTMLElement>('.footer devtools-button');
    assert.isNotNull(button);

    const mousedown = new MouseEvent('mousedown', {bubbles: true, cancelable: true});
    button.dispatchEvent(mousedown);

    assert.isTrue(mousedown.defaultPrevented);
  });

  it('reports the modifier from textarea keydown/keyup and resets it on blur', () => {
    const onQueueModifierChange = sinon.spy();
    const target = renderView({onQueueModifierChange});
    renderElementIntoDOM(target);

    const textarea = target.querySelector('textarea');
    assert.isNotNull(textarea);

    const modifier = queueModifier();
    textarea.dispatchEvent(new KeyboardEvent('keydown', {...modifier, bubbles: true}));
    sinon.assert.calledOnceWithExactly(onQueueModifierChange, true);

    // On release, the browser reports the modifier flag as false.
    textarea.dispatchEvent(new KeyboardEvent('keyup', {key: modifier.key, bubbles: true}));
    sinon.assert.calledTwice(onQueueModifierChange);
    assert.isFalse(onQueueModifierChange.secondCall.args[0]);

    textarea.dispatchEvent(new FocusEvent('blur'));
    sinon.assert.calledThrice(onQueueModifierChange);
    assert.isFalse(onQueueModifierChange.thirdCall.args[0]);
  });
});

describeWithEnvironment('CommentThreadWidget edit interactions in DEFAULT_VIEW', () => {
  const comments: CommentManager.CommentManager.Comment[] = [
    {author: 'DEVELOPER', text: 'Queued note', timestamp: 0},
  ];

  it('replaces the comment with a prefilled textarea and a "Save" button while editing', () => {
    const target = renderView({comments, status: 'ACTIVE', isEditing: true, commentText: 'Queued note'});

    assert.isNull(target.querySelector('.comment-text'));
    const textarea = target.querySelector('textarea');
    assert.isNotNull(textarea);
    assert.strictEqual(textarea.value, 'Queued note');
    const button = target.querySelector<HTMLElement>('.footer devtools-button');
    assert.isNotNull(button);
    assert.strictEqual(button.textContent?.trim(), 'Save');
  });

  it('calls onSetEditMode(true) when the developer comment is clicked', () => {
    const onSetEditMode = sinon.spy();
    const target = renderView({comments, status: 'ACTIVE', onSetEditMode});

    const commentText = target.querySelector<HTMLElement>('.comment-text');
    assert.isNotNull(commentText);
    commentText.click();

    sinon.assert.calledOnceWithExactly(onSetEditMode, true);
  });

  it('routes Enter, Cmd/Ctrl+Enter and the button to onSaveEdit while editing', () => {
    const onSaveEdit = sinon.spy();
    const onAddComment = sinon.spy();
    const onQueueComment = sinon.spy();
    const target = renderView({
      comments,
      status: 'ACTIVE',
      isEditing: true,
      commentText: 'Edited note',
      onSaveEdit,
      onAddComment,
      onQueueComment,
    });

    const textarea = target.querySelector('textarea');
    assert.isNotNull(textarea);
    textarea.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true, cancelable: true}));
    const {metaKey, ctrlKey} = queueModifier();
    textarea.dispatchEvent(
        new KeyboardEvent('keydown', {key: 'Enter', metaKey, ctrlKey, bubbles: true, cancelable: true}));
    const button = target.querySelector<HTMLElement>('.footer devtools-button');
    assert.isNotNull(button);
    button.click();

    sinon.assert.callCount(onSaveEdit, 3);
    sinon.assert.alwaysCalledWithExactly(onSaveEdit, 'Edited note');
    sinon.assert.notCalled(onAddComment);
    sinon.assert.notCalled(onQueueComment);
  });
});

describeWithEnvironment('CommentThreadWidget presenter', () => {
  async function createShownWidget() {
    const view = createViewFunctionStub(CommentThreadWidget);
    const widget = new CommentThreadWidget(undefined, view);
    widget.markAsRoot();
    renderElementIntoDOM(widget);
    await view.nextInput;
    return {view, widget};
  }

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

  it('handles queueing a comment via onQueueComment', async () => {
    const {view, widget} = await createShownWidget();
    try {
      const onQueueComment = sinon.spy();
      widget.onQueueComment = onQueueComment;

      view.input.onCommentTextChange({target: {value: 'queued note'}} as unknown as Event);
      await view.nextInput;

      view.input.onQueueComment('   ');
      sinon.assert.notCalled(onQueueComment);

      view.input.onQueueComment(view.input.commentText);
      const input = await view.nextInput;
      sinon.assert.calledOnceWithExactly(onQueueComment, 'queued note');
      assert.strictEqual(input.commentText, '');
    } finally {
      widget.detach();
    }
  });

  it('forwards onDeleteQueuedComment to the configured callback', async () => {
    const {view, widget} = await createShownWidget();
    try {
      const onDeleteQueuedComment = sinon.spy();
      widget.onDeleteQueuedComment = onDeleteQueuedComment;

      view.input.onDeleteQueuedComment();
      sinon.assert.calledOnce(onDeleteQueuedComment);
    } finally {
      widget.detach();
    }
  });

  it('updates isQueueModifierPressed from onQueueModifierChange', async () => {
    const {view, widget} = await createShownWidget();
    try {
      assert.isFalse(view.input.isQueueModifierPressed);

      view.input.onQueueModifierChange(true);
      assert.isTrue((await view.nextInput).isQueueModifierPressed);

      view.input.onQueueModifierChange(false);
      assert.isFalse((await view.nextInput).isQueueModifierPressed);
    } finally {
      widget.detach();
    }
  });

  it('does not re-render when the modifier state is unchanged', async () => {
    const {view, widget} = await createShownWidget();
    try {
      const callCount = view.callCount;

      view.input.onQueueModifierChange(false);
      await widget.updateComplete;

      sinon.assert.callCount(view, callCount);
    } finally {
      widget.detach();
    }
  });

  it('resets the modifier state when hidden', async () => {
    const {view, widget} = await createShownWidget();
    view.input.onQueueModifierChange(true);
    assert.isTrue((await view.nextInput).isQueueModifierPressed);

    widget.detach();
    widget.performUpdate();

    assert.isFalse(view.input.isQueueModifierPressed);
  });

  it('enters edit mode with the comment text for an ACTIVE thread', async () => {
    const {view, widget} = await createShownWidget();
    try {
      widget.status = 'ACTIVE';
      widget.comments = [{author: 'DEVELOPER', text: 'Queued note', timestamp: 0}];
      assert.isFalse((await view.nextInput).isEditing);

      view.input.onSetEditMode(true);
      const input = await view.nextInput;

      assert.isTrue(input.isEditing);
      assert.strictEqual(input.commentText, 'Queued note');
    } finally {
      widget.detach();
    }
  });

  it('calls onStartEdit when entering edit mode for an ACTIVE thread', async () => {
    const {view, widget} = await createShownWidget();
    try {
      const onStartEdit = sinon.spy();
      widget.onStartEdit = onStartEdit;
      widget.status = 'ACTIVE';
      widget.comments = [{author: 'DEVELOPER', text: 'Queued note', timestamp: 0}];
      await view.nextInput;

      view.input.onSetEditMode(true);

      sinon.assert.calledOnce(onStartEdit);
    } finally {
      widget.detach();
    }
  });

  it('forwards the trimmed edited text to onSaveEdit and leaves edit mode', async () => {
    const {view, widget} = await createShownWidget();
    try {
      const onSaveEdit = sinon.spy();
      widget.onSaveEdit = onSaveEdit;
      widget.status = 'ACTIVE';
      widget.comments = [{author: 'DEVELOPER', text: 'Queued note', timestamp: 0}];
      await view.nextInput;
      view.input.onSetEditMode(true);
      await view.nextInput;

      view.input.onSaveEdit('  Edited note  ');
      const input = await view.nextInput;

      sinon.assert.calledOnceWithExactly(onSaveEdit, 'Edited note');
      assert.isFalse(input.isEditing);
      assert.strictEqual(input.commentText, '');
    } finally {
      widget.detach();
    }
  });
});
