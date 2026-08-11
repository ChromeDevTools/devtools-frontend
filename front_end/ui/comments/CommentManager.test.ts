// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';

import * as Comments from './comments.js';

describe('CommentManager', () => {
  let container: HTMLElement;
  let manager: Comments.CommentManager.CommentManager;

  beforeEach(() => {
    container = document.createElement('div');
    renderElementIntoDOM(container);
    manager = new Comments.CommentManager.CommentManager();
  });

  afterEach(() => {
    manager.clear();
    container.remove();
  });

  it('creates and retrieves comment threads', () => {
    const item = document.createElement('div');
    item.setAttribute('jslog', 'TreeItem; context: test');
    item.textContent = 'font-size: 14px;';
    container.appendChild(item);

    const thread = manager.createComment(item, 'Needs adjustment');
    assert.isNotNull(thread);
    assert.lengthOf(manager.getCommentThreads(), 1);
    assert.strictEqual(manager.getCommentThread(thread!.id), thread);
    assert.strictEqual(thread?.comments[0].text, 'Needs adjustment');
    assert.strictEqual(thread?.comments[0].author, 'DEVELOPER');
    assert.strictEqual(thread?.status, 'ACTIVE');
  });

  it('returns null when creating comment on non-anchorable element', () => {
    const item = document.createElement('div');
    container.appendChild(item);

    const thread = manager.createComment(item, 'Invalid anchor');
    assert.isNull(thread);
    assert.lengthOf(manager.getCommentThreads(), 0);
  });

  it('supports AGENT author and custom changes metadata in created comment threads', () => {
    const item = document.createElement('div');
    item.setAttribute('jslog', 'TreeItem; context: agent-item');
    item.textContent = 'color: #333;';
    container.appendChild(item);

    const changes = [{property: 'color', oldValue: '#333', newValue: '#000'}];
    const thread = manager.createComment(item, 'Auto-fixed color', 'AGENT', changes);

    assert.isNotNull(thread);
    assert.strictEqual(thread?.comments[0].author, 'AGENT');
    assert.strictEqual(thread?.comments[0].text, 'Auto-fixed color');
    assert.deepEqual(thread?.changes, changes);
  });

  it('returns undefined for non-existent comment thread ID', () => {
    assert.isUndefined(manager.getCommentThread('non-existent-id'));
  });

  it('removes comment threads and dispatches event', () => {
    const item = document.createElement('div');
    item.setAttribute('jslog', 'TreeItem; context: delete-test');
    item.textContent = 'delete me';
    container.appendChild(item);

    let eventCount = 0;
    manager.addEventListener(Comments.CommentManager.Events.COMMENT_THREADS_CHANGED, () => {
      eventCount++;
    });

    const thread = manager.createComment(item, 'To delete');
    assert.isNotNull(thread);
    assert.lengthOf(manager.getCommentThreads(), 1);
    assert.strictEqual(eventCount, 1);

    manager.removeCommentThread(thread!.id);
    assert.lengthOf(manager.getCommentThreads(), 0);
    assert.strictEqual(eventCount, 2);
  });

  it('does not dispatch events when removing a non-existent comment thread ID', () => {
    let eventDispatched = false;
    manager.addEventListener(Comments.CommentManager.Events.COMMENT_THREADS_CHANGED, () => {
      eventDispatched = true;
    });

    manager.removeCommentThread('non-existent-thread-id');
    assert.isFalse(eventDispatched);
  });

  it('clears all comment threads when clear() is called', () => {
    const item = document.createElement('div');
    item.setAttribute('jslog', 'TreeItem; context: clear-test');
    item.textContent = 'clear me';
    container.appendChild(item);

    manager.createComment(item, 'To clear');
    assert.lengthOf(manager.getCommentThreads(), 1);

    manager.clear();
    assert.lengthOf(manager.getCommentThreads(), 0);
  });
});
