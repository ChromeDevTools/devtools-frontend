// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Comments from './comments.js';

describeWithEnvironment('CommentsOverlayWidget', () => {
  let manager: Comments.CommentOverlayManager.CommentOverlayManager;

  beforeEach(() => {
    manager = new Comments.CommentOverlayManager.CommentOverlayManager();
  });

  afterEach(() => {
    manager.clear();
  });

  it('renders pins and highlights into DOM via Lit-html view function stub', async () => {
    const view = createViewFunctionStub(Comments.CommentsOverlayWidget.CommentsOverlayWidget);
    const widget = new Comments.CommentsOverlayWidget.CommentsOverlayWidget(manager, undefined, view);

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

    manager.setCommentMode(true);
    manager.createComment(testEl, 'Widget test comment');

    const updatedInput = await view.nextInput;
    assert.isTrue(updatedInput.commentMode);
    assert.lengthOf(updatedInput.pins, 1);
    assert.lengthOf(updatedInput.highlights, 1);

    testEl.remove();
    widget.detach();
  });

  it('renders live DOM elements for pins, anchor highlights, and hover highlights with DEFAULT_VIEW', async () => {
    const widget = new Comments.CommentsOverlayWidget.CommentsOverlayWidget(manager);
    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});

    const testEl = document.createElement('div');
    testEl.setAttribute('jslog', 'TreeItem; context: live-widget-test');
    testEl.textContent = 'live test element';
    testEl.getBoundingClientRect = () => new DOMRect(100, 200, 150, 40);
    renderElementIntoDOM(testEl, {allowMultipleChildren: true});

    manager.setCommentMode(true);
    const thread = manager.createComment(testEl, 'Live comment');
    assert.isNotNull(thread);

    widget.requestUpdate();
    await widget.updateComplete;

    const overlay = widget.contentElement.querySelector('.comments-overlay-container');
    assert.isNotNull(overlay);

    const pin = widget.contentElement.querySelector('.comment-pin') as HTMLElement;
    assert.isNotNull(pin);
    assert.include(pin.textContent || '', '💬');
    assert.strictEqual(pin.getAttribute('data-comment-id'), thread.id);

    const highlight = widget.contentElement.querySelector('.comment-anchor-highlight') as HTMLElement;
    assert.isNotNull(highlight);
    assert.strictEqual(highlight.getAttribute('data-comment-id'), thread.id);

    testEl.remove();
    widget.detach();
  });

  it('does not respond to manager events when hidden/detached', async () => {
    const view = createViewFunctionStub(Comments.CommentsOverlayWidget.CommentsOverlayWidget);
    const widget = new Comments.CommentsOverlayWidget.CommentsOverlayWidget(manager, undefined, view);

    widget.markAsRoot();
    renderElementIntoDOM(widget, {allowMultipleChildren: true});
    await view.nextInput;

    widget.detach();

    manager.setCommentMode(true);
    assert.isFalse(view.input.commentMode);
  });
});
