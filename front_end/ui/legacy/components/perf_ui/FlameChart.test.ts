// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../../core/common/common.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as Trace from '../../../../models/trace/trace.js';
import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {
  FakeFlameChartProvider,
  MockFlameChartDelegate,
} from '../../../../testing/TraceHelpers.js';

import * as PerfUI from './perf_ui.js';

describeWithEnvironment('FlameChart', () => {
  it('sorts decorations, putting candy striping before warning triangles', async () => {
    const decorations: PerfUI.FlameChart.FlameChartDecoration[] = [
      {type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE},
      {type: PerfUI.FlameChart.FlameChartDecorationType.CANDY, startAtTime: Trace.Types.Timing.MicroSeconds(10)},
    ];
    PerfUI.FlameChart.sortDecorationsForRenderingOrder(decorations);
    assert.deepEqual(decorations, [
      {type: PerfUI.FlameChart.FlameChartDecorationType.CANDY, startAtTime: Trace.Types.Timing.MicroSeconds(10)},
      {type: PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE},
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
      chartInstance.addEventListener(PerfUI.FlameChart.Events.ENTRY_HOVERED, highlightedEventListener);

      // Nothing highlighted, so the highlightElement should be hidden.
      assert.isTrue(chartInstance.highlightElement.classList.contains('hidden'));

      const entryIndexToHighlight = 2;
      chartInstance.highlightEntry(entryIndexToHighlight);

      // Ensure that the highlighted div is positioned. We cannot assert exact
      // pixels due to differences in screen sizes and resolution across
      // machines, but we can ensure that they have all been set.
      assert.exists(chartInstance.highlightElement.style.height);
      assert.exists(chartInstance.highlightElement.style.top);
      assert.exists(chartInstance.highlightElement.style.left);
      assert.exists(chartInstance.highlightElement.style.width);
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
      chartInstance.addEventListener(PerfUI.FlameChart.Events.ENTRY_HOVERED, highlightedEventListener);
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
      chartInstance.addEventListener(PerfUI.FlameChart.Events.ENTRY_HOVERED, highlightedEventListener);
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
      chartInstance.addEventListener(PerfUI.FlameChart.Events.ENTRY_HOVERED, highlightedEventListener);
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
      assert.isTrue(chartInstance.levelIsVisible(0));
      assert.strictEqual(chartInstance.levelToOffset(0), 34);
      // For Group 1, its offset is
      // 34(level 0 offset) + 17(level 0 height) + 4(style.padding) = 55
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(1), 55);
      // For Level 1, it is in Group 1, and the group is expanded by default,
      // so its offset is 55(Group offset) + 17(group header height) = 72
      assert.isTrue(chartInstance.levelIsVisible(1));
      assert.strictEqual(chartInstance.levelToOffset(1), 72);
      // For Group 2, it is nested in Group 1, so its offset is
      // 72(level 1 offset) + 17(level 1 is visible) + 0(no style.padding because nested) = 89
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(2), 89);
      // For Level 2, it is in Group 2, and the group is not expanded by default (collapsible),
      // so its offset is 89(Group offset) + 17(group header) = 106
      assert.isFalse(chartInstance.levelIsVisible(2));
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
      assert.isFalse(chartInstance.levelIsVisible(0));
      assert.strictEqual(chartInstance.levelToOffset(0), 17);
      // For Group 1, its offset is
      // 17(level 0 offset) + 0(level 0 is hidden) + 4(style.padding) = 21
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(1), 21);
      // For Level 1, it is in Group 1, and the group is expanded by default,
      // so its offset is 21(Group offset) + 17(group header height) = 38
      assert.isTrue(chartInstance.levelIsVisible(1));
      assert.strictEqual(chartInstance.levelToOffset(1), 38);
      // For Group 2, it is nested in Group 1, so its offset is
      // 38(level 1 offset) + 17(level 1 is visible) + 0(no style.padding because nested) = 55
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(2), 55);
      // For Level 2, it is in Group 2, and the group is not expanded by default (collapsible),
      // so its offset is 55(Group offset) + 17(group header) = 72
      assert.isTrue(chartInstance.levelIsVisible(1));
      assert.strictEqual(chartInstance.levelToOffset(2), 72);
      // For Group 3 and Level 3, they are "fake" group and level, and are used to show then end of the flame chart.
      // Since Level 2 is invisible (collapsed), so this one has same offset as Level 2.
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(3), 72);
      assert.strictEqual(chartInstance.levelToOffset(3), 72);

      // Unhide Group 0, so the offset should be same as default (see test "Calculate the level position correctly").
      chartInstance.showGroup(/* groupIndex= */ 0);
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(0), 17);
      assert.isTrue(chartInstance.levelIsVisible(0));
      assert.strictEqual(chartInstance.levelToOffset(0), 34);
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(1), 55);
      assert.isTrue(chartInstance.levelIsVisible(1));
      assert.strictEqual(chartInstance.levelToOffset(1), 72);
      assert.strictEqual(chartInstance.groupIndexToOffsetForTest(2), 89);
      assert.isFalse(chartInstance.levelIsVisible(2));
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
        assert.isTrue(chartInstance.levelIsVisible(0));
        assert.strictEqual(chartInstance.levelToOffset(0), 34);
        // For Group 1, it is hidden, so its offset is
        // 34(level 0 offset) + 17(level 0 height) = 51
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(1), 51);
        // For Level 1, it is in Group 1, and the group is hidden,
        // so its offset is 51(Group offset)
        assert.isFalse(chartInstance.levelIsVisible(1));
        assert.strictEqual(chartInstance.levelToOffset(1), 51);
        // For Group 2, it is nested in Group 1, so it is also hidden, so its offset is
        // 51(level 1 offset) + 0(level 1 is invisible) = 51
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(2), 51);
        // For Level 2, it is in Group 2, and the group is hidden,
        // so its offset is 51(Group offset)
        assert.isFalse(chartInstance.levelIsVisible(2));
        assert.strictEqual(chartInstance.levelToOffset(2), 51);
        // For Group 3 and Level 3, they are "fake" group and level, and are used to show then end of the flame chart.
        // Since Level 2 is invisible (hidden), so this one has same offset as Level 2.
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(3), 51);
        assert.strictEqual(chartInstance.levelToOffset(3), 51);

        // Unhide Group 1, so the offset should be same as default (see test "Calculate the level position correctly").
        chartInstance.showGroup(/* groupIndex= */ 1);
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(0), 17);
        assert.isTrue(chartInstance.levelIsVisible(0));
        assert.strictEqual(chartInstance.levelToOffset(0), 34);
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(1), 55);
        assert.isTrue(chartInstance.levelIsVisible(1));
        assert.strictEqual(chartInstance.levelToOffset(1), 72);
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(2), 89);
        // Slightly different because Group2 is not longer collapsible.
        // For Level 2, it is in Group 2, and the group is expanded,
        // so its offset is 89(Group offset) + 17(group header) = 106
        assert.isTrue(chartInstance.levelIsVisible(2));
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
        assert.isTrue(chartInstance.levelIsVisible(0));
        assert.strictEqual(chartInstance.levelToOffset(0), 34);
        // For Group 1, it is hidden, so its offset is
        // 34(level 0 offset) + 17(level 0 height) + 4(style.padding) = 55
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(1), 55);
        // For Level 1, it is in Group 1, and the group is expanded by default,
        // so its offset is 55(Group offset) + 17(group header height) = 72
        assert.isTrue(chartInstance.levelIsVisible(1));
        assert.strictEqual(chartInstance.levelToOffset(1), 72);
        // For Group 2, it is nested in Group 1, and it is set to hidden, so its offset is
        // 72(level 1 offset) + 17(level 1 is visible) = 89
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(2), 89);
        // For Level 2, it is in Group 2, and the group is hidden,
        // so its offset is 51(Group offset)
        assert.isFalse(chartInstance.levelIsVisible(2));
        assert.strictEqual(chartInstance.levelToOffset(2), 89);
        // For Group 3 and Level 3, they are "fake" group and level, and are used to show then end of the flame chart.
        // Since Level 2 is invisible (hidden), so this one has same offset as Level 2.
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(3), 89);
        assert.strictEqual(chartInstance.levelToOffset(3), 89);

        // Unhide Group 1, so the offset should be same as default (see test "Calculate the level position correctly").
        chartInstance.showGroup(/* groupIndex= */ 2);
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(0), 17);
        assert.isTrue(chartInstance.levelIsVisible(0));
        assert.strictEqual(chartInstance.levelToOffset(0), 34);
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(1), 55);
        assert.isTrue(chartInstance.levelIsVisible(1));
        assert.strictEqual(chartInstance.levelToOffset(1), 72);
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(2), 89);
        // Slightly different because Group2 is not longer collapsible.
        // For Level 2, it is in Group 2, and the group is expanded,
        // so its offset is 89(Group offset) + 17(group header) = 106
        assert.isTrue(chartInstance.levelIsVisible(2));
        assert.strictEqual(chartInstance.levelToOffset(2), 106);
        // For Group 3 and Level 3, they are "fake" group and level, and are used to show then end of the flame chart.
        // Since Level 2 is visible, so its offset is 106(Group offset) + 17(Level 2 height) = 123
        assert.strictEqual(chartInstance.groupIndexToOffsetForTest(3), 123);
        assert.strictEqual(chartInstance.levelToOffset(3), 123);
      });
    });
  });

  describe('Index to/from coordinates coversion', () => {
    class IndexAndCoordinatesConversionTestProvider extends FakeFlameChartProvider {
      override entryColor(_entryIndex: number): string {
        return 'red';
      }

      override maxStackDepth(): number {
        return 2;
      }

      override timelineData(): PerfUI.FlameChart.FlameChartTimelineData|null {
        return PerfUI.FlameChart.FlameChartTimelineData.create({
          entryLevels: [0, 0, 1, 1],
          entryStartTimes: [5, 60, 80, 300],
          entryTotalTimes: [50, 10, 10, 500],
          groups: [
            {
              name: 'Test Group' as Platform.UIString.LocalizedString,
              startLevel: 0,
              style: defaultGroupStyle,
            },
            {
              name: 'Test Group 1' as Platform.UIString.LocalizedString,
              startLevel: 1,
              style: defaultGroupStyle,
            },
          ],
        });
      }
    }

    describe('entryIndexToCoordinates', () => {
      it('returns the correct coordinates for a given entry', () => {
        const provider = new IndexAndCoordinatesConversionTestProvider();
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
            // For index 0, it is in level 0, so vertically there are only the ruler(17) and the
            // header of Group 0 (17) and beyond it.
            {x: initialXPosition + canvasOffsetX, y: 34 + canvasOffsetY + chartInstance.getScrollOffset()});

        // Emulate two scrolls to force a change in coordinates.
        // For index 3, it is in level 1, so vertically there are the ruler(17) and the header of Group 0 (17), the
        // level 0 (17), the padding of Group 1 (4) and the header of Group 1 (17) beyond it.
        // When select it, it will scroll the level offset(17 + 17 + 17 + 4 + 17 = 72) and its height(17), which means
        // |chartInstance.getScrollOffset()| returns 89.
        chartInstance.setSelectedEntry(3);
        assert.deepEqual(
            chartInstance.entryIndexToCoordinates(entryIndex),
            // For index 0, so we need to minus the scroll offset(68) and |chartInstance.getScrollOffset()|, so it is
            // 34 - 89 - 89 = -144.
            {x: initialXPosition + canvasOffsetX, y: -144 + canvasOffsetY + chartInstance.getScrollOffset()});
        chartInstance.setWindowTimes(250, 600);
        const finalXPosition = chartInstance.computePosition(timelineData.entryStartTimes[entryIndex]);
        // For this case, there is no vertical scroll, so it is still -144.
        assert.deepEqual(
            chartInstance.entryIndexToCoordinates(entryIndex),
            {x: finalXPosition + canvasOffsetX, y: -144 + canvasOffsetY + chartInstance.getScrollOffset()});
      });

      it('returns the correct coordinates after re-order', () => {
        const provider = new IndexAndCoordinatesConversionTestProvider();
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
            // For index 0, it is in level 0, so vertically there are only the ruler(17) and the
            // header of Group 0 (17) and beyond it.
            {x: initialXPosition + canvasOffsetX, y: 34 + canvasOffsetY + chartInstance.getScrollOffset()});

        chartInstance.moveGroupDown(0);
        assert.deepEqual(
            chartInstance.entryIndexToCoordinates(entryIndex),
            // Move Group 0 down. So for index 0, it is in level 1, so vertically there are the ruler(17), the header of
            // Group 1 (17), level 1(inside Group 1, 17), padding of Group 0(4), and header of Group 0 (17)beyond it.
            {x: initialXPosition + canvasOffsetX, y: 72 + canvasOffsetY + chartInstance.getScrollOffset()});
      });
    });

    describe('coordinatesToEntryIndex', () => {
      it('returns the correct entry index for given coordinates', () => {
        const provider = new IndexAndCoordinatesConversionTestProvider();
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
        const startXPosition = chartInstance.computePosition(timelineData.entryStartTimes[0]);
        const beforeStartXPosition = chartInstance.computePosition(timelineData.entryStartTimes[0] - 1);
        const endXPosition =
            chartInstance.computePosition(timelineData.entryStartTimes[0] + timelineData.entryTotalTimes[0]);
        const afterEndXPosition =
            chartInstance.computePosition(timelineData.entryStartTimes[0] + timelineData.entryTotalTimes[0] + 1);

        // For index 0, it is in level 0, so vertically there are only the ruler(17) and the
        // header of Group 0 (17) and beyond it.
        // And the height of level 0 is 17.
        // So the index 0 can be mapped from
        //   x: around startXPosition to endXPosition, the reason is x is related to zoom ratio and has some rounds
        //      during calculation.
        //   y: 34(inclusive) to 51(exclusive)
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(beforeStartXPosition + 1, 34), -1);
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(startXPosition, 34), 0);
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(endXPosition, 34), 0);
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(afterEndXPosition + 3, 34), -1);
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(startXPosition, 33), -1);
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(startXPosition, 34), 0);
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(startXPosition, 50), 0);
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(startXPosition, 51), -1);
      });

      it('returns the correct entry index for given coordinates after re-order', () => {
        const provider = new IndexAndCoordinatesConversionTestProvider();
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
        const startXPosition = chartInstance.computePosition(timelineData.entryStartTimes[0]);

        chartInstance.moveGroupDown(0);
        // Ro-order group will only affect the vertical offsets, so we just need to test |y|.
        // Move Group 0 down. So for index 0, it is in level 1, so vertically there are the ruler(17), the header of
        // Group 1 (17), level 1(inside Group 1, 17), padding of Group 0(4), and header of Group 0 (17)beyond it.
        // And the height of level 0 is 17.
        // So the entry 0 can be mapped from
        //   y: 72(inclusive) to 89(exclusive)
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(startXPosition, 71), -1);
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(startXPosition, 72), 0);
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(startXPosition, 88), 0);
        assert.strictEqual(chartInstance.coordinatesToEntryIndex(startXPosition, 89), -1);
      });
    });

    describe('coordinatesToGroupIndexAndHoverType', () => {
      it('returns the correct group index for given coordinates', () => {
        const provider = new IndexAndCoordinatesConversionTestProvider();
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

        // For group 0, vertically there are only the ruler(17) beyond it. So it starts from 17.
        // For group 1, vertically there are only the ruler(17), header of Group 0 (17), level 0(17), padding of
        // Group 1(4) and header beyond it. So it starts from 55.
        // So the group 0 can be mapped from
        //   x: any inside the view
        //   y: 17(inclusive) to 55(exclusive)
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_BUTTON_SIZE */ 22, 16),
            {groupIndex: -1, hoverType: PerfUI.FlameChart.HoverType.OUTSIDE_TRACKS});
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_BUTTON_SIZE */ 22, 17),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK_HEADER});
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_BUTTON_SIZE */ 22, 50),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK});
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_BUTTON_SIZE */ 22, 55),
            {groupIndex: 1, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK_HEADER});
      });

      it('returns the correct group index for given coordinates after re-order', () => {
        const provider = new IndexAndCoordinatesConversionTestProvider();
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

        chartInstance.moveGroupDown(0);
        // Ro-order group will only affect the vertical offsets, so we just need to test |y|.
        // Move Group 0 down. So for group 0, vertically there are only the ruler(17), header of Group 1 (17),
        // level 1(17), padding of Group 0(4) and header beyond it. So it starts from 55.
        // And now the Group 0 is the last group, so the end of the Group 0 is 55 + header of Group 0(17) + level 0(17)
        // = 89
        // So the entry 0 can be mapped from
        //   y: 55(inclusive) to 89(exclusive)
        // Now Group 1 will be before Group 0. so (y)54 will be mapped to Group 1
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_BUTTON_SIZE */ 22, 54),
            {groupIndex: 1, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK});
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_BUTTON_SIZE */ 22, 55),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK_HEADER});
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_BUTTON_SIZE */ 22, 88),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK});
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_BUTTON_SIZE */ 22, 89),
            {groupIndex: -1, hoverType: PerfUI.FlameChart.HoverType.OUTSIDE_TRACKS});
      });

      it('returns the correct group index and the icon type for given coordinates', () => {
        const provider = new IndexAndCoordinatesConversionTestProvider();
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
        const context = (chartInstance.getCanvas().getContext('2d') as CanvasRenderingContext2D);
        const labelWidth = chartInstance.labelWidthForGroup(context, provider.timelineData()?.groups[0]!);

        // Start of the view
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(0, 17),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK_HEADER});
        // End of the title label, For title label checking, the end is included.
        const endOfTitle = /* HEADER_LEFT_PADDING */ 6 + labelWidth;
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(endOfTitle, 17),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK_HEADER});
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(endOfTitle + 1, 17),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK});

        chartInstance.setEditModeForTest(true);
        // Start of the view (before the first icon). Will return the track header.
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(0, 17),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK_HEADER});
        // First icon (Up)
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(/* HEADER_LEFT_PADDING */ 6, 17),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.TRACK_CONFIG_UP_BUTTON});
        // Second icon (Down)
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_BUTTON_SIZE */ 25, 17),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.TRACK_CONFIG_DOWN_BUTTON});
        // Third icon (Hide)
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_BUTTON_SIZE * 2 + GAP_BETWEEN_EDIT_ICONS */ 44, 17),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.TRACK_CONFIG_HIDE_BUTTON});
        // This is after the third icon, which is the start of the title label, so should return INSIDE_TRACK_HEADER
        assert.deepEqual(
            chartInstance.coordinatesToGroupIndexAndHoverType(
                /* HEADER_LEFT_PADDING + EDIT_MODE_TOTAL_ICON_WIDTH */ 60, 17),
            {groupIndex: 0, hoverType: PerfUI.FlameChart.HoverType.INSIDE_TRACK_HEADER});
      });
    });
  });

  describe('buildGroupTree', () => {
    class BuildGroupTreeTestProvider extends FakeFlameChartProvider {
      override maxStackDepth(): number {
        return 6;
      }
      override timelineData(): PerfUI.FlameChart.FlameChartTimelineData {
        return PerfUI.FlameChart.FlameChartTimelineData.create({
          entryLevels: [],
          entryStartTimes: [],
          entryTotalTimes: [],
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
            {
              name: 'Test Group 3' as Platform.UIString.LocalizedString,
              startLevel: 3,
              style: {...defaultGroupStyle, collapsible: true, nestingLevel: 2},
            },
            {
              name: 'Test Group 4' as Platform.UIString.LocalizedString,
              startLevel: 4,
              style: {...defaultGroupStyle, collapsible: true, nestingLevel: 1},
            },
            {
              name: 'Test Group 5' as Platform.UIString.LocalizedString,
              startLevel: 5,
              style: {...defaultGroupStyle, collapsible: true, nestingLevel: 0},
            },
          ],
        });
      }
    }

    it('builds the group tree correctly', async () => {
      const provider = new BuildGroupTreeTestProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      const root = chartInstance.buildGroupTree(provider.timelineData().groups);

      // The built tree should be
      //               Root
      //        /       |         \
      // Group0       Group1         Group5
      //             /      \
      //           Group2   Group4
      //             |
      //           Group3
      const groupNode5 = {
        index: 5,
        nestingLevel: 0,
        startLevel: 5,
        // This is the last group, so it will use the end level of the data provider, which is
        // returned by |dataProvider.maxStackDepth()|, and it is 3.
        endLevel: 6,
        children: [],
      };
      const groupNode4 = {
        index: 4,
        nestingLevel: 1,
        startLevel: 4,
        // The next group is 'Test Group 5', its start level is 5.
        endLevel: 5,
        children: [],
      };
      const groupNode3 = {
        index: 3,
        nestingLevel: 2,
        startLevel: 3,
        // The next group is 'Test Group 4', its start level is 4.
        endLevel: 4,
        children: [],
      };
      const groupNode2 = {
        index: 2,
        nestingLevel: 1,
        startLevel: 2,
        // The next group is 'Test Group 3', its start level is 3.
        endLevel: 3,
        children: [groupNode3],
      };
      const groupNode1 = {
        index: 1,
        nestingLevel: 0,
        startLevel: 1,
        // The next group is 'Test Group 2', its start level is 2.
        endLevel: 2,
        children: [groupNode2, groupNode4],
      };
      const groupNode0 = {
        index: 0,
        nestingLevel: 0,
        startLevel: 0,
        // The next group is 'Test Group 1', its start level is 1.
        endLevel: 1,
        children: [],
      };
      const expectedGroupNodeRoot = {
        index: -1,
        nestingLevel: -1,
        startLevel: 0,
        // The next group is 'Test Group 0', its start level is 0.
        endLevel: 0,
        children: [groupNode0, groupNode1, groupNode5],
      };

      assert.deepEqual(root, expectedGroupNodeRoot);
    });
  });

  describe('updateGroupTree', () => {
    class UpdateGroupTreeTestProvider extends FakeFlameChartProvider {
      override maxStackDepth(): number {
        return 6;
      }
      override timelineData(): PerfUI.FlameChart.FlameChartTimelineData {
        return PerfUI.FlameChart.FlameChartTimelineData.create({
          entryLevels: [],
          entryStartTimes: [],
          entryTotalTimes: [],
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

    it('builds the group tree correctly', async () => {
      const provider = new UpdateGroupTreeTestProvider();
      const delegate = new MockFlameChartDelegate();
      chartInstance = new PerfUI.FlameChart.FlameChart(provider, delegate);
      const root = chartInstance.buildGroupTree(provider.timelineData().groups);

      // The built tree should be
      //        Root
      //      /      \
      // Group0      Group1
      //                |
      //             Group2
      const groupNode2 = {
        index: 2,
        nestingLevel: 1,
        startLevel: 2,
        // The next group is 'Test Group 3', its start level is 3.
        endLevel: 6,
        children: [],
      };
      const groupNode1 = {
        index: 1,
        nestingLevel: 0,
        startLevel: 1,
        // The next group is 'Test Group 2', its start level is 2.
        endLevel: 2,
        children: [groupNode2],
      };
      const groupNode0 = {
        index: 0,
        nestingLevel: 0,
        startLevel: 0,
        // The next group is 'Test Group 1', its start level is 1.
        endLevel: 1,
        children: [],
      };
      const expectedGroupNodeRoot = {
        index: -1,
        nestingLevel: -1,
        startLevel: 0,
        // The next group is 'Test Group 0', its start level is 0.
        endLevel: 0,
        children: [groupNode0, groupNode1],
      };

      assert.deepEqual(root, expectedGroupNodeRoot);

      const newGroups = [
        {
          name: 'Test Group 0' as Platform.UIString.LocalizedString,
          startLevel: 0,
          style: defaultGroupStyle,
        },
        {
          name: 'Test Group 1' as Platform.UIString.LocalizedString,
          startLevel: 2,
          style: defaultGroupStyle,
        },
        {
          name: 'Test Group 2' as Platform.UIString.LocalizedString,
          startLevel: 3,
          style: {...defaultGroupStyle, collapsible: true, nestingLevel: 1},
        },
      ];

      chartInstance.updateGroupTree(newGroups, root);
      groupNode0.endLevel = 2;
      groupNode1.startLevel = 2;
      groupNode1.endLevel = 3;
      groupNode2.startLevel = 3;
      assert.deepEqual(root, expectedGroupNodeRoot);
    });
  });
});
