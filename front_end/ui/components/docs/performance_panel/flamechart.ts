// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as EnvironmentHelpers from '../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as TraceHelpers from '../../../../../test/unittests/front_end/helpers/TraceHelpers.js';
import * as PerfUI from '../../../legacy/components/perf_ui/perf_ui.js';
import * as ComponentSetup from '../../helpers/helpers.js';

import type * as Platform from '../../../../core/platform/platform.js';
import * as TraceEngine from '../../../../models/trace/trace.js';

await EnvironmentHelpers.initializeGlobalVars();
await ComponentSetup.ComponentServerSetup.setup();

/**
 * Render a basic flame chart with 3 events on the same level
 **/
function renderExample1() {
  class FakeProviderWithBasicEvents extends TraceHelpers.FakeFlameChartProvider {
    override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
      return PerfUI.FlameChart.FlameChartTimelineData.create({
        entryLevels: [0, 0, 0, 1, 1, 1, 2, 2, 2],
        entryStartTimes: [5, 60, 80, 5, 60, 80, 5, 60, 80],
        entryTotalTimes: [50, 10, 10, 50, 10, 10, 50, 10, 10],
        groups: [
          {
            name: 'Test Group' as Platform.UIString.LocalizedString,
            startLevel: 0,
            style: {
              height: 17,
              padding: 4,
              collapsible: true,
              color: 'black',
              backgroundColor: 'grey',
              nestingLevel: 0,
              itemsHeight: 17,
            },
          },
          {
            name: 'Test Group 2' as Platform.UIString.LocalizedString,
            startLevel: 1,
            style: {
              height: 17,
              padding: 4,
              collapsible: true,
              color: 'red',
              backgroundColor: 'green',
              nestingLevel: 0,
              itemsHeight: 17,
            },
          },
          {
            name: 'Test Group 3' as Platform.UIString.LocalizedString,
            startLevel: 2,
            style: {
              height: 17,
              padding: 4,
              collapsible: true,
              color: 'blue',
              backgroundColor: 'yellow',
              nestingLevel: 0,
              itemsHeight: 17,
            },
          },
        ],
      });
    }
  }

  const container = document.querySelector('div#container1');
  if (!container) {
    throw new Error('No container');
  }
  const delegate = new TraceHelpers.MockFlameChartDelegate();
  const dataProvider = new FakeProviderWithBasicEvents();
  const flameChart = new PerfUI.FlameChart.FlameChart(dataProvider, delegate);

  flameChart.markAsRoot();
  flameChart.setWindowTimes(0, 100);
  flameChart.show(container);
  flameChart.update();
}

/**
 * Render a flame chart with main thread long events to stripe and a warning triangle.
 **/
function renderExample2() {
  class FakeProviderWithLongTasksForStriping extends TraceHelpers.FakeFlameChartProvider {
    override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
      return PerfUI.FlameChart.FlameChartTimelineData.create({
        entryLevels: [1, 1, 2],
        entryStartTimes: [5, 80, 5],
        entryTotalTimes: [70, 10, 80],
        entryDecorations: [
          [
            {
              type: 'CANDY',
              startAtTime: TraceEngine.Types.Timing.MicroSeconds(50_000),
            },
            {type: 'WARNING_TRIANGLE'},
          ],
          [{type: 'WARNING_TRIANGLE'}],
          [
            {
              type: 'CANDY',
              startAtTime: TraceEngine.Types.Timing.MicroSeconds(50_000),
            },
          ],
        ],
        groups: [{
          name: 'Testing Candy Stripe decorations and warning triangles' as Platform.UIString.LocalizedString,
          startLevel: 0,
          style: {
            height: 17,
            padding: 4,
            collapsible: false,
            color: 'black',
            backgroundColor: 'grey',
            nestingLevel: 0,
            itemsHeight: 17,
          },
        }],
      });
    }
  }

  const container = document.querySelector('div#container2');
  if (!container) {
    throw new Error('No container');
  }
  const delegate = new TraceHelpers.MockFlameChartDelegate();
  const dataProvider = new FakeProviderWithLongTasksForStriping();
  const flameChart = new PerfUI.FlameChart.FlameChart(dataProvider, delegate);

  flameChart.markAsRoot();
  flameChart.setWindowTimes(0, 100);
  flameChart.show(container);
  flameChart.update();
}

/**
 * Render a flame chart with nested track.
 **/
function renderExample3() {
  class FakeProviderWithNestedGroup extends TraceHelpers.FakeFlameChartProvider {
    override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
      return PerfUI.FlameChart.FlameChartTimelineData.create({
        entryLevels: [0, 1, 2],
        entryStartTimes: [5, 5, 5],
        entryTotalTimes: [50, 50, 50],
        groups: [
          {
            name: 'Test Group' as Platform.UIString.LocalizedString,
            startLevel: 0,
            style: {
              height: 17,
              padding: 4,
              collapsible: true,
              color: 'black',
              backgroundColor: 'grey',
              nestingLevel: 0,
              itemsHeight: 17,
            },
          },
          {
            name: 'Test Nested Group' as Platform.UIString.LocalizedString,
            startLevel: 0,
            style: {
              height: 17,
              padding: 4,
              collapsible: true,
              color: 'red',
              backgroundColor: 'green',
              nestingLevel: 1,
              itemsHeight: 17,
            },
          },
          {
            name: 'Test Group 3' as Platform.UIString.LocalizedString,
            startLevel: 2,
            style: {
              height: 17,
              padding: 4,
              collapsible: true,
              color: 'blue',
              backgroundColor: 'yellow',
              nestingLevel: 0,
              itemsHeight: 17,
            },
          },
        ],
      });
    }
  }

  const container = document.querySelector('div#container3');
  if (!container) {
    throw new Error('No container');
  }
  const delegate = new TraceHelpers.MockFlameChartDelegate();
  const dataProvider = new FakeProviderWithNestedGroup();
  const flameChart = new PerfUI.FlameChart.FlameChart(dataProvider, delegate);

  flameChart.markAsRoot();
  flameChart.setWindowTimes(0, 100);
  flameChart.show(container);
  flameChart.update();
}

renderExample1();
renderExample2();
renderExample3();
