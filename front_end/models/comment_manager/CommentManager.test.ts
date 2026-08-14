// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as CommentManager from './comment_manager.js';

describe('CommentManager', () => {
  let manager: CommentManager.CommentManager.CommentManager;

  beforeEach(() => {
    manager = new CommentManager.CommentManager.CommentManager();
  });

  afterEach(() => {
    manager.clear();
  });

  it('manages comment mode and dispatches COMMENT_MODE_CHANGED event', () => {
    const modeChangedEvents: boolean[] = [];
    manager.addEventListener(CommentManager.CommentManager.Events.COMMENT_MODE_CHANGED, event => {
      modeChangedEvents.push(event.data);
    });

    assert.isFalse(manager.isCommentMode());

    manager.setCommentMode(true);
    assert.isTrue(manager.isCommentMode());
    assert.deepEqual(modeChangedEvents, [true]);

    // Setting same mode should not dispatch again
    manager.setCommentMode(true);
    assert.deepEqual(modeChangedEvents, [true]);

    manager.setCommentMode(false);
    assert.isFalse(manager.isCommentMode());
    assert.deepEqual(modeChangedEvents, [true, false]);
  });

  it('creates and retrieves comment threads and dispatches COMMENT_THREADS_CHANGED event', () => {
    const threadChangedEvents: CommentManager.CommentManager.CommentThread[][] = [];
    manager.addEventListener(CommentManager.CommentManager.Events.COMMENT_THREADS_CHANGED, event => {
      threadChangedEvents.push(event.data);
    });

    const anchor: CommentManager.CommentManager.CommentAnchorSignature = {
      vePath: 'Panel: elements > TreeItem: rule',
      textSignature: 'color: red;',
    };

    const thread = manager.createCommentThread(anchor, 'Initial comment');
    assert.isNotNull(thread);
    assert.strictEqual(thread.anchor, anchor);
    assert.lengthOf(thread.comments, 1);
    assert.strictEqual(thread.comments[0].author, 'DEVELOPER');
    assert.strictEqual(thread.comments[0].text, 'Initial comment');
    assert.strictEqual(thread.status, 'ACTIVE');

    assert.lengthOf(manager.getCommentThreads(), 1);
    assert.strictEqual(manager.getCommentThread(thread.id), thread);
    assert.lengthOf(threadChangedEvents, 1);
    assert.strictEqual(threadChangedEvents[0][0], thread);
  });

  it('supports AGENT author and changes metadata in created threads', () => {
    const anchor: CommentManager.CommentManager.CommentAnchorSignature = {
      vePath: 'Panel: elements > TreeItem: rule',
      textSignature: 'margin: 0;',
    };
    const changes = [{property: 'margin', oldValue: '0', newValue: '8px'}];
    const thread = manager.createCommentThread(anchor, 'Agent fix', 'AGENT', changes);

    assert.strictEqual(thread.comments[0].author, 'AGENT');
    assert.strictEqual(thread.comments[0].text, 'Agent fix');
    assert.deepEqual(thread.changes, changes);
  });

  it('returns undefined for non-existent comment thread ID', () => {
    assert.isUndefined(manager.getCommentThread('non-existent-id'));
  });

  it('removes comment threads and dispatches COMMENT_THREADS_CHANGED event', () => {
    const anchor: CommentManager.CommentManager.CommentAnchorSignature = {
      vePath: 'Panel: network > TableRow: item',
      textSignature: 'GET /api',
    };

    const thread = manager.createCommentThread(anchor, 'Network comment');
    assert.lengthOf(manager.getCommentThreads(), 1);

    let threadsAfterRemoval: CommentManager.CommentManager.CommentThread[] = [];
    manager.addEventListener(CommentManager.CommentManager.Events.COMMENT_THREADS_CHANGED, event => {
      threadsAfterRemoval = event.data;
    });

    manager.removeCommentThread(thread.id);
    assert.lengthOf(manager.getCommentThreads(), 0);
    assert.deepEqual(threadsAfterRemoval, []);
  });

  it('does nothing when removing non-existent thread', () => {
    let eventCount = 0;
    manager.addEventListener(CommentManager.CommentManager.Events.COMMENT_THREADS_CHANGED, () => {
      eventCount++;
    });

    manager.removeCommentThread('non-existent-id');
    assert.strictEqual(eventCount, 0);
  });

  it('clears all threads and resets comment mode on clear()', () => {
    manager.setCommentMode(true);
    const anchor: CommentManager.CommentManager.CommentAnchorSignature = {
      vePath: 'Panel: sources > TreeItem: file',
      textSignature: 'app.js',
    };
    manager.createCommentThread(anchor, 'To be cleared');
    assert.lengthOf(manager.getCommentThreads(), 1);
    assert.isTrue(manager.isCommentMode());

    manager.clear();
    assert.lengthOf(manager.getCommentThreads(), 0);
    assert.isFalse(manager.isCommentMode());
  });
});
