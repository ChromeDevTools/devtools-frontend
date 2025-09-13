// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import type * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';

import * as Network from './network.js';

describeWithMockConnection('NetworkOverview', () => {
  let target: SDK.Target.Target;
  let networkOverview: Network.NetworkOverview.NetworkOverview;

  beforeEach(() => {
    networkOverview = new Network.NetworkOverview.NetworkOverview();
    target = createTarget();
  });

  const updatesOnEvent = <T extends keyof SDK.ResourceTreeModel.EventTypes>(
      event: Platform.TypeScriptUtilities.NoUnion<T>, inScope: boolean) => async () => {
    SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
    const calculator = {
      computePosition: sinon.stub(),
      setDisplayWidth: sinon.stub(),
      positionToTime: sinon.stub(),
      setBounds: sinon.stub(),
      setNavStartTimes: sinon.stub(),
      reset: sinon.stub(),
      formatValue: sinon.stub(),
      maximumBoundary: sinon.stub(),
      minimumBoundary: sinon.stub(),
      zeroTime: sinon.stub(),
      boundarySpan: sinon.stub(),
    };
    networkOverview.setCalculator(
        calculator as unknown as PerfUI.TimelineOverviewCalculator.TimelineOverviewCalculator);
    renderElementIntoDOM(networkOverview);
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);
    sinon.assert.notCalled(calculator.computePosition);
    resourceTreeModel.dispatchEventToListeners(
        event,
        ...[{loadTime: 42}] as Common.EventTarget.EventPayloadToRestParameters<SDK.ResourceTreeModel.EventTypes, T>);
    await RenderCoordinator.done();
    assert.strictEqual(calculator.computePosition.called, inScope);
    networkOverview.detach();
  };

  it('updates on in scope load event', updatesOnEvent(SDK.ResourceTreeModel.Events.Load, true));
  it('does not update on out of scope load event', updatesOnEvent(SDK.ResourceTreeModel.Events.Load, false));
  it('updates on in scope DOM content load event', updatesOnEvent(SDK.ResourceTreeModel.Events.DOMContentLoaded, true));
  it('does not update on out of scope DOM content load event',
     updatesOnEvent(SDK.ResourceTreeModel.Events.DOMContentLoaded, false));
});
