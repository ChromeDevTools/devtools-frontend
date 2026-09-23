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

    // Cannot enable comment mode when agent is not attached
    manager.setCommentMode(true);
    assert.isFalse(manager.isCommentMode());
    assert.deepEqual(modeChangedEvents, []);

    manager.setAgentAttached(true);
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

  it('manages agent attached state and dispatches AGENT_ATTACHED_CHANGED event', () => {
    const attachedChangedEvents: boolean[] = [];
    manager.addEventListener(CommentManager.CommentManager.Events.AGENT_ATTACHED_CHANGED, event => {
      attachedChangedEvents.push(event.data);
    });

    assert.isFalse(manager.isAgentAttached());

    manager.setAgentAttached(true);
    assert.isTrue(manager.isAgentAttached());
    assert.deepEqual(attachedChangedEvents, [true]);

    // Setting same value should not dispatch again
    manager.setAgentAttached(true);
    assert.deepEqual(attachedChangedEvents, [true]);

    manager.setCommentMode(true);
    assert.isTrue(manager.isCommentMode());

    manager.setAgentAttached(false);
    assert.isFalse(manager.isAgentAttached());
    assert.isFalse(manager.isCommentMode());
    assert.deepEqual(attachedChangedEvents, [true, false]);
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
    assert.strictEqual(thread.status, 'DRAFT');

    assert.lengthOf(manager.getCommentThreads(), 1);
    assert.strictEqual(manager.getCommentThread(thread.id), thread);
    assert.lengthOf(threadChangedEvents, 1);
    assert.strictEqual(threadChangedEvents[0][0], thread);

    thread.save();
    assert.strictEqual(thread.status, 'ACTIVE');
    assert.lengthOf(threadChangedEvents, 2);
  });

  it('assigns incrementing index to saved threads', () => {
    const anchor: CommentManager.CommentManager.CommentAnchorSignature = {
      vePath: 'Panel: elements > TreeItem: rule',
      textSignature: 'color: red;',
    };

    const thread1 = manager.createCommentThread(anchor, 'First comment');
    assert.strictEqual(thread1.index, 1);
    thread1.save();
    assert.strictEqual(thread1.index, 1);

    const thread2 = manager.createCommentThread(anchor, 'Second comment');
    assert.strictEqual(thread2.index, 2);
    thread2.save();
    assert.strictEqual(thread2.index, 2);
  });

  it('creates and retrieves comment threads with TimelineAnchorSignature', () => {
    const anchor: CommentManager.CommentManager.CommentAnchorSignature = {
      vePath: 'Panel: timeline > FlameChart: main',
      textSignature: 'Compile Script',
      timeline: {
        traceId: 'trace-1',
        traceEventKey: 'r-42',
        entryName: 'Compile Script',
        startTimeMicro: 1000,
        durationMicro: 500,
        chartLocation: 'main',
      },
    };

    const thread = manager.createCommentThread(anchor, 'Flamechart comment');
    assert.isNotNull(thread);
    assert.deepEqual(thread.anchor.timeline, {
      traceId: 'trace-1',
      traceEventKey: 'r-42',
      entryName: 'Compile Script',
      startTimeMicro: 1000,
      durationMicro: 500,
      chartLocation: 'main',
    });
    assert.strictEqual(thread.comments[0].text, 'Flamechart comment');
  });
  it('supports isGeneratedComment metadata in created threads', () => {
    const anchor: CommentManager.CommentManager.CommentAnchorSignature = {
      vePath: 'Panel: elements > TreeItem: rule',
      textSignature: 'margin: 0;',
    };
    const thread =
        manager.createCommentThread(anchor, 'Changed property "margin" from "0" to "8px"', 'DEVELOPER', true);

    assert.strictEqual(thread.comments[0].author, 'DEVELOPER');
    assert.strictEqual(thread.comments[0].text, 'Changed property "margin" from "0" to "8px"');
    assert.isTrue(thread.isGeneratedComment);
  });

  it('resolves comment threads with optional reply text', () => {
    const anchor: CommentManager.CommentManager.CommentAnchorSignature = {
      vePath: 'Panel: elements > TreeItem: rule',
      textSignature: 'color: red;',
    };
    const thread = manager.createCommentThread(anchor, 'Initial comment');
    assert.strictEqual(thread.status, 'DRAFT');
    assert.isFalse(thread.isGeneratedComment);

    const success = manager.resolveCommentThread(thread.id, 'Done');
    assert.isTrue(success);
    assert.strictEqual(thread.status, 'RESOLVED');
    assert.lengthOf(thread.comments, 2);
    assert.strictEqual(thread.comments[1].author, 'AGENT');
    assert.strictEqual(thread.comments[1].text, 'Done');
  });

  it('creates comment thread without initial text leaving comments array empty', () => {
    const anchor: CommentManager.CommentManager.CommentAnchorSignature = {
      vePath: 'Panel: elements > TreeOutline > TreeItem',
      textSignature: 'div.header',
    };
    const thread = manager.createCommentThread(anchor, undefined, undefined, true);

    assert.isNotNull(thread);
    assert.isEmpty(thread.comments);
    assert.isTrue(thread.isGeneratedComment);
    assert.strictEqual(thread.status, 'DRAFT');
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
    manager.setAgentAttached(true);
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

  it('returns previously unsent comments and marks them as sent in takeComments()', () => {
    const anchor: CommentManager.CommentManager.CommentAnchorSignature = {
      vePath: 'Panel: elements > TreeItem: rule',
      textSignature: 'color: red;',
    };

    const thread1 = manager.createCommentThread(anchor, 'Initial developer comment', 'DEVELOPER');
    assert.isFalse(thread1.transmitted);
    assert.strictEqual(thread1.status, 'DRAFT');

    // Returns empty array when thread is in DRAFT state
    assert.isEmpty(manager.takeComments());
    assert.isFalse(thread1.transmitted);

    // Returns empty array when thread is in ACTIVE (saved, unsent) state
    thread1.save();
    assert.strictEqual(thread1.status, 'ACTIVE');
    assert.isEmpty(manager.takeComments());
    assert.isFalse(thread1.transmitted);

    thread1.sendToAgent();
    assert.strictEqual(thread1.status, 'SENT_TO_AGENT');

    const taken = manager.takeComments();
    assert.lengthOf(taken, 1);
    assert.strictEqual(taken[0].id, thread1.id);
    assert.isTrue(taken[0].transmitted);
    assert.isTrue(thread1.transmitted);
    assert.lengthOf(taken[0].comments, 1);
    assert.strictEqual(taken[0].comments[0].text, 'Initial developer comment');

    // Calling takeComments again returns empty array as it was marked as sent
    const takenAgain = manager.takeComments();
    assert.lengthOf(takenAgain, 0);

    // Creating another thread makes it available in takeComments after sendToAgent()
    const thread2 = manager.createCommentThread(anchor, 'Second thread', 'DEVELOPER');
    assert.isFalse(thread2.transmitted);
    assert.isEmpty(manager.takeComments());

    thread2.sendToAgent();

    const takenNew = manager.takeComments();
    assert.lengthOf(takenNew, 1);
    assert.strictEqual(takenNew[0].id, thread2.id);
    assert.isTrue(thread2.transmitted);
    assert.strictEqual(takenNew[0].comments[0].text, 'Second thread');

    // Resolving thread with agent reply
    manager.resolveCommentThread(thread2.id, 'Agent reply');
    assert.lengthOf(manager.takeComments(), 0);
  });

  it('supports timeline anchor signatures with traceId', () => {
    const anchor: CommentManager.CommentManager.CommentAnchorSignature = {
      vePath: 'Panel: timeline > FlameChart: main',
      textSignature: 'Task',
      timeline: {
        traceId: 'trace-12345',
        traceEventKey: 'r-0',
        entryName: 'Task',
        startTimeMicro: 1000000,
        chartLocation: 'main',
      },
    };
    const thread = manager.createCommentThread(anchor, 'Timeline comment');
    assert.strictEqual(thread.anchor.timeline?.traceId, 'trace-12345');
    assert.strictEqual(thread.anchor.timeline?.traceEventKey, 'r-0');
  });
});
