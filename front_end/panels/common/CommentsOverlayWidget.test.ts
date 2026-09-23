// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import type * as Protocol from '../../generated/protocol.js';
import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as Comments from '../../ui/comments/comments.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as PanelCommon from './common.js';

describeWithEnvironment('CommentsOverlayWidget', () => {
  let commentManager: CommentManager.CommentManager.CommentManager;
  let overlayManager: Comments.CommentOverlayManager.CommentOverlayManager;

  beforeEach(() => {
    commentManager = new CommentManager.CommentManager.CommentManager();
    commentManager.setAgentAttached(true);
    overlayManager = new Comments.CommentOverlayManager.CommentOverlayManager(commentManager);
  });

  afterEach(() => {
    PanelCommon.CommentsOverlayWidget.ActionDelegate.resetForTest();
    overlayManager.clear();
    commentManager.clear();
  });

  it('renders pins and highlights into DOM via Lit-html view function stub', async () => {
    const view = createViewFunctionStub(PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget);
    const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(
        undefined,
        [commentManager],
        view,
    );
    widget.setOverlayManagerForTest(overlayManager);

    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});
    await view.nextInput;

    assert.isFalse(view.input.commentMode);
    assert.deepEqual(view.input.pins, []);
    assert.deepEqual(view.input.highlights, []);

    // Create a comment
    const testEl = document.createElement('div');
    testEl.setAttribute('jslog', 'TreeItem; context: test');
    testEl.textContent = 'test content';
    renderElementIntoDOM(testEl, {allowMultipleChildren: true});

    commentManager.setCommentMode(true);
    overlayManager.createComment(testEl, 'Widget test comment');

    const updatedInput = await view.nextInput;
    assert.isTrue(updatedInput.commentMode);
    assert.lengthOf(updatedInput.pins, 1);
    assert.lengthOf(updatedInput.highlights, 1);

    testEl.remove();
    widget.detach();
  });

  it('passes pin, highlight, and activeThread to view input when comment is in draft state', async () => {
    const view = createViewFunctionStub(PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget);
    const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(
        undefined,
        [commentManager],
        view,
    );
    widget.setOverlayManagerForTest(overlayManager);
    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});
    await view.nextInput;

    const testEl = document.createElement('div');
    testEl.setAttribute('jslog', 'TreeItem; context: draft-test');
    testEl.textContent = 'draft test content';
    testEl.getBoundingClientRect = () => new DOMRect(10, 20, 100, 20);
    renderElementIntoDOM(testEl, {allowMultipleChildren: true});

    commentManager.setCommentMode(true);
    overlayManager.handleElementClick(testEl);

    const updatedInput = await view.nextInput;
    assert.isTrue(updatedInput.commentMode);
    assert.lengthOf(updatedInput.pins, 1);
    assert.lengthOf(updatedInput.highlights, 1);
    assert.isNotNull(updatedInput.activePin);
    assert.isNotNull(updatedInput.activeThread);
    assert.strictEqual(updatedInput.activeThread.status, 'DRAFT');

    testEl.remove();
    widget.detach();
  });

  it('renders live DOM elements for pins, anchor highlights, and hover highlights with DEFAULT_VIEW', async () => {
    const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(
        undefined,
        [commentManager],
    );
    widget.setOverlayManagerForTest(overlayManager);
    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});

    const testEl = document.createElement('div');
    testEl.setAttribute('jslog', 'TreeItem; context: live-widget-test');
    testEl.textContent = 'live test element';
    testEl.getBoundingClientRect = () => new DOMRect(100, 200, 150, 40);
    renderElementIntoDOM(testEl, {allowMultipleChildren: true});

    commentManager.setCommentMode(true);
    const thread = overlayManager.createComment(testEl, 'Live comment');
    assert.isNotNull(thread);

    widget.requestUpdate();
    await widget.updateComplete;

    const overlay = widget.contentElement.querySelector('.comments-overlay-container');
    assert.isNotNull(overlay);

    const pin = widget.contentElement.querySelector('.comment-pin') as HTMLElement;
    assert.isNotNull(pin);
    assert.include(pin.textContent || '', '1');
    const cursor = pin.querySelector('.comment-cursor');
    assert.isNotNull(cursor);
    assert.strictEqual(cursor.textContent?.trim(), '1');

    const highlight = widget.contentElement.querySelector('.comment-anchor-highlight') as HTMLElement;
    assert.isNotNull(highlight);

    testEl.remove();
    widget.detach();
  });

  it('renders sequential numbers for multiple comment pins in order of creation', async () => {
    const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(undefined, [commentManager]);
    widget.setOverlayManagerForTest(overlayManager);
    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});

    const el1 = document.createElement('div');
    el1.setAttribute('jslog', 'TreeItem; context: seq-test-1');
    el1.textContent = 'item 1';
    el1.getBoundingClientRect = () => new DOMRect(10, 10, 100, 30);
    renderElementIntoDOM(el1, {allowMultipleChildren: true});

    const el2 = document.createElement('div');
    el2.setAttribute('jslog', 'TreeItem; context: seq-test-2');
    el2.textContent = 'item 2';
    el2.getBoundingClientRect = () => new DOMRect(10, 50, 100, 30);
    renderElementIntoDOM(el2, {allowMultipleChildren: true});

    const el3 = document.createElement('div');
    el3.setAttribute('jslog', 'TreeItem; context: seq-test-3');
    el3.textContent = 'item 3';
    el3.getBoundingClientRect = () => new DOMRect(10, 90, 100, 30);
    renderElementIntoDOM(el3, {allowMultipleChildren: true});

    commentManager.setCommentMode(true);
    overlayManager.createComment(el1, 'First comment')?.save();
    overlayManager.createComment(el2, 'Second comment')?.save();
    overlayManager.createComment(el3, 'Third comment')?.save();

    widget.requestUpdate();
    await widget.updateComplete;

    const pins = Array.from(widget.contentElement.querySelectorAll('.comment-pin'));
    assert.lengthOf(pins, 3);

    const texts = pins.map(p => p.querySelector('.comment-cursor')?.textContent?.trim());
    assert.deepEqual(texts, ['1', '2', '3']);

    el1.remove();
    el2.remove();
    el3.remove();
    widget.detach();
  });

  it('does not increment pin index when clicking another element without saving draft', async () => {
    const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(undefined, [commentManager]);
    widget.setOverlayManagerForTest(overlayManager);
    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});

    const el1 = document.createElement('div');
    el1.setAttribute('jslog', 'TreeItem; context: draft-idx-1');
    el1.textContent = 'item 1';
    el1.getBoundingClientRect = () => new DOMRect(10, 10, 100, 30);
    renderElementIntoDOM(el1, {allowMultipleChildren: true});

    const el2 = document.createElement('div');
    el2.setAttribute('jslog', 'TreeItem; context: draft-idx-2');
    el2.textContent = 'item 2';
    el2.getBoundingClientRect = () => new DOMRect(10, 50, 100, 30);
    renderElementIntoDOM(el2, {allowMultipleChildren: true});

    commentManager.setCommentMode(true);
    overlayManager.handleElementClick(el1);
    widget.requestUpdate();
    await widget.updateComplete;

    let pin = widget.contentElement.querySelector('.comment-pin .comment-cursor');
    assert.strictEqual(pin?.textContent?.trim(), '1');

    overlayManager.handleElementClick(el2);
    widget.requestUpdate();
    await widget.updateComplete;

    pin = widget.contentElement.querySelector('.comment-pin .comment-cursor');
    assert.strictEqual(pin?.textContent?.trim(), '1');

    el1.remove();
    el2.remove();
    widget.detach();
  });

  it('does not respond to manager events when hidden/detached', async () => {
    const view = createViewFunctionStub(PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget);
    const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(
        undefined,
        [commentManager],
        view,
    );
    widget.setOverlayManagerForTest(overlayManager);

    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});
    await view.nextInput;

    widget.detach();

    commentManager.setCommentMode(true);
    assert.isFalse(view.input.commentMode);
  });

  it('toggles comment mode when ActionDelegate handles comments.toggle-comment-mode', () => {
    const delegate = new PanelCommon.CommentsOverlayWidget.ActionDelegate(commentManager);
    const context = {} as UI.Context.Context;
    assert.isFalse(commentManager.isCommentMode());
    const handled = delegate.handleAction(context, 'comments.toggle-comment-mode');
    assert.isTrue(handled);
    assert.isTrue(commentManager.isCommentMode());
  });

  it('does not toggle comment mode via ActionDelegate if agent is not attached', () => {
    commentManager.setAgentAttached(false);
    const delegate = new PanelCommon.CommentsOverlayWidget.ActionDelegate(commentManager);
    const context = {} as UI.Context.Context;
    assert.isFalse(commentManager.isCommentMode());
    const handled = delegate.handleAction(context, 'comments.toggle-comment-mode');
    assert.isFalse(handled);
    assert.isFalse(commentManager.isCommentMode(), 'Comment mode should not be toggled when agent is not attached');
  });

  it('updates ButtonProvider item visibility and action enabled state when agentAttached changes', () => {
    commentManager.setAgentAttached(false);
    UI.ActionRegistration.registerActionExtension({
      category: UI.ActionRegistration.ActionCategory.GLOBAL,
      actionId: 'comments.toggle-comment-mode',
      toggleable: true,
      async loadActionDelegate() {
        return new PanelCommon.CommentsOverlayWidget.ActionDelegate(commentManager);
      },
    });
    const actionRegistry = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    const action = actionRegistry.getAction('comments.toggle-comment-mode');
    const provider = new PanelCommon.CommentsOverlayWidget.ButtonProvider(commentManager);
    const item = provider.item();
    assert.exists(item);
    assert.isFalse(item.visible());
    assert.isFalse(action.enabled());
    assert.notInclude(actionRegistry.availableActions(), action);

    commentManager.setAgentAttached(true);
    assert.isTrue(item.visible());
    assert.isTrue(action.enabled());
    assert.include(actionRegistry.availableActions(), action);

    commentManager.setAgentAttached(false);
    assert.isFalse(item.visible());
    assert.isFalse(action.enabled());
    assert.notInclude(actionRegistry.availableActions(), action);
  });

  it('hides active thread widget, pins, and highlights when agent detaches', async () => {
    const view = createViewFunctionStub(PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget);
    const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(
        undefined,
        [commentManager],
        view,
    );
    widget.setOverlayManagerForTest(overlayManager);
    widget.wasShown();
    await view.nextInput;

    commentManager.setCommentMode(true);
    await view.nextInput;

    const thread = commentManager.createCommentThread({vePath: 'Panel: elements', textSignature: 'div'});
    const inputWithDraft = await view.nextInput;
    assert.strictEqual(inputWithDraft.activeThread, thread);

    commentManager.setAgentAttached(false);
    const inputAfterDetach = await view.nextInput;
    assert.isNull(inputAfterDetach.activeThread);
    assert.isNull(inputAfterDetach.activePin);
    assert.isEmpty(inputAfterDetach.pins);
    assert.isEmpty(inputAfterDetach.highlights);
    assert.isFalse(inputAfterDetach.commentMode);
  });

  it('resets draft text when clicking a different element while a draft is open', async () => {
    const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(undefined, [commentManager]);
    widget.setOverlayManagerForTest(overlayManager);
    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});

    const createTestElement = (context: string, top: number) => {
      const el = document.createElement('div');
      el.setAttribute('jslog', `TreeItem; context: ${context}`);
      el.textContent = context;
      el.getBoundingClientRect = () => new DOMRect(100, top, 150, 40);
      renderElementIntoDOM(el, {allowMultipleChildren: true});
      return el;
    };

    const el1 = createTestElement('draft-1', 100);
    const el2 = createTestElement('draft-2', 200);

    commentManager.setCommentMode(true);
    overlayManager.handleElementClick(el1);

    widget.requestUpdate();
    await UI.Widget.Widget.allUpdatesComplete;

    let textarea = widget.contentElement.querySelector('textarea') as HTMLTextAreaElement;
    assert.isNotNull(textarea);
    textarea.value = 'Unsaved draft text';
    textarea.dispatchEvent(new Event('input', {bubbles: true}));
    await UI.Widget.Widget.allUpdatesComplete;
    assert.strictEqual(textarea.value, 'Unsaved draft text');

    overlayManager.handleElementClick(el2);
    widget.requestUpdate();
    await UI.Widget.Widget.allUpdatesComplete;

    textarea = widget.contentElement.querySelector('textarea') as HTMLTextAreaElement;
    assert.isNotNull(textarea);
    assert.strictEqual(textarea.value, '');

    el1.remove();
    el2.remove();
    widget.detach();
  });

  it('closes the active comment thread 2 seconds after a comment is sent', async () => {
    const clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
    try {
      const view = createViewFunctionStub(PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget);
      const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(
          undefined,
          [commentManager],
          view,
      );
      widget.setOverlayManagerForTest(overlayManager);
      widget.markAsRoot();
      renderElementIntoDOM(widget, {allowMultipleChildren: true});
      await view.nextInput;

      const testEl = document.createElement('div');
      testEl.setAttribute('jslog', 'TreeItem; context: auto-close-test');
      testEl.textContent = 'auto close test content';
      testEl.getBoundingClientRect = () => new DOMRect(10, 20, 100, 20);
      renderElementIntoDOM(testEl, {allowMultipleChildren: true});

      commentManager.setCommentMode(true);
      overlayManager.handleElementClick(testEl);

      const draftInput = await view.nextInput;
      assert.isNotNull(draftInput.activeThread);
      assert.strictEqual(draftInput.activeThread.status, 'DRAFT');

      draftInput.onAddComment('Sent comment');
      const submittedInput = await view.nextInput;
      assert.isNotNull(submittedInput.activeThread);
      assert.strictEqual(submittedInput.activeThread.status, 'SENT_TO_AGENT');

      clock.tick(1999);
      assert.isNotNull(view.input.activeThread);

      const closedInputPromise = view.nextInput;
      clock.tick(1);
      const closedInput = await closedInputPromise;
      assert.isNull(closedInput.activeThread);
      assert.isNull(closedInput.activePin);

      testEl.remove();
      widget.detach();
    } finally {
      clock.restore();
    }
  });

  it('falls back to text signature if backend node fails to resolve', async () => {
    const view = createViewFunctionStub(PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget);
    const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(
        undefined,
        [commentManager],
        view,
    );
    widget.setOverlayManagerForTest(overlayManager);
    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});
    await view.nextInput;

    commentManager.createCommentThread(
        {
          node: {targetId: 'invalid-target', backendNodeId: 42 as Protocol.DOM.BackendNodeId},
          textSignature: 'div#container',
          vePath: 'Panel: elements > Pane: styles > TreeOutline > TreeItem: color',
        },
        'Test comment',
    );

    const updatedInput = await view.nextInput;

    // We should be able to get title text
    assert.deepEqual(updatedInput.title, {text: 'div#container'});

    widget.detach();
  });

  it('clears the close timeout when switching away from a submitted thread', async () => {
    const clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
    try {
      const view = createViewFunctionStub(PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget);
      const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(
          undefined,
          [commentManager],
          view,
      );
      widget.setOverlayManagerForTest(overlayManager);
      widget.markAsRoot();
      renderElementIntoDOM(widget, {allowMultipleChildren: true});
      await view.nextInput;

      const testEl1 = document.createElement('div');
      testEl1.setAttribute('jslog', 'TreeItem; context: timeout-test-1');
      testEl1.textContent = 'test content 1';
      testEl1.getBoundingClientRect = () => new DOMRect(10, 20, 100, 20);
      renderElementIntoDOM(testEl1, {allowMultipleChildren: true});

      const testEl2 = document.createElement('div');
      testEl2.setAttribute('jslog', 'TreeItem; context: timeout-test-2');
      testEl2.textContent = 'test content 2';
      testEl2.getBoundingClientRect = () => new DOMRect(10, 50, 100, 20);
      renderElementIntoDOM(testEl2, {allowMultipleChildren: true});

      commentManager.setCommentMode(true);

      // Open first thread
      overlayManager.handleElementClick(testEl1);
      const draftInput1 = await view.nextInput;
      const thread1Id = draftInput1.activeThread!.id;

      // Submit comment on first thread
      draftInput1.onAddComment('Sent comment 1');
      const submittedInput1 = await view.nextInput;
      assert.isNotNull(submittedInput1.activeThread);
      assert.strictEqual(submittedInput1.activeThread.id, thread1Id);

      // Quickly switch to second thread
      overlayManager.handleElementClick(testEl2);
      const draftInput2 = await view.nextInput;
      assert.isNotNull(draftInput2.activeThread);
      const thread2Id = draftInput2.activeThread.id;
      assert.notStrictEqual(thread2Id, thread1Id);

      // Switch back to first thread
      draftInput2.onPinClick(thread1Id);
      const switchedBackInput = await view.nextInput;
      assert.isNotNull(switchedBackInput.activeThread);
      assert.strictEqual(switchedBackInput.activeThread.id, thread1Id);

      // Advance time so the original 2-second timeout would fire
      clock.tick(2000);

      // Wait for any pending microtasks so requestUpdate() has a chance to execute
      await widget.updateComplete;

      assert.isNotNull(view.input.activeThread, 'Active thread was unexpectedly closed by an orphaned timeout');
      assert.strictEqual(view.input.activeThread.id, thread1Id);

      testEl1.remove();
      testEl2.remove();
      widget.detach();
    } finally {
      clock.restore();
    }
  });
});
