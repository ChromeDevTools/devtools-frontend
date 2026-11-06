// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';
import sinon from 'sinon';

import * as Trace from '../../../models/trace/trace.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getBaseTraceHandlerData} from '../../../testing/TraceHelpers.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../../ui/legacy/theme_support/theme_support.js';

import * as TimelineComponents from './components.js';

function createStubDataProvider(): TimelineComponents.NetworkTrackWidget.NetworkDataProvider {
  const timelineData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
  return {
    minimumBoundary: () => 0,
    totalTime: () => 100,
    formatValue: () => '',
    maxStackDepth: () => 1,
    timelineData: () => timelineData,
    preparePopoverElement: () => null,
    canJumpToEntry: () => false,
    entryTitle: () => null,
    entryFont: () => null,
    entryColor: () => '',
    decorateEntry: () => false,
    forceDecoration: () => false,
    textColor: () => '',
    hasTrackConfigurationMode: () => false,
    setModel: () => {},
    setWindowTimes: () => {},
  };
}

const DEFAULT_BOUNDS: Trace.Types.Timing.TraceWindowMicro = {
  min: Trace.Types.Timing.Micro(20_000),
  max: Trace.Types.Timing.Micro(80_000),
  range: Trace.Types.Timing.Micro(60_000),
};

describeWithEnvironment('NetworkTrackWidget', () => {
  it('only holds FlameChart theme listeners while connected', async () => {
    const themeSupport = ThemeSupport.ThemeSupport.instance();
    const addSpy = sinon.spy(themeSupport, 'addEventListener');
    const removeSpy = sinon.spy(themeSupport, 'removeEventListener');
    const activeThemeListeners = (): number => {
      const isThemeChange = (call: sinon.SinonSpyCall): boolean =>
          call.args[0] === ThemeSupport.ThemeChangeEvent.eventName;
      return addSpy.getCalls().filter(isThemeChange).length - removeSpy.getCalls().filter(isThemeChange).length;
    };

    const widget = new TimelineComponents.NetworkTrackWidget.NetworkTrackWidget();
    widget.data = {
      parsedTrace: getBaseTraceHandlerData(),
      bounds: DEFAULT_BOUNDS,
      dataProvider: createStubDataProvider(),
    };
    assert.strictEqual(activeThemeListeners(), 0);

    renderElementIntoDOM(widget);
    await widget.updateComplete;
    assert.strictEqual(activeThemeListeners(), 1);

    widget.detach();
    assert.strictEqual(activeThemeListeners(), 0);
  });

  it('updates the FlameChart when dataProvider changes', async () => {
    const parsedTrace = getBaseTraceHandlerData();
    const firstDataProvider = createStubDataProvider();
    const widget = new TimelineComponents.NetworkTrackWidget.NetworkTrackWidget();
    widget.data = {
      parsedTrace,
      bounds: DEFAULT_BOUNDS,
      dataProvider: firstDataProvider,
    };

    renderElementIntoDOM(widget);
    await widget.updateComplete;

    const getFlameChart = (): PerfUI.FlameChart.FlameChart => {
      const container = widget.contentElement.querySelector('devtools-widget.container');
      assert.instanceOf(container, UI.Widget.WidgetElement);
      const flameChart = container.getWidget();
      assert.instanceOf(flameChart, PerfUI.FlameChart.FlameChart);
      return flameChart;
    };
    assert.strictEqual(getFlameChart().timelineData(), firstDataProvider.timelineData());
    assert.deepEqual(getFlameChart().windowTimes, {min: 20, max: 80});

    const secondDataProvider = createStubDataProvider();
    widget.data = {
      parsedTrace,
      bounds: DEFAULT_BOUNDS,
      dataProvider: secondDataProvider,
    };
    await widget.updateComplete;

    assert.strictEqual(getFlameChart().timelineData(), secondDataProvider.timelineData(),
                       'Expected FlameChart to use the updated dataProvider');
    assert.deepEqual(getFlameChart().windowTimes, {min: 20, max: 80});
  });
});
