// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../core/platform/platform.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Extensions from '../../../../panels/timeline/extensions/extensions.js';
import * as EnvironmentHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as TraceHelpers from '../../../../testing/TraceHelpers.js';
import * as PerfUI from '../../../legacy/components/perf_ui/perf_ui.js';
import * as ComponentSetup from '../../helpers/helpers.js';

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
function renderBasicExample() {
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

  const container = document.querySelector('div#basic');
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
 * Render a flame chart with events with decorations.
 **/
function renderDecorationExample() {
  class FakeProviderWithDecorations extends TraceHelpers.FakeFlameChartProvider {
    override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
      return PerfUI.FlameChart.FlameChartTimelineData.create({
        entryLevels: [0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 2],
        entryStartTimes: [5, 55, 70, 5, 30, 55, 75, 5, 10, 15, 20, 25],
        entryTotalTimes: [45, 10, 20, 20, 20, 5, 15, 4, 4, 4, 4, 1],
        entryDecorations: [
          [
            {
              type: PerfUI.FlameChart.FlameChartDecorationType.CANDY,
              startAtTime: Trace.Types.Timing.MicroSeconds(25_000),
            },
            {type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE},
          ],
          [{type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE}],
          [
            {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
            {type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE},
          ],
          [
            {
              type: PerfUI.FlameChart.FlameChartDecorationType.CANDY,
              startAtTime: Trace.Types.Timing.MicroSeconds(15_000),
            },
          ],
          [
            {
              type: PerfUI.FlameChart.FlameChartDecorationType.CANDY,
              startAtTime: Trace.Types.Timing.MicroSeconds(10_000),
            },
            {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
          ],
          [
            {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
          ],
          [
            {
              type: PerfUI.FlameChart.FlameChartDecorationType.CANDY,
              startAtTime: Trace.Types.Timing.MicroSeconds(10_000),
            },
            {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
            {type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE},
          ],
          [
            {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
          ],
          [
            {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
            {type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE},
          ],
          [
            {
              type: PerfUI.FlameChart.FlameChartDecorationType.CANDY,
              startAtTime: Trace.Types.Timing.MicroSeconds(1_000),
            },
            {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
          ],
          [
            {
              type: PerfUI.FlameChart.FlameChartDecorationType.CANDY,
              startAtTime: Trace.Types.Timing.MicroSeconds(1_000),
            },
            {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
            {type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE},
          ],
          [
            {
              type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE,
              // This triangle should start 1/4 of hte event, and end at 3/4 of the event.
              customStartTime: Trace.Types.Timing.MicroSeconds(25_250),
              customEndTime: Trace.Types.Timing.MicroSeconds(25_750),
            },
          ],
        ],
        groups: [{
          name: 'Testing Candy Stripe, warning triangles and hidden descendants arrow decorations' as
              Platform.UIString.LocalizedString,
          startLevel: 0,
          style: defaultGroupStyle,
        }],
      });
    }
  }

  const container = document.querySelector('div#decorations');
  if (!container) {
    throw new Error('No container');
  }
  const delegate = new TraceHelpers.MockFlameChartDelegate();
  const dataProvider = new FakeProviderWithDecorations();
  const flameChart = new PerfUI.FlameChart.FlameChart(dataProvider, delegate);

  flameChart.markAsRoot();
  flameChart.setWindowTimes(0, 100);
  flameChart.show(container);
  flameChart.update();
}

/**
 * Render a flame chart with nested track.
 **/
function renderNestedExample() {
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

  const container = document.querySelector('div#nested');
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
function renderTrackCustomizationExample() {
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

  const container = document.querySelector('div#track-customization');
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

/**
 * Render a flame chart with event initiators of different sizes.
 * Some initiator and initiated events are hidden.
 **/
function renderInitiatorsExample() {
  class FakeProviderWithVariousTasksForInitiators extends TraceHelpers.FakeFlameChartProvider {
    override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
      return PerfUI.FlameChart.FlameChartTimelineData.create({
        entryLevels: [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 3],
        entryStartTimes: [5, 5, 5, 15, 15, 15, 40, 40, 40, 55.4, 55.4, 55.4, 80, 80, 80, 17],
        entryTotalTimes: [6, 6, 6, 5, 5, 20, 15, 15, 15, 2, 2, 2, 10, 10, 10, 10],
        entryDecorations: [
          [],
          [],
          [
            {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
          ],
          [],
          [],
          [],
          [],
          [],
          [
            {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
          ],
          [],
          [],
          [
            {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
          ],
          [
            {type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW},
          ],
        ],
        initiatorsData: [
          {initiatorIndex: 2, eventIndex: 3, isInitiatorHidden: true},
          {initiatorIndex: 1, eventIndex: 13},
          {initiatorIndex: 3, eventIndex: 6},
          {initiatorIndex: 3, eventIndex: 8, isEntryHidden: true},
          {initiatorIndex: 6, eventIndex: 11},
          {initiatorIndex: 11, eventIndex: 12, isInitiatorHidden: true, isEntryHidden: true},
          {initiatorIndex: 5, eventIndex: 15},
        ],
        groups: [{
          name: 'Testing initiators' as Platform.UIString.LocalizedString,
          startLevel: 0,
          style: defaultGroupStyle,
        }],
      });
    }

    override maxStackDepth(): number {
      return 4;
    }
  }

  const container = document.querySelector('div#initiators');
  if (!container) {
    throw new Error('No container');
  }
  const delegate = new TraceHelpers.MockFlameChartDelegate();
  const dataProvider = new FakeProviderWithVariousTasksForInitiators();
  const flameChart = new PerfUI.FlameChart.FlameChart(dataProvider, delegate);

  flameChart.markAsRoot();
  flameChart.setSelectedEntry(14);
  flameChart.setWindowTimes(0, 100);
  flameChart.show(container);
  flameChart.update();
}

/**
 * Used to test the color palette for extension events
 */
function renderExtensionTrackExample() {
  const colorPalette = Trace.Types.Extensions.extensionPalette;
  const paletteLength = colorPalette.length;

  class FakeProviderWithExtensionColors extends TraceHelpers.FakeFlameChartProvider {
    override entryColor(entryIndex: number): string {
      const color = colorPalette[entryIndex % paletteLength];
      return Extensions.ExtensionUI.extensionEntryColor(
          {args: {color}} as Trace.Types.Extensions.SyntheticExtensionEntry);
    }
    override maxStackDepth(): number {
      return paletteLength + 1;
    }
    override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
      return PerfUI.FlameChart.FlameChartTimelineData.create({
        entryLevels: colorPalette.map((_, i) => i),
        entryStartTimes: colorPalette.map(() => 0),
        entryTotalTimes: colorPalette.map(() => 100),
        groups: [{
          name: 'Testing extension palette' as Platform.UIString.LocalizedString,
          startLevel: 0,
          style: defaultGroupStyle,
        }],
      });
    }
  }
  const container = document.querySelector('div#extension');
  if (!container) {
    throw new Error('No container');
  }
  const delegate = new TraceHelpers.MockFlameChartDelegate();
  const dataProvider = new FakeProviderWithExtensionColors();
  const flameChart = new PerfUI.FlameChart.FlameChart(dataProvider, delegate);

  flameChart.markAsRoot();
  flameChart.setWindowTimes(0, 100);
  flameChart.show(container);
  flameChart.update();
}

renderBasicExample();
renderDecorationExample();
renderNestedExample();
renderTrackCustomizationExample();
renderInitiatorsExample();
renderExtensionTrackExample();
