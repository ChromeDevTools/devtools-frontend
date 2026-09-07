// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as CommentManager from './comment_manager.js';

describe('CD4ABridge', () => {
  let commentManager: CommentManager.CommentManager.CommentManager;

  beforeEach(() => {
    commentManager = new CommentManager.CommentManager.CommentManager();
  });

  it('formats comment threads without DOM access', () => {
    const bridge = new CommentManager.CD4ABridge.CD4ABridge(commentManager);

    commentManager.createCommentThread(
        {
          vePath: 'Panel: elements > Pane: styles',
          textSignature: 'color: red',
          networkRequestId: 'req-1',
          backendNodeId: 10,
          editor: {
            filePath: 'index.html',
            lineNumber: 42,
          },
        },
        'Need color contrast fix',
        'DEVELOPER',
    );

    const threads = bridge.getCommentThreads();
    assert.lengthOf(threads, 1);
    assert.strictEqual(threads[0].id, 'comment-1');
    assert.strictEqual(threads[0].text, 'Need color contrast fix');
    assert.strictEqual(threads[0].networkRequestId, 'req-1');
    assert.strictEqual(threads[0].backendNodeId, 10);
    assert.deepEqual(threads[0].editor, {
      filePath: 'index.html',
      lineNumber: 42,
    });

    // Second retrieval returns empty array as unsent comments were taken
    const threadsAfter = bridge.getCommentThreads();
    assert.lengthOf(threadsAfter, 0);
  });

  it('only takes the first comment text', () => {
    const bridge = new CommentManager.CD4ABridge.CD4ABridge(commentManager);

    const thread = commentManager.createCommentThread(
        {
          vePath: 'Panel: elements',
          textSignature: 'h1',
        },
        'First comment',
    );
    thread.comments.push({
      author: 'DEVELOPER',
      text: 'Second comment',
      timestamp: Date.now(),
    });

    const threads = bridge.getCommentThreads();
    assert.lengthOf(threads, 1);
    assert.strictEqual(threads[0].text, 'First comment');
  });

  it('delegates resolve to CommentManager and dispatches events', () => {
    const bridge = new CommentManager.CD4ABridge.CD4ABridge(commentManager);

    const thread = commentManager.createCommentThread(
        {
          vePath: 'Panel: elements',
          textSignature: 'h1',
        },
        'Fix heading',
    );

    let eventFired = false;
    bridge.addEventListener(CommentManager.CD4ABridge.Events.COMMENT_THREADS_CHANGED, () => {
      eventFired = true;
    });

    const success = bridge.resolveCommentThread(thread.id, 'Fixed heading');
    assert.isTrue(success);
    assert.isTrue(eventFired);

    const updated = commentManager.getCommentThread(thread.id);
    assert.strictEqual(updated?.status, 'RESOLVED');
    assert.lengthOf(updated?.comments || [], 2);
    assert.strictEqual(updated?.comments[1].author, 'AGENT');
    assert.strictEqual(updated?.comments[1].text, 'Fixed heading');
  });

  it('removes listeners on dispose', () => {
    const bridge = new CommentManager.CD4ABridge.CD4ABridge(commentManager);
    let eventFired = false;
    bridge.addEventListener(CommentManager.CD4ABridge.Events.COMMENT_THREADS_CHANGED, () => {
      eventFired = true;
    });

    bridge.dispose();

    commentManager.createCommentThread(
        {
          vePath: 'Panel: elements',
          textSignature: 'h1',
        },
        'Fix heading',
    );

    assert.isFalse(eventFired);
  });
});
