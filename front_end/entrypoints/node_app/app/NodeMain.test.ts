// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import {createTarget} from '../../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';

import * as App from './app.js';

describeWithMockConnection('NodeChildTargetManager', () => {
  it('attaches Node.js targets without a parent target', () => {
    const browserTarget = createTarget({type: SDK.Target.Type.BROWSER});
    const childTargetManager = browserTarget.model(App.NodeMain.NodeChildTargetManager);
    assert.exists(childTargetManager);

    childTargetManager.attachedToTarget({
      sessionId: 'session ID' as Protocol.Target.SessionID,
      targetInfo: {
        attached: true,
        targetId: 'node js target' as Protocol.Target.TargetID,
        type: 'other',
        title: 'my node target',
        url: 'file:///some/script.js',
        canAccessOpener: false,
      },
      waitingForDebugger: true,
    });

    const target = SDK.TargetManager.TargetManager.instance().targetById('node js target');
    assert.exists(target);
    assert.isNull(target.parentTarget());
    assert.strictEqual(target.sessionId, '');
  });

  it('sends CDP messages via "sendMessageToTarget"', () => {
    const browserTarget = createTarget({type: SDK.Target.Type.BROWSER});
    const sendStub = sinon.stub(browserTarget.targetAgent(), 'invoke_sendMessageToTarget');
    const childTargetManager = browserTarget.model(App.NodeMain.NodeChildTargetManager);
    assert.exists(childTargetManager);

    childTargetManager.attachedToTarget({
      sessionId: 'session ID' as Protocol.Target.SessionID,
      targetInfo: {
        attached: true,
        targetId: 'node js target' as Protocol.Target.TargetID,
        type: 'other',
        title: 'my node target',
        url: 'file:///some/script.js',
        canAccessOpener: false,
      },
      waitingForDebugger: true,
    });

    const target = SDK.TargetManager.TargetManager.instance().targetById('node js target');
    assert.exists(target);

    // Creating the target should have already sent a bunch of messages, like Debugger.enable
    sinon.assert.calledWithMatch(sendStub, sinon.match(request => {
      const {method} = JSON.parse(request.message);
      return method === 'Debugger.enable';
    }));
  });
});
