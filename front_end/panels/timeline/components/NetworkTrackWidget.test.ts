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

describeWithEnvironment('NetworkTrackWidget', () => {
  it('only holds FlameChart theme listeners while connected and detaches old charts on dataProvider change',
     async () => {
       const themeSupport = ThemeSupport.ThemeSupport.instance();
       const addSpy = sinon.spy(themeSupport, 'addEventListener');
       const removeSpy = sinon.spy(themeSupport, 'removeEventListener');
       const activeThemeListeners = (): number => {
         const isThemeChange = (call: sinon.SinonSpyCall): boolean =>
             call.args[0] === ThemeSupport.ThemeChangeEvent.eventName;
         return addSpy.getCalls().filter(isThemeChange).length - removeSpy.getCalls().filter(isThemeChange).length;
       };

       const parsedTrace = getBaseTraceHandlerData();
       const bounds: Trace.Types.Timing.TraceWindowMicro = {
         min: Trace.Types.Timing.Micro(0),
         max: Trace.Types.Timing.Micro(100_000),
         range: Trace.Types.Timing.Micro(100_000),
       };

       const widget = new TimelineComponents.NetworkTrackWidget.NetworkTrackWidget();
       widget.data = {
         parsedTrace,
         bounds,
         dataProvider: createStubDataProvider(),
       };
       assert.strictEqual(activeThemeListeners(), 0);

       renderElementIntoDOM(widget);
       await widget.updateComplete;
       assert.strictEqual(activeThemeListeners(), 1);

       widget.data = {
         parsedTrace,
         bounds,
         dataProvider: createStubDataProvider(),
       };
       await widget.updateComplete;
       assert.strictEqual(activeThemeListeners(), 1);

       widget.detach();
       assert.strictEqual(activeThemeListeners(), 0);
     });
});
