// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../../../front_end/core/common/common.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Network from '../../../../../front_end/panels/network/network.js';
import * as Coordinator from '../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import type * as PerfUI from '../../../../../front_end/ui/legacy/components/perf_ui/perf_ui.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

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
    networkOverview.markAsRoot();
    networkOverview.show(document.body);
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assertNotNullOrUndefined(resourceTreeModel);
    assert.isFalse(calculator.computePosition.called);
    resourceTreeModel.dispatchEventToListeners(
        event,
        ...[{loadTime: 42}] as Common.EventTarget.EventPayloadToRestParameters<SDK.ResourceTreeModel.EventTypes, T>);
    await coordinator.done();
    assert.strictEqual(calculator.computePosition.called, inScope);
    networkOverview.detach();
  };

  it('updates on in scope load event', updatesOnEvent(SDK.ResourceTreeModel.Events.Load, true));
  it('does not update on out of scope load event', updatesOnEvent(SDK.ResourceTreeModel.Events.Load, false));
  it('updates on in scope DOM content load event', updatesOnEvent(SDK.ResourceTreeModel.Events.DOMContentLoaded, true));
  it('does not update on out of scope DOM content load event',
     updatesOnEvent(SDK.ResourceTreeModel.Events.DOMContentLoaded, false));
});
