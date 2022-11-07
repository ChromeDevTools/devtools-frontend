// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Lighthouse from '../../../../../front_end/panels/lighthouse/lighthouse.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as ProtocolClient from '../../../../../front_end/core/protocol_client/protocol_client.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection, dispatchEvent} from '../../helpers/MockConnection.js';

const {assert} = chai;

describeWithMockConnection('LighthouseProtocolService', () => {
  const attachDetach = (targetFactory: () => SDK.Target.Target) => {
    let LighthouseModule: typeof Lighthouse;
    let target: SDK.Target.Target;
    let suspendAllTargets: sinon.SinonStub;
    let resumeAllTargets: sinon.SinonStub;
    let createParallelConnection: sinon.SinonStub;
    const FRAME = {
      id: 'main',
      loaderId: 'test',
      url: 'http://example.com',
      securityOrigin: 'http://example.com',
      mimeType: 'text/html',
    };

    beforeEach(async () => {
      LighthouseModule = await import('../../../../../front_end/panels/lighthouse/lighthouse.js');
      target = targetFactory();
      const targetManager = SDK.TargetManager.TargetManager.instance();
      suspendAllTargets = sinon.stub(targetManager, 'suspendAllTargets').resolves();
      resumeAllTargets = sinon.stub(targetManager, 'resumeAllTargets').resolves();
      SDK.ChildTargetManager.ChildTargetManager.install();
      const childTargetManager = target.model(SDK.ChildTargetManager.ChildTargetManager);
      assertNotNullOrUndefined(childTargetManager);
      createParallelConnection = sinon.stub(childTargetManager, 'createParallelConnection').resolves({
        connection: {disconnect: () => {}} as ProtocolClient.InspectorBackend.Connection,
        sessionId: 'foo',
      });
      dispatchEvent(target, 'Page.frameNavigated', {frame: FRAME});
    });

    it('suspends all targets', async () => {
      const service = new LighthouseModule.LighthouseProtocolService.ProtocolService();
      await service.attach();
      assert.isTrue(suspendAllTargets.calledOnce);
    });

    it('creates a parallel connection', async () => {
      const service = new LighthouseModule.LighthouseProtocolService.ProtocolService();
      await service.attach();
      assert.isTrue(createParallelConnection.calledOnce);
    });

    it('resumes all targets', async () => {
      const service = new LighthouseModule.LighthouseProtocolService.ProtocolService();
      await service.attach();
      await service.detach();
      assert.isTrue(resumeAllTargets.calledOnce);
    });
  };

  describe('attach/detach without tab taget', () => attachDetach(() => createTarget()));
  describe('attach/detach with tab taget', () => attachDetach(() => {
                                             const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                             createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                             return createTarget({parentTarget: tabTarget});
                                           }));
});
