// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

describeWithMockConnection('DetachedElementsProfileType', () => {
  describe('buttonClicked', () => {
    let releaseAllAnimationsStub: sinon.SinonStub;
    let getDetachedDOMNodesStub: sinon.SinonStub;
    beforeEach(() => {
      const target = createTarget();
      const heapProfilerModel = target.model(SDK.HeapProfilerModel.HeapProfilerModel);
      UI.Context.Context.instance().setFlavor(SDK.HeapProfilerModel.HeapProfilerModel, heapProfilerModel);

      releaseAllAnimationsStub =
          sinon.stub(SDK.AnimationModel.AnimationModel.prototype, 'releaseAllAnimations').resolves();
      getDetachedDOMNodesStub = sinon.stub(SDK.DOMModel.DOMModel.prototype, 'getDetachedDOMNodes').resolves([]);
    });

    it('releases all animations before `getDetachedDOMNodes` call', async () => {
      // We need dynamic import here because statically importing the module requires locale vars to be initialized vars.
      const Profiler = await import('./profiler.js');
      Profiler.ProfileTypeRegistry.instance.detachedElementProfileType.buttonClicked();

      assert.isTrue(releaseAllAnimationsStub.calledOnce, 'Expected release all animations to be called');
      await expectCall(getDetachedDOMNodesStub);
    });
  });
});
