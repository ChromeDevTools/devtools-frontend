// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../../../../../front_end/models/trace/trace.js';
import type * as Platform from '../../../../../../../front_end/core/platform/platform.js';
import type * as Common from '../../../../../../../front_end/core/common/common.js';
import {MockFlameChartDelegate, FakeFlameChartProvider} from '../../../../helpers/TraceHelpers.js';
import {renderElementIntoDOM} from '../../../../helpers/DOMHelpers.js';
import * as PerfUI from '../../../../../../../front_end/ui/legacy/components/perf_ui/perf_ui.js';
import {describeWithEnvironment} from '../../../../helpers/EnvironmentHelpers.js';
const {assert} = chai;

describeWithEnvironment('FlameChart', () => {
  it('sorts decorations, putting candy striping before warning triangles', async () => {
    const decorations: PerfUI.FlameChart.FlameChartDecoration[] = [
      {type: 'WARNING_TRIANGLE'},
      {type: 'CANDY', startAtTime: TraceEngine.Types.Timing.MicroSeconds(10)},
    ];
    PerfUI.FlameChart.sortDecorationsForRenderingOrder(decorations);
    assert.deepEqual(decorations, [
      {type: 'CANDY', startAtTime: TraceEngine.Types.Timing.MicroSeconds(10)},
      {type: 'WARNING_TRIANGLE'},
    ]);
  });

  let chartInstance: PerfUI.FlameChart.FlameChart|null = null;

  afterEach(() => {
    if (chartInstance) {
      chartInstance.detach();
    }
  });

  function renderChart(chart: PerfUI.FlameChart.FlameChart): void {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    chart.markAsRoot();
    chart.show(container);
    chart.update();
  }

  const defaultGroupStyle = {
    height: 17,
    padding: 4,
    collapsible: false,
    color: 'black',
    backgroundColor: 'grey',
    nestingLevel: 0,
    itemsHeight: 17,
  };

  class FakeProvider extends FakeFlameChartProvider {
    override entryColor(_entryIndex: number): string {
      return 'red';
    }

    override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
      return PerfUI.FlameChart.FlameChartTimelineData.create({
        entryLevels: [1, 1, 1],
        entryStartTimes: [5, 60, 80],
        entryTotalTimes: [50, 10, 10],
        groups: [{
          name: 'Test Group' as Platform.UIString.LocalizedString,
          startLevel: 1,
          style: defaultGroupStyle,
        }],
      });
    }
  }

  it('notifies the delegate when the window has changed', async () => {
    const provider = new FakeProvider();
    const delegate = new MockFlameChartDelegate();
    const windowChangedSpy = sinon.spy(delegate, 'windowChanged');
    chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
    renderChart(chartInstance);
    chartInstance.windowChanged(0, 5, false);
    assert.isTrue(windowChangedSpy.calledWith(0, 5, false));
  });

  it('notifies the delegate when the range selection has changed', async () => {
    const provider = new FakeProvider();
    const delegate = new MockFlameChartDelegate();
    const updateRangeSpy = sinon.spy(delegate, 'updateRangeSelection');
    chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
    renderChart(chartInstance);
    chartInstance.updateRangeSelection(0, 5);
    assert.isTrue(updateRangeSpy.calledWith(0, 5));
  });

  describe('setSelectedEntry', () => {
    class SetSelectedEntryTestProvider extends FakeFlameChartProvider {
      override entryColor(_entryIndex: number): string {
        return 'red';
      }

      override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
        return PerfUI.FlameChart.FlameChartTimelineData.create({
          entryLevels: [1, 1, 1, 1],
          entryStartTimes: [5, 60, 80, 300],
          entryTotalTimes: [50, 10, 10, 500],
          groups: [{
            name: 'Test Group' as Platform.UIString.LocalizedString,
            startLevel: 1,
            style: defaultGroupStyle,
          }],
        });
      }
    }

    it('does not change the time window if the selected entry is already revealed', async () => {
      const provider = new SetSelectedEntryTestProvider();
      const delegate = new MockFlameChartDelegate();
      const windowChangedSpy = sinon.spy(delegate, 'windowChanged');
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      // Make the window wide so lots is visible
      chartInstance.setSize(800, 400);
      chartInstance.setWindowTimes(0, 100);
      renderChart(chartInstance);
      // Pick the first event which is only 50ms long and therefore should be in view already.
      chartInstance.setSelectedEntry(0);
      assert.strictEqual(windowChangedSpy.callCount, 0);
    });

    it('will change the window time to reveal the selected entry when the entry is off the right of the screen',
       async () => {
         const provider = new SetSelectedEntryTestProvider();
         const delegate = new MockFlameChartDelegate();
         const windowChangedSpy = sinon.spy(delegate, 'windowChanged');
         chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
         // Make the width narrow so that not everything fits
         chartInstance.setSize(100, 400);
         // Ensure the event we want to select is out of the viewport by selecting the first 100ms.
         chartInstance.setWindowTimes(0, 100);
         renderChart(chartInstance);
         chartInstance.setSelectedEntry(3);
         assert.isTrue(windowChangedSpy.calledOnceWithExactly(300, 400, true));
       });

    it('will change the window time to reveal the selected entry when the entry is off the left of the screen',
       async () => {
         const provider = new SetSelectedEntryTestProvider();
         const delegate = new MockFlameChartDelegate();
         const windowChangedSpy = sinon.spy(delegate, 'windowChanged');
         chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
         // Make the width narrow so that not everything fits
         chartInstance.setSize(100, 400);
         // Ensure the event we want to select is out of the viewport by selecting the last 200ms
         chartInstance.setWindowTimes(250, 600);
         renderChart(chartInstance);
         chartInstance.setSelectedEntry(0);
         assert.isTrue(windowChangedSpy.calledOnceWithExactly(5, 355, true));
       });
  });

  describe('highlightEntry', () => {
    it('updates the chart to highlight the entry and dispatches an event', async () => {
      const provider = new FakeProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      renderChart(chartInstance);

      const highlightedEventListener = sinon.stub();
      chartInstance.addEventListener(PerfUI.FlameChart.Events.EntryHighlighted, highlightedEventListener);

      // Nothing highlighted, so the highlightElement should be hidden.
      assert.isTrue(chartInstance.highlightElement.classList.contains('hidden'));

      const entryIndexToHighlight = 2;
      chartInstance.highlightEntry(entryIndexToHighlight);

      // Ensure that the highlighted div is positioned. We cannot assert exact
      // pixels due to differences in screen sizes and resolution across
      // machines, but we can ensure that they have all been set.
      assert.isDefined(chartInstance.highlightElement.style.height);
      assert.isDefined(chartInstance.highlightElement.style.top);
      assert.isDefined(chartInstance.highlightElement.style.left);
      assert.isDefined(chartInstance.highlightElement.style.width);
      // And that it is not hidden.
      assert.isFalse(chartInstance.highlightElement.classList.contains('hidden'));

      // Ensure that the event listener was called with the right index
      assert.strictEqual(highlightedEventListener.callCount, 1);
      const event = highlightedEventListener.args[0][0] as Common.EventTarget.EventTargetEvent<number>;
      assert.strictEqual(event.data, entryIndexToHighlight);
    });

    it('does nothing if the entry is already highlighted', async () => {
      const provider = new FakeProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      renderChart(chartInstance);

      const highlightedEventListener = sinon.stub();
      chartInstance.addEventListener(PerfUI.FlameChart.Events.EntryHighlighted, highlightedEventListener);
      chartInstance.highlightEntry(2);
      chartInstance.highlightEntry(2);
      // Ensure that there is only one event listener called, despite the
      // highlightEntry method being called twice, because it was called with
      // the same ID.
      assert.strictEqual(highlightedEventListener.callCount, 1);
    });

    it('does nothing if the DataProvider entryColor() method returns a falsey value', async () => {
      class EmptyColorProvider extends FakeProvider {
        override entryColor(): string {
          return '';
        }
      }
      const provider = new EmptyColorProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      renderChart(chartInstance);

      const highlightedEventListener = sinon.stub();
      chartInstance.addEventListener(PerfUI.FlameChart.Events.EntryHighlighted, highlightedEventListener);
      chartInstance.highlightEntry(2);
      // No calls because entryColor returned a false value.
      assert.strictEqual(highlightedEventListener.callCount, 0);
    });

    it('dispatches the highlight event with an ID of -1 when the highlight is hidden', async () => {
      const provider = new FakeProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      renderChart(chartInstance);

      const highlightedEventListener = sinon.stub();
      chartInstance.addEventListener(PerfUI.FlameChart.Events.EntryHighlighted, highlightedEventListener);
      chartInstance.highlightEntry(2);
      chartInstance.hideHighlight();
      // Ensure the argument to the last event listener call was -1
      const event = highlightedEventListener.args[1][0] as Common.EventTarget.EventTargetEvent<number>;
      assert.strictEqual(event.data, -1);
    });
  });

  describe('updateLevelPositions', () => {
    class UpdateLevelPositionsTestProvider extends FakeFlameChartProvider {
      override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
        return PerfUI.FlameChart.FlameChartTimelineData.create({
          entryLevels: [0, 1, 2],
          entryStartTimes: [5, 60, 80],
          entryTotalTimes: [50, 10, 10],
          groups: [
            {
              name: 'Test Group 0' as Platform.UIString.LocalizedString,
              startLevel: 0,
              style: defaultGroupStyle,
            },
            {
              name: 'Test Group 1' as Platform.UIString.LocalizedString,
              startLevel: 1,
              style: defaultGroupStyle,
            },
            {
              name: 'Test Group 2' as Platform.UIString.LocalizedString,
              startLevel: 2,
              style: {...defaultGroupStyle, collapsible: true, nestingLevel: 1},
            },
          ],
        });
      }
    }

    it('Calculate the level position correctly', () => {
      const provider = new UpdateLevelPositionsTestProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      renderChart(chartInstance);

      // For Group 0, it is expanded (not collapsible),
      // so its offset is 17(RulerHeight + 2)
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(0), 17);
      // For Level 0, it is in Test Group 1, and the group is expanded (not collapsible),
      // so its offset is 17(Group offset) + 17(group header height) = 34
      assert.isTrue(chartInstance.levelVisibilityForTest(0));
      assert.strictEqual(chartInstance.levelToOffset(0), 34);
      // For Group 1, its offset is
      // 34(level 0 offset) + 17(level 0 height) + 4(style.padding) = 55
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(1), 55);
      // For Level 1, it is in Group 1, and the group is expanded by default,
      // so its offset is 55(Group offset) + 17(group header height) = 72
      assert.isTrue(chartInstance.levelVisibilityForTest(1));
      assert.strictEqual(chartInstance.levelToOffset(1), 72);
      // For Group 2, it is nested in Group 1, so its offset is
      // 72(level 1 offset) + 17(level 1 is visible) + 0(no style.padding because nested) = 89
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(2), 89);
      // For Level 2, it is in Group 2, and the group is not expanded by default (collapsible),
      // so its offset is 89(Group offset) + 17(group header) = 106
      assert.isFalse(chartInstance.levelVisibilityForTest(2));
      assert.strictEqual(chartInstance.levelToOffset(2), 106);
      // For Group 3 and Level 3, they are "fake" group and level, and are used to show then end of the flame chart.
      // Since Level 2 is invisible (collapsed), so this one has same offset as Level 2.
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(3), 106);
      assert.strictEqual(chartInstance.levelToOffset(3), 106);
    });

    it('Calculate the level position correctly after hide and unhide a group without nested group', () => {
      const provider = new UpdateLevelPositionsTestProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      renderChart(chartInstance);

      chartInstance.hideGroup(/* groupIndex= */ 0);
      // For Group 0, it is hidden, so its offset is 17(RulerHeight + 2)
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(0), 17);
      // For Level 0, it is in Test Group 1, and the group is hidden,
      // so its offset is same as group offset
      assert.isFalse(chartInstance.levelVisibilityForTest(0));
      assert.strictEqual(chartInstance.levelToOffset(0), 17);
      // For Group 1, its offset is
      // 17(level 0 offset) + 0(level 0 is hidden) + 4(style.padding) = 21
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(1), 21);
      // For Level 1, it is in Group 1, and the group is expanded by default,
      // so its offset is 21(Group offset) + 17(group header height) = 38
      assert.isTrue(chartInstance.levelVisibilityForTest(1));
      assert.strictEqual(chartInstance.levelToOffset(1), 38);
      // For Group 2, it is nested in Group 1, so its offset is
      // 38(level 1 offset) + 17(level 1 is visible) + 0(no style.padding because nested) = 55
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(2), 55);
      // For Level 2, it is in Group 2, and the group is not expanded by default (collapsible),
      // so its offset is 55(Group offset) + 17(group header) = 72
      assert.isTrue(chartInstance.levelVisibilityForTest(1));
      assert.strictEqual(chartInstance.levelToOffset(2), 72);
      // For Group 3 and Level 3, they are "fake" group and level, and are used to show then end of the flame chart.
      // Since Level 2 is invisible (collapsed), so this one has same offset as Level 2.
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(3), 72);
      assert.strictEqual(chartInstance.levelToOffset(3), 72);

      // Unhide Group 0, so the offset should be same as default (see test "Calculate the level position correctly").
      chartInstance.showGroup(/* groupIndex= */ 0);
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(0), 17);
      assert.isTrue(chartInstance.levelVisibilityForTest(0));
      assert.strictEqual(chartInstance.levelToOffset(0), 34);
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(1), 55);
      assert.isTrue(chartInstance.levelVisibilityForTest(1));
      assert.strictEqual(chartInstance.levelToOffset(1), 72);
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(2), 89);
      assert.isFalse(chartInstance.levelVisibilityForTest(2));
      assert.strictEqual(chartInstance.levelToOffset(2), 106);
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(3), 106);
      assert.strictEqual(chartInstance.levelToOffset(3), 106);
    });

    describe('hide/unhide nested group', () => {
      class UpdateLevelPositionsWithNestedGroupTestProvider extends FakeFlameChartProvider {
        override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
          return PerfUI.FlameChart.FlameChartTimelineData.create({
            entryLevels: [0, 1, 2],
            entryStartTimes: [5, 60, 80],
            entryTotalTimes: [50, 10, 10],
            groups: [
              {
                name: 'Test Group 0' as Platform.UIString.LocalizedString,
                startLevel: 0,
                style: defaultGroupStyle,
              },
              {
                name: 'Test Group 1' as Platform.UIString.LocalizedString,
                startLevel: 1,
                style: defaultGroupStyle,
              },
              // Make the nested group always expanded for better testing the nested case
              {
                name: 'Test Group 2' as Platform.UIString.LocalizedString,
                startLevel: 2,
                style: {...defaultGroupStyle, nestingLevel: 1},
              },
            ],
          });
        }
      }

      it('Calculate the level position correctly after hide and unhide a group with nested group', () => {
        const provider = new UpdateLevelPositionsWithNestedGroupTestProvider();
        const delegate = new MockFlameChartDelegate();
        chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
        renderChart(chartInstance);

        chartInstance.hideGroup(/* groupIndex= */ 1);
        // For Group 0, it is expanded (not collapsible),
        // so its offset is 17(RulerHeight + 2)
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(0), 17);
        // For Level 0, it is in Test Group 1, and the group is expanded (not collapsible),
        // so its offset is 17(Group offset) + 17(group header height) = 34
        assert.isTrue(chartInstance.levelVisibilityForTest(0));
        assert.strictEqual(chartInstance.levelToOffset(0), 34);
        // For Group 1, it is hidden, so its offset is
        // 34(level 0 offset) + 17(level 0 height) = 51
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(1), 51);
        // For Level 1, it is in Group 1, and the group is hidden,
        // so its offset is 51(Group offset)
        assert.isFalse(chartInstance.levelVisibilityForTest(1));
        assert.strictEqual(chartInstance.levelToOffset(1), 51);
        // For Group 2, it is nested in Group 1, so it is also hidden, so its offset is
        // 51(level 1 offset) + 0(level 1 is invisible) = 51
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(2), 51);
        // For Level 2, it is in Group 2, and the group is hidden,
        // so its offset is 51(Group offset)
        assert.isFalse(chartInstance.levelVisibilityForTest(2));
        assert.strictEqual(chartInstance.levelToOffset(2), 51);
        // For Group 3 and Level 3, they are "fake" group and level, and are used to show then end of the flame chart.
        // Since Level 2 is invisible (hidden), so this one has same offset as Level 2.
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(3), 51);
        assert.strictEqual(chartInstance.levelToOffset(3), 51);

        // Unhide Group 1, so the offset should be same as default (see test "Calculate the level position correctly").
        chartInstance.showGroup(/* groupIndex= */ 1);
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(0), 17);
        assert.isTrue(chartInstance.levelVisibilityForTest(0));
        assert.strictEqual(chartInstance.levelToOffset(0), 34);
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(1), 55);
        assert.isTrue(chartInstance.levelVisibilityForTest(1));
        assert.strictEqual(chartInstance.levelToOffset(1), 72);
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(2), 89);
        // Slightly different because Group2 is not longer collapsible.
        // For Level 2, it is in Group 2, and the group is expanded,
        // so its offset is 89(Group offset) + 17(group header) = 106
        assert.isTrue(chartInstance.levelVisibilityForTest(2));
        assert.strictEqual(chartInstance.levelToOffset(2), 106);
        // For Group 3 and Level 3, they are "fake" group and level, and are used to show then end of the flame chart.
        // Since Level 2 is visible, so its offset is 106(Group offset) + 17(Level 2 height) = 123
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(3), 123);
        assert.strictEqual(chartInstance.levelToOffset(3), 123);
      });

      it('Calculate the level position correctly after hide and unhide a nested group', () => {
        const provider = new UpdateLevelPositionsWithNestedGroupTestProvider();
        const delegate = new MockFlameChartDelegate();
        chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
        renderChart(chartInstance);

        chartInstance.hideGroup(/* groupIndex= */ 2);
        // For Group 0, it is expanded (not collapsible),
        // so its offset is 17(RulerHeight + 2)
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(0), 17);
        // For Level 0, it is in Test Group 1, and the group is expanded (not collapsible),
        // so its offset is 17(Group offset) + 17(group header height) = 34
        assert.isTrue(chartInstance.levelVisibilityForTest(0));
        assert.strictEqual(chartInstance.levelToOffset(0), 34);
        // For Group 1, it is hidden, so its offset is
        // 34(level 0 offset) + 17(level 0 height) + 4(style.padding) = 55
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(1), 55);
        // For Level 1, it is in Group 1, and the group is expanded by default,
        // so its offset is 55(Group offset) + 17(group header height) = 72
        assert.isTrue(chartInstance.levelVisibilityForTest(1));
        assert.strictEqual(chartInstance.levelToOffset(1), 72);
        // For Group 2, it is nested in Group 1, and it is set to hidden, so its offset is
        // 72(level 1 offset) + 17(level 1 is visible) = 89
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(2), 89);
        // For Level 2, it is in Group 2, and the group is hidden,
        // so its offset is 51(Group offset)
        assert.isFalse(chartInstance.levelVisibilityForTest(2));
        assert.strictEqual(chartInstance.levelToOffset(2), 89);
        // For Group 3 and Level 3, they are "fake" group and level, and are used to show then end of the flame chart.
        // Since Level 2 is invisible (hidden), so this one has same offset as Level 2.
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(3), 89);
        assert.strictEqual(chartInstance.levelToOffset(3), 89);

        // Unhide Group 1, so the offset should be same as default (see test "Calculate the level position correctly").
        chartInstance.showGroup(/* groupIndex= */ 2);
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(0), 17);
        assert.isTrue(chartInstance.levelVisibilityForTest(0));
        assert.strictEqual(chartInstance.levelToOffset(0), 34);
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(1), 55);
        assert.isTrue(chartInstance.levelVisibilityForTest(1));
        assert.strictEqual(chartInstance.levelToOffset(1), 72);
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(2), 89);
        // Slightly different because Group2 is not longer collapsible.
        // For Level 2, it is in Group 2, and the group is expanded,
        // so its offset is 89(Group offset) + 17(group header) = 106
        assert.isTrue(chartInstance.levelVisibilityForTest(2));
        assert.strictEqual(chartInstance.levelToOffset(2), 106);
        // For Group 3 and Level 3, they are "fake" group and level, and are used to show then end of the flame chart.
        // Since Level 2 is visible, so its offset is 106(Group offset) + 17(Level 2 height) = 123
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(3), 123);
        assert.strictEqual(chartInstance.levelToOffset(3), 123);
      });
    });
  });

  describe('entryIndexToCoordinates', () => {
    class SetSelectedEntryTestProvider extends FakeFlameChartProvider {
      override entryColor(_entryIndex: number): string {
        return 'red';
      }

      override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
        return PerfUI.FlameChart.FlameChartTimelineData.create({
          entryLevels: [1, 1, 1, 1],
          entryStartTimes: [5, 60, 80, 300],
          entryTotalTimes: [50, 10, 10, 500],
          groups: [{
            name: 'Test Group' as Platform.UIString.LocalizedString,
            startLevel: 1,
            style: defaultGroupStyle,
          }],
        });
      }
    }

    it('returns the correct coordinates for a given entry', async () => {
      const provider = new SetSelectedEntryTestProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      // Make the width narrow so that not everything fits
      chartInstance.setSize(100, 400);
      chartInstance.setWindowTimes(0, 100);
      renderChart(chartInstance);
      const timelineData = chartInstance.timelineData();
      if (!timelineData) {
        throw new Error('Could not find timeline data');
      }
      const entryIndex = 0;
      const {x: canvasOffsetX, y: canvasOffsetY} = chartInstance.getCanvasOffset();
      // TODO(crbug.com/1440169): We can get all the expected values from
      // the chart's data and avoid magic numbers
      const initialXPosition = chartInstance.computePosition(timelineData.entryStartTimes[entryIndex]);
      assert.deepEqual(
          chartInstance.entryIndexToCoordinates(entryIndex),
          {x: initialXPosition + canvasOffsetX, y: 51 + canvasOffsetY + chartInstance.getScrollOffset()});

      // Emulate two scrolls to force a change in coordinates.
      chartInstance.setSelectedEntry(3);
      assert.deepEqual(
          chartInstance.entryIndexToCoordinates(entryIndex),
          {x: initialXPosition + canvasOffsetX, y: -85 + canvasOffsetY + chartInstance.getScrollOffset()});
      chartInstance.setWindowTimes(250, 600);
      const finalXPosition = chartInstance.computePosition(timelineData.entryStartTimes[entryIndex]);
      assert.deepEqual(
          chartInstance.entryIndexToCoordinates(entryIndex),
          {x: finalXPosition + canvasOffsetX, y: -85 + canvasOffsetY + chartInstance.getScrollOffset()});
    });
  });
});
