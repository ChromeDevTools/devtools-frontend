// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Host from '../../core/host/host.js';

import * as CommentManager from './comment_manager.js';

describe('CommentThread', () => {
  const defaultAnchor: CommentManager.CommentThread.CommentAnchorSignature = {
    vePath: 'Panel: elements > TreeItem: rule',
    textSignature: 'color: red;',
  };

  it('generates a non-empty unique id', () => {
    const thread1 = new CommentManager.CommentThread.CommentThread({
      anchor: defaultAnchor,
    });
    const thread2 = new CommentManager.CommentThread.CommentThread({
      anchor: defaultAnchor,
    });
    assert.isNotEmpty(thread1.id);
    assert.isNotEmpty(thread2.id);
    assert.notStrictEqual(thread1.id, thread2.id);
  });

  it('defaults status to DRAFT and transmitted to false', () => {
    const thread = new CommentManager.CommentThread.CommentThread({
      anchor: defaultAnchor,
    });
    assert.strictEqual(thread.status, 'DRAFT');
    assert.isFalse(thread.transmitted);
    assert.isEmpty(thread.comments);
  });

  it('save() transitions status from DRAFT to ACTIVE and dispatches CHANGED event', () => {
    let changeCount = 0;
    const thread = new CommentManager.CommentThread.CommentThread({
      anchor: defaultAnchor,
    });
    thread.addEventListener(CommentManager.CommentThread.Events.CHANGED, () => {
      changeCount++;
    });

    assert.strictEqual(thread.status, 'DRAFT');
    thread.save();
    assert.strictEqual(thread.status, 'ACTIVE');
    assert.strictEqual(changeCount, 1);

    // Calling save() when already ACTIVE does not change status or dispatch CHANGED
    thread.save();
    assert.strictEqual(thread.status, 'ACTIVE');
    assert.strictEqual(changeCount, 1);

    // Calling save() when RESOLVED does not change status or dispatch CHANGED
    thread.resolve();
    assert.strictEqual(thread.status, 'RESOLVED');
    assert.strictEqual(changeCount, 2);

    thread.save();
    assert.strictEqual(thread.status, 'RESOLVED');
    assert.strictEqual(changeCount, 2);
  });

  it('resolve() sets status to RESOLVED, appends trimmed AGENT comment if replyText is non-empty, and dispatches CHANGED event',
     () => {
       let changeCount = 0;
       const thread = new CommentManager.CommentThread.CommentThread({
         anchor: defaultAnchor,
       });
       thread.addEventListener(CommentManager.CommentThread.Events.CHANGED, () => {
         changeCount++;
       });

       thread.resolve('  Fixed issue  ');
       assert.strictEqual(thread.status, 'RESOLVED');
       assert.strictEqual(changeCount, 1);
       assert.lengthOf(thread.comments, 1);
       assert.strictEqual(thread.comments[0].author, 'AGENT');
       assert.strictEqual(thread.comments[0].text, 'Fixed issue');

       // Resolving with empty/whitespace string does not append comment
       const thread2 = new CommentManager.CommentThread.CommentThread({
         anchor: defaultAnchor,
       });
       thread2.addEventListener(CommentManager.CommentThread.Events.CHANGED, () => {
         changeCount++;
       });
       thread2.resolve('   ');
       assert.strictEqual(thread2.status, 'RESOLVED');
       assert.strictEqual(changeCount, 2);
       assert.isEmpty(thread2.comments);
     });

  it('save(text) appends comment, transitions DRAFT to ACTIVE, and dispatches CHANGED event', () => {
    let changeCount = 0;
    const thread = new CommentManager.CommentThread.CommentThread({
      anchor: defaultAnchor,
    });
    thread.addEventListener(CommentManager.CommentThread.Events.CHANGED, () => {
      changeCount++;
    });

    assert.strictEqual(thread.status, 'DRAFT');
    thread.save('First comment');
    assert.strictEqual(thread.status, 'ACTIVE');
    assert.strictEqual(changeCount, 1);
    assert.lengthOf(thread.comments, 1);
    assert.strictEqual(thread.comments[0].text, 'First comment');
    assert.strictEqual(thread.comments[0].author, 'DEVELOPER');
  });

  it('sendToAgent() transitions DRAFT or ACTIVE to SENT_TO_AGENT, assigns index, appends optional text, and dispatches CHANGED',
     () => {
       let changeCount = 0;
       const thread1 = new CommentManager.CommentThread.CommentThread({
         anchor: defaultAnchor,
       });
       thread1.addEventListener(CommentManager.CommentThread.Events.CHANGED, () => {
         changeCount++;
       });

       assert.strictEqual(thread1.status, 'DRAFT');
       thread1.sendToAgent('Send from draft');
       assert.strictEqual(thread1.status, 'SENT_TO_AGENT');
       assert.strictEqual(changeCount, 1);
       assert.lengthOf(thread1.comments, 1);
       assert.strictEqual(thread1.comments[0].text, 'Send from draft');

       // Calling sendToAgent() again without text does not dispatch CHANGED
       thread1.sendToAgent();
       assert.strictEqual(thread1.status, 'SENT_TO_AGENT');
       assert.strictEqual(changeCount, 1);

       // Transition from ACTIVE (saved) to SENT_TO_AGENT
       const thread2 = new CommentManager.CommentThread.CommentThread({
         anchor: defaultAnchor,
       });
       thread2.save();
       assert.strictEqual(thread2.status, 'ACTIVE');

       thread2.sendToAgent();
       assert.strictEqual(thread2.status, 'SENT_TO_AGENT');
     });

  it('editComment() replaces the developer comment text of an ACTIVE thread and dispatches CHANGED', () => {
    const thread = new CommentManager.CommentThread.CommentThread({
      anchor: defaultAnchor,
    });
    thread.save('Original');
    let changeCount = 0;
    thread.addEventListener(CommentManager.CommentThread.Events.CHANGED, () => {
      changeCount++;
    });

    thread.editComment('  Edited  ');

    assert.strictEqual(thread.status, 'ACTIVE');
    assert.lengthOf(thread.comments, 1);
    assert.strictEqual(thread.comments[0].author, 'DEVELOPER');
    assert.strictEqual(thread.comments[0].text, 'Edited');
    assert.strictEqual(changeCount, 1);
  });

  it('editComment() is a no-op for a SENT_TO_AGENT thread', () => {
    const thread = new CommentManager.CommentThread.CommentThread({
      anchor: defaultAnchor,
    });
    thread.sendToAgent('Sent');
    let changeCount = 0;
    thread.addEventListener(CommentManager.CommentThread.Events.CHANGED, () => {
      changeCount++;
    });

    thread.editComment('Edited');

    assert.strictEqual(thread.comments[0].text, 'Sent');
    assert.strictEqual(changeCount, 0);
  });

  it('editComment() does not dispatch CHANGED when the text is unchanged', () => {
    const thread = new CommentManager.CommentThread.CommentThread({
      anchor: defaultAnchor,
    });
    thread.save('Original');
    let changeCount = 0;
    thread.addEventListener(CommentManager.CommentThread.Events.CHANGED, () => {
      changeCount++;
    });

    thread.editComment('Original');
    thread.editComment('  Original  ');

    assert.strictEqual(thread.comments[0].text, 'Original');
    assert.strictEqual(changeCount, 0);
  });

  it('editComment() ignores empty or whitespace-only text', () => {
    const thread = new CommentManager.CommentThread.CommentThread({
      anchor: defaultAnchor,
    });
    thread.save('Original');
    let changeCount = 0;
    thread.addEventListener(CommentManager.CommentThread.Events.CHANGED, () => {
      changeCount++;
    });

    thread.editComment('');
    thread.editComment('   ');

    assert.strictEqual(thread.status, 'ACTIVE');
    assert.lengthOf(thread.comments, 1);
    assert.strictEqual(thread.comments[0].text, 'Original');
    assert.strictEqual(changeCount, 0);
  });
});

describe('CommentThread UMA', () => {
  const anchor: CommentManager.CommentThread.CommentAnchorSignature = {
    vePath: 'Panel: elements > TreeItem: rule',
  };

  let commentCreated: sinon.SinonStub;
  let commentSize: sinon.SinonStub;

  beforeEach(() => {
    commentCreated = sinon.stub(Host.userMetrics, 'commentCreated');
    commentSize = sinon.stub(Host.userMetrics, 'commentSize');
  });

  it('records CommentCreated and CommentSize once when a draft is saved', () => {
    const thread = new CommentManager.CommentThread.CommentThread({anchor});
    thread.save('  Make this blue  ');
    thread.save('Follow-up');
    thread.sendToAgent();

    sinon.assert.calledOnceWithExactly(commentCreated, 1);
    sinon.assert.calledOnceWithExactly(commentSize, 'Make this blue'.length);
  });

  it('records CommentCreated and CommentSize when a draft is sent to the agent directly', () => {
    const thread = new CommentManager.CommentThread.CommentThread({anchor});
    thread.sendToAgent('Fix padding');

    sinon.assert.calledOnceWithExactly(commentCreated, 1);
    sinon.assert.calledOnceWithExactly(commentSize, 'Fix padding'.length);
  });

  it('does not record CommentCreated for generated comments', () => {
    const thread = new CommentManager.CommentThread.CommentThread({
      anchor,
      comments: [{author: 'DEVELOPER', text: 'Changed color', timestamp: 0}],
      isGeneratedComment: true,
    });
    thread.save();

    sinon.assert.notCalled(commentCreated);
    sinon.assert.notCalled(commentSize);
  });

  it('does not record CommentCreated or CommentSize for drafts without developer text', () => {
    const whitespaceThread = new CommentManager.CommentThread.CommentThread({
      anchor,
      comments: [{author: 'DEVELOPER', text: '   ', timestamp: 0}],
    });
    whitespaceThread.save();

    const emptyThread = new CommentManager.CommentThread.CommentThread({anchor});
    emptyThread.save();

    sinon.assert.notCalled(commentCreated);
    sinon.assert.notCalled(commentSize);
  });

  it('does not record CommentCreated for drafts that are never saved', () => {
    const thread = new CommentManager.CommentThread.CommentThread({anchor});
    thread.editComment('ignored');

    sinon.assert.notCalled(commentCreated);
  });
});
