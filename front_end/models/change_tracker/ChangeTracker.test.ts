// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import * as CommentManager from '../comment_manager/comment_manager.js';

import * as ChangeTracker from './change_tracker.js';

describe('ChangeTracker', () => {
  let commentManager: CommentManager.CommentManager.CommentManager;
  let tracker: ChangeTracker.ChangeTracker.ChangeTracker;

  beforeEach(() => {
    updateHostConfig({
      devToolsComments: {
        enabled: true,
      },
    });
    commentManager = new CommentManager.CommentManager.CommentManager();
    tracker = new ChangeTracker.ChangeTracker.ChangeTracker(commentManager);
  });

  function nodeAnchor(backendNodeId: number,
                      textSignature = 'element'): CommentManager.CommentManager.CommentAnchorSignature {
    return {
      vePath: 'Panel: elements > Tree: elements > TreeItem',
      textSignature,
      node: {backendNodeId, targetId: 'mock-target-id'},
    };
  }

  it('records changes, stores them, and creates a CommentThread in CommentManager', () => {
    const record = tracker.trackChange('Duplicated node <div>', nodeAnchor(1, '#test'));

    assert.isNotNull(record);
    assert.strictEqual(record?.description, 'Duplicated node <div>');
    assert.isString(record?.id);
    assert.isNumber(record?.timestamp);

    const changes = tracker.getChanges();
    assert.lengthOf(changes, 1);
    assert.strictEqual(changes[0], record);
    assert.strictEqual(tracker.getLastChange(), record);

    const threads = commentManager.getCommentThreads();
    assert.lengthOf(threads, 1);
    assert.strictEqual(threads[0].anchor.node?.backendNodeId, 1);
    assert.strictEqual(threads[0].anchor.textSignature, '#test');
    assert.isEmpty(threads[0].comments);
    assert.deepEqual(threads[0].changes, [record]);
  });

  it('tracks multiple changes correctly and creates distinct CommentThreads', () => {
    const descriptions = [
      'Removed node <div>',
      'Duplicated node <span>',
      'Moved node <div> up',
      'Hid element <div>',
    ];
    const records = descriptions.map((description, i) => tracker.trackChange(description, nodeAnchor(30 + i)));

    assert.deepEqual(records.map(record => record?.description), descriptions);

    const changes = tracker.getChanges();
    assert.lengthOf(changes, 4);
    assert.deepEqual(changes.map(change => change.description), descriptions);
    assert.strictEqual(tracker.getLastChange()?.description, 'Hid element <div>');

    const threads = commentManager.getCommentThreads();
    assert.lengthOf(threads, 4);
    assert.isTrue(threads.every(thread => thread.comments.length === 0));
    assert.deepEqual(threads.map(thread => thread.anchor.node?.backendNodeId), [30, 31, 32, 33]);

    tracker.clear();
    assert.lengthOf(tracker.getChanges(), 0);
    assert.lengthOf(commentManager.getCommentThreads(), 0);
  });

  it('supports tracking changes with custom anchor', () => {
    const customAnchor: CommentManager.CommentManager.CommentAnchorSignature = {
      vePath: 'Panel: elements > Pane: styles > TreeOutline > TreeItem: color',
      textSignature: 'color: red',
    };
    const record = tracker.trackChange('Changed property "color" from "blue" to "red"', customAnchor);

    assert.isNotNull(record);
    assert.strictEqual(record?.description, 'Changed property "color" from "blue" to "red"');

    const threads = commentManager.getCommentThreads();
    assert.lengthOf(threads, 1);
    assert.strictEqual(threads[0].anchor.vePath, 'Panel: elements > Pane: styles > TreeOutline > TreeItem: color');
    assert.strictEqual(threads[0].anchor.textSignature, 'color: red');
    assert.isUndefined(threads[0].anchor.node);
    assert.deepEqual(threads[0].changes, [record]);
  });

  it('does not track changes or create comment threads when devToolsComments flag is disabled', () => {
    updateHostConfig({
      devToolsComments: {
        enabled: false,
      },
    });

    const record = tracker.trackChange('Duplicated node <div>', nodeAnchor(100));

    assert.isNull(record);
    assert.isUndefined(tracker.getLastChange());
    assert.lengthOf(tracker.getChanges(), 0);
    assert.lengthOf(commentManager.getCommentThreads(), 0);
  });

  it('allows creating multiple independent instances', () => {
    const cm1 = new CommentManager.CommentManager.CommentManager();
    const cm2 = new CommentManager.CommentManager.CommentManager();
    const instance1 = new ChangeTracker.ChangeTracker.ChangeTracker(cm1);
    const instance2 = new ChangeTracker.ChangeTracker.ChangeTracker(cm2);
    assert.notStrictEqual(instance1, instance2);

    instance1.trackChange('Duplicated node <div>', nodeAnchor(42));

    assert.lengthOf(instance1.getChanges(), 1);
    assert.lengthOf(instance2.getChanges(), 0);
    assert.lengthOf(cm1.getCommentThreads(), 1);
    assert.lengthOf(cm2.getCommentThreads(), 0);
  });

  it('bounds the number of records to maxRecords by evicting oldest records', () => {
    const customTracker = new ChangeTracker.ChangeTracker.ChangeTracker(commentManager, 3);
    assert.strictEqual(customTracker.maxRecords, 3);
    assert.strictEqual(tracker.maxRecords, ChangeTracker.ChangeTracker.MAX_RECORDS);

    for (let i = 1; i <= 4; i++) {
      customTracker.trackChange(`Duplicated node div-${i}`, nodeAnchor(i));
    }

    const changes = customTracker.getChanges();
    assert.deepEqual(changes.map(change => change.description), [
      'Duplicated node div-2',
      'Duplicated node div-3',
      'Duplicated node div-4',
    ]);
    assert.strictEqual(customTracker.getLastChange()?.description, 'Duplicated node div-4');

    const threads = commentManager.getCommentThreads();
    assert.lengthOf(threads, 3);
    assert.deepEqual(threads.map(thread => thread.anchor.node?.backendNodeId), [2, 3, 4]);
  });

  it('removes corresponding comment threads on clear', () => {
    tracker.trackChange('Duplicated node div-1', nodeAnchor(1));
    tracker.trackChange('Duplicated node div-2', nodeAnchor(2));
    assert.lengthOf(commentManager.getCommentThreads(), 2);

    tracker.clear();

    assert.lengthOf(commentManager.getCommentThreads(), 0);
    assert.lengthOf(tracker.getChanges(), 0);
    assert.isUndefined(tracker.getLastChange());
  });

  it('preserves comment threads with user comments during eviction', () => {
    const customTracker = new ChangeTracker.ChangeTracker.ChangeTracker(commentManager, 2);
    customTracker.trackChange('Duplicated node div-1', nodeAnchor(1));
    customTracker.trackChange('Duplicated node div-2', nodeAnchor(2));

    const thread1 = commentManager.getCommentThreads().find(thread => thread.anchor.node?.backendNodeId === 1);
    assert.exists(thread1);
    thread1.comments.push({author: 'DEVELOPER', text: 'Important comment', timestamp: Date.now()});

    customTracker.trackChange('Duplicated node div-3', nodeAnchor(3));

    const changes = customTracker.getChanges();
    assert.deepEqual(changes.map(change => change.description), [
      'Duplicated node div-1',
      'Duplicated node div-3',
    ]);

    const remainingThreads = commentManager.getCommentThreads();
    assert.lengthOf(remainingThreads, 2);
    assert.isTrue(remainingThreads.some(thread => thread.anchor.node?.backendNodeId === 1));
    assert.isTrue(remainingThreads.some(thread => thread.anchor.node?.backendNodeId === 3));
    assert.isFalse(remainingThreads.some(thread => thread.anchor.node?.backendNodeId === 2));
  });

  it('does not remove threads from CommentManager when all tracked threads have user comments', () => {
    const customTracker = new ChangeTracker.ChangeTracker.ChangeTracker(commentManager, 2);
    customTracker.trackChange('Duplicated node div-1', nodeAnchor(1));
    customTracker.trackChange('Duplicated node div-2', nodeAnchor(2));

    for (const thread of commentManager.getCommentThreads()) {
      thread.comments.push({author: 'DEVELOPER', text: 'User comment', timestamp: Date.now()});
    }

    customTracker.trackChange('Duplicated node div-3', nodeAnchor(3));

    assert.deepEqual(customTracker.getChanges().map(change => change.description), [
      'Duplicated node div-2',
      'Duplicated node div-3',
    ]);
    const allThreads = commentManager.getCommentThreads();
    assert.lengthOf(allThreads, 3);
    assert.deepEqual(allThreads.map(thread => thread.anchor.node?.backendNodeId), [1, 2, 3]);
  });

  it('preserves comment threads with user comments on clear', () => {
    tracker.trackChange('Duplicated node div-1', nodeAnchor(1));
    tracker.trackChange('Duplicated node div-2', nodeAnchor(2));

    const thread1 = commentManager.getCommentThreads().find(thread => thread.anchor.node?.backendNodeId === 1);
    assert.exists(thread1);
    thread1.comments.push({author: 'DEVELOPER', text: 'Preserve me', timestamp: Date.now()});

    tracker.clear();

    assert.lengthOf(tracker.getChanges(), 0);
    assert.isUndefined(tracker.getLastChange());
    const remainingThreads = commentManager.getCommentThreads();
    assert.lengthOf(remainingThreads, 1);
    assert.strictEqual(remainingThreads[0].anchor.node?.backendNodeId, 1);
    assert.lengthOf(remainingThreads[0].comments, 1);
  });
});
