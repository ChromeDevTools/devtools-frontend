// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, it} from 'mocha';
import sinon from 'sinon';

import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';

import * as PerformanceMonitor from './performance_monitor.js';

describeWithEnvironment('PerformanceMonitor', () => {
  let target: SDK.Target.Target;
  let performanceMonitor: PerformanceMonitor.PerformanceMonitor.PerformanceMonitorImpl;

  beforeEach(() => {
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
  });
  afterEach(() => {
    performanceMonitor.detach();
  });

  it('updates metrics', async () => {
    const getMetrics = sinon.stub(target.performanceAgent(), 'invoke_getMetrics');
    const view = createViewFunctionStub(PerformanceMonitor.PerformanceMonitor.PerformanceMonitorImpl);
    performanceMonitor = new PerformanceMonitor.PerformanceMonitor.PerformanceMonitorImpl(0, view);
    renderElementIntoDOM(performanceMonitor);

    assert.isUndefined((await view.nextInput).metrics);
    await expectCall(getMetrics, {fakeFn: () => Promise.resolve({metrics: [{name: 'LayoutCount', value: 42}]})});
    await expectCall(getMetrics, {fakeFn: () => Promise.resolve({metrics: [{name: 'LayoutCount', value: 84}]})});
    assert.isNotEmpty((await view.nextInput).metrics);
  });

  it('starts polling when shown and stops when hidden', async () => {
    const getMetrics = sinon.stub(target.performanceAgent(), 'invoke_getMetrics');
    const view = createViewFunctionStub(PerformanceMonitor.PerformanceMonitor.PerformanceMonitorImpl);
    performanceMonitor = new PerformanceMonitor.PerformanceMonitor.PerformanceMonitorImpl(10, view);
    const model = target.model(SDK.PerformanceMetricsModel.PerformanceMetricsModel);
    assert.exists(model);
    const modelEnableSpy = sinon.spy(model, 'enable');
    const modelDisableSpy = sinon.spy(model, 'disable');

    performanceMonitor.markAsRoot();
    renderElementIntoDOM(performanceMonitor);

    // Starts polling when shown.
    await expectCall(getMetrics, {fakeFn: () => Promise.resolve({metrics: [], getError: () => undefined})});
    sinon.assert.calledOnce(modelEnableSpy);

    performanceMonitor.detach();

    // Stops polling when hidden.
    getMetrics.resetHistory();
    await new Promise(resolve => setTimeout(resolve, 20));
    sinon.assert.notCalled(getMetrics);
    sinon.assert.calledOnce(modelDisableSpy);

    renderElementIntoDOM(performanceMonitor);

    // Resumes polling when shown again.
    await expectCall(getMetrics, {fakeFn: () => Promise.resolve({metrics: [], getError: () => undefined})});
    sinon.assert.calledTwice(modelEnableSpy);
  });

  it('updates chart visibility and height', async () => {
    const view = createViewFunctionStub(PerformanceMonitor.PerformanceMonitor.PerformanceMonitorImpl);
    performanceMonitor = new PerformanceMonitor.PerformanceMonitor.PerformanceMonitorImpl(0, view);
    renderElementIntoDOM(performanceMonitor);

    const {onMetricChanged, chartsInfo, height: initialHeight} = await view.nextInput;
    // From recalcChartHeight(): height = this.scaleHeight when no active charts.
    // scaleHeight is 16.
    assert.strictEqual(initialHeight, Math.ceil(16 * window.devicePixelRatio));

    const chartToActivate = chartsInfo[0].metrics[0].name;
    onMetricChanged(chartToActivate, true);

    const {height: heightAfterActivation} = await view.nextInput;
    // graphHeight is 90.
    assert.strictEqual(heightAfterActivation, Math.ceil((16 + 90) * window.devicePixelRatio));

    onMetricChanged(chartToActivate, false);
    const {height: heightAfterDeactivation} = await view.nextInput;
    assert.strictEqual(heightAfterDeactivation, initialHeight);
  });

  // Returns how often a theme change makes the performance monitor request an update.
  function countUpdatesOnThemeChange(): number {
    const requestUpdate = sinon.spy(performanceMonitor, 'requestUpdate');
    ThemeSupport.ThemeSupport.instance().dispatchEvent(new ThemeSupport.ThemeChangeEvent());
    requestUpdate.restore();
    return requestUpdate.callCount;
  }

  it('only handles theme changes while shown', () => {
    const view = createViewFunctionStub(PerformanceMonitor.PerformanceMonitor.PerformanceMonitorImpl);
    performanceMonitor = new PerformanceMonitor.PerformanceMonitor.PerformanceMonitorImpl(0, view);

    for (let i = 0; i < 3; ++i) {
      renderElementIntoDOM(performanceMonitor);
      assert.strictEqual(countUpdatesOnThemeChange(), 1);

      performanceMonitor.detach();
      assert.strictEqual(countUpdatesOnThemeChange(), 0);
    }
  });

  it('only handles theme changes while it has a model', () => {
    const view = createViewFunctionStub(PerformanceMonitor.PerformanceMonitor.PerformanceMonitorImpl);
    performanceMonitor = new PerformanceMonitor.PerformanceMonitor.PerformanceMonitorImpl(0, view);
    renderElementIntoDOM(performanceMonitor);
    assert.strictEqual(countUpdatesOnThemeChange(), 1);

    // Removing the model while shown makes the monitor call its own `willHide()`.
    const tabTarget = target.parentTarget();
    assert.exists(tabTarget);
    target.dispose('test');
    assert.strictEqual(countUpdatesOnThemeChange(), 0);

    // Adding a model while shown makes the monitor call its own `wasShown()`.
    target = createTarget({parentTarget: tabTarget});
    assert.strictEqual(countUpdatesOnThemeChange(), 1);

    performanceMonitor.detach();
    assert.strictEqual(countUpdatesOnThemeChange(), 0);
  });
});

describeWithEnvironment('ControlPane', () => {
  const chartsInfo: PerformanceMonitor.PerformanceMonitor.ChartInfo[] = [
    {
      title: 'Chart1' as unknown as Common.UIString.LocalizedString,
      metrics: [{name: 'Metric1', color: 'red'}],
    },
    {
      title: 'Chart2' as unknown as Common.UIString.LocalizedString,
      metrics: [{name: 'Metric2', color: 'blue'}],
    },
  ];

  it('renders indicators', async () => {
    const view = createViewFunctionStub(PerformanceMonitor.PerformanceMonitor.ControlPane);
    const controlPane = new PerformanceMonitor.PerformanceMonitor.ControlPane(document.createElement('div'), view);
    renderElementIntoDOM(controlPane);
    controlPane.chartsInfo = chartsInfo;
    const {chartsInfo: renderedChartsInfo} = await view.nextInput;
    assert.deepEqual(renderedChartsInfo.map(c => c.title), ['Chart1', 'Chart2']);
  });

  it('toggles charts', async () => {
    const view = createViewFunctionStub(PerformanceMonitor.PerformanceMonitor.ControlPane);
    const controlPane = new PerformanceMonitor.PerformanceMonitor.ControlPane(document.createElement('div'), view);
    renderElementIntoDOM(controlPane);

    const onMetricChanged = sinon.spy();
    controlPane.onMetricChanged = onMetricChanged;
    onMetricChanged.resetHistory();

    controlPane.chartsInfo = chartsInfo;
    const {onCheckboxChange} = await view.nextInput;

    const event = {target: {checked: true}} as unknown as Event;
    onCheckboxChange('Metric1', event);

    assert.isTrue(onMetricChanged.calledOnceWith('Metric1', true));

    const event2 = {target: {checked: false}} as unknown as Event;
    onCheckboxChange('Metric1', event2);
    sinon.assert.calledTwice(onMetricChanged);
    sinon.assert.calledWith(onMetricChanged.secondCall, 'Metric1', false);
  });

  it('updates metric values', async () => {
    const view = createViewFunctionStub(PerformanceMonitor.PerformanceMonitor.ControlPane);
    const controlPane = new PerformanceMonitor.PerformanceMonitor.ControlPane(document.createElement('div'), view);
    renderElementIntoDOM(controlPane);
    controlPane.chartsInfo = chartsInfo;
    await view.nextInput;

    controlPane.metrics = new Map([['Metric1', 42]]);
    const {metricValues} = await view.nextInput;
    assert.strictEqual(metricValues.get('Metric1'), 42);
  });
});
