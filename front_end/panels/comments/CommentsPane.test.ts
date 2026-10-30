// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Comments from './comments.js';

const {CommentsPane} = Comments;
const {DEFAULT_VIEW} = CommentsPane;

describeWithEnvironment('CommentsPane', () => {
  /** Stubs for the functions the view hands to the widget. */
  function createViewOutput() {
    return {
      scrollToSection: sinon.stub<[Comments.CommentsPane.Tab, {animate: boolean}], boolean>().returns(false),
      sectionAtTop: sinon.stub<[], Comments.CommentsPane.Tab>().returns('queued'),
    };
  }

  async function createWidget(
      commentManager = new CommentManager.CommentManager.CommentManager(),
      viewOutput = createViewOutput(),
  ) {
    const view = createViewFunctionStub(CommentsPane.CommentsPane, viewOutput);
    const widget = new CommentsPane.CommentsPane(undefined, [commentManager], view);
    widget.wasShown();
    await view.nextInput;
    return {view, widget, commentManager, viewOutput};
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

  it('does not list draft threads', async () => {
    const {view, commentManager} = await createWidget();

    // A thread without saved text stays a draft.
    const draft =
        commentManager.createCommentThread({vePath: 'Panel: elements > div.draft', textSignature: 'div.draft'});
    const [, sent, resolved] = seedThreads(commentManager);
    sent.sendToAgent();
    resolved.resolve('Done');
    const updatedInput = await view.nextInput;

    assert.strictEqual(draft.status, 'DRAFT');
    const listedIds = [...updatedInput.queuedThreads, ...updatedInput.sentThreads].map(item => item.thread.id);
    assert.notInclude(listedIds, draft.id);
  });

  it('deletes a comment thread', async () => {
    const commentManager = new CommentManager.CommentManager.CommentManager();
    const [t1] = seedThreads(commentManager);
    const {view} = await createWidget(commentManager);

    view.input.onDeleteThread(t1.id);
    const updatedInput = await view.nextInput;

    assert.lengthOf(updatedInput.queuedThreads, 2);
    assert.isUndefined(commentManager.getCommentThread(t1.id));
  });

  it('clears all comments', async () => {
    const commentManager = new CommentManager.CommentManager.CommentManager();
    seedThreads(commentManager);
    const {view} = await createWidget(commentManager);

    view.input.onClearAll();
    const updatedInput = await view.nextInput;

    assert.lengthOf(updatedInput.queuedThreads, 0);
    assert.lengthOf(commentManager.getCommentThreads(), 0);
  });

  it('reveals the comment thread when clicked', async () => {
    const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal').resolves();
    const commentManager = new CommentManager.CommentManager.CommentManager();
    const [t1] = seedThreads(commentManager);
    const {view} = await createWidget(commentManager);

    view.input.onThreadClick(t1, {left: 16, top: 450});

    sinon.assert.calledOnceWithExactly(
        revealStub,
        new CommentManager.CommentThread.RevealableThread(t1, {left: 16, top: 450}),
        false,
    );
  });

  describe('tabs', () => {
    it('selects the clicked tab and scrolls to its section', async () => {
      const commentManager = new CommentManager.CommentManager.CommentManager();
      const [, t2] = seedThreads(commentManager);
      t2.sendToAgent();
      const {view, viewOutput} = await createWidget(commentManager);
      assert.strictEqual(view.input.activeTab, 'queued');

      view.input.onTabClick('sent');
      assert.strictEqual((await view.nextInput).activeTab, 'sent');
      sinon.assert.calledWith(viewOutput.scrollToSection, 'sent', {animate: true});

      view.input.onTabClick('queued');
      assert.strictEqual((await view.nextInput).activeTab, 'queued');
      sinon.assert.calledWith(viewOutput.scrollToSection, 'queued', {animate: true});
    });

    it('highlights the section that has reached the top while scrolling', async () => {
      const commentManager = new CommentManager.CommentManager.CommentManager();
      const [, t2] = seedThreads(commentManager);
      t2.sendToAgent();
      const {view, viewOutput} = await createWidget(commentManager);

      viewOutput.sectionAtTop.returns('sent');
      view.input.onScroll();
      assert.strictEqual((await view.nextInput).activeTab, 'sent');

      viewOutput.sectionAtTop.returns('queued');
      view.input.onScroll();
      assert.strictEqual((await view.nextInput).activeTab, 'queued');
    });

    it('keeps the clicked tab highlighted until its smooth scroll ends', async () => {
      const commentManager = new CommentManager.CommentManager.CommentManager();
      const [, t2] = seedThreads(commentManager);
      t2.sendToAgent();
      const {view, widget, viewOutput} = await createWidget(commentManager);
      viewOutput.scrollToSection.returns(true);

      view.input.onTabClick('sent');
      assert.strictEqual((await view.nextInput).activeTab, 'sent');

      // On the way down, the queued section is still at the top.
      view.input.onScroll();
      await widget.updateComplete;
      assert.strictEqual(view.input.activeTab, 'sent');

      // The user stopped the scroll before the sent section reached the top.
      view.input.onScrollEnd();
      assert.strictEqual((await view.nextInput).activeTab, 'queued');
    });

    it('keeps Queued highlighted when there are no sent comments', async () => {
      const commentManager = new CommentManager.CommentManager.CommentManager();
      seedThreads(commentManager);
      const {view} = await createWidget(commentManager);

      view.input.onTabClick('sent');

      assert.strictEqual((await view.nextInput).activeTab, 'queued');
    });

    it('goes back to Queued when the sent comments are cleared', async () => {
      const commentManager = new CommentManager.CommentManager.CommentManager();
      commentManager.createCommentThread({vePath: 'Panel: elements > div.sent'}, 'Sent').save();
      commentManager.sendQueuedThreads();
      const {view} = await createWidget(commentManager);
      assert.strictEqual(view.input.activeTab, 'sent');

      view.input.onClearAll();

      assert.strictEqual((await view.nextInput).activeTab, 'queued');
    });
  });

  describe('showing the sent comments when nothing is queued', () => {
    it('opens on Sent with the sent comments at the top', async () => {
      const commentManager = new CommentManager.CommentManager.CommentManager();
      commentManager.createCommentThread({vePath: 'Panel: elements > div.sent'}, 'Sent').save();
      commentManager.sendQueuedThreads();

      const {view, viewOutput} = await createWidget(commentManager);

      assert.strictEqual(view.input.activeTab, 'sent');
      sinon.assert.calledOnceWithExactly(viewOutput.scrollToSection, 'sent', {animate: false});
    });

    it('switches to Sent when the queued comments are sent while the drawer is open', async () => {
      const commentManager = new CommentManager.CommentManager.CommentManager();
      const threads = seedThreads(commentManager);
      const {view, viewOutput} = await createWidget(commentManager);
      assert.strictEqual(view.input.activeTab, 'queued');
      sinon.assert.notCalled(viewOutput.scrollToSection);

      view.input.onSendToAgent();
      const updatedInput = await view.nextInput;

      assert.isTrue(threads.every(thread => thread.status === 'SENT_TO_AGENT'));
      assert.lengthOf(updatedInput.queuedThreads, 0);
      assert.lengthOf(updatedInput.sentThreads, 3);
      assert.strictEqual(updatedInput.activeTab, 'sent');
      sinon.assert.calledOnceWithExactly(viewOutput.scrollToSection, 'sent', {animate: false});
    });

    it('does not move the list again on later updates', async () => {
      const commentManager = new CommentManager.CommentManager.CommentManager();
      const thread = commentManager.createCommentThread({vePath: 'Panel: elements > div.sent'}, 'Sent');
      thread.save();
      thread.sendToAgent();
      const {view, viewOutput} = await createWidget(commentManager);

      view.input.onTabClick('queued');
      await view.nextInput;
      viewOutput.scrollToSection.resetHistory();
      thread.resolve('Done');
      const updatedInput = await view.nextInput;

      assert.strictEqual(updatedInput.activeTab, 'queued');
      sinon.assert.notCalled(viewOutput.scrollToSection);
    });
  });

  it('keeps the list scroll position when the drawer is hidden and shown again', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    const scrollContainer = document.createElement('div');
    scrollContainer.style.height = '10px';
    scrollContainer.style.overflow = 'auto';
    const content = document.createElement('div');
    content.style.height = '100px';
    scrollContainer.append(content);
    container.append(scrollContainer);
    const viewOutput = {...createViewOutput(), scrollContainer};
    const view = createViewFunctionStub(CommentsPane.CommentsPane, viewOutput);
    const widget = new CommentsPane.CommentsPane(undefined, [new CommentManager.CommentManager.CommentManager()], view);
    widget.markAsRoot();
    widget.show(container);
    try {
      await view.nextInput;
      scrollContainer.scrollTop = 42;

      widget.hideWidget();
      // The browser resets the scroll position while the drawer is hidden.
      scrollContainer.scrollTop = 0;
      widget.show(container);

      assert.strictEqual(scrollContainer.scrollTop, 42);
    } finally {
      widget.detach();
    }
  });

  describe('Add a comment', () => {
    function stubToggleCommentModeAction() {
      const execute = sinon.stub().resolves(true);
      const registry = UI.ActionRegistry.ActionRegistry.instance();
      sinon.stub(registry, 'hasAction').withArgs('comments.toggle-comment-mode').returns(true);
      sinon.stub(registry, 'getAction')
          .withArgs('comments.toggle-comment-mode')
          .returns({execute} as unknown as UI.ActionRegistration.Action);
      return execute;
    }

    it('turns on comment mode when it is off', async () => {
      const execute = stubToggleCommentModeAction();
      const {view} = await createWidget();

      view.input.onAddComment();

      sinon.assert.calledOnce(execute);
    });

    it('does not toggle comment mode off when it is already on', async () => {
      const execute = stubToggleCommentModeAction();
      const commentManager = new CommentManager.CommentManager.CommentManager();
      commentManager.setAgentAttached(true);
      commentManager.setCommentMode(true);
      const {view} = await createWidget(commentManager);

      view.input.onAddComment();

      sinon.assert.notCalled(execute);
    });
  });

  it('updates the sent comments when the agent takes them', async () => {
    const commentManager = new CommentManager.CommentManager.CommentManager();
    const [t1] = seedThreads(commentManager);
    t1.sendToAgent();

    const {view} = await createWidget(commentManager);
    const sentIds = view.input.sentThreads.map(item => item.thread.id);
    assert.include(sentIds, t1.id);
    assert.isFalse(t1.transmitted);

    commentManager.takeComments();
    const takenInput = await view.nextInput;
    assert.deepEqual(takenInput.sentThreads.map(item => item.thread.id), sentIds);
    assert.isTrue(t1.transmitted);
  });
});

describeWithEnvironment('CommentsPane DEFAULT_VIEW', () => {
  function renderView(
      inputOverrides: Partial<Parameters<typeof DEFAULT_VIEW>[0]> = {},
      output: Comments.CommentsPane.ViewOutput = {},
      ): HTMLElement {
    const target = document.createElement('div');
    target.style.width = '360px';
    target.style.height = '480px';

    DEFAULT_VIEW(
        {
          activeTab: 'queued',
          queuedThreads: [],
          sentThreads: [],
          onTabClick: () => {},
          onScroll: () => {},
          onScrollEnd: () => {},
          onClearAll: () => {},
          onThreadClick: () => {},
          onDeleteThread: () => {},
          onSendToAgent: () => {},
          onAddComment: () => {},
          ...inputOverrides,
        },
        output,
        target,
    );

    return target;
  }

  function createMockThread(selectorText: string, commentText: string): Comments.CommentsPane.ThreadViewData {
    const thread = new CommentManager.CommentThread.CommentThread({
      anchor: {
        vePath: `Panel: elements > ${selectorText}`,
        textSignature: selectorText,
      },
      comments: [{author: 'DEVELOPER', text: commentText, timestamp: 0}],
    });
    thread.status = 'ACTIVE';
    return {thread, title: {text: selectorText}, commentText};
  }

  function createQueuedThreads(count: number): Comments.CommentsPane.ThreadViewData[] {
    return Array.from({length: count}, (_, i) => createMockThread(`div.queued-${i}`, `Queued comment ${i}`));
  }

  /** One thread in each sent state: sent, taken by the agent ("Working") and resolved. */
  function createSentThreads(): Comments.CommentsPane.ThreadViewData[] {
    const sentThread = createMockThread(
        'a.cta',
        'Left align this button with H2 and use the primary pink colour for the button.',
    );
    sentThread.thread.sendToAgent();
    const workingThread = createMockThread('img.hero', 'Add an animation to the hero image.');
    workingThread.thread.sendToAgent();
    workingThread.thread.markTransmitted();
    const resolvedThread = createMockThread('div.list', 'Remove the animation from H1.');
    resolvedThread.thread.resolve('Done');
    return [sentThread, workingThread, resolvedThread];
  }

  async function assertViewScreenshot(target: HTMLElement, goldenPath: string): Promise<void> {
    renderElementIntoDOM(target, {includeCommonStyles: true});
    // Stop the "Working" spinners so the screenshots are stable.
    for (const spinner of target.querySelectorAll('devtools-spinner')) {
      spinner.active = false;
    }
    await assertScreenshot(goldenPath);
  }

  describe('screenshots', () => {
    it('renders the empty state', async () => {
      await assertViewScreenshot(renderView(), 'comments/comments_pane_empty.png');
    });

    it('renders queued comments with the Send to Agent footer right after them', async () => {
      await assertViewScreenshot(renderView({queuedThreads: createQueuedThreads(3)}),
                                 'comments/comments_pane_list.png');
    });

    it('renders the "No queued comments" note above the sent comments', async () => {
      await assertViewScreenshot(renderView({activeTab: 'sent', sentThreads: createSentThreads()}),
                                 'comments/comments_pane_sent.png');
    });

    it('renders queued and sent comments separated by the "Sent comments" bar', async () => {
      await assertViewScreenshot(renderView({queuedThreads: createQueuedThreads(2), sentThreads: createSentThreads()}),
                                 'comments/comments_pane_queued_and_sent.png');
    });

    it('renders the Send to Agent footer stuck to the bottom when the queued comments overflow', async () => {
      await assertViewScreenshot(renderView({queuedThreads: createQueuedThreads(15), sentThreads: createSentThreads()}),
                                 'comments/comments_pane_queued_overflow.png');
    });
  });

  it('highlights the current section and forwards tab clicks and scroll events', () => {
    const onTabClick = sinon.spy();
    const onScroll = sinon.spy();
    const onScrollEnd = sinon.spy();
    const output: Comments.CommentsPane.ViewOutput = {};
    const target = renderView({
      activeTab: 'sent',
      queuedThreads: createQueuedThreads(1),
      sentThreads: createSentThreads(),
      onTabClick,
      onScroll,
      onScrollEnd,
    },
                              output);
    renderElementIntoDOM(target);
    const [queuedTab, sentTab] = target.querySelectorAll<HTMLElement>('.tab-button');

    assert.isFalse(queuedTab.classList.contains('active'));
    assert.strictEqual(queuedTab.getAttribute('aria-current'), 'false');
    assert.isTrue(sentTab.classList.contains('active'));
    assert.strictEqual(sentTab.getAttribute('aria-current'), 'location');

    sentTab.click();
    queuedTab.click();
    output.scrollContainer?.dispatchEvent(new Event('scroll'));
    output.scrollContainer?.dispatchEvent(new Event('scrollend'));

    assert.deepEqual(onTabClick.args.map(args => args[0]), ['sent', 'queued']);
    sinon.assert.calledOnce(onScroll);
    sinon.assert.calledOnce(onScrollEnd);
  });

  it('scrolls to a section and reports the section at the top', () => {
    const output: Comments.CommentsPane.ViewOutput = {};
    const target = renderView({queuedThreads: createQueuedThreads(15), sentThreads: createSentThreads()}, output);
    renderElementIntoDOM(target, {includeCommonStyles: true});
    assert.strictEqual(output.sectionAtTop?.(), 'queued');

    assert.isFalse(output.scrollToSection?.('sent', {animate: false}));
    assert.strictEqual(output.sectionAtTop?.(), 'sent');

    output.scrollToSection?.('queued', {animate: false});
    assert.strictEqual(output.scrollContainer?.scrollTop, 0);
    assert.strictEqual(output.sectionAtTop?.(), 'queued');
  });

  it('has no Sent section to scroll to without sent comments', () => {
    const output: Comments.CommentsPane.ViewOutput = {};
    const target = renderView({queuedThreads: createQueuedThreads(15)}, output);
    renderElementIntoDOM(target, {includeCommonStyles: true});

    assert.isFalse(output.scrollToSection?.('sent', {animate: true}));
    assert.strictEqual(output.scrollContainer?.scrollTop, 0);
    assert.strictEqual(output.sectionAtTop?.(), 'queued');
  });

  it('calls onAddComment when the Add a comment link is clicked', () => {
    const onAddComment = sinon.spy();
    const target = renderView({onAddComment});
    renderElementIntoDOM(target);

    target.querySelector<HTMLElement>('.comments-empty-state-link')?.click();

    sinon.assert.calledOnce(onAddComment);
  });

  it('shows "Sent" for a sent thread until the agent takes it, then "Working"', () => {
    const threadData = createMockThread('a.cta', 'Test comment');
    threadData.thread.sendToAgent();

    let target = renderView({sentThreads: [threadData]});
    let item = target.querySelector('.comment-thread-item');
    assert.isNotNull(item);
    assert.isNotNull(item.querySelector('.thread-status-sent'));
    assert.isNull(item.querySelector('.thread-status-working'));
    assert.isNull(item.querySelector('devtools-spinner'));

    threadData.thread.markTransmitted();
    target = renderView({sentThreads: [threadData]});
    item = target.querySelector('.comment-thread-item');
    assert.isNotNull(item);
    assert.isNull(item.querySelector('.thread-status-sent'));
    assert.isNotNull(item.querySelector('.thread-status-working devtools-spinner'));
  });

  it('does not trigger thread selection when pressing Enter or Space on the delete button', () => {
    const onThreadClick = sinon.spy();
    const [mockThreadData] = createQueuedThreads(1);
    const target = renderView({queuedThreads: [mockThreadData], onThreadClick});
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
    sinon.assert.calledOnceWithMatch(onThreadClick, mockThreadData.thread, sinon.match({
      left: sinon.match.number,
      top: sinon.match.number,
    }));
  });
});
