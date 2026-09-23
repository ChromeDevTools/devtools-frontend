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
    commentManager.setAgentAttached(true);
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

  it('records changes, stores them in comment text, and creates a CommentThread in CommentManager', () => {
    tracker.trackChange('Duplicated node <div>', nodeAnchor(1, '#test'));

    const threads = commentManager.getCommentThreads();
    assert.lengthOf(threads, 1);
    assert.strictEqual(threads[0].status, 'ACTIVE');
    assert.isTrue(threads[0].isGeneratedComment);
    assert.strictEqual(threads[0].anchor.node?.backendNodeId, 1);
    assert.strictEqual(threads[0].anchor.textSignature, '#test');
    assert.lengthOf(threads[0].comments, 1);
    assert.strictEqual(threads[0].comments[0].text, 'Duplicated node <div>');
    assert.strictEqual(threads[0].comments[0].author, 'DEVELOPER');
  });

  it('tracks multiple changes correctly and creates distinct CommentThreads', () => {
    const descriptions = [
      'Removed node <div>',
      'Duplicated node <span>',
      'Moved node <div> up',
      'Hid element <div>',
    ];
    descriptions.forEach((description, i) => tracker.trackChange(description, nodeAnchor(30 + i)));

    const threads = commentManager.getCommentThreads();
    assert.lengthOf(threads, 4);
    assert.isTrue(threads.every(thread => thread.isGeneratedComment));
    assert.deepEqual(threads.map(thread => thread.comments[0]?.text), descriptions);
    assert.deepEqual(threads.map(thread => thread.anchor.node?.backendNodeId), [30, 31, 32, 33]);
  });

  it('supports tracking changes with custom anchor', () => {
    const customAnchor: CommentManager.CommentManager.CommentAnchorSignature = {
      vePath: 'Panel: elements > Pane: styles > TreeOutline > TreeItem: color',
      textSignature: 'color: red',
    };
    tracker.trackChange('Changed property "color" from "blue" to "red"', customAnchor);

    const threads = commentManager.getCommentThreads();
    assert.lengthOf(threads, 1);
    assert.isTrue(threads[0].isGeneratedComment);
    assert.strictEqual(threads[0].anchor.vePath, 'Panel: elements > Pane: styles > TreeOutline > TreeItem: color');
    assert.strictEqual(threads[0].anchor.textSignature, 'color: red');
    assert.isUndefined(threads[0].anchor.node);
    assert.strictEqual(threads[0].comments[0].text, 'Changed property "color" from "blue" to "red"');
  });

  it('does not track changes or create comment threads when devToolsComments flag is disabled', () => {
    updateHostConfig({
      devToolsComments: {
        enabled: false,
      },
    });

    tracker.trackChange('Duplicated node <div>', nodeAnchor(100));

    assert.lengthOf(commentManager.getCommentThreads(), 0);
  });

  it('does not track changes or create comment threads when agent is not attached', () => {
    commentManager.setAgentAttached(false);

    tracker.trackChange('Modified node', nodeAnchor(1));
    assert.lengthOf(commentManager.getCommentThreads(), 0);
  });

  it('allows creating multiple independent instances', () => {
    const cm1 = new CommentManager.CommentManager.CommentManager();
    const cm2 = new CommentManager.CommentManager.CommentManager();
    cm1.setAgentAttached(true);
    cm2.setAgentAttached(true);
    const instance1 = new ChangeTracker.ChangeTracker.ChangeTracker(cm1);
    const instance2 = new ChangeTracker.ChangeTracker.ChangeTracker(cm2);
    assert.notStrictEqual(instance1, instance2);

    instance1.trackChange('Duplicated node <div>', nodeAnchor(42));

    assert.lengthOf(cm1.getCommentThreads(), 1);
    assert.lengthOf(cm2.getCommentThreads(), 0);
  });
});
