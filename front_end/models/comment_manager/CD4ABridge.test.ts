// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Logs from '../logs/logs.js';

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
          node: {
            backendNodeId: 10,
            targetId: 'target-1',
          },
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

  describe('reveal', () => {
    let mockHost: Host.InspectorFrontendHostAPI.InspectorFrontendHostAPI;
    let showPanelSpy: sinon.SinonSpy;

    beforeEach(() => {
      showPanelSpy = sinon.spy();
      const hostEvents = new Common.ObjectWrapper.ObjectWrapper<Host.InspectorFrontendHostAPI.EventTypes>();
      hostEvents.addEventListener(Host.InspectorFrontendHostAPI.Events.ShowPanel, event => {
        showPanelSpy(event.data);
      });
      mockHost = {
        events: hostEvents,
      } as unknown as Host.InspectorFrontendHostAPI.InspectorFrontendHostAPI;
    });

    afterEach(() => {
      sinon.restore();
      Common.Revealer.RevealerRegistry.removeInstance();
    });

    it('shows panel for any given panel name', async () => {
      const bridge = new CommentManager.CD4ABridge.CD4ABridge(commentManager, undefined, undefined, mockHost);
      await bridge.reveal('custom_panel');

      assert.isTrue(showPanelSpy.calledOnceWith('custom_panel'));
    });

    it('reveals network request in addition to panel reveal', async () => {
      const mockRequest = {requestId: () => 'req-1'} as SDK.NetworkRequest.NetworkRequest;
      const mockNetworkLog = {
        requestsForId: (id: string) => id === 'req-1' ? [mockRequest] : [],
      } as unknown as Logs.NetworkLog.NetworkLog;

      const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal').resolves();

      const bridge = new CommentManager.CD4ABridge.CD4ABridge(commentManager, undefined, mockNetworkLog, mockHost);
      await bridge.reveal('network', {networkRequestId: 'req-1'});

      assert.isTrue(showPanelSpy.calledOnceWith('network'));
      assert.isTrue(revealStub.calledOnceWith(mockRequest));
    });

    it('reveals DOM node in addition to panel reveal', async () => {
      const mockNode = {} as SDK.DOMModel.DOMNode;
      const mockDomModel = {
        pushNodesByBackendIdsToFrontend: sinon.stub().resolves(new Map([[10, mockNode]])),
      };
      const mockPrimaryTarget = {
        model: sinon.stub().withArgs(SDK.DOMModel.DOMModel).returns(mockDomModel),
      };
      const mockTargetManager = {
        primaryPageTarget: () => mockPrimaryTarget,
      } as unknown as SDK.TargetManager.TargetManager;

      const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal').resolves();

      const bridge = new CommentManager.CD4ABridge.CD4ABridge(commentManager, mockTargetManager, undefined, mockHost);
      await bridge.reveal('elements', {backendNodeId: 10});

      assert.isTrue(showPanelSpy.calledOnceWith('elements'));
      assert.isTrue(revealStub.calledOnceWith(mockNode));
    });

    it('reveals both network request and DOM node if both are present in target', async () => {
      const mockRequest = {requestId: () => 'req-1'} as SDK.NetworkRequest.NetworkRequest;
      const mockNetworkLog = {
        requestsForId: (id: string) => id === 'req-1' ? [mockRequest] : [],
      } as unknown as Logs.NetworkLog.NetworkLog;

      const mockNode = {} as SDK.DOMModel.DOMNode;
      const mockDomModel = {
        pushNodesByBackendIdsToFrontend: sinon.stub().resolves(new Map([[10, mockNode]])),
      };
      const mockPrimaryTarget = {
        model: sinon.stub().withArgs(SDK.DOMModel.DOMModel).returns(mockDomModel),
      };
      const mockTargetManager = {
        primaryPageTarget: () => mockPrimaryTarget,
      } as unknown as SDK.TargetManager.TargetManager;

      const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal').resolves();

      const bridge =
          new CommentManager.CD4ABridge.CD4ABridge(commentManager, mockTargetManager, mockNetworkLog, mockHost);
      await bridge.reveal('summary_panel', {networkRequestId: 'req-1', backendNodeId: 10});

      assert.isTrue(showPanelSpy.calledOnceWith('summary_panel'));
      sinon.assert.callCount(revealStub, 2);
      sinon.assert.calledWith(revealStub.firstCall, mockRequest);
      sinon.assert.calledWith(revealStub.secondCall, mockNode);
    });
  });
});
