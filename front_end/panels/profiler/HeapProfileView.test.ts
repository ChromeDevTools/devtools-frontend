// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

describeWithMockConnection('SamplingHeapProfileTypeBase', () => {
  describe('buttonClicked', () => {
    let releaseAllAnimationsStub: sinon.SinonStub;
    beforeEach(() => {
      const target = createTarget();
      const heapProfilerModel = target.model(SDK.HeapProfilerModel.HeapProfilerModel);
      UI.Context.Context.instance().setFlavor(SDK.HeapProfilerModel.HeapProfilerModel, heapProfilerModel);

      releaseAllAnimationsStub =
          sinon.stub(SDK.AnimationModel.AnimationModel.prototype, 'releaseAllAnimations').resolves();
    });

    it('releases all animations before `startSampling` call', async () => {
      // We need dynamic import here because statically importing the module requires locale vars to be initialized vars.
      const Profiler = await import('./profiler.js');
      const startSamplingStub =
          sinon.stub(Profiler.ProfileTypeRegistry.instance.samplingHeapProfileType, 'startSampling');
      Profiler.ProfileTypeRegistry.instance.samplingHeapProfileType.buttonClicked();

      assert.isTrue(releaseAllAnimationsStub.calledOnce, 'Expected release all animations to be called');
      await expectCall(startSamplingStub);
    });
  });
});
