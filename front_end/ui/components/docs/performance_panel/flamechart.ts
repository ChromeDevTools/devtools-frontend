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

const defaultGroupStyle = {
  height: 17,
  padding: 4,
  collapsible: false,
  color: 'black',
  backgroundColor: 'grey',
  nestingLevel: 0,
  itemsHeight: 17,
};

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
            name: 'Test Group 0' as Platform.UIString.LocalizedString,
            startLevel: 0,
            style: {...defaultGroupStyle, collapsible: true},
          },
          {
            name: 'Test Group 1' as Platform.UIString.LocalizedString,
            startLevel: 1,
            style: {...defaultGroupStyle, collapsible: true, color: 'red', backgroundColor: 'green'},
          },
          {
            name: 'Test Group 2' as Platform.UIString.LocalizedString,
            startLevel: 2,
            style: {...defaultGroupStyle, collapsible: true, color: 'blue', backgroundColor: 'yellow'},
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
          style: defaultGroupStyle,
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
            name: 'Test Group 0' as Platform.UIString.LocalizedString,
            startLevel: 0,
            style: {...defaultGroupStyle, collapsible: true},
          },
          {
            name: 'Test Nested Group 1' as Platform.UIString.LocalizedString,
            startLevel: 0,
            style: {...defaultGroupStyle, collapsible: true, color: 'red', backgroundColor: 'green'},
          },
          {
            name: 'Test Group 2' as Platform.UIString.LocalizedString,
            startLevel: 2,
            style: {...defaultGroupStyle, collapsible: true, color: 'blue', backgroundColor: 'yellow'},
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

/**
 * Render a flame chart with nested case and buttons to hide/unhide and reorder
 * tracks
 **/
function renderExample4() {
  class FakeProviderWithBasicEvents extends TraceHelpers.FakeFlameChartProvider {
    override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
      return PerfUI.FlameChart.FlameChartTimelineData.create({
        entryLevels: [0, 0, 1, 1, 2, 2, 3, 3],
        entryStartTimes: [5, 60, 5, 60, 5, 60],
        entryTotalTimes: [50, 10, 50, 10, 50, 10],
        groups: [
          {
            name: 'Test Group 0' as Platform.UIString.LocalizedString,
            startLevel: 0,
            expanded: true,
            style: {...defaultGroupStyle, collapsible: true},
          },
          {
            name: 'Test Group 1' as Platform.UIString.LocalizedString,
            startLevel: 1,
            expanded: true,
            style: {...defaultGroupStyle, collapsible: true, color: 'red', backgroundColor: 'green'},
          },
          {
            name: 'Test Group 2' as Platform.UIString.LocalizedString,
            startLevel: 2,
            expanded: true,
            style: {...defaultGroupStyle, collapsible: true, color: 'blue', backgroundColor: 'yellow'},
          },
          {
            name: 'Test Group 3' as Platform.UIString.LocalizedString,
            startLevel: 2,
            expanded: true,
            style: {...defaultGroupStyle, nestingLevel: 1},
          },
        ],
      });
    }
  }

  const container = document.querySelector('div#container4');
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

  const indexInput = document.querySelector('#indexOfTrack') as HTMLInputElement;
  const buttonHide = document.querySelector('#hide');
  buttonHide?.addEventListener('click', () => {
    const index = Number(indexInput.value);
    flameChart.hideGroup(index);
  });
  const buttonUnhide = document.querySelector('#unhide');
  buttonUnhide?.addEventListener('click', () => {
    const index = Number(indexInput.value);
    flameChart.showGroup(index);
  });

  const buttonForMoveUp = document.querySelector('#testForMoveUp');
  buttonForMoveUp?.addEventListener('click', () => {
    const index = Number(indexInput.value);
    flameChart.moveGroupUp(index);
  });
  const buttonForMoveDown = document.querySelector('#testForMoveDown');
  buttonForMoveDown?.addEventListener('click', () => {
    const index = Number(indexInput.value);
    flameChart.moveGroupDown(index);
  });
}

renderExample1();
renderExample2();
renderExample3();
renderExample4();
