// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
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
    assert.isNull(view.input.activeHighlight);

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
    assert.isNotNull(updatedInput.activeHighlight);

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
    assert.isNotNull(updatedInput.activeHighlight);
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
    assert.strictEqual(pin.getAttribute('aria-hidden'), 'true');
    const cursor = pin.querySelector('.comment-cursor');
    assert.isNotNull(cursor);
    assert.strictEqual(cursor.textContent?.trim(), '');

    const highlight = widget.contentElement.querySelector('.comment-anchor-highlight') as HTMLElement;
    assert.isNotNull(highlight);

    testEl.remove();
    widget.detach();
  });

  describe('anchor highlight', () => {
    function createAnchor(context: string, top: number): HTMLElement {
      const el = document.createElement('div');
      el.setAttribute('jslog', `TreeItem; context: ${context}`);
      el.textContent = context;
      el.getBoundingClientRect = () => new DOMRect(10, top, 100, 30);
      renderElementIntoDOM(el, {allowMultipleChildren: true});
      return el;
    }

    async function setupWidget(): Promise<PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget> {
      const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(undefined, [commentManager]);
      widget.setOverlayManagerForTest(overlayManager);
      widget.markAsRoot();
      renderElementIntoDOM(widget, {allowMultipleChildren: true});
      commentManager.setCommentMode(true);
      return widget;
    }

    async function getHighlights(widget: PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget):
        Promise<HTMLElement[]> {
      widget.requestUpdate();
      await widget.updateComplete;
      return Array.from(widget.contentElement.querySelectorAll<HTMLElement>('.comment-anchor-highlight'));
    }

    it('renders only pins when no thread is open', async () => {
      const widget = await setupWidget();
      const el1 = createAnchor('hl-closed-1', 10);
      const el2 = createAnchor('hl-closed-2', 50);
      overlayManager.createComment(el1, 'First')?.save();
      overlayManager.createComment(el2, 'Second')?.sendToAgent();
      // The last created thread is still open; close it.
      document.documentElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));

      assert.isEmpty(await getHighlights(widget));
      assert.lengthOf(widget.contentElement.querySelectorAll('.comment-pin'), 2);

      el1.remove();
      el2.remove();
      widget.detach();
    });

    it('renders a single highlight for the open thread and removes it on close', async () => {
      const widget = await setupWidget();
      const el1 = createAnchor('hl-single-1', 10);
      const el2 = createAnchor('hl-single-2', 50);
      const thread1 = overlayManager.createComment(el1, 'First');
      assert.exists(thread1);
      thread1.save();
      const thread2 = overlayManager.createComment(el2, 'Second');
      assert.exists(thread2);
      thread2.save();

      widget.openThread(thread2.id);
      let highlights = await getHighlights(widget);
      assert.lengthOf(highlights, 1);
      assert.include(highlights[0].style.transform, 'translate3d(10px, 50px, 0');

      widget.openThread(thread1.id);
      highlights = await getHighlights(widget);
      assert.lengthOf(highlights, 1);
      assert.include(highlights[0].style.transform, 'translate3d(10px, 10px, 0');

      // Clicking the pin of the open thread closes it.
      const pins = widget.contentElement.querySelectorAll<HTMLElement>('.comment-pin');
      pins[0].click();
      assert.isEmpty(await getHighlights(widget));

      el1.remove();
      el2.remove();
      widget.detach();
    });

    it('uses a solid border for DRAFT threads', async () => {
      const widget = await setupWidget();
      const el = createAnchor('hl-status-draft', 10);
      const thread = overlayManager.createComment(el, 'Comment');
      assert.exists(thread);
      assert.strictEqual(thread.status, 'DRAFT');
      // DRAFT threads open automatically; openThread() would discard them.

      const highlights = await getHighlights(widget);
      assert.lengthOf(highlights, 1);
      assert.isFalse(highlights[0].classList.contains('resolved'));

      el.remove();
      widget.detach();
    });

    it('uses a solid border for ACTIVE threads', async () => {
      const widget = await setupWidget();
      const el = createAnchor('hl-status-active', 10);
      const thread = overlayManager.createComment(el, 'Comment');
      assert.exists(thread);
      thread.save();
      assert.strictEqual(thread.status, 'ACTIVE');
      widget.openThread(thread.id);

      const highlights = await getHighlights(widget);
      assert.lengthOf(highlights, 1);
      assert.isFalse(highlights[0].classList.contains('resolved'));

      el.remove();
      widget.detach();
    });

    it('uses a solid border for SENT_TO_AGENT threads', async () => {
      const widget = await setupWidget();
      const el = createAnchor('hl-status-sent-to-agent', 10);
      const thread = overlayManager.createComment(el, 'Comment');
      assert.exists(thread);
      thread.sendToAgent();
      assert.strictEqual(thread.status, 'SENT_TO_AGENT');
      widget.openThread(thread.id);

      const highlights = await getHighlights(widget);
      assert.lengthOf(highlights, 1);
      assert.isFalse(highlights[0].classList.contains('resolved'));

      el.remove();
      widget.detach();
    });

    it('uses a dashed border for RESOLVED threads', async () => {
      const widget = await setupWidget();
      const el = createAnchor('hl-status-resolved', 10);
      const thread = overlayManager.createComment(el, 'Comment');
      assert.exists(thread);
      thread.resolve();
      assert.strictEqual(thread.status, 'RESOLVED');
      widget.openThread(thread.id);

      const highlights = await getHighlights(widget);
      assert.lengthOf(highlights, 1);
      assert.isTrue(highlights[0].classList.contains('resolved'));

      el.remove();
      widget.detach();
    });
  });

  it('renders a pin for each saved comment', async () => {
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

    el1.remove();
    el2.remove();
    el3.remove();
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

  describe('Comments drawer reveal on toggle', () => {
    type ViewLocation = Awaited<ReturnType<UI.ViewManager.ViewManager['resolveLocation']>>;
    const fakeCommentsView = {} as UI.View.View;
    let showViewStub: sinon.SinonStub;
    let resolveLocationStub: sinon.SinonStub;
    let locationShowViewStub: sinon.SinonStub;
    let drawerVisible: boolean;

    beforeEach(() => {
      const viewManager = UI.ViewManager.ViewManager.instance();
      sinon.stub(viewManager, 'hasView').withArgs('comments').returns(true);
      sinon.stub(viewManager, 'view').withArgs('comments').returns(fakeCommentsView);
      sinon.stub(viewManager, 'locationNameForViewId').withArgs('comments').returns('drawer-view');
      showViewStub = sinon.stub(viewManager, 'showView').resolves();
      locationShowViewStub = sinon.stub().resolves();
      resolveLocationStub = sinon.stub(viewManager, 'resolveLocation').resolves({
        showView: locationShowViewStub,
      } as unknown as ViewLocation);
      drawerVisible = false;
      sinon.stub(UI.InspectorView.InspectorView, 'maybeGetInspectorViewInstance').returns({
        drawerVisible: () => drawerVisible,
      } as UI.InspectorView.InspectorView);
    });

    it('adds the Comments tab without selecting or focusing it when entering comment mode with the drawer visible',
       async () => {
         drawerVisible = true;
         const delegate = new PanelCommon.CommentsOverlayWidget.ActionDelegate(commentManager);
         delegate.handleAction({} as UI.Context.Context, 'comments.toggle-comment-mode');
         assert.isTrue(commentManager.isCommentMode());
         sinon.assert.calledOnceWithExactly(resolveLocationStub, 'drawer-view');
         await resolveLocationStub.firstCall.returnValue;
         sinon.assert.calledOnceWithExactly(locationShowViewStub, fakeCommentsView, undefined, false, true, false);
         sinon.assert.notCalled(showViewStub);
       });

    it('does nothing when entering comment mode with the drawer closed', () => {
      const delegate = new PanelCommon.CommentsOverlayWidget.ActionDelegate(commentManager);
      delegate.handleAction({} as UI.Context.Context, 'comments.toggle-comment-mode');
      assert.isTrue(commentManager.isCommentMode());
      sinon.assert.notCalled(showViewStub);
      sinon.assert.notCalled(resolveLocationStub);
    });

    it('opens the drawer on the Comments tab when leaving comment mode, even if the drawer was closed', () => {
      commentManager.setCommentMode(true);
      const delegate = new PanelCommon.CommentsOverlayWidget.ActionDelegate(commentManager);
      delegate.handleAction({} as UI.Context.Context, 'comments.toggle-comment-mode');
      assert.isFalse(commentManager.isCommentMode());
      sinon.assert.calledOnceWithExactly(showViewStub, 'comments', true);
    });

    it('does not reveal the Comments tab when comment mode is turned off by agent detach', () => {
      commentManager.setCommentMode(true);
      commentManager.setAgentAttached(false);
      assert.isFalse(commentManager.isCommentMode());
      sinon.assert.notCalled(showViewStub);
    });
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
    assert.isNull(inputAfterDetach.activeHighlight);
    assert.isFalse(inputAfterDetach.commentMode);
  });

  it('shows "Sent" in the popover until the agent takes the comment, then "Working"', async () => {
    const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(undefined, [commentManager]);
    widget.setOverlayManagerForTest(overlayManager);
    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});

    const testEl = document.createElement('div');
    testEl.setAttribute('jslog', 'TreeItem; context: sent-status');
    testEl.textContent = 'sent status';
    testEl.getBoundingClientRect = () => new DOMRect(100, 100, 150, 40);
    renderElementIntoDOM(testEl, {allowMultipleChildren: true});

    commentManager.setCommentMode(true);
    overlayManager.handleElementClick(testEl);
    const [thread] = commentManager.getCommentThreads();
    assert.exists(thread);
    thread.sendToAgent('Sent comment');
    widget.requestUpdate();
    await UI.Widget.Widget.allUpdatesComplete;

    assert.isNotNull(widget.contentElement.querySelector('.comment-popup-widget .sent-status'));
    assert.isNull(widget.contentElement.querySelector('.comment-popup-widget .working-status'));

    commentManager.takeComments();
    await UI.Widget.Widget.allUpdatesComplete;

    assert.isNull(widget.contentElement.querySelector('.comment-popup-widget .sent-status'));
    assert.isNotNull(widget.contentElement.querySelector('.comment-popup-widget .working-status devtools-spinner'));

    testEl.remove();
    widget.detach();
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

  it('closes comment thread UI and clears draft when pressing Escape while typing a comment', async () => {
    const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(undefined, [commentManager]);
    widget.setOverlayManagerForTest(overlayManager);
    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});

    const el = document.createElement('div');
    el.setAttribute('jslog', 'TreeItem; context: escape-test');
    el.textContent = 'escape test content';
    el.getBoundingClientRect = () => new DOMRect(100, 100, 150, 40);
    renderElementIntoDOM(el, {allowMultipleChildren: true});

    commentManager.setCommentMode(true);
    overlayManager.handleElementClick(el);

    widget.requestUpdate();
    await UI.Widget.Widget.allUpdatesComplete;

    const popup = widget.contentElement.querySelector('.comment-popup-widget');
    assert.isNotNull(popup);
    const textarea = widget.contentElement.querySelector('textarea') as HTMLTextAreaElement;
    assert.isNotNull(textarea);
    textarea.value = 'Unfinished comment';
    textarea.dispatchEvent(new Event('input', {bubbles: true}));

    const escapeEvent = new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true});
    textarea.dispatchEvent(escapeEvent);

    widget.requestUpdate();
    await UI.Widget.Widget.allUpdatesComplete;

    const popupAfterEscape = widget.contentElement.querySelector('.comment-popup-widget');
    assert.isNull(popupAfterEscape);
    assert.lengthOf(commentManager.getCommentThreads(), 0);

    el.remove();
    widget.detach();
  });

  it('closes active submitted comment thread and consumes event when pressing Escape globally', async () => {
    const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(undefined, [commentManager]);
    widget.setOverlayManagerForTest(overlayManager);
    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});

    const el = document.createElement('div');
    el.setAttribute('jslog', 'TreeItem; context: existing-escape-test');
    el.textContent = 'existing escape content';
    el.getBoundingClientRect = () => new DOMRect(100, 100, 150, 40);
    renderElementIntoDOM(el, {allowMultipleChildren: true});

    commentManager.setCommentMode(true);
    const thread = overlayManager.createComment(el, 'Saved comment');
    assert.isNotNull(thread);
    thread.save();

    widget.requestUpdate();
    await UI.Widget.Widget.allUpdatesComplete;

    let popup = widget.contentElement.querySelector('.comment-popup-widget');
    assert.isNotNull(popup);

    const escapeEvent = new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true});
    document.body.dispatchEvent(escapeEvent);
    assert.isTrue(escapeEvent.defaultPrevented);

    widget.requestUpdate();
    await UI.Widget.Widget.allUpdatesComplete;

    popup = widget.contentElement.querySelector('.comment-popup-widget');
    assert.isNull(popup);
    assert.lengthOf(commentManager.getCommentThreads(), 1);

    el.remove();
    widget.detach();
  });

  it('closes draft comment thread UI, removes draft, and propagates click when clicking outside the popup',
     async () => {
       const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(undefined, [commentManager]);
       widget.setOverlayManagerForTest(overlayManager);
       widget.markAsRoot();
       renderElementIntoDOM(widget, {allowMultipleChildren: true});

       const el = document.createElement('div');
       el.setAttribute('jslog', 'TreeItem; context: click-outside-draft-test');
       el.textContent = 'draft target content';
       el.getBoundingClientRect = () => new DOMRect(100, 100, 150, 40);
       renderElementIntoDOM(el, {allowMultipleChildren: true});

       const toolbar = document.createElement('div');
       toolbar.setAttribute('jslog', 'Toolbar; context: main-toolbar');
       const toolbarButton = document.createElement('button');
       toolbarButton.textContent = 'Toolbar Action';
       const onToolbarClick = sinon.spy();
       toolbarButton.addEventListener('click', onToolbarClick);
       toolbar.appendChild(toolbarButton);
       renderElementIntoDOM(toolbar, {allowMultipleChildren: true});

       commentManager.setCommentMode(true);
       overlayManager.handleElementClick(el);
       await UI.Widget.Widget.allUpdatesComplete;

       assert.isNotNull(widget.contentElement.querySelector('.comment-popup-widget'));
       assert.lengthOf(commentManager.getCommentThreads(), 1);

       const clickEvent = new MouseEvent('click', {bubbles: true, cancelable: true});
       toolbarButton.dispatchEvent(clickEvent);
       assert.isFalse(clickEvent.defaultPrevented);
       sinon.assert.calledOnce(onToolbarClick);

       await UI.Widget.Widget.allUpdatesComplete;

       assert.isNull(widget.contentElement.querySelector('.comment-popup-widget'));
       assert.lengthOf(commentManager.getCommentThreads(), 0);

       el.remove();
       toolbar.remove();
       widget.detach();
     });

  it('closes active saved comment thread UI, keeps pin, and propagates click when clicking outside the popup',
     async () => {
       const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(undefined, [commentManager]);
       widget.setOverlayManagerForTest(overlayManager);
       widget.markAsRoot();
       renderElementIntoDOM(widget, {allowMultipleChildren: true});

       const el = document.createElement('div');
       el.setAttribute('jslog', 'TreeItem; context: click-outside-saved-test');
       el.textContent = 'saved target content';
       el.getBoundingClientRect = () => new DOMRect(100, 100, 150, 40);
       renderElementIntoDOM(el, {allowMultipleChildren: true});

       const outsideButton = document.createElement('button');
       outsideButton.textContent = 'Outside Button';
       const onOutsideClick = sinon.spy();
       outsideButton.addEventListener('click', onOutsideClick);
       renderElementIntoDOM(outsideButton, {allowMultipleChildren: true});

       const thread = overlayManager.createComment(el, 'Saved comment');
       assert.isNotNull(thread);
       thread.save();
       widget.openThread(thread.id);
       await UI.Widget.Widget.allUpdatesComplete;

       assert.isNotNull(widget.contentElement.querySelector('.comment-popup-widget'));

       const clickEvent = new MouseEvent('click', {bubbles: true, cancelable: true});
       outsideButton.dispatchEvent(clickEvent);
       assert.isFalse(clickEvent.defaultPrevented);
       sinon.assert.calledOnce(onOutsideClick);

       await UI.Widget.Widget.allUpdatesComplete;

       assert.isNull(widget.contentElement.querySelector('.comment-popup-widget'));
       assert.lengthOf(commentManager.getCommentThreads(), 1);
       assert.isNotNull(widget.contentElement.querySelector('.comment-pin'));

       el.remove();
       outsideButton.remove();
       widget.detach();
     });

  it('does not close the comment thread UI when clicking inside the popup', async () => {
    const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(undefined, [commentManager]);
    widget.setOverlayManagerForTest(overlayManager);
    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});

    const el = document.createElement('div');
    el.setAttribute('jslog', 'TreeItem; context: click-inside-popup-test');
    el.textContent = 'inside popup test content';
    el.getBoundingClientRect = () => new DOMRect(100, 100, 150, 40);
    renderElementIntoDOM(el, {allowMultipleChildren: true});

    commentManager.setCommentMode(true);
    overlayManager.handleElementClick(el);
    await UI.Widget.Widget.allUpdatesComplete;

    const textarea = widget.contentElement.querySelector('textarea') as HTMLTextAreaElement;
    assert.isNotNull(textarea);
    textarea.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
    await UI.Widget.Widget.allUpdatesComplete;

    assert.isNotNull(widget.contentElement.querySelector('.comment-popup-widget'));
    assert.lengthOf(commentManager.getCommentThreads(), 1);

    el.remove();
    widget.detach();
  });

  it('toggles the comment thread UI closed when clicking the active thread pin', async () => {
    const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(undefined, [commentManager]);
    widget.setOverlayManagerForTest(overlayManager);
    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});

    const el = document.createElement('div');
    el.setAttribute('jslog', 'TreeItem; context: click-pin-toggle-test');
    el.textContent = 'pin toggle test content';
    el.getBoundingClientRect = () => new DOMRect(100, 100, 150, 40);
    renderElementIntoDOM(el, {allowMultipleChildren: true});

    commentManager.setCommentMode(true);
    const thread = overlayManager.createComment(el, 'Saved comment');
    assert.isNotNull(thread);
    thread.save();
    await UI.Widget.Widget.allUpdatesComplete;

    assert.isNotNull(widget.contentElement.querySelector('.comment-popup-widget'));

    const pin = widget.contentElement.querySelector('.comment-pin') as HTMLElement;
    assert.isNotNull(pin);
    pin.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
    await UI.Widget.Widget.allUpdatesComplete;

    assert.isNull(widget.contentElement.querySelector('.comment-popup-widget'));
    assert.lengthOf(commentManager.getCommentThreads(), 1);
    assert.isNotNull(widget.contentElement.querySelector('.comment-pin'));

    el.remove();
    widget.detach();
  });

  it('closes and removes the draft thread when clicking its own pin in comment mode', async () => {
    const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(undefined, [commentManager]);
    widget.setOverlayManagerForTest(overlayManager);
    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});

    const el = document.createElement('div');
    el.setAttribute('jslog', 'TreeItem; context: click-draft-pin-toggle-test');
    el.textContent = 'draft pin toggle test content';
    el.getBoundingClientRect = () => new DOMRect(100, 100, 150, 40);
    renderElementIntoDOM(el, {allowMultipleChildren: true});

    commentManager.setCommentMode(true);
    overlayManager.handleElementClick(el);
    await UI.Widget.Widget.allUpdatesComplete;

    assert.isNotNull(widget.contentElement.querySelector('.comment-popup-widget'));
    assert.lengthOf(commentManager.getCommentThreads(), 1);

    const pin = widget.contentElement.querySelector('.comment-pin') as HTMLElement;
    assert.isNotNull(pin);
    pin.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
    await UI.Widget.Widget.allUpdatesComplete;

    assert.isNull(widget.contentElement.querySelector('.comment-popup-widget'));
    assert.lengthOf(commentManager.getCommentThreads(), 0);
    assert.isNull(widget.contentElement.querySelector('.comment-pin'));

    el.remove();
    widget.detach();
  });

  it('positions pins and highlights with translate3d and preserves DOM nodes across realtime updates', async () => {
    const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(undefined, [commentManager]);
    widget.setOverlayManagerForTest(overlayManager);
    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});

    let currentTop = 100;
    const el = document.createElement('div');
    el.setAttribute('jslog', 'TreeItem; context: translate3d-test');
    el.textContent = 'translate3d item';
    el.getBoundingClientRect = () => new DOMRect(50, currentTop, 120, 30);
    renderElementIntoDOM(el, {allowMultipleChildren: true});

    commentManager.setCommentMode(true);
    const thread = overlayManager.createComment(el, 'Pinned comment');
    assert.isNotNull(thread);
    thread.save();
    widget.openThread(thread.id);

    widget.requestUpdate();
    await widget.updateComplete;

    const pinBefore = widget.contentElement.querySelector('.comment-pin') as HTMLElement;
    const highlightBefore = widget.contentElement.querySelector('.comment-anchor-highlight') as HTMLElement;
    assert.isNotNull(pinBefore);
    assert.isNotNull(highlightBefore);
    assert.include(pinBefore.style.transform, 'translate3d(');
    assert.include(highlightBefore.style.transform, 'translate3d(50px, 100px, 0');

    // Simulate a realtime scroll/resize update and verify it renders synchronously in the same frame
    // while preserving the exact same DOM elements via keyed repeat().
    currentTop = 160;
    overlayManager.dispatchEventToListeners(Comments.CommentOverlayManager.Events.POSITIONS_UPDATED, {
      pins: [{id: thread.id, top: 148, left: 158, visible: true}],
      highlights: [{id: thread.id, top: 160, left: 50, width: 120, height: 30, visible: true}],
      isRealtimeSync: true,
    });

    const pinAfter = widget.contentElement.querySelector('.comment-pin') as HTMLElement;
    const highlightAfter = widget.contentElement.querySelector('.comment-anchor-highlight') as HTMLElement;
    assert.strictEqual(pinAfter, pinBefore, 'Expected pin DOM element to be reused across updates');
    assert.strictEqual(highlightAfter, highlightBefore, 'Expected highlight DOM element to be reused across updates');

    el.remove();
    widget.detach();
  });

  it('saves comment to thread as ACTIVE when queued via onQueueComment', async () => {
    const clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
    const view = createViewFunctionStub(PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget);
    const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(
        undefined,
        [commentManager],
        view,
    );
    widget.setOverlayManagerForTest(overlayManager);
    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});

    const testEl = document.createElement('div');
    testEl.setAttribute('jslog', 'TreeItem; context: queue-test');
    testEl.textContent = 'queue test content';
    testEl.getBoundingClientRect = () => new DOMRect(10, 20, 100, 20);

    try {
      await view.nextInput;
      renderElementIntoDOM(testEl, {allowMultipleChildren: true});

      commentManager.setCommentMode(true);
      overlayManager.handleElementClick(testEl);

      const draftInput = await view.nextInput;
      assert.isNotNull(draftInput.activeThread);
      assert.strictEqual(draftInput.activeThread.status, 'DRAFT');

      draftInput.onQueueComment('Queued comment text');
      const queuedInput = await view.nextInput;
      assert.isNotNull(queuedInput.activeThread);
      assert.strictEqual(queuedInput.activeThread.status, 'ACTIVE');
      assert.lengthOf(queuedInput.activeThread.comments, 1);
      assert.strictEqual(queuedInput.activeThread.comments[0].text, 'Queued comment text');

      // Closes after 2 seconds
      clock.tick(2000);
      const closedInput = await view.nextInput;
      assert.isNull(closedInput.activeThread);
      // Pin remains saved and visible on the overlay
      assert.lengthOf(closedInput.pins, 1);
    } finally {
      testEl.remove();
      widget.detach();
      clock.restore();
    }
  });

  it('keeps the popup open when editing starts before the auto-close timer fires', async () => {
    const clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
    const view = createViewFunctionStub(PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget);
    const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(
        undefined,
        [commentManager],
        view,
    );
    widget.setOverlayManagerForTest(overlayManager);
    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});

    const testEl = document.createElement('div');
    testEl.setAttribute('jslog', 'TreeItem; context: start-edit-test');
    testEl.textContent = 'start edit test content';
    testEl.getBoundingClientRect = () => new DOMRect(10, 20, 100, 20);

    try {
      await view.nextInput;
      renderElementIntoDOM(testEl, {allowMultipleChildren: true});

      commentManager.setCommentMode(true);
      overlayManager.handleElementClick(testEl);

      const draftInput = await view.nextInput;
      draftInput.onQueueComment('Queued comment text');
      const queuedInput = await view.nextInput;
      assert.isNotNull(queuedInput.activeThread);
      assert.strictEqual(queuedInput.activeThread.status, 'ACTIVE');

      queuedInput.onStartEdit();
      clock.tick(2000);

      // The auto-close timer must not fire, so force a render to inspect the current state.
      widget.requestUpdate();
      const afterTickInput = await view.nextInput;
      assert.isNotNull(afterTickInput.activeThread);
      assert.strictEqual(afterTickInput.activeThread.id, queuedInput.activeThread.id);
    } finally {
      testEl.remove();
      widget.detach();
      clock.restore();
    }
  });

  it('replaces the queued comment text when an edit is saved via onSaveEdit', async () => {
    const clock = sinon.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
    const view = createViewFunctionStub(PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget);
    const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(
        undefined,
        [commentManager],
        view,
    );
    widget.setOverlayManagerForTest(overlayManager);
    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});

    const testEl = document.createElement('div');
    testEl.setAttribute('jslog', 'TreeItem; context: edit-test');
    testEl.textContent = 'edit test content';
    testEl.getBoundingClientRect = () => new DOMRect(10, 20, 100, 20);

    try {
      await view.nextInput;
      renderElementIntoDOM(testEl, {allowMultipleChildren: true});

      commentManager.setCommentMode(true);
      overlayManager.handleElementClick(testEl);

      const draftInput = await view.nextInput;
      draftInput.onQueueComment('Original text');
      const queuedInput = await view.nextInput;
      assert.isNotNull(queuedInput.activeThread);
      assert.strictEqual(queuedInput.activeThread.status, 'ACTIVE');

      queuedInput.onSaveEdit('Edited text');
      const editedInput = await view.nextInput;

      assert.isNotNull(editedInput.activeThread);
      assert.strictEqual(editedInput.activeThread.status, 'ACTIVE');
      assert.lengthOf(editedInput.activeThread.comments, 1);
      assert.strictEqual(editedInput.activeThread.comments[0].text, 'Edited text');
    } finally {
      testEl.remove();
      widget.detach();
      clock.restore();
    }
  });

  it('removes a queued thread, its pin and the popover when the queued comment is deleted', async () => {
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
    testEl.setAttribute('jslog', 'TreeItem; context: delete-queued-test');
    testEl.textContent = 'delete queued content';
    testEl.getBoundingClientRect = () => new DOMRect(10, 20, 100, 20);
    renderElementIntoDOM(testEl, {allowMultipleChildren: true});

    try {
      commentManager.setCommentMode(true);
      overlayManager.handleElementClick(testEl);
      const draftInput = await view.nextInput;
      const thread = draftInput.activeThread;
      assert.isNotNull(thread);

      draftInput.onQueueComment('To be deleted');
      const queuedInput = await view.nextInput;
      assert.strictEqual(thread.status, 'ACTIVE');
      assert.lengthOf(queuedInput.pins, 1);

      queuedInput.onDeleteQueuedComment();
      const deletedInput = await view.nextInput;

      assert.isUndefined(commentManager.getCommentThread(thread.id));
      assert.isNull(deletedInput.activeThread);
      assert.lengthOf(deletedInput.pins, 0);
      assert.isEmpty(commentManager.takeComments());
    } finally {
      testEl.remove();
      widget.detach();
    }
  });

  it('shows the comment thread popup at the fallback position when not anchored to any element', async () => {
    const widget = new PanelCommon.CommentsOverlayWidget.CommentsOverlayWidget(undefined, [commentManager]);
    widget.setOverlayManagerForTest(overlayManager);
    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});

    const thread = commentManager.createCommentThread(
        {
          vePath: 'Panel: elements > TreeItem: removed-node',
          textSignature: 'div.removed',
        },
        'Comment on removed element',
    );
    thread.save();

    widget.openThread(thread.id, {left: 28, top: 450});
    await UI.Widget.Widget.allUpdatesComplete;

    assert.isNull(widget.contentElement.querySelector('.comment-pin'));
    const popup = widget.contentElement.querySelector('.comment-popup-widget') as HTMLElement;
    assert.isNotNull(popup);
    assert.include(popup.style.transform, 'translateY(-100%)');

    widget.detach();
  });

  it('passes activePin and fallbackPosition to view input when opening an anchored thread', async () => {
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
    testEl.setAttribute('jslog', 'TreeItem; context: rematched-target');
    testEl.textContent = 'rematched element';
    testEl.getBoundingClientRect = () => new DOMRect(100, 120, 150, 30);
    renderElementIntoDOM(testEl, {allowMultipleChildren: true});

    const thread = overlayManager.createComment(testEl, 'Anchored comment');
    assert.isNotNull(thread);
    thread.save();
    await view.nextInput;

    widget.openThread(thread.id, {left: 16, top: 450});
    const updatedInput = await view.nextInput;

    assert.lengthOf(updatedInput.pins, 1);
    assert.strictEqual(updatedInput.activePin, updatedInput.pins[0]);
    assert.deepEqual(updatedInput.fallbackPosition, {left: 16, top: 450});

    testEl.remove();
    widget.detach();
  });

  it('marks the agent response as seen when a resolved thread is opened', async () => {
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
    testEl.setAttribute('jslog', 'TreeItem; context: response-seen-test');
    testEl.textContent = 'response seen content';
    testEl.getBoundingClientRect = () => new DOMRect(10, 20, 100, 20);
    renderElementIntoDOM(testEl, {allowMultipleChildren: true});

    try {
      const thread = overlayManager.createComment(testEl, 'Fix this');
      assert.isNotNull(thread);
      thread.sendToAgent();
      // New threads open as drafts, so close the thread before the agent responds.
      const sentInput = await view.nextInput;
      assert.strictEqual(sentInput.activeThread?.id, thread.id);
      sentInput.onPinClick(thread.id);
      assert.isNull((await view.nextInput).activeThread);

      commentManager.resolveCommentThread(thread.id, 'Fixed');
      const resolvedInput = await view.nextInput;
      assert.isNull(resolvedInput.activeThread);
      assert.isFalse(thread.responseSeen);

      resolvedInput.onPinClick(thread.id);
      const openedInput = await view.nextInput;
      assert.strictEqual(openedInput.activeThread?.id, thread.id);
      assert.isTrue(thread.responseSeen);
    } finally {
      testEl.remove();
      widget.detach();
    }
  });

  it('marks the agent response as seen when a thread is revealed', async () => {
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
    testEl.setAttribute('jslog', 'TreeItem; context: response-revealed-test');
    testEl.textContent = 'response revealed content';
    testEl.getBoundingClientRect = () => new DOMRect(10, 20, 100, 20);
    renderElementIntoDOM(testEl, {allowMultipleChildren: true});

    try {
      const thread = overlayManager.createComment(testEl, 'Fix this');
      assert.isNotNull(thread);
      thread.sendToAgent();
      // New threads open as drafts, so close the thread before the agent responds.
      const sentInput = await view.nextInput;
      assert.strictEqual(sentInput.activeThread?.id, thread.id);
      sentInput.onPinClick(thread.id);
      assert.isNull((await view.nextInput).activeThread);

      commentManager.resolveCommentThread(thread.id, 'Fixed');
      await view.nextInput;
      assert.isFalse(thread.responseSeen);

      widget.openThread(thread.id);
      const openedInput = await view.nextInput;
      assert.strictEqual(openedInput.activeThread?.id, thread.id);
      assert.isTrue(thread.responseSeen);
    } finally {
      testEl.remove();
      widget.detach();
    }
  });

  it('marks the agent response as seen when the agent responds while the thread is open', async () => {
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
    testEl.setAttribute('jslog', 'TreeItem; context: response-while-open-test');
    testEl.textContent = 'response while open content';
    testEl.getBoundingClientRect = () => new DOMRect(10, 20, 100, 20);
    renderElementIntoDOM(testEl, {allowMultipleChildren: true});

    try {
      commentManager.setCommentMode(true);
      overlayManager.handleElementClick(testEl);
      const draftInput = await view.nextInput;
      const thread = draftInput.activeThread;
      assert.isNotNull(thread);

      draftInput.onAddComment('Fix this');
      await view.nextInput;
      assert.isFalse(thread.responseSeen);

      commentManager.resolveCommentThread(thread.id, 'Fixed');
      const resolvedInput = await view.nextInput;
      assert.strictEqual(resolvedInput.activeThread?.id, thread.id);
      assert.isTrue(thread.responseSeen);
    } finally {
      testEl.remove();
      widget.detach();
    }
  });
});
