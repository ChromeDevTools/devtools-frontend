// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as PerformanceMonitor from '../../../../../front_end/panels/performance_monitor/performance_monitor.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';

import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

describeWithMockConnection('PerformanceMonitor', () => {
  const tests = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;
    let performanceMonitor: PerformanceMonitor.PerformanceMonitor.PerformanceMonitorImpl;

    beforeEach(() => {
      target = targetFactory();
    });
    afterEach(() => {
      performanceMonitor.detach();
    });

    it('updates metrics', async () => {
      let metrics = {metrics: [{name: 'LayoutCount', value: 42}]} as Protocol.Performance.GetMetricsResponse;
      let onGetMetrics = () => {};
      sinon.stub(target.performanceAgent(), 'invoke_getMetrics').callsFake(() => {
        onGetMetrics();
        return Promise.resolve(metrics);
      });
      performanceMonitor = new PerformanceMonitor.PerformanceMonitor.PerformanceMonitorImpl(0);
      performanceMonitor.markAsRoot();
      performanceMonitor.show(document.body);
      assert.isFalse(
          [...performanceMonitor.contentElement.querySelectorAll('.perfmon-indicator-value')].some(e => e.textContent));
      await new Promise<void>(resolve => {
        onGetMetrics = resolve;
      });
      metrics = {metrics: [{name: 'LayoutCount', value: 84}]} as Protocol.Performance.GetMetricsResponse;
      await new Promise<void>(resolve => {
        onGetMetrics = resolve;
      });
      assert.isTrue(
          [...performanceMonitor.contentElement.querySelectorAll('.perfmon-indicator-value')].some(e => e.textContent));
    });
  };

  describe('without tab target', () => tests(createTarget));
  describe('with tab target', () => tests(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));
});
